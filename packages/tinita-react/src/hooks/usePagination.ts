import { useState, useEffect, useCallback, useMemo } from 'react';

interface PaginationOptions {
  totalItems?: number;
  initialPage?: number;
  initialPageSize?: number;
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  updatePageSize: (newPageSize: number) => void;
  canNext: boolean;
  canPrev: boolean;
  // conditionCanNext: boolean;
  // conditionCanPrev: boolean;
  setConditionCanPrev: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setConditionCanNext: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

const usePagination = ({
  totalItems = 0,
  initialPage = 0,
  initialPageSize = 1,
}: PaginationOptions): Pagination => {
  const [currentPage, setCurrentPage] = useState(0); // Initialize currentPage to 0
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [conditionCanNext, setConditionCanNext] = useState<undefined | boolean>(undefined);
  const [conditionCanPrev, setConditionCanPrev] = useState<undefined | boolean>(undefined);

  useEffect(() => {
    // Ensure currentPage is within bounds
    if (totalItems === 0 || initialPage < 0 || initialPage >= totalItems) {
      setCurrentPage(0);
    } else {
      setCurrentPage(initialPage);
    }
  }, [totalItems, initialPage]);

  useEffect(() => {
    if (currentPage > totalItems) {
      setCurrentPage(totalItems);
    }
  }, [totalItems]);

  const totalPages = useMemo(() => Math.ceil(totalItems / pageSize), [totalItems, pageSize]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 0 && page < totalPages) {
        setCurrentPage(page);
        setConditionCanNext(page !== totalPages - 1);
      } else {
        setConditionCanNext(false);
      }
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const updatePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
  }, []);

  const canNext = useMemo(
    () => (conditionCanNext !== undefined ? conditionCanNext : currentPage < totalPages - 1),
    [currentPage, totalPages, conditionCanNext]
  );
  const canPrev = useMemo(
    () => (conditionCanPrev !== undefined ? conditionCanPrev : currentPage > 0),
    [currentPage, conditionCanPrev]
  );

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  return {
    currentPage,
    pageSize,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    updatePageSize,
    canNext,
    canPrev,
    setConditionCanPrev,
    setConditionCanNext,
  };
};

export default usePagination;
