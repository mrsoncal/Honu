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
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { t } from '../i18n';
import { getListColorStyle } from '../utils/listColors';

export function AdminVisitLists() {
  const { lists, visits, addList, updateList, deleteList } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [createIsEvening, setCreateIsEvening] = useState(false);
  const [createColor, setCreateColor] = useState<VisitList['color']>('chart-1');
  const [createCustomColor, setCreateCustomColor] = useState<string>('#2563eb');
  const [editTarget, setEditTarget] = useState<VisitList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState<VisitList['color']>('chart-1');
  const [editCustomColor, setEditCustomColor] = useState<string>('#2563eb');

  const colorOptions: Array<NonNullable<VisitList['color']>> = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];
  const CUSTOM_COLOR_VALUE = '__custom__';
  const isTokenColor = (v: string | undefined | null) => !!v && colorOptions.includes(v);
  const colorStyle = (token?: VisitList['color'], opts?: { isEvening?: boolean }) => getListColorStyle(token, opts);
  const plusStyle = (token?: VisitList['color']): React.CSSProperties => {
    const raw = String(token ?? '').trim();
    const accent = isTokenColor(raw) ? `var(--${raw})` : raw;
    return accent ? { color: accent } : {};
  };

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
        const match = /^List\s+(\d+)(?:\s+\(.*\))?$/i.exec(list.name.trim());
        if (match) usedNumbers.add(Number(match[1]));
      }
      let n = 1;
      while (usedNumbers.has(n)) n += 1;
      return n;
    })();

    const eveningSuffix = t('eveningSuffix');
    const name = createIsEvening ? `List ${nextNumber}${eveningSuffix}` : `List ${nextNumber}`;

    const defaultColor = (`chart-${((nextNumber - 1) % 5) + 1}` as NonNullable<VisitList['color']>);
    const pickedColor = (createColor && isTokenColor(createColor))
      ? createColor
      : (createColor === CUSTOM_COLOR_VALUE ? createCustomColor : (createColor ?? defaultColor));

    const newList: VisitList = {
      id: createIsEvening ? `list-${Date.now()}-evening` : `list-${Date.now()}`,
      name,
      description: description.trim() || undefined,
      active: true,
      isEvening: createIsEvening,
      color: pickedColor,
    };

    addList(newList);
    setDescription('');
    setCreateIsEvening(false);
    setCreateColor('chart-1');
    setCreateCustomColor('#2563eb');
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
    setEditColor(list.color ?? 'chart-1');
    if (list.color && !isTokenColor(list.color)) {
      setEditCustomColor(list.color);
    } else {
      setEditCustomColor('#2563eb');
    }
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
      color: (editColor && isTokenColor(editColor))
        ? editColor
        : (editColor === CUSTOM_COLOR_VALUE ? editCustomColor : (editColor ?? 'chart-1')),
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
              <div className="flex items-center justify-between">
                <Label htmlFor="listEvening">{t('eveningList')}</Label>
                <Switch id="listEvening" checked={createIsEvening} onCheckedChange={setCreateIsEvening} />
              </div>

              <div className="space-y-2">
                <Label>{t('listColor')}</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={isTokenColor(createColor) ? (createColor as string) : CUSTOM_COLOR_VALUE}
                  onValueChange={(v) => setCreateColor((v as VisitList['color']) || 'chart-1')}
                  className="w-full"
                >
                  {colorOptions.map((token) => (
                    <ToggleGroupItem key={token} value={token} aria-label={token} className="flex-1">
                      <span className="h-4 w-4 rounded-full ring-1 ring-border" style={colorStyle(token)} />
                    </ToggleGroupItem>
                  ))}
                  <ToggleGroupItem key={CUSTOM_COLOR_VALUE} value={CUSTOM_COLOR_VALUE} aria-label="Custom color" className="flex-1">
                    <span className="relative h-4 w-4" style={plusStyle(createCustomColor)}>
                      <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-current" />
                      <span className="absolute top-0 bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-current" />
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>

                {createColor === CUSTOM_COLOR_VALUE && (
                  <div className="pt-2">
                    <Input
                      type="color"
                      value={createCustomColor}
                      onChange={(e) => setCreateCustomColor(e.target.value)}
                      aria-label="Custom list color"
                      className="h-9 p-1"
                    />
                  </div>
                )}
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

              <div className="space-y-2">
                <Label>{t('listColor')}</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={isTokenColor(editColor) ? (editColor as string) : CUSTOM_COLOR_VALUE}
                  onValueChange={(v) => setEditColor((v as VisitList['color']) || 'chart-1')}
                  className="w-full"
                >
                  {colorOptions.map((token) => (
                    <ToggleGroupItem key={token} value={token} aria-label={token} className="flex-1">
                      <span className="h-4 w-4 rounded-full ring-1 ring-border" style={colorStyle(token)} />
                    </ToggleGroupItem>
                  ))}
                  <ToggleGroupItem key={CUSTOM_COLOR_VALUE} value={CUSTOM_COLOR_VALUE} aria-label="Custom color" className="flex-1">
                    <span className="relative h-4 w-4" style={plusStyle(editCustomColor)}>
                      <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-current" />
                      <span className="absolute top-0 bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-current" />
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>

                {editColor === CUSTOM_COLOR_VALUE && (
                  <div className="pt-2">
                    <Input
                      type="color"
                      value={editCustomColor}
                      onChange={(e) => setEditCustomColor(e.target.value)}
                      aria-label="Custom list color"
                      className="h-9 p-1"
                    />
                  </div>
                )}
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                        style={colorStyle(list.color, { isEvening: Boolean(list.isEvening) || String(list.id).endsWith('-evening') })}
                      />
                      <span>{list.name}</span>
                    </div>
                  </TableCell>
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
