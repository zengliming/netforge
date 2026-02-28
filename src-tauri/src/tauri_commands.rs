//! Tauri 命令模块
//!
//! 提供 GUI 与后端的桥梁接口

use netforge::config::Config;
use netforge::events::{DataFormat, ProxyEvent, ProxyStatus, SocketEvent};
use tauri::Emitter;
use netforge::proxy::{run_tcp_proxy_with_events, run_tls_proxy_with_events};
use netforge::socket::format::DataFormat as SocketDataFormat;
use netforge::socket::{run_socket_client_gui, run_socket_server_gui};
use netforge::state::{AppStateHandle, ConfigSnapshot, ProxyState};
use std::collections::HashMap;
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
    /// 服务端专用：发送数据到客户端的通道
    input_sender: Option<mpsc::Sender<(SocketAddr, Vec<u8>)>>,
    /// 客户端专用：发送字符串数据的通道
    string_input_sender: Option<mpsc::Sender<String>>,
}

/// 应用运行时状态（支持多实例）
#[derive(Clone)]
pub struct RuntimeState {
    /// 代理任务（实例 ID -> 任务）
    proxy_tasks: Arc<Mutex<HashMap<String, ProxyTask>>>,
    /// Socket 服务器任务（实例 ID -> 任务）
    server_tasks: Arc<Mutex<HashMap<String, SocketTask>>>,
    /// Socket 客户端任务（实例 ID -> 任务）
    client_tasks: Arc<Mutex<HashMap<String, SocketTask>>>,
}

impl RuntimeState {
    pub fn new() -> Self {
        Self {
            proxy_tasks: Arc::new(Mutex::new(HashMap::new())),
            server_tasks: Arc::new(Mutex::new(HashMap::new())),
            client_tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self::new()
    }
}

/// 启动代理
/// 启动代理
#[tauri::command(rename_all = "snake_case")]
pub async fn start_proxy(
    instance_id: String,
    listen: String,
    target: String,
    tls: bool,
    cert: Option<String>,
    key: Option<String>,
    app_handle: tauri::AppHandle,
    runtime_state: tauri::State<'_, RuntimeState>,
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    // 停止同 ID 的现有代理
    stop_proxy_internal(&instance_id, &app_state, &runtime_state).await;

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
    let instance_id_clone = instance_id.clone();
    let app_handle_clone = app_handle.clone();

    // 启动代理任务
    let handle = tokio::spawn(async move {
        // 事件处理循环
        let event_instance_id = instance_id_clone.clone();
        let event_app_handle = app_handle_clone.clone();
        tokio::spawn(async move {
            while let Some(event) = event_receiver.recv().await {
                // 发射事件到前端
                if let Err(e) = event_app_handle.emit(&format!("proxy:{}:event", event_instance_id), &event) {
                    eprintln!("Failed to emit proxy event: {}", e);
                }
                // 也发射通用事件
                let _ = event_app_handle.emit("proxy:event", &event);
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
        let mut proxy_tasks = runtime_state.proxy_tasks.lock().await;
        proxy_tasks.insert(instance_id.clone(), ProxyTask {
            cancel_token,
            handle: Some(handle),
        });
    }

    Ok(())
}

/// 停止代理（内部函数）
async fn stop_proxy_internal(
    instance_id: &str,
    app_state: &AppStateHandle,
    runtime_state: &RuntimeState,
) {
    let mut proxy_tasks = runtime_state.proxy_tasks.lock().await;
    if let Some(task) = proxy_tasks.remove(instance_id) {
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
/// 停止代理
#[tauri::command(rename_all = "snake_case")]
pub async fn stop_proxy(
    instance_id: String,
    runtime_state: tauri::State<'_, RuntimeState>,
    app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    stop_proxy_internal(&instance_id, &app_state, &runtime_state).await;
    Ok(())
}

/// 获取代理状态
#[tauri::command]
pub async fn get_proxy_status(app_state: tauri::State<'_, AppStateHandle>) -> Result<ProxyState, String> {
    let state = app_state.lock().await;
    Ok(state.proxy.clone())
}

/// 启动 Socket 服务器
/// 启动 Socket 服务器
#[tauri::command(rename_all = "snake_case")]
pub async fn start_socket_server(
    instance_id: String,
    listen: String,
    format: String,
    app_handle: tauri::AppHandle,
    runtime_state: tauri::State<'_, RuntimeState>,
    _app_state: tauri::State<'_, AppStateHandle>,
) -> Result<(), String> {
    // 停止同 ID 的现有服务器
    stop_socket_server_internal(&instance_id, &runtime_state).await;

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
    let instance_id_clone = instance_id.clone();
    let app_handle_clone = app_handle.clone();

    // 启动 Socket 服务器任务
    eprintln!("[DEBUG] Starting socket server task for instance {}", instance_id);
    let handle = tokio::spawn(async move {
        eprintln!("[DEBUG] Socket server task started");
        // 事件处理循环
        let event_instance_id = instance_id_clone.clone();
        let event_app_handle = app_handle_clone.clone();
        tokio::spawn(async move {
            while let Some(event) = event_receiver.recv().await {
                // 发射事件到前端
                eprintln!("[DEBUG] Socket event: {:?}", event);
                match &event {
                    SocketEvent::Connected { session_id, remote_addr: _ } => {
                        eprintln!("[DEBUG] Emitting socket:client_connected for instance {}", event_instance_id);
                        if let Err(e) = event_app_handle.emit("socket:client_connected", serde_json::json!({
                            "instance_id": event_instance_id,
                            "client_addr": session_id
                        })) {
                            eprintln!("[ERROR] Failed to emit socket:client_connected: {}", e);
                        }
                    }
                    SocketEvent::Disconnected { session_id } => {
                        if let Err(e) = event_app_handle.emit("socket:client_disconnected", serde_json::json!({
                            "instance_id": event_instance_id,
                            "client_addr": session_id
                        })) {
                            eprintln!("[ERROR] Failed to emit socket:client_disconnected: {}", e);
                        }
                    }
                    SocketEvent::DataReceived { session_id, data, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:data", serde_json::json!({
                            "instance_id": event_instance_id,
                            "source": "server",
                            "session_id": session_id,
                            "direction": "in",
                            "data": String::from_utf8_lossy(data)
                        })) {
                            eprintln!("[ERROR] Failed to emit socket:data: {}", e);
                        }
                    }
                    SocketEvent::DataSent { session_id, data, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:data", serde_json::json!({
                            "instance_id": event_instance_id,
                            "source": "server",
                            "session_id": session_id,
                            "direction": "out",
                            "data": String::from_utf8_lossy(data)
                        })) {
                            eprintln!("[ERROR] Failed to emit socket:data: {}", e);
                        }
                    }
                    SocketEvent::Error { message, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:error", serde_json::json!({
                            "instance_id": event_instance_id,
                            "message": message
                        })) {
                            eprintln!("[ERROR] Failed to emit socket:error: {}", e);
                        }
                    }
                }
            }
        });

