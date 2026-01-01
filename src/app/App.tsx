import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AdminEmployees } from './components/AdminEmployees';
import { AdminPatients } from './components/AdminPatients';
import { AdminVisitLists } from './components/AdminVisitLists';
import { TaskList } from './components/TaskList';
import { PatientDocumentation } from './components/PatientDocumentation';
import { sanitizeRichTextHtml } from './utils/sanitizeRichTextHtml';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Switch } from './components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { UserCircle, Users, ClipboardList, LayoutDashboard, FileText, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getI18nEnabled, setI18nEnabled, t } from './i18n';

const CarePlanEditorScreen = lazy(() => import('./components/CarePlanEditorScreen'));

type View = 'admin' | 'tasks' | 'documentation';

function AppContent() {
  const { currentEmployee, currentList, lists, setCurrentList, patients, visits, updatePatient, effectiveWeekday, devWeekdayOverride, shiftDevWeekday, clearDevWeekdayOverride } = useApp();
  const isDevBuild = import.meta.env.DEV;
  const [currentView, setCurrentView] = useState<View>('tasks');
  const [adminTab, setAdminTab] = useState<'employees' | 'patients' | 'lists'>('employees');
  const [i18nEnabled, setI18nEnabledState] = useState(getI18nEnabled());
  const [carePlanScreen, setCarePlanScreen] = useState<null | { patientId: string; mode: 'view' | 'edit' }>(null);
  const [devButtonsEnabled, setDevButtonsEnabled] = useState<boolean>(() => {
    if (!import.meta.env.DEV) return false;
    try {
      const raw = window.localStorage.getItem('dev:headerDevButtonsEnabled');
      if (raw === null) return true;
      return raw === '1' || raw === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!isDevBuild) return;
    try {
      window.localStorage.setItem('dev:headerDevButtonsEnabled', devButtonsEnabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [devButtonsEnabled, isDevBuild]);

  const closeCarePlanScreen = () => {
    if (!carePlanScreen) return;
    setCarePlanScreen(null);
  };

  const weekdayLabel = useMemo(() => {
    const map: Record<string, string> = {
      mon: 'MON',
      tue: 'TUE',
      wed: 'WED',
      thu: 'THU',
      fri: 'FRI',
      sat: 'SAT',
      sun: 'SUN',
    };
    return map[effectiveWeekday] ?? String(effectiveWeekday).toUpperCase();
  }, [effectiveWeekday]);

  const pageX = 'mx-auto w-full max-w-7xl px-1 sm:px-4 lg:px-8';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className={`${pageX} py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <img
                  src={`${import.meta.env.BASE_URL}images/honu-logo.png`}
                  alt="Honu"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div>
                <h1 className="font-semibold">{t('appTitle')}</h1>
                <p className="text-sm text-muted-foreground">{t('appSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm">{t('loggedInAs')}</p>
                <div className="flex items-center justify-end gap-1">
                  <p className="text-xs text-muted-foreground">{currentEmployee?.name || '—'}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t('userMenu')}
                        title={t('userMenu')}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          // TODO: wire real logout
                          console.log('log out');
                        }}
                      >
                        {t('logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Select
                value={currentList?.id || ''}
                onValueChange={(value) => {
                  closeCarePlanScreen();
                  setCurrentList(lists.find(l => l.id === value) || null);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('selectList')} />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id} className={list.active ? undefined : 'text-muted-foreground'}>
                      {list.name}{list.active ? '' : t('inactiveSuffix')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isDevBuild && devButtonsEnabled && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const next = !i18nEnabled;
                      setI18nEnabled(next);
                      setI18nEnabledState(next);
                    }}
                    title="DEV: Toggle language config (Norwegian ↔ English)"
                  >
                    DEV: {i18nEnabled ? 'NB' : 'EN'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => shiftDevWeekday(-1)}
                      title="DEV: Previous weekday"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={devWeekdayOverride ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => clearDevWeekdayOverride()}
                      title={devWeekdayOverride ? 'DEV: Clear weekday override (use Oslo)' : 'DEV: Using Oslo weekday'}
                    >
                      DEV DAY: {weekdayLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => shiftDevWeekday(1)}
                      title="DEV: Next weekday"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card/50">
        <div className={pageX}>
          <div className="flex gap-1">
            <Button
              variant={currentView === 'admin' ? 'default' : 'ghost'}
              onClick={() => {
                closeCarePlanScreen();
                setCurrentView('admin');
              }}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={currentView === 'admin'}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              {t('navAdministration')}
            </Button>
            <Button
              variant={currentView === 'tasks' ? 'default' : 'ghost'}
              onClick={() => {
                closeCarePlanScreen();
                setCurrentView('tasks');
              }}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={currentView === 'tasks'}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              {t('navTasks')}
            </Button>
            <Button
              variant={currentView === 'documentation' ? 'default' : 'ghost'}
              onClick={() => {
                closeCarePlanScreen();
                setCurrentView('documentation');
              }}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={currentView === 'documentation'}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('navDocumentation')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`${pageX} py-8`}>
        {carePlanScreen && (() => {
          const patient = patients.find(p => p.id === carePlanScreen.patientId);
          if (!patient) return null;

          const relevantVisits = visits
            .filter(v => v.patientId === patient.id)
            .filter(() => true);

          const plannedVisitWeekdaysByTime = (() => {
            const byTime = new Map<string, Set<string>>();
            for (const v of relevantVisits) {
              const time = typeof v.time === 'string' ? v.time.trim() : '';
              if (!time) continue;
              if (!byTime.has(time)) byTime.set(time, new Set());
              const set = byTime.get(time)!;
              for (const d of v.weekdays ?? []) set.add(d);
            }

            const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            const out: Record<string, any> = {};
            for (const [time, set] of byTime.entries()) {
              out[time] = order.filter((d) => set.has(d));
            }
            return out as Record<string, import('./types').Weekday[]>;
          })();

          const plannedTimes = Array.from(new Set(Object.keys(plannedVisitWeekdaysByTime))).sort((a, b) => a.localeCompare(b));

          return (
            <Suspense
              fallback={
                <div className="text-sm text-muted-foreground">{t('loading')}</div>
              }
            >
              <CarePlanEditorScreen
                patientId={patient.id}
                patientName={patient.name}
                initialHtml={patient.plan ?? ''}
                plannedTimes={plannedTimes}
                plannedTimeWeekdays={plannedVisitWeekdaysByTime}
                visitListId={(visits.find(v => v.patientId === patient.id)?.listId) ?? (currentList?.id || '')}
                mode={carePlanScreen.mode}
                onBack={() => setCarePlanScreen(null)}
                onSave={(nextPlan: string) => {
                  updatePatient(patient.id, { plan: nextPlan });
                }}
              />
            </Suspense>
          );
        })()}

        {!carePlanScreen && (
          <>
            {currentView === 'admin' && (
              <Card>
                <CardContent className="p-6">
                  <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as 'employees' | 'patients' | 'lists')}>
                    <TabsList className="mb-6">
                      <TabsTrigger value="employees">
                        <Users className="h-4 w-4 mr-2" />
                        {t('adminEmployeesTab')}
                      </TabsTrigger>
                      <TabsTrigger value="patients">
                        <UserCircle className="h-4 w-4 mr-2" />
                        {t('adminPatientsTab')}
                      </TabsTrigger>
                      <TabsTrigger value="lists">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        {t('adminListsTab')}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="employees">
                      <AdminEmployees />
                    </TabsContent>
                    <TabsContent value="patients">
                      <AdminPatients onEditCarePlan={(patientId) => setCarePlanScreen({ patientId, mode: 'edit' })} />
                    </TabsContent>
                    <TabsContent value="lists">
                      <AdminVisitLists />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {currentView === 'tasks' && (
              <TaskList onOpenCarePlan={(patientId) => setCarePlanScreen({ patientId, mode: 'view' })} />
            )}

            {currentView === 'documentation' && <PatientDocumentation />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-card/50">
        <div className={`${pageX} relative text-center text-sm text-muted-foreground`}>
          <p>Honu AS © {new Date().getFullYear()} – {t('appSubtitle')}</p>

          {isDevBuild && (
            <div className="absolute bottom-0 right-0 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">DEV</span>
              <Switch checked={devButtonsEnabled} onCheckedChange={setDevButtonsEnabled} />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
