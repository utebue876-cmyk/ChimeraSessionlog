import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { Attachment, Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  applyPatientEditValues,
  extractPatientEditValues,
  PATIENT_EDIT_INITIAL_VALUES,
  validatePatientEditForm,
  type PatientEditFormErrors,
  type PatientEditFormValues,
} from './patientEditSchema';

export interface UseEditPatientPageResult {
  patient: Patient | undefined;
  previewPatient: Patient | undefined;
  values: PatientEditFormValues;
  errors: PatientEditFormErrors;
  set: <K extends keyof PatientEditFormValues>(field: K, value: PatientEditFormValues[K]) => void;
  onPhotoChange: (file: File | null) => Promise<void>;
  onDeletePhoto: () => void;
  loading: boolean;
  submitting: boolean;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
}

export function useEditPatientPage(): UseEditPatientPageResult {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const { patientId } = useParams() as { patientId: string };

  const [patient, setPatient] = useState<Patient | undefined>();
  const [values, setValues] = useState<PatientEditFormValues>(PATIENT_EDIT_INITIAL_VALUES);
  const [errors, setErrors] = useState<PatientEditFormErrors>({});
  const [photoAttachment, setPhotoAttachment] = useState<Attachment | undefined>();
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    medplum
      .readResource('Patient', patientId)
      .then((loadedPatient) => {
        if (!active) return;
        setPatient(loadedPatient);
        setValues(extractPatientEditValues(loadedPatient));
        setPhotoAttachment(loadedPatient.photo?.[0]);
        setPhotoRemoved(false);
      })
      .catch((err: unknown) => {
        showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [medplum, patientId]);

  // Reflects the in-progress photo selection so <ResourceAvatar> updates before the patient is saved.
  const previewPatient = useMemo<Patient | undefined>(() => {
    if (!patient) return undefined;
    if (photoRemoved) return { ...patient, photo: undefined };
    return photoAttachment ? { ...patient, photo: [photoAttachment] } : patient;
  }, [patient, photoAttachment, photoRemoved]);

  const onPhotoChange = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }
      try {
        // ResourceAvatar only renders Attachment.url, so the photo must be uploaded as a Binary rather than inlined as base64 data.
        const attachment = await medplum.createAttachment({
          data: file,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        });
        setPhotoAttachment(attachment);
        setPhotoRemoved(false);
      } catch (err) {
        showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
      }
    },
    [medplum]
  );

  const onDeletePhoto = useCallback(() => {
    setPhotoAttachment(undefined);
    setPhotoRemoved(true);
  }, []);

  const set = useCallback(<K extends keyof PatientEditFormValues>(field: K, value: PatientEditFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!patient) {
      return;
    }

    const validationErrors = validatePatientEditForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showNotification({ color: 'red', message: 'Please fill in all required fields.', autoClose: false });
      return;
    }

    setSubmitting(true);
    try {
      const photo = photoRemoved ? null : photoAttachment;
      const updatedPatient = await medplum.updateResource(applyPatientEditValues(patient, values, photo));
      setPatient(updatedPatient);
      showNotification({ color: 'green', message: 'Patient details updated.' });
      navigate(`/Patient/${patientId}`)?.catch(console.error);
    } catch (err) {
      showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
    } finally {
      setSubmitting(false);
    }
  }, [patient, values, photoAttachment, photoRemoved, medplum, navigate, patientId]);

  const handleCancel = useCallback(() => {
    navigate(`/Patient/${patientId}`)?.catch(console.error);
  }, [navigate, patientId]);

  return {
    patient,
    previewPatient,
    values,
    errors,
    set,
    onPhotoChange,
    onDeletePhoto,
    loading,
    submitting,
    handleSubmit,
    handleCancel,
  };
}
