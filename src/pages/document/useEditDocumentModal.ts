import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { CodeableConcept, DocumentReference } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import type { FieldErrors } from '../../hooks/useFieldErrors';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { DocumentFormField } from '../../types/document';
import { recordPatientActivity } from '../../utils/patientActivity';

export interface UseEditDocumentModalReturn {
  initialDocument: DocumentReference | undefined;
  loadingDocument: boolean;
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
  fieldErrors: FieldErrors<DocumentFormField>;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
  handleDelete: () => Promise<void>;
}

export function useEditDocumentModal({
  documentId,
  onClose,
}: {
  documentId: string | undefined;
  onClose: () => void;
}): UseEditDocumentModalReturn {
  const medplum = useMedplum();
  const { patientId } = useParams();
  const { fieldErrors, setFieldErrors, clearFieldError } = useFieldErrors<DocumentFormField>();
  const [initialDocument, setInitialDocument] = useState<DocumentReference | undefined>();
  const [loadingDocument, setLoadingDocument] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescriptionRaw] = useState('');
  const [documentType, setDocumentTypeRaw] = useState<CodeableConcept | undefined>();
  const [status, setStatusRaw] = useState<DocumentReference['status']>('current');
  const [docStatus, setDocStatusRaw] = useState<DocumentReference['docStatus'] | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    if (!documentId) {
      return;
    }
    setLoadingDocument(true);
    medplum
      .readResource('DocumentReference', documentId)
      .then((doc) => {
        setInitialDocument(doc);
        setDescriptionRaw(doc.description ?? '');
        setDocumentTypeRaw(doc.type);
        setStatusRaw(doc.status ?? 'current');
        setDocStatusRaw(doc.docStatus);
      })
      .catch((err) => {
        showNotification({ color: 'red', title: 'Error loading document', message: normalizeErrorString(err) });
      })
      .finally(() => {
        setLoadingDocument(false);
      });
  }, [medplum, documentId]);

  const handleSubmit = async (): Promise<void> => {
    const errors: FieldErrors<DocumentFormField> = {};
    if (!description) errors.description = 'Required';
    if (!documentType) errors.type = 'Required';
    if (!status) errors.status = 'Required';
    if (!docStatus) errors.docStatus = 'Required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (!initialDocument) {
      return;
    }

    setIsLoading(true);
    try {
      let content = initialDocument.content;

      if (file) {
        const attachment = await medplum.createAttachment({
          data: file,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        });
        content = [{ attachment }];
      }

      const updated: DocumentReference = {
        ...initialDocument,
        status: status ?? 'current',
        docStatus: docStatus ?? undefined,
        description: description || undefined,
        type: documentType,
        content,
      };

      await medplum.updateResource(updated);
      recordPatientActivity(medplum, patientId);
      showNotification({ title: 'Success', message: 'Document updated' });
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

  const handleDelete = async (): Promise<void> => {
    if (!initialDocument?.id) {
      return;
    }
    setIsLoading(true);
    try {
      await medplum.deleteResource('DocumentReference', initialDocument.id);
      recordPatientActivity(medplum, patientId);
      showNotification({ title: 'Deleted', message: 'Document deleted' });
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: normalizeErrorString(err) });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initialDocument,
    loadingDocument,
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
    fieldErrors,
    handleSubmit,
    handleCancel,
    handleDelete,
  };
}
