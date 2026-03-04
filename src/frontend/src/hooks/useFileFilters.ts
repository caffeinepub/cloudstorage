import { useMemo, useState } from "react";
import type { FileMetadata } from "../backend";

export interface FileFilters {
  nameFilter: string;
  typeFilter: string;
  dateRange: { start: number | null; end: number | null };
  sizeRange: { min: number | null; max: number | null };
}

export function useFileFilters() {
  const [filters, setFilters] = useState<FileFilters>({
    nameFilter: "",
    typeFilter: "all",
    dateRange: { start: null, end: null },
    sizeRange: { min: null, max: null },
  });

  const setNameFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, nameFilter: value }));
  };

  const setTypeFilter = (value: string) => {
    setFilters((prev) => ({ ...prev, typeFilter: value }));
  };

  const setDateRange = (start: number | null, end: number | null) => {
    setFilters((prev) => ({ ...prev, dateRange: { start, end } }));
  };

  const setSizeRange = (min: number | null, max: number | null) => {
    setFilters((prev) => ({ ...prev, sizeRange: { min, max } }));
  };

  const clearAllFilters = () => {
    setFilters({
      nameFilter: "",
      typeFilter: "all",
      dateRange: { start: null, end: null },
      sizeRange: { min: null, max: null },
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.nameFilter) count++;
    if (filters.typeFilter !== "all") count++;
    if (filters.dateRange.start !== null || filters.dateRange.end !== null)
      count++;
    if (filters.sizeRange.min !== null || filters.sizeRange.max !== null)
      count++;
    return count;
  };

  const filterFiles = useMemo(() => {
    return (files: FileMetadata[]): FileMetadata[] => {
      return files.filter((file) => {
        // Name filter
        if (
          filters.nameFilter &&
          !file.name.toLowerCase().includes(filters.nameFilter.toLowerCase())
        ) {
          return false;
        }

        // Type filter
        if (filters.typeFilter !== "all") {
          const extension = file.name.split(".").pop()?.toLowerCase() || "";
          const fileType = getFileType(extension);
          if (fileType !== filters.typeFilter) {
            return false;
          }
        }

        // Date range filter
        const fileDate = Number(file.uploadedAt) / 1_000_000; // Convert nanoseconds to milliseconds
        if (
          filters.dateRange.start !== null &&
          fileDate < filters.dateRange.start
        ) {
          return false;
        }
        if (
          filters.dateRange.end !== null &&
          fileDate > filters.dateRange.end
        ) {
          return false;
        }

        // Size range filter (in bytes)
        const fileSize = Number(file.size);
        if (
          filters.sizeRange.min !== null &&
          fileSize < filters.sizeRange.min
        ) {
          return false;
        }
        if (
          filters.sizeRange.max !== null &&
          fileSize > filters.sizeRange.max
        ) {
          return false;
        }

        return true;
      });
    };
  }, [filters]);

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

function getFileType(extension: string): string {
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"];
  const documentExts = ["pdf", "doc", "docx", "txt", "rtf", "odt"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac"];

  if (imageExts.includes(extension)) return "image";
  if (videoExts.includes(extension)) return "video";
  if (documentExts.includes(extension)) return "document";
  if (audioExts.includes(extension)) return "audio";
  return "other";
}
