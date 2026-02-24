import { useGetRecentActivities } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileIcon, Trash2, Download, Upload, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ActivityFeed() {
  const { data: activities, isLoading } = useGetRecentActivities();

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
        </div>
      </Card>
    );
  }

  const getActivityIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'UPLOAD':
        return <Upload className="h-4 w-4" />;
      case 'DOWNLOAD':
        return <Download className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div
              key={`${activity.fileId}-${activity.timestamp}-${index}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1">{getActivityIcon(activity.action)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.fileName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.relativeTime}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {activity.action}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
