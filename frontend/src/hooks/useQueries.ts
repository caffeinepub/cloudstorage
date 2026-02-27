import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  FileMetadata,
  Folder,
  FolderProtection,
  TrashMetadata,
  TrashFolderMetadata,
  NotificationType,
  FavoriteFileInfo,
  SharedFileInfo,
  FileShare,
  RecentActivity,
  SmartSuggestion,
  AccessedFileInfo,
  ActivityLog,
  Notification,
  UserProfile,
} from '../backend';
import { Principal } from '@icp-sdk/core/principal';

// ─── Type aliases ────────────────────────────────────────────────────────────
export type TrashItem = TrashMetadata;
export type TrashFolderItem = TrashFolderMetadata;

// ─── Files ───────────────────────────────────────────────────────────────────

export function useListFiles() {
  const { actor, isFetching } = useActor();
  return useQuery<FileMetadata[]>({
    queryKey: ['files'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFileMetadata(fileId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<FileMetadata | null>({
    queryKey: ['file', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return null;
      return actor.getFileMetadata(fileId);
    },
    enabled: !!actor && !isFetching && !!fileId,
  });
}

/**
 * useUploadFile - high-level convenience wrapper that handles chunked upload in one mutation.
 */
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
      const chunkSize = 1024 * 1024; // 1 MB
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
          folderId ?? null,
        );

        if (!result) {
          throw new Error('Upload failed – quota exceeded or invalid folder');
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
        queryClient.invalidateQueries({ queryKey: ['folderFiles', variables.folderId] });
      }
    },
  });
}

