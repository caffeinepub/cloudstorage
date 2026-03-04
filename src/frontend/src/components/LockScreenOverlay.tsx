import { Lock } from "lucide-react";
import React from "react";
import UnlockDialog from "./UnlockDialog";

interface LockScreenOverlayProps {
  isLocked: boolean;
  userName: string;
  storedPinHash: string | null;
  onUnlockSuccess: () => void;
  onUnlockAttempt: (method: "pin" | "identity", success: boolean) => void;
}

export default function LockScreenOverlay({
  isLocked,
  userName,
  storedPinHash,
  onUnlockSuccess,
  onUnlockAttempt,
}: LockScreenOverlayProps) {
  if (!isLocked) return null;

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
      aria-modal="true"
      role="alertdialog"
      aria-label="Session locked"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-sm">
        {/* Lock icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-foreground border-2 border-border/50">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
              <Lock className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {userName || "Session Locked"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your session was locked due to inactivity
            </p>
          </div>
        </div>

        {/* Unlock form */}
        <UnlockDialog
          userName={userName}
          storedPinHash={storedPinHash}
          onUnlockSuccess={onUnlockSuccess}
          onUnlockAttempt={onUnlockAttempt}
        />

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Your data is safe. Unlock to continue where you left off.
        </p>
      </div>
    </div>
  );
}
