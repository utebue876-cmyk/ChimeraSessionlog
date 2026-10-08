import { Button, FileButton, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import type { CodeableConcept, DocumentReference } from '@medplum/fhirtypes';
import { CodeableConceptInput, CodeInput } from '@medplum/react';
import { IconUpload } from '@tabler/icons-react';
import type React from 'react';
import type { JSX } from 'react';
import { useState } from 'react';
import type { FieldErrors } from '../../hooks/useFieldErrors';
import type { DocumentFormField } from '../../types/document';
import { AppModal } from '../modal/AppModal';

export interface DocumentFormProps {
  readonly mode: 'create' | 'edit';
  readonly file: File | null;
  readonly setFile: (f: File | null) => void;
  readonly description: string;
  readonly setDescription: (v: string) => void;
  readonly documentTypeDefaultValue: CodeableConcept | undefined;
  readonly setDocumentType: (v: CodeableConcept | undefined) => void;
  readonly status: DocumentReference['status'];
  readonly setStatus: (v: DocumentReference['status']) => void;
  readonly docStatus: DocumentReference['docStatus'] | undefined;
  readonly setDocStatus: (v: DocumentReference['docStatus'] | undefined) => void;
  readonly isLoading: boolean;
  readonly resetRef: React.RefObject<(() => void) | null>;
  readonly fieldErrors: FieldErrors<DocumentFormField>;
  readonly activeEpisodeLabel?: string;
  readonly existingFileName?: string;
  readonly handleSubmit: () => Promise<void>;
  readonly handleCancel: () => void;
  readonly handleDelete?: () => Promise<void>;
}

export function DocumentForm({
  mode,
  file,
  setFile,
  description,
  setDescription,
  documentTypeDefaultValue,
  setDocumentType,
  status,
  setStatus,
  docStatus,
  setDocStatus,
  isLoading,
  resetRef,
  fieldErrors,
  activeEpisodeLabel: _activeEpisodeLabel,
  existingFileName,
  handleSubmit,
  handleCancel,
  handleDelete,
}: DocumentFormProps): JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCreate = mode === 'create';

  return (
    <Paper>
      <Stack gap="sm" mt="sm">
        <TextInput
          label="Description"
          placeholder="Enter a description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          required
          error={!!fieldErrors.description}
        />

        <div className={fieldErrors.type ? 'input-error-highlight' : undefined}>
          <CodeableConceptInput
            name="type"
            label="Type"
            binding="http://hl7.org/fhir/ValueSet/c80-doc-typecodes"
            path="DocumentReference.type"
            creatable={true}
            defaultValue={documentTypeDefaultValue}
            onChange={setDocumentType}
            outcome={undefined}
            required
          />
        </div>

        <div className={fieldErrors.status ? 'input-error-highlight' : undefined}>
          <CodeInput
            name="status"
            label="Status"
            binding="http://hl7.org/fhir/ValueSet/document-reference-status"
            defaultValue={status}
            onChange={(val) => setStatus((val as DocumentReference['status']) ?? 'current')}
            required
          />
        </div>

        <div className={fieldErrors.docStatus ? 'input-error-highlight' : undefined}>
          <CodeInput
            name="docStatus"
            label="Doc Status"
            binding="http://hl7.org/fhir/ValueSet/composition-status"
            defaultValue={docStatus}
            onChange={(val) => setDocStatus((val as DocumentReference['docStatus']) ?? undefined)}
            required
          />
        </div>

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            File {isCreate && <span style={{ color: 'red' }}>*</span>}
          </Text>
          {existingFileName && !file && (
            <Text size="xs" c="dimmed">
              Current: {existingFileName}
            </Text>
          )}
          <FileButton resetRef={resetRef} onChange={setFile}>
            {(props) => (
              <Button
                {...props}
                variant="outline"
                color={fieldErrors.file ? 'red' : undefined}
                leftSection={<IconUpload size={16} />}
                w="fit-content"
              >
                {file ? file.name : isCreate ? 'Choose file' : 'Replace file'}
              </Button>
            )}
          </FileButton>
          {file && (
            <Text size="xs" c="dimmed">
              {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}
            </Text>
          )}
          {fieldErrors.file && (
            <Text size="xs" c="red">
              {fieldErrors.file}
            </Text>
          )}
        </Stack>

        <Group mt="sm" justify={handleDelete ? 'space-between' : 'flex-start'}>
          <Group>
            <Button onClick={handleSubmit} loading={isLoading}>
              {isCreate ? 'Upload' : 'Save'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          </Group>
          {handleDelete && (
            <Button color="red" onClick={() => setConfirmDelete(true)} disabled={isLoading}>
              Delete
            </Button>
          )}
        </Group>

        {handleDelete && (
          <AppModal
            opened={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title={
              <Group>
                <Title order={4} c="white">
                  Delete Document
                </Title>
              </Group>
            }
            centered
            size="23%"
          >
            <Text size="sm" mt="sm">
              Are you sure you want to delete this document? This cannot be undone.
            </Text>
            <Group mt="md" justify="flex-end">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                color="red"
                loading={isLoading}
                onClick={async () => {
                  setConfirmDelete(false);
                  await handleDelete();
                }}
              >
                Delete
              </Button>
            </Group>
          </AppModal>
        )}
      </Stack>
    </Paper>
  );
}
