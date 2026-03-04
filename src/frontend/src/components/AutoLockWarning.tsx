import { AlertTriangle, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface AutoLockWarningProps {
  secondsRemaining: number;
  onDismiss: () => void;
}

export default function AutoLockWarning({
  secondsRemaining,
  onDismiss,
}: AutoLockWarningProps) {
  const [count, setCount] = useState(secondsRemaining);

  useEffect(() => {
    setCount(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (count <= 0) return;
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [count]);

  return (
    <div className="fixed bottom-6 right-6 z-[9998] max-w-sm w-full animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-warning/10 border border-warning/30 rounded-xl shadow-lg p-4 flex items-start gap-3 backdrop-blur-sm">
        <div className="shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Session locking soon
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your session will lock in{" "}
            <span className="font-bold text-warning">{count}</span>{" "}
            {count === 1 ? "second" : "seconds"} due to inactivity.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
