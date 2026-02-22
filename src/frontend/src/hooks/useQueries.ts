import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { 
  UserProfile, 
  FileMetadata, 
  UserRole, 
  RecentActivity,
  FavoriteFileInfo,
  SharedFileInfo,
  Notification,
  SmartSuggestion,
  NotificationType,
  TrashMetadata
} from '../backend';
import { Principal } from '@dfinity/principal';

// Re-export TrashMetadata from backend as TrashItem for consistency
export type TrashItem = TrashMetadata;

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

export function useGetStorageQuota() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['storageQuota'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStorageQuota();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
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
    refetchInterval: 3000,
  });
}

export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!actor) throw new Error('Actor not available');

      const CHUNK_SIZE = 1024 * 1024;
      const fileId = `${Date.now()}-${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
        const chunk = new Uint8Array(arrayBuffer.slice(start, end));

        const result = await actor.uploadFileChunk(
          fileId,
          file.name,
          BigInt(i),
          chunk,
          BigInt(totalChunks),
          BigInt(arrayBuffer.byteLength)
        );

        if (!result) {
          throw new Error('Upload failed - quota exceeded or permission denied');
        }
      }

      return fileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    },
  });
}

export function useDownloadFile(fileId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Uint8Array | null>({
    queryKey: ['fileDownload', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return null;

      const metadata = await actor.getFileMetadata(fileId);
      if (!metadata) return null;

      const CHUNK_SIZE = 1024 * 1024;
      const totalChunks = Math.ceil(Number(metadata.size) / CHUNK_SIZE);
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = await actor.downloadFileChunk(fileId, BigInt(i));
        if (chunk) {
          chunks.push(chunk);
        }
      }

      if (chunks.length === 0) return null;

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    },
    enabled: !!actor && !actorFetching && !!fileId,
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
      const result = await actor.deleteFile(fileId, originalPath, customRetentionPeriod);
      if (!result) throw new Error('Delete failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
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
    refetchInterval: 5000,
  });
}

export function useListTrashFiles(ownerFilter: Principal | null = null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<TrashItem[]>({
    queryKey: ['trashFiles', ownerFilter?.toString() ?? 'all'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listTrashFiles(ownerFilter);
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
  });
}

export function useRestoreFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, newPath }: { fileId: string; newPath: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.restoreFile(fileId, newPath);
      if (!result) throw new Error('Restore failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['trashStorageUsage'] });
    },
  });
}

export function usePermanentlyDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, secureWipe }: { fileId: string; secureWipe: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.permanentlyDeleteFile(fileId, secureWipe);
      if (!result) throw new Error('Permanent delete failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['trashStorageUsage'] });
    },
  });
}

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

export function useGetActivityLogs(limit: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['activityLogs', limit.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getActivityLogs(limit);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRecentActivities() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<RecentActivity[]>({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getRecentActivities(10n);
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}

export function useListAllUsersStorage() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<[Principal, bigint, bigint][]>({
    queryKey: ['allUsersStorage'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listAllUsersStorage();
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
      queryClient.invalidateQueries({ queryKey: ['allUsersStorage'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
    },
  });
}

// Favorites
export function useIsFavorite(fileId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isFavorite', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return false;
      return actor.isFavorite(fileId);
    },
    enabled: !!actor && !actorFetching && !!fileId,
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

export function useFavorites() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FavoriteFileInfo[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFavorites();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 5000,
  });
}

// Shared Files
export function useSharesReceived() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SharedFileInfo[]>({
    queryKey: ['sharesReceived'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSharesReceived();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 5000,
  });
}

// Notifications
export function useNotifications() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getNotifications();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useUnreadNotificationsCount() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUnreadNotificationsCount();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
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

// Smart Suggestions
export function useSmartSuggestions() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SmartSuggestion[]>({
    queryKey: ['smartSuggestions'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSmartSuggestions(10n);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000,
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
      queryClient.invalidateQueries({ queryKey: ['smartSuggestions'] });
    },
  });
}
