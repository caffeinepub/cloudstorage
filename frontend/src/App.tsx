import React, { useEffect, useState, useCallback } from 'react';
import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Trash from './pages/Trash';
import Settings from './pages/Settings';
import Shared from './pages/Shared';
import Recent from './pages/Recent';
import AdminDashboard from './pages/AdminDashboard';
import ProfileSetup from './components/ProfileSetup';
import ConnectionError from './components/ConnectionError';
import ErrorBoundary from './components/ErrorBoundary';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { RecentUploadsProvider } from './contexts/RecentUploadsContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
    },
  },
});

// ── Routes ──────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  ),
});

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: Layout,
});

const homeRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: Home,
});

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/dashboard',
  component: Dashboard,
});

const trashRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/trash',
  component: Trash,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/settings',
  component: Settings,
});

const sharedRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/shared',
  component: Shared,
});

const recentRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/recent',
  component: Recent,
});

const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/admin',
  component: AdminDashboard,
});

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    homeRoute,
    dashboardRoute,
    trashRoute,
    settingsRoute,
    sharedRoute,
    recentRoute,
    adminRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ── Connection timeout threshold ─────────────────────────────────────────────
const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds

// ── AppShell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { identity, isInitializing } = useInternetIdentity();
  const { isFetching: actorFetching, actor } = useActor();
  const qc = useQueryClient();
  const isAuthenticated = !!identity;

  // Timeout state for actor connection
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const handleProfileSaved = () => {
    qc.invalidateQueries({ queryKey: ['currentUserProfile'] });
  };

  // Start a timeout whenever the actor is still fetching
  useEffect(() => {
    // If actor is already available or not fetching, clear any timeout state
    if (!actorFetching || actor) {
      setConnectionTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setConnectionTimedOut(true);
    }, CONNECTION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [actorFetching, actor, retryKey]);

  const handleRetry = useCallback(() => {
    setConnectionTimedOut(false);
    setRetryKey((k) => k + 1);
    // Invalidate the actor query so it refetches
    qc.invalidateQueries({ queryKey: ['actor'] });
    qc.refetchQueries({ queryKey: ['actor'] });
  }, [qc]);

  // Only block on the very first identity initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Initializing…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show connection error if timed out
  if (connectionTimedOut) {
    return <ConnectionError onRetry={handleRetry} />;
  }

  // Actor is still being set up — show a lightweight spinner (with timeout protection above)
  if (actorFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to backend…</p>
        </div>
      </div>
    );
  }

  // Show profile setup if authenticated but no profile yet
  const showProfileSetup = isAuthenticated && !profileLoading && profileFetched && userProfile === null;

  if (showProfileSetup) {
    return <ProfileSetup onProfileSaved={handleProfileSaved} />;
  }

  return <Outlet />;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RecentUploadsProvider>
          <RouterProvider router={router} />
          <Toaster />
        </RecentUploadsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
