import { useListAllUsersStorage, useSetUserQuota } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { toast } from 'sonner';
import type { UserStorageInfo } from '../hooks/useQueries';

export default function UserStorageManager() {
  const { data: users = [], isLoading } = useListAllUsersStorage();
  const setQuota = useSetUserQuota();
  const [editingUser, setEditingUser] = useState<UserStorageInfo | null>(null);
  const [newQuota, setNewQuota] = useState('');

  const handleEditQuota = (user: UserStorageInfo) => {
    setEditingUser(user);
    setNewQuota((Number(user.quota) / (1024 * 1024)).toString());
  };

  const handleSaveQuota = async () => {
    if (!editingUser) return;

    try {
      const quotaBytes = BigInt(Math.floor(parseFloat(newQuota) * 1024 * 1024));
      await setQuota.mutateAsync({
        user: editingUser.user,
        quota: quotaBytes,
      });
      toast.success('Quota updated successfully');
      setEditingUser(null);
    } catch (error) {
      toast.error('Failed to update quota');
    }
  };

  const formatSize = (bytes: bigint) => {
    const mb = Number(bytes) / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const getUsagePercentage = (used: bigint, quota: bigint) => {
    if (quota === 0n) return 0;
    return (Number(used) / Number(quota)) * 100;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Usage %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const usagePercent = getUsagePercentage(user.used, user.quota);
              return (
                <TableRow key={user.user.toString()}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {user.user.toString().slice(0, 12)}...
                  </TableCell>
                  <TableCell>{formatSize(user.used)}</TableCell>
                  <TableCell>{formatSize(user.quota)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            usagePercent > 90
                              ? 'bg-destructive'
                              : usagePercent > 75
                              ? 'bg-warning'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usagePercent.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuota(user)}
                    >
                      Edit Quota
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Storage Quota</DialogTitle>
            <DialogDescription>
              Set the storage quota for {editingUser?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="quota">Quota (MB)</Label>
              <Input
                id="quota"
                type="number"
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                placeholder="Enter quota in MB"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuota} disabled={setQuota.isPending}>
              {setQuota.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
