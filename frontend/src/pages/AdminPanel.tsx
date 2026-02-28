import React, { useState } from 'react';
import { Shield, Users, CheckCircle, XCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useIsCallerAdmin, useListApprovals, useSetApproval } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { ApprovalStatus, type UserApprovalInfo } from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { toast } from 'sonner';

type ConfirmAction = {
  user: Principal;
  status: ApprovalStatus;
  displayName: string;
} | null;

function truncatePrincipal(principal: string): string {
  if (principal.length <= 20) return principal;
  return `${principal.slice(0, 10)}...${principal.slice(-6)}`;
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  switch (status) {
    case ApprovalStatus.approved:
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case ApprovalStatus.rejected:
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Rejected
        </Badge>
      );
    case ApprovalStatus.pending:
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

export default function AdminPanel() {
  const { isFetching: actorFetching } = useActor();
  const { data: isAdmin, isLoading: adminLoading, isFetched: adminFetched } = useIsCallerAdmin();
  const {
    data: approvals,
    isLoading: approvalsLoading,
    refetch: refetchApprovals,
    isRefetching,
  } = useListApprovals();
  const setApprovalMutation = useSetApproval();

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const isLoading = actorFetching || adminLoading || !adminFetched;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the Admin Panel. Only administrators can manage
              user approvals.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filteredApprovals = (approvals ?? []).filter((a: UserApprovalInfo) => {
    const principalStr = a.principal.toString().toLowerCase();
    const query = searchQuery.toLowerCase();
    return principalStr.includes(query);
  });

  const pendingCount = (approvals ?? []).filter(
    (a) => a.status === ApprovalStatus.pending
  ).length;
  const approvedCount = (approvals ?? []).filter(
    (a) => a.status === ApprovalStatus.approved
  ).length;
  const rejectedCount = (approvals ?? []).filter(
    (a) => a.status === ApprovalStatus.rejected
  ).length;

  const handleApprove = (user: Principal) => {
    setConfirmAction({
      user,
      status: ApprovalStatus.approved,
      displayName: truncatePrincipal(user.toString()),
    });
  };

  const handleReject = (user: Principal) => {
    setConfirmAction({
      user,
      status: ApprovalStatus.rejected,
      displayName: truncatePrincipal(user.toString()),
    });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      await setApprovalMutation.mutateAsync({
        user: confirmAction.user,
        status: confirmAction.status,
      });
      toast.success(
        confirmAction.status === ApprovalStatus.approved
          ? `User approved successfully`
          : `User rejected successfully`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast.error(message);
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Manage user registrations and approval requests
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {pendingCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {approvedCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                User Registrations
              </CardTitle>
              <CardDescription>
                Review and manage user access requests
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by principal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchApprovals()}
                disabled={isRefetching}
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {approvalsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-20 ml-auto" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                {searchQuery ? 'No users match your search' : 'No user registrations yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Users will appear here once they register'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Principal ID</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.map((approval: UserApprovalInfo) => {
                    const principalStr = approval.principal.toString();
                    const isPending = approval.status === ApprovalStatus.pending;
                    const isProcessing =
                      setApprovalMutation.isPending &&
                      confirmAction?.user.toString() === principalStr;

                    return (
                      <TableRow key={principalStr} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex flex-col">
                            <span
                              className="font-mono text-sm text-foreground hidden sm:block"
                              title={principalStr}
                            >
                              {principalStr}
                            </span>
                            <span className="font-mono text-sm text-foreground sm:hidden">
                              {truncatePrincipal(principalStr)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={approval.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                onClick={() => handleApprove(approval.principal)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                                onClick={() => handleReject(approval.principal)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No actions</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.status === ApprovalStatus.approved
                ? 'Approve User'
                : 'Reject User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.status === ApprovalStatus.approved ? (
                <>
                  Are you sure you want to <strong>approve</strong> access for user{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {confirmAction?.displayName}
                  </code>
                  ? They will be able to log in and use the application immediately.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>reject</strong> access for user{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {confirmAction?.displayName}
                  </code>
                  ? They will not be able to access the application.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.status === ApprovalStatus.rejected
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : ''
              }
            >
              {confirmAction?.status === ApprovalStatus.approved ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
