import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Task } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Plus, CheckCircle2, Circle } from 'lucide-react';

export function TaskList() {
  const { tasks, patients, employees, currentUser, addTask, updateTask, deleteTask } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    patientId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in-progress' | 'completed',
    dueDate: '',
    assignedTo: currentUser?.id || '',
  });

  const handleOpenDialog = () => {
    setFormData({
      patientId: '',
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: currentUser?.id || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === formData.patientId);
    const employee = employees.find(emp => emp.id === formData.assignedTo);
    
    if (!patient || !employee) return;

    const newTask: Task = {
      ...formData,
      id: Date.now().toString(),
      patientName: patient.name,
      assignedToName: employee.name,
    };
    addTask(newTask);
    setIsDialogOpen(false);
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      console.log(`Task "${task.title}" status changed from "${task.status}" to "${newStatus}"`);
      console.log('Task details:', { 
        id: taskId, 
        patient: task.patientName, 
        previousStatus: task.status, 
        newStatus 
      });
    }
    updateTask(taskId, { status: newStatus });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const filteredTasks = tasks
    .filter(task => currentUser ? task.assignedTo === currentUser.id : true)
    .filter(task => filterStatus === 'all' || task.status === filterStatus)
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const groupedByPatient = filteredTasks.reduce((acc, task) => {
    if (!acc[task.patientId]) {
      acc[task.patientId] = [];
    }
    acc[task.patientId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2>My Tasks</h2>
          <p className="text-muted-foreground">
            Tasks assigned to {currentUser?.name || 'you'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Not Started</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
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
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Task</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByPatient).map(([patientId, patientTasks]) => {
          const patient = patients.find(p => p.id === patientId);
          if (!patient) return null;

          return (
            <Card key={patientId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{patient.name}</span>
                  <Badge variant="outline">{patientTasks.length} tasks</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{patient.diagnosis}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <button
                        onClick={() => {
                          const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
                          handleStatusChange(task.id, nextStatus);
                        }}
                        className="mt-0.5"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                            {task.title}
                          </h4>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          <span>Status: {task.status === 'pending' ? 'Not Started' : 'Completed'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No tasks found. {filterStatus !== 'all' && 'Try changing the filter or '}Add a new task to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}