        // 运行 Socket 服务器
        eprintln!("[DEBUG] Calling run_socket_server_gui");
        let result =
            run_socket_server_gui(task_cancel_token, event_sender, input_receiver, &listen, socket_format)
                .await;
        eprintln!("[DEBUG] run_socket_server_gui finished");
        if let Err(e) = result {
            eprintln!("Socket server error: {}", e);
        }
    });

    // 保存任务信息
    {
        let mut server_tasks = runtime_state.server_tasks.lock().await;
        server_tasks.insert(instance_id, SocketTask {
            cancel_token,
            handle: Some(handle),
            input_sender: Some(input_sender),
            string_input_sender: None,
        });
    }

    Ok(())
}

/// 停止 Socket 服务器（内部函数）
async fn stop_socket_server_internal(instance_id: &str, runtime_state: &RuntimeState) {
    let mut server_tasks = runtime_state.server_tasks.lock().await;
    if let Some(task) = server_tasks.remove(instance_id) {
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
/// 停止 Socket 服务器
#[tauri::command(rename_all = "snake_case")]
pub async fn stop_socket_server(
    instance_id: String,
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    stop_socket_server_internal(&instance_id, &runtime_state).await;
    Ok(())
}

/// 发送 Socket 数据（服务端）
/// 发送 Socket 数据（服务端）
#[tauri::command(rename_all = "snake_case")]
pub async fn send_socket_data(
    session_id: String,
    data: String,
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    // 将 session_id 解析为 SocketAddr
    let addr: SocketAddr = session_id.parse().map_err(|e| format!("无效的会话 ID: {}", e))?;

    // 将数据转换为字节
    let data_bytes = data.into_bytes();

    // 获取任意一个运行中的 Socket 服务器任务
    let server_tasks = runtime_state.server_tasks.lock().await;
    let mut found = false;
    for task in server_tasks.values() {
        if let Some(sender) = &task.input_sender {
            if let Err(e) = sender.send((addr, data_bytes.clone())).await {
                return Err(format!("发送数据失败: {}", e));
            }
            found = true;
            break;
        }
    }
    
    if !found {
        return Err("Socket 服务器未运行".to_string());
    }

    Ok(())
}

/// 启动 Socket 客户端
/// 启动 Socket 客户端
#[tauri::command(rename_all = "snake_case")]
pub async fn start_socket_client(
    instance_id: String,
    server: String,
    format: String,
    app_handle: tauri::AppHandle,
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    // 停止同 ID 的现有客户端
    stop_socket_client_internal(&instance_id, &runtime_state).await;

    // 创建新的取消令牌
    let cancel_token = CancellationToken::new();

    // 解析数据格式
    let socket_format: SocketDataFormat = format
        .parse()
        .map_err(|e: String| format!("无效的数据格式: {}", e))?;

    // 创建事件通道
    let (event_sender, mut event_receiver) = mpsc::channel::<SocketEvent>(100);

    // 创建输入通道（字符串）
    let (input_sender, input_receiver) = mpsc::channel::<String>(100);

    // 克隆用于任务的变量
    let task_cancel_token = cancel_token.clone();
    let instance_id_clone = instance_id.clone();
    let app_handle_clone = app_handle.clone();

    // 启动 Socket 客户端任务
    let handle = tokio::spawn(async move {
        // 事件处理循环
        let event_instance_id = instance_id_clone.clone();
        let event_app_handle = app_handle_clone.clone();
        tokio::spawn(async move {
            while let Some(event) = event_receiver.recv().await {
                eprintln!("[DEBUG] Client event: {:?}", event);
                match &event {
                    SocketEvent::Connected { session_id, .. } => {
                        eprintln!("[DEBUG] Client connected: {}", session_id);
                        if let Err(e) = event_app_handle.emit("socket:connected", serde_json::json!({
                            "instance_id": event_instance_id,
                            "server": session_id
                        })) {
                            eprintln!("[ERROR] Failed to emit: {}", e);
                        }
                    }
                    SocketEvent::Disconnected { session_id, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:client_disconnected", serde_json::json!({
                            "instance_id": event_instance_id,
                            "session_id": session_id
                        })) {
                            eprintln!("[ERROR] Failed to emit: {}", e);
                        }
                    }
                    SocketEvent::DataReceived { data, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:data", serde_json::json!({
                            "instance_id": event_instance_id,
                            "source": "client",
                            "direction": "in",
                            "data": String::from_utf8_lossy(data)
                        })) {
                            eprintln!("[ERROR] Failed to emit: {}", e);
                        }
                    }
                    SocketEvent::DataSent { data, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:data", serde_json::json!({
                            "instance_id": event_instance_id,
                            "source": "client",
                            "direction": "out",
                            "data": String::from_utf8_lossy(data)
                        })) {
                            eprintln!("[ERROR] Failed to emit: {}", e);
                        }
                    }
                    SocketEvent::Error { message, .. } => {
                        if let Err(e) = event_app_handle.emit("socket:error", serde_json::json!({
                            "instance_id": event_instance_id,
                            "message": message
                        })) {
                            eprintln!("[ERROR] Failed to emit: {}", e);
                        }
                    }
                }
            }
        });

        // 运行 Socket 客户端
        let result =
            run_socket_client_gui(task_cancel_token, event_sender, input_receiver, &server, socket_format)
                .await;

        if let Err(e) = result {
            eprintln!("Socket client error: {}", e);
        }
    });

    // 保存任务信息
    {
        let mut client_tasks = runtime_state.client_tasks.lock().await;
        client_tasks.insert(instance_id, SocketTask {
            cancel_token,
            handle: Some(handle),
            input_sender: None,
            string_input_sender: Some(input_sender),
        });
    }

    Ok(())
}

