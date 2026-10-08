import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CareManagerCasesPage } from './CareManagerCasesPage';

const careManagerState = vi.hoisted(() => ({
  loading: false,
  cases: [] as any[],
  currentPage: 1,
  setCurrentPage: vi.fn(),
  handleOpenCase: vi.fn(),
}));

const sortState = vi.hoisted(() => ({
  sorted: [] as any[],
  sortCol: undefined,
  sortDir: undefined,
  handleSort: vi.fn(),
}));

vi.mock('./useCareManagerCases', () => ({
  useCareManagerCases: () => careManagerState,
  getCaseSortValue: vi.fn(),
}));

vi.mock('../../hooks/useSortResults', () => ({
  useSortResults: () => sortState,
  SortIcon: () => <span data-testid="sort-icon" />,
}));

describe('CareManagerCasesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    careManagerState.loading = false;
    careManagerState.currentPage = 1;
    careManagerState.cases = [];
    sortState.sorted = [];
    sortState.sortCol = undefined;
    sortState.sortDir = undefined;
  });

  test('shows empty state when there are no assigned cases', () => {
    render(
      <MantineProvider>
        <CareManagerCasesPage />
      </MantineProvider>
    );

    expect(screen.getByText('No cases assigned to you as care manager.')).toBeInTheDocument();
  });

  test('shows loading overlay while data is loading', () => {
    careManagerState.loading = true;

    render(
      <MantineProvider>
        <CareManagerCasesPage />
      </MantineProvider>
    );

    expect(document.querySelector('.mantine-LoadingOverlay-root')).toBeInTheDocument();
    expect(screen.queryByText('No cases assigned to you as care manager.')).not.toBeInTheDocument();
  });

  test('renders table rows and opens case when a row is clicked', async () => {
    const user = userEvent.setup();
    const rows = [
      {
        episodeId: 'episode-1',
        patientName: 'Jane Doe',
        caseId: 'MH-001',
        periodStart: '2026-01-10T00:00:00.000Z',
        serviceType: 'CBT',
        managingOrg: 'IPRS Health',
        caseStatus: 'Intake',
      },
      {
        episodeId: 'episode-2',
        patientName: 'John Roe',
        caseId: 'MH-002',
        periodStart: '2026-01-12T00:00:00.000Z',
        serviceType: 'EMDR',
        managingOrg: 'IPRS Health',
        caseStatus: 'Closed',
      },
    ];
    careManagerState.cases = rows;
    sortState.sorted = rows;

    render(
      <MantineProvider>
        <CareManagerCasesPage />
      </MantineProvider>
    );

    expect(screen.getByText('2 cases')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('MH-002')).toBeInTheDocument();

    await user.click(screen.getByText('Jane Doe'));

    expect(careManagerState.handleOpenCase).toHaveBeenCalledWith(rows[0]);
  });

  test('clicking a sortable header calls handleSort', async () => {
    const user = userEvent.setup();
    const rows = [
      {
        episodeId: 'episode-3',
        patientName: 'A Person',
        caseId: 'MH-003',
        periodStart: '2026-01-14T00:00:00.000Z',
        serviceType: 'CBT',
        managingOrg: 'Chimera',
        caseStatus: 'Intake',
      },
    ];
    careManagerState.cases = rows;
    sortState.sorted = rows;

    render(
      <MantineProvider>
        <CareManagerCasesPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: /Patient/i }));

    expect(sortState.handleSort).toHaveBeenCalledWith('patientName');
  });
});
