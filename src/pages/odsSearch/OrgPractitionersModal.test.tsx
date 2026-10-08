import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { OrgPractitionersModal } from './OrgPractitionersModal';

const hookState = vi.hoisted(() => ({
  practitioners: [] as any[],
  loading: false,
  error: null as string | null,
}));

vi.mock('./useOrgPractitioners', () => ({
  useOrgPractitioners: () => hookState,
}));

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: any) =>
    opened ? (
      <div role="dialog">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

describe('OrgPractitionersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.practitioners = [];
    hookState.loading = false;
    hookState.error = null;
  });

  test('shows loading overlay while fetching', () => {
    hookState.loading = true;

    render(
      <MantineProvider>
        <OrgPractitionersModal orgId="A1" orgName="Org A" opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Practitioners')).toBeInTheDocument();
    expect(document.querySelector('.mantine-LoadingOverlay-root')).toBeInTheDocument();
  });

  test('shows error alert', () => {
    hookState.error = 'Request failed';

    render(
      <MantineProvider>
        <OrgPractitionersModal orgId="A1" orgName="Org A" opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Failed to load practitioners')).toBeInTheDocument();
    expect(screen.getByText('Request failed')).toBeInTheDocument();
  });

  test('shows empty state when no practitioners', () => {
    render(
      <MantineProvider>
        <OrgPractitionersModal orgId="A1" orgName="Org A" opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('No practitioners found for this organisation.')).toBeInTheDocument();
  });

  test('renders practitioners table rows', () => {
    hookState.practitioners = [
      {
        code: 'P100',
        name: 'SMITH, JOHN',
        roleCode: 'R0260',
        roleName: 'General Practitioner',
        joinDate: '2025-01-01',
        leftDate: null,
        type: 'Doctor',
      },
    ];

    render(
      <MantineProvider>
        <OrgPractitionersModal orgId="A1" orgName="Org A" opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('SMITH, JOHN')).toBeInTheDocument();
    expect(screen.getByText('R0260')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
  });
});
