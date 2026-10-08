import { MantineProvider } from '@mantine/core';
import type { Coverage } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PatientInsurance } from './PatientInsurance';

vi.mock('@medplum/react', () => ({
  StatusBadge: ({ status }: any) => <span>{status}</span>,
}));

vi.mock('@medplum/react-hooks', () => ({
  useResource: (value: any) => {
    if (value?.reference === 'Organization/org-1') {
      return { resourceType: 'Organization', id: 'org-1', name: 'Insurer A' };
    }
    return value;
  },
}));

describe('PatientInsurance', () => {
  test('renders only active coverages', () => {
    const coverages: Coverage[] = [
      {
        resourceType: 'Coverage',
        id: 'cov-1',
        status: 'active',
        subscriberId: 'POL-1',
        beneficiary: { reference: 'Patient/p1' },
        payor: [{ reference: 'Organization/org-1' }],
      },
      {
        resourceType: 'Coverage',
        id: 'cov-2',
        status: 'cancelled',
        subscriberId: 'POL-2',
        beneficiary: { reference: 'Patient/p1' },
        payor: [{ reference: 'Organization/org-1' }],
      },
    ];

    render(
      <MantineProvider>
        <PatientInsurance coverages={coverages} />
      </MantineProvider>
    );

    expect(screen.getByText('Insurer A')).toBeInTheDocument();
    expect(screen.queryByText(/POL-2/)).not.toBeInTheDocument();
  });

  test('calls onClickResource when coverage item is clicked', async () => {
    const user = userEvent.setup();
    const onClickResource = vi.fn();
    const coverages: Coverage[] = [
      {
        resourceType: 'Coverage',
        id: 'cov-1',
        status: 'active',
        subscriberId: 'POL-1',
        beneficiary: { reference: 'Patient/p1' },
        payor: [{ reference: 'Organization/org-1' }],
      },
    ];

    render(
      <MantineProvider>
        <PatientInsurance coverages={coverages} onClickResource={onClickResource} />
      </MantineProvider>
    );

    await user.click(screen.getByText(/ID: POL-1/));
    expect(onClickResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'cov-1' }));
  });
});
