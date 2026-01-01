import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { t } from '../i18n';
import { Plus } from 'lucide-react';
import { NewDocumentationDialog } from './NewDocumentationDialog';

type PatientPause = {
  from: string; // YYYY-MM-DD (Oslo)
  until: string | null; // YYYY-MM-DD (Oslo) or null for indefinite
};

export function TaskList(props: { onOpenCarePlan?: (patientId: string) => void }) {
  const { tasks, patients, visits, lists, currentList, updateTask, effectiveWeekday, listPatientAssignments } = useApp();
  const { onOpenCarePlan } = props;

  const EVENING_LIST_ID_SUFFIX = '-evening';
  const baseListId = (id: string): string =>
    id.endsWith(EVENING_LIST_ID_SUFFIX) ? id.slice(0, -EVENING_LIST_ID_SUFFIX.length) : id;

  const EVENING_CUTOFF_MINUTES = 15 * 60;
  const parseTimeToMinutes = (time: string): number | null => {
    const trimmed = time.trim();
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (!m) return null;
    const hours = Number(m[1]);
    const minutes = Number(m[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };
  const isAfterEveningCutoff = (time: string | null | undefined): boolean => {
    if (!time) return false;
    const mins = parseTimeToMinutes(time);
    if (mins === null) return false;
    return mins > EVENING_CUTOFF_MINUTES;
  };
  const toEveningListId = (baseId: string): string => `${baseId}${EVENING_LIST_ID_SUFFIX}`;
  const effectiveListIdForBase = (baseId: string, visitTime: string | null | undefined): string => {
    return isAfterEveningCutoff(visitTime) ? toEveningListId(baseId) : baseId;
  };

  const [visitCompletion, setVisitCompletion] = useState<Record<string, true>>(() => {
    try {
      const raw = localStorage.getItem('honu.visitCompletion');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, true>;
    } catch {
      return {};
    }
  });

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docPatientId, setDocPatientId] = useState<string>('');

  const [visitMoveOverrides, setVisitMoveOverrides] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('honu.visitMoveOverrides');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, string>;
    } catch {
      return {};
    }
  });

  const [patientPauseById] = useState<Record<string, PatientPause>>(() => {
    try {
      const raw = localStorage.getItem('honu.patientPause');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, PatientPause>;
    } catch {
      return {};
    }
  });

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveVisitId, setMoveVisitId] = useState<string>('');
  const [moveVisitTime, setMoveVisitTime] = useState<string>('');
  const [moveToBaseListId, setMoveToBaseListId] = useState<string>('');
  const [moveFromBaseListId, setMoveFromBaseListId] = useState<string>('');


  const effectiveDateISO = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Oslo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('honu.visitCompletion', JSON.stringify(visitCompletion));
    } catch {
      // Ignore storage errors (private mode / quota).
    }
  }, [visitCompletion]);

  useEffect(() => {
    try {
      localStorage.setItem('honu.visitMoveOverrides', JSON.stringify(visitMoveOverrides));
    } catch {
      // Ignore storage errors (private mode / quota).
    }
  }, [visitMoveOverrides]);

  const moveKeyForVisit = (visitId: string) => `${effectiveDateISO}|${visitId}`;
  const effectiveListIdForVisit = (visit: (typeof visits)[number]): string => {
    return visitMoveOverrides[moveKeyForVisit(visit.id)] ?? visit.listId;
  };

  const activeBaseLists = useMemo(() => {
    return lists.filter((l) => l.active && !l.id.endsWith(EVENING_LIST_ID_SUFFIX));
  }, [lists]);

  const isPausedOnDate = (pause: PatientPause | undefined, dateISO: string): boolean => {
    if (!pause) return false;
    if (pause.until === null) return dateISO >= pause.from;
    return dateISO >= pause.from && dateISO <= pause.until;
  };

  const getAgeFromBirthDate = (birthDate: string): number | null => {
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const monthDiff = now.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
      years -= 1;
    }
    return years;
  };

  const listScopedTasks = useMemo(() => {
    if (!currentList) return [];
    const targetBase = baseListId(currentList.id);
    return tasks.filter((task) => baseListId(task.listId) === targetBase);
  }, [tasks, currentList]);

  const allowedPatientIds = useMemo(() => {
    if (!currentList) return null;
    const ids = new Set<string>();
    for (const v of visits) {
      if (v.listId === currentList.id) ids.add(v.patientId);

      // Include one-time moved-in visits for today so documentation can be created for them.
      if (effectiveListIdForVisit(v) === currentList.id) {
        const isToday = v.date
          ? v.date === effectiveDateISO
          : v.weekdays.includes(effectiveWeekday) && (!v.endDate || effectiveDateISO <= v.endDate);
        if (isToday) ids.add(v.patientId);
      }
    }
    const assigned = listPatientAssignments[currentList.id] ?? [];
    for (const pid of assigned) ids.add(pid);
    return Array.from(ids);
  }, [currentList, visits, listPatientAssignments, effectiveDateISO, effectiveWeekday, visitMoveOverrides]);

  const visitsForToday = useMemo(() => {
    if (!currentList) return [];
    return visits
      .filter(v => effectiveListIdForVisit(v) === currentList.id)
      .filter(v => {
        if (isPausedOnDate(patientPauseById[v.patientId], effectiveDateISO)) return false;
        if (v.date) return v.date === effectiveDateISO;
        if (!v.weekdays.includes(effectiveWeekday)) return false;
        if (v.endDate && effectiveDateISO > v.endDate) return false;
        return true;
      });
  }, [visits, currentList, effectiveWeekday, effectiveDateISO, visitMoveOverrides, patientPauseById]);

  const openMoveDialog = (visit: (typeof visitsForToday)[number]) => {
    const currentEffective = effectiveListIdForVisit(visit);
    const currentBase = baseListId(currentEffective);
    const defaultTarget = activeBaseLists.find((l) => l.id !== currentBase)?.id ?? currentBase;
    setMoveVisitId(visit.id);
    setMoveVisitTime(visit.time?.trim() ?? '');
    setMoveFromBaseListId(currentBase);
    setMoveToBaseListId(defaultTarget);
    setMoveDialogOpen(true);
  };

  const visitRowsForToday = useMemo(() => {
    const rows = visitsForToday
      .map((visit) => {
        const patient = patients.find(p => p.id === visit.patientId);
        if (!patient) return null;
        const timeKey = visit.time?.trim() || 'general';
        return { visit, patient, timeKey };
      })
      .filter((x): x is { visit: (typeof visitsForToday)[number]; patient: (typeof patients)[number]; timeKey: string } => Boolean(x));

    rows.sort((a, b) => {
      const aTime = a.timeKey;
      const bTime = b.timeKey;
      if (aTime === 'general' && bTime !== 'general') return 1;
      if (bTime === 'general' && aTime !== 'general') return -1;
      const timeDiff = aTime.localeCompare(bTime);
      if (timeDiff !== 0) return timeDiff;
      return a.patient.name.localeCompare(b.patient.name);
    });

    return rows;
  }, [visitsForToday, patients]);

  const handleToggleAllForVisit = (args: { visitId: string; patientId: string; visitTime: string; isSpecial: boolean; allCompleted: boolean }) => {
    const { visitId, patientId, visitTime, isSpecial, allCompleted } = args;

    const visitTasks = isSpecial
      ? listScopedTasks.filter(task => task.visitId === visitId)
      : listScopedTasks
        .filter(task => task.patientId === patientId)
        .filter(task => !task.visitId)
        .filter(task => (task.visitTime?.trim() || 'general') === visitTime);

    visitTasks.forEach(task => {
      if (allCompleted) {
        if (task.status === 'completed') {
          updateTask(task.id, { status: 'pending' });
        }
      } else {
        if (task.status !== 'completed') {
          updateTask(task.id, { status: 'completed' });
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <Dialog
        open={moveDialogOpen}
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) {
            setMoveVisitId('');
            setMoveVisitTime('');
            setMoveToBaseListId('');
            setMoveFromBaseListId('');
          }
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('moveVisitDialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moveVisitToList">{t('moveVisitToList')}</Label>
              <Select value={moveToBaseListId} onValueChange={setMoveToBaseListId}>
                <SelectTrigger id="moveVisitToList">
                  <SelectValue placeholder={t('selectList')} />
                </SelectTrigger>
                <SelectContent forceMount>
                  {activeBaseLists.map((l) => (
                    <SelectItem
                      key={l.id}
                      value={l.id}
                      disabled={Boolean(moveFromBaseListId) && l.id === moveFromBaseListId}
                      className={Boolean(moveFromBaseListId) && l.id === moveFromBaseListId ? 'text-muted-foreground' : undefined}
                    >
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMoveDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button
                type="button"
                disabled={!moveVisitId || !moveToBaseListId || (Boolean(moveFromBaseListId) && moveToBaseListId === moveFromBaseListId)}
                onClick={() => {
                  if (!moveVisitId) return;
                  if (!moveToBaseListId) return;
                  if (moveFromBaseListId && moveToBaseListId === moveFromBaseListId) return;
                  const effectiveTarget = effectiveListIdForBase(moveToBaseListId, moveVisitTime);
                  setVisitMoveOverrides((prev) => ({
                    ...prev,
                    [moveKeyForVisit(moveVisitId)]: effectiveTarget,
                  }));
                  setMoveDialogOpen(false);
                }}
              >
                {t('moveVisitConfirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NewDocumentationDialog
        open={docDialogOpen}
        onOpenChange={(open) => {
          setDocDialogOpen(open);
          if (!open) setDocPatientId('');
        }}
        patientId={docPatientId}
        allowedPatientIds={allowedPatientIds ?? undefined}
      />
            <div className="flex items-center justify-between">
              <div>
                <h2>{t('visitsTitle')}</h2>
                <p className="text-muted-foreground">
                  {currentList?.name
                    ? t('visitsSubtitleFor', { name: currentList.name })
                    : t('visitsSubtitleAll')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {!currentList && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {t('noListSelected')}
                  </CardContent>
                </Card>
              )}

              {currentList && visitRowsForToday.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {t('noVisitsToday')}
                  </CardContent>
                </Card>
              )}

              {currentList && visitRowsForToday.map(({ visit, patient, timeKey }) => {
                const isSpecial = visit.kind === 'special-task';

                const visitTasks = isSpecial
                  ? listScopedTasks.filter(task => task.visitId === visit.id)
                  : listScopedTasks
                    .filter(task => task.patientId === patient.id)
                    .filter(task => !task.visitId)
                    .filter(task => (task.visitTime?.trim() || 'general') === timeKey);

                const totalDurationMinutes = visitTasks.reduce((sum, tk) => {
                  const v = Number.isFinite(tk.durationMinutes) ? tk.durationMinutes : 0;
                  return sum + v;
                }, 0);

                const allTasksCompleted = visitTasks.length > 0 && visitTasks.every((tk) => tk.status === 'completed');
                const completionKey = `${effectiveDateISO}|${visit.id}`;
                const markedComplete = visitTasks.length === 0 && Boolean(visitCompletion[completionKey]);
                const allCompleted = allTasksCompleted || markedComplete;

                return (
                  <Card
                    key={visit.id}
                    className={
                      allCompleted
                        ? (isSpecial ? 'bg-muted/40 border-2 border-yellow-200' : 'bg-muted/40')
                        : (isSpecial ? 'border-2 border-yellow-400' : undefined)
                    }
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <span>
                          <span className={allCompleted ? 'line-through text-muted-foreground' : undefined}>
                            {patient.name}
                          </span>{' '}
                          <Badge variant="secondary" className="ml-2 text-sm">
                            {getAgeFromBirthDate(patient.birthDate) ?? '—'}
                          </Badge>
                          {patient.phone ? (
                            <span className="ml-2 text-foreground/70">{patient.phone}</span>
                          ) : null}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              onOpenCarePlan?.(patient.id);
                            }}
                          >
                            {t('openCarePlan')}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (visitTasks.length === 0) {
                                setVisitCompletion((prev) => {
                                  const next = { ...prev };
                                  if (next[completionKey]) delete next[completionKey];
                                  else next[completionKey] = true;
                                  return next;
                                });
                                return;
                              }

                              handleToggleAllForVisit({
                                visitId: visit.id,
                                patientId: patient.id,
                                visitTime: timeKey,
                                isSpecial,
                                allCompleted: allTasksCompleted,
                              });
                            }}
                          >
                            {allCompleted ? t('markAllNotCompleted') : t('completeAllTasks')}
                          </Button>
                        </div>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {Array.isArray(patient.tags) && patient.tags.length ? (
                          <span className="text-destructive font-semibold">
                            {patient.tags.map((tag) => `${tag},`).join(' ')}{' '}
                          </span>
                        ) : null}
                        {visit.description?.trim() ? visit.description : patient.diagnosis}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">{patient.address || '—'}</div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                timeKey === 'general'
                                  ? 'secondary'
                                  : allCompleted
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="text-sm"
                            >
                              {timeKey === 'general' ? t('carePlan') : timeKey}
                            </Badge>
                            <Badge variant="outline" className="text-sm">
                              {totalDurationMinutes} min
                            </Badge>
                          </div>

                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" onClick={() => openMoveDialog(visit)}>
                                {t('moveVisit')}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="w-11"
                                title={t('newDocumentation')}
                                aria-label={t('newDocumentation')}
                                onClick={() => {
                                  setDocPatientId(patient.id);
                                  setDocDialogOpen(true);
                                }}
                              >
                                <Plus />
                              </Button>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
      </div>
    </div>
  );
}