import React, { useState, useEffect } from 'react';
import { Lock, LockOpen, Eye, EyeOff, ShieldAlert, ShieldCheck, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Folder, FolderProtection } from '@/backend';
import {
  useSetFolderPassword,
  useRemoveFolderPassword,
  useToggleFolderLock,
} from '@/hooks/useQueries';
import { toast } from 'sonner';

interface FolderProtectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder;
  protection: FolderProtection | null | undefined;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function FolderProtectionModal({
  open,
  onOpenChange,
  folder,
  protection,
}: FolderProtectionModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(protection?.isLocked ?? false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'remove' | 'change' | null>(null);

  // Current password verification state
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const hasExistingProtection = !!protection?.hashedPassword;

  const setPasswordMutation = useSetFolderPassword();
  const removePasswordMutation = useRemoveFolderPassword();
  const toggleLockMutation = useToggleFolderLock();

  const isLoading =
    setPasswordMutation.isPending ||
    removePasswordMutation.isPending ||
    toggleLockMutation.isPending;

  // Sync isLocked with protection prop when modal opens
  useEffect(() => {
    if (open) {
      setIsLocked(protection?.isLocked ?? false);
      // Reset verification state when modal opens
      setCurrentPassword('');
      setCurrentPasswordError('');
      setIsCurrentPasswordVerified(false);
      setPassword('');
      setConfirmPassword('');
    }
  }, [open, protection?.isLocked]);

  // Verify current password against stored hash
  const verifyCurrentPassword = async (input: string): Promise<boolean> => {
    if (!protection?.hashedPassword) return true;
    const hashed = await hashPassword(input);
    return hashed === protection.hashedPassword;
  };

  const handleCurrentPasswordChange = async (value: string) => {
    setCurrentPassword(value);
    setCurrentPasswordError('');
    setIsCurrentPasswordVerified(false);

    if (!value) return;

    setIsVerifying(true);
    try {
      const isValid = await verifyCurrentPassword(value);
      if (isValid) {
        setIsCurrentPasswordVerified(true);
        setCurrentPasswordError('');
      } else {
        setIsCurrentPasswordVerified(false);
        if (value.length >= 6) {
          setCurrentPasswordError('Incorrect current password');
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetPassword = async () => {
    if (!password) {
      toast.error('Please enter a password');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // If folder already has protection, require current password verification
    if (hasExistingProtection) {
      if (!currentPassword) {
        setCurrentPasswordError('Please enter your current password to change it');
        return;
      }
      if (!isCurrentPasswordVerified) {
        setCurrentPasswordError('Incorrect current password. Please verify before proceeding.');
        return;
      }
      setPendingAction('change');
      setShowWarningDialog(true);
      return;
    }

    await doSetPassword();
  };

  const doSetPassword = async () => {
    try {
      const hashed = await hashPassword(password);
      await setPasswordMutation.mutateAsync({ folderId: folder.id, hashedPassword: hashed });

      // If lock toggle differs from current state after setting password
      if (protection?.isLocked !== isLocked) {
        await toggleLockMutation.mutateAsync(folder.id);
      }

      toast.success('Folder protection enabled successfully');
      onOpenChange(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to set folder password');
    }
  };

  const handleRemovePassword = () => {
    if (!hasExistingProtection) return;

    // Require current password verification before removing protection
    if (!currentPassword) {
      setCurrentPasswordError('Please enter your current password to remove protection');
      return;
    }
    if (!isCurrentPasswordVerified) {
      setCurrentPasswordError('Incorrect current password. Please verify before removing protection.');
      return;
    }

    setPendingAction('remove');
    setShowWarningDialog(true);
  };

  const doRemovePassword = async () => {
    try {
      await removePasswordMutation.mutateAsync(folder.id);
      toast.success('Folder protection removed');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove folder password');
    }
  };

  const handleToggleLock = async (checked: boolean) => {
    // If folder is locked and user hasn't verified current password, block the toggle
    if (hasExistingProtection && protection?.isLocked) {
      if (!currentPassword) {
        setCurrentPasswordError('Please enter your current password to change the lock state');
        return;
      }
      if (!isCurrentPasswordVerified) {
        setCurrentPasswordError('Incorrect current password. Please verify before toggling the lock.');
        return;
      }
    }

    setIsLocked(checked);
    if (hasExistingProtection) {
      try {
        await toggleLockMutation.mutateAsync(folder.id);
        toast.success(checked ? 'Folder locked' : 'Folder unlocked');
      } catch (err: any) {
        setIsLocked(!checked);
        toast.error(err?.message ?? 'Failed to toggle folder lock');
      }
    }
  };

  const handleWarningConfirm = async () => {
    setShowWarningDialog(false);
    if (pendingAction === 'remove') {
      await doRemovePassword();
    } else if (pendingAction === 'change') {
      await doSetPassword();
    }
    setPendingAction(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Protect Folder
            </DialogTitle>
            <DialogDescription>
              Configure security settings for{' '}
              <span className="font-semibold text-foreground">{folder.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Current Status */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                {hasExistingProtection ? (
                  protection?.isLocked ? (
                    <Lock className="h-4 w-4 text-amber-500" />
                  ) : (
                    <LockOpen className="h-4 w-4 text-green-500" />
                  )
                ) : (
                  <LockOpen className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">Protection Status</span>
              </div>
              <Badge
                variant={hasExistingProtection ? 'default' : 'secondary'}
                className={
                  hasExistingProtection
                    ? protection?.isLocked
                      ? 'bg-amber-500 text-white'
                      : 'bg-green-500 text-white'
                    : ''
                }
              >
                {hasExistingProtection
                  ? protection?.isLocked
                    ? 'Locked'
                    : 'Protected (Unlocked)'
                  : 'Not Protected'}
              </Badge>
            </div>

            {/* Current Password Verification (only when folder already has protection) */}
            {hasExistingProtection && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  Current Password
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Required to make any changes to this protected folder
                </p>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password to verify"
                    value={currentPassword}
                    onChange={(e) => handleCurrentPasswordChange(e.target.value)}
                    className={`pr-10 ${
                      currentPasswordError
                        ? 'border-destructive focus-visible:ring-destructive'
                        : isCurrentPasswordVerified
                        ? 'border-green-500 focus-visible:ring-green-500'
                        : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isVerifying && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                    Verifying...
                  </p>
                )}
                {currentPasswordError && !isVerifying && (
                  <p className="text-xs text-destructive">{currentPasswordError}</p>
                )}
                {isCurrentPasswordVerified && !isVerifying && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Password verified
                  </p>
                )}
              </div>
            )}

            {/* Lock Toggle (only if already protected) */}
            {hasExistingProtection && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Lock Folder</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Require password to open this folder
                  </p>
                  {protection?.isLocked && !isCurrentPasswordVerified && (
                    <p className="text-xs text-amber-500 mt-0.5">
                      Verify current password above to toggle
                    </p>
                  )}
                </div>
                <Switch
                  checked={isLocked}
                  onCheckedChange={handleToggleLock}
                  disabled={isLoading || (hasExistingProtection && protection?.isLocked && !isCurrentPasswordVerified)}
                />
              </div>
            )}

            {/* Password Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {hasExistingProtection ? 'Change Password' : 'Set Password'}
              </Label>

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasExistingProtection && (
              <Button
                variant="destructive"
                onClick={handleRemovePassword}
                disabled={isLoading}
                className="sm:mr-auto"
              >
                Remove Protection
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={isLoading || !password}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </span>
              ) : hasExistingProtection ? (
                'Update Password'
              ) : (
                'Enable Protection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Security Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'remove'
                ? 'You are about to remove password protection from this folder. Anyone with access to your account will be able to open it without a password. Are you sure?'
                : 'You are about to change the password for this protected folder. The existing password will be replaced. Are you sure?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWarningConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pendingAction === 'remove' ? 'Remove Protection' : 'Change Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
