import { showNotification } from '@mantine/notifications';
import { getExtension } from '@medplum/core';
import type { Coding, Condition, Coverage, InsurancePlan, Observation, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import {
  COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
  MH_DIAGNOSIS_CODE_SYSTEM_URL,
  MH_DIAGNOSIS_VALUESET_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import {
  confirmTreatmentPathway,
  findExistingCarePlan,
  findExistingTreatmentServiceRequest,
} from './confirmTreatmentPathway';

const LOINC_CODE_SYSTEM_URL = 'http://loinc.org';
const PHQ9_TOTAL_SCORE_LOINC_CODE = '44261-6';
const GAD7_TOTAL_SCORE_LOINC_CODE = '70274-6';

export interface TreatmentPathwayValues {
  primaryDiagnosis: string | null;
  secondaryDiagnosis: string | null;
  pathway: string | null;
  sessionsAuthorised: number | '';
  authorisationReference: string;
  clinicalRationale: string;
}

const INITIAL_VALUES: TreatmentPathwayValues = {
  primaryDiagnosis: null,
  secondaryDiagnosis: null,
  pathway: null,
  sessionsAuthorised: 6,
  authorisationReference: '',
  clinicalRationale: '',
};

export type TreatmentPathwayErrors = Partial<Record<keyof TreatmentPathwayValues, string>>;

function validateTreatmentPathwayValues(values: TreatmentPathwayValues): TreatmentPathwayErrors {
  const errors: TreatmentPathwayErrors = {};
  if (!values.primaryDiagnosis) errors.primaryDiagnosis = 'Required';
  if (!values.pathway) errors.pathway = 'Required';
  if (values.sessionsAuthorised === '') errors.sessionsAuthorised = 'Required';
  if (!values.clinicalRationale.trim()) errors.clinicalRationale = 'Required';
  return errors;
}

export interface UseTreatmentPathwayResult {
  values: TreatmentPathwayValues;
  errors: TreatmentPathwayErrors;
  set: <K extends keyof TreatmentPathwayValues>(field: K, value: TreatmentPathwayValues[K]) => void;
  validate: () => boolean;
  confirmPathway: () => Promise<boolean>;
  submitting: boolean;
  loading: boolean;
  diagnosisOptions: { value: string; label: string }[];
  diagnosisOptionsLoading: boolean;
  pathwayOptions: PathwayOption[];
  pathwayOptionsLoading: boolean;
  caseLabel: string;
  funderLabel: string;
  policyLabel: string;
  assessingClinicianLabel: string;
  phq9Score: number | null;
  phq9InterpretationLabel: string;
  gad7Score: number | null;
  gad7InterpretationLabel: string;
}

/** Data carried from the confirmed TreatmentPathway form into the TreatmentCareplan view. */
export interface ConfirmedTreatmentPathway {
  pathwayLabel: string;
  sessionsAuthorised: number;
  authorisationReference: string;
  startedDate: string;
  caseLabel: string;
  funderLabel: string;
}

// The coding is kept (not just value/label) so it can be copied unchanged into CarePlan.category[0].
export interface PathwayOption {
  value: string;
  label: string;
  coding: Coding;
}

function extractPathwayOptions(insurancePlan: InsurancePlan | undefined): PathwayOption[] {
  const options = new Map<string, Coding>();
  for (const coverageGroup of insurancePlan?.coverage ?? []) {
    for (const benefit of coverageGroup.benefit ?? []) {
      for (const coding of benefit.type?.coding ?? []) {
        if (coding.system === MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL && coding.code) {
          options.set(coding.code, coding);
        }
      }
    }
  }
  return Array.from(options, ([value, coding]) => ({ value, label: coding.display || value, coding }));
}

function extractDiagnosisCode(condition: Condition | undefined): string | null {
  return condition?.code?.coding?.find((c) => c.system === MH_DIAGNOSIS_CODE_SYSTEM_URL)?.code ?? null;
}

/** Picks the earliest (initial assessment) Observation matching a given LOINC code from a combined search result. */
function findEarliestObservationByCode(observations: Observation[], loincCode: string): Observation | undefined {
  return observations.find((obs) => obs.code?.coding?.some((coding) => coding.code === loincCode));
}

export function useTreatmentPathway(): UseTreatmentPathwayResult {
  const medplum = useMedplum();
  const { activeEpisode: episode, setActiveEpisode } = useActiveEpisode();
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | undefined>();
  const [coverage, setCoverage] = useState<Coverage | undefined>();
  const [values, setValues] = useState<TreatmentPathwayValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<TreatmentPathwayErrors>({});
  const [pathwayOptions, setPathwayOptions] = useState<PathwayOption[]>([]);
  const [pathwayOptionsLoading, setPathwayOptionsLoading] = useState(true);
  const [diagnosisOptions, setDiagnosisOptions] = useState<{ value: string; label: string }[]>([]);
  const [diagnosisOptionsLoading, setDiagnosisOptionsLoading] = useState(true);
  const [existingDiagnosisLoading, setExistingDiagnosisLoading] = useState(true);
  const [existingTreatmentLoading, setExistingTreatmentLoading] = useState(true);
  const [caseDetailsLoading, setCaseDetailsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phq9Observation, setPhq9Observation] = useState<Observation | undefined>();
  const [gad7Observation, setGad7Observation] = useState<Observation | undefined>();
  const [assessmentObservationsLoading, setAssessmentObservationsLoading] = useState(true);

  const insuranceProvider = serviceRequest?.requester;
  const funderLabel = insuranceProvider?.display || insuranceProvider?.reference?.replace('Organization/', '') || 'N/A';

  // Diagnosis choices come from the fixed, explicitly-enumerated MhDiagnosisVS ValueSet (not funder-specific).
  useEffect(() => {
    let active = true;
    setDiagnosisOptionsLoading(true);

    medplum
      .valueSetExpand({ url: MH_DIAGNOSIS_VALUESET_URL })
      .then((expanded) => {
        if (!active) return;
        const options = (expanded.expansion?.contains ?? [])
          .filter((item): item is { code: string; display?: string } => Boolean(item?.code))
          .map((item) => ({ value: item.code, label: item.display || item.code }));
        setDiagnosisOptions(options);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to expand MhDiagnosisVS ValueSet:', err);
        setDiagnosisOptions([]);
      })
      .finally(() => {
        if (active) setDiagnosisOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [medplum]);

  // Pre-populates the diagnosis dropdowns when the episode already has rank 1/2 diagnosis Conditions linked.
  useEffect(() => {
    const primaryRef = episode?.diagnosis?.find((d) => d.rank === 1)?.condition;
    const secondaryRef = episode?.diagnosis?.find((d) => d.rank === 2)?.condition;

    if (!primaryRef && !secondaryRef) {
      setExistingDiagnosisLoading(false);
      return;
    }

    let active = true;
    setExistingDiagnosisLoading(true);

    Promise.all([
      primaryRef ? medplum.readReference(primaryRef as Reference<Condition>) : Promise.resolve(undefined),
      secondaryRef ? medplum.readReference(secondaryRef as Reference<Condition>) : Promise.resolve(undefined),
    ])
      .then(([primaryCondition, secondaryCondition]) => {
        if (!active) return;
        setValues((prev) => ({
          ...prev,
          primaryDiagnosis: extractDiagnosisCode(primaryCondition) ?? prev.primaryDiagnosis,
          secondaryDiagnosis: extractDiagnosisCode(secondaryCondition) ?? prev.secondaryDiagnosis,
        }));
      })
      .catch((err: unknown) => {
        console.error('Failed to load existing diagnosis Conditions:', err);
      })
      .finally(() => {
        if (active) setExistingDiagnosisLoading(false);
      });

    return () => {
      active = false;
    };
  }, [episode, medplum]);

  // Loads the PHQ-9/GAD-7 total score Observations recorded during the initial assessment, found by
  // following EpisodeOfCare -> Encounter(s) -> Observation. Both are fetched via the same Encounter
  // lookup and a single combined Observation search, sorted ascending so the *earliest* (initial
  // assessment) Observation per code is picked, even if later re-assessments exist (one round-trip for both scores).
  useEffect(() => {
    if (!episode?.id) {
      setPhq9Observation(undefined);
      setGad7Observation(undefined);
      setAssessmentObservationsLoading(false);
      return;
    }

    let active = true;
    setAssessmentObservationsLoading(true);

    medplum
      .searchResources('Encounter', [
        ['_count', '1000'],
        ['episode-of-care', `EpisodeOfCare/${episode.id}`],
      ])
      .then(async (encounters) => {
        if (!active) return;
        if (encounters.length === 0) {
          setPhq9Observation(undefined);
          setGad7Observation(undefined);
          return;
        }

        const encounterRefs = encounters.map((e) => `Encounter/${e.id}`).join(',');
        const observations = await medplum.searchResources('Observation', [
          ['encounter', encounterRefs],
          [
            'code',
            `${LOINC_CODE_SYSTEM_URL}|${PHQ9_TOTAL_SCORE_LOINC_CODE},${LOINC_CODE_SYSTEM_URL}|${GAD7_TOTAL_SCORE_LOINC_CODE}`,
          ],
          ['_sort', 'date'],
        ]);
        if (!active) return;
        setPhq9Observation(findEarliestObservationByCode(observations, PHQ9_TOTAL_SCORE_LOINC_CODE));
        setGad7Observation(findEarliestObservationByCode(observations, GAD7_TOTAL_SCORE_LOINC_CODE));
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to load initial assessment Observations:', err);
        setPhq9Observation(undefined);
        setGad7Observation(undefined);
      })
      .finally(() => {
        if (active) setAssessmentObservationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [episode?.id, medplum]);

  // Pre-populates pathway/sessions/authorisation reference/clinical rationale from the existing treatment
  // ServiceRequest and CarePlan, so re-opening the form after a save shows what was previously confirmed.
  useEffect(() => {
    if (!episode) {
      setExistingTreatmentLoading(false);
      return;
    }

    let active = true;
    setExistingTreatmentLoading(true);

    Promise.all([findExistingTreatmentServiceRequest(medplum, episode), findExistingCarePlan(medplum, episode)])
      .then(([existingServiceRequest, existingCarePlan]) => {
        if (!active || !existingServiceRequest) return;

        const pathwayCode = existingCarePlan?.category
          ?.flatMap((category) => category.coding ?? [])
          .find((coding) => coding.system === MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL)?.code;
        const authorisationReference = existingServiceRequest.identifier?.find((identifier) =>
          identifier.system?.endsWith('/authorisation-reference')
        )?.value;

        setValues((prev) => ({
          ...prev,
          pathway: pathwayCode ?? prev.pathway,
          sessionsAuthorised: existingServiceRequest.quantityQuantity?.value ?? prev.sessionsAuthorised,
          authorisationReference: authorisationReference ?? prev.authorisationReference,
          clinicalRationale: existingCarePlan?.note?.[0]?.text ?? prev.clinicalRationale,
        }));
      })
      .catch((err: unknown) => {
        console.error('Failed to load existing treatment ServiceRequest/CarePlan:', err);
      })
      .finally(() => {
        if (active) setExistingTreatmentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [episode, medplum]);

  // Coverage/policy/pathway details live on the Coverage referenced by the episode's referral ServiceRequest.
  // Pathway choices are the mh-treatment-pathway benefit codings on the Coverage's linked InsurancePlan.
  useEffect(() => {
    const referralRef = episode?.referralRequest?.[0];
    if (!referralRef) {
      setServiceRequest(undefined);
      setCoverage(undefined);
      setPathwayOptions([]);
      setCaseDetailsLoading(false);
      setPathwayOptionsLoading(false);
      return;
    }

    let active = true;
    setCaseDetailsLoading(true);
    setPathwayOptionsLoading(true);
    medplum
      .readReference(referralRef as Reference<ServiceRequest>)
      .then(async (sr) => {
        if (!active) return;
        setServiceRequest(sr);
        const coverageRef = sr.insurance?.[0] as Reference<Coverage> | undefined;
        if (!coverageRef) {
          setCoverage(undefined);
          setPathwayOptions([]);
          return;
        }
        const cov = await medplum.readReference(coverageRef);
        if (!active) return;
        setCoverage(cov);

        const insurancePlanRef = getExtension(cov, COVERAGE_INSURANCE_PLAN_EXTENSION_URL)?.valueReference as
          | Reference<InsurancePlan>
          | undefined;
        if (!insurancePlanRef) {
          setPathwayOptions([]);
          return;
        }
        const insurancePlan = await medplum.readReference(insurancePlanRef);
        if (!active) return;
        setPathwayOptions(extractPathwayOptions(insurancePlan));
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to load coverage/insurance plan details:', err);
        setServiceRequest(undefined);
        setCoverage(undefined);
        setPathwayOptions([]);
      })
      .finally(() => {
        if (active) {
          setCaseDetailsLoading(false);
          setPathwayOptionsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [episode, medplum]);

  const set = <K extends keyof TreatmentPathwayValues>(field: K, value: TreatmentPathwayValues[K]): void => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validate = (): boolean => {
    const validationErrors = validateTreatmentPathwayValues(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showNotification({
        color: 'red',
        message: 'Please complete all mandatory fields before confirming the pathway.',
        autoClose: false,
      });
      return false;
    }
    return true;
  };

  const confirmPathway = async (): Promise<boolean> => {
    if (!validate()) return false;
    if (!episode) return false;

    setSubmitting(true);
    try {
      const updatedEpisode = await confirmTreatmentPathway(medplum, episode, values, diagnosisOptions, pathwayOptions);
      setActiveEpisode(updatedEpisode);
      return true;
    } catch (err) {
      console.error('Failed to save treatment pathway:', err);
      showNotification({ color: 'red', message: 'Failed to save the treatment pathway.', autoClose: false });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    values,
    errors,
    set,
    validate,
    confirmPathway,
    submitting,
    loading:
      pathwayOptionsLoading ||
      diagnosisOptionsLoading ||
      existingDiagnosisLoading ||
      existingTreatmentLoading ||
      caseDetailsLoading ||
      assessmentObservationsLoading,
    diagnosisOptions,
    diagnosisOptionsLoading,
    pathwayOptions,
    pathwayOptionsLoading,
    caseLabel: episode?.identifier?.[0]?.value || episode?.id || 'N/A',
    funderLabel,
    policyLabel: coverage?.subscriberId ?? 'N/A',
    assessingClinicianLabel: episode?.careManager?.display ?? 'N/A',
    phq9Score: phq9Observation?.valueInteger ?? null,
    phq9InterpretationLabel: phq9Observation?.interpretation?.[0]?.text ?? 'N/A',
    gad7Score: gad7Observation?.valueInteger ?? null,
    gad7InterpretationLabel: gad7Observation?.interpretation?.[0]?.text ?? 'N/A',
  };
}
