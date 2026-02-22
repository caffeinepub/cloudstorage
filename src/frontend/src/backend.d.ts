import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FileMetadata {
    id: string;
    owner: Principal;
    name: string;
    size: bigint;
    folderId?: string;
    uploadedAt: bigint;
}
export interface FolderMetadata {
    id: string;
    owner: Principal;
    name: string;
    createdAt: bigint;
    color: string;
    tags: Array<string>;
    description: string;
    updatedAt: bigint;
    collaborators: Array<Principal>;
    parentFolderId?: string;
    isPublic: boolean;
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
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createFolder(name: string, parentFolderId: string | null, isPublic: boolean, collaborators: Array<Principal>, color: string, tags: Array<string>, description: string): Promise<string>;
    deleteFolder(folderId: string, deleteContents: boolean, moveContentsToParent: boolean): Promise<boolean>;
    downloadFileChunk(fileId: string, chunkIndex: bigint): Promise<Uint8Array | null>;
    editFolder(folderId: string, isPublic: boolean, collaborators: Array<Principal>, color: string, tags: Array<string>, description: string): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFileMetadata(fileId: string): Promise<FileMetadata | null>;
    getFolderMetadata(folderId: string): Promise<FolderMetadata | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listFiles(): Promise<Array<FileMetadata>>;
    listFilesByFolder(folderId: string | null): Promise<Array<FileMetadata>>;
    listFolders(): Promise<Array<FolderMetadata>>;
    moveFolder(folderId: string, newParentFolderId: string | null): Promise<boolean>;
    renameFolder(folderId: string, newName: string): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    uploadFileChunk(fileId: string, fileName: string, chunkIndex: bigint, chunkData: Uint8Array, totalChunks: bigint, totalSize: bigint, folderId: string | null): Promise<string | null>;
}
