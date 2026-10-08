import { useQuery } from '@tanstack/react-query';
import { fetchOrganisationById } from '../../services/api/odsService';
import type { OdsOrganisationPractitioner } from '../../services/types/odsTypes';

export interface UseOrgPractitionersResult {
  practitioners: OdsOrganisationPractitioner[];
  loading: boolean;
  error: string | null;
}

export function useOrgPractitioners(orgId: string, enabled: boolean): UseOrgPractitionersResult {
  const { data, isFetching, error } = useQuery({
    queryKey: ['org-practitioners', orgId],
    queryFn: () => fetchOrganisationById(orgId),
    enabled: enabled && orgId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    practitioners: data?.practitioners ?? [],
    loading: isFetching,
    error: error ? (error as Error).message : null,
  };
}
