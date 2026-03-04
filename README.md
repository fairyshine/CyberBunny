# 🐰 CyberBunny — Cross-platform OpenClaw

一个跨平台的个人AI Assistant，支持多平台运行（浏览器、桌面、移动端、命令行、终端 UI）。

## ✨ 特性

- 🌐 **多平台支持** - Browser / Electron / React Native / CLI / TUI
- 🔧 **工具系统** - 内置 Python 执行、文件管理、Web 搜索等工具
- 🎯 **技能系统** - 基于 AgentSkills.io 格式的可扩展技能
- 🔌 **MCP 支持** - Model Context Protocol 集成
- 🌍 **国际化** - 中文/英文双语支持
- 💾 **本地存储** - 数据完全保存在本地，隐私安全
- 🎨 **现代 UI** - 基于 React 19 + Tailwind CSS + shadcn/ui

## 📦 Monorepo 结构

```
cyberbunny/
├── packages/
│   ├── shared/          # 平台无关的核心逻辑
│   ├── web/             # 浏览器端 (Vite + React)
│   ├── desktop/         # 桌面端 (Electron)
│   ├── mobile/          # 移动端 (React Native - 预留)
│   ├── cli/             # 命令行工具 (Commander.js)
│   └── tui/             # 终端 UI (Ink - React for CLI)
└── worker/              # Cloudflare Worker (CORS 代理)
```

## 🚀 快速开始

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install
```

### 开发模式

```bash
# 浏览器端
pnpm dev

# 桌面端 (Electron)
pnpm dev:desktop

# 终端 UI
pnpm dev:tui

# 命令行工具
cd packages/cli
pnpm dev -- ask "你好"
```

### 构建

```bash
# 构建 Web
pnpm build

# 构建桌面端
pnpm build:desktop

# 构建 CLI
pnpm build:cli

# 构建 TUI
pnpm build:tui

# 打包桌面应用
pnpm package:desktop
```

## 🎯 使用方式

### 1. 浏览器端 (Web)

访问 [https://fairyshine.github.io/CyberBunny/](https://fairyshine.github.io/CyberBunny/) 或本地运行：

```bash
pnpm dev
# 访问 http://localhost:5173
```

**特性：**
- 完整的 UI 界面
- 文件管理系统
- 工具和技能管理
- 会话历史
- 设置面板

### 2. 桌面端 (Electron)

```bash
pnpm dev:desktop
# 或构建后安装
pnpm build:desktop
pnpm package:desktop
```

**特性：**
- 原生桌面应用
- 系统集成
- 离线使用
- 本地文件系统访问

### 3. 命令行 (CLI)

```bash
# 一次性问答
cyberbunny ask "什么是 TypeScript?"

# 交互式对话
cyberbunny chat -k YOUR_API_KEY

# 配置管理
cyberbunny config set apiKey sk-xxx
```

**特性：**
- 快速问答
- 脚本集成
- 配置管理
- 流式输出

### 4. 终端 UI (TUI)

```bash
cyberbunny-tui -k YOUR_API_KEY
```

**特性：**
- 全屏交互界面
- 实时流式响应
- React 组件化
- 消息历史

## 🛠️ 技术栈

### 核心技术

- **Monorepo**: pnpm workspace
- **语言**: TypeScript
- **构建**: Vite 5
- **包管理**: pnpm

### 前端框架

- **Web/Desktop**: React 19 + Vite
- **TUI**: Ink 6 (React for CLI)
- **UI 组件**: shadcn/ui (Radix UI)
- **样式**: Tailwind CSS

### 状态管理

- **Store**: Zustand
- **持久化**: localStorage / IndexedDB / conf

### 平台支持

- **Browser**: localStorage + IndexedDB
- **Electron**: IPC + electron-store
- **Node.js**: conf (CLI/TUI)
- **React Native**: AsyncStorage (预留)

### 工具链

- **CLI**: Commander.js
- **Terminal UI**: Ink 6
- **Desktop**: Electron + electron-builder
- **Python**: Pyodide (浏览器内 Python)
- **国际化**: i18next

## 📚 文档

- [CLI 使用指南](./packages/cli/README.md)
- [技能系统设计](./docs/SKILLS_DESIGN.md)
- [平台抽象层](./packages/shared/src/platform/)

## 🔧 配置

### 环境变量

```bash
# API Key
CYBERBUNNY_API_KEY=sk-xxx

