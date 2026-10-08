import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SelfReferralPersonalPage } from './SelfReferralPersonalPage';

const hookState = vi.hoisted(() => ({
  values: {
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    postcode: '',
    consentDataProcessing: false,
    consentShareAlliance: false,
    consentShareAnglianWater: false,
  },
  errors: {},
  set: vi.fn(),
  handleNext: vi.fn(),
  goBack: vi.fn(),
}));

vi.mock('./useSelfReferralPersonal', () => ({ useSelfReferralPersonal: () => hookState }));
vi.mock('./SelfReferralStepper', () => ({ SelfReferralStepper: () => <div>Stepper</div> }));
vi.mock('@medplum/react', () => ({ Document: ({ children }: any) => <div>{children}</div> }));

describe('SelfReferralPersonalPage', () => {
  test('renders and triggers previous/next actions', async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <SelfReferralPersonalPage />
      </MantineProvider>
    );
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(hookState.goBack).toHaveBeenCalled();
    expect(hookState.handleNext).toHaveBeenCalled();
  });
});
