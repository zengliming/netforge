#![allow(non_snake_case)]

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
use tracing::{error, info, warn};

type SharedClients = Arc<RwLock<HashMap<SocketAddr, Arc<Mutex<OwnedWriteHalf>>>>>;

fn map_event_data_format(format: DataFormat) -> EventDataFormat {
  match format {
    DataFormat::Hex => EventDataFormat::Hex,
    DataFormat::Text => EventDataFormat::Text,
    DataFormat::Json => EventDataFormat::Json,
  }
}

async fn send_socket_event(eventSender: &mpsc::Sender<SocketEvent>, event: SocketEvent) {
  eprintln!("[DEBUG] send_socket_event: {:?}", event);
  if let Err(err) = eventSender.send(event).await {
    eprintln!("[ERROR] Failed to send socket event: {}", err);
    warn!("Failed to send socket event: {}", err);
  }
}
async fn handle_gui_outbound_data(
  eventSender: &mpsc::Sender<SocketEvent>,
  clients: &SharedClients,
  targetAddr: SocketAddr,
  data: Vec<u8>,
) {
  let currentClients: Vec<(SocketAddr, Arc<Mutex<OwnedWriteHalf>>)> = {
    let lockedClients = clients.read().await;
    lockedClients
      .iter()
      .map(|(addr, writer)| (*addr, Arc::clone(writer)))
      .collect()
  };

  if currentClients.is_empty() {
    send_socket_event(
      eventSender,
      SocketEvent::Error {
        session_id: None,
        message: format!("发送失败，当前没有可用客户端。目标地址: {}", targetAddr),
      },
    )
    .await;
    return;
  }

  let mut removedAddrs = Vec::new();
  for (clientAddr, writer) in currentClients {
    let writeResult = {
      let mut lockedWriter = writer.lock().await;
      lockedWriter.write_all(&data).await
    };

    match writeResult {
      Ok(_) => {
        send_socket_event(
          eventSender,
          SocketEvent::DataSent {
            session_id: clientAddr.to_string(),
            data: data.clone(),
          },
        )
        .await;
      }
      Err(err) => {
        error!("Write error to {}: {}", clientAddr, err);
        send_socket_event(
          eventSender,
          SocketEvent::Error {
            session_id: Some(clientAddr.to_string()),
            message: format!("发送数据失败: {}", err),
          },
        )
        .await;
        removedAddrs.push(clientAddr);
      }
    }
  }

  if !removedAddrs.is_empty() {
    {
      let mut lockedClients = clients.write().await;
      for addr in &removedAddrs {
        lockedClients.remove(addr);
      }
    }

    for addr in removedAddrs {
      send_socket_event(
        eventSender,
        SocketEvent::Disconnected {
          session_id: addr.to_string(),
        },
      )
      .await;
    }
  }
}

