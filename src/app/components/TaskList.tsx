import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { t } from '../i18n';

export function TaskList(props: { onOpenCarePlan?: (patientId: string) => void }) {
  const { tasks, patients, visits, currentList, updateTask, effectiveWeekday } = useApp();
  const { onOpenCarePlan } = props;

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
    return currentList ? tasks.filter(task => task.listId === currentList.id) : [];
  }, [tasks, currentList]);

  const visitsForToday = useMemo(() => {
    if (!currentList) return [];
    return visits
      .filter(v => v.listId === currentList.id)
      .filter(v => {
        if (v.date) return v.date === effectiveDateISO;
        if (!v.weekdays.includes(effectiveWeekday)) return false;
        if (v.endDate && effectiveDateISO > v.endDate) return false;
        return true;
      });
  }, [visits, currentList, effectiveWeekday, effectiveDateISO]);

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

                const allCompleted = visitTasks.length > 0 && visitTasks.every((tk) => tk.status === 'completed');

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
                          <span className="text-foreground/70">({getAgeFromBirthDate(patient.birthDate) ?? '—'})</span>
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
                            onClick={() => handleToggleAllForVisit({
                              visitId: visit.id,
                              patientId: patient.id,
                              visitTime: timeKey,
                              isSpecial,
                              allCompleted,
                            })}
                          >
                            {allCompleted ? t('markAllNotCompleted') : t('completeAllTasks')}
                          </Button>
                        </div>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{patient.diagnosis}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
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
                        </div>
                        {visitTasks.length === 0 ? (
                          <div className="text-sm text-muted-foreground">—</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
      </div>
    </div>
  );
}