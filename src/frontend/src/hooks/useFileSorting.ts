import { useState } from 'react';
import type { FileMetadata } from '../backend';

export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export function useFileSorting() {
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const setSortOption = (option: SortBy) => {
    if (sortBy === option) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('asc');
    }
  };

  const sortFiles = (files: FileMetadata[]) => {
    const sorted = [...files].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = Number(a.uploadedAt) - Number(b.uploadedAt);
          break;
        case 'size':
          comparison = Number(a.size) - Number(b.size);
          break;
        case 'type':
          const extA = a.name.split('.').pop()?.toLowerCase() || '';
          const extB = b.name.split('.').pop()?.toLowerCase() || '';
          comparison = extA.localeCompare(extB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  return {
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    setSortOption,
    sortFiles,
  };
}
