import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { formatHumanName, normalizeErrorString } from '@medplum/core';
import type { EpisodeOfCare, Extension, Practitioner } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useState } from 'react';
import { CASE_NOTE_URL } from '../../config/chimera-urls';
import { recordPatientActivity } from '../../utils/patientActivity';

const NOTE_TEXT_URL = 'text';
const NOTE_DATE_URL = 'date';
const NOTE_LAST_UPDATED_URL = 'lastUpdated';
const NOTE_AUTHOR_URL = 'author';
export const PAGE_SIZE = 6;

export interface CaseNote {
  index: number;
  text: string;
  date: string;
  lastUpdated: string;
  author?: string;
}

export function parseNotes(episode: EpisodeOfCare): CaseNote[] {
  const notes =
    episode.extension
      ?.filter((e) => e.url === CASE_NOTE_URL)
      .map((e, i) => {
        const date = e.extension?.find((sub) => sub.url === NOTE_DATE_URL)?.valueString ?? '';
        return {
          index: i,
          text: e.extension?.find((sub) => sub.url === NOTE_TEXT_URL)?.valueString ?? '',
          date,
          lastUpdated: e.extension?.find((sub) => sub.url === NOTE_LAST_UPDATED_URL)?.valueString ?? date,
          author: e.extension?.find((sub) => sub.url === NOTE_AUTHOR_URL)?.valueString,
        };
      }) ?? [];
  return notes.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

export function buildNoteExtension(text: string, date: string, lastUpdated: string, author?: string): Extension {
  return {
    url: CASE_NOTE_URL,
    extension: [
      { url: NOTE_TEXT_URL, valueString: text },
      { url: NOTE_DATE_URL, valueString: date },
      { url: NOTE_LAST_UPDATED_URL, valueString: lastUpdated },
      ...(author ? [{ url: NOTE_AUTHOR_URL, valueString: author }] : []),
    ],
  };
}

export interface UseCaseNotesReturn {
  notes: CaseNote[];
  pagedNotes: CaseNote[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  noteText: string;
  setNoteText: (text: string) => void;
  saving: boolean;
  editingNote: CaseNote | undefined;
  viewingNote: CaseNote | undefined;
  setViewingNote: (note: CaseNote | undefined) => void;
  modalOpened: boolean;
  deleteConfirmOpened: boolean;
  viewOpened: boolean;
  openNew: () => void;
  openEdit: (note: CaseNote) => void;
  handleClose: () => void;
  handleSave: () => Promise<void>;
  requestDelete: (index: number) => void;
  handleDelete: () => Promise<void>;
  openView: () => void;
  closeView: () => void;
  closeDeleteConfirm: () => void;
}

export function useCaseNotes(episode: EpisodeOfCare, onUpdated: (updated: EpisodeOfCare) => void): UseCaseNotesReturn {
  const medplum = useMedplum();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteConfirmOpened, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false);
  const [viewOpened, { open: openView, close: closeView }] = useDisclosure(false);
  const [editingNote, setEditingNote] = useState<CaseNote | undefined>();
  const [viewingNote, setViewingNote] = useState<CaseNote | undefined>();
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | undefined>();
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const notes = parseNotes(episode);
  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
  const pagedNotes = notes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = useCallback((): void => {
    setEditingNote(undefined);
    setNoteText('');
    openModal();
  }, [openModal]);

  const openEdit = useCallback(
    (note: CaseNote): void => {
      setEditingNote(note);
      setNoteText(note.text);
      openModal();
    },
    [openModal]
  );

  const handleClose = useCallback((): void => {
    closeModal();
    setEditingNote(undefined);
    setNoteText('');
  }, [closeModal]);

  const handleSave = useCallback(async (): Promise<void> => {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const otherExtensions = (episode.extension ?? []).filter((e) => e.url !== CASE_NOTE_URL);
      const existingNotes = (episode.extension ?? []).filter((e) => e.url === CASE_NOTE_URL);

      const now = new Date().toISOString();
      const practitioner = medplum.getProfile() as Practitioner | undefined;
      const authorName = practitioner?.name?.[0] ? formatHumanName(practitioner.name[0]) : undefined;

      let updatedNotes: Extension[];
      if (editingNote !== undefined) {
        updatedNotes = existingNotes.map((ext, i) =>
          i === editingNote.index ? buildNoteExtension(trimmed, editingNote.date, now, authorName) : ext
        );
      } else {
        updatedNotes = [...existingNotes, buildNoteExtension(trimmed, now, now, authorName)];
      }

      const updated = await medplum.updateResource({
        ...episode,
        extension: [...otherExtensions, ...updatedNotes],
      });

      onUpdated(updated as EpisodeOfCare);
      recordPatientActivity(medplum, episode.patient?.reference?.replace('Patient/', ''));
      if (editingNote === undefined) {
        setCurrentPage(1);
      }
      handleClose();
      showNotification({ color: 'green', message: 'Note saved' });
    } catch (err) {
      showNotification({ color: 'red', title: 'Error saving note', message: normalizeErrorString(err) });
    } finally {
      setSaving(false);
    }
  }, [medplum, episode, editingNote, noteText, onUpdated, handleClose]);

  const requestDelete = useCallback(
    (index: number): void => {
      setPendingDeleteIndex(index);
      openDeleteConfirm();
    },
    [openDeleteConfirm]
  );

  const handleDelete = useCallback(async (): Promise<void> => {
    if (pendingDeleteIndex === undefined) return;
    setSaving(true);
    try {
      const otherExtensions = (episode.extension ?? []).filter((e) => e.url !== CASE_NOTE_URL);
      const existingNotes = (episode.extension ?? []).filter((e) => e.url === CASE_NOTE_URL);
      const updatedNotes = existingNotes.filter((_, i) => i !== pendingDeleteIndex);

      const updated = await medplum.updateResource({
        ...episode,
        extension: [...otherExtensions, ...updatedNotes],
      });

      onUpdated(updated as EpisodeOfCare);
      recordPatientActivity(medplum, episode.patient?.reference?.replace('Patient/', ''));
      const newTotal = Math.max(1, Math.ceil(updatedNotes.length / PAGE_SIZE));
      if (currentPage > newTotal) setCurrentPage(newTotal);
      closeDeleteConfirm();
      showNotification({ color: 'green', message: 'Note deleted' });
    } catch (err) {
      showNotification({ color: 'red', title: 'Error deleting note', message: normalizeErrorString(err) });
    } finally {
      setSaving(false);
      setPendingDeleteIndex(undefined);
    }
  }, [medplum, episode, pendingDeleteIndex, onUpdated, currentPage, closeDeleteConfirm]);

  return {
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
  };
}
