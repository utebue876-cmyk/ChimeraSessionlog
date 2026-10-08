import { MantineProvider } from '@mantine/core';
import type { Encounter, Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PatientConditionDialog } from './PatientConditionDialog';

vi.mock('@medplum/react', () => ({
  CodeableConceptInput: () => <div>CodeableConceptInput</div>,
  DateTimeInput: () => <div>DateTimeInput</div>,
  SubmitButton: ({ children }: any) => <button type="submit">{children}</button>,
  Form: ({ onSubmit, children }: any) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ onsetDateTime: '2026-01-01T10:00' });
      }}
    >
      {children}
    </form>
  ),
  convertLocalToIso: (v: string) => `${v}:00.000Z`,
}));

describe('PatientConditionDialog', () => {
  test('submits a Condition with patient/encounter references', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const patient: Patient = { resourceType: 'Patient', id: 'p1' };
    const encounter: Encounter = { resourceType: 'Encounter', id: 'e1', status: 'in-progress', class: { code: 'AMB' } };

    render(
      <MantineProvider>
        <PatientConditionDialog patient={patient} encounter={encounter} onSubmit={onSubmit} />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Condition',
        subject: expect.objectContaining({ reference: 'Patient/p1' }),
        encounter: expect.objectContaining({ reference: 'Encounter/e1' }),
      })
    );
  });
});
