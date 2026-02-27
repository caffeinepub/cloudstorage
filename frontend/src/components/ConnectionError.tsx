import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ConnectionErrorProps {
  onRetry?: () => void;
  message?: string;
}

export default function ConnectionError({
  onRetry,
  message = 'The app is taking longer than expected to connect to the backend. This can happen after a recent update or due to a slow network.',
}: ConnectionErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full p-6 rounded-xl border border-border bg-card shadow-lg">
        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Connection Timeout</h2>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Retry Connection
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-medium text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </button>
        </div>

        {/* Hint */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          If the problem persists, the service may be temporarily unavailable.
        </p>
      </div>
    </div>
  );
}
