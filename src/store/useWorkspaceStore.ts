import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import useUIStore from './useUIStore'; // Import useUIStore
import { useInspectArchivedStore } from './useInspectArchivedStore'; // Import useInspectArchivedStore
import type { Workspace } from '@/types/workspace';

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  lastSelectedWorkspaceId: string | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setLastSelectedWorkspaceId: (id: string | null) => void;
  initializeWorkspace: (workspaces: Workspace[], urlWorkspaceId?: string | null) => void; // New action
}

const useWorkspaceStore = create<WorkspaceStore>()(devtools((set, get) => ({
  currentWorkspace: null,
  lastSelectedWorkspaceId: localStorage.getItem('lastSelectedWorkspaceId'),
  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace });
    const setDynamicSegmentName = useUIStore.getState().setDynamicSegmentName;

    // Get inspection state
    const { isInspectingArchived, inspectedWorkspaceId, stopInspecting } = useInspectArchivedStore.getState();

    // If an inspected archived workspace was active and we're switching to a different workspace, stop inspecting.
    if (isInspectingArchived && inspectedWorkspaceId && (!workspace || workspace.id !== inspectedWorkspaceId)) {
      stopInspecting();
    }

    if (workspace) {
      localStorage.setItem('lastSelectedWorkspaceId', workspace.id);
      set({ lastSelectedWorkspaceId: workspace.id });
      setDynamicSegmentName(workspace.id, workspace.name); // Set the name in UI store
    } else {
      localStorage.removeItem('lastSelectedWorkspaceId');
      set({ lastSelectedWorkspaceId: null });
      // Optionally clear the dynamic segment name if workspace is cleared
      // if (get().currentWorkspace) { // Check if there was a previous workspace
      //   setDynamicSegmentName(get().currentWorkspace.id, '');
      // }
    }
  },
  setLastSelectedWorkspaceId: (id) => {
    if (id) {
      localStorage.setItem('lastSelectedWorkspaceId', id);
    } else {
      localStorage.removeItem('lastSelectedWorkspaceId');
    }
    set({ lastSelectedWorkspaceId: id });
  },
  initializeWorkspace: (workspaces, urlWorkspaceId) => { // Implementation of new action
    let targetWorkspace: Workspace | null = null;
    const setDynamicSegmentName = useUIStore.getState().setDynamicSegmentName;

    const { isInspectingArchived, inspectedWorkspaceId } = useInspectArchivedStore.getState();

    // NEW LOGIC: Prioritize inspected archived workspace
    if (isInspectingArchived && inspectedWorkspaceId) {
      const foundInspectedWorkspace = workspaces.find(ws => ws.id === inspectedWorkspaceId);
      if (foundInspectedWorkspace) {
        targetWorkspace = foundInspectedWorkspace;
      }
    }

    // Existing logic (only run if no inspected workspace is prioritized)
    if (!targetWorkspace) {
      // 1. Prioritize workspaceId from URL
      if (urlWorkspaceId) {
        targetWorkspace = workspaces.find(ws => ws.id === urlWorkspaceId) || null;
      }

      // 2. If no URL workspaceId or not found, try lastSelectedWorkspaceId
      if (!targetWorkspace && get().lastSelectedWorkspaceId) {
        targetWorkspace = workspaces.find(ws => ws.id === get().lastSelectedWorkspaceId) || null;
      }

      // 3. If still no target, default to the first workspace
      if (!targetWorkspace && workspaces.length > 0) {
        targetWorkspace = workspaces[0];
      }
    }

    // Set current workspace if a target is found and it's different from the current one
    if (targetWorkspace && targetWorkspace.id !== get().currentWorkspace?.id) {
      get().setCurrentWorkspace(targetWorkspace);
      setDynamicSegmentName(targetWorkspace.id, targetWorkspace.name); // Also set dynamic segment name during initialization
    } else if (!targetWorkspace && get().currentWorkspace) {
      // If no target but a currentWorkspace exists, clear it (e.g., all workspaces deleted)
      get().setCurrentWorkspace(null);
      // setDynamicSegmentName(get().currentWorkspace.id, '');
    } else if (targetWorkspace && targetWorkspace.id === get().currentWorkspace?.id) {
        // If the workspace is the same, ensure its name is also set in the UI store
        setDynamicSegmentName(targetWorkspace.id, targetWorkspace.name);
    }
  },
}), { name: 'WorkspaceStore' }));

export default useWorkspaceStore;
