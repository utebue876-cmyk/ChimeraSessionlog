import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { EpisodeOfCare, HumanName, Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { FindPatientFormValues } from './findPatientForm';
import { initialFormValues } from './findPatientForm';

interface CaseIdSearchResult {
  patients: Patient[];
  episodeByPatientId: Record<string, string>;
}

interface UseFindPatientResult {
  formValues: FindPatientFormValues;
  matches: Patient[];
  hasSearched: boolean;
  loading: boolean;
  searchModalOpened: boolean;
  currentPage: number;
  totalPages: number;
  pagedMatches: Patient[];
  openSearchModal: () => void;
  closeSearchModal: () => void;
  setCurrentPage: (page: number) => void;
  handleChange: <K extends keyof FindPatientFormValues>(field: K, value: FindPatientFormValues[K]) => void;
  handleReset: () => void;
  handleOpenPatient: (patientId: string | undefined, overrideEpisodeByPatientId?: Record<string, string>) => void;
  handleFindPatients: () => Promise<void>;
}

export function useFindPatientPage(pageSize: number): UseFindPatientResult {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<FindPatientFormValues>(initialFormValues);
  const [matches, setMatches] = useState<Patient[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchModalOpened, setSearchModalOpened] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [episodeByPatientId, setEpisodeByPatientId] = useState<Record<string, string>>({});

  useEffect(() => {
    setSearchModalOpened(true);
  }, []);

  const handleChange = <K extends keyof FindPatientFormValues>(field: K, value: FindPatientFormValues[K]): void => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleReset = (): void => {
    setFormValues(initialFormValues);
    setMatches([]);
    setHasSearched(false);
    setEpisodeByPatientId({});
  };

  const handleOpenPatient = (
    patientId: string | undefined,
    overrideEpisodeByPatientId?: Record<string, string>
  ): void => {
    if (!patientId) {
      return;
    }

    const map = overrideEpisodeByPatientId ?? episodeByPatientId;
    const targetEpisodeId = map[patientId];
    navigate(`/Patient/${patientId}/case`, targetEpisodeId ? { state: { targetEpisodeId } } : undefined)?.catch(
      console.error
    );
  };

  const handleFindPatients = async (): Promise<void> => {
    setLoading(true);
    setHasSearched(true);

    try {
      let patients: Patient[] = [];
      let localEpisodeMap: Record<string, string> = {};
      const hasCaseIdCriteria = Boolean(formValues.caseId.trim());

      if (hasCaseIdCriteria) {
        const result = await searchPatientsByCaseId(medplum, formValues.caseId);
        patients = patients.concat(result.patients);
        localEpisodeMap = { ...localEpisodeMap, ...result.episodeByPatientId };
        setEpisodeByPatientId((prev) => ({ ...prev, ...result.episodeByPatientId }));
      }

      const hasPatientCriteria =
        formValues.mrn.trim() ||
        formValues.firstName.trim() ||
        formValues.lastName.trim() ||
        formValues.birthDate.trim() ||
        formValues.gender;

      if (hasPatientCriteria || !hasCaseIdCriteria) {
        const patientSearchParams = buildPatientSearchParams(formValues);
        const directPatients = await medplum.searchResources('Patient', patientSearchParams);
        patients = patients.concat(directPatients);
      }

      patients = deduplicatePatients(patients);

      if (patients.length === 1) {
        handleOpenPatient(patients[0]?.id, localEpisodeMap);
        return;
      }

      const sortedPatients = [...patients].sort((a, b) =>
        formatSortableName(a.name?.[0] as HumanName).localeCompare(formatSortableName(b.name?.[0] as HumanName))
      );

      setMatches(sortedPatients);
      setCurrentPage(1);
      setSearchModalOpened(false);
    } catch (error) {
      showNotification({
        color: 'red',
        message: normalizeErrorString(error),
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.ceil(matches.length / pageSize), [matches.length, pageSize]);
  const pagedMatches = useMemo(
    () => matches.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, matches, pageSize]
  );

  return {
    formValues,
    matches,
    hasSearched,
    loading,
    searchModalOpened,
    currentPage,
    totalPages,
    pagedMatches,
    openSearchModal: () => setSearchModalOpened(true),
    closeSearchModal: () => setSearchModalOpened(false),
    setCurrentPage,
    handleChange,
    handleReset,
    handleOpenPatient,
    handleFindPatients,
  };
}

function buildPatientSearchParams(values: FindPatientFormValues): [string, string][] {
  const params: [string, string][] = [
    ['_count', '100'],
    ['_sort', '-_lastUpdated'],
    ['_fields', 'id,name,birthDate,gender,address,telecom,identifier'],
  ];

  addSearchParam(params, 'identifier', buildIdentifierSearchValue(values.mrn));
  addSearchParam(params, 'given', values.firstName);
  addSearchParam(params, 'family', values.lastName);
  addSearchParam(params, 'birthdate', values.birthDate);
  addSearchParam(params, 'gender', values.gender ?? undefined);

  return params;
}

async function searchPatientsByCaseId(
  medplum: ReturnType<typeof useMedplum>,
  caseId: string
): Promise<CaseIdSearchResult> {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) {
    return { patients: [], episodeByPatientId: {} };
  }

  try {
    const episodes = await medplum.searchResources('EpisodeOfCare', [
      ['identifier', trimmedCaseId],
      ['_fields', 'patient,identifier'],
    ]);

    if (episodes.length === 0) {
      return { patients: [], episodeByPatientId: {} };
    }

    const episodeByPatientId: Record<string, string> = {};
    for (const episode of episodes) {
      const ref = (episode as EpisodeOfCare).patient?.reference;
      if (ref?.startsWith('Patient/') && episode.id) {
        const patientId = ref.replace('Patient/', '');
        if (!episodeByPatientId[patientId]) {
          episodeByPatientId[patientId] = episode.id;
        }
      }
    }

    if (Object.keys(episodeByPatientId).length === 0) {
      return { patients: [], episodeByPatientId: {} };
    }

    const patients: Patient[] = [];
    for (const patientId of Object.keys(episodeByPatientId)) {
      try {
        const patient = await medplum.readResource('Patient', patientId);
        patients.push(patient);
      } catch {
        // Skip patients that cannot be read.
      }
    }

    return { patients, episodeByPatientId };
  } catch {
    return { patients: [], episodeByPatientId: {} };
  }
}

function addSearchParam(params: [string, string][], key: string, value: string | undefined): void {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return;
  }

  params.push([key, trimmedValue]);
}

function buildIdentifierSearchValue(mrn: string): string | undefined {
  const trimmedMrn = mrn.trim();
  if (!trimmedMrn) {
    return undefined;
  }

  return [trimmedMrn, `|${trimmedMrn}`, `http://hl7.org/fhir/sid/us-ssn|${trimmedMrn}`].join(',');
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
