// 工具管理组件
// 用于管理工具源和查看已加载的工具

import { useState } from 'react';
import { useToolStore } from '../stores/tools';
import { toolRegistry } from '../services/tools/registry';
import { ToolSource } from '../services/tools/base';

export function ToolManager() {
  const { sources, loading, error, addSource, removeSource, toggleSource, reloadSource } = useToolStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState<Partial<ToolSource>>({
    type: 'file',
    name: '',
    source: '',
  });

  const allTools = toolRegistry.getAll();

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.source || !newSource.type) {
      alert('请填写完整信息');
      return;
    }

    try {
      await addSource(newSource as Omit<ToolSource, 'id'>);
      setShowAddDialog(false);
      setNewSource({ type: 'file', name: '', source: '' });
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <h2 className="text-lg font-semibold">工具管理</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          添加工具源
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* 工具源列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">工具源 ({sources.length})</h3>
          <div className="space-y-2">
            {sources.map(source => (
              <div
                key={source.id}
                className="bg-white p-4 rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{source.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                        {source.type}
                      </span>
                      {source.enabled && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          已启用
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {source.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleSource(source.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {source.enabled ? '禁用' : '启用'}
                    </button>
                    {source.enabled && (
                      <button
                        onClick={() => reloadSource(source.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        重载
                      </button>
                    )}
                    {source.type !== 'builtin' && (
                      <button
                        onClick={() => removeSource(source.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 已加载工具列表 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            已加载工具 ({allTools.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allTools.map(tool => (
              <div
                key={tool.metadata.id}
                className="bg-white p-3 rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-2">
                  {tool.metadata.icon && (
                    <span className="text-2xl">{tool.metadata.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {tool.metadata.name}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {tool.metadata.description}
                    </div>
                    {tool.metadata.tags && tool.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tool.metadata.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 text-xs bg-gray-100 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 添加工具源对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">添加工具源</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  类型
                </label>
                <select
                  value={newSource.type}
                  onChange={e => setNewSource({ ...newSource, type: e.target.value as ToolSource['type'] })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="file">本地文件 (.ts)</option>
                  <option value="http">HTTP URL</option>
                  <option value="mcp">MCP 服务器</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={e => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="例如: 我的自定义工具"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newSource.type === 'file' && '文件路径'}
                  {newSource.type === 'http' && 'URL'}
                  {newSource.type === 'mcp' && 'MCP 服务器 ID'}
                </label>
                <input
                  type="text"
                  value={newSource.source}
                  onChange={e => setNewSource({ ...newSource, source: e.target.value })}
                  placeholder={
                    newSource.type === 'file' ? '/tools/my-tool.ts' :
                    newSource.type === 'http' ? 'https://example.com/tool.js' :
                    'server-id'
                  }
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {newSource.type === 'file' && '相对于项目根目录的路径'}
                  {newSource.type === 'http' && '工具定义的 HTTP URL'}
                  {newSource.type === 'mcp' && '已配置的 MCP 服务器 ID'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddSource}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
