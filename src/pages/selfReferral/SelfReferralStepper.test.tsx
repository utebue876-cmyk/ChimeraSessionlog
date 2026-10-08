import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SelfReferralStepper } from './SelfReferralStepper';

describe('SelfReferralStepper', () => {
  test('renders all step labels and highlights active step', () => {
    render(
      <MantineProvider>
        <SelfReferralStepper currentStep={2} />
      </MantineProvider>
    );

    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByText('Appointment')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
  });
});
