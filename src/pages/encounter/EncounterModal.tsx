import { Box, Button, Card, Grid, Group, Input, Stack, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { EpisodeOfCare, PlanDefinition, Practitioner, Task } from '@medplum/fhirtypes';
import { ResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { SelectList } from '../../components/common/SelectList';
import { AppModal } from '../../components/modal/AppModal';
import { PlanDefinitionSummary } from '../../components/plandefinition/PlanDefinitionSummary';
import { SchedulingTransientIdentifier } from '../../utils/scheduling';
import classes from './EncounterModal.module.css';
import { useEncounterModal } from './useEncounterModal';

interface EncounterModalProps {
  episodeOfCare?: EpisodeOfCare;
  opened?: boolean;
  onClose?: () => void;
}

export const EncounterModal = ({ episodeOfCare, opened, onClose }: EncounterModalProps): JSX.Element => {
  const location = useLocation();
  const scheduleAssessmentTask = (location.state as { scheduleAssessmentTask?: Task } | null)?.scheduleAssessmentTask;

  const {
    isOpen,
    handleClose,
    todayStr,
    practitioner,
    setPractitioner,
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex,
    selectedServiceType,
    appointmentDate,
    setAppointmentDate,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId,
    planDefinitionData,
    setPlanDefinitionData,
    isLoading,
    fieldErrors,
    submit,
  } = useEncounterModal({ episodeOfCare, opened, onClose, scheduleAssessmentTask });

  const handleCreateEncounter = async (): Promise<void> => {
    try {
      await submit();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: normalizeErrorString(err) });
    }
  };

  return (
    <AppModal
      opened={isOpen}
      onClose={handleClose}
      size="35%"
      title={
        <Group>
          <Title order={4} c="white">
            New Appointment
          </Title>
        </Group>
      }
    >
      <Stack h="100%" justify="space-between" gap={0} mt="sm">
        <Box flex={1} miw={0}>
          <Grid h="100%">
            <Grid.Col span={6}>
              <Stack gap="md">
                <ResourceInput
                  label="Practitioner"
                  resourceType="Practitioner"
                  name="Practitioner-id"
                  defaultValue={practitioner}
                  required={true}
                  onChange={(value) => setPractitioner(value as Practitioner | undefined)}
                  error={!!fieldErrors.practitioner}
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
                    required={true}
                    error={!!fieldErrors.serviceType}
                  />
                )}

                <Input.Wrapper label="Appointment Date" required>
                  <Input
                    component="input"
                    type="date"
                    value={appointmentDate}
                    min={todayStr}
                    onChange={(e) => setAppointmentDate(e.currentTarget.value)}
                  />
                </Input.Wrapper>

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
                      new Date(slot.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }) +
                      ' - ' +
                      new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                  }))}
                  value={selectedSlotId}
                  onChange={setSelectedSlotId}
                  clearAriaLabel="Clear time slot"
                  required={true}
                  error={!!fieldErrors.selectedSlot}
                />
              </Stack>
            </Grid.Col>

            <Grid.Col span={6}>
              <Card padding="lg" radius="md" className={classes.planDefinition} mt="22">
                <Text size="md" fw={600} mb="xs">
                  Apply Care Template
                </Text>
                <Text size="sm" color="dimmed" mb="lg">
                  You can select a template for new appointment. Tasks from the template will be automatically added to
                  the appointment.
                </Text>

                <ResourceInput
                  name="plandefinition"
                  resourceType="PlanDefinition"
                  label="Plan Definition"
                  onChange={(value) => setPlanDefinitionData(value as PlanDefinition)}
                  required={true}
                  error={!!fieldErrors.planDefinitionData}
                />

                <PlanDefinitionSummary planDefinition={planDefinitionData} />
              </Card>
            </Grid.Col>
          </Grid>
        </Box>

        <Box style={{ display: 'flex', justifyContent: 'flex-end' }} mt="md">
          <Button fullWidth={false} onClick={handleCreateEncounter} loading={isLoading} disabled={isLoading}>
            Create Appointment
          </Button>
        </Box>
      </Stack>
    </AppModal>
  );
};
