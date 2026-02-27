# NETFORGE 项目知识库

**生成时间:** 2026-02-27
**语言:** Rust (Edition 2021)
**类型:** CLI 工具 - TCP/TLS 代理 + Socket 调试器

---

## 概述

netforge 是一个网络调试工具，提供：
- **TCP/TLS 代理** - 透明转发 TCP 流量，支持 TLS 终止
- **Socket 调试** - 交互式 TCP 客户端/服务端，支持 hex/text/json 格式

## 结构

```
netforge/
├── Cargo.toml              # 单一 crate，无 workspace
├── config.example.toml     # 运行时配置示例
└── src/
    ├── main.rs             # 入口，#[tokio::main]
    ├── cli.rs              # clap 命令定义
    ├── config.rs           # TOML 配置解析
    ├── error.rs            # thiserror 错误类型
    ├── proxy/              # TCP/TLS 代理模块
    │   ├── tcp.rs          # run_tcp_proxy()
    │   └── tls.rs          # run_tls_proxy() + 证书加载
    └── socket/             # Socket 调试模块
        ├── client.rs       # run_socket_client()
        ├── server.rs       # run_socket_server()
        └── format.rs       # DataFormat enum + 格式化
```

## 查找指南

| 需求 | 位置 |
|------|------|
| 添加新命令 | `src/cli.rs` → Commands enum |
| 修改代理逻辑 | `src/proxy/tcp.rs` 或 `tls.rs` |
| 修改调试工具 | `src/socket/client.rs` 或 `server.rs` |
| 添加数据格式 | `src/socket/format.rs` → DataFormat enum |
| 添加错误类型 | `src/error.rs` → 对应 Error enum |
| 修改配置结构 | `src/config.rs` |

## 代码规范

### 依赖约定
- **异步运行时**: tokio (full features)
- **错误处理**: `anyhow` (应用层) + `thiserror` (库层)
- **TLS**: rustls (非 native-tls)
- **日志**: tracing + env-filter
- **CLI**: clap derive 宏

### 模块组织
- 每个功能模块有独立目录 (`proxy/`, `socket/`)
- `mod.rs` 使用 `pub use` 重导出公共 API
- 单元测试在模块内 `#[cfg(test)]` 块中

### 代码风格
- 注释使用**中文**
- 变量命名: camelCase (Rust 标准 snake_case 仅用于函数/变量)
- 错误消息: 中文 (面向国内用户)

## 命令

```bash
# 开发
cargo run -- proxy --listen 127.0.0.1:8080 --target 127.0.0.1:9000
cargo run -- socket client --connect 127.0.0.1:9999 --format hex
cargo run -- socket server --listen 127.0.0.1:8888 --format json

# 使用配置文件
cargo run -- -c config.toml proxy --tls --cert ./certs/server.crt --key ./certs/server.key

# 测试
cargo test

# 构建
cargo build --release
```

## 注意事项

1. **无 lib.rs** - 纯 binary 项目，模块不对外导出
2. **无 CI/CD** - 需手动运行 `cargo test` 和 `cargo clippy`
3. **无格式化配置** - 依赖 `cargo fmt` 默认规则
4. **TLS 证书** - 需要 PEM 格式证书和私钥文件
5. **日志级别** - 默认 `netforge=info`，可通过 `RUST_LOG` 环境变量调整

## 配置文件格式

```toml
[proxy]
listen = "127.0.0.1:8080"
target = "127.0.0.1:9000"

[proxy.tls]  # 可选
cert_path = "./certs/server.crt"
key_path = "./certs/server.key"

[socket]
default_format = "text"  # hex, text, json
```
