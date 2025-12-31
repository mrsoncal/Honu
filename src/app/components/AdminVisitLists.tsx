import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { VisitList } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { t } from '../i18n';

export function AdminVisitLists() {
  const { lists, visits, addList, updateList, deleteList } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [editTarget, setEditTarget] = useState<VisitList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const usageByListId = useMemo(() => {
    return visits.reduce((acc, visit) => {
      acc[visit.listId] = (acc[visit.listId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [visits]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const nextNumber = (() => {
      const usedNumbers = new Set<number>();
      for (const list of lists) {
        const match = /^List\s+(\d+)$/i.exec(list.name.trim());
        if (match) usedNumbers.add(Number(match[1]));
      }
      let n = 1;
      while (usedNumbers.has(n)) n += 1;
      return n;
    })();

    const newList: VisitList = {
      id: `list-${Date.now()}`,
      name: `List ${nextNumber}`,
      description: description.trim() || undefined,
      active: true,
    };

    addList(newList);
    setDescription('');
    setIsDialogOpen(false);
  };

  const handleDelete = (list: VisitList) => {
    const count = usageByListId[list.id] || 0;
    const message = count
      ? t('confirmDeleteListWithVisits', { name: list.name, count })
      : t('confirmDeleteList', { name: list.name });

    if (confirm(message)) {
      deleteList(list.id);
    }
  };

  const handleOpenEdit = (list: VisitList) => {
    setEditTarget(list);
    setEditName(list.name);
    setEditDescription(list.description ?? '');
    setIsEditDialogOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    const nextName = editName.trim();
    if (!nextName) return;

    updateList(editTarget.id, {
      name: nextName,
      description: editDescription.trim() || undefined,
    });

    setIsEditDialogOpen(false);
    setEditTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2>{t('listsTitle')}</h2>
          <p className="text-muted-foreground">{t('listsSubtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createList')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t('createVisitList')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="listDescription">{t('descriptionOptional')}</Label>
                <Input
                  id="listDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('createList')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t('editList')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editListName">{t('listName')}</Label>
                <Input
                  id="editListName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editListDescription">{t('descriptionOptional')}</Label>
                <Input
                  id="editListDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('save')}
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
              <TableHead>{t('list')}</TableHead>
              <TableHead>{t('descriptionOptional')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('plannedVisits')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.map((list) => {
              const count = usageByListId[list.id] || 0;
              return (
                <TableRow key={list.id}>
                  <TableCell>{list.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {list.description || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={list.active}
                        onCheckedChange={(checked) => updateList(list.id, { active: checked })}
                        aria-label={list.active ? t('deactivateList') : t('activateList')}
                      />
                      <Badge variant={list.active ? 'default' : 'secondary'}>
                        {list.active ? t('active') : t('inactive')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(list)} aria-label={t('edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(list)} aria-label={t('delete')}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
