import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { AlertTriangle, HardDrive, Loader2, Save, Users } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { ApprovalStatus } from "../backend";
import {
  useGetAdministrationsTableData,
  useGetRegisteredUsersWithQuota,
  useListApprovals,
  useSetUserQuotaInBytes,
} from "../hooks/useQueries";

const BYTES_PER_GB = 1_073_741_824;

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n === 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / BYTES_PER_GB).toFixed(2)} GB`;
}

function bytesToGb(bytes: bigint): string {
  return (Number(bytes) / BYTES_PER_GB).toFixed(2);
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-destructive";
  if (percentage >= 80) return "bg-amber-500";
  return "bg-primary";
}

interface UserRowProps {
  principal: Principal;
  displayName: string;
  bytesUsed: bigint;
  quotaBytes: bigint;
  onSave: (
    principal: Principal,
    newQuotaBytes: bigint,
    currentUsed: bigint,
    currentQuota: bigint,
  ) => void;
  isSaving: boolean;
}

function UserRow({
  principal,
  displayName,
  bytesUsed,
  quotaBytes,
  onSave,
  isSaving,
}: UserRowProps) {
  const [inputGb, setInputGb] = useState<string>(bytesToGb(quotaBytes));
  const [isDirty, setIsDirty] = useState(false);

  // Sync input when quota changes externally (after save)
  useEffect(() => {
    setInputGb(bytesToGb(quotaBytes));
    setIsDirty(false);
  }, [quotaBytes]);

  const usagePercent =
    quotaBytes > 0n
      ? Math.min(
          100,
          Math.round((Number(bytesUsed) / Number(quotaBytes)) * 100),
        )
      : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputGb(e.target.value);
    setIsDirty(true);
  };

  const handleSave = () => {
    const gbValue = Number.parseFloat(inputGb);
    if (Number.isNaN(gbValue) || gbValue <= 0) {
      toast.error("Please enter a valid quota greater than 0 GB");
      return;
    }
    const newQuotaBytes = BigInt(Math.round(gbValue * BYTES_PER_GB));
    onSave(principal, newQuotaBytes, bytesUsed, quotaBytes);
  };

  const shortPrincipal = `${principal.toString().slice(0, 12)}…`;

  return (
    <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* User info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {displayName ? displayName.charAt(0).toUpperCase() : "?"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">
                {displayName || "Unknown User"}
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {shortPrincipal}
              </p>
            </div>
          </div>

          {/* Usage stats */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatBytes(bytesUsed)} used of {formatBytes(quotaBytes)}
              </span>
              <span
                className={
                  usagePercent >= 100
                    ? "text-destructive font-semibold"
                    : usagePercent >= 80
                      ? "text-amber-500 font-semibold"
                      : ""
                }
              >
                {usagePercent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(usagePercent)}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {usagePercent >= 100 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Storage limit reached
              </p>
            )}
            {usagePercent >= 80 && usagePercent < 100 && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Approaching storage limit
              </p>
            )}
          </div>
        </div>

        {/* Quota input */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0.1"
              step="0.5"
              value={inputGb}
              onChange={handleInputChange}
              className="w-24 h-8 text-sm"
              placeholder="GB"
            />
            <span className="text-sm text-muted-foreground">GB</span>
          </div>
          <Button
            size="sm"
            variant={isDirty ? "default" : "outline"}
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-8 px-3"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span className="ml-1 text-xs">Save</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_QUOTA_BYTES = BigInt(1_073_741_824); // 1 GB

export default function UserStorageManager() {
  const {
    data: usersWithQuota,
    isLoading: quotaLoading,
    error: quotaError,
    refetch: refetchQuota,
  } = useGetRegisteredUsersWithQuota();
  const { data: adminTableData, isLoading: namesLoading } =
    useGetAdministrationsTableData();
  const {
    data: approvals,
    isLoading: approvalsLoading,
    refetch: refetchApprovals,
  } = useListApprovals();
  const setQuotaMutation = useSetUserQuotaInBytes();

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    principal: Principal | null;
    newQuotaBytes: bigint;
    currentUsed: bigint;
  }>({ open: false, principal: null, newQuotaBytes: 0n, currentUsed: 0n });

  // Track which user is currently being saved
  const [savingPrincipal, setSavingPrincipal] = useState<string | null>(null);

  // Build a name lookup map from admin table data
  const nameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (adminTableData) {
      for (const [principal, name] of adminTableData) {
        map.set(principal.toString(), name);
      }
    }
    return map;
  }, [adminTableData]);

  // Merge quota data with approvals to show ALL users (including pending ones)
  const mergedUsersWithQuota = React.useMemo((): Array<
    [Principal, bigint, bigint]
  > => {
    // Start with existing quota data
    const quotaMap = new Map<string, [Principal, bigint, bigint]>();
    if (usersWithQuota) {
      for (const entry of usersWithQuota) {
        quotaMap.set(entry[0].toString(), entry);
      }
    }
    // Add any approval-state users not already in the quota map
    if (approvals) {
      for (const approval of approvals) {
        const key = approval.principal.toString();
        if (!quotaMap.has(key)) {
          // Not in profile map yet — show with 0 used / default quota
          quotaMap.set(key, [approval.principal, 0n, DEFAULT_QUOTA_BYTES]);
        }
      }
    }
    return Array.from(quotaMap.values());
  }, [usersWithQuota, approvals]);

  // Build approval status lookup
  const approvalStatusMap = React.useMemo(() => {
    const map = new Map<string, ApprovalStatus>();
    if (approvals) {
      for (const a of approvals) {
        map.set(a.principal.toString(), a.status);
      }
    }
    return map;
  }, [approvals]);

  const isLoading = quotaLoading || namesLoading || approvalsLoading;

  const handleSaveRequest = (
    principal: Principal,
    newQuotaBytes: bigint,
    currentUsed: bigint,
    _currentQuota: bigint,
  ) => {
    // Show confirmation if reducing quota below current usage
    if (newQuotaBytes < currentUsed) {
      setConfirmDialog({ open: true, principal, newQuotaBytes, currentUsed });
      return;
    }
    performSave(principal, newQuotaBytes);
  };

  const performSave = (principal: Principal, newQuotaBytes: bigint) => {
    setSavingPrincipal(principal.toString());
    setQuotaMutation.mutate(
      { user: principal, quotaInBytes: newQuotaBytes },
      {
        onSuccess: () => {
          toast.success(
            `Quota updated to ${(Number(newQuotaBytes) / BYTES_PER_GB).toFixed(2)} GB`,
          );
          setSavingPrincipal(null);
        },
        onError: (err) => {
          toast.error(
            `Failed to update quota: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
          setSavingPrincipal(null);
        },
      },
    );
  };

  const handleConfirmReduce = () => {
    if (confirmDialog.principal) {
      performSave(confirmDialog.principal, confirmDialog.newQuotaBytes);
    }
    setConfirmDialog({
      open: false,
      principal: null,
      newQuotaBytes: 0n,
      currentUsed: 0n,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (quotaError && (!approvals || approvals.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">
          Failed to load user storage data.
        </p>
        <button
          type="button"
          onClick={() => {
            refetchQuota();
            refetchApprovals();
          }}
          className="mt-3 text-xs text-primary underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (mergedUsersWithQuota.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">No users found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Users will appear here once they register.
        </p>
      </div>
    );
  }

  // Summary stats
  const totalAllocated = mergedUsersWithQuota.reduce(
    (sum, [, , quota]) => sum + quota,
    0n,
  );
  const totalUsed = mergedUsersWithQuota.reduce(
    (sum, [, used]) => sum + used,
    0n,
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/40 border border-border">
        <div>
          <p className="text-xs text-muted-foreground">Total Users</p>
          <p className="text-lg font-semibold text-foreground">
            {usersWithQuota?.length ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Allocated</p>
          <p className="text-lg font-semibold text-foreground">
            {formatBytes(totalAllocated)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Used</p>
          <p className="text-lg font-semibold text-foreground">
            {formatBytes(totalUsed)}
          </p>
        </div>
      </div>

      {/* Default quota note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <HardDrive className="w-3.5 h-3.5 shrink-0" />
        <span>
          Default quota per user: <strong>1 GB</strong>. Enter a custom value in
          GB and click Save to update.
        </span>
      </div>

      {/* User rows */}
      <div className="space-y-2">
        {mergedUsersWithQuota.map(([principal, bytesUsed, quotaBytes]) => {
          const principalStr = principal.toString();
          const displayName = nameMap.get(principalStr) || "";
          const approvalStatus = approvalStatusMap.get(principalStr);
          const statusLabel =
            approvalStatus === ApprovalStatus.pending
              ? " (Pending)"
              : approvalStatus === ApprovalStatus.rejected
                ? " (Rejected)"
                : "";
          return (
            <UserRow
              key={principalStr}
              principal={principal}
              displayName={
                displayName
                  ? `${displayName}${statusLabel}`
                  : statusLabel
                    ? `Unknown${statusLabel}`
                    : ""
              }
              bytesUsed={bytesUsed}
              quotaBytes={quotaBytes}
              onSave={handleSaveRequest}
              isSaving={savingPrincipal === principalStr}
            />
          );
        })}
      </div>

      {/* Confirmation dialog for reducing quota below usage */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setConfirmDialog({
              open: false,
              principal: null,
              newQuotaBytes: 0n,
              currentUsed: 0n,
            });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Reduce Quota Below Current Usage?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The new quota (
              {(Number(confirmDialog.newQuotaBytes) / BYTES_PER_GB).toFixed(2)}{" "}
              GB) is less than the user's current storage usage (
              {formatBytes(confirmDialog.currentUsed)}).
              <br />
              <br />
              This will{" "}
              <strong>prevent the user from uploading new files</strong> until
              they free up space. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReduce}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reduce Quota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
