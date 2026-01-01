import { Patient, Task, Visit, Weekday } from '../types';

// DEV ONLY: Toggle all dummy seed data in one place.
// Set to false to disable/remove all extra dummy patients/visits/tasks.
export const DEV_DUMMY_DATA_ENABLED = true;

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

type DummySeed = {
  patients: Patient[];
  visits: Visit[];
  tasks: Task[];
};

const dummyPatients: Patient[] = [
  {
    id: '9',
    name: 'Olav Berg',
    birthDate: '1942-03-14',
    address: '3 Fjellveien, Springfield',
    phone: '+47 909 10 111',
    diagnosis: 'Hjertesvikt – kontroll',
    admissionDate: '2024-08-12',
    assignedEmployee: '1',
  },
  {
    id: '10',
    name: 'Ingrid Solheim',
    birthDate: '1958-06-22',
    address: '18 Parkgata, Springfield',
    phone: '+47 909 10 112',
    diagnosis: 'Smertebehandling',
    admissionDate: '2024-07-05',
    assignedEmployee: '2',
  },
  {
    id: '11',
    name: 'Thomas Johansen',
    birthDate: '1965-10-09',
    address: '44 Skogstien, Springfield',
    phone: '+47 909 10 113',
    diagnosis: 'Insulinoppfølging',
    admissionDate: '2024-11-02',
    assignedEmployee: '3',
  },
  {
    id: '12',
    name: 'Sofia Martinez',
    birthDate: '1950-01-28',
    address: '200 Willow Way, Springfield',
    phone: '+47 909 10 114',
    diagnosis: 'Trykksår – sårstell',
    admissionDate: '2024-12-08',
    assignedEmployee: '1',
  },
  {
    id: '13',
    name: 'Erik Nilsen',
    birthDate: '1948-12-02',
    address: '7 Strandveien, Springfield',
    phone: '+47 909 10 115',
    diagnosis: 'KOLS – inhalasjon',
    admissionDate: '2024-10-18',
    assignedEmployee: '2',
  },
  {
    id: '14',
    name: 'Maya Patel',
    birthDate: '1956-04-17',
    address: '91 Orchard Road, Springfield',
    phone: '+47 909 10 116',
    diagnosis: 'Medisinadministrasjon',
    admissionDate: '2024-09-21',
    assignedEmployee: '3',
  },
  {
    id: '15',
    name: 'Kari Olsen',
    birthDate: '1946-08-30',
    address: '12 Storgata, Springfield',
    phone: '+47 909 10 117',
    diagnosis: 'Fallforebygging',
    admissionDate: '2024-06-14',
    assignedEmployee: '1',
  },
  {
    id: '16',
    name: 'Noah Lee',
    birthDate: '1962-02-05',
    address: '58 Lakeside Ave, Springfield',
    phone: '+47 909 10 118',
    diagnosis: 'Blodtrykksoppfølging',
    admissionDate: '2024-05-20',
    assignedEmployee: '2',
  },
  {
    id: '17',
    name: 'Fatima Ali',
    birthDate: '1954-09-11',
    address: '9 Sunnyside Rd, Springfield',
    phone: '+47 909 10 119',
    diagnosis: 'Sårkontroll',
    admissionDate: '2024-04-02',
    assignedEmployee: '3',
  },
  {
    id: '18',
    name: 'Jonas Pedersen',
    birthDate: '1940-11-19',
    address: '101 Granittveien, Springfield',
    phone: '+47 909 10 120',
    diagnosis: 'Hjertesvikt – oppfølging',
    admissionDate: '2024-03-15',
    assignedEmployee: '1',
  },
  {
    id: '19',
    name: 'Emma Larsen',
    birthDate: '1959-07-08',
    address: '27 Birch Court, Springfield',
    phone: '+47 909 10 121',
    diagnosis: 'Diabetes – kontroll',
    admissionDate: '2024-02-28',
    assignedEmployee: '2',
    tags: ['DIA 2', 'HLR-'],
  },
  {
    id: '20',
    name: 'Hassan Ahmed',
    birthDate: '1951-05-25',
    address: '6 Maple Court, Springfield',
    phone: '+47 909 10 122',
    diagnosis: 'KOLS – oppfølging',
    admissionDate: '2024-01-10',
    assignedEmployee: '3',
  },
  {
    id: '21',
    name: 'Marit Sørensen',
    birthDate: '1945-02-13',
    address: '88 Ringveien, Springfield',
    phone: '+47 909 10 123',
    diagnosis: 'Medisinadministrasjon',
    admissionDate: '2024-12-27',
    assignedEmployee: '1',
  },
  {
    id: '22',
    name: 'George King',
    birthDate: '1960-12-30',
    address: '14 Cedar Court, Springfield',
    phone: '+47 909 10 124',
    diagnosis: 'Smertebehandling',
    admissionDate: '2024-12-03',
    assignedEmployee: '2',
  },
  {
    id: '23',
    name: 'Lea Hansen',
    birthDate: '1957-01-16',
    address: '5 Engveien, Springfield',
    phone: '+47 909 10 125',
    diagnosis: 'Blodtrykksoppfølging',
    admissionDate: '2024-11-26',
    assignedEmployee: '3',
  },
  {
    id: '24',
    name: 'Victor Chen',
    birthDate: '1963-06-01',
    address: '73 Riverbend Dr, Springfield',
    phone: '+47 909 10 126',
    diagnosis: 'Diabetesoppfølging',
    admissionDate: '2024-10-30',
    assignedEmployee: '1',
  },
  {
    id: '25',
    name: 'Anne-Marie Dahl',
    birthDate: '1943-09-07',
    address: '2 Kirkeveien, Springfield',
    phone: '+47 909 10 127',
    diagnosis: 'Sårstell',
    admissionDate: '2024-09-09',
    assignedEmployee: '2',
  },
  {
    id: '26',
    name: 'Samir Hussein',
    birthDate: '1952-10-18',
    address: '33 Northgate St, Springfield',
    phone: '+47 909 10 128',
    diagnosis: 'Fallforebygging',
    admissionDate: '2024-08-23',
    assignedEmployee: '3',
  },
  {
    id: '27',
    name: 'Julie Andersen',
    birthDate: '1967-03-03',
    address: '90 Southview Ave, Springfield',
    phone: '+47 909 10 129',
    diagnosis: 'Blodtrykksoppfølging',
    admissionDate: '2024-07-17',
    assignedEmployee: '1',
  },
  {
    id: '28',
    name: 'Magnus Østby',
    birthDate: '1949-10-29',
    address: '16 Skoleveien, Springfield',
    phone: '+47 909 10 130',
    diagnosis: 'Hjertesvikt – kontroll',
    admissionDate: '2024-06-06',
    assignedEmployee: '2',
  },
];

