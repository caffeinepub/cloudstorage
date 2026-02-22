import { useListAllUsersStorage, useSetUserQuota } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
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
import { useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Principal } from '@dfinity/principal';

export default function UserStorageManager() {
  const { data: usersStorage, isLoading } = useListAllUsersStorage();
  const setUserQuota = useSetUserQuota();
  const [editingUser, setEditingUser] = useState<Principal | null>(null);
  const [newQuota, setNewQuota] = useState('');

  const handleSetQuota = async (userPrincipal: Principal) => {
    const quotaMB = parseFloat(newQuota);
    if (isNaN(quotaMB) || quotaMB <= 0) {
      toast.error('Please enter a valid quota in MB');
      return;
    }

    try {
      const quotaBytes = BigInt(Math.floor(quotaMB * 1024 * 1024));
      await setUserQuota.mutateAsync({ user: userPrincipal, quota: quotaBytes });
      toast.success('Quota updated successfully');
      setEditingUser(null);
      setNewQuota('');
    } catch (error) {
      toast.error('Failed to update quota');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">User Storage Management</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!usersStorage || usersStorage.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">User Storage Management</h3>
        <p className="text-center text-muted-foreground py-8">No users found</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">User Storage Management</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersStorage.map(([principal, used, quota]) => {
              const usedMB = Number(used) / (1024 * 1024);
              const quotaMB = Number(quota) / (1024 * 1024);
              const percentage = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;
              const principalStr = principal.toString();

              return (
                <TableRow key={principalStr}>
                  <TableCell>
                    <div>
                      <p className="font-medium">User</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {principalStr}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{usedMB.toFixed(2)} MB</TableCell>
                  <TableCell>{quotaMB.toFixed(2)} MB</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="h-2 w-24" />
                      <span className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingUser(principal);
                        setNewQuota(quotaMB.toString());
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set User Quota</DialogTitle>
            <DialogDescription>
              Enter the new storage quota for this user in megabytes (MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quota">Quota (MB)</Label>
              <Input
                id="quota"
                type="number"
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                placeholder="100"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingUser && handleSetQuota(editingUser)}
              disabled={setUserQuota.isPending}
            >
              {setUserQuota.isPending ? 'Updating...' : 'Update Quota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
