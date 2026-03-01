// Tauri GUI 入口
// 阻止 Windows 发布版本显示控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tauri_commands;

use netforge::state::AppState;
use tauri_commands::init_runtime_state;
use tauri_commands::{
start_proxy, stop_proxy, get_proxy_status,
start_socket_server, stop_socket_server, send_socket_data,
start_socket_client, stop_socket_client, send_client_data,
start_udp, stop_udp, send_udp,
start_ws_server, stop_ws_server, send_ws_server_data,
start_ws_client, stop_ws_client, send_ws_client_data,
    get_config, save_config,
    export_config, import_config, get_theme, set_theme,
};

fn main() {
    // 初始化应用状态
    let app_state = AppState::new_handle();
    let runtime_state = init_runtime_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
.plugin(tauri_plugin_store::Builder::default().build())
        .manage(app_state)
        .manage(runtime_state)
        .invoke_handler(tauri::generate_handler![
    start_proxy, stop_proxy, get_proxy_status,
    start_socket_server, stop_socket_server, send_socket_data,
            start_socket_client,
            stop_socket_client,
            send_client_data,
            start_udp,
            stop_udp,
            send_udp,
            start_ws_server,
            stop_ws_server,
            send_ws_server_data,
            start_ws_client,
            stop_ws_client,
            send_ws_client_data,
    get_config, save_config,
    export_config, import_config, get_theme, set_theme,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
