import { Group, Title } from '@mantine/core';
import type { JSX } from 'react';
import { DocumentForm } from '../../components/document/DocumentForm';
import { AppModal } from '../../components/modal/AppModal';
import { useCreateDocumentModal } from './useCreateDocumentModal';

interface CreateDocumentModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function CreateDocumentModal({ opened, onClose }: CreateDocumentModalProps): JSX.Element {
  const {
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
    activeEpisodeLabel,
    fieldErrors,
    handleSubmit,
    handleCancel,
  } = useCreateDocumentModal({ onClose });

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <Title order={4} c="white">
            New Document
          </Title>
        </Group>
      }
      size="md"
    >
      <DocumentForm
        mode="create"
        file={file}
        setFile={setFile}
        description={description}
        setDescription={setDescription}
        documentTypeDefaultValue={documentType}
        setDocumentType={setDocumentType}
        status={status}
        setStatus={setStatus}
        docStatus={docStatus}
        setDocStatus={setDocStatus}
        isLoading={isLoading}
        resetRef={resetRef}
        fieldErrors={fieldErrors}
        activeEpisodeLabel={activeEpisodeLabel}
        handleSubmit={handleSubmit}
        handleCancel={handleCancel}
      />
    </AppModal>
  );
}
