import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Employee, Patient, Task, PatientDocument, Visit, VisitList, Weekday } from '../types';
import { getDevDummyData } from './devDummyData';

const EVENING_LIST_ID_SUFFIX = '-evening';
const EVENING_LIST_NAME_SUFFIX = ' (evening)';
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

const isEveningListId = (id: string): boolean => id.endsWith(EVENING_LIST_ID_SUFFIX);
const toEveningListId = (baseId: string): string => `${baseId}${EVENING_LIST_ID_SUFFIX}`;

const normalizeListIsEvening = (list: VisitList): VisitList => {
  const derived = isEveningListId(list.id);
  if (list.isEvening === derived) return list;
  return { ...list, isEvening: derived };
};

const toEveningListName = (name: string): string => {
  const trimmed = String(name).trim();
  if (!trimmed) return EVENING_LIST_NAME_SUFFIX.trim();
  return trimmed.endsWith(EVENING_LIST_NAME_SUFFIX) ? trimmed : `${trimmed}${EVENING_LIST_NAME_SUFFIX}`;
};

const ensureEveningSiblingLists = (items: VisitList[]): VisitList[] => {
  const byId = new Map(items.map((l) => [l.id, l] as const));
  const next: VisitList[] = [...items];

  for (const baseRaw of items) {
    const base = normalizeListIsEvening(baseRaw);
    if (isEveningListId(base.id)) continue;
    const siblingId = toEveningListId(base.id);
    if (byId.has(siblingId)) continue;

    const sibling: VisitList = {
      id: siblingId,
      name: toEveningListName(base.name),
      description: base.description,
      active: base.active,
      isEvening: true,
      color: base.color,
    };
    byId.set(siblingId, sibling);
    next.push(sibling);
  }

  return next.map(normalizeListIsEvening);
};

const normalizeVisitListId = (visit: Visit): Visit => {
  if (!visit.listId) return visit;
  if (!visit.time) return visit;

  const baseId = isEveningListId(visit.listId)
    ? visit.listId.slice(0, -EVENING_LIST_ID_SUFFIX.length)
    : visit.listId;

  if (isAfterEveningCutoff(visit.time ?? null)) {
    const desired = toEveningListId(baseId);
    return visit.listId === desired ? visit : { ...visit, listId: desired };
  }

  // If it is not after the cutoff, it belongs to the base (day) list.
  return visit.listId === baseId ? visit : { ...visit, listId: baseId };
};

const normalizeTaskListId = (task: Task): Task => {
  if (!task.listId) return task;

  const baseId = isEveningListId(task.listId)
    ? task.listId.slice(0, -EVENING_LIST_ID_SUFFIX.length)
    : task.listId;

  const timeKey = (task.visitTime ?? '').trim();
  const shouldBeEvening = timeKey && timeKey !== 'general' && isAfterEveningCutoff(timeKey);
  const desired = shouldBeEvening ? toEveningListId(baseId) : baseId;
  return task.listId === desired ? task : { ...task, listId: desired };
};

