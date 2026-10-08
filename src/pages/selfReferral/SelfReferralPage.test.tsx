import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { SelfReferralPage } from './SelfReferralPage';

const storeState = vi.hoisted(() => ({
  currentStep: 1,
  clearAnglianWater: vi.fn(),
}));

vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector(storeState),
}));

vi.mock('./SelfReferralPersonalPage', () => ({ SelfReferralPersonalPage: () => <div>Personal Step</div> }));
vi.mock('./SelfReferralExcessPage', () => ({ SelfReferralExcessPage: () => <div>Excess Step</div> }));
vi.mock('./SelfReferralAppointmentPage', () => ({ SelfReferralAppointmentPage: () => <div>Appointment Step</div> }));
vi.mock('./SelfReferralConfirmationPage', () => ({ SelfReferralConfirmationPage: () => <div>Confirmation Step</div> }));
vi.mock('./SelfReferralAssessmentPage', () => ({ SelfReferralAssessmentPage: () => <div>Assessment Step</div> }));

describe('SelfReferralPage', () => {
  test('calls clear on mount and renders current step component', () => {
    storeState.currentStep = 1;
    render(
      <MantineProvider>
        <SelfReferralPage />
      </MantineProvider>
    );
    expect(storeState.clearAnglianWater).toHaveBeenCalled();
    expect(screen.getByText('Personal Step')).toBeInTheDocument();
  });
});
