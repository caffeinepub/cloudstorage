import { useGetNotifications, useGetUnreadNotificationsCount, useMarkNotificationAsRead } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, HardDrive, Share2, Activity, Info, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Notification, NotificationType } from '../backend';

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications();
  const { data: unreadCount } = useGetUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();

  const handleMarkAsRead = async (notificationId: bigint) => {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    if (type.__kind__ === 'storageWarning') return HardDrive;
    if (type.__kind__ === 'shareNotification') return Share2;
    if (type.__kind__ === 'activityAlert') return Activity;
    return Info;
  };

  const getNotificationMessage = (type: NotificationType): string => {
    if (type.__kind__ === 'storageWarning') {
      const { thresholdPercentage } = type.storageWarning;
      return `Storage usage at ${thresholdPercentage}%`;
    }
    if (type.__kind__ === 'shareNotification') {
      const { fileName, message } = type.shareNotification;
      return `${fileName} - ${message}`;
    }
    if (type.__kind__ === 'activityAlert') {
      const { fileName, activityType } = type.activityAlert;
      return `${activityType}: ${fileName}`;
    }
    if (type.__kind__ === 'systemAnnouncement') {
      const { title, content } = type.systemAnnouncement;
      return `${title}: ${content}`;
    }
    return 'New notification';
  };

  const formatTimestamp = (timestamp: bigint): string => {
    const now = Date.now() * 1_000_000;
    const diff = now - Number(timestamp);
    const seconds = Math.floor(diff / 1_000_000_000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BellOff className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No notifications</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
        </h3>
        {unreadCount && Number(unreadCount) > 0 && (
          <Badge variant="destructive">{Number(unreadCount)}</Badge>
        )}
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.notificationType);
          return (
            <Card
              key={notification.id.toString()}
              className={`p-3 hover:shadow-sm transition-shadow ${
                !notification.isRead ? 'bg-accent/20 border-primary/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-4 w-4 ${!notification.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {getNotificationMessage(notification.notificationType)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
