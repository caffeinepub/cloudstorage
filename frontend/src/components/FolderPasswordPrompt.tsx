import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, AlertTriangle } from 'lucide-react';
import type { Folder } from '../backend';
import { useVerifyFolderPassword, useCreateNotification } from '@/hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface FolderPasswordPromptProps {
  folder: Folder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_ATTEMPTS = 5;

export default function FolderPasswordPrompt({
  folder,
  isOpen,
  onClose,
  onSuccess,
}: FolderPasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const verifyPassword = useVerifyFolderPassword();
  const createNotification = useCreateNotification();
  const { identity } = useInternetIdentity();

  const lockoutKey = `folder_lockout_${folder.id}`;

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      const locked = sessionStorage.getItem(lockoutKey);
      if (locked) {
        setIsLocked(true);
        setAttempts(MAX_ATTEMPTS);
      } else {
        setIsLocked(false);
        setAttempts(0);
      }
    }
  }, [isOpen, lockoutKey]);

  const hashPassword = async (pwd: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !password.trim()) return;

    try {
      const hashed = await hashPassword(password);
      const result = await verifyPassword.mutateAsync({
        folderId: folder.id,
        attempt: hashed,
      });

      if (result) {
        setError('');
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const remaining = MAX_ATTEMPTS - newAttempts;

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          sessionStorage.setItem(lockoutKey, 'true');
          setError('Too many failed attempts. Access to this folder has been locked.');

          // Create activity alert notification
          if (identity) {
            try {
              await createNotification.mutateAsync({
                toUser: identity.getPrincipal(),
                notificationType: {
                  activityAlert: {
                    fileId: folder.id,
                    fileName: folder.name,
                    activityType: 'SUSPICIOUS_ACCESS',
                    timestamp: BigInt(Date.now()),
                  },
                },
              });
            } catch {
              // Notification creation is best-effort
            }
          }
        } else {
          setError(
            `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
          );
        }
        setPassword('');
      }
    } catch {
      setError('Failed to verify password. Please try again.');
      setPassword('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            Protected Folder
          </DialogTitle>
          <DialogDescription>
            Enter the password to access &quot;{folder.name}&quot;
          </DialogDescription>
        </DialogHeader>

        {isLocked ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm text-center text-destructive font-medium">
              Access Locked
            </p>
            <p className="text-sm text-center text-muted-foreground">
              Too many failed attempts. This folder is locked for this session.
            </p>
            <Button variant="outline" onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-password">Password</Label>
              <Input
                id="folder-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter folder password"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            {attempts > 0 && !isLocked && (
              <p className="text-xs text-muted-foreground">
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'}{' '}
                remaining
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!password.trim() || verifyPassword.isPending}
              >
                {verifyPassword.isPending ? 'Verifying...' : 'Unlock'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
