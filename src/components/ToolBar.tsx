import { useSettingsStore } from '../stores/settings';
import { toolRegistry } from '../services/tools/registry';
import { ITool } from '../services/tools/base';

export default function ToolBar() {
  const { enabledTools, toggleTool } = useSettingsStore();
  const allTools = toolRegistry.getAll();

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex-wrap">
      <span className="text-xs text-[var(--text-secondary)] mr-2 font-medium">工具:</span>
      {allTools.map((tool: ITool) => (
        <button
          key={tool.metadata.id}
          onClick={() => toggleTool(tool.metadata.id)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all ${
            enabledTools.includes(tool.metadata.id)
              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)] opacity-60'
          }`}
          title={tool.metadata.description}
        >
          <span className="text-sm">{tool.metadata.icon}</span>
          <span>{tool.metadata.name}</span>
        </button>
      ))}
    </div>
  );
}
