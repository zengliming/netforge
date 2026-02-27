# NetForge

网络调试工具集：TCP/TLS 代理 + Socket 调试器

## 功能

- **TCP 代理** - 透明转发 TCP 流量
- **TLS 代理** - 支持 TLS 终止的代理服务
- **Socket 客户端** - 交互式 TCP 客户端，支持 hex/text/json 格式
- **Socket 服务端** - 调试用 TCP 服务端
- **GUI 模式** - 基于 Tauri 的桌面应用

## 安装

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/yourname/netforge.git
cd netforge

# 构建 CLI 版本
cargo build --release

# 构建 GUI 版本 (需要安装 pnpm)
cd src-ui && pnpm install && cd ..
cargo tauri build
```

## 使用

### CLI 模式

```bash
# TCP 代理
netforge proxy --listen 127.0.0.1:8080 --target 127.0.0.1:9000

# TLS 代理
netforge proxy --listen 127.0.0.1:8443 --target 127.0.0.1:9000 \
  --tls --cert ./certs/server.crt --key ./certs/server.key

# Socket 客户端
netforge socket client --connect 127.0.0.1:9999 --format hex

# Socket 服务端
netforge socket server --listen 127.0.0.1:8888 --format json

# 使用配置文件
netforge -c config.toml proxy
```

### GUI 模式

```bash
netforge --gui
```

### 数据格式

| 格式 | 说明 |
|------|------|
| `hex` | 十六进制显示 |
| `text` | 纯文本（默认） |
| `json` | JSON 格式化 |

## 配置文件

```toml
# config.toml
[proxy]
listen = "127.0.0.1:8080"
target = "127.0.0.1:9000"

[proxy.tls]  # 可选
cert_path = "./certs/server.crt"
key_path = "./certs/server.key"

[socket]
default_format = "text"  # hex, text, json
```

## 项目结构

```
netforge/
├── src/                # Rust 核心代码
│   ├── cli.rs          # CLI 命令定义
│   ├── proxy/          # TCP/TLS 代理模块
│   └── socket/         # Socket 调试模块
├── src-tauri/          # Tauri 后端
├── src-ui/             # React 前端
└── config.example.toml # 配置示例
```

## 开发

```bash
# 运行测试
cargo test

# 代码检查
cargo clippy

# 格式化
cargo fmt

# 开发模式运行 GUI
cargo tauri dev
```

## 依赖

- Rust 1.70+
- Node.js 18+ (GUI 模式)
- pnpm (推荐)

## 许可证

MIT
