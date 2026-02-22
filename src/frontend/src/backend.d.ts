import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FileShare {
    permissions: SharePermissions;
    owner: Principal;
    sharedAt: bigint;
    sharedWith: Principal;
    fileId: string;
    message: string;
}
export interface FileMetadata {
    id: string;
    owner: Principal;
    name: string;
    size: bigint;
    uploadedAt: bigint;
}
export interface RecentActivity {
    action: string;
    user: Principal;
    fileName: string;
    fileId: string;
    timestamp: bigint;
    details: string;
    relativeTime: string;
}
export interface ActivityLog {
    action: string;
    user: Principal;
    fileName: string;
    fileId: string;
    timestamp: bigint;
    details: string;
}
export interface AccessedFileInfo {
    lastAccessed: bigint;
    owner: Principal;
    metadata?: FileMetadata;
    fileName: string;
    fileId: string;
    relativeTime: string;
    accessCount: bigint;
}
export interface SharedFileInfo {
    ownerEmail: string;
    permissions: SharePermissions;
    ownerName: string;
    owner: Principal;
    sharedAt: bigint;
    fileName: string;
    sharedWith: Principal;
    fileId: string;
    message: string;
}
export type RetentionPeriod = bigint;
export interface SharePermissions {
    canEdit: boolean;
    canView: boolean;
    canDownload: boolean;
}
export type NotificationType = {
    __kind__: "storageWarning";
    storageWarning: {
        thresholdPercentage: bigint;
        usedStorage: bigint;
        totalStorage: bigint;
    };
} | {
    __kind__: "shareNotification";
    shareNotification: {
        owner: Principal;
        fileName: string;
        fileId: string;
        message: string;
    };
} | {
    __kind__: "activityAlert";
    activityAlert: {
        activityType: string;
        fileName: string;
        fileId: string;
        timestamp: bigint;
    };
} | {
    __kind__: "systemAnnouncement";
    systemAnnouncement: {
        isUrgent: boolean;
        title: string;
        content: string;
    };
};
export interface FavoriteFileInfo {
    owner: Principal;
    metadata?: FileMetadata;
    size: bigint;
    fileName: string;
    fileId: string;
    addedAt: bigint;
}
export interface SmartSuggestion {
    lastAccessed: bigint;
    fileName: string;
    fileId: string;
    relativeTime: string;
    accessCount: bigint;
    reason: string;
}
export interface Notification {
    id: bigint;
    notificationType: NotificationType;
    isRead: boolean;
    toUser: Principal;
    timestamp: bigint;
}
export interface TrashMetadata {
    originalPath: string;
    metadata: FileMetadata;
    fileId: string;
    retentionPeriod: RetentionPeriod;
    deletedAt: bigint;
}
export interface UserProfile {
    name: string;
    email: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addFavorite(fileId: string): Promise<boolean>;
    addNotification(toUser: Principal, notificationType: NotificationType): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteExpiredTrash(): Promise<bigint>;
    deleteFile(fileId: string, originalPath: string, customRetentionPeriod: RetentionPeriod | null): Promise<boolean>;
    downloadFileChunk(fileId: string, chunkIndex: bigint): Promise<Uint8Array | null>;
    getActivityLogs(limit: bigint): Promise<Array<ActivityLog>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFavorites(): Promise<Array<FavoriteFileInfo>>;
    getFileMetadata(fileId: string): Promise<FileMetadata | null>;
    getMostAccessedFiles(limit: bigint): Promise<Array<AccessedFileInfo>>;
    getNotifications(): Promise<Array<Notification>>;
    getRecentActivities(limit: bigint): Promise<Array<RecentActivity>>;
    getSharedFileInfo(fileId: string, recipient: Principal): Promise<FileShare | null>;
    getSharesReceived(): Promise<Array<SharedFileInfo>>;
    getSharesSent(): Promise<Array<FileShare>>;
    getSmartSuggestions(limit: bigint): Promise<Array<SmartSuggestion>>;
    getStorageQuota(): Promise<{
        total: bigint;
        used: bigint;
        available: bigint;
    }>;
    getTrashRetentionPeriod(): Promise<bigint>;
    getTrashStorageUsage(): Promise<bigint>;
    getUnreadNotificationsCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserRetentionPeriod(user: Principal): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    isFavorite(fileId: string): Promise<boolean>;
    listAllUsersStorage(): Promise<Array<[Principal, bigint, bigint]>>;
    listFiles(): Promise<Array<FileMetadata>>;
    listTrashFiles(ownerFilter: Principal | null): Promise<Array<TrashMetadata>>;
    markNotificationAsRead(notificationId: bigint): Promise<boolean>;
    permanentlyDeleteFile(fileId: string, secureWipe: boolean): Promise<boolean>;
    recordFileAccess(fileId: string): Promise<boolean>;
    removeFavorite(fileId: string): Promise<boolean>;
    restoreFile(fileId: string, newPath: string | null): Promise<boolean>;
    revokeShare(fileId: string, recipient: Principal): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setGlobalRetentionPeriod(period: RetentionPeriod): Promise<void>;
    setUserQuota(user: Principal, quota: bigint): Promise<void>;
    setUserRetentionPeriod(user: Principal, retentionPeriod: RetentionPeriod): Promise<void>;
    shareFile(fileId: string, recipient: Principal, canView: boolean, canEdit: boolean, canDownload: boolean, message: string): Promise<boolean>;
    uploadFileChunk(fileId: string, fileName: string, chunkIndex: bigint, chunkData: Uint8Array, totalChunks: bigint, totalSize: bigint): Promise<string | null>;
}
