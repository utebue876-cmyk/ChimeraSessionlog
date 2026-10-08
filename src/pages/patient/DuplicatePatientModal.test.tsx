import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DuplicatePatientModal } from './DuplicatePatientModal';

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: any) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

describe('DuplicatePatientModal', () => {
  const patients: Patient[] = [
    {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['Jane'] }],
      birthDate: '2000-01-01',
      gender: 'female',
      identifier: [{ value: 'MRN-123' }],
      telecom: [
        { system: 'phone', value: '555-1111' },
        { system: 'email', value: 'jane@example.com' },
      ],
    },
  ];

  test('renders duplicate patient details', () => {
    render(
      <MantineProvider>
        <DuplicatePatientModal patients={patients} onClose={vi.fn()} onOpenPatient={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Possible duplicate patients detected')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('MRN-123')).toBeInTheDocument();
  });

  test('calls onOpenPatient and onClose actions', async () => {
    const user = userEvent.setup();
    const onOpenPatient = vi.fn();
    const onClose = vi.fn();

    render(
      <MantineProvider>
        <DuplicatePatientModal patients={patients} onClose={onClose} onOpenPatient={onOpenPatient} />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Open Patient' }));
    expect(onOpenPatient).toHaveBeenCalledWith('p1');

    await user.click(screen.getByRole('button', { name: 'Return to Intake' }));
    expect(onClose).toHaveBeenCalled();
  });
});
