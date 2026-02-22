import { useGetStorageQuota } from '../hooks/useQueries';
import { Progress } from '@/components/ui/progress';
import { HardDrive } from 'lucide-react';

export default function StorageQuotaIndicator() {
  const { data: quota, isLoading } = useGetStorageQuota();

  if (isLoading || !quota) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 animate-pulse">
        <div className="h-4 bg-muted rounded mb-2"></div>
        <div className="h-2 bg-muted rounded"></div>
      </div>
    );
  }

  const used = Number(quota.used);
  const total = Number(quota.total);
  const available = total - used;
  const percentage = total > 0 ? (used / total) * 100 : 0;

  const getColorClass = () => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-warning';
    return 'text-primary';
  };

  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Storage</span>
      </div>
      <Progress value={percentage} className="h-2 mb-2" />
      <p className={`text-xs ${getColorClass()}`}>
        {available > 0
          ? `${(available / (1024 * 1024)).toFixed(1)} MB available`
          : 'Storage full'}
      </p>
    </div>
  );
}
