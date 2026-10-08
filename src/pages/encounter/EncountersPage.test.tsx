import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EncountersPage } from './EncountersPage';

const pageState = vi.hoisted(() => ({
  loading: false,
  currentPage: 1,
  totalPages: 1,
  setCurrentPage: vi.fn(),
  sortedEncounters: [] as any[],
  planDefinitionNames: {} as Record<string, string>,
  encounters: [] as any[],
  activeEpisode: undefined as any,
  handleOpenEncounter: vi.fn(),
  handleCreateAppointment: vi.fn(),
  sortCol: null as any,
  sortDir: 'asc' as 'asc' | 'desc',
  handleSort: vi.fn(),
}));

vi.mock('./useEncountersPage', () => ({
  useEncountersPage: () => pageState,
}));

vi.mock('../../hooks/useSortResults', () => ({
  SortIcon: () => <span data-testid="sort-icon" />,
}));

vi.mock('../../utils/episodeOfCareUtils', () => ({
  getCaseStatus: () => 'active',
}));

vi.mock('../../utils/statusColors', () => ({
  getEncounterStatusColor: () => 'blue',
}));

describe('EncountersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageState.loading = false;
    pageState.currentPage = 1;
    pageState.totalPages = 1;
    pageState.encounters = [];
    pageState.sortedEncounters = [];
    pageState.planDefinitionNames = {};
    pageState.activeEpisode = undefined;
    pageState.sortCol = null;
  });

  test('shows encounter count and disabled new appointment when no active episode', () => {
    render(
      <MantineProvider>
        <EncountersPage />
      </MantineProvider>
    );

    expect(screen.getByText('0 appointments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New appointment' })).toBeDisabled();
  });

  test('renders encounter row, supports row click, and allows creating appointment', async () => {
    const user = userEvent.setup();
    pageState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      identifier: [{ value: 'CASE-1' }],
    };
    pageState.encounters = [{ id: 1 } as any];
    pageState.planDefinitionNames = { 'enc-1': 'Initial Assessment' };
    pageState.sortedEncounters = [
      {
        encounter: {
          resourceType: 'Encounter',
          id: 'enc-1',
          status: 'finished',
          period: { start: '2026-01-01T09:00:00Z', end: '2026-01-01T09:30:00Z' },
        },
        appointment: {
          resourceType: 'Appointment',
          status: 'booked',
          start: '2026-01-01T09:00:00Z',
          end: '2026-01-01T09:30:00Z',
          participant: [{ status: 'accepted', actor: { reference: 'Practitioner/pr-1', display: 'Dr Jane' } }],
        },
        serviceType: { text: 'CBT' },
      },
    ];

    render(
      <MantineProvider>
        <EncountersPage />
      </MantineProvider>
    );

    expect(screen.getByText('CASE-1')).toBeInTheDocument();
    expect(screen.getByText('1 appointment')).toBeInTheDocument();
    expect(screen.getByText('Dr Jane')).toBeInTheDocument();
    expect(screen.getByText('CBT')).toBeInTheDocument();
    expect(screen.getByText('Initial Assessment')).toBeInTheDocument();
    expect(screen.getByText('finished')).toBeInTheDocument();

    await user.click(screen.getByText('Dr Jane'));
    expect(pageState.handleOpenEncounter).toHaveBeenCalledWith('enc-1');

    const newAppointmentButton = screen.getByRole('button', { name: 'New appointment' });
    expect(newAppointmentButton).toBeEnabled();
    await user.click(newAppointmentButton);
    expect(pageState.handleCreateAppointment).toHaveBeenCalled();
  });

  test('clicks sortable headers and delegates to handleSort', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <EncountersPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Status' }));

    expect(pageState.handleSort).toHaveBeenCalledWith('start');
    expect(pageState.handleSort).toHaveBeenCalledWith('status');
  });
});
