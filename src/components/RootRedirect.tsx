import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useInspectArchivedStore } from '@/store/useInspectArchivedStore';
import { Loader2 } from 'lucide-react';
import useWorkspaceStore from '../store/useWorkspaceStore';

const RootRedirect = () => {
  const navigate = useNavigate();
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>(); // Get workspaceId from URL if it's implicitly there (e.g. /someId for the root path)
  const { currentWorkspace, initializeWorkspace } = useWorkspaceStore();
  const { isInspectingArchived } = useInspectArchivedStore();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces(isInspectingArchived);

  const [initializationComplete, setInitializationComplete] = useState(false);

  useEffect(() => {
    if (workspacesLoading || initializationComplete) {
      return;
    }

    if (workspaces && workspaces.length > 0) {
      initializeWorkspace(workspaces, urlWorkspaceId); // Call initializeWorkspace
      setInitializationComplete(true);
    } else if (!workspacesLoading && (!workspaces || workspaces.length === 0)) {
      // No workspaces available, navigate to create workspace page
      setInitializationComplete(true);
      navigate("/settings/workspaces", { replace: true });
    }
  }, [workspacesLoading, workspaces, urlWorkspaceId, initializeWorkspace, navigate, initializationComplete]);

  useEffect(() => {
    // This effect runs once initializationComplete is true and currentWorkspace might have been set
    if (initializationComplete) {
      if (currentWorkspace) {
        navigate(`/${currentWorkspace.id}/dashboard`, { replace: true });
      } else {
        // Fallback if after initialization currentWorkspace is still null (e.g. no workspaces, or invalid lastSelectedId)
        // This should ideally be caught by the first effect to navigate to /settings/workspaces
        // but as a safeguard, if we somehow end up here, we can redirect to a safe place
        navigate("/settings/workspaces", { replace: true });
      }
    }
  }, [initializationComplete, currentWorkspace, navigate]);


  return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
};

export default RootRedirect;
