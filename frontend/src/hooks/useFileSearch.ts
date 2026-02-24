import { useState, useMemo } from 'react';
import type { FileMetadata } from '../backend';

export function useFileSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchFiles = useMemo(() => {
    return (files: FileMetadata[]): FileMetadata[] => {
      if (!searchQuery.trim()) {
        return files;
      }

      const query = searchQuery.toLowerCase();
      return files.filter((file) => {
        // Search by file name
        if (file.name.toLowerCase().includes(query)) {
          return true;
        }

        // Search by file type (extension)
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (extension.includes(query)) {
          return true;
        }

        return false;
      });
    };
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchFiles,
  };
}