# CORS 代理 (可选)
VITE_PROXY_WORKER_URL=https://your-worker.workers.dev
```

### 配置文件

浏览器端配置存储在 localStorage：
- `webagent-sessions` - 会话数据
- `webagent-settings` - 设置

CLI/TUI 配置存储在：
- macOS: `~/Library/Preferences/cyberbunny-nodejs/`
- Linux: `~/.config/cyberbunny-nodejs/`
- Windows: `%APPDATA%\cyberbunny-nodejs\`

## 🎨 平台检测

CyberBunny 在运行时自动检测平台：

```typescript
import { getPlatform } from '@shared/platform';

const platform = getPlatform();
// { type: 'browser' | 'desktop' | 'mobile' | 'cli' | 'tui' }
```

每个平台提供统一的接口：
- **Storage**: 配置和数据持久化
- **API**: HTTP 请求
- **FS**: 文件系统 (可选)

## 🧪 开发

### 依赖管理（pnpm 严格模式）

本项目使用 pnpm workspace，默认运行在**严格模式**下：每个包只能访问自己 `package.json` 中声明的直接依赖。

由于 `shared` 和 `ui-web` 等 workspace 包以**源码形式**被消费（`"main": "./src/index.ts"`，非编译产物），Vite 构建时会直接处理它们的源码。这意味着它们的 `import` 语句需要从消费方（如 `web`、`desktop`）的 `node_modules` 中解析。

**因此，`web` 和 `desktop` 的 `package.json` 必须显式声明 `shared` / `ui-web` 的传递依赖**（如 Radix UI、i18next、zustand 等），即使自身源码并不直接 import 这些包。

```
web/desktop 源码
  → import { Foo } from '@cyberbunny/ui-web'    # workspace 源码引用
    → ui-web 源码 import '@radix-ui/react-dialog'  # 传递依赖
      → Vite 从 web/desktop 的 node_modules 解析  # 严格模式下必须声明
```

> **注意**：不要随意移除 `web`/`desktop` 中看似"冗余"的依赖，否则构建会失败。如果未来将 workspace 包改为发布编译产物，则可以移除这些重复声明。

### 类型检查

```bash
pnpm typecheck
```

### 代码规范

```bash
pnpm lint
```

### 添加新平台

1. 创建 `packages/your-platform/`
2. 实现平台适配器 `src/platform/adapter.ts`
3. 初始化平台上下文 `setPlatformContext()`
4. 更新 `packages/shared/src/platform/types.ts`

## 📝 可用命令

```bash
# 开发
pnpm dev              # Web 开发服务器
pnpm dev:desktop      # Electron 开发
pnpm dev:tui          # TUI 开发

# 构建
pnpm build            # 构建 Web
pnpm build:desktop    # 构建 Electron
pnpm build:cli        # 构建 CLI
pnpm build:tui        # 构建 TUI

# 打包
pnpm package:desktop  # 打包桌面应用

# 工具
pnpm typecheck        # 类型检查所有包
pnpm lint             # 代码检查
pnpm preview          # 预览 Web 构建
```

## 🌟 特色功能

### 1. 工具系统

内置工具：
- **Python 执行器** - 浏览器内运行 Python (Pyodide)
- **文件管理** - IndexedDB 文件系统
- **Web 搜索** - Exa / Brave 搜索集成
- **计算器** - 数学表达式计算
- **记忆系统** - 长期记忆管理

### 2. 技能系统

基于 [AgentSkills.io](https://agentskills.io) 格式：
- Markdown 格式定义
- 工具编排
- 可扩展架构

### 3. MCP 支持

Model Context Protocol 集成：
- WebSocket / SSE 连接
- 动态工具加载
- 多服务器支持

### 4. 多 LLM 支持

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- 自定义 API (vLLM, Ollama 等)

## 🔒 隐私与安全

- ✅ 数据完全本地存储
- ✅ 不上传任何用户数据
- ✅ API Key 本地加密存储
- ✅ 支持自托管 CORS 代理

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

## 📄 许可证

MIT License

## 🙏 致谢

- [shadcn/ui](https://ui.shadcn.com/) - UI 组件
- [Pyodide](https://pyodide.org/) - 浏览器内 Python
- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Commander.js](https://github.com/tj/commander.js) - CLI 框架

---

**CyberBunny** - 一个真正的多平台 AI Agent 🐰
