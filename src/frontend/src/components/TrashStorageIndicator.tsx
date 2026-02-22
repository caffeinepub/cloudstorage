import { useGetTrashStorageUsage, useGetStorageQuota } from '../hooks/useQueries';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

export default function TrashStorageIndicator() {
  const { data: trashUsage, isLoading: trashLoading } = useGetTrashStorageUsage();
  const { data: quota, isLoading: quotaLoading } = useGetStorageQuota();

  if (trashLoading || quotaLoading) {
    return null;
  }

  const trashSize = Number(trashUsage || 0n);
  const totalQuota = Number(quota?.total || 0n);
  const trashPercentage = totalQuota > 0 ? (trashSize / totalQuota) * 100 : 0;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Trash Storage Usage</span>
              <span className="text-sm text-muted-foreground">
                {formatSize(trashSize)} ({trashPercentage.toFixed(1)}% of quota)
              </span>
            </div>
            <Progress value={trashPercentage} className="h-2" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Emptying trash will reclaim {formatSize(trashSize)} of storage
        </p>
      </CardContent>
    </Card>
  );
}
