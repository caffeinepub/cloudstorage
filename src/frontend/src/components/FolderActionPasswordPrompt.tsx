import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useGetFolderProtectionStatus } from "../hooks/useQueries";

const MAX_ATTEMPTS = 5;
const LOCKOUT_KEY_PREFIX = "folder_action_lockout_";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface FolderActionPasswordPromptProps {
  folderId: string;
  folderName: string;
  actionLabel: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const FolderActionPasswordPrompt: React.FC<FolderActionPasswordPromptProps> = ({
  folderId,
  folderName,
  actionLabel,
  isOpen,
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: protection } = useGetFolderProtectionStatus(folderId);

  const lockoutKey = `${LOCKOUT_KEY_PREFIX}${folderId}`;
  const isLockedOut = sessionStorage.getItem(lockoutKey) === "true";

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setAttempts(0);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setPassword("");
    setError("");
    setAttempts(0);
    onClose();
  }, [onClose]);

  const handleVerify = useCallback(async () => {
    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }

    if (isLockedOut) {
      setError("This folder is locked due to too many failed attempts.");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const hashedInput = await sha256(password);
      const storedHash = protection?.hashedPassword;

      if (!storedHash) {
        // No password set — allow action
        setPassword("");
        onSuccess();
        return;
      }

      if (hashedInput === storedHash) {
        setPassword("");
        setAttempts(0);
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          sessionStorage.setItem(lockoutKey, "true");
          setError(
            "Too many failed attempts. This folder action has been locked for this session.",
          );
        } else {
          setError(
            `Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempt${
              MAX_ATTEMPTS - newAttempts === 1 ? "" : "s"
            } remaining.`,
          );
        }
        setPassword("");
      }
    } catch {
      setError(
        "An error occurred while verifying the password. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  }, [password, isLockedOut, protection, attempts, lockoutKey, onSuccess]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLockedOut && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            Password Required
          </DialogTitle>
          <DialogDescription>
            Enter the password for <strong>{folderName}</strong> to proceed with
            the <strong>{actionLabel}</strong> action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLockedOut ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                This folder action is locked for this session due to too many
                failed password attempts.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="folder-action-password">Password</Label>
                <Input
                  id="folder-action-password"
                  type="password"
                  placeholder="Enter folder password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isVerifying}
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {attempts > 0 && !error && (
                <p className="text-xs text-muted-foreground">
                  {MAX_ATTEMPTS - attempts} attempt
                  {MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>
          {!isLockedOut && (
            <Button
              onClick={handleVerify}
              disabled={isVerifying || !password.trim()}
            >
              {isVerifying ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block" />
                  Verifying…
                </>
              ) : (
                `Confirm ${actionLabel}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderActionPasswordPrompt;
