//! Tauri 命令桥接层
//!
//! 提供 Tauri GUI 和后端核心功能的通信接口

#[cfg(feature = "tauri")]
use crate::events::{DataFormat, ProxyEvent, ProxyStatus, SocketEvent};
#[cfg(feature = "tauri")]
use crate::socket::format::DataFormat as SocketDataFormat;
#[cfg(feature = "tauri")]
use crate::state::{AppState, AppStateHandle, ConfigSnapshot};
#[cfg(feature = "tauri")]
use std::sync::Arc;
#[cfg(feature = "tauri")]
use tokio::sync::Mutex;
#[cfg(feature = "tauri")]
use tokio::sync::mpsc;
#[cfg(feature = "tauri")]
use tokio_util::sync::CancellationToken;

/// Tauri 应用状态包装器
#[cfg(feature = "tauri")]
pub struct TauriState {
    pub state: AppStateHandle,
    pub proxy_cancel: Option<CancellationToken>,
    pub socket_cancel: Option<CancellationToken>,
    pub proxy_events: Option<mpsc::Sender<ProxyEvent>>,
    pub socket_events: Option<mpsc::Sender<SocketEvent>>,
}

#[cfg(feature = "tauri")]
impl TauriState {
    pub fn new() -> Self {
        Self {
            state: AppState::new_handle(),
            proxy_cancel: None,
            socket_cancel: None,
            proxy_events: None,
            socket_events: None,
        }
    }
}

/// 启动代理
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn start_proxy(
    state: tauri::State<'_, Arc<Mutex<TauriState>>>,
    listen: String,
    target: String,
    tls: bool,
    cert: Option<String>,
    key: Option<String>,
) -> Result<(), String> {
    let mut tauri_state = state.lock().await;

    // 检查是否已经在运行
    if tauri_state.proxy_cancel.is_some() {
        return Err("代理已在运行中，请先停止".to_string());
    }

    // 创建取消令牌和事件通道
    let cancel_token = CancellationToken::new();
    let (event_sender, mut event_receiver) = mpsc::channel(100);

    tauri_state.proxy_cancel = Some(cancel_token.clone());
    tauri_state.proxy_events = Some(event_sender.clone());

    // 更新状态
    {
        let mut app_state = tauri_state.state.lock().await;
        app_state.proxy.status = ProxyStatus::Running {
            listen: listen.clone(),
            target: target.clone(),
        };
        app_state.config = Some(ConfigSnapshot {
            proxy_listen: Some(listen.clone()),
            proxy_target: Some(target.clone()),
            socket_format: DataFormat::Text,
        });
    }

    let state_for_task = Arc::clone(&state);

    // 启动代理任务
    tokio::spawn(async move {
        let result = if tls {
            let cert_path = cert.ok_or("TLS 模式需要证书路径".to_string()).unwrap();
            let key_path = key.ok_or("TLS 模式需要私钥路径".to_string()).unwrap();
            crate::proxy::run_tls_proxy_with_events(
                &listen,
                &target,
                &cert_path,
                &key_path,
                cancel_token.clone(),
                event_sender.clone(),
            )
            .await
        } else {
            crate::proxy::run_tcp_proxy_with_events(
                &listen,
                &target,
                cancel_token.clone(),
                event_sender.clone(),
            )
            .await
        };

        if let Err(e) = result {
            let _ = event_sender
                .send(ProxyEvent::Error {
                    message: format!("代理运行错误: {}", e),
                })
                .await;
        }

        // 任务结束时清理状态
        let mut tauri_state = state_for_task.lock().await;
        tauri_state.proxy_cancel = None;
        tauri_state.proxy_events = None;
        {
            let mut app_state = tauri_state.state.lock().await;
            app_state.proxy.status = ProxyStatus::Stopped;
        }
    });

    // 启动事件处理任务
    let state_for_events = Arc::clone(&state);
    tokio::spawn(async move {
        while let Some(event) = event_receiver.recv().await {
            let mut tauri_state = state_for_events.lock().await;

            match event {
                ProxyEvent::NewConnection {
                    id,
                    source,
                    target,
                    timestamp,
                } => {
                    let mut app_state = tauri_state.state.lock().await;
                    app_state.proxy.connections.push(crate::events::ConnectionInfo {
                        id: id.clone(),
                        source: source.clone(),
                        target: target.clone(),
                        bytes_in: 0,
                        bytes_out: 0,
                        connected_at: timestamp,
                        status: crate::events::ConnectionStatus::Active,
                    });
                }
                ProxyEvent::DataTransferred {
                    id,
                    bytes_from_client,
                    bytes_from_server,
                } => {
                    let mut app_state = tauri_state.state.lock().await;
                    app_state.proxy.total_bytes_in = bytes_from_client;
                    app_state.proxy.total_bytes_out = bytes_from_server;
                    if let Some(conn) = app_state.proxy.connections.iter_mut().find(|c| c.id == id) {
                        conn.bytes_in = bytes_from_client;
                        conn.bytes_out = bytes_from_server;
                    }
                }
                ProxyEvent::ConnectionClosed {
                    id,
                    total_bytes_from_client,
                    total_bytes_from_server,
                } => {
                    let mut app_state = tauri_state.state.lock().await;
                    app_state.proxy.total_bytes_in = total_bytes_from_client;
                    app_state.proxy.total_bytes_out = total_bytes_from_server;
                    if let Some(conn) = app_state.proxy.connections.iter_mut().find(|c| c.id == id) {
                        conn.bytes_in = total_bytes_from_client;
                        conn.bytes_out = total_bytes_from_server;
                        conn.status = crate::events::ConnectionStatus::Closed;
                    }
                }
                ProxyEvent::StatusChanged { status } => {
                    let mut app_state = tauri_state.state.lock().await;
                    app_state.proxy.status = status;
                }
                ProxyEvent::Error { message } => {
                    eprintln!("代理错误: {}", message);
                }
            }
        }
    });

    Ok(())
}