const patientNameById = new Map(dummyPatients.map((p) => [p.id, p.name] as const));

const MORNING_TIMES = [
  '07:10',
  '07:30',
  '07:55',
  '08:15',
  '08:40',
  '09:05',
  '09:25',
  '09:50',
  '10:15',
  '10:45',
];

const EVENING_TIMES = [
  '15:05',
  '15:35',
  '16:00',
  '16:25',
  '16:55',
  '17:20',
  '17:45',
  '18:10',
  '18:40',
  '19:05',
];

const pickTimeFromPool = (pool: string[], patientNum: number, salt: number) => {
  const safePatientNum = Number.isFinite(patientNum) ? patientNum : 0;
  const idx = (Math.abs(safePatientNum) + salt) % pool.length;
  return pool[idx];
};

const pickListIdForTime = (time: string, patientId?: string): string => {
  const mins = (() => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  })();

  // Keep dev data mostly on active lists so it's visible.
  // Spread deterministically between list-1 and list-2.
  const patientNum = patientId ? Number.parseInt(patientId, 10) : NaN;
  const prefersList2 = Number.isFinite(patientNum) ? patientNum % 2 === 0 : false;

  if (mins < 11 * 60) return prefersList2 ? 'list-2' : 'list-1';
  if (mins < 15 * 60) return prefersList2 ? 'list-1' : 'list-2';
  return prefersList2 ? 'list-2' : 'list-1';
};

