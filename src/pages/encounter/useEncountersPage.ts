import { formatCodeableConcept } from '@medplum/core';
import type {
  Appointment,
  CodeableConcept,
  Encounter,
  EpisodeOfCare,
  Practitioner,
  Reference,
} from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import { useSortResults } from '../../hooks/useSortResults';
import { getPlanDefinitionNameFromEncounter, getServiceTypeForAppointment } from '../../utils/appointmentUtils';

export type SortColumn = 'start' | 'end' | 'practitioner' | 'serviceType' | 'planDefinitionName' | 'status';

function makeSortValue(
  planDefinitionNames: Record<string, string>
): (item: EncounterListItem, col: SortColumn) => string {
  return function getSortValue(item: EncounterListItem, col: SortColumn): string {
    switch (col) {
      case 'start':
        return item.appointment?.start ?? item.encounter.period?.start ?? '';
      case 'end':
        return item.appointment?.end ?? item.encounter.period?.end ?? '';
      case 'practitioner':
        return (
          item.appointment?.participant?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))?.actor?.display ??
          item.encounter?.participant?.[0]?.individual?.display ??
          ''
        );
      case 'serviceType':
        return (formatCodeableConcept(item.serviceType ?? item.encounter.serviceType) ?? '').toLowerCase();
      case 'planDefinitionName':
        return planDefinitionNames[item.encounter.id ?? ''] ?? '';
      case 'status':
        return item.encounter.status ?? '';
    }
  };
}

export interface EncounterListItem {
  encounter: Encounter;
  appointment: Appointment | undefined;
  practitioner?: Practitioner;
  serviceType?: CodeableConcept;
}

export function useEncountersPage(pageSize: number): {
  loading: boolean;
  error?: string;
  encounters: EncounterListItem[];
  sortedEncounters: EncounterListItem[];
  planDefinitionNames: Record<string, string>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  handleOpenEncounter: (encounterId: string) => void;
  handleCreateAppointment: () => void;
  totalPages: number;
  activeEpisode: EpisodeOfCare | undefined;
  sortCol: SortColumn | null;
  sortDir: 'asc' | 'desc';
  handleSort: (col: SortColumn) => void;
} {
  const medplum = useMedplum();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [encounters, setEncounters] = useState<EncounterListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = useMemo(() => Math.ceil(encounters.length / pageSize), [encounters.length, pageSize]);
  const [planDefinitionNames, setPlanDefinitionNames] = useState<Record<string, string>>({});
  const { activeEpisode } = useActiveEpisode();
  const navigate = useNavigate();
  const { patientId } = useParams();

  useEffect(() => {
    let cancelled = false;

    async function loadEncounters(): Promise<void> {
      setLoading(true);
      setError(undefined);

      if (!activeEpisode?.id) {
        setEncounters([]);
        setCurrentPage(1);
        setLoading(false);
        return;
      }

      try {
        const results = await medplum.searchResources('Encounter', [
          ['_count', '1000'],
          ['_sort', '-date'],
          ['episode-of-care', `EpisodeOfCare/${activeEpisode.id}`],
        ]);

        if (!cancelled) {
          const encounterItems = await Promise.all(
            results.map(async (encounter) => {
              const appointmentRef = encounter.appointment?.at(-1) as Reference<Appointment> | undefined;
              let appointment: Appointment | undefined = undefined;
              let practitioner: Practitioner | undefined = undefined;

              // Fetch appointment if reference exists
              if (appointmentRef) {
                try {
                  appointment = await medplum.readReference(appointmentRef);
                } catch {
                  appointment = undefined;
                }
              }

              // Fetch practitioner if participant[0].individual exists
              const participant = encounter.participant?.[0];
              if (participant?.individual) {
                try {
                  const practitionerResult = await medplum.readReference(participant.individual);
                  if (practitionerResult.resourceType === 'Practitioner') {
                    practitioner = practitionerResult;
                  }
                } catch {
                  practitioner = undefined;
                }
              }

              // Fetch the service type from the appointment or encounter and include it in the item for sorting purposes
              const serviceType = await getServiceTypeForAppointment(medplum, appointment!, encounter.serviceType);

              return { encounter, appointment, practitioner, serviceType };
            })
          );
          setEncounters(encounterItems);
          setCurrentPage(1);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load encounters');
          setEncounters([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEncounters().catch(() => {
      if (!cancelled) {
        setError('Failed to load encounters');
        setEncounters([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeEpisode?.id, medplum]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      encounters.map((item) =>
        getPlanDefinitionNameFromEncounter(medplum, item.encounter).then((name) => ({
          id: item.encounter.id ?? '',
          name: name ?? '',
        }))
      )
    ).then((results) => {
      if (!cancelled) {
        setPlanDefinitionNames(Object.fromEntries(results.map((r) => [r.id, r.name])));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [medplum, encounters]);

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<EncounterListItem, SortColumn>(encounters, makeSortValue(planDefinitionNames), () =>
    setCurrentPage(1)
  );
  const sortedEncounters = allSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenEncounter = (encounterId: string) => {
    if (!patientId) {
      return;
    }
    navigate(`/Patient/${patientId}/Encounter/${encounterId}`);
  };

  const handleCreateAppointment = (): void => {
    if (!patientId) {
      return;
    }
    navigate(`/Patient/${patientId}/Encounter/new`);
  };

  return {
    loading,
    error,
    encounters,
    sortedEncounters,
    planDefinitionNames,
    currentPage,
    setCurrentPage,
    totalPages,
    activeEpisode,
    sortCol,
    sortDir,
    handleSort,
    handleOpenEncounter,
    handleCreateAppointment,
  };
}
