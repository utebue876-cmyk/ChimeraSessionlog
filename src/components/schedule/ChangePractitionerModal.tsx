import { Box, Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import type { Appointment, Encounter, Practitioner } from '@medplum/fhirtypes';
import { ResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { AppModal } from '../modal/AppModal';
import { useChangePractitionerModal } from './useChangePractitionerModal';

interface ChangePractitionerModalProps {
  appointment: Appointment | undefined;
  encounter: Encounter;
  opened: boolean;
  onClose: () => void;
  onSuccess?: (practitioner: Practitioner) => void;
}

const TITLE_WIDTH = 130;

export const ChangePractitionerModal = ({
  appointment,
  encounter,
  opened,
  onClose,
  onSuccess,
}: ChangePractitionerModalProps): JSX.Element => {
  const {
    practitioner,
    setPractitioner,
    availablePractitioners,
    isLoadingPractitioners,
    serviceTypeLabel,
    dateLabel,
    timeSlotLabel,
    isLoading,
    practitionerError,
    submit,
    handleClose,
  } = useChangePractitionerModal({ appointment, encounter, opened, onClose, onSuccess });

  const availableIds = availablePractitioners
    .map((p) => p.id)
    .filter(Boolean)
    .join(',');

  return (
    <AppModal
      opened={opened}
      onClose={handleClose}
      size="md"
      title={
        <Group>
          <Title order={4} c="white">
            Change Practitioner
          </Title>
        </Group>
      }
      centered
    >
      <Stack gap="md" mt={10}>
        <Group>
          <Text w={TITLE_WIDTH} size="sm" fw={600}>
            Service Type:
          </Text>
          <Text size="sm">{serviceTypeLabel}</Text>
        </Group>

        <Group>
          <Text w={TITLE_WIDTH} size="sm" fw={600}>
            Appointment Date:
          </Text>
          <Text size="sm">{dateLabel}</Text>
        </Group>

        <Group>
          <Text w={TITLE_WIDTH} size="sm" fw={600}>
            Time Slot:
          </Text>
          <Text size="sm">{timeSlotLabel}</Text>
        </Group>

        {isLoadingPractitioners ? (
          <Loader size="sm" />
        ) : availablePractitioners.length > 0 ? (
          <Group>
            <Text w={TITLE_WIDTH} size="sm" fw={600}>
              Practitioner:
            </Text>
            <Box style={{ flex: 1 }}>
              <ResourceInput
                resourceType="Practitioner"
                name="practitioner"
                defaultValue={practitioner}
                searchCriteria={{ _id: availableIds }}
                onChange={(value) => setPractitioner(value as Practitioner | undefined)}
                error={practitionerError}
              />
            </Box>
          </Group>
        ) : (
          <Text size="sm" c="var(--mantine-color-red-6)" mt="sm">
            No other practitioners available for the selected time slot.
          </Text>
        )}

        <Box style={{ display: 'flex', justifyContent: 'flex-end' }} mt="xs">
          <Button
            onClick={availablePractitioners.length > 0 ? submit : handleClose}
            loading={isLoading}
            disabled={isLoading || isLoadingPractitioners}
            mr="sm"
            color="var(--mantine-color-blue-6)"
          >
            {availablePractitioners.length > 0 ? 'Save Changes' : 'Close'}
          </Button>
        </Box>
      </Stack>
    </AppModal>
  );
};
