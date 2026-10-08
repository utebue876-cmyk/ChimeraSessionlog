import type { Appointment, Coverage, EpisodeOfCare, Reference, ServiceRequest } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react-hooks';
import { useEffect, useState } from 'react';
import {
  MH_CASE_CONSENT_DATE_URL,
  MH_CASE_CONSENT_SIGNED_URL,
  OPTIMA_EMPLOYER_EXTENSION_URL,
} from '../../config/chimera-urls';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';

export interface UseCaseDetailsResult {
  caseStatus: string;
  consentSigned: boolean | undefined;
  consentDateFormatted: string;
  optimaEmployerDisplay: string | null;
  optimaLocation: string | null;
  optimaFacility: string | null;
  coverage: Coverage | undefined;
  insuranceProvider: ServiceRequest['requester'];
  nextAppointmentText: string;
  practitioner: string;
}

export function useCaseDetails(episode: EpisodeOfCare, nextAppointment?: Appointment): UseCaseDetailsResult {
  const medplum = useMedplum();
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | undefined>();
  const [coverage, setCoverage] = useState<Coverage | undefined>();

  const caseStatus = getCaseStatus(episode);
  const consentSigned = episode.extension?.find((ext) => ext.url === MH_CASE_CONSENT_SIGNED_URL)?.valueBoolean;

  // Optima variables...
  const optimaExt = episode.extension?.find((ext) => ext.url === OPTIMA_EMPLOYER_EXTENSION_URL);
  const employerEntry = optimaExt?.extension?.find((e) => e.url === 'employer');
  const optimaEmployerDisplay =
    employerEntry?.valueString ??
    employerEntry?.valueReference?.display ??
    employerEntry?.valueReference?.reference?.replace('Organization/', '') ??
    null;
  const optimaLocation = optimaExt?.extension?.find((e) => e.url === 'location')?.valueString ?? null;
  const optimaFacility = optimaExt?.extension?.find((e) => e.url === 'facility')?.valueString ?? null;

  useEffect(() => {
    const referralRef = episode?.referralRequest?.[0];
    if (!referralRef) {
      setServiceRequest(undefined);
      setCoverage(undefined);
      return;
    }

    let active = true;
    medplum
      .readReference(referralRef as Reference<ServiceRequest>)
      .then((sr) => {
        if (!active) return;
        setServiceRequest(sr);
        const coverageRef = sr.insurance?.[0] as Reference<Coverage> | undefined;
        if (coverageRef) {
          return medplum.readReference(coverageRef).then((cov) => {
            if (!active) return;
            setCoverage(cov);
          });
        } else {
          setCoverage(undefined);
        }
      })
      .catch(() => {
        if (!active) return;
        setServiceRequest(undefined);
        setCoverage(undefined);
      });

    return () => {
      active = false;
    };
  }, [episode, medplum]);

  const insuranceProvider = serviceRequest?.requester;

  const consentDateValue = episode.extension?.find((ext) => ext.url === MH_CASE_CONSENT_DATE_URL)?.valueDate;

  const consentDateFormatted = consentDateValue
    ? new Date(consentDateValue).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const nextAppointmentText = nextAppointment?.start
    ? new Date(nextAppointment.start).toLocaleString(undefined, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : 'N/A';

  const practitioner =
    nextAppointment?.participant?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))?.actor?.display ?? 'N/A';

  return {
    caseStatus,
    consentSigned,
    consentDateFormatted,
    optimaEmployerDisplay,
    optimaLocation,
    optimaFacility,
    coverage,
    insuranceProvider,
    nextAppointmentText,
    practitioner,
  };
}
