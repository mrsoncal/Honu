import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Employee, Patient, Task, PatientDocument, Visit, VisitList, Weekday } from '../types';

interface AppContextType {
  employees: Employee[];
  currentEmployee: Employee | null;
  patients: Patient[];
  tasks: Task[];
  documents: PatientDocument[];
  lists: VisitList[];
  visits: Visit[];
  currentList: VisitList | null;
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
];

const initialTasks: Task[] = [
  // List 1
  {
    id: 'task-1',
    patientId: '1',
    patientName: 'Robert Williams',
    visitTime: '09:00',
    title: 'Wound dressing',
    description: 'Assess surgical wound and change dressing.',
    status: 'pending',
    durationMinutes: 20,
    listId: 'list-1',
  },
  {
    id: 'task-2',
    patientId: '1',
    patientName: 'Robert Williams',
    visitTime: '09:00',
    title: 'Pain assessment',
    description: 'Check pain score and review analgesics.',
    status: 'pending',
    durationMinutes: 10,
    listId: 'list-1',
  },
  {
    id: 'task-3',
    patientId: '1',
    patientName: 'Robert Williams',
    visitTime: '15:30',
    title: 'Mobility check',
    description: 'Short walk with support and fall risk check.',
    status: 'completed',
    durationMinutes: 15,
    listId: 'list-1',
  },
  {
    id: 'task-4',
    patientId: '3',
    patientName: 'James Anderson',
    visitTime: '10:15',
    title: 'Vitals',
    description: 'BP, pulse, SpO2, and short symptom check.',
    status: 'pending',
    durationMinutes: 15,
    listId: 'list-1',
  },
  {
    id: 'task-5',
    patientId: '3',
    patientName: 'James Anderson',
    visitTime: '10:15',
    title: 'Fluid balance',
    description: 'Ask about weight change and edema.',
    status: 'completed',
    durationMinutes: 10,
    listId: 'list-1',
  },
  {
    id: 'task-6',
    patientId: '6',
    patientName: 'Aisha Khan',
    visitTime: '16:00',
    title: 'Medication administration',
    description: 'Administer evening meds per list.',
    status: 'pending',
    durationMinutes: 20,
    listId: 'list-1',
  },

  // List 2
  {
    id: 'task-7',
    patientId: '2',
    patientName: 'Margaret Thompson',
    visitTime: '08:30',
    title: 'Blood glucose',
    description: 'Measure blood glucose and document result.',
    status: 'pending',
    durationMinutes: 10,
    listId: 'list-2',
  },
  {
    id: 'task-8',
    patientId: '2',
    patientName: 'Margaret Thompson',
    visitTime: '08:30',
    title: 'Medication review',
    description: 'Verify insulin dose per plan.',
    status: 'pending',
    durationMinutes: 10,
    listId: 'list-2',
  },
  {
    id: 'task-9',
    patientId: '5',
    patientName: 'Daniel Price',
    visitTime: '07:45',
    title: 'Inhaler technique',
    description: 'Observe inhaler technique and reinforce education.',
    status: 'pending',
    durationMinutes: 15,
    listId: 'list-2',
  },
  {
    id: 'task-10',
    patientId: '8',
    patientName: 'Linda Nguyen',
    visitTime: '09:45',
    title: 'Blood pressure',
    description: 'Measure BP and document.',
    status: 'completed',
    durationMinutes: 10,
    listId: 'list-2',
  },
  {
    id: 'task-11',
    patientId: '8',
    patientName: 'Linda Nguyen',
    visitTime: '09:45',
    title: 'Education',
    description: 'Lifestyle advice and medication adherence check.',
    status: 'pending',
    durationMinutes: 10,
    listId: 'list-2',
  },

  // General sections
  {
    id: 'task-12',
    patientId: '1',
    patientName: 'Robert Williams',
    visitTime: 'general',
    title: 'Care plan note',
    description: 'Review general notes and update as needed.',
    status: 'pending',
    durationMinutes: 5,
    listId: 'list-1',
  },
  {
    id: 'task-13',
    patientId: '2',
    patientName: 'Margaret Thompson',
    visitTime: 'general',
    title: 'Call GP office',
    description: 'Follow up on prescription renewal.',
    status: 'pending',
    durationMinutes: 10,
    listId: 'list-2',
  },
];