/// 停止 Socket 客户端（内部函数）
async fn stop_socket_client_internal(instance_id: &str, runtime_state: &RuntimeState) {
    let mut client_tasks = runtime_state.client_tasks.lock().await;
    if let Some(task) = client_tasks.remove(instance_id) {
        task.cancel_token.cancel();

        // 等待任务结束（最多 5 秒）
        if let Some(handle) = task.handle {
            tokio::time::timeout(tokio::time::Duration::from_secs(5), handle)
                .await
                .ok();
        }
    }
}

/// 停止 Socket 客户端
/// 停止 Socket 客户端
#[tauri::command(rename_all = "snake_case")]
pub async fn stop_socket_client(
    instance_id: String,
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    stop_socket_client_internal(&instance_id, &runtime_state).await;
    Ok(())
}

/// 发送客户端数据
/// 发送客户端数据
#[tauri::command(rename_all = "snake_case")]
pub async fn send_client_data(
    data: String,
    runtime_state: tauri::State<'_, RuntimeState>,
) -> Result<(), String> {
    // 获取任意一个运行中的 Socket 客户端任务
    let client_tasks = runtime_state.client_tasks.lock().await;
    let mut found = false;
    for task in client_tasks.values() {
        if let Some(sender) = &task.string_input_sender {
            if let Err(e) = sender.send(data.clone()).await {
                return Err(format!("发送数据失败: {}", e));
            }
            found = true;
            break;
        }
    }
    
    if !found {
        return Err("Socket 客户端未运行".to_string());
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
/// 保存配置
#[tauri::command(rename_all = "snake_case")]
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
