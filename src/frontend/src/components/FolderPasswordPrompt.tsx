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
import { useVerifyFolderPassword } from "@/hooks/useQueries";
import { AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

const MAX_ATTEMPTS = 5;
const SESSION_LOCKOUT_KEY = "folder_lockout_ids";

function getLockedOutFolders(): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_LOCKOUT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lockOutFolder(folderId: string) {
  const current = getLockedOutFolders();
  if (!current.includes(folderId)) {
    sessionStorage.setItem(
      SESSION_LOCKOUT_KEY,
      JSON.stringify([...current, folderId]),
    );
  }
}

export function isFolderLockedOut(folderId: string): boolean {
  return getLockedOutFolders().includes(folderId);
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface FolderPasswordPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  onSuccess: () => void;
}

export default function FolderPasswordPrompt({
  open,
  onOpenChange,
  folderId,
  folderName,
  onSuccess,
}: FolderPasswordPromptProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  const verifyMutation = useVerifyFolderPassword();

  const remaining = MAX_ATTEMPTS - attempts;

  const handleSubmit = async () => {
    if (!password || isLockedOut) return;

    try {
      const hashed = await hashPassword(password);
      const success = await verifyMutation.mutateAsync({
        folderId,
        attempt: hashed,
      });

      if (success) {
        toast.success("Folder unlocked successfully");
        setPassword("");
        setAttempts(0);
        onOpenChange(false);
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPassword("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLockedOut(true);
          lockOutFolder(folderId);
          toast.error(
            "Too many failed attempts. This folder is locked for this session.",
          );
        } else {
          toast.error(
            `Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`,
          );
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to verify password");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPassword("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            Protected Folder
          </DialogTitle>
          <DialogDescription>
            Enter the password to access{" "}
            <span className="font-semibold text-foreground">{folderName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLockedOut ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Access Locked
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Too many failed attempts. This folder is locked for the
                  current session.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="folder-password">Password</Label>
                <div className="relative">
                  <Input
                    id="folder-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter folder password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pr-10"
                    disabled={verifyMutation.isPending}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {attempts > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Incorrect password.{" "}
                    <strong>
                      {remaining} attempt{remaining !== 1 ? "s" : ""}
                    </strong>{" "}
                    remaining.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isLockedOut && (
            <Button
              onClick={handleSubmit}
              disabled={!password || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                "Unlock"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
