import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  const [diaryDates, setDiaryDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
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

      // Extract dates from diary filenames (YYYY-MM-DD.md)
      const dates = new Set(diaries.map(d => d.name.replace('.md', '')));
      setDiaryDates(dates);
    } catch {
      setMemoryContent('');
      setDiaryList([]);
      setDiaryDates(new Set());
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

  // 将 Date 对象转换为本地 YYYY-MM-DD 格式
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const dateStr = formatDateToLocal(date);
    if (diaryDates.has(dateStr)) {
      openDiary(`${dateStr}.md`);
    }
  };

  const modifiers = {
    hasDiary: (date: Date) => {
      const dateStr = formatDateToLocal(date);
      return diaryDates.has(dateStr);
    }
  };

  const modifiersClassNames = {
    hasDiary: 'relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary font-semibold text-primary',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
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
            <div className="flex flex-col gap-2">
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
                className="min-h-[140px] rounded-md border bg-muted/30 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('tools.memory.noMemoryYet')}
                spellCheck={false}
              />
            </div>

            {/* Diary Section with Calendar and List */}
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <Label className="text-sm font-medium">{t('tools.memory.diaryList')}</Label>
              <div className="flex gap-3 flex-1 min-h-0">
                {/* Calendar with Year/Month Selector in header */}
                <div className="shrink-0">
                  <div className="border rounded-md bg-muted/30 p-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      modifiers={modifiers}
                      modifiersClassNames={modifiersClassNames}
                      className="rounded-md"
                      components={{
                        CaptionLabel: () => (
                          <div className="flex gap-1.5 items-center">
                            <Select
                              value={calendarMonth.getFullYear().toString()}
                              onValueChange={(year) => {
                                const newDate = new Date(calendarMonth);
                                newDate.setFullYear(parseInt(year));
                                setCalendarMonth(newDate);
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-[78px] border-none shadow-none px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={(calendarMonth.getMonth() + 1).toString()}
                              onValueChange={(month) => {
                                const newDate = new Date(calendarMonth);
                                newDate.setMonth(parseInt(month) - 1);
                                setCalendarMonth(newDate);
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-[62px] border-none shadow-none px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                  <SelectItem key={month} value={month.toString()}>
                                    {month}月
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ),
                      }}
                    />
                  </div>
                </div>

                {/* Diary List */}
                <div className="flex-1 min-w-0">
                  <ScrollArea className="h-full rounded-md border bg-muted/30 p-3">
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
