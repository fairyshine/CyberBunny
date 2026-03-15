# OpenBunny Ink TUI 开发方案

最后更新：2026-03-15

## 1. 目标

基于现有 `web` 端能力，重构 `packages/tui`，采用 Ink 实现一个长期可维护的终端产品形态。

目标不是继续扩展当前“命令行聊天壳”，而是做一个真正的终端工作台：

- 尽可能复用 `packages/shared` 的会话、Agent、工具、Skill、MCP、存储和 AI 编排能力
- 尽可能覆盖 Web 端核心能力，但以终端交互方式重构，而不是逐像素照搬
- 明确放弃 TUI 中的虚拟文件系统和 File Manager，直接以当前工作目录作为上下文
- 将 Shell Exec 作为 TUI 的一等能力，替代 Web 里的“虚拟文件读写”路径
- 在终端里提供可用、稳定、可审美区分的界面，参考 OpenCode / Claude Code 一类产品的终端工作流

## 2. 当前现状

从仓库现状看，TUI 还处于非常早期阶段：

- `packages/tui/src/App.tsx` 目前仅支持单会话聊天、基础 slash commands、模型参数切换、会话恢复
- `packages/shared/src/terminal/chatEngine.ts` 只覆盖基础 LLM streaming + session persistence，不包含 Web 端的 Agent Loop、工具调用流、Skill/MCP 编排
- `packages/shared/src/services/ai/tools.ts` 中：
  - `file_manager` 仍绑定虚拟文件系统
  - `exec` 仍只支持 Electron 注入的 `window.electronAPI.exec`
- `packages/shared/src/services/filesystem/index.ts` 当前主实现是 IndexedDB 虚拟文件系统，适合 Web，不适合 TUI
- Web 端主能力已经建立在 `session` / `agent` / `settings` / `skills` / `tools` store 和 `runAgentLoop()` 之上，TUI 尚未接入这套主路径

结论：如果要“尽可能实现 Web 端所有功能”，不能继续在现有 `chatEngine` 上小修小补，必须让 TUI 转向和 Web 相同的共享核心。

## 3. 产品原则

### 3.1 TUI 的产品定位

TUI 不是 CLI 的皮肤版，而是：

- 面向长时间驻留终端的交互式工作台
- 以“当前工作目录”为核心上下文
- 支持多会话、多 Agent、多工具、多配置切换
- 支持侧边栏、状态栏、弹层、日志面板和命令面板

### 3.2 和 Web 端的差异化原则

TUI 要追求 Web 端能力等价，但不追求形态等价：

- Web 的 Modal 在 TUI 中改成 Overlay / Drawer / Full-screen Panel
- Web 的图形化关系图在 TUI 中改成列表、树状结构或邻接视图
- Web 的文件树 / 文件编辑器在 TUI 中删除，不再建设虚拟文件系统
- Web 的富媒体展示在 TUI 中降级为文本摘要、路径提示或外部打开

### 3.3 参考产品抽象

参考重点不是视觉复刻，而是交互气质：

- OpenCode：
  - 当前目录即工作区
  - 多会话
  - slash command + keybind 驱动
  - 终端主题化和状态明确
- Claude Code：
  - 终端优先
  - 强 slash command 体系
  - 配置、权限、模型、MCP 等能力可在交互中即时切换

## 4. 功能范围

### 4.1 P0 必须覆盖的能力

P0 代表“可以作为主要 TUI 产品使用”的最小完整集。

- 会话系统
  - 新建会话
  - 会话列表
  - 恢复历史会话
  - 删除/归档会话
  - 导出会话
  - 多会话切换
- 聊天主流程
  - 用户输入
  - Assistant 流式输出
  - 工具调用流展示
  - Tool result 展示
  - 停止生成
  - 错误展示
- Agent
  - Agent 列表
  - 切换当前 Agent
  - 创建 Agent
  - 编辑 Agent 基础信息
  - 每个 Agent 的独立模型、工具、技能配置
- 工具系统
  - 内置工具启停
  - MCP 工具接入
  - `exec` 在 TUI 可用
  - `file_manager` 在 TUI 不提供
- Skill
  - 加载 Skill
  - 启停 Skill
  - 在会话中看到 Skill 激活和结果
