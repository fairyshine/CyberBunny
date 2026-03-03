import { useEffect, useState } from 'react';
import ChatContainer from './components/ChatContainer';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import FileEditor from './components/FileEditor';
import { useSessionStore } from './stores/session';
import { useSettingsStore } from './stores/settings';
import { pythonExecutor } from './services/python/executor';
import { fileSystem } from './services/filesystem';

function App() {
  const { currentSession, createSession } = useSessionStore();
  const { initializePython } = useSettingsStore();
  const [showWelcome, setShowWelcome] = useState(!currentSession);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

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
      setFileContent(content);
    }
  };

  if (showWelcome) {
    return (
      <div className="h-screen flex flex-col bg-[var(--bg-secondary)]">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar onSelectFile={handleSelectFile} />
          <WelcomeScreen onStart={handleStart} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-secondary)]">
      {/* 头部 */}
      <Header />
      
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar 
          selectedFilePath={selectedFile || undefined}
          onSelectFile={handleSelectFile}
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
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
              <p>创建一个新会话开始聊天，或在侧边栏选择一个文件</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
