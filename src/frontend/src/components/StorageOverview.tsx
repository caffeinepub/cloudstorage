import { useGetStorageQuota } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HardDrive } from 'lucide-react';

export default function StorageOverview() {
  const { data: quota } = useGetStorageQuota();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const used = quota ? Number(quota.used) : 0;
  const total = quota ? Number(quota.total) : 100000000;
  const available = total - used;
  const percentage = total > 0 ? (used / total) * 100 : 0;

  const getColorClass = () => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <HardDrive className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Storage</h3>
          <p className="text-sm text-muted-foreground">
            {formatBytes(used)} of {formatBytes(total)} used
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Usage</span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>
        <div className="relative">
          <Progress value={percentage} className="h-2" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Used</p>
            <p className="font-semibold">{formatBytes(used)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Available</p>
            <p className="font-semibold">{formatBytes(available)}</p>
          </div>
        </div>
      </div>

      {percentage >= 90 && (
        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive font-medium">
            ⚠️ Storage almost full
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            Consider deleting unused files or upgrading your storage
          </p>
        </div>
      )}
    </Card>
  );
}
