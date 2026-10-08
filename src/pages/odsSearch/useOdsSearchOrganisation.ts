import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchOrganisations } from '../../services/api/odsService';
import type { OdsOrganisationMain, OrganisationReportSearch } from '../../services/types/odsTypes';

export type OrganisationStatusFilter = '' | 'Active' | 'Inactive';

export interface UseOdsSearchOrganisationResult {
  name: string;
  setName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  town: string;
  setTown: (v: string) => void;
  postcode: string;
  setPostcode: (v: string) => void;
  status: OrganisationStatusFilter;
  setStatus: (v: OrganisationStatusFilter) => void;
  handleSearch: () => void;
  handleReset: () => void;
  validationError: string | null;
  organisations: OdsOrganisationMain[];
  loading: boolean;
  error: string | null;
  submitted: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export function useOdsSearchOrganisation(): UseOdsSearchOrganisationResult {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [town, setTown] = useState('');
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<OrganisationStatusFilter>('');
  const [submittedRequest, setSubmittedRequest] = useState<OrganisationReportSearch | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSearch = (): void => {
    if (!name.trim() && !address.trim() && !town.trim() && !postcode.trim()) {
      setValidationError('Please enter at least one of Name, Address, Town or Postcode.');
      return;
    }
    setValidationError(null);
    setSubmittedRequest({
      searchQueryName: name.trim(),
      searchQueryCode: '',
      searchQueryAddress: address.trim(),
      searchQueryTown: town.trim(),
      searchQueryPostCode: postcode.trim(),
      searchQueryPrimaryRoleCodes: '',
      searchQueryNonPrimaryRoleCodes: 'RO76',
      searchQueryIsActive: status,
      lastChangeDateStart: null,
      lastChangeDateEnd: null,
      getNumberOfRecords: false,
    });
    setCurrentPage(1);
  };

  const handleReset = (): void => {
    setName('');
    setAddress('');
    setTown('');
    setPostcode('');
    setStatus('');
    setValidationError(null);
    setSubmittedRequest(null);
    setCurrentPage(1);
  };

  const { data, isFetching, error } = useQuery({
    queryKey: ['ods-organisations', submittedRequest],
    queryFn: () => fetchOrganisations(submittedRequest!),
    enabled: submittedRequest !== null,
    staleTime: 5 * 60 * 1000,
  });

  return {
    name,
    setName,
    address,
    setAddress,
    town,
    setTown,
    postcode,
    setPostcode,
    status,
    setStatus,
    handleSearch,
    handleReset,
    validationError,
    organisations: data?.orgArray ?? [],
    loading: isFetching,
    error: error ? (error as Error).message : null,
    submitted: submittedRequest !== null,
    currentPage,
    setCurrentPage,
  };
}
