//! 错误类型定义

use serde::Serialize;
use std::io;
use thiserror::Error;

/// 代理错误类型
#[derive(Debug, Error, Serialize)]
pub enum ProxyError {
    #[error("Failed to bind to address: {0}")]
    BindError(String),

    #[error("Connection failed: {0}")]
    #[serde(skip)]
    ConnectionError(#[from] io::Error),

    #[error("TLS handshake failed: {0}")]
    TlsError(String),

    #[error("Failed to load certificate: {0}")]
    CertError(String),

    #[error("Proxy error: {0}")]
    Other(String),
}

/// Socket 调试错误类型
#[derive(Debug, Error, Serialize)]
pub enum SocketError {
    #[error("Failed to connect to {0}: {1}")]
    #[serde(skip)]
    ConnectError(String, #[source] io::Error),

    #[error("Failed to bind to {0}: {1}")]
    #[serde(skip)]
    BindError(String, #[source] io::Error),

    #[error("IO error: {0}")]
    #[serde(skip)]
    IoError(#[from] io::Error),

    #[error("Connection closed")]
    ConnectionClosed,
}

/// 配置错误类型
#[derive(Debug, Error, Serialize)]
pub enum ConfigError {
    #[error("Failed to parse config file: {0}")]
    #[serde(skip)]
    ParseError(#[from] toml::de::Error),

    #[error("Failed to read config file: {0}")]
    #[serde(skip)]
    FileError(#[from] io::Error),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proxy_error_display() {
        let err = ProxyError::BindError("127.0.0.1:8080".to_string());
        assert!(err.to_string().contains("127.0.0.1:8080"));
    }

    #[test]
    fn test_socket_error_display() {
        let err = SocketError::ConnectionClosed;
        assert!(err.to_string().contains("closed"));
    }

    #[test]
    fn test_config_error_from_io() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "file not found");
        let config_err: ConfigError = io_err.into();
        assert!(matches!(config_err, ConfigError::FileError(_)));
    }
}
