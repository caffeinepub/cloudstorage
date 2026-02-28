import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface FileMetadata {
    id: string;
    owner: Principal;
    name: string;
    size: bigint;
    folderId?: string;
    uploadedAt: bigint;
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
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createFolder(name: string, parentId: string | null): Promise<string>;
    deleteExpiredTrash(): Promise<bigint>;
    favoriteFolder(folderId: string): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFavoriteFolders(): Promise<Array<Folder>>;
    getFilesInFolder(folderId: string): Promise<Array<FileMetadata>>;
    getFilesInFolderWithFavorites(folderId: string): Promise<Array<FileMetadata>>;
    getFolder(folderId: string): Promise<Folder | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isFavoriteFolder(folderId: string): Promise<boolean>;
    listAllFoldersWithFavorites(): Promise<Array<Folder>>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listFolders(): Promise<Array<Folder>>;
    moveFilesToFolder(fileIds: Array<string>, targetFolderId: string): Promise<boolean>;
    /**
     * / Improved function to move a folder (with recursive subtree traversal and proper authorization)
     */
    moveFolder(folderId: string, destFolderId: string | null): Promise<boolean>;
    permanentlyDeleteFolder(folderId: string): Promise<boolean>;
    renameFolder(folderId: string, newName: string): Promise<boolean>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    unfavoriteFolder(folderId: string): Promise<boolean>;
}
