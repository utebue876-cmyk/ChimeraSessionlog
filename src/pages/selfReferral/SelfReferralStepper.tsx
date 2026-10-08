import { Box, Divider, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import type { SelfReferralStep } from '../../store/selfReferralStore';

const STEPS = [
  { label: 'Assessment' },
  { label: 'Personal Details' },
  { label: 'Payment Details' },
  { label: 'Appointment' },
  { label: 'Confirmation' },
];

const BG = 'var(--mantine-color-blue-9)';

interface SelfReferralStepperProps {
  currentStep: SelfReferralStep;
}

export function SelfReferralStepper({ currentStep }: SelfReferralStepperProps): JSX.Element {
  return (
    <>
      <Divider color="var(--mantine-color-blue-3)" h={1} />
      <Box
        mb="lg"
        pt="30px"
        pb="20px"
        style={{
          backgroundColor: BG,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
          padding: '12px 16px',
        }}
      >
        <Box style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
          {/* Connectors */}
          <Box
            style={{
              position: 'absolute',
              top: 15,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: 'var(--mantine-color-blue-3)',
            }}
          />

          {STEPS.map((step, index) => {
            const stepNum = index as SelfReferralStep;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;

            return (
              <Box
                key={index}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  zIndex: 1,
                }}
              >
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid var(--mantine-color-blue-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCompleted
                      ? 'var(--mantine-color-blue-9)'
                      : isActive
                        ? 'var(--mantine-color-white)'
                        : BG,
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? (
                    <IconCheck size={16} color="var(--mantine-color-white)" strokeWidth={3} />
                  ) : (
                    <Text
                      size="sm"
                      fw={isActive ? 700 : 500}
                      style={{
                        lineHeight: 1,
                        color: isActive
                          ? 'var(--mantine-color-blue-7)'
                          : isCompleted
                            ? 'var(--mantine-color-blue-9)'
                            : 'var(--mantine-color-blue-3)',
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </Box>

                <Text
                  size="sm"
                  fw={isActive ? 700 : 500}
                  ta="center"
                  style={{
                    color: isActive
                      ? 'var(--mantine-color-white)'
                      : isCompleted
                        ? 'var(--mantine-color-white)'
                        : 'var(--mantine-color-blue-3)',
                  }}
                >
                  {step.label}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    </>
  );
}
