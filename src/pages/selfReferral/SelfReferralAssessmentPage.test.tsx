import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SelfReferralAssessmentPage } from './SelfReferralAssessmentPage';

const hookState = vi.hoisted(() => ({
  values: {
    riskOfHarm: 'false',
    protectiveFactors: '',
    triggeringFactors: [],
    substanceUse: '',
    pastPsychologicalProblems: '',
    pastTherapy: '',
    mentalHealthMedication: '',
    mainProblem: '',
    problemStart: '',
    problemAspectsSymptoms: '',
  },
  errors: {},
  set: vi.fn(),
  handleNext: vi.fn(),
}));

vi.mock('./useSelfReferralAssessment', () => ({ useSelfReferralAssessment: () => hookState }));
vi.mock('./SelfReferralStepper', () => ({ SelfReferralStepper: () => <div>Stepper</div> }));
vi.mock('@medplum/react', () => ({ Document: ({ children }: any) => <div>{children}</div> }));

describe('SelfReferralAssessmentPage', () => {
  test('renders and triggers next', async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <SelfReferralAssessmentPage />
      </MantineProvider>
    );
    expect(screen.getByText(/IPRS Mental Health Screening Assessment/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(hookState.handleNext).toHaveBeenCalled();
  });
});
