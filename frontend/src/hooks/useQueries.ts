import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  FileMetadata,
  UserProfile,
  TrashMetadata,
  TrashFolderMetadata,
  ActivityLog,
  RecentActivity,
  FavoriteFileInfo,
  Notification,
  SmartSuggestion,
  Folder,
  FileShare,
  SharedFileInfo,
} from '../backend';
import { Principal } from '@icp-sdk/core/principal';

// Re-exports for backward compatibility
export type TrashItem = TrashMetadata;
export type TrashFolderItem = TrashFolderMetadata;

// Shared helper: returns true only when actor is ready
function useActorReady() {
  const { actor, isFetching } = useActor();
  return { actor, ready: !!actor && !isFetching };
}

// ── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActorReady();
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
  const { actor, ready } = useActorReady();

  return useQuery({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: ready,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Files ─────────────────────────────────────────────────────────────────────

export function useListFiles() {
  const { actor, ready } = useActorReady();

  return useQuery<FileMetadata[]>({
    queryKey: ['files'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFiles();
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGetFileMetadata(fileId: string | null) {
  const { actor, ready } = useActorReady();

  return useQuery<FileMetadata | null>({
    queryKey: ['fileMetadata', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return null;
      return actor.getFileMetadata(fileId);
    },
    enabled: ready && !!fileId,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetFilesInFolder(folderId: string | null) {
  const { actor, ready } = useActorReady();

  return useQuery<FileMetadata[]>({
    queryKey: ['filesInFolder', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return [];
      return actor.getFilesInFolder(folderId);
    },
    enabled: ready && !!folderId,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * useUploadFile - high-level convenience wrapper that handles chunked upload in one mutation.
 */
export function useUploadFile() {
  const { actor } = useActorReady();
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
        queryClient.invalidateQueries({ queryKey: ['filesInFolder', variables.folderId] });
      }
    },
  });
}

export function useUploadFileChunk() {
  const { actor } = useActorReady();
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
      queryClient.invalidateQueries({ queryKey: ['filesInFolder'] });
    },
  });
}

export function useDeleteFile() {
  const { actor } = useActorReady();
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
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    },
  });
}

export function usePermanentlyDeleteFile() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { fileId: string; secureWipe: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyDeleteFile(params.fileId, params.secureWipe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['trashStorageUsage'] });
    },
  });
}

export function useRestoreFile() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { fileId: string; newPath?: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.restoreFile(params.fileId, params.newPath ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

export function useDownloadFile() {
  const { actor } = useActorReady();

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
  const { actor } = useActorReady();

  return useMutation({
    mutationFn: async (params: { fileId: string; chunkIndex: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.downloadFileChunk(params.fileId, params.chunkIndex);
    },
  });
}

// ── Folders ───────────────────────────────────────────────────────────────────

export function useListFolders() {
  const { actor, ready } = useActorReady();

  return useQuery<Folder[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFolders();
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useListAllFoldersWithFavorites() {
  const { actor, ready } = useActorReady();

  return useQuery<Folder[]>({
    queryKey: ['foldersWithFavorites'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllFoldersWithFavorites();
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGetFolder(folderId: string | null) {
  const { actor, ready } = useActorReady();

  return useQuery<Folder | null>({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return null;
      return actor.getFolder(folderId);
    },
    enabled: ready && !!folderId,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; parentId: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createFolder(params.name, params.parentId);
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

export function useRenameFolder() {
  const { actor } = useActorReady();
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
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { folderId: string; destFolderId: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFolder(params.folderId, params.destFolderId);
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

export function useDeleteFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { folderId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.softDeleteFolder(params.folderId, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDeleteFolderToTrash() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      folderId: string;
      retentionDays?: bigint | null;
      retentionPeriodDays?: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const days = params.retentionDays ?? params.retentionPeriodDays ?? null;
      return actor.softDeleteFolder(params.folderId, days);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['trashFolders'] });
    },
  });
}

export function usePermanentlyDeleteFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.permanentlyDeleteFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashFolders'] });
      queryClient.invalidateQueries({ queryKey: ['trashStorageUsage'] });
    },
  });
}

export function useRestoreFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_folderId: string) => {
      // Backend doesn't have a dedicated restoreFolder endpoint
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['trashFolders'] });
    },
  });
}

export function useMoveFilesToFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { fileIds: string[]; targetFolderId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFilesToFolder(params.fileIds, params.targetFolderId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['filesInFolder'] });
      queryClient.invalidateQueries({ queryKey: ['filesInFolder', variables.targetFolderId] });
    },
  });
}

// ── Folder Favorites ──────────────────────────────────────────────────────────

export function useFavoriteFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.favoriteFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteFolders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['isFavoriteFolder'] });
    },
  });
}

export function useUnfavoriteFolder() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unfavoriteFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteFolders'] });
      queryClient.invalidateQueries({ queryKey: ['foldersWithFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['isFavoriteFolder'] });
    },
  });
}

