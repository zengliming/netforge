//! Tauri 命令模块
//!
//! 提供 GUI 与后端的桥梁接口

use netforge::config::Config;
use netforge::events::{DataFormat, ProxyEvent, ProxyStatus, SocketEvent};
use netforge::proxy::{run_tcp_proxy_with_events, run_tls_proxy_with_events};
use netforge::socket::format::DataFormat as SocketDataFormat;
use netforge::socket::{run_socket_client_gui, run_socket_server_gui};
use netforge::state::{AppStateHandle, ConfigSnapshot, ProxyState};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio_util::sync::CancellationToken;

/// 运行时代理任务信息
struct ProxyTask {
    cancel_token: CancellationToken,
    handle: Option<tokio::task::JoinHandle<()>>,
}

/// 运行时 Socket 任务信息
struct SocketTask {
    cancel_token: CancellationToken,
    handle: Option<tokio::task::JoinHandle<()>>,
    input_sender: Option<mpsc::Sender<(SocketAddr, Vec<u8>)>>,
}

/// 应用运行时状态
#[derive(Clone)]
pub struct RuntimeState {
    /// 代理任务
    proxy_task: Arc<Mutex<Option<ProxyTask>>>,
    /// Socket 服务器任务
    socket_task: Arc<Mutex<Option<SocketTask>>>,
    /// Socket 客户端任务
    socket_client_task: Arc<Mutex<Option<SocketTask>>>,
}

impl RuntimeState {
    pub fn new() -> Self {
        Self {
            proxy_task: Arc::new(Mutex::new(None)),
            socket_task: Arc::new(Mutex::new(None)),
            socket_client_task: Arc::new(Mutex::new(None)),
        }
    }
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self::new()
    }
}

/// 启动代理
#[tauri::command]
pub async fn start_proxy(
    listen: String,
    target: String,
    tls: bool,
    cert: Option<String>,
    key: Option<String>,
    app_handle: tauri::AppHandle,
    runtime_state: tauri::State<'_, RuntimeState>,
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    // 停止现有的代理
    stop_proxy_internal(&app_state, &runtime_state).await;

    // 创建新的取消令牌
    let cancel_token = CancellationToken::new();

    // 创建事件通道
    let (event_sender, mut event_receiver) = mpsc::channel::<ProxyEvent>(100);

    // 更新应用状态
    {
        let mut state = app_state.lock().await;
        state.proxy = ProxyState {
            status: ProxyStatus::Running {
                listen: listen.clone(),
                target: target.clone(),
            },
            connections: Vec::new(),
            total_bytes_in: 0,
            total_bytes_out: 0,
        };
    }

    // 克隆用于任务的变量
    let task_cancel_token = cancel_token.clone();
    let app_state_clone = app_state.clone();

    // 启动代理任务
    let handle = tokio::spawn(async move {
        // 事件处理循环 - 简化版本，暂时不发射事件
        tokio::spawn(async move {
            while let Some(_event) = event_receiver.recv().await {
                // TODO: 实现事件发射到前端
            }
        });

        // 运行代理
        let result = if tls {
            if let (Some(cert_path), Some(key_path)) = (cert, key) {
                run_tls_proxy_with_events(
                    &listen,
                    &target,
                    &cert_path,
                    &key_path,
                    task_cancel_token,
                    event_sender,
                )
                .await
            } else {
                Err(netforge::error::ProxyError::CertError(
                    "TLS 模式需要证书和私钥".to_string(),
                ))
            }
        } else {
            run_tcp_proxy_with_events(&listen, &target, task_cancel_token, event_sender).await
        };

        if let Err(e) = result {
            eprintln!("Proxy error: {}", e);
        }
    });

    // 保存任务信息
    {
        let mut proxy_task = runtime_state.proxy_task.lock().await;
        *proxy_task = Some(ProxyTask {
            cancel_token,
            handle: Some(handle),
        });
    }

    Ok(())
}

/// 停止代理（内部函数）
async fn stop_proxy_internal(
    app_state: &AppStateHandle,
    runtime_state: &RuntimeState,
) {
    let mut proxy_task = runtime_state.proxy_task.lock().await;
    if let Some(task) = proxy_task.take() {
        task.cancel_token.cancel();

        // 等待任务结束（最多 5 秒）
        if let Some(handle) = task.handle {
            tokio::time::timeout(tokio::time::Duration::from_secs(5), handle)
                .await
                .ok();
        }

        // 更新应用状态
        let mut state = app_state.lock().await;
        state.proxy.status = ProxyStatus::Stopped;
    }
}

