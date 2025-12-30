import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AdminEmployees } from './components/AdminEmployees';
import { AdminPatients } from './components/AdminPatients';
import { TaskList } from './components/TaskList';
import { PatientDocumentation } from './components/PatientDocumentation';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { UserCircle, Users, ClipboardList, LayoutDashboard, LogOut, FileText } from 'lucide-react';

type View = 'admin' | 'tasks' | 'documentation';

function AppContent() {
  const { currentUser, employees, setCurrentUser } = useApp();
  const [currentView, setCurrentView] = useState<View>('tasks');
  const [adminTab, setAdminTab] = useState<'employees' | 'patients'>('employees');

  const handleUserSwitch = () => {
    const currentIndex = employees.findIndex(emp => emp.id === currentUser?.id);
    const nextIndex = (currentIndex + 1) % employees.length;
    setCurrentUser(employees[nextIndex]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">HomeCare Nursing</h1>
                <p className="text-sm text-muted-foreground">Professional Home Healthcare</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleUserSwitch}>
                <LogOut className="h-4 w-4 mr-2" />
                Switch User
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <Button
              variant={currentView === 'admin' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('admin')}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={currentView === 'admin'}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Administration
            </Button>
            <Button
              variant={currentView === 'tasks' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('tasks')}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={currentView === 'tasks'}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              My Tasks
            </Button>
            <Button
              variant={currentView === 'documentation' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('documentation')}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={currentView === 'documentation'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Documentation
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'admin' && (
          <Card>
            <CardContent className="p-6">
              <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as 'employees' | 'patients')}>
                <TabsList className="mb-6">
                  <TabsTrigger value="employees">
                    <Users className="h-4 w-4 mr-2" />
                    Employees
                  </TabsTrigger>
                  <TabsTrigger value="patients">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Patients
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="employees">
                  <AdminEmployees />
                </TabsContent>
                <TabsContent value="patients">
                  <AdminPatients />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {currentView === 'tasks' && <TaskList />}

        {currentView === 'documentation' && <PatientDocumentation />}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-card/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>HomeCare Nursing System © 2024 - Professional Home Healthcare Management</p>
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
