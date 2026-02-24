import { useGetRecentActivities } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Activity, Upload, Trash2, FileCheck, FileX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function RecentActivityCard() {
  const { data: activities, isLoading, isRefetching } = useGetRecentActivities();

  const getActivityIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'UPLOAD':
        return Upload;
      case 'DELETE':
        return Trash2;
      case 'RESTORE':
        return FileCheck;
      case 'PERMANENT_DELETE':
        return FileX;
      default:
        return Activity;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'UPLOAD':
        return 'text-chart-2';
      case 'DELETE':
        return 'text-chart-1';
      case 'RESTORE':
        return 'text-chart-3';
      case 'PERMANENT_DELETE':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading && !activities) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Recent Activity
      </h3>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.action);
            const colorClass = getActivityColor(activity.action);
            
            return (
              <div
                key={`${activity.fileId}-${activity.timestamp}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-accent`}>
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {activity.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-muted-foreground truncate" title={activity.fileName}>
                    {activity.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.relativeTime}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
