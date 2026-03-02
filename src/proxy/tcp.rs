use crate::error::ProxyError;
use crate::events::{ProxyEvent, TrafficStats};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{copy_bidirectional, AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::time::{interval, Duration};
use tokio_util::sync::CancellationToken;
use tracing::{error, info, warn};

fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn build_connection_id(client_addr: &str) -> String {
    format!("{}-{}", client_addr, get_current_timestamp())
}

async fn send_proxy_event(event_sender: &mpsc::Sender<ProxyEvent>, event: ProxyEvent) {
    if let Err(err) = event_sender.send(event).await {
        warn!("Failed to send proxy event: {}", err);
    }
}

async fn handle_connection_with_events(
    mut client: TcpStream,
    target: String,
    connection_id: String,
    event_sender: mpsc::Sender<ProxyEvent>,
    cancel_token: CancellationToken,
) {
    match TcpStream::connect(&target).await {
        Ok(server) => {
            info!("Connected to target {}", target);

            let (mut client_reader, mut client_writer) = client.split();
            let (mut server_reader, mut server_writer) = server.into_split();

            let mut client_buffer = [0u8; 16 * 1024];
            let mut server_buffer = [0u8; 16 * 1024];
            let mut total_bytes_from_client = 0u64;
            let mut total_bytes_from_server = 0u64;
            let mut last_bytes_from_client = 0u64;
            let mut last_bytes_from_server = 0u64;
            let mut stats_interval = interval(Duration::from_secs(1));
            stats_interval.tick().await; // 跳过第一个立即触发
            loop {
                tokio::select! {
                    _ = cancel_token.cancelled() => {
                        info!("Connection {} cancelled", connection_id);
                        break;
                    }
                    _ = stats_interval.tick() => {
                        // 计算每秒速率
                        let bytes_in_delta = total_bytes_from_client - last_bytes_from_client;
                        let bytes_out_delta = total_bytes_from_server - last_bytes_from_server;
                        let rate_in = bytes_in_delta as f64; // bytes/s
                        let rate_out = bytes_out_delta as f64; // bytes/s
                        
                        let stats = TrafficStats {
                            bytes_in: total_bytes_from_client,
                            bytes_out: total_bytes_from_server,
                            rate_in,
                            rate_out,
                        };
                        
                        send_proxy_event(
                            &event_sender,
                            ProxyEvent::Stats {
                                id: connection_id.clone(),
                                stats,
                            },
                        ).await;
                        
                        last_bytes_from_client = total_bytes_from_client;
                        last_bytes_from_server = total_bytes_from_server;
                    }
                    read_from_client = client_reader.read(&mut client_buffer) => {
                        match read_from_client {
                            Ok(0) => break,
                            Ok(bytes_read) => {
                                if let Err(err) = server_writer.write_all(&client_buffer[..bytes_read]).await {
                                    warn!("Connection {} write to target failed: {}", connection_id, err);
                                    send_proxy_event(
                                        &event_sender,
                                        ProxyEvent::Error { message: format!("连接 {} 写入目标失败: {}", connection_id, err) },
                                    ).await;
                                    break;
                                }

                                total_bytes_from_client += bytes_read as u64;
                                send_proxy_event(
                                    &event_sender,
                                    ProxyEvent::DataTransferred {
                                        id: connection_id.clone(),
                                        bytes_from_client: total_bytes_from_client,
                                        bytes_from_server: total_bytes_from_server,
                                    },
                                ).await;
                            }
                            Err(err) => {
                                warn!("Connection {} read from client failed: {}", connection_id, err);
                                send_proxy_event(
                                    &event_sender,
                                    ProxyEvent::Error { message: format!("连接 {} 读取客户端失败: {}", connection_id, err) },
                                ).await;
                                break;
                            }
                        }
                    }
                    read_from_server = server_reader.read(&mut server_buffer) => {
                        match read_from_server {
                            Ok(0) => break,
                            Ok(bytes_read) => {
                                if let Err(err) = client_writer.write_all(&server_buffer[..bytes_read]).await {
                                    warn!("Connection {} write to client failed: {}", connection_id, err);
                                    send_proxy_event(
                                        &event_sender,
                                        ProxyEvent::Error { message: format!("连接 {} 写入客户端失败: {}", connection_id, err) },
                                    ).await;
                                    break;
                                }

                                total_bytes_from_server += bytes_read as u64;
                                send_proxy_event(
                                    &event_sender,
                                    ProxyEvent::DataTransferred {
                                        id: connection_id.clone(),
                                        bytes_from_client: total_bytes_from_client,
                                        bytes_from_server: total_bytes_from_server,
                                    },
                                ).await;
                            }
                            Err(err) => {
                                warn!("Connection {} read from target failed: {}", connection_id, err);
                                send_proxy_event(
                                    &event_sender,
                                    ProxyEvent::Error { message: format!("连接 {} 读取目标失败: {}", connection_id, err) },
                                ).await;
                                break;
                            }
                        }
                    }
                }
            }

            send_proxy_event(
                &event_sender,
                ProxyEvent::ConnectionClosed {
                    id: connection_id.clone(),
                    total_bytes_from_client,
                    total_bytes_from_server,
                },
            )
            .await;

            info!(
                "Connection {} closed: {} bytes from client, {} bytes from server",
                connection_id, total_bytes_from_client, total_bytes_from_server
            );
        }
        Err(err) => {
            error!("Failed to connect to target {}: {}", target, err);
            send_proxy_event(
                &event_sender,
                ProxyEvent::Error {
                    message: format!("连接目标 {} 失败: {}", target, err),
                },
            )
            .await;
        }
    }
}

pub async fn run_tcp_proxy_with_events(
    listen: &str,
    target: &str,
    cancel_token: CancellationToken,
    event_sender: mpsc::Sender<ProxyEvent>,
) -> Result<(), ProxyError> {
    let listener = match TcpListener::bind(listen).await {
        Ok(listener) => listener,
        Err(err) => {
            send_proxy_event(
                &event_sender,
                ProxyEvent::Error {
                    message: format!("绑定监听地址 {} 失败: {}", listen, err),
                },
            )
            .await;
            return Err(err.into());
        }
    };

    info!("TCP proxy listening on {}, forwarding to {}", listen, target);

    loop {
        tokio::select! {
            _ = cancel_token.cancelled() => {
                info!("TCP proxy cancelled: {}", listen);
                break;
            }
            accept_result = listener.accept() => {
                let (client, client_addr) = match accept_result {
                    Ok(result) => result,
                    Err(err) => {
                        send_proxy_event(
                            &event_sender,
                            ProxyEvent::Error {
                                message: format!("接受连接失败: {}", err),
                            },
                        ).await;
                        return Err(err.into());
                    }
                };

                info!("New connection from {}", client_addr);

                let connection_id = build_connection_id(&client_addr.to_string());
                send_proxy_event(
                    &event_sender,
                    ProxyEvent::NewConnection {
                        id: connection_id.clone(),
                        source: client_addr.to_string(),
                        target: target.to_string(),
                        timestamp: get_current_timestamp(),
                    },
                ).await;

                let target = target.to_string();
                let connection_events = event_sender.clone();
                let connection_cancel_token = cancel_token.clone();

                tokio::spawn(async move {
                    handle_connection_with_events(
                        client,
                        target,
                        connection_id,
                        connection_events,
                        connection_cancel_token,
                    )
                    .await;
                });
            }
        }
    }

    Ok(())
}

/// 运行 TCP 代理
pub async fn run_tcp_proxy(listen: &str, target: &str) -> Result<(), ProxyError> {
    let listener = TcpListener::bind(listen).await?;
    info!("TCP proxy listening on {}, forwarding to {}", listen, target);

    loop {
        let (mut client, client_addr) = listener.accept().await?;
        info!("New connection from {}", client_addr);

        let target = target.to_string();
        tokio::spawn(async move {
            match TcpStream::connect(&target).await {
                Ok(mut server) => {
                    info!("Connected to target {}", target);
                    match copy_bidirectional(&mut client, &mut server).await {
                        Ok((from_client, from_server)) => {
                            info!(
                                "Connection closed: {} bytes from client, {} bytes from server",
                                from_client, from_server
                            );
                        }
                        Err(e) => {
                            warn!("Connection error: {}", e);
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to connect to target {}: {}", target, e);
                }
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_tcp_proxy_basic() {
        // 启动目标服务
        let target_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_addr = target_listener.local_addr().unwrap().to_string();

        // 启动代理
        let proxy_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let proxy_addr = proxy_listener.local_addr().unwrap().to_string();
        let proxy_addr_for_spawn = proxy_addr.clone();
        drop(proxy_listener); // 释放端口

        // 目标服务处理
        tokio::spawn(async move {
            let (mut conn, _) = target_listener.accept().await.unwrap();
            let mut buf = [0u8; 1024];
            let n = conn.read(&mut buf).await.unwrap();
            conn.write_all(&buf[..n]).await.unwrap();
        });

        // 运行代理
        let proxy_handle = tokio::spawn(async move {
            let _ = run_tcp_proxy(&proxy_addr_for_spawn, &target_addr).await;
        });

        sleep(Duration::from_millis(100)).await;

        // 客户端连接测试
        let mut client = TcpStream::connect(&proxy_addr).await.unwrap();
        client.write_all(b"hello proxy").await.unwrap();
        let mut buf = [0u8; 1024];
        let n = client.read(&mut buf).await.unwrap();
        assert_eq!(&buf[..n], b"hello proxy");

        proxy_handle.abort();
    }
}
