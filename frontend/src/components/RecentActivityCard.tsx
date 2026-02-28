import React from 'react';
import { Activity, FileText, Upload, Download, Share2, Trash2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetRecentActivities } from '../hooks/useQueries';
import type { RecentActivity } from '../hooks/useQueries';

function getActivityIcon(action: string) {
  const a = action.toUpperCase();
  if (a.includes('UPLOAD')) return <Upload className="w-3.5 h-3.5 text-primary" />;
  if (a.includes('DOWNLOAD')) return <Download className="w-3.5 h-3.5 text-blue-500" />;
  if (a.includes('SHARE')) return <Share2 className="w-3.5 h-3.5 text-purple-500" />;
  if (a.includes('DELETE')) return <Trash2 className="w-3.5 h-3.5 text-destructive" />;
  return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function RecentActivityCard() {
  const { data: activities, isLoading, isError } = useGetRecentActivities();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Failed to load recent activity
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="space-y-2 pr-2">
        {activities.map((activity: RecentActivity, index: number) => (
          <div key={index} className="flex gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              {getActivityIcon(activity.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.fileName}</p>
              <p className="text-xs text-muted-foreground">{activity.action} · {activity.relativeTime}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
