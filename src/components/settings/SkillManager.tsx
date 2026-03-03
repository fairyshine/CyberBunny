// Skill 管理组件

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkillStore, useSkillRegistrySync } from '../../stores/skills';
import { skillRegistry } from '../../services/skills/registry';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

export function SkillManager() {
  const { t } = useTranslation();
  const { sources, loading, error, addSource, removeSource, toggleSource, reloadSource } = useSkillStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState<{
    type: 'http' | 'file' | 'code';
    name: string;
    source: string;
    enabled: boolean;
  }>({
    type: 'http',
    name: '',
    source: '',
    enabled: true,
  });

  // 同步 skill registry 变更
  useSkillRegistrySync();

  const skills = skillRegistry.getAll();

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.source) return;

    try {
      await addSource(newSource);
      setIsAddDialogOpen(false);
      setNewSource({ type: 'http', name: '', source: '', enabled: true });
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

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

      {/* 已安装的 Skills */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('settings.skills.installed')}</h3>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('settings.skills.addSource')}
          </Button>
        </div>

        <div className="space-y-3">
          {skills.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <div className="text-4xl mb-2">📦</div>
              <p>{t('settings.skills.noSkills')}</p>
            </Card>
          ) : (
            skills.map((skill) => {
              const source = sources.find(s =>
                skillRegistry.getSkillsBySource(s).some(sk => sk.metadata.id === skill.metadata.id)
              );

              return (
                <Card key={skill.metadata.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Skill 图标 */}
                    <div className="text-3xl flex-shrink-0">
                      {getSkillIcon(skill.metadata.icon)}
                    </div>

                    {/* Skill 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{skill.metadata.name}</h4>
                        {skill.metadata.version && (
                          <Badge variant="outline" className="text-xs">
                            v{skill.metadata.version}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {skill.metadata.description}
                      </p>

                      {/* 需要的工具 */}
                      {skill.metadata.requiredTools && skill.metadata.requiredTools.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t('settings.skills.requires')}:</span>
                          <div className="flex gap-1 flex-wrap">
                            {skill.metadata.requiredTools.map((tool) => (
                              <Badge key={tool} variant="secondary" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 标签 */}
                      {skill.metadata.tags && skill.metadata.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {skill.metadata.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {source && source.type !== 'builtin' && (
                        <>
                          <Switch
                            checked={source.enabled}
                            onCheckedChange={() => toggleSource(source.id)}
                            disabled={loading}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reloadSource(source.id)}
                            disabled={loading || !source.enabled}
                            title={t('settings.skills.reload')}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSource(source.id)}
                            disabled={loading}
                            title={t('settings.skills.remove')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {source?.type === 'builtin' && (
                        <Badge variant="secondary" className="text-xs">
                          {t('settings.skills.builtin')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Skill 源列表 */}
      {sources.filter(s => s.type !== 'builtin').length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('settings.skills.sources')}</h3>
          <div className="space-y-2">
            {sources
              .filter(s => s.type !== 'builtin')
              .map((source) => (
                <Card key={source.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{source.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {source.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {source.source}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={() => toggleSource(source.id)}
                        disabled={loading}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSource(source.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* 添加 Skill 源对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.skills.addSource')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-type">{t('settings.skills.sourceType')}</Label>
              <Select
                value={newSource.type}
                onValueChange={(value: any) => setNewSource({ ...newSource, type: value })}
              >
                <SelectTrigger id="source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP URL</SelectItem>
                  <SelectItem value="file">{t('settings.skills.file')}</SelectItem>
                  <SelectItem value="code">{t('settings.skills.code')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-name">{t('settings.skills.sourceName')}</Label>
              <Input
                id="source-name"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder={t('settings.skills.sourceNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">
                {newSource.type === 'http' ? 'URL' :
                 newSource.type === 'file' ? t('settings.skills.filePath') :
                 newSource.type === 'code' ? t('settings.skills.code') : 'Source'}
              </Label>
              {newSource.type === 'code' ? (
                <Textarea
                  id="source-url"
                  value={newSource.source}
                  onChange={(e) => setNewSource({ ...newSource, source: e.target.value })}
                  placeholder={t('settings.skills.codePlaceholder')}
                  rows={6}
                  className="font-mono text-sm"
                />
              ) : (
                <Input
                  id="source-url"
                  value={newSource.source}
                  onChange={(e) => setNewSource({ ...newSource, source: e.target.value })}
                  placeholder={
                    newSource.type === 'http'
                      ? 'https://example.com/skills.json'
                      : '/workspace/my-skill.js'
                  }
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={!newSource.name || !newSource.source || loading}
            >
              {loading ? t('common.loading') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
