import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { ChevronLeft, Brain } from '../icons';
import { fileSystem } from '../../services/filesystem';

const MEMORY_DIR = '/sandbox/.memory';
const MEMORY_FILE = '/sandbox/.memory/MEMORY.md';

interface MemoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = { type: 'list' } | { type: 'diary'; date: string };

export function MemoryViewer({ isOpen, onClose }: MemoryViewerProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>({ type: 'list' });
  const [memoryContent, setMemoryContent] = useState('');
  const [memoryDirty, setMemoryDirty] = useState(false);
  const [memorySaved, setMemorySaved] = useState(false);
  const [diaryList, setDiaryList] = useState<{ name: string; size: number }[]>([]);
  const [diaryContent, setDiaryContent] = useState('');
  const [diaryDirty, setDiaryDirty] = useState(false);
  const [diarySaved, setDiarySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const memoryRef = useRef<HTMLTextAreaElement>(null);
  const diaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setView({ type: 'list' });
      loadListData();
    }
  }, [isOpen]);

  const loadListData = async () => {
    setLoading(true);
    try {
      await fileSystem.initialize();
      if (!(await fileSystem.exists(MEMORY_DIR))) {
        await fileSystem.mkdir(MEMORY_DIR);
      }
      const content = await fileSystem.readFileText(MEMORY_FILE);
      setMemoryContent(content || '');
      setMemoryDirty(false);
      setMemorySaved(false);

      const entries = await fileSystem.readdir(MEMORY_DIR);
      const diaries = entries
        .filter(e => e.type === 'file' && e.name !== 'MEMORY.md' && e.name.endsWith('.md'))
        .sort((a, b) => b.name.localeCompare(a.name));
      setDiaryList(diaries.map(d => ({ name: d.name, size: d.size })));
    } catch {
      setMemoryContent('');
      setDiaryList([]);
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = async () => {
    await fileSystem.initialize();
    if (!(await fileSystem.exists(MEMORY_DIR))) {
      await fileSystem.mkdir(MEMORY_DIR);
    }
    await fileSystem.writeFile(MEMORY_FILE, memoryContent);
    setMemoryDirty(false);
    setMemorySaved(true);
    setTimeout(() => setMemorySaved(false), 2000);
  };

  const openDiary = async (name: string) => {
    const date = name.replace('.md', '');
    setLoading(true);
    try {
      const content = await fileSystem.readFileText(`${MEMORY_DIR}/${name}`);
      setDiaryContent(content || '');
      setDiaryDirty(false);
      setDiarySaved(false);
      setView({ type: 'diary', date });
    } catch {
      setDiaryContent('');
    } finally {
      setLoading(false);
    }
  };

  const saveDiary = async () => {
    if (view.type !== 'diary') return;
    await fileSystem.writeFile(`${MEMORY_DIR}/${view.date}.md`, diaryContent);
    setDiaryDirty(false);
    setDiarySaved(true);
    setTimeout(() => setDiarySaved(false), 2000);
  };

  const goBack = async () => {
    setView({ type: 'list' });
    await loadListData();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view.type === 'diary' && (
              <Button onClick={goBack} variant="ghost" size="icon" className="h-7 w-7 -ml-1">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <Brain className="w-5 h-5" />
            {view.type === 'list'
              ? t('tools.memory.name')
              : `📅 ${view.date}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">{t('common.loading')}</p>
        ) : view.type === 'list' ? (
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            {/* Long-term Memory */}
            <div className="flex flex-col gap-2 min-h-0 flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('tools.memory.memoryContent')}</Label>
                <div className="flex items-center gap-2">
                  {memorySaved && (
                    <span className="text-xs text-green-600">{t('tools.memory.saved')}</span>
                  )}
                  {memoryDirty && (
                    <span className="text-xs text-muted-foreground">{t('tools.memory.editing')}</span>
                  )}
                  <Button
                    onClick={saveMemory}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!memoryDirty}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
              <textarea
                ref={memoryRef}
                value={memoryContent}
                onChange={(e) => { setMemoryContent(e.target.value); setMemoryDirty(true); setMemorySaved(false); }}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveMemory(); } }}
                className="flex-1 min-h-[160px] rounded-md border bg-muted/30 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('tools.memory.noMemoryYet')}
                spellCheck={false}
              />
            </div>

            {/* Diary List */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">{t('tools.memory.diaryList')}</Label>
              <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
                {diaryList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('tools.memory.noDiariesYet')}</p>
                ) : (
                  <div className="space-y-1">
                    {diaryList.map(d => (
                      <div
                        key={d.name}
                        onClick={() => openDiary(d.name)}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer hover:bg-muted transition-colors"
                      >
                        <span className="font-mono">📅 {d.name.replace('.md', '')}</span>
                        <span className="text-muted-foreground">
                          {d.size < 1024 ? `${d.size} B` : `${(d.size / 1024).toFixed(1)} KB`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          /* Diary Editor */
          <div className="flex flex-col gap-2 min-h-0 flex-1">
            <div className="flex items-center justify-end gap-2">
              {diarySaved && (
                <span className="text-xs text-green-600">{t('tools.memory.saved')}</span>
              )}
              {diaryDirty && (
                <span className="text-xs text-muted-foreground">{t('tools.memory.editing')}</span>
              )}
              <Button
                onClick={saveDiary}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={!diaryDirty}
              >
                {t('common.save')}
              </Button>
            </div>
            <textarea
              ref={diaryRef}
              value={diaryContent}
              onChange={(e) => { setDiaryContent(e.target.value); setDiaryDirty(true); setDiarySaved(false); }}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveDiary(); } }}
              className="flex-1 min-h-[300px] rounded-md border bg-muted/30 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck={false}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