/// 停止代理
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn stop_proxy(state: tauri::State<'_, Arc<Mutex<TauriState>>>) -> Result<(), String> {
    let mut tauri_state = state.lock().await;

    if let Some(cancel_token) = tauri_state.proxy_cancel.take() {
        cancel_token.cancel();
    }

    tauri_state.proxy_events = None;

    {
        let mut app_state = tauri_state.state.lock().await;
        app_state.proxy.status = ProxyStatus::Stopped;
        app_state.proxy.connections.clear();
    }

    Ok(())
}

/// 获取代理状态
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn get_proxy_status(
    state: tauri::State<'_, Arc<Mutex<TauriState>>>,
) -> Result<ProxyStatus, String> {
    let tauri_state = state.lock().await;
    let app_state = tauri_state.state.lock().await;
    Ok(app_state.proxy.status.clone())
}

/// 启动 Socket 服务端
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn start_socket_server(
    state: tauri::State<'_, Arc<Mutex<TauriState>>>,
    listen: String,
    format: String,
) -> Result<(), String> {
    let mut tauri_state = state.lock().await;

    // 检查是否已经在运行
    if tauri_state.socket_cancel.is_some() {
        return Err("Socket 服务已在运行中，请先停止".to_string());
    }

    // 解析格式
    let data_format: SocketDataFormat = format
        .parse()
        .map_err(|e| format!("无效的数据格式: {}", e))?;

    // 创建取消令牌和事件通道
    let cancel_token = CancellationToken::new();
    let (event_sender, mut event_receiver) = mpsc::channel(100);
    let (input_sender, input_receiver) = mpsc::channel(100);

    tauri_state.socket_cancel = Some(cancel_token.clone());
    tauri_state.socket_events = Some(event_sender.clone());

    // 更新状态
    {
        let mut app_state = tauri_state.state.lock().await;
        app_state.socket_sessions.clear();
    }

    let state_for_task = Arc::clone(&state);
    let listen_clone = listen.clone();

    // 启动 Socket 服务端任务
    tokio::spawn(async move {
        let result = crate::socket::run_socket_server_gui(
            cancel_token.clone(),
            event_sender.clone(),
            input_receiver,
            &listen_clone,
            data_format,
        )
        .await;

        if let Err(e) = result {
            let _ = event_sender
                .send(SocketEvent::Error {
                    session_id: None,
                    message: format!("Socket 服务错误: {}", e),
                })
                .await;
        }

        // 任务结束时清理状态
        let mut tauri_state = state_for_task.lock().await;
        tauri_state.socket_cancel = None;
        tauri_state.socket_events = None;
    });

    // 启动事件处理任务
    let state_for_events = Arc::clone(&state);
    tokio::spawn(async move {
        while let Some(event) = event_receiver.recv().await {
            let mut tauri_state = state_for_events.lock().await;
            let mut app_state = tauri_state.state.lock().await;

            match event {
                SocketEvent::Connected {
                    session_id,
                    remote_addr,
                } => {
                    app_state.socket_sessions.push(crate::events::SocketSession {
                        id: session_id.clone(),
                        remote_addr: remote_addr.clone(),
                        mode: crate::events::SocketMode::Server,
                        format: DataFormat::Text,
                        connected_at: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as i64,
                    });
                }
                SocketEvent::Disconnected { session_id } => {
                    app_state
                        .socket_sessions
                        .retain(|s| s.id != session_id);
                }
                SocketEvent::DataReceived {
                    session_id,
                    data,
                    format,
                } => {
                    // 可以在这里记录数据到状态
                    println!("收到数据 [{}]: {} bytes", session_id, data.len());
                }
                SocketEvent::DataSent { session_id, data } => {
                    println!("发送数据 [{}]: {} bytes", session_id, data.len());
                }
                SocketEvent::Error { session_id, message } => {
                    eprintln!("Socket 错误 [{:?}]: {}", session_id, message);
                }
            }
        }
    });

    Ok(())
}

