import { Skeleton } from "@/components/ui/skeleton";
import { HardDrive } from "lucide-react";
import React from "react";
import { useGetStorageQuota } from "../hooks/useQueries";

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n === 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StorageQuotaIndicator() {
  const { data: quota, isLoading, isError } = useGetStorageQuota();

  if (isLoading) {
    return (
      <div className="space-y-2 px-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }

  if (isError || !quota) {
    return (
      <div className="flex items-center gap-2 px-1">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          Storage unavailable
        </span>
      </div>
    );
  }

  const used = Number(quota.used);
  const total = Number(quota.total);
  const percentage =
    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const barColor =
    percentage >= 90
      ? "bg-destructive"
      : percentage >= 70
        ? "bg-warning"
        : "bg-primary";

  return (
    <div className="space-y-1.5 px-1">
      <div className="flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground">Storage</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatBytes(quota.used)} / {formatBytes(quota.total)}
      </p>
    </div>
  );
}