const initialDocuments: PatientDocument[] = [
  {
    id: '1',
    patientId: '1',
    date: '2024-12-29',
    time: '09:00',
    documentedBy: 'dev',
    documentedByName: 'Dev',
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
  { id: 'list-1', name: 'List 1', description: 'Nord-rute', active: true },
  { id: 'list-2', name: 'List 2', description: 'Sør-rute', active: true },
  { id: 'list-3', name: 'List 3', description: 'Helgedekning', active: false },
  { id: 'list-4', name: 'List 4', description: 'Sentrum', active: true },
  { id: 'list-5', name: 'List 5', description: 'Ost-rute', active: true },
];

const initialVisits: Visit[] = [
  // List 1 (Nord-rute)
  {
    id: 'v-1',
    patientId: '1',
    patientName: 'Robert Williams',
    time: '09:00',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    listId: 'list-1',
  },
  {
    id: 'v-2',
    patientId: '1',
    patientName: 'Robert Williams',
    time: '15:30',
    weekdays: ['tue', 'thu'],
    listId: 'list-1',
  },
  {
    id: 'v-3',
    patientId: '3',
    patientName: 'James Anderson',
    time: '10:15',
    weekdays: ['mon', 'tue', 'wed', 'fri'],
    listId: 'list-1',
  },
  {
    id: 'v-4',
    patientId: '6',
    patientName: 'Aisha Khan',
    time: '16:00',
    weekdays: ['tue', 'wed', 'thu', 'fri'],
    listId: 'list-1',
  },

  // List 2 (Sør-rute)
  {
    id: 'v-5',
    patientId: '2',
    patientName: 'Margaret Thompson',
    time: '08:30',
    weekdays: ['tue', 'thu', 'sat'],
    listId: 'list-2',
  },
  {
    id: 'v-6',
    patientId: '2',
    patientName: 'Margaret Thompson',
    time: '13:15',
    weekdays: ['mon', 'wed', 'fri'],
    listId: 'list-2',
  },
  {
    id: 'v-7',
    patientId: '5',
    patientName: 'Daniel Price',
    time: '07:45',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    listId: 'list-2',
  },
  {
    id: 'v-8',
    patientId: '8',
    patientName: 'Linda Nguyen',
    time: '09:45',
    weekdays: ['tue', 'thu'],
    listId: 'list-2',
  },
  {
    id: 'v-9',
    patientId: '8',
    patientName: 'Linda Nguyen',
    time: '14:30',
    weekdays: ['mon', 'wed', 'fri'],
    listId: 'list-2',
  },

  // List 3 (Helgedekning)
  {
    id: 'v-10',
    patientId: '4',
    patientName: 'Helen Carter',
    time: '12:00',
    weekdays: ['sat', 'sun'],
    listId: 'list-3',
  },
  {
    id: 'v-11',
    patientId: '7',
    patientName: 'Peter Hansen',
    time: '11:30',
    weekdays: ['sat', 'sun'],
    listId: 'list-3',
  },

  // List 4 (Sentrum)
  {
    id: 'v-12',
    patientId: '4',
    patientName: 'Helen Carter',
    time: '08:15',
    weekdays: ['mon', 'tue', 'thu'],
    listId: 'list-4',
  },
  {
    id: 'v-13',
    patientId: '7',
    patientName: 'Peter Hansen',
    time: '17:10',
    weekdays: ['tue', 'wed', 'fri'],
    listId: 'list-4',
  },

  // List 5 (Ost-rute)
  {
    id: 'v-14',
    patientId: '6',
    patientName: 'Aisha Khan',
    time: '08:50',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    listId: 'list-5',
  },
  {
    id: 'v-15',
    patientId: '3',
    patientName: 'James Anderson',
    time: '18:00',
    weekdays: ['tue', 'thu'],
    listId: 'list-5',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(() => initialEmployees.find((e) => e.id === 'dev') ?? initialEmployees[0] ?? null);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [documents, setDocuments] = useState<PatientDocument[]>(initialDocuments);
  const [lists, setLists] = useState<VisitList[]>(initialLists);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [currentList, setCurrentList] = useState<VisitList | null>(initialLists[0] ?? null);

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
    setPatients(patients.filter(pat => pat.id !== id));
  };

  const addTask = (task: Task) => {
    setTasks([...tasks, task]);
  };

  const updateTask = (id: string, updatedTask: Partial<Task>) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, ...updatedTask } : task));
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
    setLists([...lists, list]);
  };

  const updateList = (id: string, updatedList: Partial<VisitList>) => {
    setLists(prev => prev.map(list => list.id === id ? { ...list, ...updatedList } : list));
    setCurrentList(prev => (prev && prev.id === id) ? { ...prev, ...updatedList } : prev);
  };

  const deleteList = (id: string) => {
    setLists(lists.filter(list => list.id !== id));
    setVisits(visits.filter(visit => visit.listId !== id));
  };

  const addVisit = (visit: Visit) => {
    setVisits([...visits, visit]);
  };

  const updateVisit = (id: string, updatedVisit: Partial<Visit>) => {
    setVisits(visits.map(vis => vis.id === id ? { ...vis, ...updatedVisit } : vis));
  };

  const deleteVisit = (id: string) => {
    setVisits(visits.filter(vis => vis.id !== id));
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