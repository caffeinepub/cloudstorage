import { useGetStorageQuota } from '../hooks/useQueries';
import { Progress } from '@/components/ui/progress';
import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StorageQuotaIndicator() {
  const { data: quota, isLoading } = useGetStorageQuota();

  if (isLoading || !quota) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>Loading storage...</span>
        </div>
      </div>
    );
  }

  const usedMB = Number(quota.used) / (1024 * 1024);
  const totalMB = Number(quota.total) / (1024 * 1024);
  const percentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;

  const getColorClass = () => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-chart-4';
    return 'bg-primary';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>Storage</span>
        </div>
        <span className="text-xs font-medium">
          {usedMB.toFixed(1)} / {totalMB.toFixed(1)} MB
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full transition-all', getColorClass())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {quota.available > 0
          ? `${(Number(quota.available) / (1024 * 1024)).toFixed(1)} MB available`
          : 'Storage full'}
      </p>
    </div>
  );
}
