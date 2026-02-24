import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  FileMetadata,
  UserProfile,
  UserRole,
  ActivityLog,
  TrashMetadata,
  TrashFolderMetadata,
  FileShare,
  SharedFileInfo,
  FavoriteFileInfo,
  Notification,
  NotificationType,
  AccessedFileInfo,
  SmartSuggestion,
  RecentActivity,
  Folder,
} from '../backend';
import { Principal } from '@dfinity/principal';

// Re-export TrashMetadata as TrashItem for backwards compatibility
export type TrashItem = TrashMetadata;
export type TrashFolderItem = TrashFolderMetadata;

// User Profile Hooks
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

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

// File Management Hooks
export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      folderId,
      onProgress,
    }: {
      file: File;
      folderId?: string | null;
      onProgress?: (progress: number) => void;
    }) => {
      if (!actor) throw new Error('Actor not initialized');

      const fileId = `${Date.now()}_${file.name}`;
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const result = await actor.uploadFileChunk(
          fileId,
          file.name,
          BigInt(i),
          uint8Array,
          BigInt(totalChunks),
          BigInt(file.size),
          folderId ?? null
        );

        if (!result) {
          throw new Error('Upload failed - quota exceeded or invalid folder');
        }

        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalChunks) * 100));
        }
      }

      return fileId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      if (variables.folderId) {
        queryClient.invalidateQueries({ queryKey: ['filesInFolder', variables.folderId] });
      }
    },
  });
}

export function useListFiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['files'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listFiles();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetFileMetadata(fileId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata | null>({
    queryKey: ['fileMetadata', fileId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFileMetadata(fileId);
    },
    enabled: !!actor && !actorFetching && !!fileId,
  });
}

export function useDownloadFile() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not initialized');

      const metadata = await actor.getFileMetadata(fileId);
      if (!metadata) throw new Error('File not found');

      const chunkSize = 1024 * 1024;
      const totalChunks = Math.ceil(Number(metadata.size) / chunkSize);
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = await actor.downloadFileChunk(fileId, BigInt(i));
        if (!chunk) throw new Error('Failed to download chunk');
        chunks.push(chunk);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return { data: result, metadata };
    },
  });
}

// Folder Management Hooks
export function useCreateFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createFolder(name, parentId ?? null);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: ['filesInFolder', variables.parentId] });
      }
    },
  });
}

export function useListFolders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Folder[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listFolders();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useListAllFoldersWithFavorites() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Folder[]>({
    queryKey: ['foldersWithFavorites'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listAllFoldersWithFavorites();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetFolder(folderId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Folder | null>({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFolder(folderId);
    },
    enabled: !!actor && !actorFetching && !!folderId,
  });
}

export function useGetFilesInFolder(folderId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['filesInFolder', folderId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFilesInFolder(folderId);
    },
    enabled: !!actor && !actorFetching && !!folderId,
  });
}

export function useGetFilesInFolderWithFavorites(folderId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['filesInFolderWithFavorites', folderId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFilesInFolderWithFavorites(folderId);
    },
    enabled: !!actor && !actorFetching && !!folderId,
  });
}

export function useMoveFilesToFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileIds, targetFolderId }: { fileIds: string[]; targetFolderId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFilesToFolder(fileIds, targetFolderId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['filesInFolder'] });
      queryClient.invalidateQueries({ queryKey: ['filesInFolder', variables.targetFolderId] });
    },
  });
}

export function useRenameFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.renameFolder(folderId, newName);
    },
    onSuccess: (_, variables) => {
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
    mutationFn: async ({ folderId, destFolderId }: { folderId: string; destFolderId: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFolder(folderId, destFolderId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['folder', variables.folderId] });
      if (variables.destFolderId) {
        queryClient.invalidateQueries({ queryKey: ['folder', variables.destFolderId] });
      }
    },
  });
}

export function useDeleteFolderToTrash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      retentionPeriodDays,
    }: {
      folderId: string;
      retentionPeriodDays: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.softDeleteFolder(folderId, retentionPeriodDays);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['trashFolders'] });
    },
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

export function useIsFavoriteFolder(folderId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isFavoriteFolder', folderId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isFavoriteFolder(folderId);
    },
    enabled: !!actor && !actorFetching && !!folderId,
  });
}

export function useGetFavoriteFolders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Folder[]>({
    queryKey: ['favoriteFolders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFavoriteFolders();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Favorites Hooks
export function useAddFavorite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addFavorite(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['isFavorite'] });
    },
  });
}

