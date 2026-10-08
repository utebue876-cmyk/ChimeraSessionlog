import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchPractitioners } from '../../services/api/odsService';
import type { OdsPractitioner } from '../../services/types/odsTypes';

export interface UseOdsSearchResult {
  query: string;
  setQuery: (q: string) => void;
  submittedQuery: string | null;
  handleSearch: () => void;
  handleReset: () => void;
  practitioners: OdsPractitioner[];
  loading: boolean;
  error: string | null;
  updatedAt: string | undefined;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export function useOdsSearch(): UseOdsSearchResult {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = (): void => {
    if (query.trim()) {
      setSubmittedQuery(query.trim());
      setCurrentPage(1);
    }
  };

  const handleReset = (): void => {
    setQuery('');
    setSubmittedQuery(null);
    setCurrentPage(1);
  };

  const { data, isFetching, error } = useQuery({
    queryKey: ['ods-practitioners', submittedQuery],
    queryFn: () =>
      fetchPractitioners({
        searchQueryGeneral: submittedQuery!,
        offset: 0,
        batchSize: 5000,
      }),
    enabled: submittedQuery !== null && submittedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    query,
    setQuery,
    submittedQuery,
    handleSearch,
    handleReset,
    practitioners: data?.pracArray ?? [],
    loading: isFetching,
    error: error ? (error as Error).message : null,
    updatedAt: data?.pracCodeSystemUpdatedAt,
    currentPage,
    setCurrentPage,
  };
}
