import { useState } from 'react';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import { X, Check, Plus, Trash } from './icons';
import { toolRegistry } from '../services/tools/registry';
import { ToolManager } from './ToolManager';
import ConnectionTest from './ConnectionTest';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'llm' | 'test' | 'tools' | 'toolmanager' | 'mcp' | 'general'>('llm');
  const { llmConfig, setLLMConfig } = useSessionStore();
  const {
    initializePython,
    setInitializePython,
    enabledTools,
    toggleTool,
    mcpServers,
    addMCPServer,
    removeMCPServer
  } = useSettingsStore();

  const [newMCPServer, setNewMCPServer] = useState({ name: '', url: '' });

  if (!isOpen) return null;

  const tabs = [
    { id: 'llm' as const, label: 'LLM 配置' },
    { id: 'test' as const, label: '连接测试' },
    { id: 'tools' as const, label: '工具开关' },
    { id: 'toolmanager' as const, label: '工具管理' },
    { id: 'mcp' as const, label: 'MCP 服务器' },
    { id: 'general' as const, label: '通用' },
  ];

  const handleAddMCPServer = () => {
    if (newMCPServer.name.trim() && newMCPServer.url.trim()) {
      addMCPServer({
        name: newMCPServer.name.trim(),
        url: newMCPServer.url.trim(),
      });
      setNewMCPServer({ name: '', url: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签栏 */}
        <div className="flex border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'llm' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">提供商</label>
                <select
                  value={llmConfig.provider}
                  onChange={(e) => setLLMConfig({ provider: e.target.value as any })}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input
                  type="password"
                  value={llmConfig.apiKey}
                  onChange={(e) => setLLMConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">模型</label>
                <input
                  type="text"
                  value={llmConfig.model}
                  onChange={(e) => setLLMConfig({ model: e.target.value })}
                  placeholder="gpt-4"
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                />
              </div>

              {llmConfig.provider === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Base URL</label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl || ''}
                    onChange={(e) => setLLMConfig({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">温度 ({llmConfig.temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={llmConfig.temperature}
                    onChange={(e) => setLLMConfig({ temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">最大 Token</label>
                  <input
                    type="number"
                    value={llmConfig.maxTokens}
                    onChange={(e) => setLLMConfig({ maxTokens: parseInt(e.target.value) })}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <ConnectionTest />
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                启用或禁用可用的工具。工具可以在对话中通过命令或自动触发。
              </p>

              <div className="space-y-2">
                {toolRegistry.getAll().map((tool) => (
                  <div
                    key={tool.metadata.id}
                    className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tool.metadata.icon}</span>
                      <div>
                        <p className="font-medium">{tool.metadata.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{tool.metadata.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTool(tool.metadata.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        enabledTools.includes(tool.metadata.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {enabledTools.includes(tool.metadata.id) ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'toolmanager' && (
            <div className="-m-6 h-[calc(80vh-200px)]">
              <ToolManager />
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                配置 MCP (Model Context Protocol) 服务器以扩展 Agent 能力。
              </p>

              <div className="space-y-2">
                {mcpServers.map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{server.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{server.url}</p>
                    </div>
                    <button
                      onClick={() => removeMCPServer(server.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-sm font-medium mb-3">添加新服务器</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMCPServer.name}
                    onChange={(e) => setNewMCPServer({ ...newMCPServer, name: e.target.value })}
                    placeholder="服务器名称"
                    className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                  />
                  <input
                    type="text"
                    value={newMCPServer.url}
                    onChange={(e) => setNewMCPServer({ ...newMCPServer, url: e.target.value })}
                    placeholder="ws://localhost:3000"
                    className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]"
                  />
                  <button
                    onClick={handleAddMCPServer}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg">
                <div>
                  <p className="font-medium">启动时预加载 Python 环境</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    启动时自动初始化 Pyodide，加快首次执行速度
                  </p>
                </div>
                <button
                  onClick={() => setInitializePython(!initializePython)}
                  className={`p-2 rounded-lg transition-colors ${
                    initializePython
                      ? 'bg-green-500 text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {initializePython ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
              </div>

              <div className="p-3 border border-[var(--border)] rounded-lg">
                <p className="font-medium">关于 CyberBunny</p>
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  这是一个浏览器端的 AI Agent，支持 MCP 协议、技能系统和 Python 代码执行。
                  <br /><br />
                  版本: 0.1.0
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
