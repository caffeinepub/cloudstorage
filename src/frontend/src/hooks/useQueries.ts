import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { 
  UserProfile, 
  FileMetadata, 
  UserRole
} from '../backend';
import { Principal } from '@dfinity/principal';

// Type alias for TrashItem (stub since backend doesn't have trash functionality yet)
export type TrashItem = {
  fileId: string;
  metadata: FileMetadata;
  deletedAt: bigint;
  originalPath: string;
  retentionPeriod: bigint;
};

// Type for recent activities
export type RecentActivity = {
  timestamp: bigint;
  user: Principal;
  action: string;
  fileId: string;
  fileName: string;
  details: string;
  relativeTime: string;
};

// Type for notifications
export type Notification = {
  id: number;
  timestamp: bigint;
  type: string;
  isRead: boolean;
  message: string;
};

// Type for favorite files
export type FavoriteFileInfo = {
  fileId: string;
  fileName: string;
  size: bigint;
  addedAt: bigint;
  metadata: FileMetadata | null;
};

// Type for smart suggestions
export type SmartSuggestion = {
  fileId: string;
  fileName: string;
  reason: string;
  accessCount: number;
  lastAccessed: bigint;
  relativeTime: string;
};

// Type for shared files
export type SharedFileInfo = {
  fileId: string;
  fileName: string;
  owner: Principal;
  ownerName: string;
  sharedAt: bigint;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDownload: boolean;
  };
};

// Type for user storage info
export type UserStorageInfo = {
  user: Principal;
  used: bigint;
  quota: bigint;
  userName: string;
};

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
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
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

export function useListFilesByFolder(folderId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['filesByFolder', folderId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listFilesByFolder(folderId);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useListRootFiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata[]>({
    queryKey: ['rootFiles'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listFilesByFolder(null);
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string | null }) => {
      if (!actor) throw new Error('Actor not available');

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
          folderId || null
        );

        if (!result) {
          throw new Error('Upload failed - quota exceeded or permission denied');
        }
      }

      return fileId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['filesByFolder', variables.folderId] });
      queryClient.invalidateQueries({ queryKey: ['rootFiles'] });
    },
  });
}

export function useGetFileMetadata(fileId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FileMetadata | null>({
    queryKey: ['fileMetadata', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return null;
      return actor.getFileMetadata(fileId);
    },
    enabled: !!actor && !actorFetching && !!fileId,
  });
}

export function useDownloadFile(fileId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Uint8Array | null>({
    queryKey: ['fileData', fileId],
    queryFn: async () => {
      if (!actor || !fileId) return null;

      const metadata = await actor.getFileMetadata(fileId);
      if (!metadata) return null;

      const chunkSize = 1024 * 1024;
      const totalChunks = Math.ceil(Number(metadata.size) / chunkSize);
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = await actor.downloadFileChunk(fileId, BigInt(i));
        if (chunk) {
          chunks.push(chunk);
        }
      }

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

// Stub implementations for features not yet in backend
export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId }: { fileId: string }) => {
      console.log('Delete file stub:', fileId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['filesByFolder'] });
      queryClient.invalidateQueries({ queryKey: ['rootFiles'] });
    },
  });
}

export function useIsFavorite(fileId: string) {
  return useQuery<boolean>({
    queryKey: ['isFavorite', fileId],
    queryFn: async () => false,
  });
}

export function useAddFavorite() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      console.log('Add favorite stub:', fileId);
    },
  });
}

export function useRemoveFavorite() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      console.log('Remove favorite stub:', fileId);
    },
  });
}

export function useRecordFileAccess() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      console.log('Record access stub:', fileId);
    },
  });
}

export function useFavorites() {
  return useQuery<FavoriteFileInfo[]>({
    queryKey: ['favorites'],
    queryFn: async () => [],
  });
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => [],
  });
}

export function useMarkNotificationAsRead() {
  return useMutation({
    mutationFn: async (notificationId: number) => {
      console.log('Mark notification as read stub:', notificationId);
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery<number>({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => 0,
  });
}

export function useSmartSuggestions() {
  return useQuery<SmartSuggestion[]>({
    queryKey: ['smartSuggestions'],
    queryFn: async () => [],
  });
}

export function useSharesReceived() {
  return useQuery<SharedFileInfo[]>({
    queryKey: ['sharesReceived'],
    queryFn: async () => [],
  });
}

export function useRecentActivities() {
  return useQuery<RecentActivity[]>({
    queryKey: ['recentActivities'],
    queryFn: async () => [],
    refetchInterval: 8000,
  });
}

export function useListTrashFiles(adminOwnerFilter?: Principal | null) {
  return useQuery<TrashItem[]>({
    queryKey: ['trashFiles', adminOwnerFilter?.toString()],
    queryFn: async () => [],
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, targetFolderId }: { fileId: string; targetFolderId?: string | null }) => {
      console.log('Restore file stub:', fileId, targetFolderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function usePermanentlyDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, secureWipe }: { fileId: string; secureWipe: boolean }) => {
      console.log('Permanently delete file stub:', fileId, secureWipe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trashFiles'] });
    },
  });
}

export function useGetStorageQuota() {
  return useQuery({
    queryKey: ['storageQuota'],
    queryFn: async () => ({
      used: BigInt(0),
      total: BigInt(100000000),
    }),
  });
}

export function useGetTrashStorageUsage() {
  return useQuery<bigint>({
    queryKey: ['trashStorageUsage'],
    queryFn: async () => BigInt(0),
  });
}

export function useListAllUsersStorage() {
  return useQuery<UserStorageInfo[]>({
    queryKey: ['allUsersStorage'],
    queryFn: async () => [],
  });
}

export function useGetAllUsers() {
  return useQuery<Principal[]>({
    queryKey: ['allUsers'],
    queryFn: async () => [],
  });
}

export function useSetUserQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, quota }: { user: Principal; quota: bigint }) => {
      console.log('Set user quota stub:', user.toString(), quota);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersStorage'] });
    },
  });
}

export function useGetUserRetentionPeriod() {
  return useQuery<bigint>({
    queryKey: ['userRetentionPeriod'],
    queryFn: async () => BigInt(30 * 24 * 60 * 60 * 1000000000),
  });
}

export function useGetTrashRetentionPeriod() {
  return useQuery<bigint>({
    queryKey: ['trashRetentionPeriod'],
    queryFn: async () => BigInt(30 * 24 * 60 * 60 * 1000000000),
  });
}

export function useSetUserRetentionPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, period }: { user: Principal; period: bigint }) => {
      console.log('Set user retention period stub:', user.toString(), period);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRetentionPeriod'] });
    },
  });
}
