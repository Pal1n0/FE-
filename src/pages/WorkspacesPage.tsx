import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import type { Workspace } from "@/types";
import { CreateWorkspaceModal } from '@/features/workspaces/CreateWorkspaceModal';
import { WorkspaceActions } from '../features/workspaces/WorkspaceActions';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useInspectArchivedStore } from '@/store/useInspectArchivedStore';
import useWorkspaceStore from '@/store/useWorkspaceStore'; // Correctly placed import
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { fetchWorkspaces } from '@/services/workspaceService'; // Import fetchWorkspaces


export function WorkspacesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startInspecting = useInspectArchivedStore((state) => state.startInspecting);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace); // Get setCurrentWorkspace from useWorkspaceStore
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(() => {
    const storedValue = localStorage.getItem('showArchived');
    return storedValue ? JSON.parse(storedValue) : false;
  });
  const { data: workspaces, isLoading, isError } = useWorkspaces(showArchived, true); // Request to include permissions

  // New query to check for the existence of any archived workspaces
  const { data: allWorkspaces, isLoading: isAllWorkspacesLoading } = useQuery({
    queryKey: ['allWorkspacesCheck'],
    queryFn: () => fetchWorkspaces(true, false), // Fetch all (including archived), but no permissions needed for this check
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
  });

  const hasArchivedWorkspaces = allWorkspaces?.some(ws => !ws.is_active);


  useEffect(() => {
    localStorage.setItem('showArchived', JSON.stringify(showArchived));
  }, [showArchived]);

  // The useEffect for stopInspecting is removed as per the refined logic.

  useEffect(() => {
    document.title = t('workspaces.manage');
  }, [t]);

  if (isLoading || isAllWorkspacesLoading) {
    return <div>{t('workspaces.loading')}</div>;
  }

  if (isError || !workspaces) {
    return <div>{t('workspaces.error_fetching')}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {t("workspaces.manage")}
        </h2>
        <div className="flex items-center space-x-2">
          {hasArchivedWorkspaces && ( // Conditionally render the switch
            <>
              <Label htmlFor="show-archived">{t('workspaces.show_archived')}</Label>
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
            </>
          )}
          <Button onClick={() => setIsModalOpen(true)}>{t("workspaces.create.button")}</Button>
        </div>
      </div>
      <div className="space-y-4">
        {[...(workspaces || [])]
          .reverse()
          .sort((a, b) => {
            if (a.is_active && !b.is_active) return -1;
            if (!a.is_active && b.is_active) return 1;
            return 0;
          })
          .map((workspace) => (
          <Card key={workspace.id} className={!workspace.is_active ? "border-red-400 bg-red-50 dark:bg-red-950/20 dark:border-red-700" : ""}>
            <CardHeader>
              <CardTitle>
                {workspace.name}
                {!workspace.is_active && (
                  <span className="ml-2 px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded-full">
                    {t('workspaces.archived_status')}
                  </span>
                )}
              </CardTitle>
              <CardDescription>{workspace.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-2">
              <Link to={`/settings/workspaces/${workspace.id}`}>
                <Button variant="outline">
                  {t("workspaces.view")}
                </Button>
              </Link>
              {!workspace.is_active && (
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={() => {
                    startInspecting(workspace.id);
                    setCurrentWorkspace(workspace); // Set the inspected workspace as the current active workspace
                    navigate('/dashboard'); // Navigate to the dashboard
                  }}
                >
                  {t("workspaces.inspect_archived")}
                </Button>
              )}
              {workspace && <WorkspaceActions workspace={workspace} isCompact={true} />}
            </CardContent>
          </Card>
        ))}
      </div>
      <CreateWorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
