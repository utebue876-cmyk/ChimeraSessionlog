import { Card, Stack, Text } from '@mantine/core';
import { createReference } from '@medplum/core';
import type { Encounter, Practitioner } from '@medplum/fhirtypes';
import { ResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { DateTimeNoSeconds } from '../common/DateTimeNoSeconds';

interface VisitDetailsPanelProps {
  practitioner?: Practitioner;
  encounter: Encounter;
  onEncounterChange: (encounter: Encounter) => void;
}

export const VisitDetailsPanel = (props: VisitDetailsPanelProps): JSX.Element => {
  const { practitioner, encounter, onEncounterChange } = props;

  const handlePractitionerChange = async (practitioner: Practitioner | undefined): Promise<void> => {
    if (!encounter || !practitioner) {
      return;
    }

    const updatedEncounter = {
      ...encounter,
      participant: [
        {
          individual: createReference(practitioner),
        },
      ],
    };

    onEncounterChange(updatedEncounter);
  };

  const handleCheckinChange = async (checkin: Date | undefined): Promise<void> => {
    if (!encounter || !checkin) {
      return;
    }

    const updatedEncounter = {
      ...encounter,
      period: {
        ...encounter.period,
        start: checkin.toISOString(),
      },
    };

    onEncounterChange(updatedEncounter);
  };

  const handleCheckoutChange = async (checkout: Date | undefined): Promise<void> => {
    if (!encounter || !checkout) {
      return;
    }

    const updatedEncounter = {
      ...encounter,
      period: {
        ...encounter.period,
        end: checkout.toISOString(),
      },
    };

    onEncounterChange(updatedEncounter);
  };

  return (
    <Stack gap={0} mt="md">
      <Text fw={600} size="lg" mb="md">
        Appointment Details
      </Text>
      <Card withBorder shadow="sm" p="md">
        <Stack gap="md">
          <ResourceInput
            resourceType="Practitioner"
            name="practitioner"
            label="Practitioner"
            placeholder="Search for practitioner"
            defaultValue={practitioner}
            onChange={handlePractitionerChange}
          />

          <DateTimeNoSeconds
            name="checkin"
            label="Check in"
            defaultValue={encounter.period?.start}
            onChange={handleCheckinChange}
          />

          <DateTimeNoSeconds
            name="checkout"
            label="Check out"
            defaultValue={encounter.period?.end}
            onChange={handleCheckoutChange}
          />
        </Stack>
      </Card>
    </Stack>
  );
};
