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
import { Switch } from '@/components/ui/switch';
import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Folder } from '@/backend';
import { FolderProtection } from '@/hooks/useQueries';
import {
  useGetFolderProtectionStatus,
  useSetFolderPassword,
  useRemoveFolderPassword,
  useToggleFolderLock,
} from '@/hooks/useQueries';

interface FolderProtectionModalProps {
  folder: Folder;
  isOpen: boolean;
  onClose: () => void;
}

export default function FolderProtectionModal({
  folder,
  isOpen,
  onClose,
}: FolderProtectionModalProps) {
  const { data: protection } = useGetFolderProtectionStatus(folder.id);
  const setPassword = useSetFolderPassword();
  const removePassword = useRemoveFolderPassword();
  const toggleLock = useToggleFolderLock();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (protection) {
      setIsLocked(protection.isLocked);
    }
  }, [protection]);

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const hashPassword = async (pwd: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyCurrentPassword = async (): Promise<boolean> => {
    if (!protection?.hashedPassword) return true;
    const hashed = await hashPassword(currentPassword);
    return hashed === protection.hashedPassword;
  };

  const handleSetPassword = async () => {
    setError('');
    setSuccess('');

    if (!newPassword.trim()) {
      setError('Password cannot be empty');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (protection?.hashedPassword) {
      const valid = await verifyCurrentPassword();
      if (!valid) {
        setError('Current password is incorrect');
        return;
      }
    }

    try {
      const hashed = await hashPassword(newPassword);
      await setPassword.mutateAsync({ folderId: folder.id, hashedPassword: hashed });
      setSuccess('Password set successfully');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch {
      setError('Failed to set password');
    }
  };

  const handleRemovePassword = async () => {
    setError('');
    setSuccess('');

    if (protection?.hashedPassword) {
      const valid = await verifyCurrentPassword();
      if (!valid) {
        setError('Current password is incorrect');
        return;
      }
    }

    try {
      await removePassword.mutateAsync(folder.id);
      setSuccess('Password removed successfully');
      setCurrentPassword('');
    } catch {
      setError('Failed to remove password');
    }
  };

  const handleToggleLock = async () => {
    setError('');
    setSuccess('');

    if (!isLocked && protection?.hashedPassword) {
      const valid = await verifyCurrentPassword();
      if (!valid) {
        setError('Current password is incorrect');
        return;
      }
    }

    try {
      await toggleLock.mutateAsync(folder.id);
      setIsLocked((prev) => !prev);
      setSuccess(isLocked ? 'Folder unlocked' : 'Folder locked');
    } catch {
      setError('Failed to toggle lock');
    }
  };

  const hasPassword = !!protection?.hashedPassword;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocked ? (
              <Lock className="w-5 h-5 text-amber-500" />
            ) : (
              <Unlock className="w-5 h-5 text-muted-foreground" />
            )}
            Folder Protection
          </DialogTitle>
          <DialogDescription>
            Configure password protection for &quot;{folder.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lock toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Lock Folder</p>
              <p className="text-xs text-muted-foreground">
                {isLocked ? 'Folder is currently locked' : 'Folder is currently unlocked'}
              </p>
            </div>
            <Switch
              checked={isLocked}
              onCheckedChange={handleToggleLock}
              disabled={toggleLock.isPending}
            />
          </div>

          {/* Current password (if has password) */}
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
          )}

          {/* Set new password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">
              {hasPassword ? 'New Password' : 'Set Password'}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {success}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            {hasPassword && (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={handleRemovePassword}
                disabled={removePassword.isPending}
              >
                Remove Password
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetPassword}
              disabled={setPassword.isPending || !newPassword.trim()}
            >
              {setPassword.isPending ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
