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
    folderId?: string;
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
export interface FolderProtection {
    isLocked: boolean;
    failedAttempts: bigint;
    hashedPassword?: string;
}
export interface ActivityLog {
    action: string;
    user: Principal;
    fileName: string;
    fileId: string;
    timestamp: bigint;
    details: string;
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
export interface AccessedFileInfo {
    lastAccessed: bigint;
    owner: Principal;
    metadata?: FileMetadata;
    fileName: string;
    fileId: string;
    relativeTime: string;
    accessCount: bigint;
}
export type RetentionPeriod = bigint;
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
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
export interface Folder {
    id: string;
    owner: Principal;
    name: string;
    createdAt: bigint;
    parentId?: string;
}
export interface UserProfile {
    name: string;
    email: string;
}
export interface TrashFolderMetadata {
    originalPath: string;
    owner: Principal;
    retentionPeriod: RetentionPeriod;
    deletedAt: bigint;
    folder: Folder;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
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
    createFolder(name: string, parentId: string | null): Promise<string>;
    deleteExpiredTrash(): Promise<bigint>;
    deleteFile(fileId: string, originalPath: string, customRetentionPeriod: RetentionPeriod | null): Promise<boolean>;
    downloadFileChunk(fileId: string, chunkIndex: bigint): Promise<Uint8Array | null>;
    favoriteFolder(folderId: string): Promise<boolean>;
    getActivityLogs(limit: bigint): Promise<Array<ActivityLog>>;
    getAdministrationsTableData(): Promise<Array<[Principal, string]>>;
    getAllUsersQuotaTable(): Promise<Array<[Principal, string, bigint]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFavoriteFolders(): Promise<Array<Folder>>;
    getFavorites(): Promise<Array<FavoriteFileInfo>>;
    getFileMetadata(fileId: string): Promise<FileMetadata | null>;
    getFilesInFolder(folderId: string): Promise<Array<FileMetadata>>;
    getFilesInFolderWithFavorites(folderId: string): Promise<Array<FileMetadata>>;
    getFolder(folderId: string): Promise<Folder | null>;
    getFolderProtectionStatus(folderId: string): Promise<FolderProtection | null>;
    getLoginLogTable(): Promise<Array<ActivityLog>>;
    getMostAccessedFiles(limit: bigint): Promise<Array<AccessedFileInfo>>;
    getNotifications(): Promise<Array<Notification>>;
    getRecentActivities(limit: bigint): Promise<Array<RecentActivity>>;
    getRegisteredUsersWithQuota(): Promise<Array<[Principal, bigint, bigint]>>;
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
    isAdmin(principal: Principal): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isFavorite(fileId: string): Promise<boolean>;
    isFavoriteFolder(folderId: string): Promise<boolean>;
    listAllFoldersWithFavorites(): Promise<Array<Folder>>;
    listAllTrash(): Promise<{
        files: Array<TrashMetadata>;
        folders: Array<TrashFolderMetadata>;
    }>;
    listAllUsersStorage(): Promise<Array<[Principal, bigint, bigint]>>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listFiles(): Promise<Array<FileMetadata>>;
    listFolders(): Promise<Array<Folder>>;
    listTrashFiles(ownerFilter: Principal | null): Promise<Array<TrashMetadata>>;
    listTrashFolders(ownerFilter: Principal | null): Promise<Array<TrashFolderMetadata>>;
    markNotificationAsRead(notificationId: bigint): Promise<boolean>;
    moveFilesToFolder(fileIds: Array<string>, targetFolderId: string): Promise<boolean>;
    /**
     * / Improved function to move a folder (with recursive subtree traversal and proper authorization)
     */
    moveFolder(folderId: string, destFolderId: string | null): Promise<boolean>;
    permanentlyDeleteFile(fileId: string, secureWipe: boolean): Promise<boolean>;
    permanentlyDeleteFolder(folderId: string): Promise<boolean>;
    recordFileAccess(fileId: string): Promise<boolean>;
    removeFavorite(fileId: string): Promise<boolean>;
    removeFolderPassword(folderId: string): Promise<void>;
    renameFolder(folderId: string, newName: string): Promise<boolean>;
    requestApproval(): Promise<void>;
    restoreFile(fileId: string, newPath: string | null): Promise<boolean>;
    revokeShare(fileId: string, recipient: Principal): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setFolderPassword(folderId: string, hashedPassword: string): Promise<void>;
    setGlobalRetentionPeriod(period: RetentionPeriod): Promise<void>;
    setUserQuota(user: Principal, quota: bigint): Promise<void>;
    setUserQuotaInBytes(user: Principal, quota: bigint): Promise<void>;
    setUserQuotas(quotas: Array<[Principal, bigint]>): Promise<void>;
    setUserRetentionPeriod(user: Principal, retentionPeriod: RetentionPeriod): Promise<void>;
    shareFile(fileId: string, recipient: Principal, canView: boolean, canEdit: boolean, canDownload: boolean, message: string): Promise<boolean>;
    /**
     * / Soft-delete method for folders (Moves folders to trash with retention period)
     */
    softDeleteFolder(folderId: string, customRetentionPeriodDays: bigint | null): Promise<boolean>;
    toggleFolderLock(folderId: string): Promise<void>;
    unfavoriteFolder(folderId: string): Promise<boolean>;
    /**
     * / Extended uploadFileChunk
     */
    uploadFileChunk(fileId: string, fileName: string, chunkIndex: bigint, chunkData: Uint8Array, totalChunks: bigint, totalSize: bigint, folderId: string | null): Promise<string | null>;
    verifyFolderPassword(folderId: string, attempt: string): Promise<boolean>;
}
