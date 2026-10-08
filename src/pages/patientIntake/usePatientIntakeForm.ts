import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { getCurrentOrganisationName } from '../../config/projectOrganization';
import { useServiceTypeOptions } from '../../hooks/useServiceTypeOptions';
import { getPatientIntakeQuestionnaire } from '../../questionnaires/patientIntakeQuestionnaire';
import { onboardPatient, searchForMatchingPatients } from '../../utils/intakeForm';
import type { PatientIntakeFormErrors, PatientIntakeFormValues } from './patientIntakeSchema';
import {
  buildPatientIntakeResponse,
  PATIENT_INTAKE_INITIAL_VALUES,
  validatePatientIntakeForm,
} from './patientIntakeSchema';

const TREATMENT_ONLY_CODE = 'treatment-only';

export interface UsePatientIntakeFormResult {
  values: PatientIntakeFormValues;
  errors: PatientIntakeFormErrors;
  set: <K extends keyof PatientIntakeFormValues>(field: K, value: PatientIntakeFormValues[K]) => void;
  serviceTypeOptions: { value: string; label: string }[];
  serviceTypeLoading: boolean;
  submitting: boolean;
  matchingPatients: Patient[];
  handleSubmit: () => Promise<void>;
  handleOpenMatchingPatient: (patientId: string | undefined) => void;
  handleDismissMatchingPatients: () => void;
}

export function usePatientIntakeForm(): UsePatientIntakeFormResult {
  const medplum = useMedplum();
  const navigate = useNavigate();

  const [values, setValues] = useState<PatientIntakeFormValues>(PATIENT_INTAKE_INITIAL_VALUES);
  const [errors, setErrors] = useState<PatientIntakeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [matchingPatients, setMatchingPatients] = useState<Patient[]>([]);
  const currentOrganizationName = getCurrentOrganisationName(medplum);
  const submissionKeyRef = useRef<string | null>(null);

  // Derive org name from the selected reference display for service type filtering
  const insuranceOrgName =
    (values.insuranceProviderRef as (typeof values.insuranceProviderRef & { display?: string }) | null)?.display ?? '';

  const { serviceTypeOptions, loading: serviceTypeLoading } = useServiceTypeOptions(insuranceOrgName);

  const set = useCallback(<K extends keyof PatientIntakeFormValues>(field: K, value: PatientIntakeFormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // Reset service type when insurance provider changes
      if (field === 'insuranceProviderRef') {
        next.serviceTypeCode = '';
        next.serviceTypeDisplay = '';
        next.optimaEmployerRef = null;
        next.optimaLocation = '';
        next.optimaFacility = '';
        next.insurancePlanRef = null;
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate — block Vitality + treatment-only combination
    if (insuranceOrgName.toLowerCase().includes('vitality') && values.serviceTypeCode === TREATMENT_ONLY_CODE) {
      showNotification({ color: 'yellow', message: 'Vitality Health only allows Psychologist Only as Referral Type.' });
      return;
    }

    const validationErrors = validatePatientIntakeForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const message =
        validationErrors.dob && validationErrors.dob !== 'Required'
          ? 'Please enter a valid Date of Birth.'
          : 'Please fill in all required fields.';
      showNotification({ color: 'red', message, autoClose: false });
      return;
    }

    setSubmitting(true);
    try {
      const response = buildPatientIntakeResponse(values);

      // Duplicate patient check
      const duplicates = await searchForMatchingPatients(medplum, response);
      if (duplicates.length > 0) {
        setMatchingPatients(duplicates);
        return;
      }
      submissionKeyRef.current ??= crypto.randomUUID();
      const patient = await onboardPatient(
        medplum,
        getPatientIntakeQuestionnaire(currentOrganizationName),
        response,
        submissionKeyRef.current
      );
      navigate(`/Patient/${patient.id}/case`)?.catch(console.error);
    } catch (err) {
      showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
    } finally {
      setSubmitting(false);
    }
  }, [medplum, navigate, values, insuranceOrgName, currentOrganizationName]);

  const handleOpenMatchingPatient = useCallback(
    (patientId: string | undefined) => {
      if (!patientId) return;
      setMatchingPatients([]);
      navigate(`/Patient/${patientId}/case`)?.catch(console.error);
    },
    [navigate]
  );

  const handleDismissMatchingPatients = useCallback(() => setMatchingPatients([]), []);

  return {
    values,
    errors,
    set,
    serviceTypeOptions,
    serviceTypeLoading,
    submitting,
    matchingPatients,
    handleSubmit,
    handleOpenMatchingPatient,
    handleDismissMatchingPatients,
  };
}
