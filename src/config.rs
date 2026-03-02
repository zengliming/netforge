//! 配置模块

use crate::error::ConfigError;
use serde::{Deserialize, Serialize};
use std::fs;

/// 主配置
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub proxy: ProxyConfig,
    pub socket: SocketConfig,
}

/// 代理配置
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ProxyConfig {
    /// 监听地址
    pub listen: String,
    /// 目标地址
    pub target: String,
    /// TLS 配置（可选）
    pub tls: Option<TlsConfig>,
}

/// TLS 配置
#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct TlsConfig {
    /// 证书文件路径
    pub cert_path: String,
    /// 私钥文件路径
    pub key_path: String,
}

/// Socket 调试配置
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SocketConfig {
    /// 默认数据格式: hex, text, json
    #[serde(default = "default_format")]
    pub default_format: String,
}

fn default_format() -> String {
    "text".to_string()
}

impl Config {
    /// 从文件加载配置
    pub fn from_file(path: &str) -> Result<Self, ConfigError> {
        let content = fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    /// 从字符串解析配置
    pub fn parse_str(content: &str) -> Result<Self, ConfigError> {
        let config: Config = toml::from_str(content)?;
        Ok(config)
    }
}

impl Default for Config {
    fn default() -> Self {
        Config {
            proxy: ProxyConfig {
                listen: "127.0.0.1:8080".to_string(),
                target: "127.0.0.1:9000".to_string(),
                tls: None,
            },
            socket: SocketConfig {
                default_format: "text".to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_config() {
        let content = r#"
[proxy]
listen = "127.0.0.1:8080"
target = "127.0.0.1:9000"

[socket]
default_format = "text"
"#;
        let config = Config::parse_str(content).unwrap();
        assert_eq!(config.proxy.listen, "127.0.0.1:8080");
        assert_eq!(config.proxy.target, "127.0.0.1:9000");
        assert_eq!(config.socket.default_format, "text");
    }

    #[test]
    fn test_parse_config_with_tls() {
        let content = r#"
[proxy]
listen = "127.0.0.1:8443"
target = "127.0.0.1:9000"

[proxy.tls]
cert_path = "./certs/server.crt"
key_path = "./certs/server.key"

[socket]
default_format = "json"
"#;
        let config = Config::parse_str(content).unwrap();
        assert!(config.proxy.tls.is_some());
        let tls = config.proxy.tls.unwrap();
        assert_eq!(tls.cert_path, "./certs/server.crt");
    }

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.proxy.listen, "127.0.0.1:8080");
    }
}