interface AppContextType {
  employees: Employee[];
  currentEmployee: Employee | null;
  patients: Patient[];
  tasks: Task[];
  documents: PatientDocument[];
  lists: VisitList[];
  visits: Visit[];
  currentList: VisitList | null;
  listPatientAssignments: Record<string, string[]>;
  effectiveWeekday: Weekday;
  devWeekdayOverride: Weekday | null;
  shiftDevWeekday: (delta: -1 | 1) => void;
  clearDevWeekdayOverride: () => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  setCurrentEmployee: (employee: Employee | null) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addDocument: (document: PatientDocument) => void;
  updateDocument: (id: string, document: Partial<PatientDocument>) => void;
  addList: (list: VisitList) => void;
  updateList: (id: string, list: Partial<VisitList>) => void;
  deleteList: (id: string) => void;
  addVisit: (visit: Visit) => void;
  updateVisit: (id: string, visit: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  setCurrentList: (list: VisitList | null) => void;
  assignPatientToList: (listId: string, patientId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type SeedEmployee = Omit<Employee, 'username' | 'password'> & Partial<Pick<Employee, 'username' | 'password'>>;

const normalizeForUsername = (input: string): string => {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
};

const baseUsernameFromName = (name: string): string => {
  const parts = String(name)
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const first = normalizeForUsername(parts[0] ?? '');
  const last = normalizeForUsername(parts.length > 1 ? parts[parts.length - 1] : '');

  const first2 = first.slice(0, 2);
  const last2 = last.slice(0, 2);

  const base = `${first2}${last2}`.trim();
  if (base.length >= 4) return base;
  if (first) return first.slice(0, 4);
  return 'user';
};

const uniqueUsername = (base: string, taken: Set<string>): string => {
  const cleaned = normalizeForUsername(base) || 'user';
  if (!taken.has(cleaned)) return cleaned;

  let i = 2;
  while (taken.has(`${cleaned}${i}`)) i += 1;
  return `${cleaned}${i}`;
};

const ensureEmployeesHaveUsernames = (items: SeedEmployee[]): Employee[] => {
  const taken = new Set<string>();
  for (const e of items) {
    const existing = e.username ? normalizeForUsername(e.username) : '';
    if (existing) taken.add(existing);
  }

  return items.map((e) => {
    const existing = e.username ? normalizeForUsername(e.username) : '';
    if (existing) return { ...(e as Employee), username: existing };
    const base = baseUsernameFromName(e.name);
    const username = uniqueUsername(base, taken);
    taken.add(username);
    return { ...(e as Employee), username };
  });
};

const initialEmployeesSeed: SeedEmployee[] = [
  {
    id: 'dev',
    name: 'Dev',
    username: 'dev',
    role: 'Developer',
    phone: '',
    email: 'dev@local',
    status: 'active',
    hireDate: '2024-01-01',
  },
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Sykepleier',
    phone: '+47 912 34 567',
    email: 'sarah.j@homecure.com',
    status: 'active',
    hireDate: '2023-01-15',
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Helsefagarbeider',
    phone: '+47 913 45 678',
    email: 'michael.c@homecure.com',
    status: 'active',
    hireDate: '2023-03-20',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Pleiemedarbeider',
    phone: '+47 914 56 789',
    email: 'emily.r@homecure.com',
    status: 'active',
    hireDate: '2023-06-10',
  },
];

const initialEmployees: Employee[] = ensureEmployeesHaveUsernames(initialEmployeesSeed);

const devDummy = getDevDummyData();

const initialPatients: Patient[] = [
  {
    id: '1',
    name: 'Robert Williams',
    birthDate: '1953-01-01',
    address: '123 Oak Street, Springfield',
    phone: '+47 901 12 345',
    diagnosis: 'Oppfølging etter operasjon',
    admissionDate: '2024-12-15',
    assignedEmployee: '1',
  },
  {
    id: '2',
    name: 'Margaret Thompson',
    birthDate: '1957-01-01',
    address: '456 Maple Avenue, Springfield',
    phone: '+47 902 23 456',
    diagnosis: 'Diabetesoppfølging',
    admissionDate: '2024-11-20',
    assignedEmployee: '2',
  },
  {
    id: '3',
    name: 'James Anderson',
    birthDate: '1944-01-01',
    address: '789 Pine Road, Springfield',
    phone: '+47 903 34 567',
    diagnosis: 'Kronisk hjertesvikt',
    admissionDate: '2024-10-05',
    assignedEmployee: '1',
  },
  {
    id: '4',
    name: 'Helen Carter',
    birthDate: '1949-05-12',
    address: '22 Birch Lane, Springfield',
    phone: '+47 904 45 678',
    diagnosis: 'Sårstell og oppfølging',
    admissionDate: '2024-12-01',
    assignedEmployee: '3',
  },
  {
    id: '5',
    name: 'Daniel Price',
    birthDate: '1961-09-03',
    address: '9 River Street, Springfield',
    phone: '+47 905 56 789',
    diagnosis: 'KOLS – inhalasjonsoppfølging',
    admissionDate: '2024-11-10',
    assignedEmployee: '2',
  },
  {
    id: '6',
    name: 'Aisha Khan',
    birthDate: '1959-02-18',
    address: '401 Cedar Avenue, Springfield',
    phone: '+47 906 67 890',
    diagnosis: 'Medisinadministrasjon',
    admissionDate: '2024-12-18',
    assignedEmployee: '1',
  },
  {
    id: '7',
    name: 'Peter Hansen',
    birthDate: '1947-07-27',
    address: '77 Meadow Road, Springfield',
    phone: '+47 907 78 901',
    diagnosis: 'Fallforebygging og tilsyn',
    admissionDate: '2024-10-22',
    assignedEmployee: '3',
  },
  {
    id: '8',
    name: 'Linda Nguyen',
    birthDate: '1955-11-30',
    address: '15 Hillcrest Drive, Springfield',
    phone: '+47 908 89 012',
    diagnosis: 'Blodtrykksoppfølging',
    admissionDate: '2024-09-30',
    assignedEmployee: '2',
  },
  ...devDummy.patients,
];

const initialTasks: Task[] = [...devDummy.tasks];

const initialDocuments: PatientDocument[] = [
  {
    id: '1',
    patientId: '1',
    date: '2024-12-29',
    time: '09:00',
    documentedBy: 'list-1',
    documentedByName: 'List 1',
    vitalSigns: {
      temperature: '37,0°C',
      bloodPressure: '125/80',
      heartRate: '72',
      respiratoryRate: '16',
      oxygenSaturation: '98%',
    },
    medications: [
      { name: 'Paracet', dosage: '500 mg', time: '09:00' },
      { name: 'Antibiotika', dosage: '250 mg', time: '09:00' },
    ],
    activities: 'Gikk til badet med assistanse. Satt i stol i 30 minutter.',
    meals: 'Spiste ca. 75% av frokost. God appetitt.',
    notes: 'Operasjonssår gror fint. Ingen tegn til infeksjon. Pasienten oppgir smerte 3/10.',
  },
];

const initialLists: VisitList[] = [
  { id: 'list-1', name: 'List 1', description: 'Nord-rute', active: true, color: 'chart-1' },
  { id: 'list-2', name: 'List 2', description: 'Sør-rute', active: true, color: 'chart-2' },
  { id: 'list-3', name: 'List 3', description: 'Helgedekning', active: false, color: 'chart-3' },
];

const initialVisits: Visit[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Robert Williams',
    time: '09:00',
    weekdays: ['mon', 'wed', 'fri'],
    listId: 'list-1',
    description: 'Morgenbesøk – sårstell',
    notes: 'Morgenbesøk – sårstell',
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Margaret Thompson',
    time: '10:00',
    weekdays: ['tue', 'thu'],
    listId: 'list-2',
    description: 'Diabetesoppfølging',
    notes: 'Diabetesoppfølging',
  },
  {
    id: '3',
    patientId: '1',
    patientName: 'Robert Williams',
    time: '15:30',
    weekdays: ['tue'],
    listId: 'list-1',
    description: 'Ettermiddagsoppfølging',
    notes: 'Ettermiddagsoppfølging',
  },
  ...devDummy.visits,
];

const seededLists: VisitList[] = ensureEveningSiblingLists(initialLists).map(normalizeListIsEvening);
const seededVisits: Visit[] = initialVisits.map(normalizeVisitListId);
const seededTasks: Task[] = initialTasks.map(normalizeTaskListId);

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(() => initialEmployees.find((e) => e.id === 'dev') ?? initialEmployees[0] ?? null);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [tasks, setTasks] = useState<Task[]>(seededTasks);
  const [documents, setDocuments] = useState<PatientDocument[]>(initialDocuments);
  const [lists, setLists] = useState<VisitList[]>(seededLists);
  const [visits, setVisits] = useState<Visit[]>(seededVisits);
  const [currentList, setCurrentList] = useState<VisitList | null>(() => seededLists.find((l) => l.id === initialLists[0]?.id) ?? seededLists[0] ?? null);
  const [listPatientAssignments, setListPatientAssignments] = useState<Record<string, string[]>>({});

