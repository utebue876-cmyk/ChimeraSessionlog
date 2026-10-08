import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { AccountPage } from './AccountPage';

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigateSpy,
}));

vi.mock('./useAccount', () => ({
  useAccount: () => ({
    caseId: 'CASE-1',
    loading: false,
    error: undefined,
    sections: [
      {
        id: 'enc-1',
        isoStart: '2026-01-02T10:00:00Z',
        appointmentDateTime: '02/01/2026, 10:00',
        encounterStatus: 'finished',
        appointmentSummary: 'Encounter: enc-1 • Status: booked • Ends: 02/01/2026, 10:30',
        calculatedCost: '£75.00',
        serviceType: { text: 'MH Accelerated Assessment' },
        serviceTypeDisplay: 'MH Accelerated Assessment',
        practitioner: 'Dr Jane Smith',
        encounter: { resourceType: 'Encounter', id: 'enc-1', status: 'finished' },
        appointment: { resourceType: 'Appointment', id: 'app-1', status: 'booked', participant: [] },
        rows: [
          {
            id: 'row-1',
            appointmentDateTime: '02/01/2026, 10:00',
            cptCode: '99213',
            modifiers: '—',
            calculatedPrice: '£50.00',
          },
          {
            id: 'row-2',
            appointmentDateTime: '02/01/2026, 10:00',
            cptCode: '99406',
            modifiers: '25',
            calculatedPrice: '£25.00',
          },
        ],
      },
    ],
    totalBill: '£75.00',
  }),
}));

describe('AccountPage', () => {
  test('renders the invoice layout', () => {
    render(
      <MemoryRouter>
        <MantineProvider>
          <AccountPage />
        </MantineProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Case ID:/)).toBeInTheDocument();
    expect(screen.getByText('CASE-1')).toBeInTheDocument();
    expect(screen.getByText('Appointment Time')).toBeInTheDocument();
    expect(screen.getByText('Service Type')).toBeInTheDocument();
    expect(screen.getByText('Practitioner')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getAllByText('02/01/2026, 10:00')).toHaveLength(1);
    expect(screen.getAllByText('MH Accelerated Assessment')).toHaveLength(1);
    expect(screen.getAllByText('Dr Jane Smith')).toHaveLength(1);
    expect(screen.getAllByText('finished')).toHaveLength(1);
    expect(screen.getByText('MH Accelerated Assessment')).toBeInTheDocument();
    expect(screen.getByText('Dr Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('finished')).toBeInTheDocument();
    expect(screen.getByText('99213')).toBeInTheDocument();
    expect(screen.getByText('99406')).toBeInTheDocument();
    expect(screen.getByText('Total Calculated Bill')).toBeInTheDocument();
    expect(screen.getAllByText('£75.00').length).toBeGreaterThan(0);
  });
});
