import React from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, Share2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useQueries';
import type { Notification, NotificationType } from '../hooks/useQueries';

function getNotificationIcon(type: NotificationType) {
  if ('storageWarning' in type) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if ('systemAnnouncement' in type) return <Info className="w-4 h-4 text-blue-500" />;
  if ('shareNotification' in type) return <Share2 className="w-4 h-4 text-primary" />;
  if ('activityAlert' in type) return <Activity className="w-4 h-4 text-purple-500" />;
  return <Bell className="w-4 h-4 text-muted-foreground" />;
}

function getNotificationTitle(type: NotificationType): string {
  if ('storageWarning' in type) return 'Storage Warning';
  if ('systemAnnouncement' in type) return type.systemAnnouncement.title;
  if ('shareNotification' in type) return `File Shared: ${type.shareNotification.fileName}`;
  if ('activityAlert' in type) return `Activity Alert: ${type.activityAlert.fileName}`;
  return 'Notification';
}

function getNotificationBody(type: NotificationType): string {
  if ('storageWarning' in type) {
    const { usedStorage, totalStorage, thresholdPercentage } = type.storageWarning;
    return `You've used ${thresholdPercentage}% of your storage (${Number(usedStorage)} / ${Number(totalStorage)} bytes).`;
  }
  if ('systemAnnouncement' in type) return type.systemAnnouncement.content;
  if ('shareNotification' in type) return type.shareNotification.message || 'A file was shared with you.';
  if ('activityAlert' in type) return `${type.activityAlert.activityType} detected on ${type.activityAlert.fileName}.`;
  return '';
}

export default function Notifications() {
  const { data: notifications, isLoading, isError } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
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
        Failed to load notifications
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Mark all read
          </Button>
        </div>
      )}

      <ScrollArea className="max-h-64">
        <div className="space-y-2 pr-2">
          {notifications.map((notification: Notification) => (
            <div
              key={notification.id.toString()}
              className={`flex gap-3 p-3 rounded-lg transition-colors ${
                notification.isRead ? 'bg-muted/20' : 'bg-primary/5 border border-primary/10'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {getNotificationIcon(notification.notificationType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getNotificationTitle(notification.notificationType)}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {getNotificationBody(notification.notificationType)}
                </p>
              </div>
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => markRead.mutate(notification.id)}
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
