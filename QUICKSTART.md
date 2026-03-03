# CyberBunny 快速开始

## 功能特性

🐰 **CyberBunny** 是一个运行在浏览器中的 AI Agent，具备以下能力：

- **🤖 智能对话** - 集成 OpenAI/Anthropic API 的流式聊天
- **🐍 Python 执行** - 基于 Pyodide 的浏览器内 Python 运行（无需后端）
- **🔌 MCP 支持** - 连接 MCP 服务器获取扩展能力
- **🎯 技能系统** - 模块化技能，支持自定义扩展
- **💻 代码执行** - 直接运行 Python 代码并查看输出和图表
- **🔍 网页搜索** - 内置 DuckDuckGo 搜索能力

## 界面预览

```
┌─────────────────────────────────────────────────┐
│  🐰 CyberBunny                              [设置] │
├──────────┬──────────────────────────────────────┤
│          │  你好，我是 CyberBunny                    │
│ 会话列表  │                                       │
│          │  用户：帮我计算 123 * 456              │
│ ▶ 会话1  │                                       │
│   会话2  │  🐰：🧮 123 * 456 = 56088            │
│          │                                       │
│          │  用户：/python                          │
│          │  ```python                             │
│          │  import matplotlib.pyplot as plt       │
│          │  plt.plot([1,2,3], [4,5,6])            │
│          │  plt.show()                            │
│          │  ```                                   │
│          │                                       │
│          │  [图表显示区域]                         │
│          │                                       │
├──────────┴──────────────────────────────────────┤
│  已启用技能: 🐍Python ✓ | 🔍搜索 ✓ | 🧮计算器 ✓    │
├─────────────────────────────────────────────────┤
│  [💻] [输入消息...                         ] [➤] │
└─────────────────────────────────────────────────┘
```

## 快速开始

### 1. 安装依赖

```bash
cd web-agent
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的 OpenAI API Key
```

### 3. 启动开发服务器

```bash
pnpm run dev
```

然后访问 http://localhost:5173

## 使用技能

在聊天中可以直接使用以下命令：

| 命令 | 功能 | 示例 |
|------|------|------|
| `/python` 或 ```python | 执行 Python 代码 | `/python print("Hello")` |
| `/calc` | 计算器 | `/calc 123 * 456` |
| `/search` | 网页搜索 | `/search OpenAI` |

## 项目结构

```
web-agent/
├── src/
│   ├── components/      # UI 组件
│   ├── services/
│   │   ├── python/      # Python 执行器 (Pyodide)
│   │   ├── mcp/         # MCP 客户端
│   │   └── skills/      # 技能注册表
│   ├── stores/          # Zustand 状态管理
│   └── types/           # TypeScript 类型
└── README.md
```

## 浏览器兼容性

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

需要支持 WebAssembly 和 SharedArrayBuffer。

## 技术栈

- **React 18** + TypeScript
- **Vite** 构建工具
- **Tailwind CSS** 样式
- **Pyodide** Python WASM 运行时
- **Zustand** 状态管理
- **MCP SDK** 协议支持
