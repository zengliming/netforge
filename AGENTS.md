# NETFORGE 项目知识库

**生成时间:** 2026-02-28
**Commit:** 0c44127
**Branch:** master
**语言:** Rust 2021 + TypeScript
**类型:** GUI 网络调试工具 (TCP/TLS 代理 + Socket 调试器)

---

## 概述

netforge 是一个网络调试工具：
- **GUI 模式** - Tauri 桌面应用 (Rust + React)
## 结构

```
netforge/
├── Cargo.toml              # 核心库
├── src/                    # 共享 Rust 库
│   ├── lib.rs              # 库入口，重导出公共 API

│   ├── config.rs           # TOML 配置解析
│   ├── error.rs            # thiserror 错误类型
│   ├── events.rs           # GUI 事件类型
│   ├── state.rs            # 应用状态管理
│   ├── proxy/              # TCP/TLS 代理模块
│   ├── socket/             # Socket 调试模块
│   └── tauri_commands.rs   # Tauri 命令 (feature-gated)
├── src-tauri/              # Tauri GUI 后端
│   ├── src/main.rs         # GUI 入口
│   ├── src/tauri_commands.rs  # IPC 命令桥接
│   └── tauri.conf.json     # Tauri 配置
└── src-ui/                 # React 前端
    ├── src/App.tsx         # 主应用组件
    └── src/components/     # UI 组件
```

## 查找指南

| 需求 | 位置 |
|------|------|
|| 添加 Tauri 命令 | `src-tauri/src/tauri_commands.rs` |
| 修改代理逻辑 | `src/proxy/tcp.rs` 或 `tls.rs` |
| 修改 Socket 调试 | `src/socket/client.rs` 或 `server.rs` |
| 添加数据格式 | `src/socket/format.rs` → DataFormat enum |
| 添加错误类型 | `src/error.rs` → 对应 Error enum |
| 修改配置结构 | `src/config.rs` |
| 修改 GUI 事件 | `src/events.rs` |
| 修改前端 UI | `src-ui/src/components/` |

## 依赖约定

| 类别 | 依赖 | 用途 |
|------|------|------|
| 异步运行时 | tokio (full) | 异步 I/O |
| TLS | rustls | TLS 终止 (非 native-tls) |
|| 序列化 | serde + toml | 配置解析 |
| 错误处理 | anyhow + thiserror | 分层错误 |
| 日志 | tracing | 结构化日志 |
| GUI | Tauri 2.0 | 桌面应用框架 |
| 前端 | React 19 + Vite | UI 框架 |

## 代码规范

### 模块组织
- 共享库 `src/lib.rs` 服务 GUI
- 每个功能模块有独立目录 (`proxy/`, `socket/`)
- `mod.rs` 使用 `pub use` 重导出公共 API
- 单元测试在模块内 `#[cfg(test)]` 块中

### 代码风格
- 注释使用**中文**
- 函数/变量: `snake_case`
| 类型: `PascalCase`
- 错误消息: 中文 (面向国内用户)

### 错误处理
- 应用层: `anyhow::Result<T>`
- 库层 (各模块): `thiserror` 定义错误类型

## 命令

```bash
# GUI 开发
cd src-ui && pnpm install && cd ..
cargo tauri dev

# 测试
cargo test

# 构建 GUI
cargo tauri build
```

## 反模式 (禁止)

| 模式 | 位置 | 替代方案 |
|------|------|----------|
| `ok_or().unwrap()` | src/tauri_commands.rs:87-88 | `ok_or(...)?` |
| `as_ref().unwrap()` | src-tauri/src/tauri_commands.rs:283 | 模式匹配 |
|| JSON 序列化 `unwrap()` | events.rs, state.rs | 添加错误处理 |

## TODO 标记

- `src-tauri/src/tauri_commands.rs:101` - 实现事件发射到前端
- `src-tauri/src/tauri_commands.rs:215` - 实现事件发射到前端

## 注意事项

1. **GUI 应用** - Tauri 桌面应用 (`src-tauri/src/main.rs`)
2. **共享库** - 存在 `lib.rs`，GUI 共用核心逻辑
3. **无 CI/CD** - 需手动运行 `cargo test` 和 `cargo clippy`
4. **TLS 证书** - 需要 PEM 格式证书和私钥文件
5. **日志级别** - 默认 `netforge=info`，通过 `RUST_LOG` 调整
6. **GUI 前端** - 需要先构建 `src-ui` 再运行 Tauri

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
