import { useCallback, useState } from "react";

const DEFAULT_ITEMS_PER_PAGE = 10;

export interface UsePaginationReturn<T> {
  currentPage: number;
  itemsPerPage: number;
  setPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  paginatedData: (data: T[]) => T[];
  resetPage: () => void;
}

export function usePagination<T>(): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(DEFAULT_ITEMS_PER_PAGE);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setItemsPerPage = useCallback((count: number) => {
    setItemsPerPageState(count);
    setCurrentPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const paginatedData = useCallback(
    (data: T[]): T[] => {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return data.slice(start, end);
    },
    [currentPage, itemsPerPage],
  );

  return {
    currentPage,
    itemsPerPage,
    setPage,
    setItemsPerPage,
    paginatedData,
    resetPage,
  };
}
