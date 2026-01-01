import React, { useEffect, useMemo, useState } from 'react';
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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu';
import { Plus, Pencil, Trash2, FilePenLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { t } from '../i18n';
import { getListColorStyle } from '../utils/listColors';

import clipboardStarIcon from '../../../images/clipboard_start_icon.png';

export function AdminPatients(props: { onEditCarePlan?: (patientId: string) => void }) {
  const { patients, employees, lists, visits, currentList, addPatient, updatePatient, deletePatient, addTask, addVisit, updateVisit, deleteVisit } = useApp();
  const { onEditCarePlan } = props;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [visitListSearch, setVisitListSearch] = useState('');

  const PAGE_SIZE = 10;
  const [patientsPage, setPatientsPage] = useState(1);
  const [visitGroupsPage, setVisitGroupsPage] = useState(1);

  const [isSpecialTaskDialogOpen, setIsSpecialTaskDialogOpen] = useState(false);
  const [specialTaskPatient, setSpecialTaskPatient] = useState<Patient | null>(null);
  const [specialTaskListTouched, setSpecialTaskListTouched] = useState(false);
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

  const parseTimeToMinutes = (time: string): number | null => {
    const trimmed = String(time ?? '').trim();
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (!m) return null;
    const hours = Number(m[1]);
    const minutes = Number(m[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const timeIsAfterEveningRecommendationCutoff = (time: string): boolean => {
    const mins = parseTimeToMinutes(time);
    if (mins === null) return false;
    return mins >= 14 * 60 + 30;
  };

  const toEveningListId = (baseId: string): string => `${baseId}-evening`;
  const toDayListId = (eveningId: string): string => eveningId.endsWith('-evening') ? eveningId.slice(0, -'-evening'.length) : eveningId;

  const recommendListIdForSpecialTask = (args: { patientId: string; time: string }): string | null => {
    const target = parseTimeToMinutes(args.time);
    if (target === null) return null;

    const activeListIds = new Set(lists.filter((l) => l.active).map((l) => l.id));

    let best: { listId: string; diff: number } | null = null;
    for (const v of visits) {
      if (v.patientId !== args.patientId) continue;
      if (!activeListIds.has(v.listId)) continue;
      if (!v.time) continue;
      if (v.kind === 'special-task') continue;

      const mins = parseTimeToMinutes(v.time);
      if (mins === null) continue;
      const diff = Math.abs(mins - target);
      if (!best || diff < best.diff) best = { listId: v.listId, diff };
    }

    const picked = best?.listId ?? null;
    if (!picked) return null;

    if (!timeIsAfterEveningRecommendationCutoff(args.time)) return picked;

    // After 14:30 we always recommend an evening list.
    const baseId = toDayListId(picked);
    const eveningId = toEveningListId(baseId);
    if (activeListIds.has(eveningId)) return eveningId;
    return picked;
  };

  type VisitGridRow = {
    rowId: string;
    listId: string;
    time: string | null;
    description: string;
    weekdays: Partial<Record<Weekday, true>>;
  };

  const makeRowId = (args: { listId: string; time: string | null }) => {
    const timeKey = args.time === null ? '__null__' : args.time;
    return `${args.listId}::${timeKey}`;
  };

  const normalizeVisitGridRows = (rows: VisitGridRow[]): VisitGridRow[] => {
    const byKey = new Map<string, VisitGridRow>();
    const order: string[] = [];

    for (const row of rows) {
      const listId = String(row.listId);
      const time = row.time === null ? null : String(row.time);
      const key = makeRowId({ listId, time });
      const existing = byKey.get(key);
      if (!existing) order.push(key);

      const mergedWeekdays: Partial<Record<Weekday, true>> = {
        ...(existing?.weekdays ?? {}),
        ...(row.weekdays ?? {}),
      };

      const existingDesc = typeof existing?.description === 'string' ? existing.description : '';
      const nextDesc = typeof row.description === 'string' ? row.description : '';
      const mergedDescription = existingDesc.trim() ? existingDesc : nextDesc;

      byKey.set(key, {
        rowId: key,
        listId,
        time,
        description: mergedDescription,
        weekdays: mergedWeekdays,
      });
    }

    const result: VisitGridRow[] = [];
    for (const key of order) {
      const row = byKey.get(key);
      if (!row) continue;
      if (Object.keys(row.weekdays).length === 0) continue;
      result.push(row);
    }

    return result.sort((a, b) => {
      const aMins = a.time ? parseTimeToMinutes(a.time) : null;
      const bMins = b.time ? parseTimeToMinutes(b.time) : null;

      const aKey = aMins === null ? Number.POSITIVE_INFINITY : aMins;
      const bKey = bMins === null ? Number.POSITIVE_INFINITY : bMins;
      if (aKey !== bKey) return aKey - bKey;

      return String(a.listId).localeCompare(String(b.listId));
    });
  };

  const [visitGridRows, setVisitGridRows] = useState<VisitGridRow[]>([]);
  const [cellDialogOpen, setCellDialogOpen] = useState(false);
  const [copiedPlannedVisit, setCopiedPlannedVisit] = useState<{ time: string; description: string } | null>(null);
  const [activeCell, setActiveCell] = useState<{
    rowId: string | null;
    weekday: Weekday;
    hasExistingValue: boolean;
  } | null>(null);
  const [cellTimeDraft, setCellTimeDraft] = useState('08:00');
  const [cellDescriptionDraft, setCellDescriptionDraft] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    address: '',
    phone: '',
    diagnosis: '',
    admissionDate: '',
    assignedEmployee: '',
    tags: [] as string[],
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

  const filteredPatientsSorted = useMemo(() => {
    return [...filteredPatients].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredPatients]);

  useEffect(() => {
    setPatientsPage(1);
  }, [patientSearch]);

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

  useEffect(() => {
    setVisitGroupsPage(1);
  }, [visitListSearch]);

  const patientsPageCount = Math.max(1, Math.ceil(filteredPatientsSorted.length / PAGE_SIZE));
  const patientsPageSafe = Math.min(Math.max(1, patientsPage), patientsPageCount);
  const pagedPatients = filteredPatientsSorted.slice((patientsPageSafe - 1) * PAGE_SIZE, patientsPageSafe * PAGE_SIZE);

  useEffect(() => {
    if (patientsPage !== patientsPageSafe) setPatientsPage(patientsPageSafe);
  }, [patientsPage, patientsPageSafe]);

  const visitGroupsPageCount = Math.max(1, Math.ceil(filteredVisitGroups.length / PAGE_SIZE));
  const visitGroupsPageSafe = Math.min(Math.max(1, visitGroupsPage), visitGroupsPageCount);
  const pagedVisitGroups = filteredVisitGroups.slice((visitGroupsPageSafe - 1) * PAGE_SIZE, visitGroupsPageSafe * PAGE_SIZE);

  useEffect(() => {
    if (visitGroupsPage !== visitGroupsPageSafe) setVisitGroupsPage(visitGroupsPageSafe);
  }, [visitGroupsPage, visitGroupsPageSafe]);

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
    const rows: VisitGridRow[] = [];
    for (const visit of existing) {
      const time = typeof visit.time === 'string' && visit.time.trim() ? visit.time.trim() : null;
      const weekdays: Partial<Record<Weekday, true>> = {};
      for (const d of visit.weekdays) {
        weekdays[d] = true;
      }
      rows.push({
        rowId: makeRowId({ listId: visit.listId, time }),
        listId: visit.listId,
        time,
        description: (visit.description ?? '').trim(),
        weekdays,
      });
    }
    return normalizeVisitGridRows(rows);
  };

  const buildVisitsFromGridRows = (args: {
    rows: VisitGridRow[];
    patient: Patient;
  }): Visit[] => {
    const { rows, patient } = args;

    const result: Visit[] = [];
    for (const row of rows) {
      const weekdays = (Object.keys(row.weekdays) as Weekday[]).filter((d) => row.weekdays[d]);
      if (!weekdays.length) continue;
      result.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        patientId: patient.id,
        patientName: patient.name,
        listId: row.listId,
        weekdays,
        time: row.time ?? undefined,
        description: row.description.trim() ? row.description.trim() : undefined,
      });
    }
    return result;
  };

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        ...patient,
        assignedEmployee: patient.assignedEmployee || 'unassigned',
        tags: Array.isArray(patient.tags) ? patient.tags : [],
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
        tags: [],
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
      tags: Array.isArray(formData.tags) && formData.tags.length ? formData.tags : undefined,
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
    setVisitFormData({ patientId });
    const existing = visits.filter((v) => v.patientId === patientId).filter((v) => v.kind !== 'special-task');
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
    const defaultTime = '09:00';
    const recommendedListId = recommendListIdForSpecialTask({ patientId: patient.id, time: defaultTime });
    const preferredListId = currentList?.id ?? lists.find(l => l.active)?.id ?? '';
    const fallbackExistingListId = getAnyListIdForPatient(patient.id);
    const listId = recommendedListId || preferredListId || fallbackExistingListId || '';

    setSpecialTaskPatient(patient);
    setSpecialTaskListTouched(false);
    setSpecialTaskForm({
      listId,
      time: defaultTime,
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

  const recommendedSpecialTaskListId = useMemo(() => {
    if (!isSpecialTaskDialogOpen || !specialTaskPatient) return null;
    return recommendListIdForSpecialTask({ patientId: specialTaskPatient.id, time: specialTaskForm.time });
  }, [isSpecialTaskDialogOpen, specialTaskPatient, specialTaskForm.time, visits, lists]);

  const recommendedSpecialTaskListName = useMemo(() => {
    if (!recommendedSpecialTaskListId) return null;
    return lists.find((l) => l.id === recommendedSpecialTaskListId)?.name ?? null;
  }, [recommendedSpecialTaskListId, lists]);

  useEffect(() => {
    if (!isSpecialTaskDialogOpen || !specialTaskPatient) return;
    if (specialTaskListTouched) return;
    if (!recommendedSpecialTaskListId) return;
    if (specialTaskForm.listId === recommendedSpecialTaskListId) return;
    setSpecialTaskForm((p) => ({ ...p, listId: recommendedSpecialTaskListId }));
  }, [isSpecialTaskDialogOpen, specialTaskPatient, specialTaskListTouched, recommendedSpecialTaskListId, specialTaskForm.listId]);

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
    hasExistingValue: boolean;
    currentTime: string | null;
    currentListId: string;
    currentDescription: string;
  }) => {
    setActiveCell({
      rowId: args.rowId,
      weekday: args.weekday,
      hasExistingValue: args.hasExistingValue,
    });
    setCellTimeDraft(args.currentTime && args.currentTime !== null ? args.currentTime : '08:00');
    setCellListDraft(args.currentListId);
    setCellDescriptionDraft(args.currentDescription ?? '');
    setCellDialogOpen(true);
  };

  const defaultPlannedVisitListId = useMemo(() => {
    return currentList?.id ?? lists.find((l) => l.active)?.id ?? lists[0]?.id ?? '';
  }, [currentList?.id, lists]);

  const listColorStyle = (args: { listId: string; time?: string | null }) => {
    const listId = args.listId;
    const list = lists.find((l) => l.id === listId);
    const token = list?.color;

    // Some older planned visits may still be stored on the base (day) list even if they
    // belong to the evening list by time. Render them as "evening" when an evening sibling exists.
    const explicitEvening = Boolean(list?.isEvening) || String(listId).endsWith('-evening');
    const baseId = String(listId).endsWith('-evening') ? String(listId).slice(0, -'-evening'.length) : String(listId);
    const hasEveningSibling = lists.some((l) => l.id === `${baseId}-evening`);
    const mins = args.time ? parseTimeToMinutes(args.time) : null;
    const timeSuggestsEvening = mins !== null && mins >= 14 * 60 + 30;
    const isEvening = explicitEvening || (hasEveningSibling && timeSuggestsEvening);

    return token ? getListColorStyle(token, { isEvening }) : ({ backgroundColor: 'var(--muted)' } as const);
  };

  const listNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lists) map.set(l.id, l.name);
    return map;
  }, [lists]);

  const [cellListDraft, setCellListDraft] = useState<string>('');

  const applyCell = (args: {
    fromRowId: string | null;
    weekday: Weekday;
    time: string | null;
    listId: string;
    description: string;
  }) => {
    const nextListId = args.listId;
    if (!nextListId) return;

    const nextDescription = String(args.description ?? '');

    setVisitGridRows((prev) => {
      const rows = [...prev];

      // Remove from source row if needed.
      if (args.fromRowId) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].rowId !== args.fromRowId) continue;
          const nextWeekdays = { ...rows[i].weekdays };
          delete nextWeekdays[args.weekday];
          rows[i] = { ...rows[i], weekdays: nextWeekdays };
          break;
        }
      }

      // Add into target row.
      const targetRowId = makeRowId({ listId: nextListId, time: args.time });
      const targetIndex = rows.findIndex((r) => r.rowId === targetRowId);
      if (targetIndex >= 0) {
        rows[targetIndex] = {
          ...rows[targetIndex],
          description: nextDescription,
          weekdays: { ...rows[targetIndex].weekdays, [args.weekday]: true },
        };
      } else {
        rows.push({
          rowId: targetRowId,
          listId: nextListId,
          time: args.time,
          description: nextDescription,
          weekdays: { [args.weekday]: true },
        });
      }

      return normalizeVisitGridRows(rows);
    });
  };

  const pasteCopiedPlannedVisitTime = (args: { rowId: string | null; weekday: Weekday }) => {
    if (!copiedPlannedVisit) return;

    // If pasting into an existing row, keep its listId.
    if (args.rowId) {
      setVisitGridRows((prev) => {
        const sourceRow = prev.find((r) => r.rowId === args.rowId);
        const listId = sourceRow?.listId ?? defaultPlannedVisitListId;
        if (!listId) return prev;

        const rows = [...prev];
        // Remove from the source row.
        if (args.rowId) {
          for (let i = 0; i < rows.length; i++) {
            if (rows[i].rowId !== args.rowId) continue;
            const nextWeekdays = { ...rows[i].weekdays };
            delete nextWeekdays[args.weekday];
            rows[i] = { ...rows[i], weekdays: nextWeekdays };
            break;
          }
        }

        // Add into the target row with the copied time.
        const targetRowId = makeRowId({ listId, time: copiedPlannedVisit.time });
        const targetIndex = rows.findIndex((r) => r.rowId === targetRowId);
        if (targetIndex >= 0) {
          rows[targetIndex] = {
            ...rows[targetIndex],
            description: copiedPlannedVisit.description,
            weekdays: { ...rows[targetIndex].weekdays, [args.weekday]: true },
          };
        } else {
          rows.push({
            rowId: targetRowId,
            listId,
            time: copiedPlannedVisit.time,
            description: copiedPlannedVisit.description,
            weekdays: { [args.weekday]: true },
          });
        }

        return normalizeVisitGridRows(rows);
      });
      return;
    }

    applyCell({
      fromRowId: null,
      weekday: args.weekday,
      time: copiedPlannedVisit.time,
      listId: defaultPlannedVisitListId,
      description: copiedPlannedVisit.description,
    });
  };

  const removeCell = (args: { rowId: string; weekday: Weekday }) => {
    setVisitGridRows((prev) => {
      const next = prev
        .map((row) => {
          if (row.rowId !== args.rowId) return row;
          const nextWeekdays = { ...row.weekdays };
          delete nextWeekdays[args.weekday];
          return { ...row, weekdays: nextWeekdays };
        })
        .filter((row) => Object.keys(row.weekdays).length > 0);

      return normalizeVisitGridRows(next);
    });
  };

  const reloadGridForPatient = (patientId: string) => {
    const existing = visits.filter((v) => v.patientId === patientId).filter((v) => v.kind !== 'special-task');
    setVisitGridRows(buildGridRowsFromVisits(existing));
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === visitFormData.patientId);
    if (!patient) return;

    const existing = visits.filter((v) => v.patientId === patient.id).filter((v) => v.kind !== 'special-task');
    for (const v of existing) {
      deleteVisit(v.id);
    }

    const nextVisits = buildVisitsFromGridRows({
      rows: visitGridRows,
      patient,
    });

    for (const v of nextVisits) {
      addVisit(v);
    }

    setVisitFormData({
      patientId: '',
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
                <Label>{t('tags')}</Label>
                <div className="flex flex-wrap gap-3">
                  {['HLR-', 'RESP-', 'DIA', 'DIA 2'].map((tag) => {
                    const checked = formData.tags.includes(tag);
                    return (
                      <label key={tag} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const nextChecked = v === true;
                            setFormData((p) => {
                              const next = new Set(p.tags);
                              if (nextChecked) next.add(tag);
                              else next.delete(tag);
                              return { ...p, tags: Array.from(next) };
                            });
                          }}
                        />
                        {tag}
                      </label>
                    );
                  })}
                </div>
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
              <TableHead>{t('assignedNurse')}</TableHead>
              <TableHead>{t('diagnosis')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedPatients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>{patient.name}</TableCell>
                <TableCell>{getAgeFromBirthDate(patient.birthDate) ?? '—'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{patient.phone}</div>
                    <div className="text-muted-foreground text-xs">{patient.address}</div>
                  </div>
                </TableCell>
                <TableCell>{getAssignedEmployeeName(patient.assignedEmployee)}</TableCell>
                <TableCell>{patient.diagnosis}</TableCell>
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

      {filteredPatientsSorted.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {Math.min((patientsPageSafe - 1) * PAGE_SIZE + 1, filteredPatientsSorted.length)}-
            {Math.min(patientsPageSafe * PAGE_SIZE, filteredPatientsSorted.length)} / {filteredPatientsSorted.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPatientsPage((p) => Math.max(1, p - 1))}
              disabled={patientsPageSafe <= 1}
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              {patientsPageSafe} / {patientsPageCount}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPatientsPage((p) => Math.min(patientsPageCount, p + 1))}
              disabled={patientsPageSafe >= patientsPageCount}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stTime">{t('time')}</Label>
                <Input
                  id="stTime"
                  type="time"
                  value={specialTaskForm.time}
                  onChange={(e) => {
                    const nextTime = e.target.value;
                    setSpecialTaskForm((p) => ({ ...p, time: nextTime }));
                  }}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="stList">{t('list')}</Label>
                {recommendedSpecialTaskListName && (
                  <span className="text-xs text-muted-foreground">
                    {t('recommendedList', { name: recommendedSpecialTaskListName })}
                  </span>
                )}
              </div>
              <Select
                value={specialTaskForm.listId}
                onValueChange={(value) => {
                  setSpecialTaskListTouched(true);
                  setSpecialTaskForm((p) => ({ ...p, listId: value }));
                }}
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
                  const next = { ...visitFormData, patientId: value };
                  setVisitFormData(next);
                  if (value) reloadGridForPatient(value);
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
                          const hasValue = Boolean(row.weekdays[day.key]);
                          const timeLabel = row.time === null ? t('noTimeSet') : row.time;
                          const listLabel = listNameById.get(row.listId) ?? row.listId;

                          return (
                            <TableCell key={day.key} className="text-center">
                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  {hasValue ? (
                                    <Button
                                      type="button"
                                      variant={row.time === null ? 'outline' : 'secondary'}
                                      size="sm"
                                      className={
                                        row.time === null
                                          ? 'h-7 px-3 rounded-full border-transparent'
                                          : 'h-7 px-3 rounded-full'
                                      }
                                      title={listLabel}
                                      style={row.time === null ? undefined : listColorStyle({ listId: row.listId, time: row.time })}
                                      onClick={() =>
                                        openCellEditor({
                                          rowId: row.rowId,
                                          weekday: day.key,
                                          hasExistingValue: true,
                                          currentTime: row.time,
                                          currentListId: row.listId,
                                          currentDescription: row.description,
                                        })
                                      }
                                    >
                                      {timeLabel}
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      title={listLabel}
                                      onClick={() =>
                                        openCellEditor({
                                          rowId: row.rowId,
                                          weekday: day.key,
                                          hasExistingValue: false,
                                          currentTime: row.time,
                                          currentListId: row.listId,
                                          currentDescription: row.description,
                                        })
                                      }
                                      aria-label={t('addTime')}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  )}
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    disabled={typeof row.time !== 'string' || !row.time.trim()}
                                    onSelect={() => {
                                      if (typeof row.time !== 'string') return;
                                      const trimmed = row.time.trim();
                                      if (!trimmed) return;
                                      setCopiedPlannedVisit({ time: trimmed, description: row.description ?? '' });
                                    }}
                                  >
                                    {t('copyTime')}
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    disabled={!copiedPlannedVisit}
                                    onSelect={() => {
                                      pasteCopiedPlannedVisitTime({ rowId: row.rowId, weekday: day.key });
                                    }}
                                  >
                                    {t('pasteTime')}
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}

                    {/* New row: add a time in any weekday to create a row */}
                    <TableRow>
                      {weekdayOptions.map((day) => (
                        <TableCell key={day.key} className="text-center">
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  openCellEditor({
                                    rowId: null,
                                    weekday: day.key,
                                    hasExistingValue: false,
                                    currentTime: null,
                                    currentListId: defaultPlannedVisitListId,
                                    currentDescription: '',
                                  })
                                }
                                aria-label={t('addTime')}
                                disabled={!visitFormData.patientId}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem disabled>{t('copyTime')}</ContextMenuItem>
                              <ContextMenuItem
                                disabled={!copiedPlannedVisit || !visitFormData.patientId}
                                onSelect={() => {
                                  pasteCopiedPlannedVisitTime({ rowId: null, weekday: day.key });
                                }}
                              >
                                {t('pasteTime')}
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
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

            <div className="space-y-2">
              <Label htmlFor="cellList">{t('list')}</Label>
              <Select value={cellListDraft} onValueChange={(v) => setCellListDraft(v)}>
                <SelectTrigger id="cellList">
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
              <Label htmlFor="cellDescription">{t('visitDescription')}</Label>
              <Input
                id="cellDescription"
                value={cellDescriptionDraft}
                onChange={(e) => setCellDescriptionDraft(e.target.value)}
                className="h-8"
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
                      removeCell({ rowId: activeCell.rowId, weekday: activeCell.weekday });
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

                    const listId = cellListDraft || defaultPlannedVisitListId;
                    if (!listId) return;

                    applyCell({
                      fromRowId: activeCell.rowId,
                      weekday: activeCell.weekday,
                      time,
                      listId,
                      description: cellDescriptionDraft,
                    });

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
              {pagedVisitGroups.map((row) => {
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
                                className="h-7 px-3 rounded-full border-transparent"
                                onClick={() => openSingleVisitEditor(visit)}
                                title={t('editVisit')}
                              >
                                {timeLabel}
                              </Button>
                              <Badge
                                variant="outline"
                                className="text-xs border-transparent"
                                style={listColorStyle({ listId: visit.listId, time: visit.time ?? null })}
                              >
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
                            setVisitFormData({ patientId: row.patientId });
                            if (row.patientId) reloadGridForPatient(row.patientId);
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

          {filteredVisitGroups.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-muted-foreground">
                {Math.min((visitGroupsPageSafe - 1) * PAGE_SIZE + 1, filteredVisitGroups.length)}-
                {Math.min(visitGroupsPageSafe * PAGE_SIZE, filteredVisitGroups.length)} / {filteredVisitGroups.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisitGroupsPage((p) => Math.max(1, p - 1))}
                  disabled={visitGroupsPageSafe <= 1}
                >
                  Previous
                </Button>
                <div className="text-xs text-muted-foreground">
                  {visitGroupsPageSafe} / {visitGroupsPageCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisitGroupsPage((p) => Math.min(visitGroupsPageCount, p + 1))}
                  disabled={visitGroupsPageSafe >= visitGroupsPageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}