import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { t } from '../i18n';
import { sanitizeRichTextHtml } from '../utils/sanitizeRichTextHtml';
import { useApp } from '../context/AppContext';
import { Task } from '../types';

const Parchment = Quill.import('parchment') as any;

const LineHeightStyle = new Parchment.Attributor.Style('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2'],
});

Quill.register(LineHeightStyle, true);

const BlockEmbed = Quill.import('blots/block/embed') as any;

class SeparatorBlot extends BlockEmbed {
  static blotName = 'separator';
  static tagName = 'hr';
}

Quill.register(SeparatorBlot, true);

export default function CarePlanEditorScreen(props: {
  patientId: string;
  patientName: string;
  initialHtml: string;
  plannedTimes: string[];
  visitListId: string;
  mode: 'view' | 'edit';
  onBack: () => void;
  onSave?: (nextPlan: string) => void;
}) {
  const { patientId, patientName, initialHtml, plannedTimes, visitListId, mode, onBack, onSave } = props;
  const { tasks, addTask, updateTask, deleteTask } = useApp();
  const quillRefs = useRef<Record<string, ReactQuill | null>>({});
  const lastRangeRefByKey = useRef<Record<string, { index: number; length: number } | null>>({});

  const timeKeys = useMemo(() => {
    const cleaned = (plannedTimes ?? []).map(t => t.trim()).filter(Boolean);
    const uniq = Array.from(new Set(cleaned));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq.length ? uniq : ['general'];
  }, [plannedTimes]);

  type CarePlanV2 = { version: 2; byTime: Record<string, string> };
  const parsePlan = (raw: string): CarePlanV2 | null => {
    try {
      const trimmed = (raw ?? '').trim();
      if (!trimmed) return null;
      if (!trimmed.startsWith('{')) return null;
      const parsed = JSON.parse(trimmed) as any;
      if (!parsed || parsed.version !== 2 || typeof parsed.byTime !== 'object' || !parsed.byTime) return null;
      const byTime: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.byTime)) {
        if (typeof k !== 'string') continue;
        if (typeof v !== 'string') continue;
        byTime[k] = v;
      }
      return { version: 2, byTime };
    } catch {
      return null;
    }
  };

  const initialByTime = useMemo<Record<string, string>>(() => {
    const v2 = parsePlan(initialHtml);
    if (v2) {
      const out: Record<string, string> = {};
      for (const k of timeKeys) {
        out[k] = v2.byTime[k] ?? '';
      }
      return out;
    }

    const legacy = initialHtml ?? '';
    const out: Record<string, string> = {};
    if (timeKeys.length) {
      out[timeKeys[0]] = legacy;
      for (const k of timeKeys.slice(1)) out[k] = '';
    }
    return out;
  }, [initialHtml, timeKeys]);

  const [byTime, setByTime] = useState<Record<string, string>>(initialByTime);
  const [activeKey, setActiveKey] = useState<string>(timeKeys[0] ?? 'general');
  const [active, setActive] = useState<Record<string, any>>({});

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogTimeKey, setTaskDialogTimeKey] = useState<string>('general');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    durationMinutes: 30,
  });

  const readOnly = mode === 'view';

  const modules = useMemo(
    () => ({
      toolbar: false,
      keyboard: {
        bindings: {
          resetFormattingOnEnter: {
            key: 13,
            handler: function (this: any, range: any) {
              // Insert newline ourselves, then clear formatting so the next line starts "clean".
              this.quill.insertText(range.index, '\n', 'user');
              this.quill.setSelection(range.index + 1, 0, 'api');

              this.quill.format('bold', false, 'api');
              this.quill.format('italic', false, 'api');
              this.quill.format('underline', false, 'api');
              this.quill.format('size', false, 'api');
              this.quill.format('color', false, 'api');
              this.quill.format('background', false, 'api');
              this.quill.format('lineheight', false, 'api');

              return false;
            },
          },
        },
      },
    }),
    [],
  );

  const formats = useMemo(
    () => [
      'bold',
      'italic',
      'underline',
      'size',
      'color',
      'background',
      'lineheight',
      'separator',
    ],
    [],
  );

  const getEditor = (key: string) => quillRefs.current[key]?.getEditor();

  const syncActiveFromEditor = (editor: any) => {
    try {
      const range = editor.getSelection();
      if (range) {
        setActive(editor.getFormat(range) as any);
      } else {
        setActive(editor.getFormat() as any);
      }
    } catch {
      // ignore
    }
  };

  const ensureCursor = (editor: any, key: string): { index: number; length: number } | null => {
    try {
      editor.focus();
      let range = editor.getSelection();
      if (range) return range;

      const fallbackIndex = lastRangeRefByKey.current[key]?.index ?? Math.max(0, editor.getLength() - 1);
      // Use a non-silent source so Quill updates its internal format state immediately.
      editor.setSelection(fallbackIndex, 0, 'api');
      range = editor.getSelection();
      return range;
    } catch {
      return null;
    }
  };

  const normalizeToHex = (value: unknown, fallback: string) => {
    if (typeof value !== 'string' || !value) return fallback;
    const v = value.trim();
    if (v.startsWith('#')) {
      if (v.length === 4) {
        const r = v[1];
        const g = v[2];
        const b = v[3];
        return `#${r}${r}${g}${g}${b}${b}`;
      }
      return v;
    }
    const rgb = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgb) {
      const [r, g, b] = rgb.slice(1, 4).map(n => Number(n));
      if ([r, g, b].some(n => Number.isNaN(n))) return fallback;
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return fallback;
  };

  const isEffectivelyEmptyHtml = (html: string): boolean => {
    const trimmed = (html ?? '').trim();
    if (!trimmed) return true;

    // Fast-path common Quill “empty” values
    if (trimmed === '<p><br></p>' || trimmed === '<p></p>') return true;

    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      const body = doc.body;
      if (!body) return true;

      // Consider separators / embeds as content
      if (body.querySelector('hr, img, video, iframe, ul, ol, table, blockquote')) return false;

      const text = (body.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      return text.length === 0;
    } catch {
      return trimmed.length === 0;
    }
  };

  const viewSections = useMemo(() => {
    return timeKeys
      .map((key) => {
        const raw = byTime[key] ?? '';
        const clean = sanitizeRichTextHtml(raw);
        return {
          key,
          label: key === 'general' ? t('carePlan') : key,
          html: clean,
          empty: isEffectivelyEmptyHtml(clean),
        };
      });
  }, [byTime, timeKeys, t]);

  const tasksForThisPatient = useMemo(() => {
    return tasks
      .filter(tk => tk.patientId === patientId)
      .filter(tk => tk.listId === visitListId)
      .sort((a, b) => {
        const aKey = a.visitTime?.trim() || 'general';
        const bKey = b.visitTime?.trim() || 'general';
        const timeDiff = aKey.localeCompare(bKey);
        if (timeDiff !== 0) return timeDiff;
        return a.title.localeCompare(b.title);
      });
  }, [tasks, patientId, visitListId]);

  const tasksByTimeKey = useMemo(() => {
    return tasksForThisPatient.reduce((acc, task) => {
      const key = task.visitTime?.trim() || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasksForThisPatient]);

  const openTaskDialog = (timeKey: string, task?: Task) => {
    setTaskDialogTimeKey(timeKey);
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description,
        durationMinutes: Number.isFinite(task.durationMinutes) ? task.durationMinutes : 30,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        durationMinutes: 30,
      });
    }
    setTaskDialogOpen(true);
  };

  const saveTaskFromDialog = () => {
    const title = taskForm.title.trim();
    const description = taskForm.description.trim();
    if (!title || !description) return;

    const visitTime = taskDialogTimeKey;

    if (editingTask) {
      updateTask(editingTask.id, {
        title,
        description,
        durationMinutes: taskForm.durationMinutes,
        visitTime,
      });
    } else {
      const newTask: Task = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        patientId,
        patientName,
        listId: visitListId,
        visitTime,
        title,
        description,
        status: 'pending',
        durationMinutes: taskForm.durationMinutes,
      };
      addTask(newTask);
    }

    setTaskDialogOpen(false);
    setEditingTask(null);
  };

  useEffect(() => {
    // Keep state aligned if time keys change while open
    setByTime((prev) => {
      const next: Record<string, string> = {};
      for (const k of timeKeys) next[k] = prev[k] ?? '';
      return next;
    });
    setActiveKey((prev) => (timeKeys.includes(prev) ? prev : (timeKeys[0] ?? 'general')));
  }, [timeKeys]);

  const toggleInline = (format: 'bold' | 'italic' | 'underline') => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    const range = ensureCursor(editor, activeKey);
    const current = !!(range ? (editor.getFormat(range) as any)?.[format] : (editor.getFormat() as any)?.[format]);
    editor.format(format, !current);
    syncActiveFromEditor(editor);
  };

  const applySize = (size: string) => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    ensureCursor(editor, activeKey);
    if (size === 'normal') {
      editor.format('size', false);
    } else {
      editor.format('size', size);
    }
    syncActiveFromEditor(editor);
  };

  const applyLineHeight = (lineheight: string) => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    ensureCursor(editor, activeKey);
    editor.format('lineheight', lineheight);
    syncActiveFromEditor(editor);
  };

  const applyColor = (color: string) => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    ensureCursor(editor, activeKey);
    editor.format('color', color);
    syncActiveFromEditor(editor);
  };

  const applyHighlight = (color: string) => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    ensureCursor(editor, activeKey);
    editor.format('background', color);
    syncActiveFromEditor(editor);
  };

  const clearHighlight = () => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    ensureCursor(editor, activeKey);
    editor.format('background', false);
    syncActiveFromEditor(editor);
  };

  const clearFormatting = () => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    const sel = ensureCursor(editor, activeKey);
    if (!sel || sel.length === 0) return;
    editor.removeFormat(sel.index, sel.length);
  };

  const insertSeparator = () => {
    const editor = getEditor(activeKey);
    if (!editor) return;
    const sel = ensureCursor(editor, activeKey);
    const index = sel?.index ?? Math.max(0, editor.getLength() - 1);

    editor.insertEmbed(index, 'separator', true, 'user');
    editor.insertText(index + 1, '\n', 'user');
    editor.setSelection(index + 2, 0, 'api');

    // Start clean after inserting the separator
    editor.format('bold', false, 'api');
    editor.format('italic', false, 'api');
    editor.format('underline', false, 'api');
    editor.format('size', false, 'api');
    editor.format('color', false, 'api');
    editor.format('background', false, 'api');
    editor.format('lineheight', false, 'api');
    syncActiveFromEditor(editor);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="truncate">{t('carePlanTitleFor', { name: patientName })}</h2>
          <p className="text-muted-foreground">
            {readOnly ? t('carePlanViewSubtitle') : t('carePlanEditSubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" className="bg-foreground text-background hover:bg-foreground/90" onClick={onBack}>
            {t('back')}
          </Button>
          {!readOnly && (
            <Button
              type="button"
              onClick={() => {
                const cleanedByTime: Record<string, string> = {};
                for (const k of timeKeys) {
                  cleanedByTime[k] = sanitizeRichTextHtml(byTime[k] ?? '');
                }
                const next: CarePlanV2 = { version: 2, byTime: cleanedByTime };
                onSave?.(JSON.stringify(next));
              }}
            >
              {t('save')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{t('carePlan')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!readOnly && (
            <div id="care-plan-toolbar" className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={active.bold ? 'default' : 'outline'}
                  size="sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleInline('bold');
                  }}
                  title="Bold"
                >
                  <span className="font-bold">B</span>
                </Button>
                <Button
                  type="button"
                  variant={active.italic ? 'default' : 'outline'}
                  size="sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleInline('italic');
                  }}
                  title="Italic"
                >
                  <span className="italic">I</span>
                </Button>
                <Button
                  type="button"
                  variant={active.underline ? 'default' : 'outline'}
                  size="sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleInline('underline');
                  }}
                  title="Underline"
                >
                  <span className="underline">U</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={(active.size as string | undefined) ?? 'normal'}
                  onChange={(e) => applySize(e.target.value)}
                  aria-label="Font size"
                >
                  <option value="small">S</option>
                  <option value="normal">M</option>
                  <option value="large">L</option>
                  <option value="huge">XL</option>
                </select>

                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={(active.lineheight as string | undefined) ?? '1.5'}
                  onChange={(e) => applyLineHeight(e.target.value)}
                  aria-label="Line spacing"
                >
                  <option value="1">1.0</option>
                  <option value="1.15">1.15</option>
                  <option value="1.5">1.5</option>
                  <option value="2">2.0</option>
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: normalizeToHex(active.color, '#000000'),
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                  title="Text color"
                >
                  A
                </span>
                <input
                  type="color"
                  value={normalizeToHex(active.color, '#000000')}
                  onChange={(e) => applyColor(e.target.value)}
                  aria-label="Text color"
                  className="h-6 w-8 cursor-pointer bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                <span
                  className="text-sm font-semibold"
                  style={{
                    backgroundColor: normalizeToHex(active.background, '#ffff00'),
                    padding: '0 4px',
                    borderRadius: '4px',
                  }}
                  title="Highlight"
                >
                  HL
                </span>
                <input
                  type="color"
                  value={normalizeToHex(active.background, '#ffff00')}
                  onChange={(e) => applyHighlight(e.target.value)}
                  aria-label="Highlight color"
                  className="h-6 w-8 cursor-pointer bg-transparent"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    clearHighlight();
                  }}
                  title="Clear highlight"
                >
                  ×
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertSeparator();
                }}
                title="Insert separator"
              >
                —
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  clearFormatting();
                }}
              >
                {t('clearFormatting')}
              </Button>
            </div>
          )}

          {readOnly ? (
            <div className="rounded-md border">
              <div className="space-y-4 p-4">
                {viewSections.map((s) => {
                  const sectionTasks = tasksByTimeKey[s.key] ?? [];
                  return (
                    <div key={s.key} className="space-y-2">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      {s.empty ? (
                        <div className="text-sm text-muted-foreground">—</div>
                      ) : (
                        <div className="ql-snow">
                          <div className="ql-editor p-0" dangerouslySetInnerHTML={{ __html: s.html }} />
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">{t('tasksTitle')}</div>
                      {sectionTasks.length === 0 ? (
                        <div className="text-sm text-muted-foreground">—</div>
                      ) : (
                        <div className="space-y-2">
                          {sectionTasks.map((task) => (
                            <div key={task.id} className="rounded-md border p-3">
                              <div className="font-medium truncate">{task.title}</div>
                              <div className="text-sm text-muted-foreground">{task.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {timeKeys.map((key) => {
                const label = key === 'general' ? t('carePlan') : key;
                const sectionTasks = tasksByTimeKey[key] ?? [];
                return (
                  <div key={key} className="space-y-2">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="rounded-md border" onMouseDown={() => setActiveKey(key)}>
                      <ReactQuill
                        ref={(el) => {
                          quillRefs.current[key] = el;
                        }}
                        theme="snow"
                        value={byTime[key] ?? ''}
                        onChange={(next) => {
                          setByTime((prev) => ({ ...prev, [key]: next }));
                        }}
                        onChangeSelection={(range, _source, editor) => {
                          if (readOnly) return;
                          if (!range) return;
                          setActiveKey(key);
                          lastRangeRefByKey.current[key] = range;
                          try {
                            const fullEditor = getEditor(key);
                            if (fullEditor) setActive(fullEditor.getFormat(range) as any);
                          } catch {
                            // ignore
                          }
                        }}
                        readOnly={readOnly}
                        modules={modules}
                        formats={formats}
                        placeholder={t('carePlanPlaceholder')}
                        style={{ minHeight: 220 }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">{t('tasksTitle')}</div>
                      <Button type="button" size="sm" variant="outline" onClick={() => openTaskDialog(key)}>
                        {t('addTask')}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {sectionTasks.length === 0 ? (
                        <div className="text-sm text-muted-foreground">—</div>
                      ) : (
                        sectionTasks.map((task) => (
                          <div key={task.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{task.title}</div>
                              <div className="text-sm text-muted-foreground">{task.description}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => openTaskDialog(key, task)}>
                                {t('edit')}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  deleteTask(task.id);
                                }}
                              >
                                {t('delete')}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingTask ? t('edit') : t('addTask')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpTaskTitle">{t('taskTitle')}</Label>
              <Input
                id="cpTaskTitle"
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpTaskDesc">{t('taskDescription')}</Label>
              <Textarea
                id="cpTaskDesc"
                value={taskForm.description}
                onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpTaskDuration">{t('dueDate')}</Label>
              <Input
                id="cpTaskDuration"
                type="number"
                min={1}
                step={1}
                value={taskForm.durationMinutes}
                onChange={(e) => setTaskForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="button" onClick={saveTaskFromDialog}>
                {t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
