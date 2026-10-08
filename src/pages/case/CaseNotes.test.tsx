import { MantineProvider } from '@mantine/core';
import type { EpisodeOfCare, Extension } from '@medplum/fhirtypes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CASE_NOTE_URL } from '../../config/chimera-urls';
import { CaseNotes } from './CaseNotes';

const medplumState = vi.hoisted(() => ({
  updateResource: vi.fn(),
  getProfile: vi.fn(),
}));

const notificationSpy = vi.hoisted(() => vi.fn());
const recordActivitySpy = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('@mantine/notifications', () => ({
  showNotification: (...args: any[]) => notificationSpy(...args),
}));

vi.mock('../../utils/patientActivity', () => ({
  recordPatientActivity: (...args: any[]) => recordActivitySpy(...args),
}));

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: { opened: boolean; title: React.ReactNode; children: React.ReactNode }) =>
    opened ? (
      <div role="dialog">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

function makeNote(text: string, date: string, lastUpdated: string, author?: string): Extension {
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

describe('CaseNotes', () => {
  const baseEpisode: EpisodeOfCare = {
    resourceType: 'EpisodeOfCare',
    id: 'episode-1',
    status: 'active',
    patient: { reference: 'Patient/patient-1' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    medplumState.getProfile.mockReturnValue({
      resourceType: 'Practitioner',
      id: 'pr-1',
      name: [{ family: 'Smith', given: ['Alex'] }],
    });
  });

  test('renders empty state when no notes exist', () => {
    render(
      <MantineProvider>
        <CaseNotes episode={baseEpisode} onUpdated={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  test('creates a new note and calls update handlers', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    const updatedEpisode = {
      ...baseEpisode,
      extension: [makeNote('A newly created note', '2099-01-01T12:00:00.000Z', '2099-01-01T12:00:00.000Z')],
    };
    medplumState.updateResource.mockResolvedValue(updatedEpisode);

    render(
      <MantineProvider>
        <CaseNotes episode={baseEpisode} onUpdated={onUpdated} />
      </MantineProvider>
    );

    await user.click(screen.getByLabelText('Add note'));
    await user.type(screen.getByPlaceholderText('Enter note text...'), 'A newly created note');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(medplumState.updateResource).toHaveBeenCalled();
      expect(onUpdated).toHaveBeenCalledWith(updatedEpisode);
    });

    const payload = medplumState.updateResource.mock.calls[0][0] as EpisodeOfCare;
    const noteExtensions = payload.extension?.filter((e) => e.url === CASE_NOTE_URL) ?? [];
    expect(noteExtensions).toHaveLength(1);
    expect(noteExtensions[0].extension?.find((e) => e.url === 'text')?.valueString).toBe('A newly created note');
    expect(notificationSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'green', message: 'Note saved' }));
    expect(recordActivitySpy).toHaveBeenCalled();
  });

  test('deletes an existing note', async () => {
    const user = userEvent.setup();
    const episodeWithNote: EpisodeOfCare = {
      ...baseEpisode,
      extension: [makeNote('Delete me', '2099-01-01T12:00:00.000Z', '2099-01-01T12:00:00.000Z', 'Alex Smith')],
    };

    medplumState.updateResource.mockResolvedValue({
      ...episodeWithNote,
      extension: [],
    });

    render(
      <MantineProvider>
        <CaseNotes episode={episodeWithNote} onUpdated={vi.fn()} />
      </MantineProvider>
    );

    await user.click(screen.getByLabelText('Delete note'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(medplumState.updateResource).toHaveBeenCalled();
    });

    const payload = medplumState.updateResource.mock.calls[0][0] as EpisodeOfCare;
    const noteExtensions = payload.extension?.filter((e) => e.url === CASE_NOTE_URL) ?? [];
    expect(noteExtensions).toHaveLength(0);
    expect(notificationSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'green', message: 'Note deleted' }));
  });
});
