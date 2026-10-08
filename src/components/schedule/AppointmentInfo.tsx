import { Button, Flex, Stack, Text, TextInput, Title } from '@mantine/core';
import type { Appointment, Encounter } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { useAppointmentInfo } from './useAppointmentInfo';

export interface AppointmentInfoProps {
  appointment: Appointment;
  encounter?: Encounter;
  canShowAppointment: boolean;
  onShowAppointment: () => Promise<void>;
  onClose: () => void;
  onDelete?: (appointment: Appointment) => void;
}

export function AppointmentInfo(props: AppointmentInfoProps): JSX.Element {
  const { appointment, encounter, canShowAppointment, onShowAppointment, onClose, onDelete } = props;
  const {
    formattedDate,
    formattedTimeRange,
    practitionerDisplay,
    patientDisplay,
    caseDisplay,
    serviceTypeDisplay,
    careTemplateDisplay,
    handleDelete,
    deleting,
  } = useAppointmentInfo({ appointment, encounter, onClose, onDelete });

  return (
    <Flex direction="column" gap="md" h="100%" justify="space-between" mt="sm">
      <Stack gap="md" h="100%">
        <Stack gap={0}>
          <Title order={1} fw={500}>
            {formattedDate}
          </Title>
          <Text size="lg">{formattedTimeRange}</Text>
        </Stack>

        <TextInput label="Practitioner" value={practitionerDisplay} readOnly />
        <TextInput label="Patient" value={patientDisplay} readOnly />
        <TextInput label="Case" value={caseDisplay} readOnly />
        <TextInput label="Service Type" value={serviceTypeDisplay} readOnly />
        <TextInput label="Care Template" value={careTemplateDisplay} readOnly />
      </Stack>

      <Stack mt="md">
        <Button
          variant="outline"
          color="blue"
          onClick={() => onShowAppointment().catch(console.error)}
          disabled={!canShowAppointment}
        >
          View Appointment
        </Button>
        <Button variant="outline" color="red" onClick={handleDelete} loading={deleting}>
          Delete Appointment
        </Button>
      </Stack>
    </Flex>
  );
}
