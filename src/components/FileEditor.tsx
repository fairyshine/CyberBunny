import { useState, useEffect } from 'react';
import { X, Save, Download } from './icons';

interface FileEditorProps {
  path: string;
  content: string;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}

export default function FileEditor({ path, content, onClose, onSave }: FileEditorProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedContent(content);
    setHasChanges(false);
  }, [content, path]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedContent);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'html': 'html',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'bash',
      'bash': 'bash',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* 工具栏 */}
      <div className="h-12 border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
            <span className="font-medium text-sm text-[var(--text-primary)]">
              {path.split('/').pop()}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {path}
              {hasChanges && <span className="ml-2 text-yellow-500">● 已修改</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Download className="w-4 h-4" />
            下载
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 行号 */}
        <div className="w-12 bg-[var(--bg-tertiary)] border-r border-[var(--border)] py-4 text-right text-xs text-[var(--text-secondary)] select-none">
          {editedContent.split('\n').map((_, i) => (
            <div key={i} className="px-2 leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* 文本区 */}
        <textarea
          value={editedContent}
          onChange={(e) => {
            setEditedContent(e.target.value);
            setHasChanges(e.target.value !== content);
          }}
          className="flex-1 p-4 font-mono text-sm resize-none outline-none bg-[var(--bg-primary)] text-[var(--text-primary)] leading-6"
          spellCheck={false}
          style={{ 
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            tabSize: 2
          }}
        />
      </div>

      {/* 底部状态栏 */}
      <div className="h-8 border-t border-[var(--border)] flex items-center justify-between px-4 bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-4">
          <span>{getLanguage(path).toUpperCase()}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{editedContent.length} 字符</span>
          <span>{editedContent.split('\n').length} 行</span>
        </div>
      </div>
    </div>
  );
}
