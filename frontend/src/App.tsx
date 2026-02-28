import React, { useEffect, useState } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { useGetCallerUserProfile, useIsCallerApproved, useIsCallerAdmin } from './hooks/useQueries';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Recent from './pages/Recent';
import Shared from './pages/Shared';
import Trash from './pages/Trash';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';
import Favorites from './pages/Favorites';
import ProfileSetup from './components/ProfileSetup';
import ConnectionError from './components/ConnectionError';
import PendingApprovalPage from './pages/PendingApprovalPage';
import RejectedPage from './pages/RejectedPage';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { RecentUploadsProvider } from './contexts/RecentUploadsContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Layout route (authenticated)
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: Layout,
});

// Home route
const homeRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: Home,
});

// Dashboard route
const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/dashboard',
  component: Dashboard,
});

// Favorites route
const favoritesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/favorites',
  component: Favorites,
});

// Recent route
const recentRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/recent',
  component: Recent,
});

// Shared route
const sharedRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/shared',
  component: Shared,
});

// Trash route
const trashRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/trash',
  component: Trash,
});

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: Settings,
});

// Admin route
const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin',
  component: AdminDashboard,
});

// Admin Panel route
const adminPanelRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin-panel',
  component: AdminPanel,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([
    homeRoute,
    dashboardRoute,
    favoritesRoute,
    recentRoute,
    sharedRoute,
    trashRoute,
    settingsRoute,
    adminRoute,
    adminPanelRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Connection timeout threshold in ms
const CONNECTION_TIMEOUT_MS = 15_000;

function AppContent() {
  const { identity, isInitializing: identityInitializing } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const {
    data: isApproved,
    isLoading: approvalLoading,
    isFetched: approvalFetched,
  } = useIsCallerApproved();

  const {
    data: isAdmin,
    isLoading: adminLoading,
    isFetched: adminFetched,
  } = useIsCallerAdmin();

  // Hard timeout on actor connection
  useEffect(() => {
    if (!actorFetching) {
      setConnectionTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (actorFetching) setConnectionTimedOut(true);
    }, CONNECTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [actorFetching]);

  // Show profile setup for new users
  useEffect(() => {
    if (isAuthenticated && !profileLoading && profileFetched && userProfile === null) {
      setShowProfileSetup(true);
    } else if (userProfile !== null && userProfile !== undefined) {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, profileFetched, userProfile]);

  const handleRetryConnection = () => {
    setConnectionTimedOut(false);
    queryClient.invalidateQueries({ queryKey: ['actor'] });
    queryClient.refetchQueries({ queryKey: ['actor'] });
  };

  if (connectionTimedOut) {
    return <ConnectionError onRetry={handleRetryConnection} />;
  }

  if (identityInitializing || actorFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Connecting to the network...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (showProfileSetup) {
    return (
      <ProfileSetup
        onProfileSaved={() => setShowProfileSetup(false)}
      />
    );
  }

  // Wait for approval and admin checks to complete before routing
  const checksLoading = approvalLoading || !approvalFetched || adminLoading || !adminFetched;
  if (checksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying account status...</p>
        </div>
      </div>
    );
  }

  // Admins bypass approval check
  if (!isAdmin && !isApproved) {
    // We need to determine if the user is pending or rejected
    // isCallerApproved returns false for both pending and rejected
    // We'll show the pending page by default; the page itself can handle the distinction
    return <PendingApprovalPage />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" />
    </>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RecentUploadsProvider>
          <AppContent />
        </RecentUploadsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
