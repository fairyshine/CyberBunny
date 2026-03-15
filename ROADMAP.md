# OpenBunny CLI / TUI Roadmap

## Current Status

The web app is the functional reference implementation. `packages/cli` and `packages/tui` exist and can already send chat requests, but they are still far behind the web experience in workflow depth, configuration UX, and platform integrations.

## Shared Terminal Foundations

CLI and TUI should not evolve as separate products. They share the same terminal-oriented core:

- Provider registry, model config, and session persistence rules
- A real workspace directory on the host system
- Shared command semantics for chat, config, history, export, and runtime status
- Reuse of the existing Shell Exec tool for file and shell workflows

For terminal platforms, we do not need a virtual filesystem or a dedicated file manager tool. The assistant should operate inside a real system directory and use shell commands when it needs to inspect or modify files.

## Web Feature Baseline

The web app already includes these major capability areas that CLI/TUI should progressively align with:

- Multi-provider LLM configuration, connection testing, and runtime settings
- Session management with tabs, projects, trash, and persistence
- Agent management, per-agent configuration, and agent graph views
- Built-in tools plus MCP tool discovery and enablement
- Skill discovery, creation, editing, and activation
- File tree browsing and text editing
- Memory viewer, console/log panels, dashboard cards, and status pages
- Message search, export, and richer message rendering

## CLI Roadmap

### Phase 1: Make Core CLI Reliable

- Complete configuration flow for `ask`, `chat`, and `config`
- Align provider support with the shared provider registry
- Improve help output, startup docs, and error handling
- Add simple chat session commands such as `/clear`, `/history`, and `/help`

### Phase 2: Reach Practical Daily Use

- Add session persistence and named conversation resume
- Add non-interactive export formats for automation
- Expose provider connection test and model inspection commands
- Add message search and transcript summarization helpers

### Phase 3: Bring Over Web Power Features

- Add agent-aware commands and per-agent runtime overrides
- Add tool and skill management commands
- Add MCP connection management and tool listing
- Add workspace-aware shell workflows on top of the existing Shell Exec tool

## TUI Roadmap

### Phase 1: Stabilize the Existing TUI

- Unify config loading with CLI
- Support the full shared provider list
- Improve in-app help, loading state, and command feedback
- Prevent concurrent prompt submission and preserve transcript state

### Phase 2: Add Product-Level Navigation

- Session list and session switching
- Persistent transcript history
- Settings panels for provider, model, and temperature
- Search and export inside the terminal interface

### Phase 3: Match Web Workflows

- Agent picker and agent-scoped sessions
- Tool visibility and execution status panes
- Skill enablement and activation traces
- Workspace-aware shell command flows instead of a virtual file manager
- MCP connection status and tool inventory

## Immediate Next Steps

- Done: fix CLI/TUI config resolution so `config set apiKey/model/provider/...` is actually used
- Done: align CLI chat built-in commands with documented behavior
- Done: expose a provider listing command in CLI
- Next: add shared workspace-directory support for CLI and TUI
- Next: move terminal file workflows toward Shell Exec reuse instead of VFS
- Next: design a session persistence format shared by CLI and TUI
- Next: define a terminal navigation model for agents, sessions, tools, and shell workflows
