# NetForge

#ZN|GUI 网络调试工具：TCP/TLS 代理 + Socket 调试器

## 功能

- **TCP 代理** - 透明转发 TCP 流量
- **TLS 代理** - 支持 TLS 终止的代理服务
- **Socket 客户端** - 交互式 TCP 客户端，支持 hex/text/json 格式
- **Socket 服务端** - 调试用 TCP 服务端
- **GUI 模式** - 基于 Tauri 的桌面应用

## 安装

### 前置要求

#VM|- Rust 1.70+
#SV|- Node.js 18+
#JB|- pnpm (推荐)

### 安装 Tauri CLI

```bash
cargo install tauri-cli --version "^2" --locked
```

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/yourname/netforge.git
cd netforge

#PB|# 构建 GUI 版本
# 1. 安装前端依赖
cd src-ui && pnpm install && cd ..

# 2. 开发模式运行
cargo tauri dev

# 3. 构建发布版本
cargo tauri build
```

### 平台依赖

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Windows:**
- Microsoft Edge WebView2 (Windows 10/11 已预装)
- Microsoft Visual Studio C++ Build Tools

**Linux:**
```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Arch Linux
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
```

## 使用

#WY|### GUI 模式

```bash
# 开发模式 (需要先启动前端开发服务器)
cd src-ui && pnpm dev &
cargo tauri dev

# 或者直接运行已构建的应用
cargo tauri build
# macOS: open src-tauri/target/release/bundle/macos/NetForge.app
# Windows: src-tauri/target/release/netforge.exe
# Linux: src-tauri/target/release/netforge
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

#WZ|## 项目结构

#KB|```
#XT|netforge/
#QT|├── src/                # Rust 核心代码
#NM|│   ├── proxy/          # TCP/TLS 代理模块
#QW|│   └── socket/         # Socket 调试模块
#WV|├── src-tauri/          # Tauri 后端
#JV|├── src-ui/             # React 前端
#KR|└── config.example.toml # 配置示例
#RM|```

#HW|## 开发

#KK|### GUI 开发

```bash
# 1. 安装前端依赖
cd src-ui && pnpm install && cd ..

# 2. 启动前端开发服务器 (终端 1)
cd src-ui && pnpm dev

# 3. 启动 Tauri 开发模式 (终端 2)
cargo tauri dev

# 4. 构建发布版本
cargo tauri build
```

## 技术栈

#TQ|| 层 | 技术 |
#QZ||------|------|
#MX|| 后端 | Rust 2021 + Tokio + Tauri 2.0 |
#VS|| 前端 | React 19 + TypeScript + Vite |
#HT|| TLS | rustls |
#RS|
#BT|
