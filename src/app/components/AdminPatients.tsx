import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Patient, Task, Visit, Weekday } from '../types';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Plus, Pencil, Trash2, FilePenLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { t } from '../i18n';

import clipboardStarIcon from '../../../images/clipboard_start_icon.png';

export function AdminPatients(props: { onEditCarePlan?: (patientId: string) => void }) {
  const { patients, employees, lists, visits, currentList, addPatient, updatePatient, deletePatient, addTask, addVisit, updateVisit, deleteVisit } = useApp();
  const { onEditCarePlan } = props;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [visitListSearch, setVisitListSearch] = useState('');

  const [isSpecialTaskDialogOpen, setIsSpecialTaskDialogOpen] = useState(false);
  const [specialTaskPatient, setSpecialTaskPatient] = useState<Patient | null>(null);
  const [specialTaskForm, setSpecialTaskForm] = useState({
    listId: '',
    time: '09:00',
    type: 'one-time' as 'one-time' | 'periodic',
    date: '',
    endDate: '',
    weekdays: [] as Weekday[],
    title: '',
    description: '',
    durationMinutes: 30,
  });

  const [isSingleVisitDialogOpen, setIsSingleVisitDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [singleVisitDraft, setSingleVisitDraft] = useState<{ time: string; listId: string }>({ time: '', listId: '' });

  const getAnyListIdForPatient = (patientId: string): string | null => {
    if (!patientId) return null;
    const ids = Array.from(new Set(visits.filter((v) => v.patientId === patientId).map((v) => v.listId)));
    return ids[0] ?? null;
  };

  type VisitGridRow = {
    rowId: string;
    timesByWeekday: Partial<Record<Weekday, string | null>>;
  };

  const [visitGridRows, setVisitGridRows] = useState<VisitGridRow[]>([]);
  const [cellDialogOpen, setCellDialogOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{
    rowId: string | null;
    weekday: Weekday;
    hasExistingValue: boolean;
  } | null>(null);
  const [cellTimeDraft, setCellTimeDraft] = useState('08:00');
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    address: '',
    phone: '',
    diagnosis: '',
    admissionDate: '',
    assignedEmployee: '',
  });

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

  const [visitFormData, setVisitFormData] = useState({
    patientId: '',
    listId: '',
  });

  const weekdayOptions: Array<{ key: Weekday; label: string }> = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  const sortedVisits = useMemo(() => {
    const patientNameById = new Map<string, string>();
    for (const p of patients) patientNameById.set(p.id, p.name);

    const getPatientName = (patientId: string) => patientNameById.get(patientId) ?? '';
    const normalizeTime = (t?: string) => (typeof t === 'string' ? t.trim() : '');

    return [...visits].sort((a, b) => {
      const nameA = getPatientName(a.patientId);
      const nameB = getPatientName(b.patientId);
      const nameDiff = nameA.localeCompare(nameB);
      if (nameDiff !== 0) return nameDiff;

      const timeA = normalizeTime(a.time);
      const timeB = normalizeTime(b.time);
      if (!timeA && timeB) return 1;
      if (timeA && !timeB) return -1;
      const timeDiff = timeA.localeCompare(timeB);
      if (timeDiff !== 0) return timeDiff;

      return String(a.id).localeCompare(String(b.id));
    });
  }, [visits, patients]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter((p) => {
      const haystack = [p.name, p.phone, p.address, p.diagnosis]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [patients, patientSearch]);

  const visitGroups = useMemo(() => {
    const patientNameById = new Map<string, string>();
    for (const p of patients) patientNameById.set(p.id, p.name);

    const listNameById = new Map<string, string>();
    for (const l of lists) listNameById.set(l.id, l.name);

    const normalizeTime = (t?: string) => (typeof t === 'string' ? t.trim() : '');

    const byPatient = new Map<string, Visit[]>();
    for (const v of visits) {
      const arr = byPatient.get(v.patientId);
      if (arr) arr.push(v);
      else byPatient.set(v.patientId, [v]);
    }

    const rows = Array.from(byPatient.entries()).map(([patientId, patientVisits]) => {
      const patientName = patientNameById.get(patientId) ?? '';
      const sorted = [...patientVisits].sort((a, b) => {
        const timeA = normalizeTime(a.time);
        const timeB = normalizeTime(b.time);
        if (!timeA && timeB) return 1;
        if (timeA && !timeB) return -1;
        const timeDiff = timeA.localeCompare(timeB);
        if (timeDiff !== 0) return timeDiff;

        const listA = listNameById.get(a.listId) ?? '';
        const listB = listNameById.get(b.listId) ?? '';
        const listDiff = listA.localeCompare(listB);
        if (listDiff !== 0) return listDiff;

        return String(a.id).localeCompare(String(b.id));
      });

      return {
        patientId,
        patientName,
        visits: sorted,
      };
    });

    rows.sort((a, b) => a.patientName.localeCompare(b.patientName));
    return rows;
  }, [visits, patients, lists]);

  const filteredVisitGroups = useMemo(() => {
    const q = visitListSearch.trim().toLowerCase();
    if (!q) return visitGroups;

    const listNameById = new Map<string, string>();
    for (const l of lists) listNameById.set(l.id, l.name);

    return visitGroups.filter((row) => {
      const listNames = row.visits.map((v) => listNameById.get(v.listId) ?? '').filter(Boolean);
      const haystack = [row.patientName, ...listNames].filter(Boolean).join(' | ').toLowerCase();
      return haystack.includes(q);
    });
  }, [visitGroups, visitListSearch, lists]);

  const formatWeekdays = (days: Weekday[]) => {
    const order: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const map: Record<Weekday, string> = {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    };
    return order.filter(d => days.includes(d)).map(d => map[d]);
  };

  const buildGridRowsFromVisits = (existing: Visit[]): VisitGridRow[] => {
    return existing.map((visit) => {
      const timesByWeekday: Partial<Record<Weekday, string | null>> = {};
      for (const d of visit.weekdays) {
        timesByWeekday[d] = visit.time ?? null;
      }
      return {
        rowId: visit.id,
        timesByWeekday,
      };
    });
  };

  const buildVisitsFromGridRows = (args: {
    rows: VisitGridRow[];
    patient: Patient;
    listId: string;
  }): Visit[] => {
    const { rows, patient, listId } = args;

    const result: Visit[] = [];
    for (const row of rows) {
      const groups = new Map<string, { time: string | null; weekdays: Weekday[] }>();

      (Object.keys(row.timesByWeekday) as Weekday[]).forEach((weekday) => {
        const time = row.timesByWeekday[weekday];
        if (time === undefined) return;
        const key = time === null ? '__null__' : time;
        const existing = groups.get(key);
        if (existing) {
          existing.weekdays.push(weekday);
        } else {
          groups.set(key, { time, weekdays: [weekday] });
        }
      });

      for (const g of groups.values()) {
        if (!g.weekdays.length) continue;
        result.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          patientId: patient.id,
          patientName: patient.name,
          listId,
          weekdays: g.weekdays,
          time: g.time ?? undefined,
        });
      }
    }
    return result;
  };

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        ...patient,
        assignedEmployee: patient.assignedEmployee || 'unassigned',
      });
    } else {
      setEditingPatient(null);
      setFormData({
        name: '',
        birthDate: '',
        address: '',
        phone: '',
        diagnosis: '',
        admissionDate: new Date().toISOString().split('T')[0],
        assignedEmployee: 'unassigned',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patientData = {
      name: formData.name,
      birthDate: formData.birthDate,
      address: formData.address,
      phone: formData.phone,
      diagnosis: formData.diagnosis,
      admissionDate: formData.admissionDate,
      assignedEmployee: formData.assignedEmployee && formData.assignedEmployee !== 'unassigned' ? formData.assignedEmployee : undefined,
    };

    if (editingPatient) {
      updatePatient(editingPatient.id, patientData);
    } else {
      const newPatient: Patient = {
        ...patientData,
        id: Date.now().toString(),
      };
      addPatient(newPatient);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDeletePatient'))) {
      deletePatient(id);
    }
  };

  const getAssignedEmployeeName = (employeeId?: string) => {
    if (!employeeId) return t('unassigned');
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || t('unassigned');
  };

  const handleOpenVisitDialog = (patient?: Patient) => {
    const patientId = patient?.id || '';
    const preferredListId = currentList?.id ?? lists.find(l => l.active)?.id ?? '';
    const fallbackExistingListId = patientId ? getAnyListIdForPatient(patientId) : null;
    const listId = preferredListId || fallbackExistingListId || '';
    setVisitFormData({ patientId, listId });
    const existing = visits
      .filter((v) => v.patientId === patientId && v.listId === listId)
      .filter((v) => v.kind !== 'special-task');
    setVisitGridRows(buildGridRowsFromVisits(existing));
    setIsVisitDialogOpen(true);
  };

  const getOsloDateISO = (): string => {
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
  };

  const handleOpenSpecialTaskDialog = (patient: Patient) => {
    const preferredListId = currentList?.id ?? lists.find(l => l.active)?.id ?? '';
    const fallbackExistingListId = getAnyListIdForPatient(patient.id);
    const listId = preferredListId || fallbackExistingListId || '';

    setSpecialTaskPatient(patient);
    setSpecialTaskForm({
      listId,
      time: '09:00',
      type: 'one-time',
      date: getOsloDateISO(),
      endDate: '',
      weekdays: [effectiveWeekdayFallback()],
      title: '',
      description: '',
      durationMinutes: 30,
    });
    setIsSpecialTaskDialogOpen(true);
  };

  const effectiveWeekdayFallback = (): Weekday => {
    // Keep it simple for the dialog default; planned weekday itself doesn't matter much.
    const local = new Date().getDay();
    const map: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return map[local] ?? 'mon';
  };

  const saveSpecialTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialTaskPatient) return;

    const listId = specialTaskForm.listId;
    if (!listId) {
      alert(t('pleaseSelectList'));
      return;
    }

    const title = specialTaskForm.title.trim();
    const description = specialTaskForm.description.trim();
    if (!title || !description) return;

    const time = specialTaskForm.time.trim();
    const timeValue = time ? time : undefined;
    const visitTimeKey = timeValue?.trim() || 'general';

    const isOneTime = specialTaskForm.type === 'one-time';
    const oneTimeDate = isOneTime ? (specialTaskForm.date || '').trim() : '';
    if (isOneTime && !oneTimeDate) return;

    const periodicEndDate = !isOneTime ? (specialTaskForm.endDate || '').trim() : '';

    const weekdays = isOneTime ? [] : (specialTaskForm.weekdays.length ? specialTaskForm.weekdays : ['mon']);

    const visitId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newVisit: Visit = {
      id: visitId,
      patientId: specialTaskPatient.id,
      patientName: specialTaskPatient.name,
      listId,
      time: timeValue,
      weekdays,
      date: isOneTime ? oneTimeDate : undefined,
      endDate: !isOneTime && periodicEndDate ? periodicEndDate : undefined,
      kind: 'special-task',
    };

    const newTask: Task = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      patientId: specialTaskPatient.id,
      patientName: specialTaskPatient.name,
      listId,
      visitId,
      visitTime: visitTimeKey,
      title,
      description,
      status: 'pending',
      durationMinutes: Number.isFinite(specialTaskForm.durationMinutes) ? specialTaskForm.durationMinutes : 30,
    };

    addVisit(newVisit);
    addTask(newTask);

    setIsSpecialTaskDialogOpen(false);
    setSpecialTaskPatient(null);
  };

  const openSingleVisitEditor = (visit: Visit) => {
    setEditingVisit(visit);
    setSingleVisitDraft({
      time: visit.time?.trim() ? visit.time : '',
      listId: visit.listId,
    });
    setIsSingleVisitDialogOpen(true);
  };

  const saveSingleVisitEdits = () => {
    if (!editingVisit) return;
    const nextListId = singleVisitDraft.listId;
    if (!nextListId) {
      alert(t('pleaseSelectList'));
      return;
    }
    const nextTime = singleVisitDraft.time.trim();
    updateVisit(editingVisit.id, {
      listId: nextListId,
      time: nextTime ? nextTime : undefined,
    });
    setIsSingleVisitDialogOpen(false);
    setEditingVisit(null);
  };

  const openCellEditor = (args: {
    rowId: string | null;
    weekday: Weekday;
    currentValue?: string | null;
  }) => {
    setActiveCell({
      rowId: args.rowId,
      weekday: args.weekday,
      hasExistingValue: args.currentValue !== undefined,
    });
    setCellTimeDraft(args.currentValue && args.currentValue !== null ? args.currentValue : '08:00');
    setCellDialogOpen(true);
  };

  const applyCellTime = (args: { rowId: string; weekday: Weekday; time: string | null }) => {
    setVisitGridRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== args.rowId) return row;
        return {
          ...row,
          timesByWeekday: {
            ...row.timesByWeekday,
            [args.weekday]: args.time,
          },
        };
      })
    );
  };

  const removeCellTime = (args: { rowId: string; weekday: Weekday }) => {
    setVisitGridRows((prev) => {
      const next = prev
        .map((row) => {
          if (row.rowId !== args.rowId) return row;

          const nextTimes = { ...row.timesByWeekday };
          delete nextTimes[args.weekday];

          return {
            ...row,
            timesByWeekday: nextTimes,
          };
        })
        .filter((row) => Object.keys(row.timesByWeekday).length > 0);

      return next;
    });
  };

  const reloadGridFromSelection = (args: { patientId: string; listId: string }) => {
    const existing = visits
      .filter((v) => v.patientId === args.patientId && v.listId === args.listId)
      .filter((v) => v.kind !== 'special-task');
    setVisitGridRows(buildGridRowsFromVisits(existing));
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === visitFormData.patientId);
    if (!patient) return;

    if (!visitFormData.listId) {
      alert(t('pleaseSelectList'));
      return;
    }

    const existing = visits
      .filter((v) => v.patientId === patient.id && v.listId === visitFormData.listId)
      .filter((v) => v.kind !== 'special-task');
    for (const v of existing) {
      deleteVisit(v.id);
    }

    const nextVisits = buildVisitsFromGridRows({
      rows: visitGridRows,
      patient,
      listId: visitFormData.listId,
    });

    for (const v of nextVisits) {
      addVisit(v);
    }
    
    setVisitFormData({
      patientId: '',
      listId: '',
    });
    setVisitGridRows([]);
    setIsVisitDialogOpen(false);
  };

  const handleVisitDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this visit?')) {
      deleteVisit(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2>{t('patientManagementTitle')}</h2>
          <p className="text-muted-foreground">{t('patientManagementSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder={t('searchPatients')}
            className="w-[240px]"
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addPatient')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editingPatient ? t('editPatient') : t('addNewPatient')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('fullName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">{t('birthDate')}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+47 912 34 567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">{t('diagnosis')}</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionDate">{t('admissionDate')}</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={formData.admissionDate}
                  onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('carePlan')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('editCarePlan')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedEmployee">{t('assignedNurse')}</Label>
                <Select
                  value={formData.assignedEmployee}
                  onValueChange={(value) => 
                    setFormData({ ...formData, assignedEmployee: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('assignedNurse')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
                    {employees.filter(emp => emp.status === 'active').map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} - {employee.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">
                  {editingPatient ? t('save') : t('addPatient')}
                </Button>
              </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fullName')}</TableHead>
              <TableHead>{t('age')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead>{t('diagnosis')}</TableHead>
              <TableHead>{t('assignedNurse')}</TableHead>
              <TableHead>{t('admissionDate')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>{patient.name}</TableCell>
                <TableCell>{getAgeFromBirthDate(patient.birthDate) ?? '—'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{patient.phone}</div>
                    <div className="text-muted-foreground text-xs">{patient.address}</div>
                  </div>
                </TableCell>
                <TableCell>{patient.diagnosis}</TableCell>
                <TableCell>{getAssignedEmployeeName(patient.assignedEmployee)}</TableCell>
                <TableCell>{new Date(patient.admissionDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditCarePlan?.(patient.id)}
                      disabled={!onEditCarePlan}
                      title={t('editCarePlan')}
                    >
                      <FilePenLine className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenSpecialTaskDialog(patient)}
                      title={t('addSpecialTask')}
                    >
                      <span aria-hidden className="relative inline-block h-4 w-4 overflow-visible">
                        <span
                          className="absolute inset-0 m-auto block h-4 w-4 origin-center scale-[1.4] bg-yellow-600 pointer-events-none"
                          style={{
                            WebkitMaskImage: `url(${clipboardStarIcon})`,
                            maskImage: `url(${clipboardStarIcon})`,
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                          }}
                        />
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(patient)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(patient.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isSpecialTaskDialogOpen} onOpenChange={setIsSpecialTaskDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('addSpecialTask')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveSpecialTask} className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{specialTaskPatient?.name ?? ''}</div>
              <div className="text-xs text-muted-foreground">{t('specialTaskHelper')}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stList">{t('list')}</Label>
              <Select
                value={specialTaskForm.listId}
                onValueChange={(value) => setSpecialTaskForm((p) => ({ ...p, listId: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectList')} />
                </SelectTrigger>
                <SelectContent>
                  {lists.filter((l) => l.active).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stTime">{t('time')}</Label>
                <Input
                  id="stTime"
                  value={specialTaskForm.time}
                  onChange={(e) => setSpecialTaskForm((p) => ({ ...p, time: e.target.value }))}
                  placeholder="09:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stType">{t('specialTaskType')}</Label>
                <Select
                  value={specialTaskForm.type}
                  onValueChange={(value) => setSpecialTaskForm((p) => ({ ...p, type: value as 'one-time' | 'periodic' }))}
                >
                  <SelectTrigger id="stType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">{t('specialTaskOneTime')}</SelectItem>
                    <SelectItem value="periodic">{t('specialTaskPeriodic')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {specialTaskForm.type === 'one-time' ? (
              <div className="space-y-2">
                <Label htmlFor="stDate">{t('date')}</Label>
                <Input
                  id="stDate"
                  type="date"
                  value={specialTaskForm.date}
                  onChange={(e) => setSpecialTaskForm((p) => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('specialTaskWeekdays')}</Label>
                <div className="flex flex-wrap gap-3">
                  {weekdayOptions.map(({ key, label }) => {
                    const checked = specialTaskForm.weekdays.includes(key);
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const nextChecked = v === true;
                            setSpecialTaskForm((p) => {
                              const next = new Set(p.weekdays);
                              if (nextChecked) next.add(key);
                              else next.delete(key);
                              return { ...p, weekdays: Array.from(next) as Weekday[] };
                            });
                          }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stEndDate">{t('specialTaskEndDate')}</Label>
                  <Input
                    id="stEndDate"
                    type="date"
                    value={specialTaskForm.endDate}
                    onChange={(e) => setSpecialTaskForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="stTitle">{t('taskTitle')}</Label>
              <Input
                id="stTitle"
                value={specialTaskForm.title}
                onChange={(e) => setSpecialTaskForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stDesc">{t('taskDescription')}</Label>
              <Textarea
                id="stDesc"
                value={specialTaskForm.description}
                onChange={(e) => setSpecialTaskForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stDuration">{t('dueDate')}</Label>
              <Input
                id="stDuration"
                type="number"
                min={1}
                step={1}
                value={specialTaskForm.durationMinutes}
                onChange={(e) => setSpecialTaskForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsSpecialTaskDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit">{t('save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('editPlannedVisits')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVisitSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">{t('patient')}</Label>
              <Select
                value={visitFormData.patientId}
                onValueChange={(value) => {
                  const nextListId = visitFormData.listId || currentList?.id || lists.find((l) => l.active)?.id || '';
                  const next = { ...visitFormData, patientId: value, listId: nextListId };
                  setVisitFormData(next);
                  if (value && nextListId) reloadGridFromSelection({ patientId: value, listId: nextListId });
                  if (!value) setVisitGridRows([]);
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPatient')} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listId">{t('list')}</Label>
              <Select
                value={visitFormData.listId}
                onValueChange={(value) => {
                  const next = { ...visitFormData, listId: value };
                  setVisitFormData(next);
                  if (!value) {
                    setVisitGridRows([]);
                    return;
                  }
                  if (next.patientId) reloadGridFromSelection({ patientId: next.patientId, listId: value });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectList')} />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}{list.active ? '' : t('inactiveSuffix')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('weekdays')}</Label>
                <span className="text-xs text-muted-foreground">{t('clickPlusToAddTime')}</span>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {weekdayOptions.map((day) => (
                        <TableHead key={day.key} className="text-center">
                          {day.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitGridRows.map((row) => (
                      <TableRow key={row.rowId}>
                        {weekdayOptions.map((day) => {
                          const v = row.timesByWeekday[day.key];
                          const hasValue = v !== undefined;
                          const label = v === null ? t('noTimeSet') : v;

                          return (
                            <TableCell key={day.key} className="text-center">
                              {hasValue ? (
                                <Button
                                  type="button"
                                  variant={v === null ? 'outline' : 'secondary'}
                                  size="sm"
                                  className="h-7 px-3 rounded-full"
                                  onClick={() => openCellEditor({ rowId: row.rowId, weekday: day.key, currentValue: v })}
                                >
                                  {label}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openCellEditor({ rowId: row.rowId, weekday: day.key, currentValue: undefined })}
                                  aria-label={t('addTime')}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}

                    {/* New row: add a time in any weekday to create a row */}
                    <TableRow>
                      {weekdayOptions.map((day) => (
                        <TableCell key={day.key} className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openCellEditor({ rowId: null, weekday: day.key, currentValue: undefined })}
                            aria-label={t('addTime')}
                            disabled={!visitFormData.patientId || !visitFormData.listId}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsVisitDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit">
                {t('save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cellDialogOpen} onOpenChange={setCellDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{activeCell?.hasExistingValue ? t('editTime') : t('addTime')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cellTime">{t('visitTime')}</Label>
              <Input
                id="cellTime"
                type="time"
                value={cellTimeDraft}
                onChange={(e) => setCellTimeDraft(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                {activeCell?.rowId && activeCell?.hasExistingValue ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (!activeCell?.rowId) return;
                      removeCellTime({ rowId: activeCell.rowId, weekday: activeCell.weekday });
                      setCellDialogOpen(false);
                      setActiveCell(null);
                    }}
                  >
                    {t('removeTime')}
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCellDialogOpen(false);
                    setActiveCell(null);
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!activeCell) return;
                    const time = cellTimeDraft.trim() ? cellTimeDraft : '08:00';

                    if (activeCell.rowId) {
                      applyCellTime({ rowId: activeCell.rowId, weekday: activeCell.weekday, time });
                    } else {
                      const newRowId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                      setVisitGridRows((prev) => [
                        ...prev,
                        {
                          rowId: newRowId,
                          timesByWeekday: { [activeCell.weekday]: time },
                        },
                      ]);
                    }

                    setCellDialogOpen(false);
                    setActiveCell(null);
                  }}
                >
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSingleVisitDialogOpen} onOpenChange={setIsSingleVisitDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('editVisit')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="singleVisitTime">{t('visitTime')}</Label>
              <Input
                id="singleVisitTime"
                type="time"
                value={singleVisitDraft.time}
                onChange={(e) => setSingleVisitDraft((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="singleVisitList">{t('list')}</Label>
              <Select
                value={singleVisitDraft.listId}
                onValueChange={(value) => setSingleVisitDraft((prev) => ({ ...prev, listId: value }))}
              >
                <SelectTrigger id="singleVisitList">
                  <SelectValue placeholder={t('selectList')} />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}{list.active ? '' : t('inactiveSuffix')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (!editingVisit) return;
                  if (!confirm(t('confirmDeleteVisit'))) return;
                  deleteVisit(editingVisit.id);
                  setIsSingleVisitDialogOpen(false);
                  setEditingVisit(null);
                }}
              >
                {t('delete')}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSingleVisitDialogOpen(false);
                    setEditingVisit(null);
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button type="button" onClick={saveSingleVisitEdits}>
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between gap-6">
          <CardTitle>{t('visitListsTitle')}</CardTitle>
          <div className="flex items-center justify-end gap-2">
            <Input
              value={visitListSearch}
              onChange={(e) => setVisitListSearch(e.target.value)}
              placeholder={t('searchPatients')}
              className="w-[240px]"
            />
            <Button onClick={() => handleOpenVisitDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addVisit')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('patient')}</TableHead>
                <TableHead>{t('weekdays')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisitGroups.map((row) => {
                const patient = patients.find((p) => p.id === row.patientId);

                return (
                  <TableRow key={row.patientId}>
                    <TableCell>{patient?.name || row.patientName || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {row.visits.map((visit) => {
                          const timeLabel = visit.time?.trim() ? visit.time : '—';
                          const listName = lists.find((l) => l.id === visit.listId)?.name ?? 'Unknown list';
                          return (
                            <div key={visit.id} className="flex flex-wrap items-center gap-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-3 rounded-full"
                                onClick={() => openSingleVisitEditor(visit)}
                                title={t('editVisit')}
                              >
                                {timeLabel}
                              </Button>
                              <Badge variant="outline" className="text-xs">
                                {listName}
                              </Badge>
                              {formatWeekdays(visit.weekdays).map((label) => (
                                <Badge key={`${visit.id}-${label}`} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const preferredListId = currentList?.id ?? lists.find((l) => l.active)?.id ?? '';
                            const fallbackExistingListId = getAnyListIdForPatient(row.patientId);
                            const listId = preferredListId || fallbackExistingListId || '';
                            setVisitFormData({ patientId: row.patientId, listId });
                            if (row.patientId && listId) reloadGridFromSelection({ patientId: row.patientId, listId });
                            setIsVisitDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}