import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { formatHumanName } from '@medplum/core';
import type { HumanName, Patient } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { AppModal } from '../../components/modal/AppModal';

export interface DuplicatePatientModalProps {
  readonly patients: Patient[];
  readonly onClose: () => void;
  readonly onOpenPatient: (patientId: string | undefined) => void;
}

export function DuplicatePatientModal({ patients, onClose, onOpenPatient }: DuplicatePatientModalProps): JSX.Element {
  return (
    <AppModal
      opened={patients.length > 0}
      onClose={onClose}
      title={
        <Group>
          <Title order={4} c="white">
            Possible duplicate patients detected
          </Title>
        </Group>
      }
      centered
      size="lg"
    >
      <Stack gap="md" mt="sm">
        <Text size="sm">
          A patient with the same first name, last name, date of birth, and gender already exists. Select a patient to
          open their chart, or close this dialog to return to the intake form.
        </Text>
        <Stack gap="sm">
          {patients.map((patient) => (
            <Group key={patient.id} justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={4} style={{ flex: 1 }}>
                <Title order={4} c="blue" mb="sm">
                  {formatHumanName(patient.name?.[0] as HumanName) || 'Unnamed patient'}
                </Title>
                <Group align="flex-start" gap="md" wrap="nowrap">
                  <Stack gap={2} w={60}>
                    <Text size="sm" fw={500}>
                      MRN:
                    </Text>
                    <Text size="sm" fw={500}>
                      DOB:
                    </Text>
                    <Text size="sm" fw={500}>
                      Gender:
                    </Text>
                    <Text size="sm" fw={500}>
                      Phone:
                    </Text>
                    <Text size="sm" fw={500}>
                      Email:
                    </Text>
                  </Stack>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text size="sm">{getMrnValue(patient) || 'Unknown'}</Text>
                    <Text size="sm">{patient.birthDate || 'Unknown'}</Text>
                    <Text size="sm">{formatGender(patient.gender)}</Text>
                    <Text size="sm">{getTelecomValue(patient, 'phone') || 'Unknown'}</Text>
                    <Text size="sm">{getTelecomValue(patient, 'email') || 'Unknown'}</Text>
                  </Stack>
                </Group>
              </Stack>
              <Button onClick={() => onOpenPatient(patient.id)}>Open Patient</Button>
            </Group>
          ))}
        </Stack>
        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Return to Intake
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}

function formatGender(gender: Patient['gender']): string {
  if (!gender) {
    return 'Unknown';
  }

  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function getTelecomValue(patient: Patient, system: 'phone' | 'email'): string | undefined {
  return patient.telecom?.find((contactPoint) => contactPoint.system === system)?.value;
}

function getMrnValue(patient: Patient): string | undefined {
  return patient.identifier?.[0]?.value;
}