export function useUploadFileChunk() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      fileId: string;
      fileName: string;
      chunkIndex: bigint;
      chunkData: Uint8Array;
      totalChunks: bigint;
      totalSize: bigint;
      folderId: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadFileChunk(
        params.fileId,
        params.fileName,
        params.chunkIndex,
        params.chunkData,
        params.totalChunks,
        params.totalSize,
        params.folderId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      fileId: string;
      originalPath: string;
      customRetentionPeriod?: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteFile(
        params.fileId,
        params.originalPath,
        params.customRetentionPeriod ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

export function useRenameFile() {
  return useMutation({
    mutationFn: async (_params: { fileId: string; newName: string }) => {
      throw new Error('Rename file is not supported by the backend');
    },
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

export function useDownloadFileChunk() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (params: { fileId: string; chunkIndex: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.downloadFileChunk(params.fileId, params.chunkIndex);
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
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folderId: string; customRetentionPeriodDays?: bigint | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.softDeleteFolder(params.folderId, params.customRetentionPeriodDays ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useDeleteFolderToTrash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      folderId: string;
      customRetentionPeriodDays?: bigint | null;
      retentionDays?: bigint | null;
      retentionPeriodDays?: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const days =
        params.customRetentionPeriodDays ??
        params.retentionDays ??
        params.retentionPeriodDays ??
        null;
      return actor.softDeleteFolder(params.folderId, days);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
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

// ─── Folder Protection ───────────────────────────────────────────────────────

export function useGetFolderProtectionStatus(folderId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<FolderProtection | null>({
    queryKey: ['folderProtection', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return null;
      try {
        return await actor.getFolderProtectionStatus(folderId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!folderId,
  });
}

export function useSetFolderPassword() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folderId: string; hashedPassword: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setFolderPassword(params.folderId, params.hashedPassword);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folderProtection', variables.folderId] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useRemoveFolderPassword() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeFolderPassword(folderId);
    },
    onSuccess: (_data, folderId) => {
      queryClient.invalidateQueries({ queryKey: ['folderProtection', folderId] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useToggleFolderLock() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleFolderLock(folderId);
    },
    onSuccess: (_data, folderId) => {
      queryClient.invalidateQueries({ queryKey: ['folderProtection', folderId] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useVerifyFolderPassword() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folderId: string; attempt: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.verifyFolderPassword(params.folderId, params.attempt);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folderProtection', variables.folderId] });
    },
  });
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export function useGetFavorites() {
  const { actor, isFetching } = useActor();
  return useQuery<FavoriteFileInfo[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFavorites();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsFavorite(fileId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isFavorite', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return false;
      return actor.isFavorite(fileId);
    },
    enabled: !!actor && !isFetching && !!fileId,
  });
}

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

// ─── Sharing ─────────────────────────────────────────────────────────────────

export function useGetSharesReceived() {
  const { actor, isFetching } = useActor();
  return useQuery<SharedFileInfo[]>({
    queryKey: ['sharesReceived'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSharesReceived();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSharesSent() {
  const { actor, isFetching } = useActor();
  return useQuery<FileShare[]>({
    queryKey: ['sharesSent'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSharesSent();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useShareFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      fileId: string;
      recipient: Principal;
      canView: boolean;
      canEdit: boolean;
      canDownload: boolean;
      message: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.shareFile(
        params.fileId,
        params.recipient,
        params.canView,
        params.canEdit,
        params.canDownload,
        params.message,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharesSent'] });
    },
  });
}

export function useRevokeShare() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fileId: string; recipient: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.revokeShare(params.fileId, params.recipient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharesSent'] });
      queryClient.invalidateQueries({ queryKey: ['sharesReceived'] });
    },
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function useGetNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useGetUnreadNotificationsCount() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUnreadNotificationsCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
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
    mutationFn: async (params: { toUser: Principal; notificationType: NotificationType }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addNotification(params.toUser, params.notificationType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export function useGetStorageQuota() {
  const { actor, isFetching } = useActor();
  return useQuery<{ used: bigint; available: bigint; total: bigint }>({
    queryKey: ['storageQuota'],
    queryFn: async () => {
      if (!actor) return { used: BigInt(0), available: BigInt(0), total: BigInt(0) };
      return actor.getStorageQuota();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTrashStorageUsage() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ['trashStorageUsage'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTrashStorageUsage();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListAllUsersStorage() {
  const { actor, isFetching } = useActor();
  return useQuery<[Principal, bigint, bigint][]>({
    queryKey: ['allUsersStorage'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllUsersStorage();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetUserQuota() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user: Principal; quota: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserQuota(params.user, params.quota);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersStorage'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

// ─── Trash ───────────────────────────────────────────────────────────────────

export function useListTrashFiles(ownerFilter?: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<TrashMetadata[]>({
    queryKey: ['trash', 'files', ownerFilter?.toString() ?? 'self'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTrashFiles(ownerFilter ?? null);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListTrashFolders(ownerFilter?: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<TrashFolderMetadata[]>({
    queryKey: ['trash', 'folders', ownerFilter?.toString() ?? 'self'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTrashFolders(ownerFilter ?? null);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRestoreFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fileId: string; newPath?: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.restoreFile(params.fileId, params.newPath ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

export function useRestoreFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_folderId: string) => {
      // Backend doesn't have a dedicated restoreFolder endpoint yet
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function usePermanentlyDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fileId: string; secureWipe?: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyDeleteFile(params.fileId, params.secureWipe ?? false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['trashStorageUsage'] });
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
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['trashStorageUsage'] });
    },
  });
}

// ─── Activity ────────────────────────────────────────────────────────────────

export function useGetRecentActivities(limit: number = 10) {
  const { actor, isFetching } = useActor();
  return useQuery<RecentActivity[]>({
    queryKey: ['recentActivities', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentActivities(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetActivityLogs(limit: number = 50) {
  const { actor, isFetching } = useActor();
  return useQuery<ActivityLog[]>({
    queryKey: ['activityLogs', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLogs(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
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

export function useGetSmartSuggestions(limit: number = 5) {
  const { actor, isFetching } = useActor();
  return useQuery<SmartSuggestion[]>({
    queryKey: ['smartSuggestions', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSmartSuggestions(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMostAccessedFiles(limit: number = 10) {
  const { actor, isFetching } = useActor();
  return useQuery<AccessedFileInfo[]>({
    queryKey: ['mostAccessedFiles', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMostAccessedFiles(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
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

// ─── Admin ───────────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Retention ───────────────────────────────────────────────────────────────

export function useGetTrashRetentionPeriod() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ['trashRetentionPeriod'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTrashRetentionPeriod();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetUserRetentionPeriod() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user: Principal; retentionPeriod: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserRetentionPeriod(params.user, params.retentionPeriod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashRetentionPeriod'] });
    },
  });
}
