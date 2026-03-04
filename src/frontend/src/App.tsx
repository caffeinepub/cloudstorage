import { Toaster } from "@/components/ui/sonner";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import React, { useEffect, useState } from "react";
import ConnectionError from "./components/ConnectionError";
import Layout from "./components/Layout";
import ProfileSetup from "./components/ProfileSetup";
import { AutoLockProvider } from "./contexts/AutoLockContext";
import { RecentUploadsProvider } from "./contexts/RecentUploadsContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import Recent from "./pages/Recent";
import Settings from "./pages/Settings";
import Shared from "./pages/Shared";
import Trash from "./pages/Trash";
import WaitingApproval from "./pages/WaitingApproval";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ─── Routes ──────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => (
    <RecentUploadsProvider>
      <Layout />
    </RecentUploadsProvider>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const trashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trash",
  component: Trash,
});

const recentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recent",
  component: Recent,
});

const sharedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shared",
  component: Shared,
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  component: Favorites,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminDashboard,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  dashboardRoute,
  settingsRoute,
  trashRoute,
  recentRoute,
  sharedRoute,
  favoritesRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Hardcoded admin principal — always bypasses the approval/registration flow
const ADMIN_PRINCIPAL =
  "mgyr5-y3u63-q5gfr-gvkv7-etmf3-nz3hc-uxmc2-7glom-54ilt-kpuzm-vae";

// ─── Inner app that has access to identity + actor ───────────────────────────
function AppInner() {
  const { identity, isInitializing: identityInitializing } =
    useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const qc = useQueryClient();

  // undefined = not yet loaded, null = loaded but no profile, object = loaded with profile
  const [userProfile, setUserProfile] = useState<
    { name: string; email: string } | null | undefined
  >(undefined);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);

  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;

  // Check if the current user is the hardcoded admin
  const callerPrincipal = identity?.getPrincipal()?.toText() ?? "";
  const isHardcodedAdmin = callerPrincipal === ADMIN_PRINCIPAL;

  // Hard timeout on actor connection
  useEffect(() => {
    if (!actorFetching) {
      setConnectionTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (actorFetching) setConnectionTimedOut(true);
    }, 20_000);
    return () => clearTimeout(timer);
  }, [actorFetching]);

  // Fetch profile and approval status once actor is ready
  useEffect(() => {
    if (!isActorReady || !isAuthenticated) {
      setUserProfile(undefined);
      setIsApproved(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setProfileLoading(true);
      setApprovalLoading(true);
      try {
        if (isHardcodedAdmin) {
          // Admin principal: auto-initialize backend role if needed, then load profile
          try {
            await actor._initializeAccessControlWithSecret(
              "CAFFEINE_ADMIN_SECRET",
            );
          } catch {
            // Already initialized or secret mismatch — that's fine, continue
          }
          // Force approval status to true for the hardcoded admin
          if (!cancelled) setIsApproved(true);
          // Try to get the profile; may be null if not yet created
          let profile: { name: string; email: string } | null = null;
          try {
            profile = (await actor.getCallerUserProfile()) as {
              name: string;
              email: string;
            } | null;
          } catch {
            profile = null;
          }
          if (!cancelled) setUserProfile(profile as any);
        } else {
          const [profile, approved] = await Promise.all([
            actor.getCallerUserProfile(),
            actor.isCallerApproved(),
          ]);
          if (!cancelled) {
            setUserProfile(profile as any);
            setIsApproved(approved as boolean);
          }
        }
      } catch {
        if (!cancelled) {
          setUserProfile(null);
          // If admin principal and error, still grant access
          setIsApproved(!!isHardcodedAdmin);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setApprovalLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isActorReady, isAuthenticated, actor, isHardcodedAdmin]);

  const handleRetryConnection = () => {
    setConnectionTimedOut(false);
    qc.invalidateQueries({ queryKey: ["actor"] });
    qc.refetchQueries({ queryKey: ["actor"] });
  };

  // Connection timed out
  if (connectionTimedOut) {
    return <ConnectionError onRetry={handleRetryConnection} />;
  }

  // Show loading while identity is initializing
  if (identityInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Initializing…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Actor still loading
  if (!isActorReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">
            Connecting to backend…
          </p>
        </div>
      </div>
    );
  }

  // Profile/approval still loading
  if (profileLoading || approvalLoading || userProfile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  // Not approved → waiting screen
  if (!isApproved) {
    return <WaitingApproval />;
  }

  // Profile setup for new users
  if (userProfile === null) {
    return (
      <ProfileSetup
        onProfileSaved={() => {
          // Re-fetch profile after saving
          actor
            .getCallerUserProfile()
            .then((p) => setUserProfile(p))
            .catch(() => {});
        }}
      />
    );
  }

  // Fully authenticated and approved → render the app
  return (
    <AutoLockProvider
      userName={userProfile.name}
      isAuthenticated={isAuthenticated}
    >
      <RouterProvider router={router} />
    </AutoLockProvider>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AppInner />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
