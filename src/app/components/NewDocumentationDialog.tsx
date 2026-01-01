import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PatientDocument } from '../types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Plus, Search, Trash2 } from 'lucide-react';
import { t } from '../i18n';

export function NewDocumentationDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  allowedPatientIds?: string[];
}) {
  const { open, onOpenChange, patientId, allowedPatientIds } = props;
  const { patients, currentEmployee, addDocument, currentList, assignPatientToList } = useApp();

  const buildEmptyForm = useMemo(() => {
    return (pid: string) => ({
      patientId: pid,
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
  }, []);

  const [formData, setFormData] = useState(() => buildEmptyForm(patientId ?? ''));
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const didInitForOpen = useRef(false);

  const allowedSet = useMemo(() => {
    if (!allowedPatientIds || allowedPatientIds.length === 0) return null;
    return new Set(allowedPatientIds);
  }, [allowedPatientIds]);

  const patientOptions = useMemo(() => {
    if (!allowedSet) return patients;
    const allowed = patients.filter((p) => allowedSet.has(p.id));
    const selected = formData.patientId ? patients.find((p) => p.id === formData.patientId) : null;
    if (selected && !allowedSet.has(selected.id)) {
      return [selected, ...allowed];
    }
    return allowed;
  }, [patients, allowedSet, formData.patientId]);

  const selectedPatientName = useMemo(() => {
    if (!formData.patientId) return null;
    return patients.find((p) => p.id === formData.patientId)?.name ?? null;
  }, [patients, formData.patientId]);

  useEffect(() => {
    if (!open) {
      didInitForOpen.current = false;
      return;
    }

    // Only initialize once per open. This avoids clobbering user selections when
    // allowedPatientIds changes (e.g. after assigning a searched patient to the list).
    if (didInitForOpen.current) return;
    didInitForOpen.current = true;

    const nextPatientId = patientId ?? '';
    const isAllowed = !allowedSet || (nextPatientId ? allowedSet.has(nextPatientId) : true);
    setFormData(buildEmptyForm(isAllowed ? nextPatientId : ''));
  }, [open, patientId, buildEmptyForm, allowedSet]);

  const addMedicationField = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', time: '' }],
    }));
  };

  const removeMedicationField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const updateMedication = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const next = [...prev.medications];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, medications: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;

    const newDocument: PatientDocument = {
      id: Date.now().toString(),
      patientId: formData.patientId,
      date: formData.date,
      time: formData.time,
      documentedBy: currentEmployee.id,
      documentedByName: currentEmployee.name,
      vitalSigns: {
        temperature: formData.temperature || undefined,
        bloodPressure: formData.bloodPressure || undefined,
        heartRate: formData.heartRate || undefined,
        respiratoryRate: formData.respiratoryRate || undefined,
        oxygenSaturation: formData.oxygenSaturation || undefined,
      },
      medications: formData.medications.filter((m) => m.name),
      activities: formData.activities,
      meals: formData.meals,
      notes: formData.notes,
    };

    addDocument(newDocument);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('patientCareDocumentation')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="docPatientId">{t('patient')}</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.patientId}
                  onValueChange={(value) => setFormData((p) => ({ ...p, patientId: value }))}
                  required
                >
                  <SelectTrigger id="docPatientId" className="flex-1">
                    <SelectValue placeholder={t('selectPatient')}>{selectedPatientName ?? undefined}</SelectValue>
                  </SelectTrigger>
                  <SelectContent forceMount>
                    {patientOptions.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  title={t('searchPatients')}
                  aria-label={t('searchPatients')}
                  onClick={() => setIsPatientSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <CommandDialog
                open={isPatientSearchOpen}
                onOpenChange={setIsPatientSearchOpen}
                title={t('searchPatients')}
                description={t('searchPatients')}
              >
                <CommandInput placeholder={t('searchPatients')} />
                <CommandList>
                  <CommandEmpty>No patients found.</CommandEmpty>
                  <CommandGroup>
                    {patients.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.phone ?? ''} ${p.address ?? ''} ${p.diagnosis ?? ''}`}
                        className="cursor-pointer"
                        onSelect={() => {
                          setIsPatientSearchOpen(false);

                          // Keep the dropdown list-scoped, but allow search to extend the list.
                          const needsAssignment = Boolean(allowedSet && currentList && !allowedSet.has(p.id));
                          if (needsAssignment && currentList) {
                            assignPatientToList(currentList.id, p.id);
                            // Wait a tick so the option exists in the list before Select resolves the value.
                            setTimeout(() => {
                              setFormData((prev) => ({ ...prev, patientId: p.id }));
                            }, 0);
                            return;
                          }

                          setFormData((prev) => ({ ...prev, patientId: p.id }));
                        }}
                      >
                        <div className="flex flex-col">
                          <div>{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.phone || '—'}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </CommandDialog>
            </div>
            <div className="space-y-2">
              <Label htmlFor="docDate">{t('date')}</Label>
              <Input
                id="docDate"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docTime">{t('time')}</Label>
              <Input
                id="docTime"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData((p) => ({ ...p, time: e.target.value }))}
                required
              />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3">{t('vitalSigns')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docTemp">{t('temperature')}</Label>
                <Input
                  id="docTemp"
                  placeholder={t('documentationTemperaturePlaceholder')}
                  value={formData.temperature}
                  onChange={(e) => setFormData((p) => ({ ...p, temperature: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docBp">{t('bloodPressure')}</Label>
                <Input
                  id="docBp"
                  placeholder={t('documentationBloodPressurePlaceholder')}
                  value={formData.bloodPressure}
                  onChange={(e) => setFormData((p) => ({ ...p, bloodPressure: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docHr">{t('heartRate')} (bpm)</Label>
                <Input
                  id="docHr"
                  placeholder={t('documentationHeartRatePlaceholder')}
                  value={formData.heartRate}
                  onChange={(e) => setFormData((p) => ({ ...p, heartRate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docRr">{t('respiratoryRate')}</Label>
                <Input
                  id="docRr"
                  placeholder={t('documentationRespiratoryRatePlaceholder')}
                  value={formData.respiratoryRate}
                  onChange={(e) => setFormData((p) => ({ ...p, respiratoryRate: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="docSpO2">{t('oxygenSaturation')}</Label>
                <Input
                  id="docSpO2"
                  placeholder={t('documentationOxygenSaturationPlaceholder')}
                  value={formData.oxygenSaturation}
                  onChange={(e) => setFormData((p) => ({ ...p, oxygenSaturation: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3>{t('medicationsAdministered')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addMedicationField}>
                <Plus className="h-4 w-4 mr-1" />
                {t('addMedication')}
              </Button>
            </div>
            <div className="space-y-3">
              {formData.medications.map((med, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-2">
                    <Label>{t('medicationName')}</Label>
                    <Input
                      placeholder={t('documentationMedicationNamePlaceholder')}
                      value={med.name}
                      onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>{t('dosage')}</Label>
                    <Input
                      placeholder={t('documentationDosagePlaceholder')}
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>{t('time')}</Label>
                    <Input
                      type="time"
                      value={med.time}
                      onChange={(e) => updateMedication(index, 'time', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    {formData.medications.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeMedicationField(index)}>
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
              <Label htmlFor="docActivities">{t('activitiesMobility')}</Label>
              <Textarea
                id="docActivities"
                placeholder={t('documentationActivitiesPlaceholder')}
                value={formData.activities}
                onChange={(e) => setFormData((p) => ({ ...p, activities: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docMeals">{t('mealsNutrition')}</Label>
              <Textarea
                id="docMeals"
                placeholder={t('documentationMealsPlaceholder')}
                value={formData.meals}
                onChange={(e) => setFormData((p) => ({ ...p, meals: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docNotes">{t('clinicalNotesObservations')}</Label>
              <Textarea
                id="docNotes"
                placeholder={t('documentationNotesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={4}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('saveDocumentation')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
