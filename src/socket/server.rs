use crate::error::SocketError;
use crate::events::{DataFormat as EventDataFormat, SocketEvent};
use crate::socket::format::{format_data, DataFormat};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::OwnedWriteHalf;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, warn};

type SharedClients = Arc<RwLock<HashMap<SocketAddr, Arc<Mutex<OwnedWriteHalf>>>>>;

fn map_event_data_format(format: DataFormat) -> EventDataFormat {
  match format {
    DataFormat::Hex => EventDataFormat::Hex,
    DataFormat::Text => EventDataFormat::Text,
    DataFormat::Json => EventDataFormat::Json,
  }
}

async fn send_socket_event(event_sender: &mpsc::Sender<SocketEvent>, event: SocketEvent) {
  debug!("send_socket_event: {:?}", event);
  if let Err(err) = event_sender.send(event).await {
    warn!("Failed to send socket event: {}", err);
  }
}
async fn handle_gui_outbound_data(
  event_sender: &mpsc::Sender<SocketEvent>,
  clients: &SharedClients,
  target_addr: SocketAddr,
  data: Vec<u8>,
) {
  let current_clients: Vec<(SocketAddr, Arc<Mutex<OwnedWriteHalf>>)> = {
    let locked_clients = clients.read().await;
    locked_clients
      .iter()
      .map(|(addr, writer)| (*addr, Arc::clone(writer)))
      .collect()
  };

  if current_clients.is_empty() {
    send_socket_event(
      event_sender,
      SocketEvent::Error {
        session_id: None,
        message: format!("发送失败，当前没有可用客户端。目标地址: {}", target_addr),
      },
    )
    .await;
    return;
  }

  let mut removed_addrs = Vec::new();
  for (client_addr, writer) in current_clients {
    let write_result = {
      let mut locked_writer = writer.lock().await;
      locked_writer.write_all(&data).await
    };

    match write_result {
      Ok(_) => {
        send_socket_event(
          event_sender,
          SocketEvent::DataSent {
            session_id: client_addr.to_string(),
            data: data.clone(),
          },
        )
        .await;
      }
      Err(err) => {
        error!("Write error to {}: {}", client_addr, err);
        send_socket_event(
          event_sender,
          SocketEvent::Error {
            session_id: Some(client_addr.to_string()),
            message: format!("发送数据失败: {}", err),
          },
        )
        .await;
        removed_addrs.push(client_addr);
      }
    }
  }

  if !removed_addrs.is_empty() {
    {
      let mut locked_clients = clients.write().await;
      for addr in &removed_addrs {
        locked_clients.remove(addr);
      }
    }

    for addr in removed_addrs {
      send_socket_event(
        event_sender,
        SocketEvent::Disconnected {
          session_id: addr.to_string(),
        },
      )
      .await;
    }
  }
}

async fn handle_client_gui(
  cancel_token: CancellationToken,
  event_sender: mpsc::Sender<SocketEvent>,
  clients: SharedClients,
  stream: TcpStream,
  addr: SocketAddr,
  format: DataFormat,
) {
  let (reader, writer) = stream.into_split();
  {
    let mut locked_clients = clients.write().await;
    locked_clients.insert(addr, Arc::new(Mutex::new(writer)));
  }

  let mut reader = BufReader::new(reader);
  let event_format = map_event_data_format(format);

  send_socket_event(
    &event_sender,
    SocketEvent::Connected {
      session_id: addr.to_string(),
      remote_addr: addr.to_string(),
    },
  )
  .await;

  let mut buf = [0u8; 4096];
  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        break;
      }
      read_result = reader.read(&mut buf) => {
        match read_result {
          Ok(0) => {
            break;
          }
          Ok(n) => {
            send_socket_event(
              &event_sender,
              SocketEvent::DataReceived {
                session_id: addr.to_string(),
                data: buf[..n].to_vec(),
                format: event_format.clone(),
              },
            )
            .await;
          }
          Err(err) => {
            error!("Read error from {}: {}", addr, err);
            send_socket_event(
              &event_sender,
              SocketEvent::Error {
                session_id: Some(addr.to_string()),
                message: format!("读取数据失败: {}", err),
              },
            )
            .await;
            break;
          }
        }
      }
    }
  }

  {
    let mut locked_clients = clients.write().await;
    locked_clients.remove(&addr);
  }

  send_socket_event(
    &event_sender,
    SocketEvent::Disconnected {
      session_id: addr.to_string(),
    },
  )
  .await;
}

pub async fn run_socket_server_gui(
  cancel_token: CancellationToken,
  event_sender: mpsc::Sender<SocketEvent>,
  input_receiver: mpsc::Receiver<(SocketAddr, Vec<u8>)>,
  listen: &str,
  format: DataFormat,
) -> Result<(), SocketError> {
  let listener = match TcpListener::bind(listen).await {
    Ok(listener) => listener,
    Err(err) => {
      send_socket_event(
        &event_sender,
        SocketEvent::Error {
          session_id: None,
          message: format!("绑定地址 {} 失败: {}", listen, err),
        },
      )
      .await;
      return Err(SocketError::BindError(listen.to_string(), err));
    }
  };

  debug!("Socket server(gui) listening on {}", listen);
  info!("Socket server(gui) listening on {}", listen);
  let clients: SharedClients = Arc::new(RwLock::new(HashMap::new()));
  let mut input_receiver = input_receiver;
  let mut input_closed = false;

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        break;
      }
      accept_result = listener.accept() => {
        match accept_result {
          Ok((stream, addr)) => {
            debug!("Accepted connection from {}", addr);
            let task_cancel_token = cancel_token.clone();
            let task_event_sender = event_sender.clone();
            let task_clients = Arc::clone(&clients);
            tokio::spawn(async move {
              debug!("Spawning handle_client_gui for {}", addr);
              handle_client_gui(task_cancel_token, task_event_sender, task_clients, stream, addr, format).await;
            });
          }
          Err(err) => {
            error!("Accept error: {}", err);
            send_socket_event(
              &event_sender,
              SocketEvent::Error {
                session_id: None,
                message: format!("接受连接失败: {}", err),
              },
            )
            .await;
          }
        }
      }
      outbound = input_receiver.recv(), if !input_closed => {
        match outbound {
          Some((target_addr, data)) => {
            handle_gui_outbound_data(&event_sender, &clients, target_addr, data).await;
          }
          None => {
            input_closed = true;
          }
        }
      }
    }
  }

  Ok(())
}

