import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SelfReferralAppointmentPage } from './SelfReferralAppointmentPage';

const hookState = vi.hoisted(() => ({
  dayColumns: [
    {
      date: {
        format: (): string => '2099-01-05',
        day: () => 1,
        month: () => 0,
        date: () => 5,
      },
      timeSlots: [{ timeLabel: '09:00', start: new Date('2099-01-05T09:00:00Z'), slots: [] }],
    },
  ],
  filter: 'am' as 'am' | 'pm' | 'all',
  setFilter: vi.fn(),
  loading: false,
  selectedTimeLabel: null,
  selectedDayIso: null,
  selectSlot: vi.fn(),
  canGoBack: true,
  goBack: vi.fn(),
  goForward: vi.fn(),
  handleConfirm: vi.fn(),
}));

vi.mock('./useSelfReferralAppointment', () => ({ useSelfReferralAppointment: () => hookState }));
vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector({ setStep: vi.fn() }),
}));
vi.mock('./SelfReferralStepper', () => ({ SelfReferralStepper: () => <div>Stepper</div> }));
vi.mock('@medplum/react', () => ({ Document: ({ children }: any) => <div>{children}</div> }));

describe('SelfReferralAppointmentPage', () => {
  beforeEach(() => {
    vi.useRealTimers();
    hookState.selectSlot.mockClear();
    hookState.setFilter.mockClear();
    hookState.handleConfirm.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders slots and triggers selection/filter/confirm actions', async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <SelfReferralAppointmentPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Morning' }));
    expect(hookState.setFilter).toHaveBeenCalledWith('am');

    await user.click(screen.getByRole('button', { name: '09:00' }));
    expect(hookState.selectSlot).toHaveBeenCalled();

    // no selection yet in hook state -> disabled
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('disables slots earlier than now on the same day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T10:00:00'));

    hookState.dayColumns = [
      {
        date: {
          format: (): string => '2026-01-05',
          day: () => 1,
          month: () => 0,
          date: () => 5,
        },
        timeSlots: [
          { timeLabel: '09:00', start: new Date('2026-01-05T09:00:00'), slots: [] },
          { timeLabel: '11:00', start: new Date('2026-01-05T11:00:00'), slots: [] },
        ],
      },
    ];

    render(
      <MantineProvider>
        <SelfReferralAppointmentPage />
      </MantineProvider>
    );

    expect(screen.getByRole('button', { name: '09:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '11:00' })).toBeEnabled();
  });
});
