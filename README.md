# 🐰CyberBunny - Personal AI Assistant

<div align="center">

**🐰 浏览器端 AI Agent 平台**

一个完全运行在浏览器中的智能代理系统，支持 Python 执行、文件管理、工具扩展和 MCP 集成。

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

## ✨ 核心特性

### 🤖 智能 Agent 系统
- **自主任务执行** - Agent 自动分析任务并执行
- **工具自动调用** - 智能选择和组合使用工具
- **流式响应** - 实时显示执行过程和结果
- **多轮对话** - 支持复杂任务的多步骤执行

### 🐍 Python 运行时
- **Pyodide 集成** - 完整的 Python 3.11 环境
- **科学计算** - 支持 NumPy、Pandas、Matplotlib
- **文件系统同步** - Python 与浏览器文件系统无缝集成
- **输出捕获** - 实时显示 stdout/stderr 和图表

### 📁 文件系统沙盒
- **IndexedDB 存储** - 持久化的浏览器端文件系统
- **POSIX 接口** - 熟悉的文件操作 API
- **拖拽上传** - 支持文件和文件夹拖拽
- **在线编辑** - 内置代码编辑器

### 🔧 可扩展工具系统
- **内置工具** - Python 执行、网页搜索、计算器、文件操作
- **动态加载** - 支持从文件、HTTP、MCP 加载工具
- **工具注册** - 简单的工具开发和注册机制
- **参数验证** - 自动验证工具输入参数

### ⚡ Skills 系统
- **高级能力** - 编排多个工具完成复杂任务
- **内置 Skills** - 数据分析、网页研究等
- **多步执行** - 支持有状态的多步骤工作流
- **动态扩展** - 支持从文件、HTTP、代码加载自定义 Skills

### 🔌 MCP 集成
- **Model Context Protocol** - 连接外部工具服务器
- **WebSocket/SSE** - 双协议支持
- **工具发现** - 自动发现和加载 MCP 工具
- **远程执行** - 调用远程工具和资源

### 💬 多 LLM 支持
- **OpenAI**
- **Anthropic**
- **自定义端点** - 支持 vLLM、Ollama 等本地部署
- **流式输出** - SSE 实时响应

### 🎨 现代化 UI
- **React 19** - 最新的 React 版本
- **shadcn/ui** - 精美的组件库
- **Tailwind CSS** - 响应式设计
- **深色模式** - 自动切换主题

## 🚀 快速开始

### 前置要求

- Node.js 18+ 或 Bun
- pnpm (推荐) 或 npm

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/cyberbunny.git
cd cyberbunny

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173 开始使用。

### 配置 LLM

1. 点击右上角的设置按钮
2. 选择 "LLM 配置" 标签
3. 选择提供商 (OpenAI/Anthropic/自定义)
4. 输入 API Key
5. 点击 "测试连接" 验证配置

## 🛠️ 技术栈

- **React 19** - UI 框架
- **TypeScript 5** - 类型安全
- **Vite 5** - 构建工具
- **shadcn/ui** - 组件库
- **Tailwind CSS** - 样式框架
- **Zustand** - 状态管理
- **Pyodide** - 浏览器端 Python
- **IndexedDB** - 本地存储

## 📝 许可证

MIT License - 查看 [LICENSE](./LICENSE) 文件

## 🙏 致谢

- [Pyodide](https://pyodide.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

<div align="center">
Made with ❤️ by RadiCato
</div>
