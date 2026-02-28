import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  FileMetadata,
  Folder,
  UserProfile,
  UserApprovalInfo,
  UserRole,
} from '../backend';
import { ApprovalStatus } from '../backend';
import { Principal } from '@icp-sdk/core/principal';

// ─── Local type definitions (not in backend) ─────────────────────────────────

export type FolderProtection = {
  hashedPassword: string | null;
  isLocked: boolean;
  failedAttempts: number;
};

export type TrashMetadata = {
  fileId: string;
  metadata: FileMetadata;
  deletedAt: bigint;
  originalPath: string;
  retentionPeriod: bigint;
};

export type TrashFolderMetadata = {
  folder: Folder;
  deletedAt: bigint;
  originalPath: string;
  retentionPeriod: bigint;
  owner: Principal;
};

export type NotificationType =
  | { storageWarning: { usedStorage: bigint; totalStorage: bigint; thresholdPercentage: bigint } }
  | { systemAnnouncement: { title: string; content: string; isUrgent: boolean } }
  | { shareNotification: { fileId: string; fileName: string; owner: Principal; message: string } }
  | { activityAlert: { fileId: string; fileName: string; activityType: string; timestamp: bigint } };

export type Notification = {
  id: bigint;
  timestamp: bigint;
  notificationType: NotificationType;
  isRead: boolean;
  toUser: Principal;
};

export type FavoriteFileInfo = {
  fileId: string;
  owner: Principal;
  fileName: string;
  size: bigint;
  addedAt: bigint;
  metadata: FileMetadata | null;
};

export type SharedFileInfo = {
  fileId: string;
  sharedWith: Principal;
  permissions: SharePermissions;
  sharedAt: bigint;
  message: string;
  fileName: string;
  owner: Principal;
  ownerName: string;
  ownerEmail: string;
};

export type SharePermissions = {
  canView: boolean;
  canEdit: boolean;
  canDownload: boolean;
};

export type FileShare = {
  fileId: string;
  owner: Principal;
  sharedWith: Principal;
  permissions: SharePermissions;
  sharedAt: bigint;
  message: string;
};

export type RecentActivity = {
  timestamp: bigint;
  user: Principal;
  action: string;
  fileId: string;
  fileName: string;
  details: string;
  relativeTime: string;
};

export type SmartSuggestion = {
  fileId: string;
  fileName: string;
  reason: string;
  accessCount: bigint;
  lastAccessed: bigint;
  relativeTime: string;
};

export type AccessedFileInfo = {
  fileId: string;
  fileName: string;
  accessCount: bigint;
  lastAccessed: bigint;
  relativeTime: string;
  owner: Principal;
  metadata: FileMetadata | null;
};

export type ActivityLog = {
  timestamp: bigint;
  user: Principal;
  action: string;
  fileId: string;
  fileName: string;
  details: string;
};

// ─── Type aliases ────────────────────────────────────────────────────────────
export type TrashItem = TrashMetadata;
export type TrashFolderItem = TrashFolderMetadata;

// ─── Admin ───────────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