- 设置
  - Provider / Model / API Key / Base URL
  - temperature / max tokens
  - tool timeout
  - exec login shell
  - search provider
- 日志 / Console
  - LLM / tool / settings / mcp / python / system 分类日志
  - 过滤、滚动、导出
- TUI 框架能力
  - 侧边栏
  - 主聊天区
  - 底部输入框
  - 顶部状态栏
  - 全局快捷键
  - 命令面板

### 4.2 P1 尽量覆盖的 Web 能力

- 项目分组与会话过滤
- Agent Group
- Agent 关系的文本视图
- Dashboard / Status Home
- Memory 查看器
- Cron / Heartbeat 状态查看
- Session summary 展示
- 可切换消息细节级别
- 会话内工具/技能覆盖

### 4.3 P2 适配实现，不要求一比一

- Agent Graph
  - 终端不做可视化拖拽图
  - 改成 group tree + relationship list + core agent 概览
- 图片 / plot 展示
  - 默认显示“已生成图像”摘要
  - 支持保存到临时文件 / 工作目录
  - 终端支持图片协议时再考虑增强
- 富文本代码高亮
  - 先保证结构和可读性
  - 再加语法高亮和 diff 渲染优化

### 4.4 明确不做

- TUI 内虚拟文件系统
- TUI 内 File Manager
- TUI 内 File Editor
- 依赖浏览器 DOM 的 Web 组件直接复用
- 把 Web 的 Dashboard 卡片原样搬进 Ink

## 5. 总体架构

建议采用四层结构。

### 5.1 Shared Core

保留并复用：

- `stores/session.ts`
- `stores/agent.ts`
- `stores/settings.ts`
- `stores/skills.ts`
- `stores/tools.ts`
- `services/ai/*`
- `services/storage/*`
- `utils/messagePresentation.ts`

新增/重构：

- Node 侧 Shell Exec 抽象
- TUI 专用共享 view model
- 节点平台下的 Skill / Tool / Settings 持久化适配

### 5.2 TUI Application Layer

`packages/tui` 内拆成：

- `app-shell/`
  - 根布局、焦点管理、快捷键、面板切换
- `features/chat/`
  - 会话渲染、输入、滚动、导出、停止
- `features/sidebar/`
  - Agents / Sessions / Tools / Logs / Help
- `features/overlays/`
  - 命令面板、模型选择、设置面板、确认框
- `state/`
  - 仅存放 TUI UI 状态，不重复存业务状态
- `theme/`
  - 终端主题 tokens、组件色板、边框规则

### 5.3 Platform Layer

TUI 平台初始化继续经过 `initTerminal({ type: 'tui' })`，但要补全 Node 场景真正需要的能力：

- 所有 persist store 使用 Node storage，而不是默认浏览器 storage
- Node 平台可提供 exec service
- Node 平台可提供工作区信息
- Node 平台可提供外部编辑器调用能力

### 5.4 View Model Layer

这是 TUI 成功的关键。

不能直接把 Web 组件搬过来，但可以把“消息标准化”继续前移到 shared：

- `deriveMessagePresentation()` 继续作为统一消息语义入口
- 新增 `terminal render model`，把 `Message` 转成 TUI 可渲染块
- 把 tool call / tool result / skill activation / summary / badge 等变成终端组件可直接消费的结构

这样 Web 和 TUI 的差异只保留在“如何渲染”，不保留在“如何理解消息”。

## 6. 关键共享层改造

### 6.1 让 TUI 走 Web 的主 AI 路径

当前 TUI 仍走 `shared/src/terminal/chatEngine.ts`，这条路径不支持：

- Agent Loop
- tool call 中间态消息
- Skill activation
- MCP tools
- agent-to-agent chat / mind session 的完整 UI 呈现

建议：

- TUI 主流程改为直接复用 `runAgentLoop()` 和现有 store
- `chatEngine.ts` 保留给简单 CLI 场景，TUI 不再作为主入口依赖它
- `packages/tui` 建立自己的 `ChatController`，行为对齐 Web 的 `ChatContainer`

### 6.2 把 Exec 从 Electron 私有能力改成共享 Node 能力

当前 `exec` 只支持 Electron preload 注入。

