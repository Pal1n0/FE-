
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User } from '../types';

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  dateFormat: string | null;
  language: string | null;
  setCredentials: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void; // New action to update only user data
  setUserSettings: (settings: { dateFormat?: string; language?: string }) => void;
}

const useUserStore = create<UserState>()(devtools((set) => {
  console.log('UserStore created');
  return {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    dateFormat: null,
    language: null,
    setCredentials: (user, token) => {
      console.log('setCredentials called', { user, token });
      set({ user, token, isAuthenticated: true });
      localStorage.setItem('token', token);
    },
    setUser: (user) => { // Implementation of the new setUser action
      set({ user });
    },
    logout: () => {
      set({ user: null, token: null, isAuthenticated: false });
      localStorage.removeItem('token');
    },
    setUserSettings: (settings) =>
      set((state) => ({
        ...state,
        ...settings,
      })),
  };
}, { name: 'UserStore' }));

export default useUserStore;
