import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  Info,
  Share2,
} from "lucide-react";
import React from "react";
import type { Notification, NotificationType } from "../backend";
import {
  useGetNotifications,
  useMarkNotificationAsRead,
} from "../hooks/useQueries";

function getNotificationIcon(type: NotificationType) {
  switch (type.__kind__) {
    case "storageWarning":
      return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
    case "shareNotification":
      return <Share2 className="h-4 w-4 text-primary shrink-0" />;
    case "activityAlert":
      return <Activity className="h-4 w-4 text-accent shrink-0" />;
    case "systemAnnouncement":
      return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function getNotificationText(type: NotificationType): {
  title: string;
  body: string;
} {
  switch (type.__kind__) {
    case "storageWarning":
      return {
        title: "Storage Warning",
        body: `You've used ${Number(type.storageWarning.thresholdPercentage)}% of your storage quota.`,
      };
    case "shareNotification":
      return {
        title: "File Shared",
        body:
          type.shareNotification.message ||
          `"${type.shareNotification.fileName}" was shared with you.`,
      };
    case "activityAlert":
      return {
        title: "Activity Alert",
        body: `${type.activityAlert.activityType} on "${type.activityAlert.fileName}"`,
      };
    case "systemAnnouncement":
      return {
        title: type.systemAnnouncement.title,
        body: type.systemAnnouncement.content,
      };
    default:
      return { title: "Notification", body: "" };
  }
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Notifications() {
  const { data: notifications, isLoading, isError } = useGetNotifications();
  const markAsRead = useMarkNotificationAsRead();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-3 p-3 rounded-lg border border-border"
          >
            <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full" />
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
        <span>Unable to load notifications.</span>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BellOff className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
        const { title, body } = getNotificationText(
          notification.notificationType,
        );
        return (
          <button
            key={String(notification.id)}
            type="button"
            className={`flex w-full gap-3 p-3 rounded-lg border transition-colors cursor-pointer text-left ${
              notification.isRead
                ? "border-border bg-card"
                : "border-primary/30 bg-primary/5"
            }`}
            onClick={() => {
              if (!notification.isRead) {
                markAsRead.mutate(notification.id);
              }
            }}
            onKeyDown={(e) => {
              if (
                (e.key === "Enter" || e.key === " ") &&
                !notification.isRead
              ) {
                markAsRead.mutate(notification.id);
              }
            }}
          >
            <div className="mt-0.5">
              {getNotificationIcon(notification.notificationType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground truncate">
                  {title}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTime(notification.timestamp)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {body}
              </p>
            </div>
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
