# NetForge Build Guide

This guide covers building NetForge for different platforms.

## Prerequisites

- Rust (1.70+): https://rustup.rs/
- Node.js (18+): https://nodejs.org/
- For macOS: Xcode Command Line Tools
- For Windows: Visual Studio Build Tools
- For Linux: GCC/Make

## Build Commands

### CLI Only

```bash
# Development
cargo run -- --help

# Release build
cargo build --release

# Run tests
cargo test
```

### GUI (Tauri)

```bash
# Install Tauri CLI
npm install -g @tauri-apps/cli@latest

# Development
cd src-tauri
cargo tauri dev

# Production build
cargo tauri build
```

## Platform-Specific Notes

### macOS

```bash
# Install prerequisites
xcode-select --install

# Build
cd src-tauri
cargo tauri build

# Output:
# - src-tauri/target/release/netforge-gui
# - src-tauri/target/release/bundle/macos/netforge.app
```

### Windows

```bash
# Install Visual Studio Build Tools
# Select "Desktop development with C++"

# Build
cd src-tauri
cargo tauri build

# Output:
# - src-tauri/target/release/netforge-gui.exe
# - src-tauri/target/release/bundle/msi/netforge_0.1.0_x64_en-US.msi
```

### Linux

```bash
# Install prerequisites (Ubuntu/Debian)
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libudev-dev pkg-config

# Build
cd src-tauri
cargo tauri build

# Output:
# - src-tauri/target/release/netforge-gui
# - src-tauri/target/release/bundle/deb/netforge_0.1.0_amd64.deb
# - src-tauri/target/release/bundle/appimage/netforge_0.1.0_amd64.AppImage
```

## Troubleshooting

### Tauri CLI not found

```bash
# Install via npm
npm install -g @tauri-apps/cli@latest

# Or use npx
npx tauri build
```

### Build errors

```bash
# Clean and rebuild
cargo clean
cargo build --release

# In src-tauri
cd src-tauri
cargo clean
cargo tauri build
```

### Icons not found

Ensure icons exist in `src-tauri/icons/`:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

## Running the Application

### CLI Mode

```bash
# TCP proxy
cargo run -- proxy --listen 127.0.0.1:8080 --target 127.0.0.1:9000

# TLS proxy
cargo run -- proxy --listen 127.0.0.1:8080 --target 127.0.0.1:9000 --tls --cert ./certs/server.crt --key ./certs/server.key

# Socket client
cargo run -- socket client --connect 127.0.0.1:9999 --format hex

# Socket server
cargo run -- socket server --listen 127.0.0.1:8888 --format json
```

### GUI Mode

```bash
# Using built app (macOS)
open src-tauri/target/release/bundle/macos/netforge.app

# Or run directly
./src-tauri/target/release/netforge-gui

# Using Tauri dev
cd src-tauri && cargo tauri dev
```
