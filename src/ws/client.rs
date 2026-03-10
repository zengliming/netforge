use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::io;
use thiserror::Error;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tokio_util::sync::CancellationToken;
use tracing::{error, warn};

pub type WsClientEventSender = mpsc::Sender<WsClientEvent>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsClientEvent {
  pub event: String,
  pub payload: serde_json::Value,
}

#[derive(Debug, Error)]
pub enum WsClientError {
  #[error("仅支持 ws:// 协议地址，当前地址: {0}")]
  UnsupportedScheme(String),

  #[error("连接 WebSocket 服务端失败 {0}: {1}")]
  ConnectError(String, String),

  #[error("发送 WebSocket 消息失败: {0}")]
  SendError(String),

  #[error("读取 WebSocket 消息失败: {0}")]
  ReceiveError(String),

  #[error("输入通道已关闭")]
  InputClosed,

  #[error("IO 错误: {0}")]
  IoError(#[from] io::Error),
}

async fn send_ws_event(
  event_sender: &WsClientEventSender,
  event: &str,
  payload: serde_json::Value,
) {
  let event_data = WsClientEvent {
    event: event.to_string(),
    payload,
  };

  if let Err(err) = event_sender.send(event_data).await {
    warn!("发送 WebSocket 客户端事件失败: {}", err);
  }
}

pub async fn run_ws_client(
  cancel_token: CancellationToken,
  event_sender: WsClientEventSender,
  input_receiver: mpsc::Receiver<String>,
  server: &str,
  instance_id: String,
) -> Result<(), WsClientError> {
  let is_secure = server.starts_with("wss://");
  let is_plain = server.starts_with("ws://");
  
  if !is_plain && !is_secure {
    send_ws_event(
      &event_sender,
      "ws:error",
      json!({
        "instance_id": instance_id,
        "server": server,
        "message": format!("仅支持 ws:// 和 wss:// 协议地址，当前地址: {}", server)
      }),
    )
    .await;
    return Err(WsClientError::UnsupportedScheme(server.to_string()));
  }

  let (ws_stream, _) = match connect_async(server).await {
    Ok(result) => result,
    Err(err) => {
      send_ws_event(
        &event_sender,
        "ws:error",
        json!({
          "instance_id": instance_id,
          "server": server,
          "message": format!("连接 WebSocket 服务端失败: {}", err)
        }),
      )
      .await;
      return Err(WsClientError::ConnectError(
        server.to_string(),
        err.to_string(),
      ));
    }
  };

  send_ws_event(
    &event_sender,
    "ws:connected",
    json!({
      "instance_id": instance_id.clone(),
      "server": server
    }),
  )
  .await;

  let (mut ws_writer, mut ws_reader) = ws_stream.split();
  let mut input_receiver = input_receiver;
  let mut run_error: Option<WsClientError> = None;

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        break;
      }
      inbound = ws_reader.next() => {
        match inbound {
          Some(Ok(Message::Text(text))) => {
            send_ws_event(
              &event_sender,
              "ws:data",
              json!({
                "instance_id": instance_id.clone(),
                "direction": "in",
                "data_type": "text",
                "data": text.to_string()
              }),
            ).await;
          }
          Some(Ok(Message::Binary(data))) => {
            send_ws_event(
              &event_sender,
              "ws:data",
              json!({
                "instance_id": instance_id.clone(),
                "direction": "in",
                "data_type": "binary",
                "data": String::from_utf8_lossy(&data).to_string(),
                "raw": data.to_vec()
              }),
            ).await;
          }
          Some(Ok(Message::Close(_))) => {
            break;
          }
          Some(Ok(_)) => {}
          Some(Err(err)) => {
            error!("读取 WebSocket 消息失败: {}", err);
            send_ws_event(
              &event_sender,
              "ws:error",
              json!({
                "instance_id": instance_id.clone(),
                "message": format!("读取 WebSocket 消息失败: {}", err)
              }),
            ).await;
            run_error = Some(WsClientError::ReceiveError(err.to_string()));
            break;
          }
          None => {
            break;
          }
        }
      }
      outbound = input_receiver.recv() => {
        match outbound {
          Some(data) => {
            if let Err(err) = ws_writer.send(Message::Text(data.clone().into())).await {
              error!("发送 WebSocket 消息失败: {}", err);
              send_ws_event(
                &event_sender,
                "ws:error",
                json!({
                  "instance_id": instance_id.clone(),
                  "message": format!("发送 WebSocket 消息失败: {}", err)
                }),
              ).await;
              run_error = Some(WsClientError::SendError(err.to_string()));
              break;
            }

            send_ws_event(
              &event_sender,
              "ws:data",
              json!({
                "instance_id": instance_id.clone(),
                "direction": "out",
                "data_type": "text",
                "data": data
              }),
            ).await;
          }
          None => {
            run_error = Some(WsClientError::InputClosed);
            break;
          }
        }
      }
    }
  }

  let _ = ws_writer.close().await;

  send_ws_event(
    &event_sender,
    "ws:disconnected",
    json!({
      "instance_id": instance_id.clone(),
      "server": server
    }),
  )
  .await;

  if let Some(err) = run_error {
    return Err(err);
  }

  Ok(())
}