建议新增：

- `packages/shared/src/services/exec/`
  - `nodeExec.ts`
  - `sessionManager.ts`
  - `types.ts`

职责：

- 维护持久 shell session
- 指定 `cwd`
- 支持 login shell
- 支持超时
- 支持销毁 session
- 支持 stdout/stderr 合并和结束标记

然后：

- Desktop 复用这套 Node exec service，而不是在 Electron main 中保留一份独立实现
- TUI 直接调用共享 Node exec service
- `createExecTool()` 基于平台 capability 判断是否可用，不再写死 Electron

### 6.3 TUI 去掉 File Manager 和虚拟文件系统依赖

这是本次方案的核心边界调整。

处理方式：

- TUI 默认工具集合不包含 `file_manager`
- TUI 的 Agent 默认 enabledTools 从：
  - `python`
  - `web_search`
  - `memory`
  - `mind`
  - `chat`
  - `exec`
  - `cron`
  - `heartbeat`
  - `mcp tools`
  中选择
- 所有需要“读写代码”的能力，统一由：
  - `exec`
  - LLM 通过 shell 命令访问工作区
  来完成

注意：

- Web 端仍可保留虚拟文件系统
- 不建议为了 TUI 改坏 Web 的 `fileSystem` 和 `file_manager`
- 应该做“平台特征分叉”，而不是全局删除

### 6.4 修复 Node 环境下各 persist store 的存储问题

当前 Node 平台初始化只明确接管了 session store 的 persisted storage。要支撑完整 TUI，还需要统一接管：

- `settings`
- `agent`
- `tools`
- 如果保留 persist 的 `skills` 目录开关状态，也要统一处理

建议新增一个 shared helper：

- `registerNodePersistStorage(storage)`

由 `initTerminal()` 在 Node 场景下对所有需要持久化的 Zustand store 统一设置 storage 并触发 rehydrate。

### 6.5 Skill Store 去浏览器假设

当前 `skills.ts` 还直接访问 `localStorage`。

建议改为：

- enabled skill IDs 放入 Zustand persist
- Skill 内容继续通过 `services/skills/*` 读取
- Node/TUI 下 Skill 根目录放在 config dir，例如：
  - `~/.openbunny/skills`
  - 或 workspace 级 `./.openbunny/skills`

推荐：

- 默认全局目录
- 支持 workspace 局部覆盖

### 6.6 平台能力显式化

增加平台 capability 判断，避免 UI 和工具层硬编码：

- `supportsExec`
- `supportsVirtualFS`
- `supportsPlotsInline`
- `supportsExternalEditor`
- `supportsColor24bit`

TUI 渲染和工具可用性应全部基于 capability，而不是 `typeof window !== 'undefined'` 这种分支。

## 7. Ink TUI 交互设计

## 7.1 总体布局

推荐布局：

```text
┌ Sidebar ───────────────┬ Main Conversation ───────────────────────────────┐
│ Workspace              │ Top Status Bar                                   │
│ Agents                 │ Session title / agent / model / tool status      │
│ Sessions               ├───────────────────────────────────────────────────┤
│ Tools / MCP            │ Scrollable messages                              │
│ Logs / Help            │ tool call / tool result / assistant / summary    │
│                        │                                                   │
├────────────────────────┤                                                   │
│ Footer shortcuts       ├───────────────────────────────────────────────────┤
│ Ctrl+K Commands        │ Composer / input / inline hint                    │
└────────────────────────┴───────────────────────────────────────────────────┘
```

### 7.2 侧边栏信息架构

推荐 5 个一级 section：

- `Home`
  - 工作区
  - 当前 Agent
  - 当前模型
  - 最近会话
  - MCP 状态
- `Sessions`
  - 当前 Agent 下会话
  - 搜索 / 过滤
  - 新建 / 删除 / 恢复
- `Agents`
  - Agent 列表
  - Group 列表
  - 新建 / 编辑 / 切换
- `Tools`
  - 内置工具开关
  - MCP 连接
  - Skill 启停
- `Logs`
  - Console 日志入口
  - 导出日志

说明：

- 不再有 `Files` tab
- 终端宽度不足时，侧边栏可折叠为 icon rail 或单列目录