export function getDevDummyData(): DummySeed {
  if (!DEV_DUMMY_DATA_ENABLED) return { patients: [], visits: [], tasks: [] };

  const visits: Visit[] = [];
  const tasks: Task[] = [];

  let visitSeq = 1;
  let taskSeq = 1;

  const addVisit = (visit: Omit<Visit, 'id'>) => {
    visits.push({ id: `dev-visit-${visitSeq++}`, ...visit });
  };

  const addTask = (task: Omit<Task, 'id'>) => {
    tasks.push({ id: `dev-task-${taskSeq++}`, ...task });
  };

  const addTasksForVisit = (visit: Visit) => {
    // Create a few tasks per visit so durations add up.
    const baseTasks: Array<{ title: string; description: string; durationMinutes: number }> = [
      { title: 'Observasjon', description: 'Vurder allmenntilstand og dokumenter funn.', durationMinutes: 10 },
      { title: 'Medisin', description: 'Sjekk medisinliste og administrer ved behov.', durationMinutes: 15 },
      { title: 'Dokumentasjon', description: 'Oppdater journal og signér utført tiltak.', durationMinutes: 5 },
    ];

    for (const bt of baseTasks) {
      addTask({
        patientId: visit.patientId,
        patientName: visit.patientName,
        listId: visit.listId,
        visitTime: visit.time ?? 'general',
        title: bt.title,
        description: bt.description,
        status: 'pending',
        durationMinutes: bt.durationMinutes,
      });
    }
  };

  // Some patients get 3–4 visits every day (4 fixed time slots across the whole week).
  const highFrequencyPatients = ['19', '12', '24'];
  const highFrequencyTimes = ['07:30', '10:55', '14:30', '19:05'];

  for (const patientId of highFrequencyPatients) {
    const patientName = patientNameById.get(patientId) ?? '';
    for (const time of highFrequencyTimes) {
      const listId = pickListIdForTime(time, patientId);
      addVisit({
        patientId,
        patientName,
        listId,
        time,
        weekdays: WEEKDAYS,
        description: 'Planlagt oppfølging',
        notes: 'Dummy-besøk (høy frekvens) for test.',
      });
    }
  }

  // Remaining dummy patients: 2 visits spread across the week with varied weekdays.
  const remainingPatients = dummyPatients.map((p) => p.id).filter((id) => !highFrequencyPatients.includes(id));
  for (const patientId of remainingPatients) {
    const patientName = patientNameById.get(patientId) ?? '';

    const patientNum = Number.parseInt(patientId, 10);
    const morningTime = pickTimeFromPool(MORNING_TIMES, patientNum, 0);
    const eveningTime = pickTimeFromPool(EVENING_TIMES, patientNum, 3);

    const morningDays: Weekday[] = ['mon', 'wed', 'fri'];
    const eveningDays: Weekday[] = ['tue', 'thu', 'sat', 'sun'];

    {
      const listId = pickListIdForTime(morningTime, patientId);
      addVisit({
        patientId,
        patientName,
        listId,
        time: morningTime,
        weekdays: morningDays,
        description: 'Rutinebesøk (morgen)',
        notes: 'Dummy-besøk for test av ukevisning.',
      });
    }

    {
      const listId = pickListIdForTime(eveningTime, patientId);
      addVisit({
        patientId,
        patientName,
        listId,
        time: eveningTime,
        weekdays: eveningDays,
        description: 'Rutinebesøk (ettermiddag)',
        notes: 'Dummy-besøk for test av ukevisning.',
      });
    }
  }

  // Generate tasks for every dummy visit.
  for (const v of visits) addTasksForVisit(v);

  // Extra general tasks per patient so task lists are "busy".
  for (const p of dummyPatients) {
    addTask({
      patientId: p.id,
      patientName: p.name,
      listId: 'list-1',
      visitTime: 'general',
      title: 'Ukentlig vurdering',
      description: 'Gjør en kort oppsummering av status og behov.',
      status: 'pending',
      durationMinutes: 20,
    });
  }

  return { patients: dummyPatients, visits, tasks };
}
