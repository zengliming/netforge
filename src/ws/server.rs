use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::io;
use std::net::SocketAddr;
use std::sync::Arc;
use thiserror::Error;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tokio_util::sync::CancellationToken;
use tracing::{error, warn};

pub type WsEventSender = mpsc::Sender<WsServerEvent>;
type SharedClients = Arc<RwLock<HashMap<SocketAddr, mpsc::Sender<String>>>>;

#[derive(Debug, Error)]
pub enum WsServerError {
  #[error("绑定地址 {0} 失败: {1}")]
  BindError(String, #[source] io::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsServerEvent {
  pub event: String,
  pub payload: serde_json::Value,
}

async fn send_ws_event(event_sender: &WsEventSender, event: &str, payload: serde_json::Value) {
  let event_data = WsServerEvent {
    event: event.to_string(),
    payload,
  };

  if let Err(err) = event_sender.send(event_data).await {
    warn!("发送 WebSocket 事件失败: {}", err);
  }
}

async fn handle_ws_outbound_data(
  event_sender: &WsEventSender,
  clients: &SharedClients,
  instance_id: &str,
  target_addr: SocketAddr,
  data: String,
) {
  let sender = {
    let locked_clients = clients.read().await;
    locked_clients.get(&target_addr).cloned()
  };

  if let Some(sender) = sender {
    if let Err(err) = sender.send(data).await {
      {
        let mut locked_clients = clients.write().await;
        locked_clients.remove(&target_addr);
      }

      send_ws_event(
        event_sender,
        "ws:error",
        json!({
          "instance_id": instance_id,
          "session_id": target_addr.to_string(),
          "message": format!("发送数据失败: {}", err)
        }),
      )
      .await;
    }
  } else {
    send_ws_event(
      event_sender,
      "ws:error",
      json!({
        "instance_id": instance_id,
        "session_id": target_addr.to_string(),
        "message": format!("发送失败，未找到目标客户端: {}", target_addr)
      }),
    )
    .await;
  }
}

async fn handle_ws_client(
  cancel_token: CancellationToken,
  event_sender: WsEventSender,
  clients: SharedClients,
  instance_id: String,
  stream: TcpStream,
  addr: SocketAddr,
) {
  let mut ws_stream = match accept_async(stream).await {
    Ok(ws_stream) => ws_stream,
    Err(err) => {
      error!("WebSocket 握手失败 [{}]: {}", addr, err);
      send_ws_event(
        &event_sender,
        "ws:error",
        json!({
          "instance_id": instance_id,
          "session_id": addr.to_string(),
          "message": format!("WebSocket 握手失败: {}", err)
        }),
      )
      .await;
      return;
    }
  };

  let (client_input_sender, mut client_input_receiver) = mpsc::channel::<String>(100);

  {
    let mut locked_clients = clients.write().await;
    locked_clients.insert(addr, client_input_sender);
  }

  send_ws_event(
    &event_sender,
    "ws:client_connected",
    json!({
      "instance_id": instance_id,
      "session_id": addr.to_string(),
      "client_addr": addr.to_string()
    }),
  )
  .await;

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        break;
      }
      outbound = client_input_receiver.recv() => {
        match outbound {
          Some(data) => {
            if let Err(err) = ws_stream.send(Message::Text(data.clone().into())).await {
              error!("发送 WebSocket 数据失败 [{}]: {}", addr, err);
              send_ws_event(
                &event_sender,
                "ws:error",
                json!({
                  "instance_id": instance_id,
                  "session_id": addr.to_string(),
                  "message": format!("发送数据失败: {}", err)
                }),
              )
              .await;
              break;
            }

            send_ws_event(
              &event_sender,
              "ws:data",
              json!({
                "instance_id": instance_id,
                "session_id": addr.to_string(),
                "direction": "out",
                "data": data,
                "data_type": "text"
              }),
            )
            .await;
          }
          None => {
            break;
          }
        }
      }
      next_message = ws_stream.next() => {
        match next_message {
          Some(Ok(Message::Text(text))) => {
            let text_data = text.to_string();
            send_ws_event(
              &event_sender,
              "ws:data",
              json!({
                "instance_id": instance_id,
                "session_id": addr.to_string(),
                "direction": "in",
                "data": text_data,
                "data_type": "text"
              }),
            )
            .await;
          }
          Some(Ok(Message::Binary(data))) => {
            let raw_data = data.to_vec();
            send_ws_event(
              &event_sender,
              "ws:data",
              json!({
                "instance_id": instance_id,
                "session_id": addr.to_string(),
                "direction": "in",
                "data": String::from_utf8_lossy(&raw_data).to_string(),
                "raw": raw_data,
                "data_type": "binary"
              }),
            )
            .await;
          }
          Some(Ok(Message::Close(_))) => {
            break;
          }
          Some(Ok(_)) => {}
          Some(Err(err)) => {
            error!("读取 WebSocket 数据失败 [{}]: {}", addr, err);
            send_ws_event(
              &event_sender,
              "ws:error",
              json!({
                "instance_id": instance_id,
                "session_id": addr.to_string(),
                "message": format!("读取数据失败: {}", err)
              }),
            )
            .await;
            break;
          }
          None => {
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

  send_ws_event(
    &event_sender,
    "ws:client_disconnected",
    json!({
      "instance_id": instance_id,
      "session_id": addr.to_string(),
      "client_addr": addr.to_string()
    }),
  )
  .await;
}

pub async fn run_ws_server(
  cancel_token: CancellationToken,
  event_sender: WsEventSender,
  input_receiver: mpsc::Receiver<(SocketAddr, String)>,
  listen: &str,
  instance_id: String,
) -> Result<(), WsServerError> {
  // 去掉 ws:// 前缀（如果存在）
  let listen_addr = listen.strip_prefix("ws://").unwrap_or(listen);
  
  let listener = TcpListener::bind(listen_addr)
    .await
    .map_err(|err| WsServerError::BindError(listen.to_string(), err))?;

  let clients: SharedClients = Arc::new(RwLock::new(HashMap::new()));
  let mut input_receiver = input_receiver;
  let mut input_closed = false;

  loop {
    tokio::select! {
      _ = cancel_token.cancelled() => {
        break;
      }
      outbound = input_receiver.recv(), if !input_closed => {
        match outbound {
          Some((target_addr, data)) => {
            handle_ws_outbound_data(
              &event_sender,
              &clients,
              &instance_id,
              target_addr,
              data,
            )
            .await;
          }
          None => {
            input_closed = true;
          }
        }
      }
      accept_result = listener.accept() => {
        match accept_result {
          Ok((stream, addr)) => {
            let task_cancel_token = cancel_token.clone();
            let task_event_sender = event_sender.clone();
            let task_clients = Arc::clone(&clients);
            let task_instance_id = instance_id.clone();

            tokio::spawn(async move {
              handle_ws_client(
                task_cancel_token,
                task_event_sender,
                task_clients,
                task_instance_id,
                stream,
                addr,
              )
              .await;
            });
          }
          Err(err) => {
            error!("接受 WebSocket 连接失败: {}", err);
            send_ws_event(
              &event_sender,
              "ws:error",
              json!({
                "instance_id": instance_id,
                "message": format!("接受连接失败: {}", err)
              }),
            )
            .await;
          }
        }
      }
    }
  }

  Ok(())
}
