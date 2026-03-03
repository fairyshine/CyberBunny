import { useState, useEffect, useCallback, useRef } from 'react';
import { fileSystem, FileSystemEntry } from '../services/filesystem';
import { Folder, File as FileIcon, FileText, Trash2, Upload, Download, RefreshCw, X, Check } from './icons';

interface FileManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FileManager({ isOpen, onClose }: FileManagerProps) {
  const [files, setFiles] = useState<FileSystemEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('/workspace');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileSystemEntry | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [createType, setCreateType] = useState<'folder' | 'file'>('folder');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      await fileSystem.initialize();
      const entries = await fileSystem.readdir(currentPath);
      setFiles(entries.sort((a, b) => {
        // 文件夹排在前面
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        // 然后按名称排序
        return a.name.localeCompare(b.name);
      }));
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  const handleUpload = async (file: File) => {
    try {
      const path = `${currentPath}/${file.name}`;
      await fileSystem.writeFile(path, file);
      await loadFiles();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('上传失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    event.target.value = '';
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    for (const file of files) {
      await handleUpload(file);
    }
  };

  const handleDelete = async (entry: FileSystemEntry) => {
    if (!confirm(`确定要删除 ${entry.name} 吗？`)) return;
    try {
      await fileSystem.rm(entry.path, entry.type === 'directory');
      await loadFiles();
      if (selectedFile?.path === entry.path) setSelectedFile(null);
    } catch (error) {
      alert('删除失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDownload = async (entry: FileSystemEntry) => {
    if (entry.type !== 'file') return;
    const blob = await fileSystem.readFile(entry.path);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateFolder = () => {
    setCreateType('folder');
    setNewItemName('');
    setIsCreating(true);
    setTimeout(() => newItemInputRef.current?.focus(), 100);
  };

  const handleCreateFile = () => {
    setCreateType('file');
    setNewItemName('');
    setIsCreating(true);
    setTimeout(() => newItemInputRef.current?.focus(), 100);
  };

  const submitCreate = async () => {
    const name = newItemName.trim();
    if (!name) {
      setIsCreating(false);
      return;
    }
    
    try {
      const fullPath = `${currentPath}/${name}`;
      if (createType === 'folder') {
        await fileSystem.mkdir(fullPath);
      } else {
        await fileSystem.writeFile(fullPath, '');
      }
      setIsCreating(false);
      setNewItemName('');
      await loadFiles();
    } catch (error) {
      console.error('Failed to create:', error);
      alert('创建失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewItemName('');
  };

  const handleEntryClick = (entry: FileSystemEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
    } else {
      setSelectedFile(entry);
    }
  };

  const navigateUp = () => {
    if (currentPath === '/workspace') return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/workspace';
    setCurrentPath(parent);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl h-[600px] bg-[var(--bg-primary)] rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">📁 文件沙盒</h2>
            <button onClick={navigateUp} disabled={currentPath === '/workspace'} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50">
              {currentPath}
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <Upload className="w-4 h-4" />上传
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            <button onClick={handleCreateFolder} className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)]">
              <Folder className="w-4 h-4" />新建文件夹
            </button>
            <button onClick={handleCreateFile} className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)]">
              <FileText className="w-4 h-4" />新建文件
            </button>
          </div>
          <button onClick={loadFiles} disabled={isLoading} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className={`flex-1 overflow-y-auto p-4 ${dragOver ? 'bg-blue-50 border-2 border-dashed' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">加载中...</div>
          ) : (
            <div className="space-y-1">
              {isCreating && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  {createType === 'folder' ? <Folder className="w-8 h-8 text-yellow-500" /> : <FileIcon className="w-8 h-8 text-blue-500" />}
                  <div className="flex-1">
                    <input
                      ref={newItemInputRef}
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCreate();
                        if (e.key === 'Escape') cancelCreate();
                      }}
                      placeholder={createType === 'folder' ? '文件夹名称' : '文件名'}
                      className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={submitCreate} className="p-2 hover:bg-green-100 text-green-600 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelCreate} className="p-2 hover:bg-red-100 text-red-500 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {files.length === 0 && !isCreating ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
                  <Folder className="w-16 h-16 mb-4 opacity-50" />
                  <p>文件夹为空，拖拽文件到此处上传</p>
                </div>
              ) : (
                files.map((entry) => (
                  <div key={entry.path} onClick={() => handleEntryClick(entry)} 
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer ${selectedFile?.path === entry.path ? 'bg-blue-50 border border-blue-200' : 'hover:bg-[var(--bg-secondary)]'}`}>
                    <div className="flex items-center gap-3">
                      {entry.type === 'directory' ? <Folder className="w-8 h-8 text-yellow-500" /> : <FileIcon className="w-8 h-8 text-blue-500" />}
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{formatSize(entry.size)} • {new Date(entry.modifiedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {entry.type === 'file' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(entry); }} className="p-2 hover:bg-gray-100 rounded-lg">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(entry); }} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
