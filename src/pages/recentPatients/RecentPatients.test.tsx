import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RecentPatients } from './RecentPatients';

const medplumState = vi.hoisted(() => ({
  searchResources: vi.fn(),
}));

const profileState = vi.hoisted(() => ({
  profile: { resourceType: 'Practitioner', id: 'pr1' } as any,
}));

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useMedplumProfile: () => profileState.profile,
}));

describe('RecentPatients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy as any);
  });

  test('shows empty state when no recent activity', async () => {
    medplumState.searchResources.mockResolvedValue([]);

    render(
      <MantineProvider>
        <RecentPatients />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No recent patient activity found.')).toBeInTheDocument();
    });
  });

  test('renders recent patient from audit events and navigates on click', async () => {
    const user = userEvent.setup();
    medplumState.searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'AuditEvent') {
        return [
          {
            resourceType: 'AuditEvent',
            recorded: '2026-01-02T10:00:00Z',
            entity: [{ what: { reference: 'Patient/p1' } }],
          },
        ];
      }
      if (resourceType === 'Patient') {
        return [
          {
            resourceType: 'Patient',
            id: 'p1',
            name: [{ family: 'Doe', given: ['Jane'] }],
            identifier: [{ value: 'MRN-1' }],
          },
        ];
      }
      return [];
    });

    render(
      <MantineProvider>
        <RecentPatients />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Jane Doe'));
    expect(navigateSpy).toHaveBeenCalledWith('/Patient/p1/case');
  });
});
