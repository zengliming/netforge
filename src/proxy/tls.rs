use crate::error::ProxyError;
use crate::events::{ProxyEvent, TrafficStats};
use super::utils::{build_connection_id, get_current_timestamp, send_proxy_event};
use bytes::BytesMut;
use std::fs::File;
use std::io::BufReader;
use std::sync::Arc;
use tokio::io::{copy_bidirectional, AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio::time::{interval, Duration};
use tokio_util::sync::CancellationToken;
use tokio_rustls::rustls::pki_types::{CertificateDer, PrivateKeyDer};
use tokio_rustls::rustls::ServerConfig;
use tokio_rustls::TlsAcceptor;
use tracing::{error, info, warn};

fn validate_cert_path(path: &str) -> Result<std::path::PathBuf, ProxyError> {
  let path = std::path::Path::new(path);
  
  // 获取规范化的绝对路径
  let canonical = path.canonicalize()
    .map_err(|e| ProxyError::CertError(format!("证书路径无效: {}", e)))?;
  
  // 检查是否为文件
  if !canonical.is_file() {
    return Err(ProxyError::CertError("证书路径不是有效文件".to_string()));
  }
  
  Ok(canonical)
}

fn load_certs(path: &str) -> Result<Vec<CertificateDer<'static>>, ProxyError> {
  validate_cert_path(path)?;
  
  let file = File::open(path).map_err(|e| ProxyError::CertError(e.to_string()))?;
  let mut reader = BufReader::new(file);
  let certs = rustls_pemfile::certs(&mut reader)
    .filter_map(|c| c.ok())
    .collect();
  Ok(certs)
}

fn load_private_key(path: &str) -> Result<PrivateKeyDer<'static>, ProxyError> {
  validate_cert_path(path)?;
  
  let file = File::open(path).map_err(|e| ProxyError::CertError(e.to_string()))?;
  let mut reader = BufReader::new(file);
  let key = rustls_pemfile::private_key(&mut reader)
    .map_err(|e| ProxyError::CertError(e.to_string()))?
    .ok_or_else(|| ProxyError::CertError("No private key found".to_string()))?;
  Ok(key)
}

