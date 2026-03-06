# NetForge

GUI 网络调试工具：TCP/TLS 代理 + Socket 调试器

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.70+-orange.svg)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/tauri-2.0-blue.svg)](https://tauri.app)

## 功能特性

### 代理功能
- **TCP 代理** - 透明转发 TCP 流量，支持监听多个连接
- **TLS 代理** - 支持 TLS 终止的代理服务，使用 rustls 实现
- **实时监控** - 连接状态、流量统计、数据传输可视化
- **多连接管理** - 同时处理多个客户端连接，独立监控每个连接

### Socket 调试
- **TCP 客户端** - 交互式 TCP 客户端，支持自定义连接参数
- **TCP 服务端** - 调试用 TCP 服务端，监听指定端口
- **WebSocket 客户端** - WebSocket 客户端调试，支持握手协议
- **WebSocket 服务端** - WebSocket 服务端调试，实时接收连接
- **UDP 调试** - UDP 数据包收发，支持广播和组播

### 数据处理
- **多种数据格式** - 支持 hex、text、json 三种显示格式
- **格式化显示** - JSON 自动格式化，hex 十六进制视图
- **实时数据流** - 实时显示发送和接收的数据
- **数据日志** - 完整的数据传输日志记录

### GUI 界面
- **现代化 UI** - 基于 React 19 + TypeScript 构建的桌面应用
- **标签页设计** - 独立的功能标签页，方便切换不同调试工具
- **配置面板** - 可视化配置界面，支持实时修改配置
- **连接列表** - 实时显示所有活跃连接的状态和统计信息
- **数据面板** - 分区显示发送和接收的数据
- **日志面板** - 实时日志输出，支持过滤和搜索

### 配置与持久化
- **TOML 配置** - 使用标准的 TOML 格式配置文件
- **配置持久化** - 配置自动保存，下次启动自动加载
- **默认配置** - 提供配置示例，开箱即用

## 支持的平台

- **macOS** - Intel 和 Apple Silicon (M1/M2/M3) 架构
- **Windows** - Windows 10 和 Windows 11
- **Linux** - 主流发行版（Debian、Ubuntu、Arch、Fedora 等）

## 项目优势

### 高性能
- 基于 **Rust + Tokio** 异步运行时，充分利用多核 CPU
- 零拷贝设计，最小化内存开销
- 高效的并发连接处理，轻松处理数千并发连接

### 跨平台
- **Tauri 2.0** 原生应用，不依赖浏览器运行时
- 单一代码库，一次编译多平台运行
- 原生系统 API 集成，更好的性能和用户体验

### 轻量级
- 相比 Electron 应用，安装包体积小 80% 以上
- 内存占用低，资源消耗少
- 启动速度快，响应及时

### 安全性
- 使用 **rustls** 实现 TLS，不依赖 OpenSSL
- 内存安全保证，避免缓冲区溢出等安全问题
- 类型安全，编译期检查大部分错误

### 现代化技术栈
- **Rust 2021** - 最新的 Rust 语言特性
- **React 19** - 最新的 React 版本，提供最佳开发体验
- **TypeScript** - 类型安全的前端开发
- **Vite** - 快速的构建工具

### 实时性
- 异步事件驱动架构
- WebSocket 实时通信
- 低延迟的数据传输和显示

## 安装

### 前置要求

- Rust 1.70+
- Node.js 18+
- pnpm (推荐)

### 安装 Tauri CLI

```bash
cargo install tauri-cli --version "^2" --locked
```

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/zengliming/netforge.git
cd netforge

# 构建 GUI 版本
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

### GUI 模式

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

## 项目结构

```
netforge/
├── src/                # Rust 核心代码
│   ├── proxy/          # TCP/TLS 代理模块
│   └── socket/         # Socket 调试模块
├── src-tauri/          # Tauri 后端
├── src-ui/             # React 前端
│   └── src/components/ # UI 组件
│       ├── ProxyTab.tsx      # 代理标签页
│       ├── ClientTab.tsx     # Socket 客户端
│       ├── ServerTab.tsx     # Socket 服务端
│       ├── WsClientTab.tsx   # WebSocket 客户端
│       ├── WsServerTab.tsx   # WebSocket 服务端
│       ├── UdpTab.tsx        # UDP 调试
│       ├── ConnectionList.tsx # 连接列表
│       ├── DataPanel.tsx      # 数据面板
│       ├── LogPanel.tsx       # 日志面板
│       └── ConfigPanel.tsx    # 配置面板
└── config.example.toml # 配置示例
```

## 开发

### GUI 开发

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

### 测试

```bash
# 运行所有测试
cargo test

# 运行库测试
cargo test --lib

# 运行特定模块测试
cargo test --lib socket::format
```

### 代码检查

```bash
# 运行 Clippy
cargo clippy

# 检查代码格式
cargo fmt --check
```

## 技术栈

| 层 | 技术 |
|------|------|
| 后端 | Rust 2021 + Tokio + Tauri 2.0 |
| 前端 | React 19 + TypeScript + Vite |
| TLS | rustls |
| 配置 | TOML + serde |
| 日志 | tracing |

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT License](LICENSE)
