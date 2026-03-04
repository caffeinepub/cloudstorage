import { useMemo, useState } from "react";
import type { FileMetadata } from "../backend";

export type SortBy = "name" | "date" | "size" | "type" | null;
export type SortOrder = "asc" | "desc";

export function useFileSorting() {
  const [sortBy, setSortBy] = useState<SortBy>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const setSortOption = (option: SortBy) => {
    if (sortBy === option) {
      toggleSortOrder();
    } else {
      setSortBy(option);
      setSortOrder("asc");
    }
  };

  const sortFiles = useMemo(() => {
    return (files: FileMetadata[]): FileMetadata[] => {
      if (!sortBy) {
        return files;
      }

      const sorted = [...files].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "name":
            comparison = a.name
              .toLowerCase()
              .localeCompare(b.name.toLowerCase());
            break;
          case "date":
            comparison = Number(a.uploadedAt) - Number(b.uploadedAt);
            break;
          case "size":
            comparison = Number(a.size) - Number(b.size);
            break;
          case "type": {
            const extA = a.name.split(".").pop()?.toLowerCase() || "";
            const extB = b.name.split(".").pop()?.toLowerCase() || "";
            comparison = extA.localeCompare(extB);
            break;
          }
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      return sorted;
    };
  }, [sortBy, sortOrder]);

  return {
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    setSortOption,
    sortFiles,
  };
}
