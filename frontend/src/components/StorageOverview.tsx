import React from 'react';
import { HardDrive, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetStorageQuota } from '../hooks/useQueries';

function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n === 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StorageOverview() {
  const { data: quota, isLoading, isError } = useGetStorageQuota();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  if (isError || !quota) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Unable to load storage info.</p>
      </div>
    );
  }

  const used = Number(quota.used);
  const total = Number(quota.total);
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const barColor =
    percentage >= 90
      ? 'bg-destructive'
      : percentage >= 70
      ? 'bg-warning'
      : 'bg-primary';

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Storage</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>{percentage}% used</span>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatBytes(quota.used)} used</span>
        <span>{formatBytes(quota.total)} total</span>
      </div>
    </div>
  );
}