/// 运行 Socket 调试服务端
pub async fn run_socket_server(listen: &str, format: DataFormat) -> Result<(), SocketError> {
  let listener = TcpListener::bind(listen).await?;
  info!("Socket server listening on {}", listen);
  info!("Format: {:?}, Waiting for connections...", format);

  loop {
    let (stream, addr) = listener.accept().await?;
    info!("Client connected: {}", addr);

    tokio::spawn(async move {
      if let Err(e) = handle_client(stream, addr, format).await {
        error!("Client {} error: {}", addr, e);
      }
    });
  }
}

async fn handle_client(
  stream: TcpStream,
  addr: std::net::SocketAddr,
  format: DataFormat,
) -> Result<(), SocketError> {
  let (reader, writer) = stream.into_split();
  let mut reader = BufReader::new(reader);
  let writer = Arc::new(Mutex::new(writer));

  // 发送任务（从 stdin 读取并写入客户端）
  let send_writer = Arc::clone(&writer);
  let send_format = format;
  let send_handle = tokio::spawn(async move {
    let stdin = tokio::io::stdin();
    let mut stdin_reader = BufReader::new(stdin).lines();

    loop {
      match stdin_reader.next_line().await {
        Ok(Some(line)) => {
          let data = match build_send_data(&line, send_format) {
            Ok(data) => data,
            Err(msg) => {
              warn!("Invalid input: {}", msg);
              continue;
            }
          };

          if data.is_empty() {
            continue;
          }

          let mut locked_writer = send_writer.lock().await;
          if let Err(e) = locked_writer.write_all(&data).await {
            error!("Write error to {}: {}", addr, e);
            break;
          }

          debug!("To {} sent {} bytes", addr, data.len());
        }
        Ok(None) => break,
        Err(e) => {
          error!("Read stdin error: {}", e);
          break;
        }
      }
    }
  });

  // 接收数据
  let mut buf = [0u8; 4096];
  loop {
    match reader.read(&mut buf).await {
      Ok(0) => {
        info!("Client {} disconnected", addr);
        break;
      }
      Ok(n) => {
        let formatted = format_data(&buf[..n], format);
        debug!("From {} received {} bytes: {}", addr, n, formatted);
      }
      Err(e) => {
        error!("Read error from {}: {}", addr, e);
        break;
      }
    }
  }

  send_handle.abort();
  Ok(())
}

fn build_send_data(line: &str, format: DataFormat) -> Result<Vec<u8>, String> {
  match format {
    DataFormat::Hex => parse_hex_data(line),
    DataFormat::Text | DataFormat::Json => {
      let mut data = line.as_bytes().to_vec();
      data.push(b'\n');
      Ok(data)
    }
  }
}

fn parse_hex_data(input: &str) -> Result<Vec<u8>, String> {
  let cleaned_input: String = input.chars().filter(|c| !c.is_whitespace()).collect();
  if cleaned_input.is_empty() {
    return Ok(Vec::new());
  }

  if !cleaned_input.len().is_multiple_of(2) {
    return Err("十六进制字符串长度必须是偶数".to_string());
  }

  let mut result = Vec::with_capacity(cleaned_input.len() / 2);
  let mut index = 0;
  while index < cleaned_input.len() {
    let byte_part = &cleaned_input[index..index + 2];
    let value = u8::from_str_radix(byte_part, 16)
      .map_err(|_| format!("无效十六进制字节: {}", byte_part))?;
    result.push(value);
    index += 2;
  }

  Ok(result)
}

#[cfg(test)]
mod tests {
  use super::*;
  use tokio::io::AsyncWriteExt;
  use tokio::time::{Duration, sleep};

  #[tokio::test]
  async fn test_socket_server_listen() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap().to_string();
    assert!(!addr.is_empty());
  }

  #[tokio::test]
  async fn test_socket_server_accept() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    let server_handle = tokio::spawn(async move {
      let (mut stream, client_addr) = listener.accept().await.unwrap();
      assert!(client_addr.port() > 0);
      let mut buf = [0u8; 16];
      let n = stream.read(&mut buf).await.unwrap();
      assert_eq!(&buf[..n], b"ping");
    });

    sleep(Duration::from_millis(10)).await;
    let mut client = TcpStream::connect(addr).await.unwrap();
    client.write_all(b"ping").await.unwrap();

    server_handle.await.unwrap();
  }

  #[test]
  fn test_socket_server_build_send_data_text() {
    let data = build_send_data("hello", DataFormat::Text).unwrap();
    assert_eq!(data, b"hello\n");
  }

  #[test]
  fn test_socket_server_build_send_data_hex() {
    let data = build_send_data("68 69", DataFormat::Hex).unwrap();
    assert_eq!(data, b"hi");
  }

#[test]
  fn test_socket_server_build_send_data_hex_invalid() {
    let result = build_send_data("6g", DataFormat::Hex);
    assert!(result.is_err());
  }
}
