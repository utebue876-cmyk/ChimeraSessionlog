import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { EpisodeOfCare, Patient, Practitioner } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';
import { formatSortableName } from '../../utils/patientUtils';

export interface CaseRow {
  episodeId: string;
  caseId: string;
  patientId: string;
  patientName: string;
  caseStatus: string;
  serviceType: string;
  periodStart: string;
  managingOrg: string;
}

export type CaseSortColumn = 'caseId' | 'patientName' | 'caseStatus' | 'serviceType' | 'periodStart' | 'managingOrg';

export function getCaseSortValue(row: CaseRow, col: CaseSortColumn): string {
  switch (col) {
    case 'caseId':
      return row.caseId;
    case 'patientName':
      return row.patientName;
    case 'caseStatus':
      return row.caseStatus;
    case 'serviceType':
      return row.serviceType;
    case 'periodStart':
      return row.periodStart;
    case 'managingOrg':
      return row.managingOrg;
  }
}

interface UseCareManagerCasesResult {
  loading: boolean;
  cases: CaseRow[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  handleOpenCase: (row: CaseRow) => void;
}

export function useCareManagerCases(): UseCareManagerCasesResult {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const profile = useMedplumProfile() as Practitioner | undefined;
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const practitionerId = profile?.id;
    if (!practitionerId) return;

    let cancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const episodes: EpisodeOfCare[] = [];
        for await (const page of medplum.searchResourcePages('EpisodeOfCare', {
          'care-manager': `Practitioner/${practitionerId}`,
          _count: '1000',
        })) {
          episodes.push(...page);
        }

        // Collect unique patient IDs to batch-fetch
        const patientIdSet = new Set<string>();
        for (const ep of episodes) {
          const id = ep.patient?.reference?.split('/')[1];
          if (id) patientIdSet.add(id);
        }

        // Fetch all patients in parallel
        const fetchedPatients = await Promise.all(
          Array.from(patientIdSet).map(async (id) => {
            try {
              return await medplum.readResource('Patient', id);
            } catch {
              return { resourceType: 'Patient', id } as Patient;
            }
          })
        );

        if (cancelled) return;

        const patientById = new Map<string, Patient>(fetchedPatients.map((p) => [p.id ?? '', p]));

        const rows: CaseRow[] = episodes.map((episode) => {
          const patientId = episode.patient?.reference?.split('/')[1] ?? '';
          const patient = patientById.get(patientId);
          return {
            episodeId: episode.id ?? '',
            caseId: episode.identifier?.[0]?.value ?? episode.id ?? '',
            patientId,
            patientName: formatSortableName(patient?.name?.[0]) || episode.patient?.display || 'Unknown patient',
            caseStatus: getCaseStatus(episode),
            serviceType: episode.type?.[0]?.coding?.[0]?.display ?? episode.type?.[0]?.text ?? '',
            periodStart: episode.period?.start ?? '',
            managingOrg:
              episode.managingOrganization?.display ??
              episode.managingOrganization?.reference?.replace('Organization/', '') ??
              '',
          };
        });

        rows.sort((a, b) => a.patientName.localeCompare(b.patientName));
        setCases(rows);
        setCurrentPage(1);
      } catch (error) {
        showNotification({ color: 'red', message: normalizeErrorString(error), autoClose: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [medplum, profile?.id]);

  const handleOpenCase = (row: CaseRow): void => {
    if (!row.patientId) return;
    navigate(
      `/Patient/${row.patientId}/case`,
      row.episodeId ? { state: { targetEpisodeId: row.episodeId } } : undefined
    );
  };

  return { loading, cases, currentPage, setCurrentPage, handleOpenCase };
}
