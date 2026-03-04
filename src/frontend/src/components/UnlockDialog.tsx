import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import React, { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { hashWithSHA256 } from "../utils/crypto";

interface UnlockDialogProps {
  userName: string;
  onUnlockSuccess: () => void;
  onUnlockAttempt: (method: "pin" | "identity", success: boolean) => void;
  storedPinHash: string | null;
}

const MAX_ATTEMPTS = 5;

export default function UnlockDialog({
  userName: _userName,
  onUnlockSuccess,
  onUnlockAttempt,
  storedPinHash,
}: UnlockDialogProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, loginStatus } = useInternetIdentity();

  const isLocked = attempts >= MAX_ATTEMPTS;
  const isLoggingIn = loginStatus === "logging-in";

  const handlePinUnlock = async () => {
    if (!pin.trim()) {
      setError("Please enter your PIN or password.");
      return;
    }

    if (!storedPinHash) {
      setError(
        "No PIN/password configured. Please use Internet Identity to unlock.",
      );
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const hashed = await hashWithSHA256(pin);
      const success = hashed === storedPinHash;

      onUnlockAttempt("pin", success);

      if (success) {
        onUnlockSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setError(
            "Too many failed attempts. Please use Internet Identity to unlock.",
          );
        } else {
          setError(
            `Incorrect PIN/password. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? "" : "s"} remaining.`,
          );
        }
        setPin("");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleIdentityUnlock = async () => {
    try {
      setError("");
      await login();
      onUnlockAttempt("identity", true);
      onUnlockSuccess();
    } catch {
      onUnlockAttempt("identity", false);
      setError("Internet Identity authentication failed. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* PIN/Password section */}
      {!isLocked && storedPinHash && (
        <div className="space-y-3">
          <Label
            htmlFor="unlock-pin"
            className="text-sm font-medium text-foreground/80"
          >
            PIN / Password
          </Label>
          <div className="relative">
            <Input
              id="unlock-pin"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePinUnlock()}
              placeholder="Enter your PIN or password"
              className="pr-10 bg-background/50 border-border/50 focus:border-primary"
              autoFocus
              disabled={isVerifying}
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPin ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handlePinUnlock}
            disabled={isVerifying || !pin.trim()}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Unlock
              </>
            )}
          </Button>
        </div>
      )}

      {/* Locked out message */}
      {isLocked && !storedPinHash && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {error || "No PIN configured. Use Internet Identity to unlock."}
          </span>
        </div>
      )}

      {isLocked && storedPinHash && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Too many failed attempts. Please use Internet Identity to unlock.
          </span>
        </div>
      )}

      {/* Divider */}
      {storedPinHash && !isLocked && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-muted-foreground">
              or
            </span>
          </div>
        </div>
      )}

      {/* Internet Identity fallback */}
      <Button
        variant="outline"
        onClick={handleIdentityUnlock}
        disabled={isLoggingIn}
        className="w-full border-border/50 hover:bg-muted/50"
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Authenticating…
          </>
        ) : (
          <>
            <Shield className="h-4 w-4 mr-2" />
            Unlock with Internet Identity
          </>
        )}
      </Button>
    </div>
  );
}
