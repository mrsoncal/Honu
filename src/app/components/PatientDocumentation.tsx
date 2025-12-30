import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PatientDocument } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Plus, FileText, Trash2 } from 'lucide-react';

export function PatientDocumentation() {
  const { patients, documents, currentUser, addDocument } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [formData, setFormData] = useState({
    patientId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    medications: [{ name: '', dosage: '', time: '' }],
    activities: '',
    meals: '',
    notes: '',
  });

  const handleOpenDialog = () => {
    setFormData({
      patientId: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      temperature: '',
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      medications: [{ name: '', dosage: '', time: '' }],
      activities: '',
      meals: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newDocument: PatientDocument = {
      id: Date.now().toString(),
      patientId: formData.patientId,
      date: formData.date,
      time: formData.time,
      documentedBy: currentUser.id,
      documentedByName: currentUser.name,
      vitalSigns: {
        temperature: formData.temperature || undefined,
        bloodPressure: formData.bloodPressure || undefined,
        heartRate: formData.heartRate || undefined,
        respiratoryRate: formData.respiratoryRate || undefined,
        oxygenSaturation: formData.oxygenSaturation || undefined,
      },
      medications: formData.medications.filter(med => med.name),
      activities: formData.activities,
      meals: formData.meals,
      notes: formData.notes,
    };
    addDocument(newDocument);
    setIsDialogOpen(false);
  };

  const addMedicationField = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { name: '', dosage: '', time: '' }],
    });
  };

  const removeMedicationField = (index: number) => {
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index),
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const newMedications = [...formData.medications];
    newMedications[index] = { ...newMedications[index], [field]: value };
    setFormData({ ...formData, medications: newMedications });
  };

  const filteredDocuments = selectedPatient && selectedPatient !== 'all'
    ? documents.filter(doc => doc.patientId === selectedPatient)
    : documents;

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2>Patient Documentation</h2>
          <p className="text-muted-foreground">Record patient care and observations</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Patients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Documentation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Patient Care Documentation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="patientId">Patient</Label>
                    <Select
                      value={formData.patientId}
                      onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
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
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-3">Vital Signs</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        placeholder="e.g., 98.6°F"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloodPressure">Blood Pressure</Label>
                      <Input
                        id="bloodPressure"
                        placeholder="e.g., 120/80"
                        value={formData.bloodPressure}
                        onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                      <Input
                        id="heartRate"
                        placeholder="e.g., 72"
                        value={formData.heartRate}
                        onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                      <Input
                        id="respiratoryRate"
                        placeholder="e.g., 16"
                        value={formData.respiratoryRate}
                        onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="oxygenSaturation">Oxygen Saturation (%)</Label>
                      <Input
                        id="oxygenSaturation"
                        placeholder="e.g., 98%"
                        value={formData.oxygenSaturation}
                        onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3>Medications Administered</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addMedicationField}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Medication
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.medications.map((med, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5 space-y-2">
                          <Label>Medication Name</Label>
                          <Input
                            placeholder="e.g., Aspirin"
                            value={med.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>Dosage</Label>
                          <Input
                            placeholder="e.g., 100mg"
                            value={med.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>Time</Label>
                          <Input
                            type="time"
                            value={med.time}
                            onChange={(e) => updateMedication(index, 'time', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          {formData.medications.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMedicationField(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="activities">Activities & Mobility</Label>
                    <Textarea
                      id="activities"
                      placeholder="Describe patient's activities, mobility, and exercise..."
                      value={formData.activities}
                      onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meals">Meals & Nutrition</Label>
                    <Textarea
                      id="meals"
                      placeholder="Document food intake, appetite, and hydration..."
                      value={formData.meals}
                      onChange={(e) => setFormData({ ...formData, meals: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Clinical Notes & Observations</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional observations, concerns, or important notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Documentation</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {sortedDocuments.map((doc) => {
          const patient = patients.find(p => p.id === doc.patientId);
          if (!patient) return null;

          return (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{patient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(doc.date).toLocaleDateString()} at {doc.time} • Documented by {doc.documentedByName}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(doc.vitalSigns).some(v => v) && (
                  <div>
                    <h4 className="mb-2">Vital Signs</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {doc.vitalSigns.temperature && (
                        <div className="p-2 bg-accent/50 rounded">
                          <div className="text-xs text-muted-foreground">Temperature</div>
                          <div>{doc.vitalSigns.temperature}</div>
                        </div>
                      )}
                      {doc.vitalSigns.bloodPressure && (
                        <div className="p-2 bg-accent/50 rounded">
                          <div className="text-xs text-muted-foreground">BP</div>
                          <div>{doc.vitalSigns.bloodPressure}</div>
                        </div>
                      )}
                      {doc.vitalSigns.heartRate && (
                        <div className="p-2 bg-accent/50 rounded">
                          <div className="text-xs text-muted-foreground">Heart Rate</div>
                          <div>{doc.vitalSigns.heartRate} bpm</div>
                        </div>
                      )}
                      {doc.vitalSigns.respiratoryRate && (
                        <div className="p-2 bg-accent/50 rounded">
                          <div className="text-xs text-muted-foreground">Resp. Rate</div>
                          <div>{doc.vitalSigns.respiratoryRate}</div>
                        </div>
                      )}
                      {doc.vitalSigns.oxygenSaturation && (
                        <div className="p-2 bg-accent/50 rounded">
                          <div className="text-xs text-muted-foreground">O2 Sat</div>
                          <div>{doc.vitalSigns.oxygenSaturation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {doc.medications.length > 0 && (
                  <div>
                    <h4 className="mb-2">Medications</h4>
                    <div className="space-y-1">
                      {doc.medications.map((med, index) => (
                        <div key={index} className="text-sm p-2 bg-accent/30 rounded">
                          <span>{med.name}</span> - <span className="text-muted-foreground">{med.dosage}</span>
                          {med.time && <span className="text-muted-foreground"> at {med.time}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doc.activities && (
                  <div>
                    <h4 className="mb-1">Activities & Mobility</h4>
                    <p className="text-sm text-muted-foreground">{doc.activities}</p>
                  </div>
                )}

                {doc.meals && (
                  <div>
                    <h4 className="mb-1">Meals & Nutrition</h4>
                    <p className="text-sm text-muted-foreground">{doc.meals}</p>
                  </div>
                )}

                {doc.notes && (
                  <div>
                    <h4 className="mb-1">Clinical Notes</h4>
                    <p className="text-sm text-muted-foreground">{doc.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {sortedDocuments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No documentation found. Click "New Documentation" to add patient records.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}