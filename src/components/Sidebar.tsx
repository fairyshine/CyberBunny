import { useState } from 'react';
import { useSessionStore } from '../stores/session';
import { Trash, ChevronLeft, ChevronRight, MessageSquare, Folder } from './icons';
import FileTree from './FileTree';

type TabType = 'sessions' | 'files';

interface SidebarProps {
  selectedFilePath?: string;
  onSelectFile?: (path: string) => void;
}

export default function Sidebar({ selectedFilePath, onSelectFile }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const { sessions, currentSession, setCurrentSession, deleteSession } = useSessionStore();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col items-center">
        <div className="h-14 flex items-center justify-center border-b border-[var(--border)] w-full">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            title="展开侧边栏"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col items-center py-2 gap-1">
          <button
            onClick={() => {
              setActiveTab('sessions');
              setIsCollapsed(false);
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'sessions' 
                ? 'bg-blue-500/10 text-blue-600' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            title="会话"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setActiveTab('files');
              setIsCollapsed(false);
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'files' 
                ? 'bg-blue-500/10 text-blue-600' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
            title="文件"
          >
            <Folder className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-72 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col">
      {/* 顶部标题和收起按钮 */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-3">
        <span className="font-medium text-[var(--text-primary)]">
          {activeTab === 'sessions' ? '🗨️ 会话' : '📁 文件'}
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          title="收起侧边栏"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 标签页切换 */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
            activeTab === 'sessions'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          会话
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Folder className="w-4 h-4" />
          文件
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sessions' ? (
          <div className="h-full overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                暂无会话
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setCurrentSession(session.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{session.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatDate(session.updatedAt)}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="删除会话"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <FileTree 
            selectedPath={selectedFilePath}
            onSelectFile={onSelectFile}
          />
        )}
      </div>
    </aside>
  );
}
