import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { OdsSearchOrganisationPage } from './OdsSearchOrganisationPage';

const hookState = vi.hoisted(() => ({
  name: '',
  setName: vi.fn(),
  address: '',
  setAddress: vi.fn(),
  town: '',
  setTown: vi.fn(),
  postcode: '',
  setPostcode: vi.fn(),
  status: '' as '' | 'Active' | 'Inactive',
  setStatus: vi.fn(),
  handleSearch: vi.fn(),
  handleReset: vi.fn(),
  validationError: null as string | null,
  organisations: [] as any[],
  loading: false,
  error: null as string | null,
  submitted: false,
  currentPage: 1,
  setCurrentPage: vi.fn(),
}));

const sortState = vi.hoisted(() => ({
  sorted: [] as any[],
  sortCol: undefined,
  sortDir: undefined,
  handleSort: vi.fn(),
}));

vi.mock('./useOdsSearchOrganisation', () => ({
  useOdsSearchOrganisation: () => hookState,
}));

vi.mock('../../hooks/useSortResults', () => ({
  useSortResults: () => sortState,
  SortIcon: () => <span data-testid="sort-icon" />,
}));

vi.mock('./OrgPractitionersModal', () => ({
  OrgPractitionersModal: ({ opened, orgName }: any) => (opened ? <div>Practitioners for {orgName}</div> : null),
}));

describe('OdsSearchOrganisationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.validationError = null;
    hookState.error = null;
    hookState.submitted = false;
    hookState.organisations = [];
    sortState.sorted = [];
  });

  test('shows validation error message from hook', () => {
    hookState.validationError = 'Please enter at least one of Name, Address, Town or Postcode.';

    render(
      <MantineProvider>
        <OdsSearchOrganisationPage />
      </MantineProvider>
    );

    expect(screen.getByText('Search Error...')).toBeInTheDocument();
    expect(screen.getByText(/Please enter at least one/i)).toBeInTheDocument();
  });

  test('calls search and reset handlers', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <OdsSearchOrganisationPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(hookState.handleSearch).toHaveBeenCalled();
    expect(hookState.handleReset).toHaveBeenCalled();
  });

  test('renders organisation rows and opens practitioners modal', async () => {
    const user = userEvent.setup();
    const orgs = [
      {
        id: 'A12345',
        name: 'HEREWARD MEDICAL',
        primaryRoleName: 'Primary Role',
        roleName: ['Role Name'],
        status: 'Active',
        address1: '1 Main St',
        address2: 'Somewhere',
        postcode: 'PE10',
      },
    ];
    hookState.organisations = orgs;
    sortState.sorted = orgs;

    render(
      <MantineProvider>
        <OdsSearchOrganisationPage />
      </MantineProvider>
    );

    expect(screen.getByText('1 record found')).toBeInTheDocument();
    expect(screen.getByText('HEREWARD MEDICAL')).toBeInTheDocument();

    await user.click(screen.getByTitle('View practitioners'));

    expect(screen.getByText('Practitioners for HEREWARD MEDICAL')).toBeInTheDocument();
  });
});