### 7.3 主聊天区

主聊天区应支持以下消息块：

- 用户消息
- Assistant 响应
- Thinking / tool call 中间态
- Tool result
- Skill activation
- Skill result
- System message
- Session summary

建议视觉规则：

- 用户消息右侧对齐，使用低饱和高亮边框
- Assistant 消息左侧对齐，正文宽度受限
- Tool call 用 dim + accent header
- Tool result 用折叠块，默认显示摘要，展开看详情
- Error 使用红色强调，但不整屏染红
- 正在 streaming 的消息底部显示细光标或脉冲点，而不是持续大 spinner

### 7.4 输入区

输入区应支持：

- 单行输入默认模式
- 多行输入模式
- slash command 自动补全
- `@` 文件引用搜索
- `!` 快速执行 shell 命令
- `Ctrl+Enter` 发送
- `Esc` 退出面板 / 清空选择态

建议：

- 默认输入框保持简洁
- 复杂输入通过外部编辑器模式补充
- 提供 `/editor` 使用 `$EDITOR`

### 7.5 命令面板

参考 OpenCode，增加全局命令面板：

- `Ctrl+K` 打开
- 搜索命令、会话、Agent、模型、设置项

命令面板内容：

- 会话：new / resume / delete / export
- Agent：switch / create / edit
- 模型：switch provider / switch model
- 工具：toggle tool / manage MCP / manage skills
- 视图：toggle sidebar / toggle logs / toggle details / toggle thinking
- 系统：help / theme / doctor / quit

### 7.6 快捷键

建议默认快捷键：

- `Ctrl+K`：命令面板
- `Ctrl+B`：切换侧边栏
- `Ctrl+L`：会话列表
- `Ctrl+G`：Agent 列表
- `Ctrl+M`：模型选择
- `Ctrl+T`：工具 / Skills 面板
- `Ctrl+J`：日志面板
- `Ctrl+E`：外部编辑器
- `Ctrl+S`：导出会话
- `Ctrl+C`：若正在生成则停止，否则二次确认退出

## 8. 视觉设计方案

### 8.1 风格方向

目标气质：

- 深色为默认，但兼容浅色终端主题
- 冷灰主色基调 + 单一强调色
- 模块之间边界明确，但不过度粗重
- 优先体现“工具正在工作”的工程感，而不是聊天 App 感

### 8.2 主题 tokens

建议定义 TUI tokens：

- `bg`
- `panel`
- `panelMuted`
- `text`
- `textDim`
- `border`
- `accent`
- `accentSoft`
- `success`
- `warn`
- `danger`
- `selection`

优先支持：

- truecolor 终端
- 256 色降级
- monochrome 降级

### 8.3 组件风格

- Sidebar：深一点，形成层次分隔
- Main：更轻，保证聊天可读性
- Status bar：细窄，信息密度高
- Input：边框明显，但不喧宾夺主
- Selected item：反色块 + 左侧短 accent bar
- Tool badge：胶囊标签

### 8.4 参考产品可借鉴点

可借鉴：

- OpenCode 的工作区即入口、命令驱动、主题化能力
- Claude Code 的终端优先、slash command 密度、配置即时切换

不建议照搬：

- 过度依赖隐藏命令
- 过度极简导致状态信息缺失
- 让所有能力都靠文档记忆，不可发现

## 9. 功能映射：Web -> TUI

### 9.1 可直接复用

- `session` store
- `agent` store
- `settings` store
- `tools` store
- `runAgentLoop()`
- `deriveMessagePresentation()`
- `consoleLogger`
- `MCP discover / connect` 流程

### 9.2 需要提取共享逻辑后复用

- Web 消息规范化
- Export 逻辑
- Session summary 逻辑
- Tool display metadata
- Status dashboard 数据聚合

### 9.3 需要重写 TUI UI

- Sidebar
- Header
- Session tabs
- Chat input
- Message list
- Tool manager
- Skill manager
- Console panel
- Settings modal
- Status screen

### 9.4 需要 TUI 适配而非直搬

- Agent graph -> 文本关系视图
- Global stats page -> 文本 dashboard
- Memory viewer -> 终端表单 / 分栏浏览
- Export dialog -> 文件写出 + 外部编辑器打开

