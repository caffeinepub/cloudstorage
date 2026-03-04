import { AlertTriangle, RefreshCw } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface LoadingTimeoutProps {
  children: React.ReactNode;
  /** Timeout in milliseconds before showing the fallback UI. Default: 45000ms (45 seconds) */
  timeout?: number;
  isLoading?: boolean;
}

export default function LoadingTimeout({
  children,
  timeout = 45000,
  isLoading = true,
}: LoadingTimeoutProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 p-6 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <h2 className="text-base font-semibold text-foreground">
              Taking too long
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            The app is taking longer than expected to load. This may be due to a
            slow network connection or a temporary issue with the service.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
