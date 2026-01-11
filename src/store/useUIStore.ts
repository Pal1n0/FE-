// src/store/useUIStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // States from the original useUIStore
  isSidebarOpen: boolean;
  isDarkMode: boolean;

  // States from the old uiStore
  dateFormat: string | null;
  language: string | null;
  // pageTitle: string | null; // No longer needed
  dynamicSegmentNames: Record<string, string>; // New state for dynamic segment names
  
  // New error state
  error: string | null;

  // Actions from both
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setUi: (settings: { dateFormat?: string; language?: string }) => void;
  // setPageTitle: (title: string) => void; // No longer needed
  setDynamicSegmentName: (key: string, name: string) => void; // New action
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  isSidebarOpen: true,
  isDarkMode: false,
  dateFormat: null,
  language: localStorage.getItem('i18nextLng') || null, // Initialize language from localStorage
  // pageTitle: null, // No longer needed
  dynamicSegmentNames: {}, // Initialize dynamicSegmentNames
  error: null,
};

const useUIStore = create<UIState>()(devtools((set) => ({
  ...initialState,

  // Actions from original useUIStore
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  // setPageTitle: (title) => set({ pageTitle: title }), // No longer needed

  // New action to set dynamic segment names
  setDynamicSegmentName: (key, name) => set((state) => ({
    dynamicSegmentNames: {
      ...state.dynamicSegmentNames,
      [key]: name,
    },
  })),

  // Actions from old uiStore and new error handling
  setUi: (settings) => set((state) => ({ ...state, ...settings })),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}), { name: 'UIStore' }));

export default useUIStore;