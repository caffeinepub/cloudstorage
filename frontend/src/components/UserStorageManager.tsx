import React, { useState } from 'react';
import { useListAllUsersStorage, useSetUserQuota } from '../hooks/useQueries';
import { HardDrive, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Principal } from '@icp-sdk/core/principal';
import { toast } from 'sonner';

export default function UserStorageManager() {
  const { data: usersStorage, isLoading, isError } = useListAllUsersStorage();
  const setQuotaMutation = useSetUserQuota();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newQuotaGB, setNewQuotaGB] = useState('');

  const handleEditStart = (userPrincipal: string, currentTotalBytes: bigint) => {
    setEditingUser(userPrincipal);
    setNewQuotaGB((Number(currentTotalBytes) / (1024 * 1024 * 1024)).toFixed(1));
  };

  const handleEditSave = async (userPrincipal: string) => {
    const gb = parseFloat(newQuotaGB);
    if (isNaN(gb) || gb <= 0) {
      toast.error('Please enter a valid quota in GB');
      return;
    }
    try {
      await setQuotaMutation.mutateAsync({
        user: Principal.fromText(userPrincipal),
        quota: BigInt(Math.round(gb * 1024 * 1024 * 1024)),
      });
      toast.success('Storage quota updated');
      setEditingUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update quota';
      toast.error(message);
    }
  };

  const handleEditCancel = () => {
    setEditingUser(null);
    setNewQuotaGB('');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Failed to load user storage data
      </div>
    );
  }

  if (!usersStorage || usersStorage.length === 0) {
    return (
      <div className="text-center py-8">
        <HardDrive className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No user storage data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {usersStorage.map((entry) => {
        const principalStr = entry.user.toString();
        const usedGB = (Number(entry.used) / (1024 * 1024 * 1024)).toFixed(2);
        const totalGB = (Number(entry.total) / (1024 * 1024 * 1024)).toFixed(1);
        const isEditing = editingUser === principalStr;

        return (
          <div key={principalStr} className="p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                {principalStr.slice(0, 20)}...
              </p>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={newQuotaGB}
                    onChange={(e) => setNewQuotaGB(e.target.value)}
                    className="h-7 w-20 text-xs"
                    placeholder="GB"
                    min="0.1"
                    step="0.1"
                  />
                  <span className="text-xs text-muted-foreground">GB</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleEditSave(principalStr)}
                    disabled={setQuotaMutation.isPending}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handleEditCancel}
                  >
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleEditStart(principalStr, entry.total)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Progress value={entry.percentage} className="h-1.5 mb-1" />
            <p className="text-xs text-muted-foreground">
              {usedGB} GB used of {totalGB} GB ({entry.percentage.toFixed(1)}%)
            </p>
          </div>
        );
      })}
    </div>
  );
}
