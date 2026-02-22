import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { FolderMetadata } from '../backend';
import { Principal } from '@dfinity/principal';

export function useListFolders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FolderMetadata[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listFolders();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetFolderMetadata(folderId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FolderMetadata | null>({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!actor || !folderId) return null;
      return actor.getFolderMetadata(folderId);
    },
    enabled: !!actor && !actorFetching && !!folderId,
  });
}

export function useCreateFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      parentFolderId,
      isPublic,
      collaborators,
      color,
      tags,
      description,
    }: {
      name: string;
      parentFolderId: string | null;
      isPublic: boolean;
      collaborators: Principal[];
      color: string;
      tags: string[];
      description: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createFolder(name, parentFolderId, isPublic, collaborators, color, tags, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder'] });
    },
  });
}

export function useEditFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      isPublic,
      collaborators,
      color,
      tags,
      description,
    }: {
      folderId: string;
      isPublic: boolean;
      collaborators: Principal[];
      color: string;
      tags: string[];
      description: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.editFolder(folderId, isPublic, collaborators, color, tags, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder'] });
    },
  });
}

export function useMoveFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, newParentFolderId }: { folderId: string; newParentFolderId: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveFolder(folderId, newParentFolderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder'] });
    },
  });
}

export function useDeleteFolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      deleteContents,
      moveContentsToParent,
    }: {
      folderId: string;
      deleteContents: boolean;
      moveContentsToParent: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteFolder(folderId, deleteContents, moveContentsToParent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['filesByFolder'] });
    },
  });
}

export function buildFolderPath(folderId: string, folders: FolderMetadata[]): FolderMetadata[] {
  const path: FolderMetadata[] = [];
  let currentId: string | undefined = folderId;

  while (currentId) {
    const folder = folders.find((f) => f.id === currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentFolderId;
  }

  return path;
}
