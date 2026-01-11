import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import useWorkspaceStore from '../store/useWorkspaceStore';
import { useWorkspaces } from '../hooks/useWorkspaces';
import apiClient from '@/services/apiClient'; // Import apiClient
import { useInspectArchivedStore } from '@/store/useInspectArchivedStore'; // Import the new store
import { useTranslation } from "react-i18next"; // Import useTranslation
import { Button } from '@/components/ui/button'; // Import Button component


export const WorkspaceLayout = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  console.log("WorkspaceLayout - workspaceId from useParams:", workspaceId);
  const { currentWorkspace, setCurrentWorkspace, initializeWorkspace } = useWorkspaceStore();
  const { isInspectingArchived, inspectedWorkspaceId, stopInspecting } = useInspectArchivedStore();
  const { data: workspaces, isLoading: loading } = useWorkspaces(isInspectingArchived); // Pass isInspectingArchived to fetch all workspaces

  // Removed useEffect for cleanup of inspect mode, as it was too aggressive.
  // The primary logic for stopping inspection now resides in useWorkspaceStore.ts's setCurrentWorkspace.

  useEffect(() => {
    const handleWorkspaceLogic = async () => {
      // Avoid running if workspaces are still loading or not available
      if (!workspaces || loading) {
        return;
      }

      // If we are already displaying the correct workspace, do nothing
      if (currentWorkspace?.id === workspaceId) {
        return;
      }

      // ... (rest of handleWorkspaceLogic)
      if (workspaces && workspaces.length > 0) {
        if (workspaceId) {
          // Check if the workspaceId in the URL matches the current active workspace
          const foundActiveWorkspace = workspaces.find(ws => ws.id === workspaceId);

          if (foundActiveWorkspace) {
            if (currentWorkspace?.id !== workspaceId) {
              setCurrentWorkspace(foundActiveWorkspace);
            }
          } else {
            // Workspace not found in the list of active workspaces,
            // try to fetch it directly in case it's an archived workspace.
            // We need to ensure we don't accidentally fetch a non-existent workspace.
            // This part might need to be more robust if inspect mode is not active.
            try {
              const response = await apiClient.get(`/api/workspaces/${workspaceId}/`, {
                params: { include_archived: true } // Always try to fetch archived here
              });
              const fetchedWorkspace = response.data;
              if (fetchedWorkspace) {
                setCurrentWorkspace(fetchedWorkspace);
              } else {
                // If fetching directly also fails (e.g., invalid ID), redirect.
                // Fallback to initialization logic if no workspace is found
                initializeWorkspace(workspaces, workspaceId);
                const storeCurrent = useWorkspaceStore.getState().currentWorkspace;
                if (storeCurrent) {
                  navigate(`/${storeCurrent.id}/dashboard`, { replace: true });
                } else if (workspaces.length > 0) {
                  navigate(`/${workspaces[0].id}/dashboard`, { replace: true });
                } else {
                  // No workspaces at all, clear current
                  setCurrentWorkspace(null);
                }
              }
            } catch (error) {
              console.error("Failed to fetch specific workspace:", error);
              // If fetching fails, redirect to a valid workspace or dashboard
              initializeWorkspace(workspaces, workspaceId);
              const storeCurrent = useWorkspaceStore.getState().currentWorkspace;
              if (storeCurrent) {
                navigate(`/${storeCurrent.id}/dashboard`, { replace: true });
              } else if (workspaces.length > 0) {
                navigate(`/${workspaces[0].id}/dashboard`, { replace: true });
              } else {
                // No workspaces at all, clear current
                setCurrentWorkspace(null);
              }
            }
          }
        } else if (!workspaceId && currentWorkspace) {
          // If no workspaceId in URL but we have a current one, navigate to it
          navigate(`/${currentWorkspace.id}/dashboard`, { replace: true });
        } else if (!currentWorkspace && !workspaceId) {
          // If no current workspace and no workspaceId in URL, try to initialize
          initializeWorkspace(workspaces, null);
          const storeCurrent = useWorkspaceStore.getState().currentWorkspace;
          if (storeCurrent) {
            navigate(`/${storeCurrent.id}/dashboard`, { replace: true });
          }
        }
      } else if (!loading && !workspaces?.length && !currentWorkspace) {
        // If no workspaces and not loading, clear current workspace
        setCurrentWorkspace(null);
      }
    };

    handleWorkspaceLogic();
  }, [workspaceId, workspaces, initializeWorkspace, navigate, loading]);

  const showInspectBanner = isInspectingArchived && inspectedWorkspaceId === currentWorkspace?.id;

  if (loading) {
    return <div>Loading workspace...</div>;
  }

  return (
    <>
      {showInspectBanner && (
        <div className="bg-yellow-100 dark:bg-yellow-950/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4 mb-4 flex items-center justify-between" role="alert">
          <div>
            <p className="font-bold">{t('workspaces.detail.inspectModeTitle')}</p>
            <p>{t('workspaces.detail.inspectModeDescription')}</p>
          </div>
          <Button onClick={stopInspecting} variant="ghost" className="text-yellow-700 dark:text-yellow-200 hover:bg-yellow-200/50 dark:hover:bg-yellow-800/50">
            {t('workspaces.stopInspecting')}
          </Button>
        </div>
      )}
      <Outlet />
    </>
  );
};
