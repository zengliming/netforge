# NetForge UI 设计规范

**版本**: 1.0  
**基于**: pencil-new.pen 设计稿  
**更新日期**: 2026-03-06

---

## 目录

1. [设计系统](#1-设计系统)
2. [组件规范](#2-组件规范)
3. [布局规范](#3-布局规范)
4. [主题系统](#4-主题系统)
5. [实现指南](#5-实现指南)

---

## 1. 设计系统

### 1.1 颜色系统

#### 深色主题 (Dark Theme)

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--bg-primary` | `#0C0C0C` | 主背景色 |
| `--bg-secondary` | `#171717` | 次级背景 (卡片、按钮 hover) |
| `--bg-tertiary` | `#1A1A1A` | 三级背景 (导航 active) |
| `--bg-elevated` | `#1F1F1F` | 边框色 |
| `--bg-disabled` | `#2E2E2E` | 禁用状态背景 |

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--text-primary` | `#E5E5E5` | 主文字 |
| `--text-secondary` | `#A3A3A3` | 次级文字 |
| `--text-muted` | `#737373` | 弱化文字 |
| `--text-disabled` | `#525252` | 禁用文字 |

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--accent-primary` | `#22C55E` | 主强调色 (绿色) |
| `--accent-hover` | `#2ED573` | 强调色 hover |
| `--accent-active` | `#16A34A` | 强调色 active |
| `--accent-muted` | `#222924` | 强调色背景 (成功 toast) |

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--danger-primary` | `#EF4444` | 危险色 (红色) |
| `--danger-hover` | `#F87171` | 危险色 hover |
| `--danger-muted` | `#24100B` | 危险色背景 (错误 toast) |

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--warning-primary` | `#F59E0B` | 警告色 (橙色) |
| `--warning-muted` | `#291C0F` | 警告色背景 |

#### 浅色主题 (Light Theme)

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--bg-primary` | `#F5F5F5` | 主背景色 |
| `--bg-secondary` | `#FFFFFF` | 次级背景 (卡片) |
| `--bg-tertiary` | `#E5E5E5` | hover 状态 |
| `--bg-elevated` | `#E5E5E5` | 边框色 |

| Token | 颜色值 | 用途 |
|-------|--------|------|
| `--text-primary` | `#0C0C0C` | 主文字 |
| `--text-secondary` | `#525252` | 次级文字 |
| `--text-muted` | `#737373` | 弱化文字 |
| `--text-disabled` | `#A3A3A3` | 禁用文字 |

### 1.2 字体系统

```css
/* 字体家族 */
--font-mono: 'JetBrains Mono', 'SF Mono', Monaco, 'Courier New', monospace;
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* 字号层级 */
--text-xs: 12px;    /* 辅助文字、时间戳 */
--text-sm: 13px;    /* 次级文字 */
--text-base: 14px;  /* 正文 */
--text-lg: 16px;    /* 标题 */
--text-xl: 20px;    /* 大标题 */
--text-2xl: 24px;   /* 页面标题 */
--text-3xl: 28px;   /* 主标题 */

/* 字重 */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 1.3 间距系统

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
```

### 1.4 圆角系统

```css
--radius-sm: 2px;   /* Badge */
--radius-md: 4px;   /* Button, Input */
--radius-lg: 6px;   /* Card */
--radius-xl: 8px;   /* Dialog, Panel */
--radius-full: 9999px; /* Pill buttons */
```

### 1.5 阴影与边框

```css
/* 边框 */
--border-thin: 1px solid var(--bg-elevated);
--border-accent: 2px solid var(--accent-primary);
--border-error: 1px solid var(--danger-primary);

/* 过渡 */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

---

## 2. 组件规范

### 2.1 Button 按钮

#### 变体

| 变体 | Default | Hover | Active | Disabled |
|------|---------|-------|--------|----------|
| **Primary** | `bg: #22C55E` | `bg: #2ED573` | `bg: #16A34A` | `bg: #2E2E2E, opacity: 0.5` |
| **Danger** | `bg: #EF4444` | `bg: #F87171` | - | `bg: #2E2E2E, opacity: 0.5` |
| **Ghost** | `bg: transparent` | `bg: #171717` | - | `opacity: 0.5` |

#### 规格

```css
/* 默认按钮 */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-mono);
  gap: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

/* 小按钮 */
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* 大按钮 */
.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
}
```

### 2.2 Navigation Item 导航项

#### 状态

| 状态 | 背景 | 文字 | 图标 |
|------|------|------|------|
| **Inactive** | transparent | `#737373` | ` ` (空格) |
| **Hover** | `#171717` | `#737373` | ` ` (空格) |
| **Active** | `#1A1A1A` | `#22C55E` | `>` |

#### 规格

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.nav-item.active {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}

.nav-item.active::before {
  content: '>';
  color: var(--accent-primary);
}
```

### 2.3 Input 输入框

#### 状态

| 状态 | 边框 | 背景 |
|------|------|------|
| **Default** | `1px solid #2E2E2E` | `#0C0C0C` |
| **Focus** | `2px solid #22C55E` | `#0C0C0C` |
| **Error** | `1px solid #EF4444` | `#0C0C0C` |
| **Disabled** | `1px solid #2E2E2E` | `#171717` |

#### 规格

```css
.input {
  height: 40px;
  padding: 0 12px;
  border-radius: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--bg-disabled);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  transition: border var(--transition-fast);
}

.input:focus {
  border: 2px solid var(--accent-primary);
  outline: none;
}

.input.error {
  border: 1px solid var(--danger-primary);
}

.input:disabled {
  background: var(--bg-secondary);
  color: var(--text-muted);
}
```

### 2.4 Switch 开关

#### 状态

| 状态 | Track | Thumb | 文字 |
|------|-------|-------|------|
| **OFF** | `#2E2E2E` | - | `OFF` `#737373` |
| **ON** | `#22C55E` | - | `ON` `#22C55E` |

#### 规格

```css
.switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--bg-disabled);
  transition: background var(--transition-normal);
}

.switch.on {
  background: var(--accent-primary);
}

.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform var(--transition-normal);
}
```

### 2.5 Badge 状态徽章

#### 变体

| 变体 | 背景 | 文字 | 圆点 |
|------|------|------|------|
| **Running** | `#222924` | `#B6FFCE` | `#22C55E` |
| **Stopped** | `#1A1A1A` | `#737373` | `#737373` |
| **Error** | `#24100B` | `#FF5C33` | `#EF4444` |
| **Connecting** | `#291C0F` | `#FF8400` | `#F59E0B` |
| **Active** | `#222924` | `#B6FFCE` | `#22C55E` |

#### 规格

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
```

### 2.6 Toast 通知

#### 变体

| 变体 | 背景 | 边框 | 图标 |
|------|------|------|------|
| **Success** | `#222924` | `#22C55E` | `✓` |
| **Error** | `#24100B` | `#EF4444` | `✕` |
| **Warning** | `#291C0F` | `#F59E0B` | `⚠` |

#### 规格

```css
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid;
  font-family: var(--font-mono);
  font-size: 14px;
  width: 400px;
}
```

### 2.7 Dialog 对话框

#### 规格

```css
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 24px;
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-message {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-secondary);
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
```

### 2.8 Dropdown 下拉菜单

#### 状态

| 状态 | 边框 |
|------|------|
| **Closed** | `1px solid #2E2E2E` |
| **Open** | `1px solid #22C55E` |

#### 规格

```css
.dropdown {
  background: var(--bg-primary);
  border-radius: 4px;
  border: 1px solid var(--bg-disabled);
  min-width: 200px;
}

.dropdown.open {
  border-color: var(--accent-primary);
}

.dropdown-item {
  height: 36px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 14px;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item.selected {
  background: rgba(34, 197, 94, 0.1);
}
```

### 2.9 Connection Card 连接卡片

#### 状态

| 状态 | 背景 | 边框 |
|------|------|------|
| **Default** | `#171717` | none |
| **Hover** | `#1A1A1A` | none |
| **Selected** | `#1A1A1A` | `2px solid #22C55E` |

#### 规格

```css
.connection-card {
  background: var(--bg-secondary);
  border-radius: 4px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 320px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.connection-card:hover {
  background: var(--bg-tertiary);
}

.connection-card.selected {
  background: var(--bg-tertiary);
  border: 2px solid var(--accent-primary);
}
```

### 2.10 Panel Collapse 折叠面板

#### 状态

| 状态 | 高度 | 图标 |
|------|------|------|
| **Expanded** | auto | `▼` |
| **Collapsed** | 48px | `▶` |

#### 规格

```css
.panel {
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  transition: height var(--transition-slow);
}

.panel-header {
  height: 48px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.panel-content {
  padding: 12px;
}
```

### 2.11 Message Direction 消息方向指示器

#### 变体

| 方向 | 图标 | 背景 |
|------|------|------|
| **IN (接收)** | `←` | `#222924` |
| **OUT (发送)** | `→` | `#1A1A1A` |
| **RESEND (重发)** | `↻` | `#1A1A1A` |

### 2.12 Format Tabs 格式标签

#### 规格

```css
.format-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-radius: 4px;
  padding: 4px;
  gap: 4px;
}

.format-tab {
  padding: 6px 12px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
}

.format-tab.active {
  background: var(--accent-primary);
  color: white;
}
```

### 2.13 Filter Input 过滤输入框

#### 状态

| 状态 | 边框 |
|------|------|
| **Empty** | `1px solid #2E2E2E` |
| **Filled** | `1px solid #22C55E` |

#### 规格

```css
.filter-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 4px;
  border: 1px solid var(--bg-disabled);
  width: 320px;
}

.filter-input.has-value {
  border-color: var(--accent-primary);
}
```

### 2.14 Pause/Resume Button 暂停/继续按钮

#### 状态

| 状态 | 背景 | 文字 |
|------|------|------|
| **Playing** | `#22C55E` | `⏸ pause_stream` |
| **Paused** | `#F59E0B` | `▶ resume_stream` |

---

## 3. 布局规范

### 3.1 主应用布局

```
┌────────────────────────────────────────────────────────────┐
│  Sidebar (240px)  │         Main Content (flex-1)          │
│ ┌────────────────┐ │ ┌────────────────────────────────────┐ │
│ │     Logo       │ │ │                                    │ │
│ │   ~ netforge   │ │ │                                    │ │
│ ├────────────────┤ │ │                                    │ │
│ │  Navigation    │ │ │         Content Area               │ │
│ │  > proxy       │ │ │                                    │ │
│ │    server      │ │ │                                    │ │
│ │    client      │ │ │                                    │ │
│ │    udp         │ │ │                                    │ │
│ │    websocket   │ │ │                                    │ │
│ ├────────────────┤ │ ├────────────────────────────────────┤ │
│ │  Bottom Tools  │ │ │  Footer / Log Area                 │ │
│ │  ◐ theme       │ │ │  Status Bar                        │ │
│ │  ⚙ config      │ │ │                                    │ │
│ └────────────────┘ │ └────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar 侧边栏

```css
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--bg-primary);
  border-right: 1px solid var(--bg-elevated);
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-footer {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

### 3.3 响应式断点

```css
/* Desktop (默认): 1440px */
/* Laptop: 1024px - 1439px */
/* Tablet: 768px - 1023px */
/* Mobile: < 768px */

@media (max-width: 1024px) {
  .sidebar {
    width: 200px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none; /* 或变为抽屉 */
  }
}
```

---

## 4. 主题系统

### 4.1 CSS Variables 结构

```css
:root {
  /* 默认深色主题 */
  --bg-primary: #0C0C0C;
  --bg-secondary: #171717;
  --bg-tertiary: #1A1A1A;
  --bg-elevated: #1F1F1F;
  --bg-disabled: #2E2E2E;
  
  --text-primary: #E5E5E5;
  --text-secondary: #A3A3A3;
  --text-muted: #737373;
  --text-disabled: #525252;
  
  --accent-primary: #22C55E;
  --accent-hover: #2ED573;
  --accent-active: #16A34A;
  
  --danger-primary: #EF4444;
  --danger-hover: #F87171;
  
  --warning-primary: #F59E0B;
}

[data-theme="light"] {
  --bg-primary: #F5F5F5;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #E5E5E5;
  --bg-elevated: #E5E5E5;
  --bg-disabled: #D4D4D4;
  
  --text-primary: #0C0C0C;
  --text-secondary: #525252;
  --text-muted: #737373;
  --text-disabled: #A3A3A3;
  
  /* accent, danger, warning 保持不变 */
}
```

### 4.2 主题切换实现

```typescript
// hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme };
}
```

---

## 5. 实现指南

### 5.1 文件结构

```
src-ui/src/
├── styles/
│   ├── tokens.css          # 设计系统 tokens
│   ├── globals.css         # 全局样式
│   └── themes/
│       ├── dark.css        # 深色主题
│       └── light.css       # 浅色主题
├── components/
│   ├── ui/                 # 基础 UI 组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Switch.tsx
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   ├── Dialog.tsx
│   │   ├── Dropdown.tsx
│   │   └── index.ts
│   ├── layout/             # 布局组件
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Panel.tsx
│   └── features/           # 功能组件
│       ├── ConnectionCard.tsx
│       ├── FormatTabs.tsx
│       ├── FilterInput.tsx
│       ├── PauseButton.tsx
│       └── MessageDirection.tsx
└── hooks/
    ├── useTheme.ts
    └── useToast.ts
```

### 5.2 优先级

**Phase 1: 设计系统基础**
1. 创建 `tokens.css` - 颜色、字体、间距
2. 创建主题切换 hook
3. 配置全局样式

**Phase 2: 核心组件**
1. Button - 所有变体
2. Input - 所有状态
3. Switch
4. Badge
5. Toast

**Phase 3: 复合组件**
1. Dialog
2. Dropdown
3. ConnectionCard
4. Panel (可折叠)

**Phase 4: 布局重构**
1. Sidebar 组件
2. Layout 重构
3. App.tsx 集成

**Phase 5: 功能组件**
1. FormatTabs
2. FilterInput
3. PauseButton
4. MessageDirection

### 5.3 验收标准

- [ ] 所有组件与设计稿视觉一致
- [ ] 深色/浅色主题切换正常
- [ ] 所有交互状态正确
- [ ] `npm run build` 无错误
- [ ] `npm run lint` 无警告
- [ ] 组件可访问性 (a11y) 基本合规

---

## 附录: 设计稿截图索引

| 设计稿区域 | 组件 | 截图位置 |
|-----------|------|----------|
| NetForge App | 主布局 | (0, 0) 1440x900 |
| Interaction States | 交互组件 | (1540, 0) 1600x1200 |
| Supplementary States | 补充组件 | (0, 1300) 1600x800 |
| Light Theme Variants | 浅色主题 | (3240, 0) 1600x1200 |
