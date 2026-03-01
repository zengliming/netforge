# 共享库模块 (src/)

核心业务逻辑库，GUI 共用。

## 结构

```
src/
├── lib.rs              # 库入口，重导出公共 API
├── config.rs           # TOML 配置解析
├── error.rs            # thiserror 错误类型
├── events.rs           # GUI 事件类型 (ProxyEvent, SocketEvent)
├── state.rs            # 应用状态管理 (AppState, RuntimeState)
├── tauri_commands.rs   # Tauri 命令 (feature-gated)
├── proxy/              # TCP/TLS 代理
│   ├── mod.rs
│   ├── tcp.rs          # run_tcp_proxy()
│   └── tls.rs          # run_tls_proxy()
└── socket/             # Socket 调试
    ├── mod.rs
    ├── client.rs       # run_socket_client()
    ├── server.rs       # run_socket_server()
    └── format.rs       # DataFormat enum
```

## 查找指南

| 需求 | 文件 | 关键符号 |
|------|------|----------|
| 添加错误类型 | error.rs | ProxyError, SocketError, ConfigError |
| 添加配置字段 | config.rs | Config struct |
| 添加 GUI 事件 | events.rs | ProxyEvent, SocketEvent enum |
| TCP 代理逻辑 | proxy/tcp.rs | run_tcp_proxy() |
| TLS 代理逻辑 | proxy/tls.rs | run_tls_proxy(), load_certs() |
| Socket 客户端 | socket/client.rs | run_socket_client() |
| Socket 服务端 | socket/server.rs | run_socket_server() |
| 数据格式化 | socket/format.rs | DataFormat enum |

## 模块约定

### 导出模式
每个子模块通过 `mod.rs` 重导出：
```rust
// proxy/mod.rs
pub mod tcp;
pub mod tls;
pub use tcp::run_tcp_proxy;
pub use tls::run_tls_proxy;
```

### 错误处理
- 库层：`thiserror` 定义错误类型，实现 `Serialize`
- `#[serde(skip)]` 标记不可序列化字段（如 `io::Error`）

### 异步模式
- 入口：`tokio::spawn` (GUI)
- 取消：使用 `CancellationToken`
- 并发：`tokio::select!` 处理多事件源

## 关键类型

```rust
// config.rs
pub struct Config {
    pub proxy: ProxyConfig,
    pub socket: SocketConfig,
}

// events.rs
pub enum ProxyEvent {
    Connection { id: String, client: String, target: String },
    Data { id: String, direction: Direction, data: String },
    Closed { id: String },
    Status { running: bool },
}

// state.rs
pub struct AppState { /* 配置快照 */ }
pub struct RuntimeState { /* 运行时任务状态 */ }
```

## 测试

测试位于各模块 `#[cfg(test)]` 块：
- `config.rs` - 配置解析测试
- `proxy/tcp.rs` - TCP 代理测试
- `socket/client.rs` - 客户端测试
- `socket/server.rs` - 服务端测试

```bash
cargo test
cargo test --lib  # 仅库测试
```

## 注意

1. **lib.rs 存在** - GUI 依赖此库
2. **tauri_commands.rs** - 仅在 `tauri` feature 启用时编译
3. **events.rs** - 仅 GUI 使用