export function useRemoveFavorite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeFavorite(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['isFavorite'] });
    },
  });
}

export function useGetFavorites() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FavoriteFileInfo[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFavorites();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useIsFavorite(fileId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isFavorite', fileId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isFavorite(fileId);
    },
    enabled: !!actor && !actorFetching && !!fileId,
  });
}

// Sharing Hooks
export function useShareFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      recipient,
      canView,
      canEdit,
      canDownload,
      message,
    }: {
      fileId: string;
      recipient: Principal;
      canView: boolean;
      canEdit: boolean;
      canDownload: boolean;
      message: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.shareFile(fileId, recipient, canView, canEdit, canDownload, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharesSent'] });
      queryClient.invalidateQueries({ queryKey: ['sharesReceived'] });
    },
  });
}

export function useGetSharesReceived() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SharedFileInfo[]>({
    queryKey: ['sharesReceived'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSharesReceived();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetSharesSent() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileShare[]>({
    queryKey: ['sharesSent'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSharesSent();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRevokeShare() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, recipient }: { fileId: string; recipient: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.revokeShare(fileId, recipient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharesSent'] });
      queryClient.invalidateQueries({ queryKey: ['sharesReceived'] });
    },
  });
}

// Trash Management Hooks
export function useListTrashFiles(ownerFilter: Principal | null = null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<TrashMetadata[]>({
    queryKey: ['trashFiles', ownerFilter?.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listTrashFiles(ownerFilter);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useListTrashFolders(ownerFilter: Principal | null = null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<TrashFolderMetadata[]>({
    queryKey: ['trashFolders', ownerFilter?.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listTrashFolders(ownerFilter);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      originalPath,
      customRetentionPeriod,
    }: {
      fileId: string;
      originalPath: string;
      customRetentionPeriod: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteFile(fileId, originalPath, customRetentionPeriod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

export function useRestoreFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, newPath }: { fileId: string; newPath: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.restoreFile(fileId, newPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

export function useRestoreFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, newPath }: { folderId: string; newPath: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      // Backend doesn't have restoreFolder yet, using placeholder
      throw new Error('Restore folder not implemented in backend');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['trashFolders'] });
    },
  });
}

export function usePermanentlyDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, secureWipe }: { fileId: string; secureWipe: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyDeleteFile(fileId, secureWipe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
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
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['trashStorageUsage'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTrashStorageUsage();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Notifications Hooks
export function useGetNotifications() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getNotifications();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetUnreadNotificationsCount() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUnreadNotificationsCount();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });
}

export function useAddNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      toUser,
      notificationType,
    }: {
      toUser: Principal;
      notificationType: NotificationType;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addNotification(toUser, notificationType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });
}

// Activity and Access Hooks
export function useGetRecentActivities(limit: bigint = BigInt(10)) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<RecentActivity[]>({
    queryKey: ['recentActivities', limit.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getRecentActivities(limit);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetActivityLogs(limit: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ActivityLog[]>({
    queryKey: ['activityLogs', limit.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getActivityLogs(limit);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRecordFileAccess() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordFileAccess(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mostAccessedFiles'] });
      queryClient.invalidateQueries({ queryKey: ['smartSuggestions'] });
    },
  });
}

export function useGetMostAccessedFiles(limit: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AccessedFileInfo[]>({
    queryKey: ['mostAccessedFiles', limit.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMostAccessedFiles(limit);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetSmartSuggestions(limit: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SmartSuggestion[]>({
    queryKey: ['smartSuggestions', limit.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSmartSuggestions(limit);
    },
    enabled: !!actor && !actorFetching,
  });
}

// Storage Quota Hooks
export function useGetStorageQuota() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{ used: bigint; available: bigint; total: bigint }>({
    queryKey: ['storageQuota'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStorageQuota();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSetUserQuota() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, quota }: { user: Principal; quota: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserQuota(user, quota);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersStorage'] });
    },
  });
}

export function useListAllUsersStorage() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, bigint, bigint]>>({
    queryKey: ['allUsersStorage'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listAllUsersStorage();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Retention Period Hooks
export function useGetTrashRetentionPeriod() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['trashRetentionPeriod'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTrashRetentionPeriod();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSetUserRetentionPeriod() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, retentionPeriod }: { user: Principal; retentionPeriod: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserRetentionPeriod(user, retentionPeriod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashRetentionPeriod'] });
    },
  });
}
