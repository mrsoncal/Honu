import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { t } from '../i18n';

export function AdminEmployees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive',
    hireDate: '',
  });

  const normalizeForUsername = (input: string): string => {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  };

  const baseUsernameFromName = (name: string): string => {
    const parts = String(name)
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const first = normalizeForUsername(parts[0] ?? '');
    const last = normalizeForUsername(parts.length > 1 ? parts[parts.length - 1] : '');

    const first2 = first.slice(0, 2);
    const last2 = last.slice(0, 2);

    const base = `${first2}${last2}`.trim();
    if (base.length >= 4) return base;
    if (first) return first.slice(0, 4);
    return 'user';
  };

  const uniqueUsername = (base: string, taken: Set<string>): string => {
    const cleaned = normalizeForUsername(base) || 'user';
    if (!taken.has(cleaned)) return cleaned;
    let i = 2;
    while (taken.has(`${cleaned}${i}`)) i += 1;
    return `${cleaned}${i}`;
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        username: employee.username,
        password: '',
        role: employee.role,
        phone: employee.phone,
        email: employee.email,
        status: employee.status,
        hireDate: employee.hireDate,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        role: '',
        phone: '',
        email: '',
        status: 'active',
        hireDate: new Date().toISOString().split('T')[0],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taken = new Set(
      employees
        .filter((e) => e.id !== editingEmployee?.id)
        .map((e) => normalizeForUsername(e.username))
    );

    const username = editingEmployee
      ? editingEmployee.username
      : uniqueUsername(baseUsernameFromName(formData.name), taken);

    if (editingEmployee) {
      const password = formData.password.trim();
      updateEmployee(editingEmployee.id, {
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        email: formData.email,
        status: formData.status,
        hireDate: formData.hireDate,
        ...(password ? { password } : {}),
      });
    } else {
      const newEmployee: Employee = {
        name: formData.name,
        username,
        ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
        role: formData.role,
        phone: formData.phone,
        email: formData.email,
        status: formData.status,
        hireDate: formData.hireDate,
        id: Date.now().toString(),
      };
      addEmployee(newEmployee);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDeleteEmployee'))) {
      deleteEmployee(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2>{t('employeeManagementTitle')}</h2>
          <p className="text-muted-foreground">{t('employeeManagementSubtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addEmployee')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editingEmployee ? t('editEmployee') : t('addNewEmployee')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('fullName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setFormData((prev) => {
                      if (editingEmployee) return { ...prev, name: nextName };
                      const taken = new Set(employees.map((emp) => normalizeForUsername(emp.username)));
                      const nextUsername = uniqueUsername(baseUsernameFromName(nextName), taken);
                      return { ...prev, name: nextName, username: nextUsername };
                    });
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t('username')}</Label>
                <Input
                  id="username"
                  value={editingEmployee ? editingEmployee.username : formData.username}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {editingEmployee ? (
                  <p className="text-xs text-muted-foreground">{t('leaveBlankToKeepPassword')}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('role')}</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder={t('rolePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+47 912 34 567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t('status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">{t('hireDate')}</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">
                  {editingEmployee ? t('save') : t('addEmployee')}
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
              <TableHead>{t('fullName')}</TableHead>
              <TableHead>{t('username')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead>{t('hireDate')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.name}</TableCell>
                <TableCell className="font-mono text-sm">{employee.username}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{employee.email}</div>
                    <div className="text-muted-foreground">{employee.phone}</div>
                  </div>
                </TableCell>
                <TableCell>{new Date(employee.hireDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                    {employee.status === 'active' ? t('active') : t('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}