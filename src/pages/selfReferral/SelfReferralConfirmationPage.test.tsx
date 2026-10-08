import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { SelfReferralConfirmationPage } from './SelfReferralConfirmationPage';

const hookState = vi.hoisted(() => ({
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '2000-01-01',
  gender: 'female',
  cardLastThree: '123',
  appointmentStartIso: '2026-01-01T09:00:00Z',
  loading: false,
  error: null as string | null,
  bookingResult: null as any,
  handleConfirmBooking: vi.fn(async () => undefined),
  goBack: vi.fn(),
}));

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('./useSelfReferralConfirmation', () => ({ useSelfReferralConfirmation: () => hookState }));
vi.mock('./SelfReferralStepper', () => ({ SelfReferralStepper: () => <div>Stepper</div> }));
vi.mock('@medplum/react', () => ({ Document: ({ children }: any) => <div>{children}</div> }));
vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, children }: any) => (opened ? <div>{children}</div> : null),
}));

describe('SelfReferralConfirmationPage', () => {
  test('renders summary and triggers previous/confirm', async () => {
    const user = userEvent.setup();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy as any);

    render(
      <MantineProvider>
        <SelfReferralConfirmationPage />
      </MantineProvider>
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));
    expect(hookState.goBack).toHaveBeenCalled();
    expect(hookState.handleConfirmBooking).toHaveBeenCalled();
  });
});
