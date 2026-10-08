import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { OdsSearchPage } from './OdsSearchPage';

const hookState = vi.hoisted(() => ({
  query: '',
  setQuery: vi.fn(),
  handleSearch: vi.fn(),
  handleReset: vi.fn(),
  practitioners: [] as any[],
  loading: false,
  error: null as string | null,
  updatedAt: undefined as string | undefined,
  submittedQuery: null as string | null,
  currentPage: 1,
  setCurrentPage: vi.fn(),
}));

const sortState = vi.hoisted(() => ({
  sorted: [] as any[],
  sortCol: undefined,
  sortDir: undefined,
  handleSort: vi.fn(),
}));

vi.mock('./useOdsSearch', () => ({
  useOdsSearch: () => hookState,
}));

vi.mock('../../hooks/useSortResults', () => ({
  useSortResults: () => sortState,
  SortIcon: () => <span data-testid="sort-icon" />,
}));

describe('OdsSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.query = '';
    hookState.loading = false;
    hookState.error = null;
    hookState.submittedQuery = null;
    hookState.practitioners = [];
    sortState.sorted = [];
  });

  test('shows search header and empty state after submitted query with no results', () => {
    hookState.submittedQuery = 'SMITH';

    render(
      <MantineProvider>
        <OdsSearchPage />
      </MantineProvider>
    );

    expect(screen.getByText('GP Lookup')).toBeInTheDocument();
    expect(screen.getByText('No practitioners found matching your search.')).toBeInTheDocument();
  });

  test('calls search and reset actions from buttons', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <OdsSearchPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(hookState.handleSearch).toHaveBeenCalled();
    expect(hookState.handleReset).toHaveBeenCalled();
  });

  test('renders practitioner rows and supports sortable header clicks', async () => {
    const user = userEvent.setup();
    const rows = [
      {
        id: 'A12345',
        name: 'SMITH, JOHN',
        role: 'R0260',
        roleName: 'GENERAL MEDICAL PRACTITIONER',
        type: 'Doctor',
        number6: 'GMC123456',
        lastChangeDate: '2026-01-01',
        inactiveRole: '',
      },
    ];
    hookState.practitioners = rows;
    sortState.sorted = rows;

    render(
      <MantineProvider>
        <OdsSearchPage />
      </MantineProvider>
    );

    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(screen.getByText('SMITH, JOHN')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Code/i }));
    expect(sortState.handleSort).toHaveBeenCalledWith('id');
  });
});
