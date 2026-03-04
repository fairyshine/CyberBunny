// 重新设计的 Skill 管理组件
// 支持查看/编辑 SKILL.md 文件，改进添加源的方式

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Plus, Trash2, RefreshCw, Eye, Edit, FolderOpen, Code, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { MarkdownSkill } from '../../services/skills/markdown-skill';

export function SkillManager() {
  const { t } = useTranslation();
  const { sources, loading, error, addSource, removeSource, toggleSource, reloadSource } = useSkillStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [addMode, setAddMode] = useState<'file' | 'url' | 'create'>('file');
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

  // 查看 Skill 详情
  const handleViewSkill = async (skill: any) => {
    setSelectedSkill(skill);

    // 如果是 MarkdownSkill，尝试读取完整内容
    if (skill instanceof MarkdownSkill) {
      // 对于内置 skills，显示已有的指令内容
      setEditContent(skill['instructions'] || '');
    }

    setIsViewDialogOpen(true);
  };

  // 编辑 Skill
  const handleEditSkill = async (skill: any) => {
    setSelectedSkill(skill);

    if (skill instanceof MarkdownSkill) {
      setEditContent(skill['instructions'] || '');
    }

    setIsEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedSkill) return;

    try {
      // 对于文件系统中的 skills，保存到文件
      if (selectedSkill instanceof MarkdownSkill) {
        const skillPath = selectedSkill.getSkillPath();

        // 如果是用户自定义的 skill（不是 builtin），保存到文件系统
        if (!skillPath.startsWith('builtin/')) {
          const fullPath = `/workspace/skills/${skillPath}/SKILL.md`;
          await fileSystem.writeFile(fullPath, editContent);

          // 重新加载 skill
          const source = sources.find(s =>
            skillRegistry.getSkillsBySource(s).some(sk => sk.metadata.id === selectedSkill.metadata.id)
          );
          if (source) {
            await reloadSource(source.id);
          }
        }
      }

      setIsEditDialogOpen(false);
      setSelectedSkill(null);
    } catch (error) {
      console.error('Failed to save skill:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 从文件系统浏览 SKILL.md
  const handleBrowseFile = async () => {
    try {
      // 列出 /workspace/skills 目录
      const skillsDir = '/workspace/skills';
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
        alert('未找到任何 SKILL.md 文件。请在 /workspace/skills/ 目录下创建 skill 文件夹。');
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
      console.error('Failed to browse files:', error);
      alert('浏览文件失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 添加 Skill 源
  const handleAddSkill = async () => {
    try {
      if (addMode === 'file') {
        // 从文件系统添加
        if (!newSkillData.name || !newSkillData.path) {
          alert('请填写 Skill 名称和路径');
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
          alert('请填写 Skill 名称和 URL');
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
          alert('请填写 Skill 名称');
          return;
        }

        // 保存到文件系统
        const skillPath = `/workspace/skills/${newSkillData.name}`;
        await fileSystem.mkdir(skillPath);
        await fileSystem.writeFile(`${skillPath}/SKILL.md`, newSkillData.content);

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
      alert('添加失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 移除 Skill 源
  const handleRemoveSource = async (sourceId: string) => {
    if (!confirm('确定要移除这个 Skill 源吗？')) return;
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
          <h3 className="text-lg font-semibold">{t('settings.skills.installed')}</h3>
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
            <p>{t('settings.skills.noSkills')}</p>
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

      {/* 查看 Skill 对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getSkillIcon(selectedSkill?.metadata.icon)}</span>
              {selectedSkill?.metadata.name}
              {selectedSkill?.metadata.version && (
                <Badge variant="outline">v{selectedSkill.metadata.version}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {/* 描述 */}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedSkill?.metadata.description}
                </p>
              </div>

              {/* 元数据 */}
              {(selectedSkill?.metadata.author || selectedSkill?.metadata.tags) && (
                <div>
                  <h4 className="font-semibold mb-2">Metadata</h4>
                  <div className="space-y-1 text-sm">
                    {selectedSkill?.metadata.author && (
                      <div>
                        <span className="text-muted-foreground">Author:</span>{' '}
                        {selectedSkill.metadata.author}
                      </div>
                    )}
                    {selectedSkill?.metadata.tags && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Tags:</span>
                        <div className="flex gap-1 flex-wrap">
                          {selectedSkill.metadata.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 需要的工具 */}
              {selectedSkill?.metadata.requiredTools && selectedSkill.metadata.requiredTools.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Required Tools</h4>
                  <div className="flex gap-1 flex-wrap">
                    {selectedSkill.metadata.requiredTools.map((tool: string) => (
                      <Badge key={tool} variant="secondary">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* SKILL.md 内容 */}
              {editContent && (
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {editContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑 Skill 对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Skill: {selectedSkill?.metadata.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Edit the SKILL.md content below. Changes will be saved to the file system.
              </AlertDescription>
            </Alert>

            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="SKILL.md content..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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
              <TabsTrigger value="file" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                From File
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

            <TabsContent value="file" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Load a skill from your file system. The skill directory must contain a SKILL.md file.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="file-name">Skill Name</Label>
                <Input
                  id="file-name"
                  value={newSkillData.name}
                  onChange={(e) => setNewSkillData({ ...newSkillData, name: e.target.value })}
                  placeholder="my-custom-skill"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-path">Skill Directory Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="file-path"
                    value={newSkillData.path}
                    onChange={(e) => setNewSkillData({ ...newSkillData, path: e.target.value })}
                    placeholder="/workspace/skills/my-skill"
                  />
                  <Button
                    variant="outline"
                    onClick={handleBrowseFile}
                    className="gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Path to the directory containing SKILL.md
                </p>
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Load a skill from a remote URL. The URL should point to a SKILL.md file or a JSON manifest.
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
                  URL to SKILL.md or skill manifest
                </p>
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Create a new skill from scratch. Edit the template below to define your skill.
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
