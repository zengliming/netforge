//! 共享的代理工具函数

use crate::events::ProxyEvent;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use tracing::warn;

pub fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

pub fn build_connection_id(client_addr: &str) -> String {
    format!("{}-{}", client_addr, get_current_timestamp())
}

pub async fn send_proxy_event(event_sender: &mpsc::Sender<ProxyEvent>, event: ProxyEvent) {
    if let Err(err) = event_sender.send(event).await {
        warn!("Failed to send proxy event: {}", err);
    }
}