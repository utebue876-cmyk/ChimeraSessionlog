import { Button, Group, ScrollArea, Stack, Title } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { Appointment, Schedule, Slot } from '@medplum/fhirtypes';
import { CodeableConceptDisplay } from '@medplum/react';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import type { JSX } from 'react';
import { BookAppointmentForm } from '../../components/schedule/BookAppointmentForm';
import type { Range } from '../../types/scheduling';
import { SchedulingTransientIdentifier } from '../../utils/scheduling';
import { useFindPane } from './useFindPane';

const MIN_WIDTH = 320;

type FindPaneProps = {
  schedule: WithId<Schedule>;
  range: Range;
  blockedSlots?: Slot[];
  onSuccess: (results: { appointments: Appointment[]; slots: Slot[] }) => void;
  className?: string;
};

// Allows selection of a ServiceType found in the schedule's
// SchedulingParameters extensions, and shows upcoming free slots that can be
// used to book an Appointment of that type.
//
// See https://www.medplum.com/docs/scheduling/defining-availability for details.
export function FindPane(props: FindPaneProps): JSX.Element {
  const { schedule, range, blockedSlots, onSuccess, className } = props;
  const {
    serviceTypes,
    serviceType,
    setServiceType,
    displaySlots,
    chosenSlot,
    setChosenSlot,
    handleDismiss,
    handleBookSuccess,
  } = useFindPane({ schedule, range, blockedSlots, onSuccess });

  if (chosenSlot) {
    return (
      <Stack
        gap="sm"
        justify="flex-start"
        style={{
          minWidth: MIN_WIDTH,
          paddingLeft: '15px',
          paddingRight: '15px',
          paddingBottom: '10px',
          paddingTop: '0px',
          maxWidth: MIN_WIDTH,
          marginTop: '0px',
          height: '100%',
          overflow: 'hidden',
        }}
        className={className}
      >
        <Title order={4}>
          <Group justify="space-between">
            <span>{serviceType ? <CodeableConceptDisplay value={serviceType} /> : 'Event'}</span>
            <Button
              variant="filled"
              onClick={() => setChosenSlot(undefined)}
              aria-label="Clear selection"
              p={4}
              size="compact-md"
            >
              <IconX size={16} />
            </Button>
          </Group>
        </Title>
        <BookAppointmentForm slot={chosenSlot} onSuccess={handleBookSuccess} />
      </Stack>
    );
  }

  if (serviceType) {
    return (
      <Stack
        gap="sm"
        justify="flex-start"
        style={{
          minWidth: MIN_WIDTH,
          paddingLeft: '15px',
          paddingRight: '15px',
          paddingBottom: '10px',
          paddingTop: '0px',
          maxWidth: MIN_WIDTH,
          marginTop: '0px',
          height: '100%',
          overflow: 'hidden',
        }}
        className={className}
      >
        <Title order={4}>
          <Group justify="space-between">
            <span>{serviceType ? <CodeableConceptDisplay value={serviceType} /> : 'Event'}</span>
            {serviceTypes.length > 1 && (
              <Button variant="filled" onClick={handleDismiss} aria-label="Clear selection" p={4} size="compact-md">
                <IconX size={16} />
              </Button>
            )}
          </Group>
        </Title>
        <ScrollArea style={{ flex: 1, minHeight: 0 }}>
          <Stack gap="sm">
            {displaySlots.map((slot) => (
              <Button
                key={SchedulingTransientIdentifier.get(slot)}
                variant="outline"
                color="gray.5"
                styles={(theme) => ({
                  label: { fontWeight: 'normal', color: theme.colors.gray[9] },
                  root: { backgroundColor: 'white' },
                })}
                onClick={() => setChosenSlot(slot)}
              >
                {new Date(slot.start).toLocaleDateString('en-GB')}{' '}
                {new Date(slot.start).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}{' '}
                - {new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </Button>
            ))}
          </Stack>
        </ScrollArea>
      </Stack>
    );
  }

  return (
    <Stack
      gap="sm"
      justify="flex-start"
      style={{
        minWidth: MIN_WIDTH,
        paddingLeft: '15px',
        paddingRight: '15px',
        paddingBottom: '10px',
        paddingTop: '0px',
        maxWidth: MIN_WIDTH,
        marginTop: '0px',
      }}
      className={className}
    >
      {serviceTypes.length > 0 && <Title order={4}>Services</Title>}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="sm">
          {serviceTypes.map((st) => (
            <Button
              key={st.id}
              fullWidth
              variant="outline"
              color="gray.5"
              rightSection={<IconChevronRight size={12} />}
              justify="space-between"
              onClick={() => setServiceType(st.codeableConcept)}
              styles={(theme) => ({
                label: { fontWeight: 'normal', color: theme.colors.gray[9] },
                root: { backgroundColor: 'white' },
              })}
            >
              <CodeableConceptDisplay value={st.codeableConcept} />
            </Button>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
