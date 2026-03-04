import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import {
  useGetStorageQuota,
  useGetTrashStorageUsage,
} from "../hooks/useQueries";

export default function TrashStorageIndicator() {
  const { data: trashUsage, isLoading: trashLoading } =
    useGetTrashStorageUsage();
  const { data: quota, isLoading: quotaLoading } = useGetStorageQuota();

  if (trashLoading || quotaLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-24 mb-2 animate-pulse" />
            <div className="h-3 bg-muted rounded w-32 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  const trashSize = Number(trashUsage || 0n);
  const totalQuota = Number(quota?.total || 0n);
  const percentage = totalQuota > 0 ? (trashSize / totalQuota) * 100 : 0;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Trash2 className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Trash Storage</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(trashSize)} ({percentage.toFixed(1)}% of quota)
          </p>
        </div>
      </div>
    </Card>
  );
}
