import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Employee, Patient, Task, PatientDocument, Visit } from '../types';

interface AppContextType {
  employees: Employee[];
  patients: Patient[];
  tasks: Task[];
  documents: PatientDocument[];
  visits: Visit[];
  currentUser: Employee | null;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addDocument: (document: PatientDocument) => void;
  updateDocument: (id: string, document: Partial<PatientDocument>) => void;
  addVisit: (visit: Visit) => void;
  updateVisit: (id: string, visit: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  setCurrentUser: (user: Employee | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialEmployees: Employee[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Registered Nurse',
    phone: '(555) 123-4567',
    email: 'sarah.j@homecure.com',
    status: 'active',
    hireDate: '2023-01-15',
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Licensed Practical Nurse',
    phone: '(555) 234-5678',
    email: 'michael.c@homecure.com',
    status: 'active',
    hireDate: '2023-03-20',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Nursing Assistant',
    phone: '(555) 345-6789',
    email: 'emily.r@homecure.com',
    status: 'active',
    hireDate: '2023-06-10',
  },
];

const initialPatients: Patient[] = [
  {
    id: '1',
    name: 'Robert Williams',
    age: 72,
    address: '123 Oak Street, Springfield',
    phone: '(555) 111-2222',
    diagnosis: 'Post-surgical recovery',
    admissionDate: '2024-12-15',
    assignedEmployee: '1',
  },
  {
    id: '2',
    name: 'Margaret Thompson',
    age: 68,
    address: '456 Maple Avenue, Springfield',
    phone: '(555) 333-4444',
    diagnosis: 'Diabetes management',
    admissionDate: '2024-11-20',
    assignedEmployee: '2',
  },
  {
    id: '3',
    name: 'James Anderson',
    age: 81,
    address: '789 Pine Road, Springfield',
    phone: '(555) 555-6666',
    diagnosis: 'Chronic heart failure',
    admissionDate: '2024-10-05',
    assignedEmployee: '1',
  },
];

const initialTasks: Task[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Robert Williams',
    title: 'Wound dressing change',
    description: 'Change surgical wound dressing and assess healing',
    priority: 'high',
    status: 'pending',
    dueDate: '2024-12-30',
    assignedTo: '1',
    assignedToName: 'Sarah Johnson',
  },
  {
    id: '2',
    patientId: '1',
    patientName: 'Robert Williams',
    title: 'Vital signs check',
    description: 'Monitor temperature, BP, and heart rate',
    priority: 'medium',
    status: 'in-progress',
    dueDate: '2024-12-30',
    assignedTo: '1',
    assignedToName: 'Sarah Johnson',
  },
  {
    id: '3',
    patientId: '2',
    patientName: 'Margaret Thompson',
    title: 'Blood glucose monitoring',
    description: 'Check blood sugar levels before breakfast',
    priority: 'high',
    status: 'pending',
    dueDate: '2024-12-30',
    assignedTo: '2',
    assignedToName: 'Michael Chen',
  },
  {
    id: '4',
    patientId: '2',
    patientName: 'Margaret Thompson',
    title: 'Insulin administration',
    description: 'Administer insulin as prescribed',
    priority: 'high',
    status: 'pending',
    dueDate: '2024-12-30',
    assignedTo: '2',
    assignedToName: 'Michael Chen',
  },
  {
    id: '5',
    patientId: '3',
    patientName: 'James Anderson',
    title: 'Medication review',
    description: 'Review daily medications and ensure compliance',
    priority: 'medium',
    status: 'completed',
    dueDate: '2024-12-29',
    assignedTo: '1',
    assignedToName: 'Sarah Johnson',
  },
];

const initialDocuments: PatientDocument[] = [
  {
    id: '1',
    patientId: '1',
    date: '2024-12-29',
    time: '09:00',
    documentedBy: '1',
    documentedByName: 'Sarah Johnson',
    vitalSigns: {
      temperature: '98.6°F',
      bloodPressure: '125/80',
      heartRate: '72',
      respiratoryRate: '16',
      oxygenSaturation: '98%',
    },
    medications: [
      { name: 'Acetaminophen', dosage: '500mg', time: '09:00' },
      { name: 'Antibiotic', dosage: '250mg', time: '09:00' },
    ],
    activities: 'Walked to bathroom with assistance. Sat in chair for 30 minutes.',
    meals: 'Ate 75% of breakfast. Good appetite.',
    notes: 'Surgical wound healing well. No signs of infection. Patient reports pain level 3/10.',
  },
];

const initialVisits: Visit[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Robert Williams',
    date: '2024-12-30',
    time: '09:00',
    assignedTo: '1',
    assignedToName: 'Sarah Johnson',
    notes: 'Morning visit - wound care',
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Margaret Thompson',
    date: '2024-12-30',
    time: '08:30',
    assignedTo: '2',
    assignedToName: 'Michael Chen',
    notes: 'Diabetes monitoring',
  },
  {
    id: '3',
    patientId: '1',
    patientName: 'Robert Williams',
    date: '2024-12-30',
    time: '15:30',
    assignedTo: '1',
    assignedToName: 'Sarah Johnson',
    notes: 'Afternoon check-in',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [documents, setDocuments] = useState<PatientDocument[]>(initialDocuments);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [currentUser, setCurrentUser] = useState<Employee | null>(initialEmployees[0]);

  const addEmployee = (employee: Employee) => {
    setEmployees([...employees, employee]);
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
    setTasks(tasks.map(task => task.id === id ? { ...task, ...updatedTask } : task));
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
        patients,
        tasks,
        documents,
        visits,
        currentUser,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addPatient,
        updatePatient,
        deletePatient,
        addTask,
        updateTask,
        deleteTask,
        addDocument,
        updateDocument,
        addVisit,
        updateVisit,
        deleteVisit,
        setCurrentUser,
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