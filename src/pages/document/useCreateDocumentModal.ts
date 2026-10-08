import { showNotification } from '@mantine/notifications';
import { createReference, formatHumanName, isResource, normalizeErrorString } from '@medplum/core';
import type { CodeableConcept, DocumentReference, Practitioner } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import type { FieldErrors } from '../../hooks/useFieldErrors';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { usePatient } from '../../hooks/usePatient';
import type { DocumentFormField } from '../../types/document';
import { recordPatientActivity } from '../../utils/patientActivity';

export interface UseCreateDocumentModalReturn {
  file: File | null;
  setFile: (file: File | null) => void;
  description: string;
  setDescription: (value: string) => void;
  documentType: CodeableConcept | undefined;
  setDocumentType: (value: CodeableConcept | undefined) => void;
  status: DocumentReference['status'];
  setStatus: (value: DocumentReference['status']) => void;
  docStatus: DocumentReference['docStatus'] | undefined;
  setDocStatus: (value: DocumentReference['docStatus'] | undefined) => void;
  isLoading: boolean;
  resetRef: React.RefObject<(() => void) | null>;
  authorDisplay: string | undefined;
  activeEpisodeLabel: string | undefined;
  fieldErrors: FieldErrors<DocumentFormField>;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
}

export function useCreateDocumentModal({ onClose }: { onClose: () => void }): UseCreateDocumentModalReturn {
  const medplum = useMedplum();
  const { patientId } = useParams();
  const patient = usePatient();
  const { activeEpisode } = useActiveEpisode();
  const { fieldErrors, setFieldErrors, clearFieldError } = useFieldErrors<DocumentFormField>();
  const [file, setFileRaw] = useState<File | null>(null);
  const [description, setDescriptionRaw] = useState('');
  const [documentType, setDocumentTypeRaw] = useState<CodeableConcept | undefined>();
  const [status, setStatusRaw] = useState<DocumentReference['status']>('current');
  const [docStatus, setDocStatusRaw] = useState<DocumentReference['docStatus'] | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);

  const setFile = useCallback(
    (file: File | null) => {
      clearFieldError('file');
      setFileRaw(file);
    },
    [clearFieldError]
  );
  const setDescription = useCallback(
    (val: string) => {
      clearFieldError('description');
      setDescriptionRaw(val);
    },
    [clearFieldError]
  );
  const setDocumentType = useCallback(
    (val: CodeableConcept | undefined) => {
      clearFieldError('type');
      setDocumentTypeRaw(val);
    },
    [clearFieldError]
  );
  const setStatus = useCallback(
    (val: DocumentReference['status']) => {
      clearFieldError('status');
      setStatusRaw(val);
    },
    [clearFieldError]
  );
  const setDocStatus = useCallback(
    (val: DocumentReference['docStatus'] | undefined) => {
      clearFieldError('docStatus');
      setDocStatusRaw(val);
    },
    [clearFieldError]
  );

  const profile = medplum.getProfile();
  const practitioner = isResource<Practitioner>(profile, 'Practitioner') ? profile : undefined;
  const authorDisplay = practitioner?.name?.[0] ? formatHumanName(practitioner.name[0]) : undefined;
  const activeEpisodeLabel = activeEpisode ? (activeEpisode.identifier?.[0]?.value ?? activeEpisode.id) : undefined;

  const handleSubmit = async (): Promise<void> => {
    const errors: FieldErrors<DocumentFormField> = {};
    if (!description) errors.description = 'Required';
    if (!documentType) errors.type = 'Required';
    if (!status) errors.status = 'Required';
    if (!docStatus) errors.docStatus = 'Required';
    if (!file) errors.file = 'A file is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!patient) {
      return;
    }

    if (!file) {
      return;
    }

    setIsLoading(true);
    try {
      const attachment = await medplum.createAttachment({
        data: file,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });

      const docRef: DocumentReference = {
        resourceType: 'DocumentReference',
        status: status ?? 'current',
        ...(docStatus ? { docStatus } : {}),
        ...(description ? { description } : {}),
        ...(documentType ? { type: documentType } : {}),
        date: new Date().toISOString(),
        subject: createReference(patient),
        ...(practitioner
          ? {
              author: [
                {
                  reference: `Practitioner/${practitioner.id}`,
                  display: authorDisplay,
                },
              ],
            }
          : {}),
        context: {
          ...(activeEpisode ? { encounter: [createReference(activeEpisode)] } : {}),
        },
        content: [{ attachment }],
      };

      await medplum.createResource(docRef);
      recordPatientActivity(medplum, patientId);
      showNotification({ title: 'Success', message: 'Document uploaded' });
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: normalizeErrorString(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (): void => {
    onClose();
  };

  return {
    file,
    setFile,
    description,
    setDescription,
    documentType,
    setDocumentType,
    status,
    setStatus,
    docStatus,
    setDocStatus,
    isLoading,
    resetRef,
    authorDisplay,
    activeEpisodeLabel,
    fieldErrors,
    handleSubmit,
    handleCancel,
  };
}
