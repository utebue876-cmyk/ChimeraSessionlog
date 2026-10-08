import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { MH_CLOSURE_REASON_VALUESET_URL } from '../../config/chimera-urls';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import { loadAuthorisedServices, loadCarePlanPathway, type AuthorisedServiceRow } from './treatmentEntitlements';
import type { ConfirmedTreatmentPathway } from './useTreatmentPathway';

export type { AuthorisedServiceRow } from './treatmentEntitlements';

export type SessionOutcome = 'attended' | 'dna' | 'late-cancelled' | 'cancelled-in-notice' | 'cancelled-by-clinician';

export interface SessionLogRow {
  id: string;
  date: string;
  service: string;
  outcome: SessionOutcome | null;
}

export const OUTCOME_OPTIONS: { value: SessionOutcome; label: string }[] = [
  { value: 'attended', label: 'Attended' },
  { value: 'dna', label: 'DNA' },
  { value: 'late-cancelled', label: 'Cancelled (late)' },
  { value: 'cancelled-in-notice', label: 'Cancelled (in notice)' },
  { value: 'cancelled-by-clinician', label: 'Cancelled (by clinician)' },
];

// Cancellations inside the notice period do not count towards the authorised session usage...
const COUNTED_OUTCOMES: SessionOutcome[] = ['attended', 'dna', 'late-cancelled'];

// Session rows are unscheduled (blank date, no outcome) until a clinician fills them in; show up to 3
// initially, capped at the number of sessions authorised on the pathway...
const INITIAL_SESSION_ROWS = 3;

function buildInitialSessionLog(sessionsAuthorised: number, service: string): SessionLogRow[] {
  const rowCount = Math.min(INITIAL_SESSION_ROWS, sessionsAuthorised);
  return Array.from({ length: rowCount }, (_, index) => ({
    id: String(index + 1),
    date: '',
    service,
    outcome: null,
  }));
}

function formatUkDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString('en-GB');
}

export interface UseTreatmentCareplanResult {
  pathwayLabel: string;
  sessionsAuthorised: number;
  authorisationReference: string;
  caseLabel: string;
  funderLabel: string;
  startedDate: string;
  authorisedServices: AuthorisedServiceRow[];
  authorisedServicesLoading: boolean;
  authorisedServicesError: string | undefined;
  sessionLog: SessionLogRow[];
  outcomeOptions: { value: SessionOutcome; label: string }[];
  setSessionOutcome: (id: string, outcome: SessionOutcome) => void;
  setSessionDate: (id: string, date: string) => void;
  countsTowardsAuthorisation: (outcome: SessionOutcome | null) => boolean;
  addSession: () => void;
  saveSessions: () => void;
  canAddSession: boolean;
  closureReasonOptions: { value: string; label: string }[];
  closureReasonOptionsLoading: boolean;
  closureReason: string | null;
  setClosureReason: (value: string | null) => void;
}

export function useTreatmentCareplan(confirmedPathway: ConfirmedTreatmentPathway): UseTreatmentCareplanResult {
  const medplum = useMedplum();
  const { activeEpisode: episode } = useActiveEpisode();
  const [services, setServices] = useState<{
    episode: EpisodeOfCare | undefined;
    pathwayLabel: string;
    rows: AuthorisedServiceRow[];
    error?: string;
  }>();
  const currentServices = services?.episode === episode ? services : undefined;
  const pathwayLabel = currentServices?.pathwayLabel ?? '';
  const [sessionLog, setSessionLog] = useState<SessionLogRow[]>(() =>
    buildInitialSessionLog(confirmedPathway.sessionsAuthorised, '')
  );
  const [closureReasonOptions, setClosureReasonOptions] = useState<{ value: string; label: string }[]>([]);
  const [closureReasonOptionsLoading, setClosureReasonOptionsLoading] = useState(true);
  const [closureReason, setClosureReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setServices(undefined);
    const load = async (): Promise<void> => {
      let label = '';
      try {
        if (!episode) throw new Error('No active EpisodeOfCare');
        const pathway = await loadCarePlanPathway(medplum, episode);
        label = pathway.label;
        if (active) setSessionLog((rows) => rows.map((row) => ({ ...row, service: label })));
        const rows = await loadAuthorisedServices(medplum, episode, pathway.coding, label);
        if (active) setServices({ episode, pathwayLabel: label, rows });
      } catch (err) {
        if (active) {
          setServices({
            episode,
            pathwayLabel: label,
            rows: [],
            error: `Authorised services unavailable: ${err instanceof Error ? err.message : 'FHIR lookup failed'}`,
          });
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [episode, medplum, confirmedPathway.pathwayLabel]);

  // Closure reasons come from the fixed, explicitly-enumerated MhClosureReason ValueSet...
  useEffect(() => {
    let active = true;
    setClosureReasonOptionsLoading(true);

    medplum
      .valueSetExpand({ url: MH_CLOSURE_REASON_VALUESET_URL })
      .then((expanded) => {
        if (!active) return;
        const options = (expanded.expansion?.contains ?? [])
          .filter((item): item is { code: string; display?: string } => Boolean(item?.code))
          .map((item) => ({ value: item.code, label: item.display || item.code }));
        setClosureReasonOptions(options);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to expand MhClosureReason ValueSet:', err);
        setClosureReasonOptions([]);
      })
      .finally(() => {
        if (active) setClosureReasonOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [medplum]);

  const setSessionOutcome = (id: string, outcome: SessionOutcome): void => {
    setSessionLog((prev) => prev.map((row) => (row.id === id ? { ...row, outcome } : row)));
  };

  const setSessionDate = (id: string, date: string): void => {
    setSessionLog((prev) => prev.map((row) => (row.id === id ? { ...row, date } : row)));
  };

  const canAddSession = sessionLog.length < confirmedPathway.sessionsAuthorised;

  const addSession = (): void => {
    if (!canAddSession) return;
    setSessionLog((prev) => {
      if (prev.length >= confirmedPathway.sessionsAuthorised) return prev;
      const nextId = String(prev.length + 1);
      return [...prev, { id: nextId, date: '', service: pathwayLabel, outcome: null }];
    });
  };

  const saveSessions = (): void => {
    // Implement the logic to save sessions here...
    console.log('Saving sessions:', sessionLog);
  };

  return {
    pathwayLabel,
    sessionsAuthorised: confirmedPathway.sessionsAuthorised,
    authorisationReference: confirmedPathway.authorisationReference,
    caseLabel: confirmedPathway.caseLabel,
    funderLabel: confirmedPathway.funderLabel,
    startedDate: formatUkDate(confirmedPathway.startedDate),
    authorisedServices: currentServices?.rows ?? [],
    authorisedServicesLoading: !currentServices,
    authorisedServicesError: currentServices?.error,
    sessionLog: sessionLog.map((row) => ({ ...row, service: pathwayLabel })),
    outcomeOptions: OUTCOME_OPTIONS,
    setSessionOutcome,
    setSessionDate,
    countsTowardsAuthorisation: (outcome) => outcome !== null && COUNTED_OUTCOMES.includes(outcome),
    addSession,
    saveSessions,
    canAddSession,
    closureReasonOptions,
    closureReasonOptionsLoading,
    closureReason,
    setClosureReason,
  };
}
