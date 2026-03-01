import React, { useState } from 'react';
import { useListAllUsersStorage, useSetUserQuota } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Save, HardDrive } from 'lucide-react';
import { Principal } from '@dfinity/principal';
import { Skeleton } from '@/components/ui/skeleton';

// Default quota in MB (953.67 MB ≈ 100,000,000 bytes)
const DEFAULT_QUOTA_MB = 953.67;

export default function UserStorageManager() {
  const { data: usersStorage, isLoading } = useListAllUsersStorage();
  const setUserQuota = useSetUserQuota();

  // Track per-row quota input values: principalStr -> MB string
  const [quotaInputs, setQuotaInputs] = useState<Record<string, string>>({});
  // Track which rows are currently saving
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

  const getQuotaInput = (principalStr: string, currentQuotaMB: number): string => {
    if (principalStr in quotaInputs) {
      return quotaInputs[principalStr];
    }
    return currentQuotaMB.toFixed(2);
  };

  const handleQuotaChange = (principalStr: string, value: string) => {
    setQuotaInputs((prev) => ({ ...prev, [principalStr]: value }));
  };

  const handleSaveQuota = async (principal: Principal) => {
    const principalStr = principal.toString();
    const inputVal = quotaInputs[principalStr];
    if (inputVal === undefined) return;

    const quotaMB = parseFloat(inputVal);
    if (isNaN(quotaMB) || quotaMB <= 0) {
      toast.error('Please enter a valid quota in MB');
      return;
    }

    setSavingRows((prev) => ({ ...prev, [principalStr]: true }));
    try {
      const quotaBytes = BigInt(Math.floor(quotaMB * 1024 * 1024));
      await setUserQuota.mutateAsync({ user: principal, quota: quotaBytes });
      toast.success('Quota updated successfully');
      // Clear the local override so it re-reads from backend
      setQuotaInputs((prev) => {
        const next = { ...prev };
        delete next[principalStr];
        return next;
      });
    } catch {
      toast.error('Failed to update quota');
    } finally {
      setSavingRows((prev) => ({ ...prev, [principalStr]: false }));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            User Storage Management
          </CardTitle>
          <CardDescription>Manage storage quotas for individual users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usersStorage || usersStorage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            User Storage Management
          </CardTitle>
          <CardDescription>Manage storage quotas for individual users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HardDrive className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          User Storage Management
        </CardTitle>
        <CardDescription>
          Manage storage quotas for individual users. Type a new value in MB and click Save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Quota (MB)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersStorage.map(([principal, used, quota]) => {
              const usedMB = Number(used) / (1024 * 1024);
              const quotaMB = Number(quota) / (1024 * 1024);
              // Use DEFAULT_QUOTA_MB if quota is 0 or very small (unset)
              const displayQuotaMB = quotaMB < 0.01 ? DEFAULT_QUOTA_MB : quotaMB;
              const percentage = displayQuotaMB > 0 ? (usedMB / displayQuotaMB) * 100 : 0;
              const principalStr = principal.toString();
              const inputValue = getQuotaInput(principalStr, displayQuotaMB);
              const isSaving = savingRows[principalStr] ?? false;
              const isDirty = principalStr in quotaInputs;

              return (
                <TableRow key={principalStr}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">User</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {principalStr}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {usedMB.toFixed(2)} MB
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="h-2 w-24"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={inputValue}
                      onChange={(e) => handleQuotaChange(principalStr, e.target.value)}
                      className="w-32 h-8 text-sm"
                      disabled={isSaving}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={isDirty ? 'default' : 'outline'}
                      onClick={() => handleSaveQuota(principal)}
                      disabled={isSaving || !isDirty}
                      className="gap-1"
                    >
                      {isSaving ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
