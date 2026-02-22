import { useState } from 'react';
import type { FileMetadata } from '../backend';

export interface FileFilters {
  name: string;
  type: string;
  dateStart: number | null;
  dateEnd: number | null;
  sizeMin: number | null;
  sizeMax: number | null;
}

export function useFileFilters() {
  const [filters, setFiltersState] = useState<FileFilters>({
    name: '',
    type: '',
    dateStart: null,
    dateEnd: null,
    sizeMin: null,
    sizeMax: null,
  });

  const setNameFilter = (value: string) => {
    setFiltersState((prev) => ({ ...prev, name: value }));
  };

  const setTypeFilter = (value: string) => {
    setFiltersState((prev) => ({ ...prev, type: value }));
  };

  const setDateRange = (start: number | null, end: number | null) => {
    setFiltersState((prev) => ({ ...prev, dateStart: start, dateEnd: end }));
  };

  const setSizeRange = (min: number | null, max: number | null) => {
    setFiltersState((prev) => ({ ...prev, sizeMin: min, sizeMax: max }));
  };

  const clearAllFilters = () => {
    setFiltersState({
      name: '',
      type: '',
      dateStart: null,
      dateEnd: null,
      sizeMin: null,
      sizeMax: null,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.name) count++;
    if (filters.type) count++;
    if (filters.dateStart || filters.dateEnd) count++;
    if (filters.sizeMin || filters.sizeMax) count++;
    return count;
  };

  const filterFiles = (files: FileMetadata[]) => {
    return files.filter((file) => {
      if (filters.name && !file.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      if (filters.type) {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (extension !== filters.type.toLowerCase()) {
          return false;
        }
      }

      const fileDate = Number(file.uploadedAt);
      if (filters.dateStart && fileDate < filters.dateStart) {
        return false;
      }
      if (filters.dateEnd && fileDate > filters.dateEnd) {
        return false;
      }

      const fileSize = Number(file.size);
      if (filters.sizeMin && fileSize < filters.sizeMin) {
        return false;
      }
      if (filters.sizeMax && fileSize > filters.sizeMax) {
        return false;
      }

      return true;
    });
  };

  return {
    filters,
    setNameFilter,
    setTypeFilter,
    setDateRange,
    setSizeRange,
    clearAllFilters,
    getActiveFilterCount,
    filterFiles,
  };
}
