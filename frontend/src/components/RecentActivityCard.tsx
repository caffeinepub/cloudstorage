import React from 'react';
import { Clock, Upload, Trash2, RotateCcw, Share2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetRecentActivities } from '../hooks/useQueries';

function getActionIcon(action: string) {
  switch (action.toUpperCase()) {
    case 'UPLOAD':
      return <Upload className="h-3.5 w-3.5 text-primary shrink-0" />;
    case 'DELETE':
    case 'SOFT_DELETE':
    case 'PERMANENT_DELETE':
    case 'AUTO_DELETE':
      return <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />;
    case 'RESTORE':
      return <RotateCcw className="h-3.5 w-3.5 text-accent shrink-0" />;
    case 'SHARE':
      return <Share2 className="h-3.5 w-3.5 text-secondary shrink-0" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

function getActionLabel(action: string): string {
  switch (action.toUpperCase()) {
    case 'UPLOAD': return 'Uploaded';
    case 'DELETE': return 'Moved to trash';
    case 'SOFT_DELETE': return 'Moved to trash';
    case 'PERMANENT_DELETE': return 'Permanently deleted';
    case 'AUTO_DELETE': return 'Auto-deleted';
    case 'RESTORE': return 'Restored';
    case 'SHARE': return 'Shared';
    default: return action;
  }
}

export default function RecentActivityCard() {
  const { data: activities, isLoading, isError } = useGetRecentActivities(10);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span>Unable to load recent activity.</span>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="h-7 w-7 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, idx) => (
        <div key={`${activity.fileId}-${idx}`} className="flex items-start gap-3">
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            {getActionIcon(activity.action)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">{getActionLabel(activity.action)}</span>{' '}
              <span className="truncate">{activity.fileName}</span>
            </p>
            <p className="text-xs text-muted-foreground">{activity.relativeTime}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
