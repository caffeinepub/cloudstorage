import { useState } from 'react';
import type { FileMetadata } from '../backend';

export function useFileSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchFiles = (files: FileMetadata[]) => {
    if (!searchQuery.trim()) return files;

    const query = searchQuery.toLowerCase();
    return files.filter((file) => {
      const nameMatch = file.name.toLowerCase().includes(query);
      const extensionMatch = file.name.split('.').pop()?.toLowerCase().includes(query);
      return nameMatch || extensionMatch;
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    searchFiles,
  };
}
