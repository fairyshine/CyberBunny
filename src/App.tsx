import { useEffect, useState } from 'react';
import ChatContainer from './components/chat/ChatContainer';
import Sidebar from './components/sidebar/Sidebar';
import Header from './components/layout/Header';
import WelcomeScreen from './components/layout/WelcomeScreen';
import FileEditor from './components/sidebar/FileEditor';
import ConsolePanel from './components/layout/ConsolePanel';
import { useSessionStore, selectCurrentSession } from './stores/session';
import { useSettingsStore } from './stores/settings';
import { pythonExecutor } from './services/python/executor';
import { fileSystem } from './services/filesystem';
import { logSystem } from './services/console/logger';
import { applyTheme, setupSystemThemeListener } from './utils/theme';

function App() {
  const currentSession = useSessionStore(selectCurrentSession);
  const { createSession } = useSessionStore();
  const { initializePython, theme } = useSettingsStore();
  const [showWelcome, setShowWelcome] = useState(!currentSession);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showConsole, setShowConsole] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Apply theme on mount
  useEffect(() => {
    // Initialize theme on mount
    applyTheme(theme);

    // Listen for system theme changes if theme is 'system'
    if (theme === 'system') {
      const cleanup = setupSystemThemeListener((systemTheme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
      });
      return cleanup;
    }
  }, [theme]);

  // 启动日志（只执行一次）
  useEffect(() => {
    logSystem('info', 'CyberBunny 启动');
  }, []);

  // 初始化
  useEffect(() => {
    // 如果没有会话，显示欢迎页
    if (!currentSession) {
      setShowWelcome(true);
    }

    // 预加载 Python 环境
    if (initializePython) {
      pythonExecutor.initialize().catch(console.error);
    }
  }, [currentSession, initializePython]);

  // 键盘快捷键: Ctrl+` 切换控制台
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setShowConsole(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 加载文件内容
  useEffect(() => {
    if (selectedFile) {
      fileSystem.readFileText(selectedFile).then(content => {
        setFileContent(content || '');
      });
    }
  }, [selectedFile]);

  const handleStart = () => {
    createSession('新会话');
    setShowWelcome(false);
  };

  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
  };

  const handleCloseFile = () => {
    setSelectedFile(null);
    setFileContent('');
  };

  const handleSaveFile = async (content: string) => {
    if (selectedFile) {
      await fileSystem.writeFile(selectedFile, content);
      // 保存后重新从文件系统读取，确保一致性
      const savedContent = await fileSystem.readFileText(selectedFile);
      setFileContent(savedContent || '');
    }
  };

  if (showWelcome) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header
          onToggleConsole={() => setShowConsole(v => !v)}
          onToggleSidebar={() => setIsSidebarOpen(v => !v)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <Sidebar
              onSelectFile={handleSelectFile}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
            <WelcomeScreen onStart={handleStart} />
          </div>
          <ConsolePanel isOpen={showConsole} onClose={() => setShowConsole(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 头部 */}
      <Header
        onToggleConsole={() => setShowConsole(v => !v)}
        onToggleSidebar={() => setIsSidebarOpen(v => !v)}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* 侧边栏 */}
          <Sidebar
            selectedFilePath={selectedFile || undefined}
            onSelectFile={handleSelectFile}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* 主内容区 - 聊天或文件编辑器 */}
          <main className="flex-1 flex flex-col min-w-0">
            {selectedFile ? (
              <FileEditor
                path={selectedFile}
                content={fileContent}
                onClose={handleCloseFile}
                onSave={handleSaveFile}
              />
            ) : currentSession ? (
              <ChatContainer sessionId={currentSession.id} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>创建一个新会话开始聊天，或在侧边栏选择一个文件</p>
              </div>
            )}
          </main>
        </div>

        {/* 控制台面板 */}
        <ConsolePanel isOpen={showConsole} onClose={() => setShowConsole(false)} />
      </div>
    </div>
  );
}

export default App;
