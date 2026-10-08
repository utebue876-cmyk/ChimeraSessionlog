import { Group, LoadingOverlay, Title } from '@mantine/core';
import type { JSX } from 'react';
import { DocumentForm } from '../../components/document/DocumentForm';
import { AppModal } from '../../components/modal/AppModal';
import { useEditDocumentModal } from './useEditDocumentModal';

interface EditDocumentModalProps {
  readonly opened: boolean;
  readonly documentId: string | undefined;
  readonly onClose: () => void;
}

export function EditDocumentModal({ opened, documentId, onClose }: EditDocumentModalProps): JSX.Element {
  const {
    initialDocument,
    loadingDocument,
    file,
    setFile,
    description,
    setDescription,
    documentType: _documentType,
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
  } = useEditDocumentModal({ documentId, onClose });

  const existingFileName =
    initialDocument?.content?.[0]?.attachment?.title ??
    initialDocument?.content?.[0]?.attachment?.url?.split('/').pop();

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <Title order={4} c="white">
            Edit Document
          </Title>
        </Group>
      }
      size="md"
      pos="relative"
    >
      <LoadingOverlay visible={loadingDocument} />
      {!loadingDocument && (
        <DocumentForm
          mode="edit"
          file={file}
          setFile={setFile}
          description={description}
          setDescription={setDescription}
          documentTypeDefaultValue={initialDocument?.type}
          setDocumentType={setDocumentType}
          status={status}
          setStatus={setStatus}
          docStatus={docStatus}
          setDocStatus={setDocStatus}
          isLoading={isLoading}
          resetRef={resetRef}
          fieldErrors={fieldErrors}
          existingFileName={existingFileName}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          handleDelete={handleDelete}
        />
      )}
    </AppModal>
  );
}
