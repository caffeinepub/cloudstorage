import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
    email: string;
}
export interface FileMetadata {
    id: string;
    owner: Principal;
    name: string;
    size: bigint;
    uploadedAt: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteFile(fileId: string): Promise<boolean>;
    downloadFileChunk(fileId: string, _chunkIndex: bigint): Promise<Uint8Array | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFileMetadata(fileId: string): Promise<FileMetadata | null>;
    getStorageQuota(): Promise<{
        total: bigint;
        used: bigint;
        available: bigint;
    }>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listAllUsersStorage(): Promise<Array<[Principal, bigint, bigint]>>;
    listFiles(): Promise<Array<FileMetadata>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setUserQuota(user: Principal, quota: bigint): Promise<void>;
    uploadFileChunk(fileId: string, fileName: string, chunkIndex: bigint, _chunkData: Uint8Array, totalChunks: bigint, totalSize: bigint): Promise<string | null>;
}
