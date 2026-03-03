import { useState } from 'react';
import { Settings, Plus } from './icons';
import { useSessionStore } from '../stores/session';
import SettingsModal from './SettingsModal';

export default function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { createSession } = useSessionStore();

  return (
    <>
      <header className="h-14 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
            🐰
          </div>
          <h1 className="font-semibold text-[var(--text-primary)]">CyberBunny</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => createSession('新会话')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            新会话
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