/// 停止代理
#[tauri::command]
pub async fn stop_proxy(
    runtime_state: tauri::State<'_, RuntimeState>,
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    stop_proxy_internal(&app_state, &runtime_state).await;
    Ok(())
}

/// 获取代理状态
#[tauri::command]
pub async fn get_proxy_status(app_state: tauri::State<'_, AppStateHandle>) -> Result<ProxyState, String> {
    let state = app_state.lock().await;
    Ok(state.proxy.clone())
}

/// 启动 Socket 服务器
#[tauri::command]
pub async fn start_socket_server(
    listen: String,
    format: String,
    runtime_state: tauri::State<'_, RuntimeState>,
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    // 停止现有的 Socket 服务器
    stop_socket_server_internal(&runtime_state).await;

    // 创建新的取消令牌
    let cancel_token = CancellationToken::new();

    // 解析数据格式
    let socket_format: SocketDataFormat = format
        .parse()
        .map_err(|e: String| format!("无效的数据格式: {}", e))?;

    // 创建事件通道
    let (event_sender, mut event_receiver) = mpsc::channel::<SocketEvent>(100);

    // 创建输入通道
    let (input_sender, input_receiver) = mpsc::channel::<(SocketAddr, Vec<u8>)>(100);

    // 克隆用于任务的变量
    let task_cancel_token = cancel_token.clone();

    // 启动 Socket 服务器任务
    let handle = tokio::spawn(async move {
        // 事件处理循环 - 简化版本
        tokio::spawn(async move {
            while let Some(_event) = event_receiver.recv().await {
                // TODO: 实现事件发射到前端
            }
        });

        // 运行 Socket 服务器
        let result =
            run_socket_server_gui(task_cancel_token, event_sender, input_receiver, &listen, socket_format)
                .await;

        if let Err(e) = result {
            eprintln!("Socket server error: {}", e);
        }
    });

    // 保存任务信息
    {
        let mut socket_task = runtime_state.socket_task.lock().await;
        *socket_task = Some(SocketTask {
            cancel_token,
            handle: Some(handle),
            input_sender: Some(input_sender),
        });
    }

    Ok(())
}

/// 停止 Socket 服务器（内部函数）
async fn stop_socket_server_internal(runtime_state: &RuntimeState) {
    let mut socket_task = runtime_state.socket_task.lock().await;
    if let Some(task) = socket_task.take() {
        task.cancel_token.cancel();

        // 等待任务结束（最多 5 秒）
        if let Some(handle) = task.handle {
            tokio::time::timeout(tokio::time::Duration::from_secs(5), handle)
                .await
                .ok();
        }
    }
}

/// 停止 Socket 服务器
#[tauri::command]
pub async fn stop_socket_server(
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    stop_socket_server_internal(&runtime_state).await;
    Ok(())
}

/// 发送 Socket 数据
#[tauri::command]
pub async fn send_socket_data(
    session_id: String,
    data: String,
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    // 将 session_id 解析为 SocketAddr
    let addr: SocketAddr = session_id.parse().map_err(|e| format!("无效的会话 ID: {}", e))?;

    // 将数据转换为字节
    let data_bytes = data.into_bytes();

    // 获取 Socket 服务器任务
    let socket_task: tokio::sync::MutexGuard<'_, Option<SocketTask>> =
        runtime_state.socket_task.lock().await;
    if let Some(task) = socket_task.as_ref() {
        if let Err(e) = task.input_sender.as_ref().unwrap().send((addr, data_bytes)).await {
            return Err(format!("发送数据失败: {}", e));
        }
    } else {
        return Err("Socket 服务器未运行".to_string());
    }

    Ok(())
}

/// 获取配置
#[tauri::command]
pub async fn get_config(
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<Option<ConfigSnapshot>, String> {
    let state = app_state.lock().await;
    Ok(state.config.clone())
}

/// 保存配置
#[tauri::command]
pub async fn save_config(
    config: Config,
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    let mut state = app_state.lock().await;
    state.config = Some(ConfigSnapshot {
        proxy_listen: Some(config.proxy.listen),
        proxy_target: Some(config.proxy.target),
        socket_format: match config.socket.default_format.as_str() {
            "hex" => DataFormat::Hex,
            "text" => DataFormat::Text,
            "json" => DataFormat::Json,
            _ => DataFormat::Text,
        },
    });

    Ok(())
}

/// 初始化运行时状态
pub fn init_runtime_state() -> RuntimeState {
    RuntimeState::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_state_new() {
        let _state = RuntimeState::new();
    }
}
