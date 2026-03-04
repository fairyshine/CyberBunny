// 重新设计的 Skill 管理组件
// 以文件夹为单位管理 Skills，支持完整的文件结构编辑

import { useState } from 'react';
import { useSkillStore, useSkillRegistrySync } from '../../stores/skills';
import { skillRegistry } from '../../services/skills/registry';
import { fileSystem } from '../../services/filesystem';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, Trash2, RefreshCw, Eye, Edit, FolderOpen, Code, Globe, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { MarkdownSkill } from '../../services/skills/markdown-skill';
import { SkillFolderViewer } from './SkillFolderViewer';

export function SkillManager() {
  const { sources, loading, error, addSource, removeSource, toggleSource, reloadSource } = useSkillStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [editContent, setEditContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addMode, setAddMode] = useState<'folder' | 'url' | 'create'>('folder');
  const [newSkillData, setNewSkillData] = useState({
    name: '',
    path: '',
    url: '',
    content: `---
name: my-skill
description: A custom skill that does something useful
license: MIT
metadata:
  author: Your Name
  version: "1.0"
---

# My Skill

## When to use this skill
Describe when this skill should be used...

## How it works
Explain the workflow...

## Examples
Provide examples...
`,
  });

  // 同步 skill registry 变更
  useSkillRegistrySync();

  const skills = skillRegistry.getAll();

  // 获取 Skill 的文件夹路径
  const getSkillFolderPath = (skill: any): string | null => {
    if (skill instanceof MarkdownSkill) {
      const skillPath = skill.getSkillPath();

      // 对于内置 skills，返回 null（不支持文件树浏览）
      if (skillPath.startsWith('builtin/')) {
        return null;
      }

      // 对于用户自定义 skills
      return `/workspace/skills/${skill.metadata.id}`;
    }
    return null;
  };

  // 检查是否是内置 skill
  const isBuiltinSkill = (skill: any): boolean => {
    if (skill instanceof MarkdownSkill) {
      return skill.getSkillPath().startsWith('builtin/');
    }
    return false;
  };

  // 查看 Skill 文件夹
  const handleViewSkill = async (skill: any) => {
    setSelectedSkill(skill);

    // 对于内置 skills，直接显示 SKILL.md 内容
    if (isBuiltinSkill(skill) && skill instanceof MarkdownSkill) {
      setSelectedFilePath('SKILL.md');
      setEditContent(skill.getRawInstructions());
    } else {
      const folderPath = getSkillFolderPath(skill);
      if (folderPath) {
        // 默认选择 SKILL.md
        const skillMdPath = `${folderPath}/SKILL.md`;
        setSelectedFilePath(skillMdPath);

        try {
          const content = await fileSystem.readFileText(skillMdPath);
          setEditContent(content || '');
        } catch (error) {
          console.error('Failed to read SKILL.md:', error);
          setEditContent('');
        }
      }
    }

    setIsViewDialogOpen(true);
  };

  // 编辑 Skill 文件夹
  const handleEditSkill = async (skill: any) => {
    setSelectedSkill(skill);

    // 对于内置 skills，直接显示 SKILL.md 内容
    if (isBuiltinSkill(skill) && skill instanceof MarkdownSkill) {
      setSelectedFilePath('SKILL.md');
      setEditContent(skill.getRawInstructions());
    } else {
      const folderPath = getSkillFolderPath(skill);
      if (folderPath) {
        // 默认选择 SKILL.md
        const skillMdPath = `${folderPath}/SKILL.md`;
        setSelectedFilePath(skillMdPath);

        try {
          const content = await fileSystem.readFileText(skillMdPath);
          setEditContent(content || '');
        } catch (error) {
          console.error('Failed to read SKILL.md:', error);
          setEditContent('');
        }
      }
    }

    setHasUnsavedChanges(false);
    setIsEditDialogOpen(true);
  };

  // 选择文件
  const handleFileSelect = async (filePath: string) => {
    // 如果有未保存的更改，提示用户
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }

    setSelectedFilePath(filePath);

    try {
      const content = await fileSystem.readFileText(filePath);
      setEditContent(content || '');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to read file:', error);
      setEditContent('');
    }
  };

  // 保存当前文件
  const handleSaveFile = async () => {
    if (!selectedFilePath) return;

    try {
      await fileSystem.writeFile(selectedFilePath, editContent);
      setHasUnsavedChanges(false);

      // 如果保存的是 SKILL.md，重新加载 skill
      if (selectedFilePath.endsWith('SKILL.md')) {
        const source = sources.find(s =>
          skillRegistry.getSkillsBySource(s).some(sk => sk.metadata.id === selectedSkill?.metadata.id)
        );
        if (source) {
          await reloadSource(source.id);
        }
      }

      alert('File saved successfully!');
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 创建新文件
  const handleCreateFile = async (fileName: string) => {
    if (!selectedSkill) return;

    const folderPath = getSkillFolderPath(selectedSkill);
    if (!folderPath) return;

    const newFilePath = `${folderPath}/${fileName}`;

    try {
      await fileSystem.writeFile(newFilePath, '');
      alert('File created successfully!');
      // 刷新文件树
      setIsEditDialogOpen(false);
      setTimeout(() => setIsEditDialogOpen(true), 100);
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 删除文件
  const handleDeleteFile = async (filePath: string) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) return;

    try {
      // 使用文件系统的删除方法
      const content = await fileSystem.readFileText(filePath);
      if (content !== null) {
        // 文件存在，通过写入空内容来"删除"（IndexedDB 实现）
        // 实际应该有专门的删除方法
        alert('File deletion not fully implemented yet');
      }

      // 如果删除的是当前选中的文件，清空编辑器
      if (filePath === selectedFilePath) {
        setSelectedFilePath('');
        setEditContent('');
      }

      // 刷新文件树
      setIsEditDialogOpen(false);
      setTimeout(() => setIsEditDialogOpen(true), 100);
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 避免未使用警告
  void handleCreateFile;
  void handleDeleteFile;

  // 浏览文件夹
  const handleBrowseFolder = async () => {
    try {
      const skillsDir = '/workspace/skills';

      // 确保目录存在
      try {
        await fileSystem.mkdir(skillsDir);
      } catch {
        // 目录已存在
      }

      const entries = await fileSystem.readdir(skillsDir);

      // 查找包含 SKILL.md 的目录
      const skillDirs: string[] = [];
      for (const entry of entries) {
        if (entry.type === 'directory') {
          const skillMdPath = `${skillsDir}/${entry.name}/SKILL.md`;
          const exists = await fileSystem.exists(skillMdPath);
          if (exists) {
            skillDirs.push(entry.name);
          }
        }
      }

      if (skillDirs.length === 0) {
        alert('No skill folders found in /workspace/skills/\n\nPlease create a folder with SKILL.md file first.');
        return;
      }

      // 简单选择第一个（实际应该显示列表让用户选择）
      const selectedDir = skillDirs[0];
      setNewSkillData({
        ...newSkillData,
        name: selectedDir,
        path: `${skillsDir}/${selectedDir}`,
      });
    } catch (error) {
      console.error('Failed to browse folders:', error);
      alert('Failed to browse folders: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 添加 Skill
  const handleAddSkill = async () => {
    try {
      if (addMode === 'folder') {
        // 从文件夹添加
        if (!newSkillData.name || !newSkillData.path) {
          alert('Please fill in skill name and folder path');
          return;
        }

        // 验证文件夹包含 SKILL.md
        const skillMdPath = `${newSkillData.path}/SKILL.md`;
        const exists = await fileSystem.exists(skillMdPath);
        if (!exists) {
          alert('The folder must contain a SKILL.md file');
          return;
        }

        await addSource({
          type: 'file',
          name: newSkillData.name,
          source: newSkillData.path,
          enabled: true,
        });
      } else if (addMode === 'url') {
        // 从 URL 添加
        if (!newSkillData.name || !newSkillData.url) {
          alert('Please fill in skill name and URL');
          return;
        }

        await addSource({
          type: 'http',
          name: newSkillData.name,
          source: newSkillData.url,
          enabled: true,
        });
      } else if (addMode === 'create') {
        // 创建新 Skill
        if (!newSkillData.name) {
          alert('Please fill in skill name');
          return;
        }

        // 创建文件夹结构
        const skillPath = `/workspace/skills/${newSkillData.name}`;
        await fileSystem.mkdir(skillPath);
        await fileSystem.mkdir(`${skillPath}/scripts`);
        await fileSystem.mkdir(`${skillPath}/references`);
        await fileSystem.mkdir(`${skillPath}/assets`);

        // 创建 SKILL.md
        await fileSystem.writeFile(`${skillPath}/SKILL.md`, newSkillData.content);

        // 创建示例文件
        await fileSystem.writeFile(
          `${skillPath}/references/REFERENCE.md`,
          '# Reference Documentation\n\nAdd detailed reference documentation here.\n'
        );

        // 添加为源
        await addSource({
          type: 'file',
          name: newSkillData.name,
          source: skillPath,
          enabled: true,
        });
      }

      setIsAddDialogOpen(false);
      setNewSkillData({
        name: '',
        path: '',
        url: '',
        content: newSkillData.content, // 保留模板
      });
    } catch (error) {
      console.error('Failed to add skill:', error);
      alert('Failed to add skill: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 移除 Skill 源
  const handleRemoveSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this skill source?')) return;
    try {
      await removeSource(sourceId);
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  const getSkillIcon = (icon?: string) => {
    return icon || '⚡';
  };

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Skills</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'} available
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </Button>
      </div>

      {/* Skills 网格布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            <div className="text-4xl mb-2">📦</div>
            <p>No skills installed</p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Skill
            </Button>
          </Card>
        ) : (
          skills.map((skill) => {
            const source = sources.find(s =>
              skillRegistry.getSkillsBySource(s).some(sk => sk.metadata.id === skill.metadata.id)
            );

            return (
              <Card key={skill.metadata.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3">
                  {/* 头部 */}
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">
                      {getSkillIcon(skill.metadata.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{skill.metadata.name}</h4>
                        {skill.metadata.version && (
                          <Badge variant="outline" className="text-xs">
                            v{skill.metadata.version}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {skill.metadata.description}
                      </p>
                    </div>
                  </div>

                  {/* 标签和工具 */}
                  {(skill.metadata.tags || skill.metadata.requiredTools) && (
                    <div className="flex flex-wrap gap-1">
                      {skill.metadata.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {skill.metadata.requiredTools?.slice(0, 3).map((tool) => (
                        <Badge key={tool} variant="secondary" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                      {skill.metadata.requiredTools && skill.metadata.requiredTools.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{skill.metadata.requiredTools.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSkill(skill)}
                        className="h-8 px-2"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {source?.type !== 'builtin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSkill(skill)}
                          className="h-8 px-2"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {source?.type === 'builtin' ? (
                        <Badge variant="secondary" className="text-xs">
                          Built-in
                        </Badge>
                      ) : source ? (
                        <>
                          <Switch
                            checked={source.enabled}
                            onCheckedChange={() => toggleSource(source.id)}
                            disabled={loading}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => reloadSource(source.id)}
                            disabled={loading || !source.enabled}
                            title="Reload"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveSource(source.id)}
                            disabled={loading}
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 查看 Skill 文件夹对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getSkillIcon(selectedSkill?.metadata.icon)}</span>
              {selectedSkill?.metadata.name}
              {selectedSkill?.metadata.version && (
                <Badge variant="outline">v{selectedSkill.metadata.version}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[250px_1fr] gap-4 h-[65vh]">
            {/* 左侧: 文件树 (仅对非内置 skills 显示) */}
            <div className="border rounded-lg overflow-hidden">
              {selectedSkill && !isBuiltinSkill(selectedSkill) && getSkillFolderPath(selectedSkill) ? (
                <SkillFolderViewer
                  skillPath={getSkillFolderPath(selectedSkill)!}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFilePath}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-4 text-center text-sm text-muted-foreground">
                  {isBuiltinSkill(selectedSkill) ? (
                    <div>
                      <p className="font-medium mb-2">Built-in Skill</p>
                      <p>File tree not available for built-in skills</p>
                    </div>
                  ) : (
                    'No file tree available'
                  )}
                </div>
              )}
            </div>

            {/* 右侧: 文件内容预览 */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-muted/50">
                <div className="text-sm font-medium truncate">
                  {selectedFilePath ? selectedFilePath.split('/').pop() : 'Select a file'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {selectedFilePath}
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {editContent ? (
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {editContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a file to view its content
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑 Skill 文件夹对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open && hasUnsavedChanges) {
          if (!confirm('You have unsaved changes. Do you want to discard them?')) {
            return;
          }
        }
        setIsEditDialogOpen(open);
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Edit Skill: {selectedSkill?.metadata.name}</span>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[250px_1fr] gap-4 h-[70vh]">
            {/* 左侧: 文件树 */}
            <div className="border rounded-lg overflow-hidden">
              {selectedSkill && !isBuiltinSkill(selectedSkill) && getSkillFolderPath(selectedSkill) ? (
                <SkillFolderViewer
                  skillPath={getSkillFolderPath(selectedSkill)!}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFilePath}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-4 text-center text-sm text-muted-foreground">
                  No file tree available
                </div>
              )}
            </div>

            {/* 右侧: 文件编辑器 */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {selectedFilePath ? selectedFilePath.split('/').pop() : 'Select a file'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedFilePath}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveFile}
                    disabled={!selectedFilePath || !hasUnsavedChanges}
                    className="h-8"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
              <Textarea
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="flex-1 font-mono text-sm border-0 rounded-none resize-none"
                placeholder="Select a file to edit..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('You have unsaved changes. Do you want to discard them?')) {
                    setIsEditDialogOpen(false);
                  }
                } else {
                  setIsEditDialogOpen(false);
                }
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
            <Button
              onClick={handleSaveFile}
              disabled={!selectedFilePath || !hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加 Skill 对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
          </DialogHeader>

          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="folder" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                From Folder
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Globe className="w-4 h-4" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <Code className="w-4 h-4" />
                Create New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="folder" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Load a skill folder from your file system. The folder must contain a SKILL.md file.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="folder-name">Skill Name</Label>
                <Input
                  id="folder-name"
                  value={newSkillData.name}
                  onChange={(e) => setNewSkillData({ ...newSkillData, name: e.target.value })}
                  placeholder="my-custom-skill"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="folder-path">Skill Folder Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="folder-path"
                    value={newSkillData.path}
                    onChange={(e) => setNewSkillData({ ...newSkillData, path: e.target.value })}
                    placeholder="/workspace/skills/my-skill"
                  />
                  <Button
                    variant="outline"
                    onClick={handleBrowseFolder}
                    className="gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Path to the folder containing SKILL.md
                </p>
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Load a skill from a remote URL. The URL should point to a SKILL.md file or a skill archive.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="url-name">Skill Name</Label>
                <Input
                  id="url-name"
                  value={newSkillData.name}
                  onChange={(e) => setNewSkillData({ ...newSkillData, name: e.target.value })}
                  placeholder="remote-skill"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url-path">Skill URL</Label>
                <Input
                  id="url-path"
                  value={newSkillData.url}
                  onChange={(e) => setNewSkillData({ ...newSkillData, url: e.target.value })}
                  placeholder="https://example.com/skills/my-skill/SKILL.md"
                />
                <p className="text-xs text-muted-foreground">
                  URL to SKILL.md or skill archive
                </p>
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Create a new skill with complete folder structure (SKILL.md, scripts/, references/, assets/).
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="create-name">Skill Name</Label>
                <Input
                  id="create-name"
                  value={newSkillData.name}
                  onChange={(e) => setNewSkillData({ ...newSkillData, name: e.target.value })}
                  placeholder="my-new-skill"
                />
                <p className="text-xs text-muted-foreground">
                  Will create: /workspace/skills/{newSkillData.name || 'my-new-skill'}/
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-content">SKILL.md Content</Label>
                <Textarea
                  id="create-content"
                  value={newSkillData.content}
                  onChange={(e) => setNewSkillData({ ...newSkillData, content: e.target.value })}
                  className="font-mono text-sm min-h-[300px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={loading}>
              {loading ? 'Adding...' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
