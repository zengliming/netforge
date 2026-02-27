# React 前端 (src-ui/)

React 19 + TypeScript + Vite 前端，Tauri 桌面应用 UI。

## 结构

```
src-ui/
├── package.json        # React 19 + Vite + Tauri API
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 配置
├── src/
│   ├── main.tsx        # React 入口
│   ├── App.tsx         # 主应用组件
│   ├── App.css         # 主样式
│   ├── index.css       # 全局样式
│   └── components/
│       ├── Layout.tsx/css      # 主布局
│       ├── ProxyPanel.tsx/css  # 代理控制面板
│       ├── ConnectionList.tsx/css  # 连接列表
│       ├── DataPanel.tsx/css   # 数据展示
│       └── ConfigPanel.tsx/css # 配置面板
└── public/             # 静态资源
```

## 组件层次

```
App.tsx
└── Layout
    ├── 左侧: ConnectionList (或 Socket 占位)
    ├── 中间: DataPanel
    ├── 右侧: ProxyPanel | ConfigPanel
    └── 底部: 日志 + 状态栏
```

## Tauri IPC 调用

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// 调用后端命令
await invoke('start_proxy', { listen: '127.0.0.1:8080', target: '127.0.0.1:9000' });

// 监听事件
listen('proxy:connection', (event) => { ... });
listen('proxy:data', (event) => { ... });
listen('proxy:closed', (event) => { ... });
listen('proxy:status', (event) => { ... });
```

## 查找指南

| 需求 | 文件 |
|------|------|
| 修改布局 | components/Layout.tsx |
| 添加代理控制 | components/ProxyPanel.tsx |
| 修改连接显示 | components/ConnectionList.tsx |
| 修改数据显示 | components/DataPanel.tsx |
| 修改配置面板 | components/ConfigPanel.tsx |
| 添加 IPC 调用 | App.tsx 或对应 Panel |
| 修改样式 | 对应 .css 文件 |

## 状态管理

使用 React `useState` hooks：
```typescript
// App.tsx
const [connections, setConnections] = useState<Connection[]>([]);
const [proxyRunning, setProxyRunning] = useState(false);
const [config, setConfig] = useState<Config | null>(null);
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发服务器 (端口 5173)
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm tsc --noEmit
```

## 事件类型

```typescript
interface ProxyConnectionEvent {
  id: string;
  client: string;
  target: string;
}

interface ProxyDataEvent {
  id: string;
  direction: 'in' | 'out';
  data: string;
}

interface ProxyStatusEvent {
  running: boolean;
}
```

## 注意

1. **Tauri API v2** - 使用 `@tauri-apps/api` 2.x
2. **事件监听** - 已配置但后端未完全实现发射
3. **Socket 面板** - App.tsx:107-111 为占位符
4. **数据面板** - 当前数据为空数组，需后端事件触发
5. **开发流程** - 先 `pnpm dev`，再 `cargo tauri dev`
