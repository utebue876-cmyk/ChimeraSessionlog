import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { CaseTab } from './CaseTab';

const hookState = vi.hoisted(() => ({
  patient: undefined as Patient | undefined,
}));

vi.mock('../../../hooks/usePatient', () => ({
  usePatient: () => hookState.patient,
}));

vi.mock('../../case/Case', () => ({
  Case: ({ patient }: any) => <div>Case for {patient?.id}</div>,
}));

describe('CaseTab', () => {
  test('shows loader while patient is unavailable', () => {
    hookState.patient = undefined;

    render(
      <MantineProvider>
        <CaseTab />
      </MantineProvider>
    );

    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  test('renders case component when patient is available', () => {
    hookState.patient = { resourceType: 'Patient', id: 'p1' };

    render(
      <MantineProvider>
        <CaseTab />
      </MantineProvider>
    );

    expect(screen.getByText('Case for p1')).toBeInTheDocument();
  });
});