  // One-time normalization/migration (useful if state existed before the evening split logic,
  // e.g. during HMR or if visits/tasks were created before this change).
  useEffect(() => {
    setLists((prev) => ensureEveningSiblingLists(prev.map(normalizeListIsEvening)));
    setVisits((prev) => prev.map(normalizeVisitListId));
    setTasks((prev) => prev.map(normalizeTaskListId));
  }, []);

  const weekdayOrder: Weekday[] = useMemo(() => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], []);

  const getOsloWeekday = (): Weekday => {
    try {
      const weekdayStr = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'Europe/Oslo',
      }).format(new Date());

      const map: Record<string, Weekday> = {
        Mon: 'mon',
        Tue: 'tue',
        Wed: 'wed',
        Thu: 'thu',
        Fri: 'fri',
        Sat: 'sat',
        Sun: 'sun',
      };

      return map[weekdayStr] ?? 'mon';
    } catch {
      const local = new Date().getDay();
      const map: Record<number, Weekday> = {
        0: 'sun',
        1: 'mon',
        2: 'tue',
        3: 'wed',
        4: 'thu',
        5: 'fri',
        6: 'sat',
      };
      return map[local] ?? 'mon';
    }
  };

  const loadDevWeekdayOverride = (): Weekday | null => {
    try {
      const raw = window.localStorage.getItem('dev:weekdayOverride');
      if (!raw) return null;
      const v = raw.trim() as Weekday;
      return weekdayOrder.includes(v) ? v : null;
    } catch {
      return null;
    }
  };

  const [osloWeekday, setOsloWeekday] = useState<Weekday>(() => getOsloWeekday());
  const [devWeekdayOverride, setDevWeekdayOverride] = useState<Weekday | null>(() => loadDevWeekdayOverride());

  useEffect(() => {
    setOsloWeekday(getOsloWeekday());
  }, []);

  const effectiveWeekday: Weekday = devWeekdayOverride ?? osloWeekday;

  const persistDevWeekdayOverride = (next: Weekday | null) => {
    try {
      if (!next) {
        window.localStorage.removeItem('dev:weekdayOverride');
      } else {
        window.localStorage.setItem('dev:weekdayOverride', next);
      }
    } catch {
      // ignore
    }
  };

  const shiftDevWeekday = (delta: -1 | 1) => {
    const base = devWeekdayOverride ?? osloWeekday;
    const idx = weekdayOrder.indexOf(base);
    const safeIdx = idx >= 0 ? idx : 0;
    const nextIdx = (safeIdx + delta + weekdayOrder.length) % weekdayOrder.length;
    const next = weekdayOrder[nextIdx];
    setDevWeekdayOverride(next);
    persistDevWeekdayOverride(next);
  };

  const clearDevWeekdayOverride = () => {
    setDevWeekdayOverride(null);
    persistDevWeekdayOverride(null);
  };

  const addEmployee = (employee: Employee) => {
    setEmployees((prev) => {
      const taken = new Set(prev.map((e) => normalizeForUsername(e.username)));
      const provided = employee.username ? normalizeForUsername(employee.username) : '';
      const username = provided || uniqueUsername(baseUsernameFromName(employee.name), taken);
      return [...prev, { ...employee, username }];
    });
  };

  const updateEmployee = (id: string, updatedEmployee: Partial<Employee>) => {
    setEmployees(employees.map(emp => emp.id === id ? { ...emp, ...updatedEmployee } : emp));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id));
  };

  const addPatient = (patient: Patient) => {
    setPatients([...patients, patient]);
  };

  const updatePatient = (id: string, updatedPatient: Partial<Patient>) => {
    setPatients(patients.map(pat => pat.id === id ? { ...pat, ...updatedPatient } : pat));
  };

  const deletePatient = (id: string) => {
    setPatients((prev) => prev.filter((pat) => pat.id !== id));
    setVisits((prev) => prev.filter((v) => v.patientId !== id));
    setTasks((prev) => prev.filter((t) => t.patientId !== id));
    setDocuments((prev) => prev.filter((d) => d.patientId !== id));
    setListPatientAssignments((prev) => {
      const next: Record<string, string[]> = {};
      for (const [listId, ids] of Object.entries(prev)) {
        const filtered = (ids ?? []).filter((pid) => pid !== id);
        if (filtered.length) next[listId] = filtered;
      }
      return next;
    });
  };

  const addTask = (task: Task) => {
    setTasks((prev) => [...prev, normalizeTaskListId(task)]);
  };

  const updateTask = (id: string, updatedTask: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        return normalizeTaskListId({ ...task, ...updatedTask } as Task);
      }),
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const addDocument = (document: PatientDocument) => {
    setDocuments([...documents, document]);
  };

  const updateDocument = (id: string, updatedDocument: Partial<PatientDocument>) => {
    setDocuments(documents.map(doc => doc.id === id ? { ...doc, ...updatedDocument } : doc));
  };

  const addList = (list: VisitList) => {
    setLists((prev) => {
      const next = [...prev, list];
      return ensureEveningSiblingLists(next);
    });
  };

  const updateList = (id: string, updatedList: Partial<VisitList>) => {
    setLists((prev) => {
      const next = prev.map((list) => (list.id === id ? { ...list, ...updatedList } : list));

      if (!isEveningListId(id)) {
        const siblingId = toEveningListId(id);
        const base = next.find((l) => l.id === id);
        if (base) {
          const siblingName = toEveningListName(base.name);
          return next.map((l) =>
            l.id === siblingId
              ? {
                  ...l,
                  name: siblingName,
                  description: base.description,
                  active: base.active,
                  color: base.color,
                }
              : l,
          );
        }
      }

      return next;
    });

    setCurrentList((prev) => (prev && prev.id === id ? { ...prev, ...updatedList } : prev));
  };

  const deleteList = (id: string) => {
    const idsToDelete = isEveningListId(id) ? [id] : [id, toEveningListId(id)];

    setLists((prev) => prev.filter((list) => !idsToDelete.includes(list.id)));
    setVisits((prev) => prev.filter((visit) => !idsToDelete.includes(visit.listId)));
    setTasks((prev) => prev.filter((task) => !idsToDelete.includes(task.listId)));
    setListPatientAssignments((prev) => {
      const next = { ...prev };
      for (const delId of idsToDelete) delete next[delId];
      return next;
    });
    setCurrentList((prev) => {
      if (!prev) return prev;
      return idsToDelete.includes(prev.id) ? null : prev;
    });
  };

  const assignPatientToList = (listId: string, patientId: string) => {
    if (!listId || !patientId) return;
    setListPatientAssignments((prev) => {
      const existing = prev[listId] ?? [];
      if (existing.includes(patientId)) return prev;
      return { ...prev, [listId]: [...existing, patientId] };
    });
  };

  const addVisit = (visit: Visit) => {
    setVisits((prev) => [...prev, normalizeVisitListId(visit)]);
  };

  const updateVisit = (id: string, updatedVisit: Partial<Visit>) => {
    setVisits((prev) =>
      prev.map((vis) => {
        if (vis.id !== id) return vis;
        return normalizeVisitListId({ ...vis, ...updatedVisit } as Visit);
      }),
    );
  };

  const deleteVisit = (id: string) => {
    setVisits((prev) => prev.filter((vis) => vis.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        employees,
        currentEmployee,
        patients,
        tasks,
        documents,
        lists,
        visits,
        currentList,
        listPatientAssignments,
        effectiveWeekday,
        devWeekdayOverride,
        shiftDevWeekday,
        clearDevWeekdayOverride,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        setCurrentEmployee,
        addPatient,
        updatePatient,
        deletePatient,
        addTask,
        updateTask,
        deleteTask,
        addDocument,
        updateDocument,
        addList,
        updateList,
        deleteList,
        addVisit,
        updateVisit,
        deleteVisit,
        setCurrentList,
        assignPatientToList,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}