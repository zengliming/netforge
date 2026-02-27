//! NetForge 库 - 共享模块
//!
//! 供 CLI 和 Tauri GUI 共享使用
//! NetForge 库 - 共享模块
//!
//! 供 CLI 和 Tauri GUI 共享使用

pub mod cli;
pub mod config;
pub mod error;
pub mod events;
pub mod proxy;
pub mod socket;
pub mod state;

#[cfg(feature = "tauri")]
pub mod tauri_commands;

// 重新导出常用类型
pub use events::{DataFormat, ProxyEvent, ProxyStatus, SocketEvent};
pub use state::{AppState, AppStateHandle};
