import { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { useAuth } from './hooks/useAuth'; // Import the new useAuth hook

// Layout
import { DashboardLayout } from './layouts/DashboardLayout';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';

// Pages
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import RootRedirect from './components/RootRedirect';
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import { ErrorPage } from './pages/ErrorPage'; // 👈 Import the new error page
import { CategoryManager } from './features/categories/CategoryManager';
import TransactionsPage from './pages/TransactionsPage';

// Simple component to protect routes
const PrivateRoute = ({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Placeholder for pages we haven't created yet
const PlaceholderPage = ({ title }: { title: string }) => {
  const { t } = useTranslation();


  useEffect(() => {
    document.title = t(title);
  }, [t, title]);

  return (
    <div>
      <h1 className="text-3xl font-bold">{t(title)}</h1>
      <p>{t('placeholder.under_construction')}</p>
    </div>
  );
};

// This function now returns the router configured with the PrivateRoute
function createAuthRouter(isAuthenticated: boolean, loading:boolean) {
  return createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
      errorElement: <ErrorPage />, // Add errorElement to login route as well
    },
    {
      path: '/',
      element: <PrivateRoute isAuthenticated={isAuthenticated} isLoading={loading} />, // Use PrivateRoute here
      errorElement: <ErrorPage />, // 👇 TOTO JE KĽÚČOVÉ: Pridajte errorElement sem
      children: [
        {
          path: '/',
          element: <RootRedirect />,
        },
        {
          path: '/dashboard', // Explicitly handle /dashboard
          element: <RootRedirect />, // Redirect to root to trigger workspace initialization
        },
        {
          element: <DashboardLayout />,
          children: [
            {
              path: 'settings',
              element: <Navigate to="/settings/user" replace />,
            },
            {
              path: 'settings/user',
              element: <SettingsPage />,
            },
            {
              path: 'settings/workspaces',
              element: <WorkspacesPage />,
            },
            {
              path: 'settings/workspaces/:id',
              element: <WorkspaceDetailPage />,
            },
          ],
        },
        {
          path: ':workspaceId',
          element: <WorkspaceLayout />,
          children: [
            {
              element: <DashboardLayout />,
              children: [
                {
                  path: 'dashboard',
                  element: <DashboardPage />,
                },
                {
                  path: 'transactions/:tab?',
                  element: <TransactionsPage />,
                },
                {
                  path: 'categories/expenses',
                  element: <CategoryManager />,
                },
                {
                  path: 'categories/incomes',
                  element: <CategoryManager />,
                },
                {
                  path: 'settings/tags',
                  element: <PlaceholderPage title="nav.tagManagement" />,
                },
              ]
            }
          ]
        }
      ],
    },
    {
      path: '*',
      element: <ErrorPage />,
    }
  ]);
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth(); // Use the new useAuth hook
  const router = createAuthRouter(isAuthenticated, loading); // Create router based on auth state

  return (
    <RouterProvider router={router} />
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
