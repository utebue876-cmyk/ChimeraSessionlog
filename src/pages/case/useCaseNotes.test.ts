import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CASE_NOTE_URL } from '../../config/chimera-urls';
import { buildNoteExtension, PAGE_SIZE, parseNotes, useCaseNotes } from './useCaseNotes';

vi.mock('../../utils/patientActivity', () => ({ recordPatientActivity: vi.fn() }));
vi.mock('@mantine/notifications', () => ({ showNotification: vi.fn() }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNoteExt(text: string, date: string, lastUpdated = date, author?: string) {
  return {
    url: CASE_NOTE_URL,
    extension: [
      { url: 'text', valueString: text },
      { url: 'date', valueString: date },
      { url: 'lastUpdated', valueString: lastUpdated },
      ...(author ? [{ url: 'author', valueString: author }] : []),
    ],
  };
}

function makeEpisode(noteExts: ReturnType<typeof makeNoteExt>[] = []) {
  return {
    resourceType: 'EpisodeOfCare' as const,
    id: 'ep-1',
    status: 'active' as const,
    patient: { reference: 'Patient/p-1' },
    extension: noteExts,
  };
}

function wrapper(medplum: MockClient) {
  return ({ children }: { children: ReactNode }) => createElement(MedplumProvider, { medplum, children });
}

// ─── parseNotes ──────────────────────────────────────────────────────────────

describe('parseNotes', () => {
  test('returns empty array when episode has no extensions', () => {
    expect(parseNotes({ resourceType: 'EpisodeOfCare', status: 'active', patient: {} })).toEqual([]);
  });

  test('parses a single note correctly', () => {
    const episode = makeEpisode([makeNoteExt('Hello', '2024-01-01T10:00:00Z', '2024-01-02T10:00:00Z', 'Dr Smith')]);
    const notes = parseNotes(episode);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      index: 0,
      text: 'Hello',
      date: '2024-01-01T10:00:00Z',
      lastUpdated: '2024-01-02T10:00:00Z',
      author: 'Dr Smith',
    });
  });

  test('sorts notes by lastUpdated descending', () => {
    const episode = makeEpisode([
      makeNoteExt('Older', '2024-01-01T00:00:00Z'),
      makeNoteExt('Newer', '2024-01-03T00:00:00Z'),
      makeNoteExt('Middle', '2024-01-02T00:00:00Z'),
    ]);
    const notes = parseNotes(episode);
    expect(notes.map((n) => n.text)).toEqual(['Newer', 'Middle', 'Older']);
  });

  test('falls back to date when lastUpdated is absent', () => {
    const episode = makeEpisode([
      {
        url: CASE_NOTE_URL,
        extension: [
          { url: 'text', valueString: 'Note' },
          { url: 'date', valueString: '2024-05-01T00:00:00Z' },
        ],
      },
    ]);
    const notes = parseNotes(episode);
    expect(notes[0].lastUpdated).toBe('2024-05-01T00:00:00Z');
  });

  test('ignores extensions with a different URL', () => {
    const episode = {
      ...makeEpisode([makeNoteExt('Note', '2024-01-01T00:00:00Z')]),
      extension: [
        { url: 'https://other.example.com/ext', valueString: 'ignored' },
        makeNoteExt('Note', '2024-01-01T00:00:00Z'),
      ],
    };
    expect(parseNotes(episode)).toHaveLength(1);
  });
});

// ─── buildNoteExtension ───────────────────────────────────────────────────────

