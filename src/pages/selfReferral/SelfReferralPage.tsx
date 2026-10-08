import { Box } from '@mantine/core';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import { SelfReferralAppointmentPage } from './SelfReferralAppointmentPage';
import { SelfReferralAssessmentPage } from './SelfReferralAssessmentPage';
import { SelfReferralConfirmationPage } from './SelfReferralConfirmationPage';
import { SelfReferralExcessPage } from './SelfReferralExcessPage';
import { SelfReferralPersonalPage } from './SelfReferralPersonalPage';

export function SelfReferralPage(): JSX.Element {
  const currentStep = useSelfReferralStore((s) => s.currentStep);
  const clearAnglianWater = useSelfReferralStore((s) => s.clearAnglianWater);

  useEffect(() => {
    clearAnglianWater();
  }, [clearAnglianWater]);

  // Ensure that you scroll to the top of the page when the current step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'var(--mantine-color-gray-0)';
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, []);

  const page =
    currentStep === 1 ? (
      <SelfReferralPersonalPage />
    ) : currentStep === 2 ? (
      <SelfReferralExcessPage />
    ) : currentStep === 3 ? (
      <SelfReferralAppointmentPage />
    ) : currentStep === 4 ? (
      <SelfReferralConfirmationPage />
    ) : (
      <SelfReferralAssessmentPage />
    );

  return <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>{page}</Box>;
}
