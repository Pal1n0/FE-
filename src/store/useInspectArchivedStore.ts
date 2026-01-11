import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface InspectArchivedState {
  isInspectingArchived: boolean;
  inspectedWorkspaceId: string | null;
  startInspecting: (workspaceId: string) => void;
  stopInspecting: () => void;
}

export const useInspectArchivedStore = create<InspectArchivedState>()(
  persist(
    devtools(
      (set) => ({
        isInspectingArchived: false,
        inspectedWorkspaceId: null,
        startInspecting: (workspaceId) => set({ isInspectingArchived: true, inspectedWorkspaceId: workspaceId }),
        stopInspecting: () => set({ isInspectingArchived: false, inspectedWorkspaceId: null }),
      }),
      { name: 'InspectArchivedStore' }
    ),
    {
      name: 'inspect-archived-storage', // unique name for localStorage key
      // optionally define which parts of the state to persist
      // partialize: (state) => ({ isInspectingArchived: state.isInspectingArchived, inspectedWorkspaceId: state.inspectedWorkspaceId }),
    }
  )
);