## 10. 推荐实施步骤

### Phase 0：先稳定共享基础

目标：让 TUI 有可能承载 Web 主能力。

任务：

- 抽出共享 Node exec service
- 让 `exec` 工具在 TUI 可用
- 增加平台 capability
- 为 `settings` / `agent` / `tools` / `session` 统一接入 Node persist storage
- 去除 `skills.ts` 里的 `localStorage` 假设
- 明确 TUI 默认工具集不含 `file_manager`

交付结果：

- TUI 能在 Node 环境下完整读写配置、Agent、会话、MCP 连接
- exec 工具能在 TUI 实际执行命令并复用 shell session

### Phase 1：重建 TUI 主框架

目标：从“聊天页”升级到“终端工作台”。

任务：

- Root layout
- Sidebar
- Top status bar
- Main chat pane
- Bottom composer
- UI state store
- focus / keybinding 管理

交付结果：

- 可以在终端中稳定切换侧边栏、主区和输入框
- 可以切换会话和 Agent

### Phase 2：接入 Web 同款聊天编排

目标：TUI 主聊天能力与 Web 对齐。

任务：

- 用 `runAgentLoop()` 替换当前 `chatEngine` 主路径
- 接入 tool call / tool result streaming
- 接入 Skill activation 消息
- 接入 MCP 工具执行状态
- 接入停止生成和中断恢复

交付结果：

- TUI 能展示完整工具链路，不只是纯文本回答

### Phase 3：管理面板补齐

目标：补齐可运营的设置与管理能力。

任务：

- Session 管理面板
- Agent 管理面板
- Tool / MCP / Skill 面板
- Settings 面板
- Console 日志面板
- Export 流程

交付结果：

- 用户无需退出 TUI 即可完成大部分配置与管理操作

### Phase 4：状态页和高级能力

目标：补足 Web 的“工作台感”。

任务：

- 文本版 dashboard / status home
- memory / cron / heartbeat 文本查看器
- Agent group / relationship 视图
- message details / thinking visibility 开关
- external editor 模式

交付结果：

- TUI 具备与 Web 接近的完整工作流闭环

### Phase 5：体验打磨

目标：让产品可长期使用。

任务：

- 主题系统
- 长会话滚动性能
- 更好的 markdown / code block 渲染
- 更自然的 loading / progress 呈现
- 快捷键可配置
- 终端尺寸自适应

## 11. 目录建议

建议把 `packages/tui/src` 重组为：

```text
packages/tui/src/
  index.tsx
  App.tsx
  app/
    Shell.tsx
    StatusBar.tsx
    Sidebar.tsx
    CommandPalette.tsx
    Layout.tsx
  features/
    chat/
      ChatPane.tsx
      MessageViewport.tsx
      Composer.tsx
      renderers/
    sessions/
      SessionPanel.tsx
    agents/
      AgentPanel.tsx
      AgentEditor.tsx
    tools/
      ToolPanel.tsx
      MCPPanel.tsx
      SkillPanel.tsx
    logs/
      LogPanel.tsx
    settings/
      SettingsPanel.tsx
    dashboard/
      DashboardPane.tsx
  hooks/
    useAppKeymap.ts
    useViewport.ts
    useConversationController.ts
    useCommandPalette.ts
  state/
    ui.ts
  theme/
    tokens.ts
    palette.ts
  utils/
    format.ts
    terminal.ts
```

## 12. 技术细节建议

### 12.1 长会话渲染

Ink 对超长列表不适合无脑全量渲染。

建议：

- 做 windowed rendering
- 维护 `scrollOffset + visibleCount`
- 只渲染窗口内消息和前后少量 buffer
- streaming 的最后一条消息始终强制保留

### 12.2 Markdown 渲染

分阶段做：

- P0：纯文本 + code block + heading + quote + list
- P1：ANSI 颜色高亮
- P2：diff 高亮

不要一开始引入很重的终端 markdown 栈。

### 12.3 外部编辑器

复杂输入、系统提示词编辑、Skill 编辑建议走 `$EDITOR`。

支持场景：

- `/editor`
- 编辑 Agent system prompt
- 编辑 Skill 内容
- 导出后打开

