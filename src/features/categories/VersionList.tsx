
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCategoryStore from '../../store/useCategoryStore';
import * as types from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParams } from 'react-router-dom';
import { Check, Plus, Copy, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const VersionList = ({ type }: { type: 'expense' | 'income' }) => {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { versions, selectedVersion, createVersion, updateVersion, activateVersion, setActiveVersion, fetchCategories, isEditing } = useCategoryStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [versionLevels, setVersionLevels] = useState(5);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!workspaceId) return;
    await createVersion(workspaceId, type, {
        name: versionName,
        levels_count: versionLevels,
        description: versionDescription || "Created from frontend"
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
      if (!workspaceId || !editingVersionId) return;
      await updateVersion(workspaceId, type, editingVersionId, {
          name: versionName,
          description: versionDescription
      });
      setIsEditOpen(false);
      resetForm();
  };

  const openEdit = (e: React.MouseEvent, version: types.CategoryVersion) => {
      e.stopPropagation();
      setEditingVersionId(version.id);
      setVersionName(version.name);
      setVersionDescription(version.description || '');
      setVersionLevels(version.levels_count); // Just for display, not editable
      setIsEditOpen(true);
  };

  const resetForm = () => {
      setVersionName('');
      setVersionDescription('');
      setVersionLevels(5);
      setEditingVersionId(null);
  };

  const handleActivate = async (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation();
    if (!workspaceId) return;
    await activateVersion(workspaceId, type, versionId);
  };

  const handleSelect = (version: types.CategoryVersion) => {
      if (!workspaceId) return;
      setActiveVersion(version);
      fetchCategories(workspaceId, type, version.id);
  };

  const editingVersion = versions.find(v => v.id === editingVersionId);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="font-semibold">{t('categories.versions')}</h3>
            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1"/> {t('common.add')}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('categories.createVersion')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('common.name')}</Label>
                            <Input value={versionName} onChange={e => setVersionName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('common.description')}</Label>
                            <Input value={versionDescription} onChange={e => setVersionDescription(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('categories.levels')}</Label>
                            <Input
                                type="number"
                                min={1} max={5}
                                value={versionLevels}
                                onChange={e => setVersionLevels(Number(e.target.value))}
                            />
                        </div>
                        <Button onClick={handleCreate} disabled={!versionName}>{t('common.create')}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if(!open) resetForm(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('categories.editVersion')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('common.name')}</Label>
                            <Input value={versionName} onChange={e => setVersionName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('common.description')}</Label>
                            <Input value={versionDescription} onChange={e => setVersionDescription(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('categories.levels')} (Read-only)</Label>
                            <Input value={versionLevels} disabled />
                        </div>
                        <div className="flex justify-between items-center">
                            <Button onClick={handleUpdate} disabled={!versionName}>{t('common.save')}</Button>
                            {editingVersion && !editingVersion.is_active && (
                                <Button 
                                    variant="secondary" 
                                    onClick={(e) => { 
                                        handleActivate(e, editingVersion.id);
                                        setIsEditOpen(false);
                                    }}
                                >
                                    {t('categories.activate')}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        <ul className="space-y-2">
            {versions.map((version) => (
                <li
                    key={version.id}
                    className={`p-3 rounded-md border flex justify-between items-center cursor-pointer hover:bg-accent ${selectedVersion?.id === version.id ? 'ring-2 ring-primary' : ''} ${version.is_active ? 'bg-primary/5' : 'bg-background'}`}
                    onClick={() => handleSelect(version)}
                >
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {version.name}
                            {version.is_active && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Active</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(version.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1">
                        {isEditing && (
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => openEdit(e, version)}>
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    </div>
  );
};