/// 停止 Socket 服务端
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn stop_socket_server(
    state: tauri::State<'_, Arc<Mutex<TauriState>>>,
) -> Result<(), String> {
    let mut tauri_state = state.lock().await;

    if let Some(cancel_token) = tauri_state.socket_cancel.take() {
        cancel_token.cancel();
    }

    tauri_state.socket_events = None;

    {
        let mut app_state = tauri_state.state.lock().await;
        app_state.socket_sessions.clear();
    }

    Ok(())
}

/// 获取配置
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn get_config(
    state: tauri::State<'_, Arc<Mutex<TauriState>>>,
) -> Result<ConfigSnapshot, String> {
    let tauri_state = state.lock().await;
    let app_state = tauri_state.state.lock().await;
    Ok(app_state.config.clone().unwrap_or(ConfigSnapshot {
        proxy_listen: None,
        proxy_target: None,
        socket_format: DataFormat::Text,
    }))
}

/// 保存配置
#[cfg(feature = "tauri")]
#[tauri::command]
pub async fn save_config(
    state: tauri::State<'_, Arc<Mutex<TauriState>>>,
    config: ConfigSnapshot,
) -> Result<(), String> {
    let mut tauri_state = state.lock().await;
    let mut app_state = tauri_state.state.lock().await;
    app_state.config = Some(config);
    Ok(())
}

// 当没有 Tauri feature 时，提供空实现以便通过测试
#[cfg(not(feature = "tauri"))]
pub struct TauriState;

#[cfg(not(feature = "tauri"))]
impl TauriState {
    pub fn new() -> Self {
        Self
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_tauri_state_new() {
        #[cfg(not(feature = "tauri"))]
        let _state = super::TauriState::new();

        #[cfg(feature = "tauri")]
        {
            let _state = super::TauriState::new();
        }
    }

    #[test]
    fn test_config_snapshot_creation() {
        let snapshot = crate::state::ConfigSnapshot {
            proxy_listen: Some("127.0.0.1:8080".to_string()),
            proxy_target: Some("127.0.0.1:9000".to_string()),
            socket_format: crate::events::DataFormat::Text,
        };

        assert_eq!(snapshot.proxy_listen.unwrap(), "127.0.0.1:8080");
        assert_eq!(snapshot.socket_format, crate::events::DataFormat::Text);
    }
}
