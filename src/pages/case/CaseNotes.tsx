import { ActionIcon, Button, Group, Pagination, Paper, Stack, Text, Textarea, Title, Tooltip } from '@mantine/core';
import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { IconNote, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { JSX } from 'react';
import { AppModal } from '../../components/modal/AppModal';
import { type CaseNote, useCaseNotes } from './useCaseNotes';

interface NoteRowProps {
  note: CaseNote;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function NoteRow({ note, onView, onEdit, onDelete }: NoteRowProps): JSX.Element {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {note.lastUpdated ? new Date(note.lastUpdated).toLocaleString() : 'No date'}
          {note.author ? ` - ${note.author}` : ''}
        </Text>
        <Text size="sm" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {note.text}
        </Text>
      </Stack>
      <Group gap={4} wrap="nowrap">
        <Tooltip label="View full note">
          <ActionIcon
            variant="subtle"
            size="sm"
            color="var(--mantine-color-blue-6)"
            onClick={onView}
            aria-label="View full note"
          >
            <IconNote size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Edit">
          <ActionIcon
            variant="subtle"
            size="sm"
            color="var(--mantine-color-blue-6)"
            onClick={onEdit}
            aria-label="Edit note"
          >
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon
            variant="subtle"
            color="var(--mantine-color-blue-6)"
            size="sm"
            onClick={onDelete}
            aria-label="Delete note"
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

interface CaseNotesProps {
  episode: EpisodeOfCare;
  onUpdated: (updated: EpisodeOfCare) => void;
}

export function CaseNotes({ episode, onUpdated }: CaseNotesProps): JSX.Element {
  const {
    notes,
    pagedNotes,
    totalPages,
    currentPage,
    setCurrentPage,
    noteText,
    setNoteText,
    saving,
    editingNote,
    viewingNote,
    setViewingNote,
    modalOpened,
    deleteConfirmOpened,
    viewOpened,
    openNew,
    openEdit,
    handleClose,
    handleSave,
    requestDelete,
    handleDelete,
    openView,
    closeView,
    closeDeleteConfirm,
  } = useCaseNotes(episode, onUpdated);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 8 }}>
        <Group justify="space-between" align="center" mb="md">
          <Text fw={500}>Case Notes ({notes.length})</Text>
          <Tooltip label="Add note">
            <ActionIcon variant="subtle" onClick={openNew} aria-label="Add note" color="var(--mantine-color-blue-6)">
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <div style={{ flex: 1, minHeight: 0 }}>
          {notes.length === 0 ? (
            <Text size="sm" c="dimmed">
              No notes yet.
            </Text>
          ) : (
            <Stack gap={2}>
              {pagedNotes.map((note, i) => {
                const r = 'var(--mantine-radius-md)';
                const tl = i === 0 ? r : '0';
                const br = i === pagedNotes.length - 1 ? r : '0';
                return (
                  <Paper
                    key={note.index}
                    withBorder
                    p="xs"
                    radius={0}
                    shadow="none"
                    m={-5}
                    style={{ borderRadius: `${tl} ${tl} ${br} ${br}` }}
                  >
                    <NoteRow
                      note={note}
                      onView={() => {
                        setViewingNote(note);
                        openView();
                      }}
                      onEdit={() => openEdit(note)}
                      onDelete={() => requestDelete(note.index)}
                    />
                  </Paper>
                );
              })}
            </Stack>
          )}
        </div>

        {totalPages > 1 && (
          <Group justify="center" pt="xs">
            <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} size="sm" />
          </Group>
        )}
      </div>

      <AppModal
        opened={viewOpened}
        onClose={closeView}
        title={
          <Stack gap={2}>
            <Title order={4} c="white">
              Note
            </Title>
            <Text size="sm" c="blue.1">
              {viewingNote?.lastUpdated ? new Date(viewingNote.lastUpdated).toLocaleString('en-GB') : 'No date'}
              {viewingNote?.author ? ` - ${viewingNote.author}` : ''}
            </Text>
          </Stack>
        }
      >
        <Stack mt="sm">
          {viewingNote && (
            <>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {viewingNote.text}
              </Text>
            </>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeView}>
              Close
            </Button>
          </Group>
        </Stack>
      </AppModal>

      <AppModal
        opened={modalOpened}
        onClose={handleClose}
        title={
          <Group>
            <Title order={4} c="white">
              {editingNote !== undefined ? 'Edit Note' : 'New Note'}
            </Title>
          </Group>
        }
      >
        <Stack mt="sm">
          <Textarea
            placeholder="Enter note text..."
            value={noteText}
            onChange={(e) => setNoteText(e.currentTarget.value)}
            autosize
            minRows={4}
            maxRows={12}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!noteText.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </AppModal>

      <AppModal
        opened={deleteConfirmOpened}
        onClose={closeDeleteConfirm}
        title={
          <Group>
            <Title order={4} c="white">
              Delete Note
            </Title>
          </Group>
        }
        size="sm"
      >
        <Stack mt="sm">
          <Text size="sm">Are you sure you want to delete this note? This cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteConfirm} disabled={saving}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={saving}>
              Delete
            </Button>
          </Group>
        </Stack>
      </AppModal>
    </>
  );
}
