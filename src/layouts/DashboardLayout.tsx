import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Wallet, Settings, LogOut, AlertTriangle, Landmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import useUserStore from '@/store/useUserStore';
import useUIStore from '@/store/useUIStore';
import { CollapsibleNav } from '@/components/layout/CollapsibleNav';
import useWorkspaceStore from '@/store/useWorkspaceStore';
import { useWorkspaces } from '@/hooks/useWorkspaces'; // Import useWorkspaces hook
import { useInspectArchivedStore } from '@/store/useInspectArchivedStore';

export function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const logout = useUserStore((state) => state.logout);
  const setUserSettings = useUserStore((state) => state.setUserSettings);
  const setUi = useUIStore((state) => state.setUi);


  const { data: userSettings, isLoading: isInitLoading, isError: loadError } = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => apiClient.get('api/v1/finance/user-settings/').then(res => res.data),
    enabled: isAuthenticated,
    retry: false,
    onError: (err) => {
      console.error("Failed to fetch user settings:", err);
    },
  });

  // Fetch workspaces using the useWorkspaces hook
  const { initializeWorkspace, currentWorkspace: activeWorkspace } = useWorkspaceStore();
  const { isInspectingArchived } = useInspectArchivedStore();

  // Fetch workspaces using the useWorkspaces hook
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces(isInspectingArchived);
  
  useEffect(() => {
    if (!loadingWorkspaces && workspaces) {
      // If workspaces are loaded, call initializeWorkspace.
      // If workspaces is an empty array, initializeWorkspace will handle clearing the current workspace.
      initializeWorkspace(workspaces, workspaceId);
    }
  }, [loadingWorkspaces, workspaces, initializeWorkspace, workspaceId]);


  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (userSettings) {
      const localStorageLang = localStorage.getItem('i18nextLng');

      if (!localStorageLang && userSettings.language) {
        i18n.changeLanguage(userSettings.language);
        localStorage.setItem('i18nextLng', userSettings.language);
        setUi({ language: userSettings.language });
      } else if (localStorageLang && localStorageLang !== i18n.language) {
        i18n.changeLanguage(localStorageLang);
        setUi({ language: localStorageLang });
      }

      if (userSettings.language) {
          setUserSettings({ language: userSettings.language });
      }
      if (userSettings.date_format) {
          setUserSettings({ dateFormat: userSettings.date_format });
          setUi({ dateFormat: userSettings.date_format }); 
      }
    }
  }, [userSettings, i18n, setUi, setUserSettings]);

  const navItems = [
    {
      href: activeWorkspace ? `/${activeWorkspace.id}/dashboard` : '#',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      disabled: !activeWorkspace,
    },
    {
      icon: Wallet,
      label: t('nav.transactions'),
      disabled: !activeWorkspace,
      subItems: [
        { href: activeWorkspace ? `/${activeWorkspace.id}/transactions/expenses` : '#', label: t('nav.expenses'), disabled: !activeWorkspace },
        { href: activeWorkspace ? `/${activeWorkspace.id}/transactions/incomes` : '#', label: t('nav.incomes'), disabled: !activeWorkspace },
      ],
    },
    {
      icon: Landmark,
      label: t('nav.categories'),
      disabled: !activeWorkspace,
      subItems: [
        { href: activeWorkspace ? `/${activeWorkspace.id}/categories/expenses` : '#', label: t('nav.expenseCategories'), disabled: !activeWorkspace },
        { href: activeWorkspace ? `/${activeWorkspace.id}/categories/incomes` : '#', label: t('nav.incomeCategories'), disabled: !activeWorkspace },
        { href: activeWorkspace ? `/${activeWorkspace.id}/settings/tags` : '#', label: t('nav.tagManagement'), disabled: !activeWorkspace },
      ],
    },
    {
      icon: Settings,
      label: t('nav.settings'),
      subItems: [
        { href: '/settings/user', label: t('nav.userSettings') },
        { href: '/settings/workspaces', label: t('nav.workspaceSettings') },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }





  if (isInitLoading || loadingWorkspaces) { // Check for loadingWorkspaces as well
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {t('app.title')}<span className="text-primary">App</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <CollapsibleNav key={item.label} item={item} />
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            <span>{t('nav.logout')}</span>
          </Button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col">
        <Header className="sticky top-0 z-10" />
        <main className="flex-1 overflow-y-auto">

          <div className="p-6 max-w-7xl mx-auto">
            {loadError && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive p-4 rounded-md mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-semibold">Application Error</h3>
                </div>
                <p className="text-sm mt-2">Failed to load critical user data. Some features may not work as expected.</p>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}