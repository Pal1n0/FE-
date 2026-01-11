
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import useCategoryStore from '../../store/useCategoryStore';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Edit2, Save, X, LayoutList, Network, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VersionList } from './VersionList';
import { CategoryTree } from './CategoryTree';
import { CategoryVisualTree } from './CategoryVisualTree';

export const CategoryManager = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const {
    activeVersion,
    selectedVersion,
    fetchVersions,
    fetchCategories,
    isLoading,
    saveChanges,
    isEditing,
    startEditing,
    stopEditing,
    addCategory,
    error
  } = useCategoryStore();

  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine current type from URL path or query params
  const isIncome = location.pathname.includes('incomes') || location.search.includes('type=income');
  const type = isIncome ? 'income' : 'expense';

  useEffect(() => {
    if (workspaceId) {
      const loadData = async () => {
        try {
          await fetchVersions(workspaceId, type);
          await fetchCategories(workspaceId, type);
        } catch (error) {
          console.error("Failed to load category data:", error);
        }
      };
      
      loadData();
      stopEditing();
    }
  }, [workspaceId, type, fetchVersions, fetchCategories, stopEditing]);

  const handleAddChild = (parentId: string | null, parentTempId: string | null, level: number) => {
      if (!isEditing) startEditing();
      // Ensure we don't exceed max level (usually 5)
      // The logic for levels is handled in addCategory or backend, but UI feedback is good.
      // We'll just add it.
      addCategory(parentId, parentTempId, { level: level + 1 });
  };

  const FullscreenOverlay = ({ children }: { children: React.ReactNode }) => (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 <Network className="h-5 w-5" />
                 {t('nav.categories')} - Graph View
              </h2>
              <div className="flex items-center gap-4">
                  {isEditing ? (
                      <>
                          <Button variant="default" size="sm" onClick={() => workspaceId && saveChanges(workspaceId, type)}>
                              <Save className="h-4 w-4 mr-2" /> {t('common.save')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                              if (workspaceId) fetchCategories(workspaceId, type);
                              stopEditing();
                          }}>
                              <X className="h-4 w-4 mr-2" /> {t('common.cancel')}
                          </Button>
                      </>
                  ) : (
                      <Button variant="outline" size="sm" onClick={startEditing} disabled={!selectedVersion}>
                          <Edit2 className="h-4 w-4 mr-2" /> {t('common.edit')}
                      </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)}>
                      <Minimize2 className="h-4 w-4 mr-2" /> Exit Fullscreen
                  </Button>
              </div>
          </div>
          <div className="flex-1 overflow-hidden p-4 bg-slate-50">
              {children}
          </div>
      </div>
  );

  const content = viewMode === 'list' ? (
      <CategoryTree />
  ) : (
      <CategoryVisualTree 
          onAddChild={handleAddChild} 
          isEditing={isEditing}
      />
  );

  return (
    <div className="p-6 space-y-6">
      {isFullscreen && viewMode === 'graph' && (
          <FullscreenOverlay>
              {content}
          </FullscreenOverlay>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
            {isIncome ? t('nav.incomeCategories') : t('nav.expenseCategories')}
        </h1>
      </div>

      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionList type={type} />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-9">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedVersion ? (
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                            {selectedVersion.name}
                            {selectedVersion.is_active && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Active</span>}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                             Required Depth: {selectedVersion.levels_count || 5} levels
                        </span>
                    </div>
                ) : t('categories.selectVersion')}
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                    <Button 
                        variant={viewMode === 'list' ? 'default' : 'ghost'} 
                        size="sm" 
                        className="h-7 px-3"
                        onClick={() => setViewMode('list')}
                    >
                        <LayoutList className="h-4 w-4 mr-1" /> List
                    </Button>
                    <Button 
                        variant={viewMode === 'graph' ? 'default' : 'ghost'} 
                        size="sm" 
                        className="h-7 px-3"
                        onClick={() => setViewMode('graph')}
                    >
                        <Network className="h-4 w-4 mr-1" /> Graph
                    </Button>
                </div>
                
                {viewMode === 'graph' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(true)} title="Fullscreen">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                )}

                {isEditing ? (
                  <>
                      <Button variant="default" size="sm" onClick={() => workspaceId && saveChanges(workspaceId, type)}>
                          <Save className="h-4 w-4 mr-2" /> {t('common.save')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                          if (workspaceId) fetchCategories(workspaceId, type);
                          stopEditing();
                      }}>
                          <X className="h-4 w-4 mr-2" /> {t('common.cancel')}
                      </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditing} disabled={!selectedVersion}>
                      <Edit2 className="h-4 w-4 mr-2" /> {t('common.edit')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                content
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
