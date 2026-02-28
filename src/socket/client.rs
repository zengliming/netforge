use crate::error::SocketError;
use crate::events::{DataFormat as EventDataFormat, SocketEvent};
use crate::socket::format::{format_data, DataFormat};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use tracing::{error, info, warn};

fn get_current_timestamp() -> i64 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|duration| duration.as_secs() as i64)
    .unwrap_or(0)
}

fn build_session_id(addr: &str) -> String {
  format!("{}-{}", addr, get_current_timestamp())
}

fn map_event_data_format(format: DataFormat) -> EventDataFormat {
  match format {
    DataFormat::Hex => EventDataFormat::Hex,
    DataFormat::Text => EventDataFormat::Text,
    DataFormat::Json => EventDataFormat::Json,
  }
}

async fn send_socket_event(event_sender: &mpsc::Sender<SocketEvent>, event: SocketEvent) {
  if let Err(err) = event_sender.send(event).await {
    warn!("Failed to send socket event: {}", err);
  }
}

pub async fn run_socket_client_gui(
  cancel_token: CancellationToken,
  event_sender: mpsc::Sender<SocketEvent>,
  mut input_receiver: mpsc::Receiver<String>,
  addr: &str,
  format: DataFormat,
) -> Result<(), SocketError> {
  let stream = match TcpStream::connect(addr).await {
    Ok(stream) => stream,
    Err(err) => {
      send_socket_event(
        &event_sender,
        SocketEvent::Error {
          session_id: None,
          message: format!("连接 {} 失败: {}", addr, err),
        },
      )
      .await;
      return Err(SocketError::ConnectError(addr.to_string(), err));
    }
  };

  let session_id = build_session_id(addr);
  info!("Connected to {} (session: {})", addr, session_id);
  send_socket_event(
    &event_sender,
    SocketEvent::Connected {
      session_id: session_id.clone(),
      remote_addr: addr.to_string(),
    },
  )
  .await;

  let (reader, mut writer) = stream.into_split();
  let mut reader = BufReader::new(reader);
  let event_format = map_event_data_format(format);
  let mut buf = [0u8; 4096];
  let mut run_error: Option<SocketError> = None;

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        info!("Socket client cancelled (session: {})", session_id);
        break;
      }
      read_result = reader.read(&mut buf) => {
        match read_result {
          Ok(0) => {
            info!("Server closed connection (session: {})", session_id);
            break;
          }
          Ok(n) => {
            send_socket_event(
              &event_sender,
              SocketEvent::DataReceived {
                session_id: session_id.clone(),
                data: buf[..n].to_vec(),
                format: event_format.clone(),
              },
            )
            .await;
          }
          Err(err) => {
            error!("Read error (session {}): {}", session_id, err);
            send_socket_event(
              &event_sender,
              SocketEvent::Error {
                session_id: Some(session_id.clone()),
                message: format!("读取数据失败: {}", err),
              },
            )
            .await;
            run_error = Some(SocketError::IoError(err));
            break;
          }
        }
      }
      outbound = input_receiver.recv() => {
        match outbound {
          Some(line) => {
            let mut data = line.into_bytes();
            data.push(b'\n');

            if let Err(err) = writer.write_all(&data).await {
              error!("Write error (session {}): {}", session_id, err);
              send_socket_event(
                &event_sender,
                SocketEvent::Error {
                  session_id: Some(session_id.clone()),
                  message: format!("发送数据失败: {}", err),
                },
              )
              .await;
              run_error = Some(SocketError::IoError(err));
              break;
            }

            send_socket_event(
              &event_sender,
              SocketEvent::DataSent {
                session_id: session_id.clone(),
                data,
              },
            )
            .await;
          }
          None => {
            info!("GUI input channel closed (session: {})", session_id);
            break;
          }
        }
      }
    }
  }

  send_socket_event(
    &event_sender,
    SocketEvent::Disconnected {
      session_id: session_id,
    },
  )
  .await;

  if let Some(err) = run_error {
    return Err(err);
  }

  Ok(())
}

/// 运行 Socket 调试客户端
pub async fn run_socket_client(addr: &str, format: DataFormat) -> Result<(), SocketError> {
  let stream = TcpStream::connect(addr).await?;
  info!("Connected to {}", addr);
  println!("Connected to {}", addr);
  println!(
    "Format: {:?}, Type message and press Enter to send, Ctrl+C to exit",
    format
  );

  let (reader, mut writer) = stream.into_split();
  let mut reader = BufReader::new(reader);

  // 接收任务
  let recv_format = format;
  let recv_handle = tokio::spawn(async move {
    let mut buf = [0u8; 4096];
    loop {
      match reader.read(&mut buf).await {
        Ok(0) => {
          println!("\n[Connection closed by server]");
          break;
        }
        Ok(n) => {
          let formatted = format_data(&buf[..n], recv_format);
          println!("\n[Received {} bytes]:\n{}\n", n, formatted);
          print!("> ");
        }
        Err(e) => {
          error!("Read error: {}", e);
          break;
        }
      }
    }
  });

  // 发送任务（从 stdin 读取）
  let stdin = tokio::io::stdin();
  let mut stdin_reader = BufReader::new(stdin).lines();

  print!("> ");
  while let Some(line) = stdin_reader.next_line().await? {
    let mut data = line.into_bytes();
    data.push(b'\n');
    writer.write_all(&data).await?;
    print!("> ");
  }

  recv_handle.abort();
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use tokio::io::AsyncWriteExt;
  use tokio::net::TcpListener;

  #[tokio::test]
  async fn test_socket_client_connect() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap().to_string();

    tokio::spawn(async move {
      let (mut conn, _) = listener.accept().await.unwrap();
      conn.write_all(b"hello client").await.unwrap();
    });

    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    let stream = TcpStream::connect(&addr).await;
    assert!(stream.is_ok());
  }
}
