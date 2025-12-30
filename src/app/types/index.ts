export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  hireDate: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  address: string;
  phone: string;
  diagnosis: string;
  admissionDate: string;
  assignedEmployee?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
}

export interface Task {
  id: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  assignedTo: string;
  assignedToName: string;
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