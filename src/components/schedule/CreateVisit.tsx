import { Button, Flex, Stack, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import type { Patient, PlanDefinition, Practitioner, Reference, Schedule } from '@medplum/fhirtypes';
import { Form, ResourceInput } from '@medplum/react';
import { IconAlertSquareRounded, IconCircleCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import type { Range } from '../../types/scheduling';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';
import { SchedulingTransientIdentifier } from '../../utils/scheduling';
import { SelectList } from '../common/SelectList';
import { PlanDefinitionSummary } from '../plandefinition/PlanDefinitionSummary';
import { useCreateVisit } from './useCreateVisit';

interface CreateVisitProps {
  appointmentSlot: Range | undefined;
  practitioner?: Practitioner | Reference<Practitioner>;
  schedule?: Schedule;
}

export function CreateVisit(props: CreateVisitProps): JSX.Element {
  const {
    patient,
    episodes,
    selectedEpisode,
    setSelectedEpisode,
    setPlanDefinitionData,
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId,
    selectedServiceType,
    formattedDate,
    formattedSlotTime,
    planDefinitionData,
    isLoading,
    handlePatientChange,
    handleSubmit,
  } = useCreateVisit(props);

  async function onSubmit(): Promise<void> {
    const hasRequiredFields = patient && planDefinitionData;
    if (!hasRequiredFields) {
      showNotification({
        color: 'yellow',
        icon: <IconAlertSquareRounded />,
        title: 'Error',
        message: 'Please fill out required fields.',
      });
      return;
    }
    await handleSubmit();
    showNotification({ icon: <IconCircleCheck />, title: 'Success', message: 'Visit created' });
  }

  return (
    <Form onSubmit={onSubmit}>
      <Flex direction="column" gap="md" h="100%" justify="space-between">
        <Stack gap="md" h="100%">
          <Stack gap={0}>
            <Title order={1} fw={500}>
              {formattedDate}
            </Title>
            <Text size="lg">{formattedSlotTime}</Text>
          </Stack>

          <ResourceInput
            label="Practitioner"
            resourceType="Practitioner"
            name="Practitioner-id"
            required={true}
            defaultValue={props.practitioner}
            disabled={true}
          />

          <ResourceInput
            label="Patient"
            resourceType="Patient"
            name="Patient-id"
            required={true}
            onChange={(value) => {
              handlePatientChange(value as Patient | undefined).catch(console.error);
            }}
          />

          <SelectList
            label="Case"
            placeholder={
              patient ? (episodes.length === 0 ? 'No cases found' : 'Select a case') : 'Select a patient first'
            }
            disabled={!patient || episodes.length === 0}
            data={episodes
              .filter((ep) => getCaseStatus(ep).toLowerCase() !== 'closed')
              .map((ep) => ({
                value: ep.id as string,
                label: ep.identifier?.[0]?.value ?? ep.id ?? 'Unknown',
              }))}
            value={selectedEpisode?.id ?? null}
            onChange={(id) => {
              setSelectedEpisode(id ? episodes.find((ep) => ep.id === id) : undefined);
            }}
            required={true}
            clearAriaLabel="Clear case"
          />

          {serviceTypes.length > 0 && (
            <SelectList
              label="Service Type"
              placeholder="Select a service type"
              data={serviceTypes.map((st, i) => ({
                value: String(i),
                label: st.text ?? st.coding?.[0]?.display ?? st.coding?.[0]?.code ?? 'Unknown',
              }))}
              value={selectedServiceTypeIndex !== undefined ? String(selectedServiceTypeIndex) : null}
              onChange={(val) => setSelectedServiceTypeIndex(val !== null ? Number(val) : undefined)}
              clearAriaLabel="Clear service type"
            />
          )}

          {serviceTypes.length > 0 && (
            <SelectList
              label="Time Slot"
              placeholder={
                !selectedServiceType
                  ? 'Select a service type first'
                  : availableSlots.length === 0
                    ? 'No slots available'
                    : 'Select a time slot'
              }
              disabled={!selectedServiceType || availableSlots.length === 0}
              data={availableSlots.map((slot) => ({
                value: SchedulingTransientIdentifier.get(slot) ?? '',
                label:
                  new Date(slot.start).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }) +
                  ' – ' +
                  new Date(slot.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
              }))}
              value={selectedSlotId}
              onChange={setSelectedSlotId}
              clearAriaLabel="Clear time slot"
            />
          )}

          <ResourceInput
            name="plandefinition"
            resourceType="PlanDefinition"
            label="Care Template"
            onChange={(value) => {
              setPlanDefinitionData(value as PlanDefinition);
            }}
            required={true}
          />
        </Stack>

        <PlanDefinitionSummary planDefinition={planDefinitionData} />

        <Button fullWidth mt="xl" type="submit" loading={isLoading} disabled={isLoading}>
          <Text ml="xs">Create Appointment</Text>
        </Button>
      </Flex>
    </Form>
  );
}
