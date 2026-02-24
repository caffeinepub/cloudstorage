import { useGetStorageQuota } from '../hooks/useQueries';
import { Progress } from '@/components/ui/progress';
import { HardDrive } from 'lucide-react';

export default function StorageOverview() {
  const { data: quota, isLoading } = useGetStorageQuota();

  if (isLoading || !quota) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-muted rounded w-full mb-2"></div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  const usedBytes = Number(quota.used);
  const totalBytes = Number(quota.total);
  const percentage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageColor = (percent: number): string => {
    if (percent < 75) return 'bg-chart-2';
    if (percent < 90) return 'bg-chart-1';
    return 'bg-destructive';
  };

  const getStorageTextColor = (percent: number): string => {
    if (percent < 75) return 'text-chart-2';
    if (percent < 90) return 'text-chart-1';
    return 'text-destructive';
  };

  return (
    <div className="bg-gradient-to-br from-card via-card to-accent/5 border border-border rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <HardDrive className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Storage Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor your cloud storage usage</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Progress 
            value={percentage} 
            className="h-4 bg-muted"
          />
          <div 
            className={`absolute top-0 left-0 h-4 rounded-full transition-all duration-500 ${getStorageColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Used Storage</p>
            <p className={`text-2xl font-bold ${getStorageTextColor(percentage)}`}>
              {formatBytes(usedBytes)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Storage</p>
            <p className="text-2xl font-bold text-foreground">
              {formatBytes(totalBytes)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage Used</span>
            <span className={`font-semibold ${getStorageTextColor(percentage)}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Available Space</span>
            <span className="font-semibold text-foreground">
              {formatBytes(Number(quota.available))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