### 12.4 工作区上下文

TUI 启动即绑定 workspace：

- 默认 `process.cwd()`
- 支持 `openbunny-tui --workspace /path`

所有 exec session 默认：

- `cwd = workspace`
- 由状态栏持续显示

### 12.5 `@` 文件引用

虽然不再做 File Manager，但 TUI 仍应支持“工作区文件引用”。

实现方式：

- 基于真实文件系统做模糊搜索
- 用户输入 `@`
- 弹出工作区文件搜索结果
- 选中后将文件内容注入消息上下文

这比构建虚拟文件系统更符合终端产品形态。

### 12.6 `!` 命令快捷执行

建议增加：

- 输入以 `!` 开头时，直接走 exec service
- 输出作为 tool result 或 system result 回到对话流

这会显著提升 TUI 产品自然度。

## 13. 测试策略

### 13.1 Shared 层

新增测试：

- exec session manager
- TUI 平台 capability
- Node persist store rehydrate
- TUI 默认工具集不含 `file_manager`
- Skill store 在 Node 下的持久化与加载

### 13.2 TUI 组件层

使用 Ink 测试库覆盖：

- Sidebar 导航
- 快捷键切换
- 命令面板交互
- 会话切换
- 输入发送 / 停止
- 流式消息渲染

### 13.3 集成测试

覆盖核心场景：

- 启动 TUI -> 新建会话 -> 发送消息 -> 流式回复
- Agent 切换 -> 独立会话持久化
- 执行 `exec` 工具 -> shell session 复用
- MCP 连接 -> 工具发现 -> 调用
- 导出会话 -> 文件落盘

## 14. 风险与应对

### 14.1 风险：TUI 状态复杂度快速膨胀

原因：

- 业务状态在 shared store
- UI 状态在 TUI
- 工具流中间态很多

应对：

- 严格区分“业务状态”和“界面状态”
- TUI 不复制 session/agent 数据，只存焦点和视图状态

### 14.2 风险：长消息性能和终端闪烁

应对：

- windowed rendering
- streaming 只更新末尾块
- 减少全屏重绘

### 14.3 风险：Node / Electron exec 双实现漂移

应对：

- 尽快收敛到 shared Node exec service
- Desktop 和 TUI 共用同一套执行核心

### 14.4 风险：Store 在 Node 下持久化行为不一致

应对：

- 统一的 `registerNodePersistStorage()`
- 在 `initTerminal()` 中集中处理

### 14.5 风险：功能追求完全对齐导致首版失控

应对：

- 先对齐主工作流，再补管理能力，再补体验
- 明确 P0 / P1 / P2，不追求首版全做完

## 15. 推荐的首批交付清单

如果按投入产出比排序，建议第一批就做完以下内容：

1. Node exec service 共享化
2. Node 持久化 store 统一接入
3. TUI 新布局：侧边栏 + 主聊天区 + 输入区 + 状态栏
4. 基于 `runAgentLoop()` 的真实工具流聊天
5. 会话列表和 Agent 切换
6. Tool / MCP / Skill 管理面板
7. Console 日志面板
8. `/help` `/sessions` `/agents` `/models` `/tools` `/theme` `/quit`
9. `@` 文件引用和 `!` shell 快捷命令

完成这一批后，TUI 就已经不再是“简化版终端聊天”，而是可替代 Web 的主工作入口。

## 16. 结论

这次 TUI 开发不应理解为“补一个 Ink 前端”，而应理解为：

- 用 Ink 重建一个终端原生工作台
- 让 TUI 接入 Web 已经成熟的 shared 能力主路径
- 明确抛弃虚拟文件系统，转向工作区 + Shell Exec 的终端范式

最关键的技术决策只有三个：

1. TUI 不再依赖当前简单 `chatEngine`，而是切到 Web 同款 `runAgentLoop()` 主路径
2. `exec` 从 Electron 私有实现升级为 shared Node 能力
3. `file_manager` 和虚拟文件系统不进入 TUI 范围，文件相关能力通过工作区上下文、`@` 引用和 `exec` 完成

只要这三个决策先落实，后续 Ink 界面和功能补齐就会变成连续演进，而不是重复造轮子。
