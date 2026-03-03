# CyberBunny - 纯前端浏览器端智能体

⚡️ **纯前端项目 | Pure Frontend** ⚡️

一个完全运行在浏览器中的智能体应用，无需后端服务器。支持 MCP、Skills 和 Python 代码执行，所有数据存储在本地 IndexedDB 中。

> 🔒 **隐私安全**: 所有数据保存在本地浏览器，不会上传到任何服务器
> 
> 🚀 **零部署成本**: 纯静态文件，可直接部署到任何静态托管服务
> 
> 🌐 **离线可用**: 支持 PWA，可离线使用核心功能

## 架构概览 - 纯前端架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React + TypeScript (Vite)                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Agent UI │  │ Skill    │  │ File System      │   │   │
│  │  │ (Chat)   │  │ Registry │  │ (IndexedDB)      │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  │         │             │             │               │   │
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │ MCP Client   │  │ LLM      │  │ Pyodide  │      │   │
│  │  │ (WebSocket/  │  │ Adapter  │  │ (WASM)   │      │   │
│  │  │  SSE)        │  │          │  │          │      │   │
│  │  └──────────────┘  └──────────┘  └──────────┘      │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐  │
│  │  Local Storage            │  Session Storage          │  │
│  │  • Settings               │  • Chat History           │  │
│  │  • File System (IndexedDB)│  • Current Session        │  │
│  └───────────────────────────┴───────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

                      ☁️ Optional External APIs
              (OpenAI/Anthropic API, MCP Servers, etc.)
```

### 🎯 纯前端特性

| 功能 | 实现方式 | 数据存储 |
|------|---------|---------|
| 文件系统 | 虚拟文件系统 | IndexedDB |
| Python 执行 | Pyodide (WASM) | 内存 |
| 会话历史 | Zustand + localStorage | 本地存储 |
| MCP 连接 | WebSocket/SSE | 无状态 |
| LLM 调用 | fetch API | 仅配置 |

## 核心功能

1. **Agent Chat UI** - 类 OpenClaw 的聊天界面
2. **MCP Support** - 通过 WebSocket/SSE 连接 MCP 服务器
3. **Skills System** - 可插拔的技能模块
4. **Python Execution** - 基于 Pyodide 的浏览器内 Python 运行

## 技术栈

- React 18 + TypeScript
- Zustand (状态管理)
- Tailwind CSS (样式)
- Pyodide (Python WASM)
- Vite (构建工具)

## 快速开始

```bash
npm install
npm run dev
```

### 使用自定义 vLLM 服务器

如果要连接自定义的 vLLM 服务器，需要配置 CORS 支持。详见 [VLLM_SETUP.md](./VLLM_SETUP.md)。

## 项目结构

```
src/
├── components/       # UI 组件
├── hooks/           # React Hooks
├── services/        # 核心服务
│   ├── mcp/         # MCP 客户端
│   ├── skills/      # 技能系统
│   └── python/      # Python 执行器
├── stores/          # 状态管理
├── types/           # TypeScript 类型
└── utils/           # 工具函数

## 部署

### 方式一：GitHub Pages (推荐)

项目已配置 GitHub Actions 工作流，推送代码后自动部署：

1. Fork 本项目到您的 GitHub 账号
2. 在仓库 Settings > Pages 中设置 Source 为 "GitHub Actions"
3. 推送代码到 `main` 分支，自动触发部署
4. 访问 `https://<your-username>.github.io/web-agent/`

### 方式二：Vercel / Netlify

纯静态项目，可直接导入到 Vercel/Netlify 自动部署：

```bash
# 构建命令
npm run build

# 输出目录
dist
```

### 方式三：本地静态服务

```bash
npm run build
npx serve dist
```

### 方式四：Docker

```bash
docker run -p 8080:80 -v $(pwd)/dist:/usr/share/nginx/html nginx:alpine
```

## 配置说明

所有配置保存在浏览器本地存储中：

- **LLM API Key** - 在设置页面配置，仅保存在本地
- **MCP Servers** - 在设置页面添加 MCP 服务器配置
- **文件系统** - 存储在 IndexedDB，可通过导出/导入备份
```