describe('buildNoteExtension', () => {
  test('builds extension with all fields including author', () => {
    const ext = buildNoteExtension('My note', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 'Jane Doe');
    expect(ext.url).toBe(CASE_NOTE_URL);
    expect(ext.extension).toContainEqual({ url: 'text', valueString: 'My note' });
    expect(ext.extension).toContainEqual({ url: 'date', valueString: '2024-01-01T00:00:00Z' });
    expect(ext.extension).toContainEqual({ url: 'lastUpdated', valueString: '2024-01-02T00:00:00Z' });
    expect(ext.extension).toContainEqual({ url: 'author', valueString: 'Jane Doe' });
  });

  test('omits author extension when not provided', () => {
    const ext = buildNoteExtension('Note', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');
    expect(ext.extension?.find((e) => e.url === 'author')).toBeUndefined();
  });
});

// ─── useCaseNotes hook ────────────────────────────────────────────────────────

describe('useCaseNotes', () => {
  let medplum: MockClient;
  const onUpdated = vi.fn();

  beforeEach(() => {
    medplum = new MockClient();
    vi.clearAllMocks();
  });

  test('returns parsed notes and correct pagination totals', () => {
    const noteExts = Array.from({ length: PAGE_SIZE + 1 }, (_, i) =>
      makeNoteExt(`Note ${i}`, `2024-01-0${i + 1}T00:00:00Z`)
    );
    const episode = makeEpisode(noteExts);

    const { result } = renderHook(() => useCaseNotes(episode, onUpdated), { wrapper: wrapper(medplum) });

    expect(result.current.notes).toHaveLength(PAGE_SIZE + 1);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.pagedNotes).toHaveLength(PAGE_SIZE);
  });

  test('openNew clears editing state and opens modal', () => {
    const { result } = renderHook(() => useCaseNotes(makeEpisode(), onUpdated), { wrapper: wrapper(medplum) });

    act(() => result.current.openNew());

    expect(result.current.modalOpened).toBe(true);
    expect(result.current.editingNote).toBeUndefined();
    expect(result.current.noteText).toBe('');
  });

  test('openEdit populates noteText and editingNote', () => {
    const episode = makeEpisode([makeNoteExt('Existing note', '2024-01-01T00:00:00Z')]);
    const { result } = renderHook(() => useCaseNotes(episode, onUpdated), { wrapper: wrapper(medplum) });

    act(() => result.current.openEdit(result.current.notes[0]));

    expect(result.current.modalOpened).toBe(true);
    expect(result.current.noteText).toBe('Existing note');
    expect(result.current.editingNote?.text).toBe('Existing note');
  });

  test('handleClose resets modal and text state', () => {
    const { result } = renderHook(() => useCaseNotes(makeEpisode(), onUpdated), { wrapper: wrapper(medplum) });

    act(() => result.current.openNew());
    act(() => result.current.setNoteText('draft'));
    act(() => result.current.handleClose());

    expect(result.current.modalOpened).toBe(false);
    expect(result.current.noteText).toBe('');
    expect(result.current.editingNote).toBeUndefined();
  });

  test('handleSave creates a new note and calls onUpdated', async () => {
    const episode = await medplum.createResource(makeEpisode());
    const updateSpy = vi.spyOn(medplum, 'updateResource');

    const { result } = renderHook(() => useCaseNotes(episode, onUpdated), { wrapper: wrapper(medplum) });

    act(() => result.current.openNew());
    act(() => result.current.setNoteText('Brand new note'));
    await act(() => result.current.handleSave());

    await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1));
    const savedEpisode = updateSpy.mock.calls[0][0] as typeof episode;
    const noteExts = savedEpisode.extension?.filter((e) => e.url === CASE_NOTE_URL);
    expect(noteExts).toHaveLength(1);
    expect(noteExts?.[0].extension?.find((e) => e.url === 'text')?.valueString).toBe('Brand new note');
  });

  test('handleSave does nothing when noteText is blank', async () => {
    const updateSpy = vi.spyOn(medplum, 'updateResource');
    const { result } = renderHook(() => useCaseNotes(makeEpisode(), onUpdated), { wrapper: wrapper(medplum) });

    act(() => result.current.openNew());
    await act(() => result.current.handleSave());

    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('requestDelete opens delete confirm modal', () => {
    const episode = makeEpisode([makeNoteExt('A note', '2024-01-01T00:00:00Z')]);
    const { result } = renderHook(() => useCaseNotes(episode, onUpdated), { wrapper: wrapper(medplum) });

    act(() => result.current.requestDelete(0));

    expect(result.current.deleteConfirmOpened).toBe(true);
  });

  test('handleDelete removes the note and calls onUpdated', async () => {
    const episode = await medplum.createResource(
      makeEpisode([makeNoteExt('Keep', '2024-01-02T00:00:00Z'), makeNoteExt('Delete me', '2024-01-01T00:00:00Z')])
    );

    const { result } = renderHook(() => useCaseNotes(episode, onUpdated), { wrapper: wrapper(medplum) });

    // notes are sorted newest-first; index 1 in sorted order = the second extension
    act(() => result.current.requestDelete(1));
    await act(() => result.current.handleDelete());

    await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1));
    const updatedEpisode = onUpdated.mock.calls[0][0];
    const remaining = updatedEpisode.extension?.filter((e: { url: string }) => e.url === CASE_NOTE_URL);
    expect(remaining).toHaveLength(1);
  });
});
