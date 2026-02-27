# Tauri GUI 后端 (src-tauri/)

Tauri 桌面应用后端，IPC 命令桥接层。

## 结构

```
src-tauri/
├── Cargo.toml          # 依赖根目录 netforge crate
├── tauri.conf.json     # Tauri 2.0 配置
├── build.rs            # 构建脚本
├── src/
│   ├── main.rs         # Tauri 入口，注册命令
│   └── tauri_commands.rs  # IPC 命令实现
├── icons/              # 应用图标
└── gen/                # 自动生成的 schema
```

## 命令列表

| 命令 | 功能 | 参数 |
|------|------|------|
| `start_proxy` | 启动代理 | listen, target, tls, cert, key |
| `stop_proxy` | 停止代理 | - |
| `get_proxy_status` | 获取代理状态 | - |
| `start_socket_server` | 启动 Socket 服务端 | listen, format |
| `stop_socket_server` | 停止服务端 | - |
| `send_socket_data` | 发送数据 | addr, data |
| `get_config` | 获取配置 | - |
| `save_config` | 保存配置 | config |

## 查找指南

| 需求 | 文件 | 位置 |
|------|------|------|
| 添加 IPC 命令 | src/tauri_commands.rs | 新函数 + #[tauri::command] |
| 注册新命令 | src/main.rs | invoke_handler() |
| 修改窗口配置 | tauri.conf.json | app.windows |
| 修改构建流程 | tauri.conf.json | build.* |
| 修改应用图标 | icons/ | 多尺寸 PNG/ICO/ICNS |

## 状态管理

```rust
// main.rs
app.manage(state);           // AppState (配置)
app.manage(runtime_state);   // RuntimeState (任务状态)

// tauri_commands.rs
fn start_proxy(
    state: State<'_, AppStateHandle>,
    runtime: State<'_, RuntimeStateHandle>,
) -> Result<(), String>
```

## 事件发射 (TODO)

**未完成**：以下位置需要实现事件发射：
- `tauri_commands.rs:101` - 代理连接事件
- `tauri_commands.rs:215` - Socket 事件

实现方式：
```rust
app_handle.emit("proxy:connection", &event).ok();
```

## 配置 (tauri.conf.json)

```json
{
  "productName": "netforge",
  "version": "0.1.0",
  "identifier": "com.netforge.app",
  "build": {
    "frontendDist": "../src-ui/dist",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "windows": [{
      "title": "NetForge",
      "width": 1200,
      "height": 800,
      "theme": "Dark"
    }]
  }
}
```

## 开发命令

```bash
# 开发模式 (需先启动前端)
cd src-ui && pnpm dev &
cargo tauri dev

# 构建发布
cargo tauri build

# 仅构建 Rust 部分
cargo build --manifest-path src-tauri/Cargo.toml
```

## 注意

1. **依赖根 crate** - 通过 `path = ".."` 引用 src/ 库
2. **beforeDevCommand 空** - 需手动启动前端
3. **windows_subsystem** - Windows 上隐藏控制台窗口
4. **反模式** - `as_ref().unwrap()` 在 283 行需修复
