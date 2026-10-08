import { MantineProvider } from '@mantine/core';
import type { Condition, Patient } from '@medplum/fhirtypes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PatientProblems } from './PatientProblems';

const medplumState = vi.hoisted(() => ({
  createResource: vi.fn(),
  updateResource: vi.fn(),
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('@medplum/react', () => ({
  StatusBadge: ({ status }: any) => <span>{status}</span>,
}));

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: any) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('./PatientConditionDialog', () => ({
  PatientConditionDialog: ({ onSubmit }: any) => (
    <button onClick={() => onSubmit({ resourceType: 'Condition', code: { text: 'New Condition' } })}>
      Submit Condition
    </button>
  ),
}));

describe('PatientProblems', () => {
  const patient: Patient = { resourceType: 'Patient', id: 'p1' };

  test('filters out entered-in-error conditions', () => {
    const problems: Condition[] = [
      {
        resourceType: 'Condition',
        id: 'c1',
        code: { text: 'Active condition' },
        subject: { reference: 'Patient/p1' },
        clinicalStatus: { coding: [{ code: 'active' }] },
      },
      {
        resourceType: 'Condition',
        id: 'c2',
        code: { text: 'Error condition' },
        subject: { reference: 'Patient/p1' },
        verificationStatus: { coding: [{ code: 'entered-in-error' }] },
      },
    ];

    render(
      <MantineProvider>
        <PatientProblems patient={patient} problems={problems} />
      </MantineProvider>
    );

    expect(screen.getByText('Active condition')).toBeInTheDocument();
    expect(screen.queryByText('Error condition')).not.toBeInTheDocument();
  });

  test('creates a new condition from dialog submit', async () => {
    const user = userEvent.setup();
    medplumState.createResource.mockResolvedValue({
      resourceType: 'Condition',
      id: 'c-new',
      code: { text: 'New Condition' },
    });

    render(
      <MantineProvider>
        <PatientProblems patient={patient} problems={[]} />
      </MantineProvider>
    );

    await user.click(screen.getByLabelText('New condition'));
    await user.click(screen.getByRole('button', { name: 'Submit Condition' }));

    await waitFor(() => {
      expect(medplumState.createResource).toHaveBeenCalled();
    });
  });
});
