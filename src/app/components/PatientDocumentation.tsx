import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PatientDocument } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, FileText, Search } from 'lucide-react';
import { t } from '../i18n';
import { NewDocumentationDialog } from './NewDocumentationDialog';

export function PatientDocumentation() {
  const { patients, documents, currentEmployee, currentList, visits, effectiveWeekday } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnyPatientSearchOpen, setIsAnyPatientSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [searchedPatientId, setSearchedPatientId] = useState<string | null>(null);

  const effectiveDateISO = useMemo(() => {
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
  }, []);

  const todayVisitPatientIds = useMemo(() => {
    if (!currentList) return null;

    const overrides: Record<string, string> = (() => {
      try {
        const raw = localStorage.getItem('honu.visitMoveOverrides');
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as Record<string, string>;
      } catch {
        return {};
      }
    })();

    const moveKeyForVisit = (visitId: string) => `${effectiveDateISO}|${visitId}`;
    const effectiveListIdForVisit = (visit: (typeof visits)[number]): string => {
      return overrides[moveKeyForVisit(visit.id)] ?? visit.listId;
    };

    const ids = new Set<string>();
    for (const v of visits) {
      if (effectiveListIdForVisit(v) !== currentList.id) continue;

      const isToday = v.date
        ? v.date === effectiveDateISO
        : v.weekdays.includes(effectiveWeekday) && (!v.endDate || effectiveDateISO <= v.endDate);
      if (!isToday) continue;

      ids.add(v.patientId);
    }
    return Array.from(ids);
  }, [currentList, visits, effectiveWeekday, effectiveDateISO]);

  const visiblePatients = todayVisitPatientIds
    ? patients.filter((p) => todayVisitPatientIds.includes(p.id))
    : patients;

  const baseDocuments = todayVisitPatientIds
    ? documents.filter((doc) => todayVisitPatientIds.includes(doc.patientId))
    : documents;

  const scopedDocuments = searchedPatientId
    ? documents.filter((doc) => doc.patientId === searchedPatientId)
    : baseDocuments;

  const filteredDocuments = searchedPatientId
    ? scopedDocuments
    : (selectedPatient && selectedPatient !== 'all'
        ? scopedDocuments.filter(doc => doc.patientId === selectedPatient)
        : scopedDocuments);

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2>{t('documentationTitle')}</h2>
          <p className="text-muted-foreground">{t('documentationSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedPatient}
            onValueChange={(v) => {
              setSelectedPatient(v);
              setSearchedPatientId(null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('allPatients')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPatients')}</SelectItem>
              {visiblePatients.map((patient) => (
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
            onClick={() => setIsAnyPatientSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <CommandDialog
            open={isAnyPatientSearchOpen}
            onOpenChange={setIsAnyPatientSearchOpen}
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
                    value={`${p.name} ${p.address ?? ''} ${p.diagnosis ?? ''}`}
                    className="cursor-pointer"
                    onSelect={() => {
                      setIsAnyPatientSearchOpen(false);
                      setSelectedPatient('all');
                      setSearchedPatientId(p.id);
                    }}
                  >
                    <div className="flex flex-col">
                      <div>{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.address || '—'}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </CommandDialog>

          <NewDocumentationDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
            }}
            allowedPatientIds={todayVisitPatientIds ?? undefined}
          />

          <Button
            onClick={() => {
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('newDocumentation')}
          </Button>
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
                      {new Date(doc.date).toLocaleDateString()} kl. {doc.time} • {t('documentedBy')} {currentEmployee?.name || '—'}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-1">{t('clinicalNotes')}</h4>
                  <p className="text-sm text-muted-foreground">{doc.notes || '—'}</p>
                </div>

                {(() => {
                  const hasVitals = Object.values(doc.vitalSigns).some(v => v);
                  const hasMeds = doc.medications.length > 0;
                  const hasActivities = Boolean(doc.activities);
                  const hasMeals = Boolean(doc.meals);
                  const hasExtra = hasVitals || hasMeds || hasActivities || hasMeals;
                  if (!hasExtra) return null;

                  return (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem
                        value={`details-${doc.id}`}
                        className="border-0 overflow-hidden rounded-md bg-muted/60"
                      >
                        <AccordionTrigger className="py-2 px-3 hover:no-underline">
                          {t('showDetails')}
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pt-2 pb-3 space-y-4">
                          {hasVitals && (
                            <div>
                              <h4 className="mb-2">{t('vitalSigns')}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {doc.vitalSigns.temperature && (
                                  <div className="p-2 bg-background/70 rounded-md border border-border">
                                    <div className="text-xs text-muted-foreground">{t('temperature')}</div>
                                    <div>{doc.vitalSigns.temperature}</div>
                                  </div>
                                )}
                                {doc.vitalSigns.bloodPressure && (
                                  <div className="p-2 bg-background/70 rounded-md border border-border">
                                    <div className="text-xs text-muted-foreground">BP</div>
                                    <div>{doc.vitalSigns.bloodPressure}</div>
                                  </div>
                                )}
                                {doc.vitalSigns.heartRate && (
                                  <div className="p-2 bg-background/70 rounded-md border border-border">
                                    <div className="text-xs text-muted-foreground">{t('heartRate')}</div>
                                    <div>{doc.vitalSigns.heartRate} bpm</div>
                                  </div>
                                )}
                                {doc.vitalSigns.respiratoryRate && (
                                  <div className="p-2 bg-background/70 rounded-md border border-border">
                                    <div className="text-xs text-muted-foreground">{t('respiratoryRate')}</div>
                                    <div>{doc.vitalSigns.respiratoryRate}</div>
                                  </div>
                                )}
                                {doc.vitalSigns.oxygenSaturation && (
                                  <div className="p-2 bg-background/70 rounded-md border border-border">
                                    <div className="text-xs text-muted-foreground">{t('oxygenSaturation')}</div>
                                    <div>{doc.vitalSigns.oxygenSaturation}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {hasMeds && (
                            <div>
                              <h4 className="mb-2">{t('medicationsAdministered')}</h4>
                              <div className="space-y-1">
                                {doc.medications.map((med, index) => (
                                  <div key={index} className="text-sm p-2 bg-background/70 rounded-md border border-border">
                                    <span>{med.name}</span> - <span className="text-muted-foreground">{med.dosage}</span>
                                    {med.time && <span className="text-muted-foreground"> kl. {med.time}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {hasActivities && (
                            <div>
                              <h4 className="mb-1">{t('activitiesMobility')}</h4>
                              <p className="text-sm text-muted-foreground">{doc.activities}</p>
                            </div>
                          )}

                          {hasMeals && (
                            <div>
                              <h4 className="mb-1">{t('mealsNutrition')}</h4>
                              <p className="text-sm text-muted-foreground">{doc.meals}</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })}
        {sortedDocuments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('noDocumentationFound')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}