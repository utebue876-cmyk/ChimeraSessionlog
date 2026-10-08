import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PatientsPage } from './PatientsPage';

const hookState = vi.hoisted(() => ({
  loading: false,
  currentPage: 1,
  setCurrentPage: vi.fn(),
  handleOpenPatient: vi.fn(),
  patients: [] as Patient[],
}));

vi.mock('./usePatientsPage', () => ({
  usePatientsPage: () => hookState,
}));

vi.mock('../../hooks/useSortResults', () => ({
  useSortResults: (items: any[]) => ({
    sorted: items,
    sortCol: undefined,
    sortDir: undefined,
    handleSort: vi.fn(),
  }),
  SortIcon: () => <span data-testid="sort-icon" />,
}));

describe('PatientsPage', () => {
  test('renders patient rows and handles row click', async () => {
    const user = userEvent.setup();
    hookState.patients = [
      {
        resourceType: 'Patient',
        id: 'p1',
        name: [{ family: 'Doe', given: ['Jane'] }],
        gender: 'female',
        telecom: [{ system: 'phone', value: '555-1111' }],
        identifier: [{ value: 'MRN-1' }],
      },
    ];

    render(
      <MantineProvider>
        <PatientsPage />
      </MantineProvider>
    );

    expect(screen.getByText('All Patients')).toBeInTheDocument();
    expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
    expect(screen.getByText('MRN-1')).toBeInTheDocument();

    await user.click(screen.getByText('Doe, Jane'));
    expect(hookState.handleOpenPatient).toHaveBeenCalledWith('p1');
  });
});
