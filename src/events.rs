//! 事件类型定义 - 用于 GUI 通信

use serde::{Deserialize, Serialize};

/// 代理事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProxyEvent {
    /// 新连接建立
    NewConnection {
        id: String,
        source: String,
        target: String,
        timestamp: i64,
    },
    /// 数据传输
    DataTransferred {
        id: String,
        bytes_from_client: u64,
        bytes_from_server: u64,
    },
    /// 连接关闭
    ConnectionClosed {
        id: String,
        total_bytes_from_client: u64,
        total_bytes_from_server: u64,
    },
    /// 代理状态变更
    StatusChanged { status: ProxyStatus },
    /// 错误
    Error { message: String },
}

/// 代理状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProxyStatus {
    Stopped,
    Running { listen: String, target: String },
}

/// Socket 事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SocketEvent {
    /// 已连接
    Connected {
        session_id: String,
        remote_addr: String,
    },
    /// 已断开
    Disconnected { session_id: String },
    /// 收到数据
    DataReceived {
        session_id: String,
        data: Vec<u8>,
        format: DataFormat,
    },
    /// 发送数据
    DataSent { session_id: String, data: Vec<u8> },
    /// 错误
    Error {
        session_id: Option<String>,
        message: String,
    },
}

/// 数据格式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DataFormat {
    Hex,
    Text,
    Json,
}

/// 连接信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: String,
    pub source: String,
    pub target: String,
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub connected_at: i64,
    pub status: ConnectionStatus,
}

/// 连接状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConnectionStatus {
    Active,
    Closed,
}

/// Socket 会话信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocketSession {
    pub id: String,
    pub remote_addr: String,
    pub mode: SocketMode,
    pub format: DataFormat,
    pub connected_at: i64,
}

/// Socket 模式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SocketMode {
    Client,
    Server,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proxy_event_serialization() {
        let event = ProxyEvent::NewConnection {
            id: "conn-1".to_string(),
            source: "127.0.0.1:12345".to_string(),
            target: "127.0.0.1:8080".to_string(),
            timestamp: 1234567890,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("conn-1"));
    }

    #[test]
    fn test_socket_event_serialization() {
        let event = SocketEvent::Connected {
            session_id: "session-1".to_string(),
            remote_addr: "127.0.0.1:9999".to_string(),
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("session-1"));
    }

    #[test]
    fn test_data_format() {
        assert_eq!(DataFormat::Hex, DataFormat::Hex);
        assert_ne!(DataFormat::Hex, DataFormat::Text);
    }

    #[test]
    fn test_connection_info() {
        let info = ConnectionInfo {
            id: "conn-1".to_string(),
            source: "127.0.0.1:12345".to_string(),
            target: "127.0.0.1:8080".to_string(),
            bytes_in: 100,
            bytes_out: 200,
            connected_at: 1234567890,
            status: ConnectionStatus::Active,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("conn-1"));
        assert!(json.contains("Active"));
    }

    #[test]
    fn test_socket_session() {
        let session = SocketSession {
            id: "session-1".to_string(),
            remote_addr: "127.0.0.1:9999".to_string(),
            mode: SocketMode::Client,
            format: DataFormat::Text,
            connected_at: 1234567890,
        };
        let json = serde_json::to_string(&session).unwrap();
        assert!(json.contains("session-1"));
        assert!(json.contains("Client"));
    }

    #[test]
    fn test_proxy_status() {
        let status = ProxyStatus::Running {
            listen: "127.0.0.1:8080".to_string(),
            target: "127.0.0.1:9000".to_string(),
        };
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("Running"));
    }
}
