import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { HumanName, Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

interface UsePatientsPageResult {
  loading: boolean;
  currentPage: number;
  totalPages: number;
  patients: Patient[];
  pagedPatients: Patient[];
  setCurrentPage: (page: number) => void;
  handleOpenPatient: (patientId: string | undefined, overrideEpisodeByPatientId?: Record<string, string>) => void;
  handleGetPatients: () => Promise<void>;
}

export function usePatientsPage(pageSize: number): UsePatientsPageResult {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [episodeByPatientId, _setEpisodeByPatientId] = useState<Record<string, string>>({});

  const handleOpenPatient = useCallback(
    (patientId: string | undefined, overrideEpisodeByPatientId?: Record<string, string>): void => {
      if (!patientId) {
        return;
      }

      const map = overrideEpisodeByPatientId ?? episodeByPatientId;
      const targetEpisodeId = map[patientId];
      navigate(`/Patient/${patientId}/case`, targetEpisodeId ? { state: { targetEpisodeId } } : undefined)?.catch(
        console.error
      );
    },
    [episodeByPatientId, navigate]
  );

  const handleGetPatients = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      let patients: Patient[] = [];

      for await (const page of medplum.searchResourcePages('Patient', { _count: 1000 })) {
        patients = patients.concat(page);
      }

      patients = deduplicatePatients(patients);

      if (patients.length === 1) {
        handleOpenPatient(patients[0]?.id);
        return;
      }

      const sortedPatients = [...patients].sort((a, b) =>
        formatSortableName(a.name?.[0] as HumanName).localeCompare(formatSortableName(b.name?.[0] as HumanName))
      );

      setPatients(sortedPatients);
      setCurrentPage(1);
    } catch (error) {
      showNotification({
        color: 'red',
        message: normalizeErrorString(error),
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  }, [medplum, handleOpenPatient]);

  useEffect(() => {
    handleGetPatients().catch((error) => console.error(error));
  }, [handleGetPatients]);

  const totalPages = useMemo(() => Math.ceil(patients.length / pageSize), [patients.length, pageSize]);
  const pagedPatients = useMemo(
    () => patients.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, patients, pageSize]
  );

  return {
    loading,
    currentPage,
    totalPages,
    patients,
    pagedPatients,
    setCurrentPage,
    handleOpenPatient,
    handleGetPatients,
  };
}

function deduplicatePatients(patients: Patient[]): Patient[] {
  const uniquePatients = new Map<string, Patient>();
  for (const patient of patients) {
    if (patient.id) {
      uniquePatients.set(patient.id, patient);
    }
  }
  return Array.from(uniquePatients.values());
}

function formatSortableName(name: HumanName | undefined): string {
  if (!name) {
    return '';
  } else if (name.family && name.given) {
    return `${name.family}, ${name.given.join(' ')}`;
  } else if (name.family) {
    return name.family;
  } else if (name.given) {
    return name.given.join(' ');
  } else {
    return '';
  }
}
