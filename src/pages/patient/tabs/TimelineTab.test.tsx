import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { TimelineTab } from './TimelineTab';

const hookState = vi.hoisted(() => ({
  patient: undefined as Patient | undefined,
}));

vi.mock('../../../hooks/usePatient', () => ({
  usePatient: () => hookState.patient,
}));

vi.mock('@medplum/react', () => ({
  PatientTimeline: ({ patient }: any) => <div>Timeline for {patient?.id}</div>,
}));

describe('TimelineTab', () => {
  test('shows loader while patient is unavailable', () => {
    hookState.patient = undefined;

    render(
      <MantineProvider>
        <TimelineTab />
      </MantineProvider>
    );

    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  test('renders patient timeline when patient is available', () => {
    hookState.patient = { resourceType: 'Patient', id: 'p2' };

    render(
      <MantineProvider>
        <TimelineTab />
      </MantineProvider>
    );

    expect(screen.getByText('Timeline for p2')).toBeInTheDocument();
  });
});
