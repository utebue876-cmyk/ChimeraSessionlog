import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SelfReferralExcessPage } from './SelfReferralExcessPage';

const hookState = vi.hoisted(() => ({
  values: {
    nameOnCard: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    securityNumber: '',
    billingPostcode: '',
    billingLine1: '',
    billingLine2: '',
    billingTown: '',
    billingCounty: '',
    consentForPayment: false,
  },
  errors: {},
  sameAsPersonal: false,
  set: vi.fn(),
  toggleSameAsPersonal: vi.fn(),
  handleConfirm: vi.fn(),
}));
const setStepSpy = vi.hoisted(() => vi.fn());

vi.mock('./useSelfReferralExcess', () => ({ useSelfReferralExcess: () => hookState }));
vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector({ setStep: setStepSpy }),
}));
vi.mock('./SelfReferralStepper', () => ({ SelfReferralStepper: () => <div>Stepper</div> }));
vi.mock('@medplum/react', () => ({ Document: ({ children }: any) => <div>{children}</div> }));

describe('SelfReferralExcessPage', () => {
  test('renders and triggers previous/next actions', async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <SelfReferralExcessPage />
      </MantineProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(setStepSpy).toHaveBeenCalledWith(1);
    expect(hookState.handleConfirm).toHaveBeenCalled();
  });
});
