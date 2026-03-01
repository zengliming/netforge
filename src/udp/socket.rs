use crate::error::SocketError;
use serde::{Deserialize, Serialize};
use tokio::net::UdpSocket;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use tracing::warn;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UdpSendPacket {
  pub target_addr: String,
  pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum UdpEvent {
  Data {
    instance_id: String,
    direction: String,
    remote_addr: String,
    data: Vec<u8>,
  },
  Error {
    instance_id: String,
    message: String,
  },
}

impl UdpEvent {
  pub fn get_event_name(&self) -> &'static str {
    match self {
      UdpEvent::Data { .. } => "udp:data",
      UdpEvent::Error { .. } => "udp:error",
    }
  }
}

async fn send_udp_event(event_sender: &mpsc::Sender<UdpEvent>, event: UdpEvent) {
  if let Err(err) = event_sender.send(event).await {
    warn!("Failed to send udp event: {}", err);
  }
}

pub async fn run_udp_socket_gui(
  cancel_token: CancellationToken,
  event_sender: mpsc::Sender<UdpEvent>,
  mut input_receiver: mpsc::Receiver<UdpSendPacket>,
  listen: &str,
  instance_id: &str,
) -> Result<(), SocketError> {
  let socket = match UdpSocket::bind(listen).await {
    Ok(socket) => socket,
    Err(err) => {
      send_udp_event(
        &event_sender,
        UdpEvent::Error {
          instance_id: instance_id.to_string(),
          message: format!("绑定地址 {} 失败: {}", listen, err),
        },
      )
      .await;
      return Err(SocketError::BindError(listen.to_string(), err));
    }
  };

  let mut buf = vec![0u8; 65535];
  let mut run_error: Option<SocketError> = None;

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        break;
      }
      inbound = socket.recv_from(&mut buf) => {
        match inbound {
          Ok((len, remote_addr)) => {
            send_udp_event(
              &event_sender,
              UdpEvent::Data {
                instance_id: instance_id.to_string(),
                direction: "in".to_string(),
                remote_addr: remote_addr.to_string(),
                data: buf[..len].to_vec(),
              },
            )
            .await;
          }
          Err(err) => {
            send_udp_event(
              &event_sender,
              UdpEvent::Error {
                instance_id: instance_id.to_string(),
                message: format!("接收 UDP 数据失败: {}", err),
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
          Some(packet) => {
            match socket.send_to(&packet.data, &packet.target_addr).await {
              Ok(sent_len) => {
                send_udp_event(
                  &event_sender,
                  UdpEvent::Data {
                    instance_id: instance_id.to_string(),
                    direction: "out".to_string(),
                    remote_addr: packet.target_addr,
                    data: packet.data[..sent_len].to_vec(),
                  },
                )
                .await;
              }
              Err(err) => {
                send_udp_event(
                  &event_sender,
                  UdpEvent::Error {
                    instance_id: instance_id.to_string(),
                    message: format!("发送 UDP 数据失败: {}", err),
                  },
                )
                .await;
                run_error = Some(SocketError::IoError(err));
                break;
              }
            }
          }
          None => {
            break;
          }
        }
      }
    }
  }

  if let Some(err) = run_error {
    return Err(err);
  }

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_udp_event_name() {
    let data_event = UdpEvent::Data {
      instance_id: "i1".to_string(),
      direction: "in".to_string(),
      remote_addr: "127.0.0.1:9000".to_string(),
      data: vec![1, 2, 3],
    };
    let error_event = UdpEvent::Error {
      instance_id: "i1".to_string(),
      message: "err".to_string(),
    };

    assert_eq!(data_event.get_event_name(), "udp:data");
    assert_eq!(error_event.get_event_name(), "udp:error");
  }
}
