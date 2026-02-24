import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { FileMetadata } from '../backend';
import { Principal } from '@dfinity/principal';

interface RecentUpload {
  fileId: string;
  fileName: string;
  size: bigint;
  owner: Principal;
  uploadedAt: number;
}

interface RecentUploadsContextType {
  recentUploads: RecentUpload[];
  addRecentUpload: (fileId: string, fileName: string, size: bigint, owner: Principal) => void;
  clearRecentUploads: () => void;
}

const RecentUploadsContext = createContext<RecentUploadsContextType | undefined>(undefined);

export function RecentUploadsProvider({ children }: { children: ReactNode }) {
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);

  const addRecentUpload = (fileId: string, fileName: string, size: bigint, owner: Principal) => {
    const newUpload: RecentUpload = {
      fileId,
      fileName,
      size,
      owner,
      uploadedAt: Date.now(),
    };

    setRecentUploads((prev) => [newUpload, ...prev]);
  };

  const clearRecentUploads = () => {
    setRecentUploads([]);
  };

  return (
    <RecentUploadsContext.Provider value={{ recentUploads, addRecentUpload, clearRecentUploads }}>
      {children}
    </RecentUploadsContext.Provider>
  );
}

export function useRecentUploads() {
  const context = useContext(RecentUploadsContext);
  if (context === undefined) {
    throw new Error('useRecentUploads must be used within a RecentUploadsProvider');
  }
  return context;
}