async fn handle_tls_connection_with_events(
  stream: tokio::net::TcpStream,
  client_addr: std::net::SocketAddr,
  target: String,
  connection_id: String,
  acceptor: TlsAcceptor,
  event_sender: mpsc::Sender<ProxyEvent>,
  cancel_token: CancellationToken,
) {
  match acceptor.accept(stream).await {
    Ok(client) => {
      info!("TLS handshake completed for {}", client_addr);

      match tokio::net::TcpStream::connect(&target).await {
        Ok(server) => {
          info!("Connected to target {}", target);

          let (mut client_reader, mut client_writer) = tokio::io::split(client);
          let (mut server_reader, mut server_writer) = server.into_split();

          let mut client_buffer = BytesMut::with_capacity(16 * 1024);
          client_buffer.resize(16 * 1024, 0);
          let mut server_buffer = BytesMut::with_capacity(16 * 1024);
          server_buffer.resize(16 * 1024, 0);
          let mut total_bytes_from_client = 0u64;
          let mut total_bytes_from_server = 0u64;
          let mut last_bytes_from_client = 0u64;
          let mut last_bytes_from_server = 0u64;
          let mut stats_interval = interval(Duration::from_secs(1));
          stats_interval.tick().await;

          loop {
            tokio::select! {
              _ = cancel_token.cancelled() => {
                info!("TLS connection {} cancelled", connection_id);
                break;
              }
              _ = stats_interval.tick() => {
                let bytes_in_delta = total_bytes_from_client - last_bytes_from_client;
                let bytes_out_delta = total_bytes_from_server - last_bytes_from_server;
                let rate_in = bytes_in_delta as f64;
                let rate_out = bytes_out_delta as f64;
                
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
                      warn!("TLS connection {} write to target failed: {}", connection_id, err);
                      send_proxy_event(
                        &event_sender,
                        ProxyEvent::Error { message: format!("TLS 连接 {} 写入目标失败: {}", connection_id, err) },
                      )
                      .await;
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
                    )
                    .await;
                  }
                  Err(err) => {
                    warn!("TLS connection {} read from client failed: {}", connection_id, err);
                    send_proxy_event(
                      &event_sender,
                      ProxyEvent::Error { message: format!("TLS 连接 {} 读取客户端失败: {}", connection_id, err) },
                    )
                    .await;
                    break;
                  }
                }
              }
              read_from_server = server_reader.read(&mut server_buffer) => {
                match read_from_server {
                  Ok(0) => break,
                  Ok(bytes_read) => {
                    if let Err(err) = client_writer.write_all(&server_buffer[..bytes_read]).await {
                      warn!("TLS connection {} write to client failed: {}", connection_id, err);
                      send_proxy_event(
                        &event_sender,
                        ProxyEvent::Error { message: format!("TLS 连接 {} 写入客户端失败: {}", connection_id, err) },
                      )
                      .await;
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
                    )
                    .await;
                  }
                  Err(err) => {
                    warn!("TLS connection {} read from target failed: {}", connection_id, err);
                    send_proxy_event(
                      &event_sender,
                      ProxyEvent::Error { message: format!("TLS 连接 {} 读取目标失败: {}", connection_id, err) },
                    )
                    .await;
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
            "TLS connection {} closed: {} bytes from client, {} bytes from server",
            connection_id, total_bytes_from_client, total_bytes_from_server
          );
        }
        Err(err) => {
          error!("Failed to connect to target {}: {}", target, err);
          send_proxy_event(
            &event_sender,
            ProxyEvent::Error {
              message: format!("TLS 连接目标 {} 失败: {}", target, err),
            },
          )
          .await;
        }
      }
    }
    Err(err) => {
      error!("TLS handshake failed for {}: {}", client_addr, err);
      send_proxy_event(
        &event_sender,
        ProxyEvent::Error {
          message: format!("TLS 握手失败 {}: {}", client_addr, err),
        },
      )
      .await;
    }
  }
}

pub async fn run_tls_proxy_with_events(
  listen: &str,
  target: &str,
  cert_path: &str,
  key_path: &str,
  cancel_token: CancellationToken,
  event_sender: mpsc::Sender<ProxyEvent>,
) -> Result<(), ProxyError> {
  let certs = load_certs(cert_path)?;
  let key = load_private_key(key_path)?;

  let config = ServerConfig::builder()
    .with_no_client_auth()
    .with_single_cert(certs, key)
    .map_err(|e| ProxyError::TlsError(e.to_string()))?;

  let acceptor = TlsAcceptor::from(Arc::new(config));
  let listener = match TcpListener::bind(listen).await {
    Ok(listener) => listener,
    Err(err) => {
      send_proxy_event(
        &event_sender,
        ProxyEvent::Error {
          message: format!("TLS 绑定监听地址 {} 失败: {}", listen, err),
        },
      )
      .await;
      return Err(err.into());
    }
  };

  info!("TLS proxy listening on {}, forwarding to {}", listen, target);

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        info!("TLS proxy cancelled: {}", listen);
        break;
      }
      accept_result = listener.accept() => {
        let (stream, client_addr) = match accept_result {
          Ok(result) => result,
          Err(err) => {
            send_proxy_event(
              &event_sender,
              ProxyEvent::Error {
                message: format!("TLS 接受连接失败: {}", err),
              },
            )
            .await;
            return Err(err.into());
          }
        };

        info!("New TLS connection from {}", client_addr);

        let connection_id = build_connection_id(&client_addr.to_string());
        send_proxy_event(
          &event_sender,
          ProxyEvent::NewConnection {
            id: connection_id.clone(),
            source: client_addr.to_string(),
            target: target.to_string(),
            timestamp: get_current_timestamp(),
          },
        )
        .await;

        let connection_target = target.to_string();
        let connection_acceptor = acceptor.clone();
        let connection_events = event_sender.clone();
        let connection_cancel_token = cancel_token.clone();

        tokio::spawn(async move {
          handle_tls_connection_with_events(
            stream,
            client_addr,
            connection_target,
            connection_id,
            connection_acceptor,
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

/// 运行 TLS 代理
pub async fn run_tls_proxy(
  listen: &str,
  target: &str,
  cert_path: &str,
  key_path: &str,
) -> Result<(), ProxyError> {
  let certs = load_certs(cert_path)?;
  let key = load_private_key(key_path)?;

  let config = ServerConfig::builder()
    .with_no_client_auth()
    .with_single_cert(certs, key)
    .map_err(|e| ProxyError::TlsError(e.to_string()))?;

  let acceptor = TlsAcceptor::from(Arc::new(config));
  let listener = TcpListener::bind(listen).await?;
  info!("TLS proxy listening on {}, forwarding to {}", listen, target);

  loop {
    let (stream, client_addr) = listener.accept().await?;
    info!("New TLS connection from {}", client_addr);

    let acceptor = acceptor.clone();
    let target = target.to_string();
    tokio::spawn(async move {
      match acceptor.accept(stream).await {
        Ok(mut client) => {
          info!("TLS handshake completed for {}", client_addr);
          match tokio::net::TcpStream::connect(&target).await {
            Ok(mut server) => match copy_bidirectional(&mut client, &mut server).await {
              Ok((from_client, from_server)) => {
                info!(
                  "TLS connection closed: {} bytes from client, {} bytes from server",
                  from_client, from_server
                );
              }
              Err(e) => {
                warn!("TLS connection error: {}", e);
              }
            },
            Err(e) => {
              error!("Failed to connect to target {}: {}", target, e);
            }
          }
        }
        Err(e) => {
          error!("TLS handshake failed for {}: {}", client_addr, e);
        }
      }
    });
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_tls_proxy_load_certs_invalid_path() {
    let result = load_certs("nonexistent.pem");
    assert!(result.is_err());
  }

  #[test]
  fn test_tls_proxy_load_private_key_invalid_path() {
    let result = load_private_key("nonexistent.pem");
    assert!(result.is_err());
  }
}