export function useIsFavoriteFolder(folderId: string | null) {
  const { actor, ready } = useActorReady();

  return useQuery<boolean>({
    queryKey: ['isFavoriteFolder', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return false;
      return actor.isFavoriteFolder(folderId);
    },
    enabled: ready && !!folderId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetFavoriteFolders() {
  const { actor, ready } = useActorReady();

  return useQuery<Folder[]>({
    queryKey: ['favoriteFolders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFavoriteFolders();
    },
    enabled: ready,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export function useGetFavorites() {
  const { actor, ready } = useActorReady();

  return useQuery<FavoriteFileInfo[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFavorites();
    },
    enabled: ready,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddFavorite() {
  const { actor } = useActorReady();
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
  const { actor } = useActorReady();
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

export function useIsFavorite(fileId: string | null) {
  const { actor, ready } = useActorReady();

  return useQuery<boolean>({
    queryKey: ['isFavorite', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return false;
      return actor.isFavorite(fileId);
    },
    enabled: ready && !!fileId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Sharing ───────────────────────────────────────────────────────────────────

export function useGetSharesReceived() {
  const { actor, ready } = useActorReady();

  return useQuery<SharedFileInfo[]>({
    queryKey: ['sharesReceived'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSharesReceived();
    },
    enabled: ready,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetSharesSent() {
  const { actor, ready } = useActorReady();

  return useQuery<FileShare[]>({
    queryKey: ['sharesSent'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSharesSent();
    },
    enabled: ready,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShareFile() {
  const { actor } = useActorReady();
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
  const { actor } = useActorReady();
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

// ── Notifications ─────────────────────────────────────────────────────────────

export function useGetNotifications() {
  const { actor, ready } = useActorReady();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: ready,
    retry: 2,
    staleTime: 30 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useGetUnreadNotificationsCount() {
  const { actor, ready } = useActorReady();

  return useQuery<bigint>({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUnreadNotificationsCount();
    },
    enabled: ready,
    retry: 2,
    staleTime: 30 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActorReady();
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

// ── Activity ──────────────────────────────────────────────────────────────────

export function useGetRecentActivities(limit: number = 10) {
  const { actor, ready } = useActorReady();

  return useQuery<RecentActivity[]>({
    queryKey: ['recentActivities', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentActivities(BigInt(limit));
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGetActivityLogs(limit: number = 50) {
  const { actor, ready } = useActorReady();

  return useQuery<ActivityLog[]>({
    queryKey: ['activityLogs', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLogs(BigInt(limit));
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Smart Suggestions ─────────────────────────────────────────────────────────

export function useGetSmartSuggestions(limit: number = 5) {
  const { actor, ready } = useActorReady();

  return useQuery<SmartSuggestion[]>({
    queryKey: ['smartSuggestions', limit],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSmartSuggestions(BigInt(limit));
    },
    enabled: ready,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordFileAccess() {
  const { actor } = useActorReady();

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordFileAccess(fileId);
    },
  });
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function useGetStorageQuota() {
  const { actor, ready } = useActorReady();

  return useQuery<{ used: bigint; available: bigint; total: bigint }>({
    queryKey: ['storageQuota'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStorageQuota();
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGetTrashStorageUsage() {
  const { actor, ready } = useActorReady();

  return useQuery<bigint>({
    queryKey: ['trashStorageUsage'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTrashStorageUsage();
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGetTrashRetentionPeriod() {
  const { actor, ready } = useActorReady();

  return useQuery<bigint>({
    queryKey: ['trashRetentionPeriod'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTrashRetentionPeriod();
    },
    enabled: ready,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetUserRetentionPeriod() {
  const { actor } = useActorReady();
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

// ── Trash ─────────────────────────────────────────────────────────────────────

export function useListTrashFiles(ownerFilter?: Principal | null) {
  const { actor, ready } = useActorReady();

  return useQuery<TrashMetadata[]>({
    queryKey: ['trashFiles', ownerFilter?.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTrashFiles(ownerFilter ?? null);
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useListTrashFolders(ownerFilter?: Principal | null) {
  const { actor, ready } = useActorReady();

  return useQuery<TrashFolderMetadata[]>({
    queryKey: ['trashFolders', ownerFilter?.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTrashFolders(ownerFilter ?? null);
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, ready } = useActorReady();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: ready,
    retry: 2,
    staleTime: 10 * 60 * 1000,
  });
}

export function useListAllUsersStorage() {
  const { actor, ready } = useActorReady();

  return useQuery<[Principal, bigint, bigint][]>({
    queryKey: ['allUsersStorage'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllUsersStorage();
    },
    enabled: ready,
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSetUserQuota() {
  const { actor } = useActorReady();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { user: Principal; quota: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserQuota(params.user, params.quota);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersStorage'] });
    },
  });
}
