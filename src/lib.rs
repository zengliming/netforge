//! NetForge 库 - GUI 共享模块
//!
//! 供 Tauri GUI 使用

pub mod config;
pub mod error;
pub mod events;
pub mod proxy;
pub mod socket;
pub mod state;
pub mod udp;
pub mod ws;

pub mod tauri_commands;

// 重新导出常用类型
pub use events::{DataFormat, ProxyEvent, ProxyStatus, SocketEvent};
pub use state::{AppState, AppStateHandle};
