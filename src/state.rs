//! 应用状态管理

use crate::events::{ConnectionInfo, DataFormat, ProxyStatus, SocketSession};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

/// 应用全局状态
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppState {
    /// 代理状态
    pub proxy: ProxyState,
    /// Socket 会话列表
    pub socket_sessions: Vec<SocketSession>,
    /// 当前配置
    pub config: Option<ConfigSnapshot>,
}

/// 代理状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyState {
    /// 运行状态
    pub status: ProxyStatus,
    /// 活跃连接列表
    pub connections: Vec<ConnectionInfo>,
    /// 总流量统计
    pub total_bytes_in: u64,
    pub total_bytes_out: u64,
}

/// 配置快照（用于状态显示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSnapshot {
    pub proxy_listen: Option<String>,
    pub proxy_target: Option<String>,
    pub socket_format: DataFormat,
}



impl Default for ProxyState {
    fn default() -> Self {
        Self {
            status: ProxyStatus::Stopped,
            connections: Vec::new(),
            total_bytes_in: 0,
            total_bytes_out: 0,
        }
    }
}

/// 线程安全的状态句柄
pub type AppStateHandle = Arc<RwLock<AppState>>;

impl AppState {
    /// 创建新的状态句柄
    pub fn new_handle() -> AppStateHandle {
        Arc::new(RwLock::new(Self::default()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_default() {
        let state = AppState::default();
        assert!(state.socket_sessions.is_empty());
        assert!(state.config.is_none());
        assert_eq!(state.proxy.total_bytes_in, 0);
        assert_eq!(state.proxy.total_bytes_out, 0);
    }

    #[test]
    fn test_proxy_state_default() {
        let state = ProxyState::default();
        assert_eq!(state.status, ProxyStatus::Stopped);
        assert!(state.connections.is_empty());
    }

    #[test]
    fn test_new_handle() {
        let handle = AppState::new_handle();
        let state = handle.try_read().unwrap();
        assert!(state.socket_sessions.is_empty());
    }

    #[test]
    fn test_app_state_serialization() {
        let state = AppState::default();
        let json = serde_json::to_string(&state).unwrap();
        assert!(json.contains("proxy"));
        assert!(json.contains("socket_sessions"));
    }

    #[test]
    fn test_config_snapshot() {
        let snapshot = ConfigSnapshot {
            proxy_listen: Some("127.0.0.1:8080".to_string()),
            proxy_target: Some("127.0.0.1:9000".to_string()),
            socket_format: DataFormat::Text,
        };
        let json = serde_json::to_string(&snapshot).unwrap();
        assert!(json.contains("127.0.0.1:8080"));
        assert!(json.contains("Text"));
    }
}
