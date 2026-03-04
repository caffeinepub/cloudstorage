import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle,
  Clock,
  LogIn,
  Shield,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { ApprovalStatus } from "../backend";
import UserStorageManager from "../components/UserStorageManager";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAdministrationsTableData,
  useGetLoginLogTable,
  useIsCallerAdmin,
  useListApprovals,
  useSetApproval,
} from "../hooks/useQueries";

const ADMIN_PRINCIPAL =
  "mgyr5-y3u63-q5gfr-gvkv7-etmf3-nz3hc-uxmc2-7glom-54ilt-kpuzm-vae";

export default function AdminDashboard() {
  const { identity } = useInternetIdentity();
  const { data: isAdminFromBackend, isLoading } = useIsCallerAdmin();
  const { data: approvals, isLoading: approvalsLoading } = useListApprovals();
  const { data: adminTableData, isLoading: tableDataLoading } =
    useGetAdministrationsTableData();
  const { data: loginLogs, isLoading: loginLogsLoading } =
    useGetLoginLogTable();
  const setApprovalMutation = useSetApproval();

  // The current user's principal string (normalized)
  const currentPrincipal =
    identity?.getPrincipal().toString().trim().toLowerCase() ?? "";

  // Hardcoded admin always has access, regardless of backend state
  const isHardcodedAdmin = currentPrincipal === ADMIN_PRINCIPAL.toLowerCase();
  const isAdmin = isHardcodedAdmin || isAdminFromBackend;

  // Determine if a given principal string belongs to the current admin user
  function isCurrentAdminUser(principalStr: string): boolean {
    return principalStr.trim().toLowerCase() === currentPrincipal;
  }

  // Build a map of principal -> name from the administrations table data
  const nameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (adminTableData) {
      for (const [principal, name] of adminTableData) {
        map.set(principal.toString(), name);
      }
    }
    return map;
  }, [adminTableData]);

  const pendingApprovals =
    approvals?.filter((a) => a.status === ApprovalStatus.pending) ?? [];

  const handleApprove = (principalStr: string) => {
    setApprovalMutation.mutate(
      {
        user: Principal.fromText(principalStr),
        status: ApprovalStatus.approved,
      },
      {
        onSuccess: () => toast.success("User approved successfully"),
        onError: () => toast.error("Failed to approve user"),
      },
    );
  };

  const handleReject = (principalStr: string) => {
    setApprovalMutation.mutate(
      {
        user: Principal.fromText(principalStr),
        status: ApprovalStatus.rejected,
      },
      {
        onSuccess: () => toast.success("User rejected"),
        onError: () => toast.error("Failed to reject user"),
      },
    );
  };

  // Format timestamp from bigint nanoseconds to readable date
  const formatTimestamp = (timestamp: bigint): string => {
    const ms = Number(timestamp) / 1_000_000;
    const date = new Date(ms);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
              You do not have permission to access the admin dashboard
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, storage, and monitor system activity
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvalsLoading ? "-" : (approvals?.length ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {approvalsLoading ? "-" : pendingApprovals.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {approvalsLoading
                ? "-"
                : (approvals?.filter(
                    (a) => a.status === ApprovalStatus.approved,
                  ).length ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="user-management">
        <TabsList className="mb-6">
          <TabsTrigger value="user-management">User Management</TabsTrigger>
          <TabsTrigger value="storage-management">
            Storage Management
          </TabsTrigger>
          <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: User Management ── */}
        <TabsContent value="user-management" className="space-y-6">
          {/* Pending Registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Registrations
                {pendingApprovals.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {pendingApprovals.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve or reject new user registration requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvalsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    All caught up!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No pending registration requests at this time.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Principal ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((approval) => {
                      const principalStr = approval.principal.toString();
                      const isProcessing =
                        setApprovalMutation.isPending &&
                        setApprovalMutation.variables?.user.toString() ===
                          principalStr;
                      const isAdminRow = isCurrentAdminUser(principalStr);
                      const displayName = tableDataLoading
                        ? null
                        : nameMap.get(principalStr) || null;

                      return (
                        <TableRow key={principalStr}>
                          <TableCell className="font-mono text-xs max-w-[180px] truncate">
                            {principalStr}
                          </TableCell>
                          <TableCell className="text-sm">
                            {tableDataLoading ? (
                              <Skeleton className="h-4 w-24" />
                            ) : displayName ? (
                              <span className="font-medium">{displayName}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdminRow ? (
                              <Badge
                                className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                                variant="outline"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                                onClick={() => handleApprove(principalStr)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                )}
                                Approve
                              </Button>
                              {!isAdminRow && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => handleReject(principalStr)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Reject
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* All Registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Registrations
              </CardTitle>
              <CardDescription>
                Complete list of all user registration requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvalsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : !approvals || approvals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No registrations yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Principal ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map((approval) => {
                      const principalStr = approval.principal.toString();
                      const isProcessing =
                        setApprovalMutation.isPending &&
                        setApprovalMutation.variables?.user.toString() ===
                          principalStr;
                      const isAdminRow = isCurrentAdminUser(principalStr);
                      const displayName = tableDataLoading
                        ? null
                        : nameMap.get(principalStr) || null;

                      return (
                        <TableRow key={principalStr}>
                          <TableCell className="font-mono text-xs max-w-[180px] truncate">
                            {principalStr}
                          </TableCell>
                          <TableCell className="text-sm">
                            {tableDataLoading ? (
                              <Skeleton className="h-4 w-24" />
                            ) : displayName ? (
                              <span className="font-medium">{displayName}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdminRow ? (
                              <Badge
                                variant="outline"
                                className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {approval.status === ApprovalStatus.approved && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {approval.status === ApprovalStatus.pending && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {approval.status === ApprovalStatus.rejected && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {approval.status !== ApprovalStatus.approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                                  onClick={() => handleApprove(principalStr)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Approve
                                </Button>
                              )}
                              {approval.status !== ApprovalStatus.rejected &&
                                !isAdminRow && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => handleReject(principalStr)}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? (
                                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Reject
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Storage Management ── */}
        <TabsContent value="storage-management">
          <UserStorageManager />
        </TabsContent>

        {/* ── Tab 3: Recent Activity (logins only) ── */}
        <TabsContent value="recent-activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                Login Activity
              </CardTitle>
              <CardDescription>Login events across all users</CardDescription>
            </CardHeader>
            <CardContent>
              {loginLogsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : !loginLogs || loginLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    No login activity yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Login events will appear here once users sign in.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLogs
                      .slice()
                      .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
                      .map((log, _idx) => {
                        const principalStr = log.user.toString();
                        const displayName = nameMap.get(principalStr);
                        return (
                          <TableRow key={log.timestamp.toString()}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <LogIn className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div>
                                  {displayName ? (
                                    <p className="text-sm font-medium">
                                      {displayName}
                                    </p>
                                  ) : null}
                                  <p className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                                    {principalStr}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.details || log.action}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
