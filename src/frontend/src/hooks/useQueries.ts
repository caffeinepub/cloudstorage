import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, FileMetadata, UserRole } from '../backend';
import { Principal } from '@dfinity/principal';

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
    mutationFn: async (fileId: string) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.deleteFile(fileId);
      if (!result) throw new Error('Delete failed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storageQuota'] });
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
    refetchInterval: 5000,
  });
}

export function useGetUserProfile(userPrincipal: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userPrincipal],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const principal = Principal.fromText(userPrincipal);
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
  });
}

export function useSetUserQuota() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userPrincipal, quota }: { userPrincipal: string; quota: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      const principal = Principal.fromText(userPrincipal);
      return actor.setUserQuota(principal, quota);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersStorage'] });
    },
  });
}

export function useActivityFeed() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<
    Array<{
      userName: string;
      action: string;
      fileName: string;
      timestamp: bigint;
    }>
  >({
    queryKey: ['activityFeed'],
    queryFn: async () => {
      if (!actor) return [];
      return [];
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 7000,
  });
}
