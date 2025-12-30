import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Patient, Visit } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Plus, Pencil, Trash2, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export function AdminPatients() {
  const { patients, employees, visits, addPatient, updatePatient, deletePatient, addVisit, updateVisit, deleteVisit } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState<Patient | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    address: '',
    phone: '',
    diagnosis: '',
    admissionDate: '',
    assignedEmployee: '',
  });

  const [visitFormData, setVisitFormData] = useState({
    date: '',
    time: '',
    assignedTo: '',
    notes: '',
  });

  // Generate time slots for each period
  const morningTimes = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
  const noonTimes = ['13:00', '13:30', '14:00', '14:30'];
  const afternoonTimes = ['15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
  const eveningTimes = ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        ...patient,
        age: patient.age.toString(),
        assignedEmployee: patient.assignedEmployee || 'unassigned',
      });
    } else {
      setEditingPatient(null);
      setFormData({
        name: '',
        age: '',
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
      age: parseInt(formData.age),
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
    if (confirm('Are you sure you want to delete this patient?')) {
      deletePatient(id);
    }
  };

  const getAssignedEmployeeName = (employeeId?: string) => {
    if (!employeeId) return 'Unassigned';
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || 'Unassigned';
  };

  const handleOpenVisitDialog = (patient: Patient) => {
    setSelectedPatientForVisit(patient);
    setIsVisitDialogOpen(true);
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForVisit) return;

    const employee = employees.find(emp => emp.id === visitFormData.assignedTo);
    
    const visitData: Partial<Visit> = {
      date: visitFormData.date,
      time: visitFormData.time !== 'none' ? visitFormData.time : undefined,
      assignedTo: visitFormData.assignedTo !== 'unassigned' ? visitFormData.assignedTo : undefined,
      assignedToName: employee?.name,
      notes: visitFormData.notes,
    };

    if (editingVisit) {
      updateVisit(editingVisit.id, visitData);
    } else {
      const newVisit: Visit = {
        ...visitData as Visit,
        id: Date.now().toString(),
        patientId: selectedPatientForVisit.id,
        patientName: selectedPatientForVisit.name,
      };
      addVisit(newVisit);
    }
    
    setEditingVisit(null);
    setVisitFormData({
      date: '',
      time: '',
      assignedTo: '',
      notes: '',
    });
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
          <h2>Patient Management</h2>
          <p className="text-muted-foreground">Manage patient records and assignments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={formData.admissionDate}
                  onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedEmployee">Assigned Nurse</Label>
                <Select
                  value={formData.assignedEmployee}
                  onValueChange={(value) => 
                    setFormData({ ...formData, assignedEmployee: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a nurse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
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
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPatient ? 'Update' : 'Add'} Patient
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Assigned Nurse</TableHead>
              <TableHead>Admission Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>{patient.name}</TableCell>
                <TableCell>{patient.age}</TableCell>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenVisitDialog(patient)}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenVisitDialog(selectedPatientForVisit || patients[0])}>
            <Plus className="mr-2 h-4 w-4" />
            Add Visit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingVisit ? 'Edit Visit' : 'Add New Visit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVisitSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Visit Date</Label>
              <Input
                id="date"
                type="date"
                value={visitFormData.date}
                onChange={(e) => setVisitFormData({ ...visitFormData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Visit Time</Label>
              <Select
                value={visitFormData.time || 'none'}
                onValueChange={(value) => 
                  setVisitFormData({ ...visitFormData, time: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visit time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No time set</SelectItem>
                  
                  {/* Morning Section */}
                  <SelectItem value="header-morning" disabled className="font-semibold text-xs opacity-50">
                    MORNING
                  </SelectItem>
                  {morningTimes.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                  
                  {/* Noon Section */}
                  <SelectItem value="header-noon" disabled className="font-semibold text-xs opacity-50 mt-2">
                    NOON
                  </SelectItem>
                  {noonTimes.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                  
                  {/* Afternoon Section */}
                  <SelectItem value="header-afternoon" disabled className="font-semibold text-xs opacity-50 mt-2">
                    AFTERNOON
                  </SelectItem>
                  {afternoonTimes.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                  
                  {/* Evening Section */}
                  <SelectItem value="header-evening" disabled className="font-semibold text-xs opacity-50 mt-2">
                    EVENING
                  </SelectItem>
                  {eveningTimes.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned Nurse</Label>
              <Select
                value={visitFormData.assignedTo}
                onValueChange={(value) => 
                  setVisitFormData({ ...visitFormData, assignedTo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a nurse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.filter(emp => emp.status === 'active').map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Visit Notes</Label>
              <Textarea
                id="notes"
                value={visitFormData.notes}
                onChange={(e) => setVisitFormData({ ...visitFormData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsVisitDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVisit ? 'Update' : 'Add'} Visit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Visit Date</TableHead>
                <TableHead>Visit Time</TableHead>
                <TableHead>Assigned Nurse</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell>{patients.find(patient => patient.id === visit.patientId)?.name || 'Unknown'}</TableCell>
                  <TableCell>{new Date(visit.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {visit.time ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {visit.time}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>{getAssignedEmployeeName(visit.assignedTo)}</TableCell>
                  <TableCell>{visit.notes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingVisit(visit);
                          setVisitFormData({
                            date: visit.date,
                            time: visit.time || 'none',
                            assignedTo: visit.assignedTo,
                            notes: visit.notes,
                          });
                          setIsVisitDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVisitDelete(visit.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}