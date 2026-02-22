import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Share2, Activity, Info } from 'lucide-react';

export default function Notifications() {
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();

  const handleMarkAsRead = (notificationId: number) => {
    markAsRead.mutate(notificationId);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'storageWarning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'shareNotification':
        return <Share2 className="h-5 w-5 text-blue-500" />;
      case 'activityAlert':
        return <Activity className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (notifications.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No notifications</h3>
          <p className="text-sm text-muted-foreground">You're all caught up!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h3>
      </div>
      <ScrollArea className="h-64">
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border ${
                notification.isRead ? 'bg-background' : 'bg-accent/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {getIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(Number(notification.timestamp) / 1000000).toLocaleString()}
                  </p>
                </div>
                {!notification.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
