import type { MedplumClient } from '@medplum/core';
import { getReferenceString } from '@medplum/core';
import type { AuditEvent, Patient } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

export const TOP_N = 10;

export interface RecentPatientEntry {
  patient: Patient;
  lastActivityAt: string;
}

// Attempt to derive recent patients from server-side AuditEvent records.
// Returns null if the search is unsupported or produces no usable results.
async function loadFromAuditEvents(
  medplum: MedplumClient,
  practitionerRef: string
): Promise<RecentPatientEntry[] | null> {
  let auditEvents: AuditEvent[];
  try {
    auditEvents = await medplum.searchResources('AuditEvent', [
      ['agent', practitionerRef],
      ['_sort', '-date'],
      ['_count', '200'],
    ]);
  } catch {
    return null;
  }

  const timestampMap = new Map<string, string>();
  for (const event of auditEvents) {
    const recorded = event.recorded ?? '';
    for (const entity of event.entity ?? []) {
      const ref = entity.what?.reference ?? '';
      if (ref.startsWith('Patient/')) {
        const patientId = ref.replace('Patient/', '');
        const current = timestampMap.get(patientId);
        if (!current || recorded > current) {
          timestampMap.set(patientId, recorded);
        }
      }
    }
  }

  if (timestampMap.size === 0) {
    return null;
  }

  const top = [...timestampMap.entries()].sort((a, b) => b[1].localeCompare(a[1])).slice(0, TOP_N);
  const ids = top.map(([id]) => id);
  const patients = await medplum.searchResources('Patient', [
    ['_id', ids.join(',')],
    ['_count', String(ids.length)],
  ]);

  const patientMap = new Map<string, Patient>(patients.filter((p) => p.id).map((p) => [p.id as string, p]));

  return top
    .map(([id, lastActivityAt]) => {
      const patient = patientMap.get(id);
      return patient ? { patient, lastActivityAt } : undefined;
    })
    .filter((entry): entry is RecentPatientEntry => entry !== undefined);
}

function formatLastActivity(lastActivityAt: string): string {
  return new Date(lastActivityAt).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export interface UseRecentPatientsResult {
  entries: RecentPatientEntry[];
  loading: boolean;
  onPatientClick: (patientId: string | undefined) => void;
  formatLastActivity: (lastActivityAt: string) => string;
}

export function useRecentPatients(): UseRecentPatientsResult {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RecentPatientEntry[]>([]);
  const [loading, setLoading] = useState(!!profile);

  useEffect(() => {
    if (!profile) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const practitionerRef = getReferenceString(profile) as string;

    let active = true;
    (async (): Promise<void> => {
      const result = await loadFromAuditEvents(medplum, practitionerRef);
      if (!active) {
        return;
      }
      setEntries(result ?? []);
      setLoading(false);
    })().catch((error) => {
      if (!active) {
        return;
      }
      setEntries([]);
      setLoading(false);
      console.error(error);
    });

    return () => {
      active = false;
    };
  }, [medplum, profile]);

  const onPatientClick = useCallback(
    (patientId: string | undefined): void => {
      if (!patientId) {
        return;
      }
      navigate(`/Patient/${patientId}/case`)?.catch(console.error);
    },
    [navigate]
  );

  return {
    entries,
    loading,
    onPatientClick,
    formatLastActivity,
  };
}
