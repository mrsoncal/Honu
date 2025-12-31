export interface Employee {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  hireDate: string;
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  address: string;
  phone: string;
  diagnosis: string;
  admissionDate: string;
  assignedEmployee?: string;
  plan?: string;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface VisitList {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Visit {
  id: string;
  patientId: string;
  patientName: string;
  weekdays: Weekday[];
  time?: string;
  listId: string;
  notes?: string;
  date?: string;
  endDate?: string;
  kind?: 'planned' | 'special-task';
}

export interface Task {
  id: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  visitTime?: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  durationMinutes: number;
  listId: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  date: string;
  time: string;
  documentedBy: string;
  documentedByName: string;
  vitalSigns: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
  };
  medications: Array<{
    name: string;
    dosage: string;
    time: string;
  }>;
  activities: string;
  meals: string;
  notes: string;
}