async fn handle_client_gui(
  cancelToken: CancellationToken,
  eventSender: mpsc::Sender<SocketEvent>,
  clients: SharedClients,
  stream: TcpStream,
  addr: SocketAddr,
  format: DataFormat,
) {
  let (reader, writer) = stream.into_split();
  {
    let mut lockedClients = clients.write().await;
    lockedClients.insert(addr, Arc::new(Mutex::new(writer)));
  }

  let mut reader = BufReader::new(reader);
  let eventFormat = map_event_data_format(format);

  send_socket_event(
    &eventSender,
    SocketEvent::Connected {
      session_id: addr.to_string(),
      remote_addr: addr.to_string(),
    },
  )
  .await;

  let mut buf = [0u8; 4096];
  loop {
    tokio::select! {
      _ = cancelToken.cancelled() => {
        break;
      }
      readResult = reader.read(&mut buf) => {
        match readResult {
          Ok(0) => {
            break;
          }
          Ok(n) => {
            send_socket_event(
              &eventSender,
              SocketEvent::DataReceived {
                session_id: addr.to_string(),
                data: buf[..n].to_vec(),
                format: eventFormat.clone(),
              },
            )
            .await;
          }
          Err(err) => {
            error!("Read error from {}: {}", addr, err);
            send_socket_event(
              &eventSender,
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
    let mut lockedClients = clients.write().await;
    lockedClients.remove(&addr);
  }

  send_socket_event(
    &eventSender,
    SocketEvent::Disconnected {
      session_id: addr.to_string(),
    },
  )
  .await;
}

pub async fn run_socket_server_gui(
  cancelToken: CancellationToken,
  eventSender: mpsc::Sender<SocketEvent>,
  inputReceiver: mpsc::Receiver<(SocketAddr, Vec<u8>)>,
  listen: &str,
  format: DataFormat,
) -> Result<(), SocketError> {
  let listener = match TcpListener::bind(listen).await {
    Ok(listener) => listener,
    Err(err) => {
      send_socket_event(
        &eventSender,
        SocketEvent::Error {
          session_id: None,
          message: format!("绑定地址 {} 失败: {}", listen, err),
        },
      )
      .await;
      return Err(SocketError::BindError(listen.to_string(), err));
    }
  };

  eprintln!("[DEBUG] Socket server(gui) listening on {}", listen);
  info!("Socket server(gui) listening on {}", listen);
  let clients: SharedClients = Arc::new(RwLock::new(HashMap::new()));
  let mut inputReceiver = inputReceiver;
  let mut inputClosed = false;

  loop {
    tokio::select! {
      _ = cancelToken.cancelled() => {
        break;
      }
      acceptResult = listener.accept() => {
        match acceptResult {
          Ok((stream, addr)) => {
            eprintln!("[DEBUG] Accepted connection from {}", addr);
            let taskCancelToken = cancelToken.clone();
            let taskEventSender = eventSender.clone();
            let taskClients = Arc::clone(&clients);
            tokio::spawn(async move {
              eprintln!("[DEBUG] Spawning handle_client_gui for {}", addr);
              handle_client_gui(taskCancelToken, taskEventSender, taskClients, stream, addr, format).await;
            });
          }
          Err(err) => {
            error!("Accept error: {}", err);
            send_socket_event(
              &eventSender,
              SocketEvent::Error {
                session_id: None,
                message: format!("接受连接失败: {}", err),
              },
            )
            .await;
          }
        }
      }
      outbound = inputReceiver.recv(), if !inputClosed => {
        match outbound {
          Some((targetAddr, data)) => {
            handle_gui_outbound_data(&eventSender, &clients, targetAddr, data).await;
          }
          None => {
            inputClosed = true;
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
  println!("Socket server listening on {}", listen);
  println!("Format: {:?}, Waiting for connections...", format);

  loop {
    let (stream, addr) = listener.accept().await?;
    info!("Client connected: {}", addr);
    println!("\n[Client connected: {}]", addr);

    let format = format;
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
  let sendWriter = Arc::clone(&writer);
  let sendFormat = format;
  let sendHandle = tokio::spawn(async move {
    let stdin = tokio::io::stdin();
    let mut stdinReader = BufReader::new(stdin).lines();

    loop {
      match stdinReader.next_line().await {
        Ok(Some(line)) => {
          let data = match build_send_data(&line, sendFormat) {
            Ok(data) => data,
            Err(msg) => {
              println!("[Invalid input] {}", msg);
              continue;
            }
          };

          if data.is_empty() {
            continue;
          }

          let mut lockedWriter = sendWriter.lock().await;
          if let Err(e) = lockedWriter.write_all(&data).await {
            error!("Write error to {}: {}", addr, e);
            break;
          }

          println!("[To {} sent {} bytes]", addr, data.len());
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
        println!("\n[Client {} disconnected]", addr);
        break;
      }
      Ok(n) => {
        let formatted = format_data(&buf[..n], format);
        println!("\n[From {} received {} bytes]:\n{}\n", addr, n, formatted);
      }
      Err(e) => {
        error!("Read error from {}: {}", addr, e);
        break;
      }
    }
  }

  sendHandle.abort();
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
  let cleanedInput: String = input.chars().filter(|c| !c.is_whitespace()).collect();
  if cleanedInput.is_empty() {
    return Ok(Vec::new());
  }

  if cleanedInput.len() % 2 != 0 {
    return Err("十六进制字符串长度必须是偶数".to_string());
  }

  let mut result = Vec::with_capacity(cleanedInput.len() / 2);
  let mut index = 0;
  while index < cleanedInput.len() {
    let bytePart = &cleanedInput[index..index + 2];
    let value = u8::from_str_radix(bytePart, 16)
      .map_err(|_| format!("无效十六进制字节: {}", bytePart))?;
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

    let serverHandle = tokio::spawn(async move {
      let (mut stream, clientAddr) = listener.accept().await.unwrap();
      assert!(clientAddr.port() > 0);
      let mut buf = [0u8; 16];
      let n = stream.read(&mut buf).await.unwrap();
      assert_eq!(&buf[..n], b"ping");
    });

    sleep(Duration::from_millis(10)).await;
    let mut client = TcpStream::connect(addr).await.unwrap();
    client.write_all(b"ping").await.unwrap();

    serverHandle.await.unwrap();
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