// ─── Approval ────────────────────────────────────────────────────────────────

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerApproved();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  return useQuery<UserRole | null>({
    queryKey: ['callerUserRole'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserRole();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useListApprovals() {
  const { actor, isFetching } = useActor();
  return useQuery<UserApprovalInfo[]>({
    queryKey: ['listApprovals'],
    queryFn: async () => {
      if (!actor) return [];
      return await actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(params.user, params.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
    },
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

// ─── Files (stubbed — backend methods not available) ─────────────────────────

export function useListFiles() {
  return useQuery<FileMetadata[]>({
    queryKey: ['files'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useGetFileMetadata(_fileId: string | null) {
  return useQuery<FileMetadata | null>({
    queryKey: ['file', _fileId],
    queryFn: async () => null,
    enabled: false,
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (_params: {
      file: File;
      folderId?: string | null;
      onProgress?: (progress: number) => void;
    }): Promise<string> => {
      throw new Error('File upload is not available in this version');
    },
  });
}

export function useUploadFileChunk() {
  return useMutation({
    mutationFn: async (_params: {
      fileId: string;
      fileName: string;
      chunkIndex: bigint;
      chunkData: Uint8Array;
      totalChunks: bigint;
      totalSize: bigint;
      folderId: string | null;
    }): Promise<boolean> => {
      throw new Error('File upload is not available in this version');
    },
  });
}

export function useDeleteFile() {
  return useMutation({
    mutationFn: async (_params: {
      fileId: string;
      originalPath: string;
      customRetentionPeriod?: bigint | null;
    }): Promise<boolean> => {
      throw new Error('File deletion is not available in this version');
    },
  });
}

export function useRenameFile() {
  return useMutation({
    mutationFn: async (_params: { fileId: string; newName: string }): Promise<void> => {
      throw new Error('Rename file is not supported by the backend');
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (
      _fileId: string,
    ): Promise<{ data: Uint8Array; metadata: FileMetadata }> => {
      throw new Error('File download is not available in this version');
    },
  });
}

export function useDownloadFileChunk() {
  return useMutation({
    mutationFn: async (_params: {
      fileId: string;
      chunkIndex: bigint;
    }): Promise<Uint8Array | null> => {
      throw new Error('File download is not available in this version');
    },
  });
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export function useListFolders() {
  const { actor, isFetching } = useActor();
  return useQuery<Folder[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFolders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListAllFoldersWithFavorites() {
  const { actor, isFetching } = useActor();
  return useQuery<Folder[]>({
    queryKey: ['foldersWithFavorites'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllFoldersWithFavorites();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFolder(folderId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Folder | null>({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return null;
      return actor.getFolder(folderId);
    },
    enabled: !!actor && !isFetching && !!folderId,
  });
}

export function useGetFilesInFolder(folderId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<FileMetadata[]>({
    queryKey: ['folderFiles', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return [];
      return actor.getFilesInFolder(folderId);
    },
    enabled: !!actor && !isFetching && !!folderId,
  });
}

export function useCreateFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; parentId: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createFolder(params.name, params.parentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
    },
  });
}

export function useRenameFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folderId: string; newName: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.renameFolder(params.folderId, params.newName);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['folder', variables.folderId] });
    },
  });
}

export function useMoveFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folderId: string; destFolderId: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFolder(params.folderId, params.destFolderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
    },
  });
}

export function useDeleteFolder() {
  return useMutation({
    mutationFn: async (_params: {
      folderId: string;
      customRetentionPeriodDays?: bigint | null;
    }): Promise<boolean> => {
      throw new Error('Soft delete folder is not available in this version');
    },
  });
}

export function useDeleteFolderToTrash() {
  return useMutation({
    mutationFn: async (_params: {
      folderId: string;
      customRetentionPeriodDays?: bigint | null;
      retentionDays?: bigint | null;
      retentionPeriodDays?: bigint | null;
    }): Promise<boolean> => {
      throw new Error('Soft delete folder is not available in this version');
    },
  });
}

export function useMoveFilesToFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fileIds: string[]; targetFolderId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFilesToFolder(params.fileIds, params.targetFolderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// ─── Folder Protection (stubbed) ─────────────────────────────────────────────

export function useGetFolderProtectionStatus(_folderId: string | null) {
  return useQuery<FolderProtection | null>({
    queryKey: ['folderProtection', _folderId],
    queryFn: async () => null,
    enabled: false,
  });
}

export function useSetFolderPassword() {
  return useMutation({
    mutationFn: async (_params: {
      folderId: string;
      hashedPassword: string;
    }): Promise<boolean> => {
      throw new Error('Folder password is not available in this version');
    },
  });
}

export function useRemoveFolderPassword() {
  return useMutation({
    mutationFn: async (_folderId: string): Promise<boolean> => {
      throw new Error('Folder password is not available in this version');
    },
  });
}

export function useToggleFolderLock() {
  return useMutation({
    mutationFn: async (_folderId: string): Promise<boolean> => {
      throw new Error('Folder lock is not available in this version');
    },
  });
}

export function useVerifyFolderPassword() {
  return useMutation({
    mutationFn: async (_params: {
      folderId: string;
      attempt: string;
    }): Promise<boolean> => {
      throw new Error('Folder password is not available in this version');
    },
  });
}

// ─── Favorites (file favorites stubbed; folder favorites use backend) ─────────

export function useGetFavorites() {
  return useQuery<FavoriteFileInfo[]>({
    queryKey: ['favorites'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useIsFavorite(_fileId: string | null) {
  return useQuery<boolean>({
    queryKey: ['isFavorite', _fileId],
    queryFn: async () => false,
    enabled: false,
  });
}

export function useAddFavorite() {
  return useMutation({
    mutationFn: async (_fileId: string): Promise<boolean> => {
      throw new Error('File favorites are not available in this version');
    },
  });
}

export function useRemoveFavorite() {
  return useMutation({
    mutationFn: async (_fileId: string): Promise<boolean> => {
      throw new Error('File favorites are not available in this version');
    },
  });
}

export function useGetFavoriteFolders() {
  const { actor, isFetching } = useActor();
  return useQuery<Folder[]>({
    queryKey: ['favoriteFolders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFavoriteFolders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useFavoriteFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.favoriteFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteFolders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
    },
  });
}

export function useUnfavoriteFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unfavoriteFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteFolders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
    },
  });
}

export function useIsFavoriteFolder(folderId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isFavoriteFolder', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return false;
      return actor.isFavoriteFolder(folderId);
    },
    enabled: !!actor && !isFetching && !!folderId,
  });
}

// ─── Sharing (stubbed) ────────────────────────────────────────────────────────

export function useGetSharesReceived() {
  return useQuery<SharedFileInfo[]>({
    queryKey: ['sharesReceived'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useGetSharesSent() {
  return useQuery<FileShare[]>({
    queryKey: ['sharesSent'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useShareFile() {
  return useMutation({
    mutationFn: async (_params: {
      fileId: string;
      recipient: Principal;
      canView: boolean;
      canEdit: boolean;
      canDownload: boolean;
      message: string;
    }): Promise<boolean> => {
      throw new Error('File sharing is not available in this version');
    },
  });
}

export function useRevokeShare() {
  return useMutation({
    mutationFn: async (_fileId: string): Promise<boolean> => {
      throw new Error('File sharing is not available in this version');
    },
  });
}

// ─── Trash (stubbed) ─────────────────────────────────────────────────────────

export function useGetTrash() {
  return useQuery<TrashMetadata[]>({
    queryKey: ['trash'],
    queryFn: async () => [],
    enabled: false,
  });
}

// Alias used by Trash page
export const useListTrashFiles = useGetTrash;

export function useGetTrashFolders() {
  return useQuery<TrashFolderMetadata[]>({
    queryKey: ['trashFolders'],
    queryFn: async () => [],
    enabled: false,
  });
}

// Alias used by Trash page
export const useListTrashFolders = useGetTrashFolders;

export function useRestoreFile() {
  return useMutation({
    mutationFn: async (_params: {
      fileId: string;
      targetFolderId?: string | null;
    }): Promise<boolean> => {
      throw new Error('Restore file is not available in this version');
    },
  });
}

export function useRestoreFolder() {
  return useMutation({
    mutationFn: async (_params: {
      folderId: string;
      targetParentId?: string | null;
    }): Promise<boolean> => {
      throw new Error('Restore folder is not available in this version');
    },
  });
}

export function usePermanentlyDeleteFile() {
  return useMutation({
    mutationFn: async (_fileId: string): Promise<boolean> => {
      throw new Error('Permanent file deletion is not available in this version');
    },
  });
}

export function usePermanentlyDeleteFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyDeleteFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashFolders'] });
    },
  });
}

export function useGetTrashStorageUsage() {
  return useQuery<{ totalSize: bigint; percentage: number }>({
    queryKey: ['trashStorageUsage'],
    queryFn: async () => ({ totalSize: BigInt(0), percentage: 0 }),
    enabled: false,
  });
}

// ─── Storage Quota (stubbed) ──────────────────────────────────────────────────

export function useGetStorageQuota() {
  return useQuery<{ used: bigint; total: bigint; percentage: number }>({
    queryKey: ['storageQuota'],
    queryFn: async () => ({ used: BigInt(0), total: BigInt(0), percentage: 0 }),
    enabled: false,
  });
}

export function useSetUserStorageQuota() {
  return useMutation({
    mutationFn: async (_params: { user: Principal; quota: bigint }): Promise<void> => {
      throw new Error('Storage quota management is not available in this version');
    },
  });
}

export function useGetAllUsersStorageQuota() {
  return useQuery<{ user: Principal; used: bigint; total: bigint; percentage: number }[]>({
    queryKey: ['allUsersStorageQuota'],
    queryFn: async () => [],
    enabled: false,
  });
}

// Aliases used by UserStorageManager
export const useListAllUsersStorage = useGetAllUsersStorageQuota;
export const useSetUserQuota = useSetUserStorageQuota;

// ─── Notifications (stubbed) ──────────────────────────────────────────────────

export function useGetNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useGetUnreadNotificationsCount() {
  return useQuery<number>({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => 0,
    enabled: false,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: async (_notificationId: bigint): Promise<void> => {
      throw new Error('Notifications are not available in this version');
    },
  });
}

// Alias used by Notifications component
export const useMarkNotificationAsRead = useMarkNotificationRead;

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      throw new Error('Notifications are not available in this version');
    },
  });
}

export function useCreateNotification() {
  return useMutation({
    mutationFn: async (_params: {
      toUser: Principal;
      notificationType: NotificationType;
    }): Promise<void> => {
      throw new Error('Notifications are not available in this version');
    },
  });
}

// Alias used by FolderPasswordPrompt
export const useAddNotification = useCreateNotification;

// ─── Recent Activities (stubbed) ──────────────────────────────────────────────

export function useGetRecentActivities() {
  return useQuery<RecentActivity[]>({
    queryKey: ['recentActivities'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useGetActivityLogs() {
  return useQuery<ActivityLog[]>({
    queryKey: ['activityLogs'],
    queryFn: async () => [],
    enabled: false,
  });
}

// ─── Smart Suggestions (stubbed) ─────────────────────────────────────────────

export function useGetSmartSuggestions() {
  return useQuery<SmartSuggestion[]>({
    queryKey: ['smartSuggestions'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useGetFrequentlyAccessedFiles() {
  return useQuery<AccessedFileInfo[]>({
    queryKey: ['frequentlyAccessedFiles'],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useTrackFileAccess() {
  return useMutation({
    mutationFn: async (_fileId: string): Promise<void> => {
      // No-op stub
    },
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Settings (stubbed) ───────────────────────────────────────────────────────

export function useGetUserRetentionPeriod() {
  return useQuery<bigint>({
    queryKey: ['userRetentionPeriod'],
    queryFn: async () => BigInt(0),
    enabled: false,
  });
}

// Alias used by Settings page
export const useGetTrashRetentionPeriod = useGetUserRetentionPeriod;

export function useSetUserRetentionPeriod() {
  return useMutation({
    mutationFn: async (_params: { user: Principal; period: bigint }): Promise<void> => {
      throw new Error('Retention period settings are not available in this version');
    },
  });
}
