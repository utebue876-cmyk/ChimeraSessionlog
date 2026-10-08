import { Button, Stack, Text } from '@mantine/core';
import type { Appointment, EpisodeOfCare, Patient, Slot } from '@medplum/fhirtypes';
import { Form, ResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';
import { SelectList } from '../common/SelectList';
import { useBookAppointmentForm } from './useBookAppointmentForm';

type BookAppointmentFormProps = {
  slot: Slot;
  onSuccess?: (result: { appointments: Appointment[]; slots: Slot[] }) => void;
};

export function BookAppointmentForm(props: BookAppointmentFormProps): JSX.Element {
  const { slot, onSuccess } = props;
  const { patient, loading, episodes, selectedEpisode, setSelectedEpisode, handlePatientChange, handleSubmit } =
    useBookAppointmentForm(slot, onSuccess);

  return (
    <Form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Text fw={500}>Appointment Time</Text>
        <Text
          id="slot"
          size="md"
          mt="-15px"
          fw={400}
          c="var(--mantine-color-dark)"
          style={{
            border: '1px solid var(--mantine-color-gray-4)',
            borderRadius: '3px',
            padding: '5px',
            paddingLeft: '8px',
            height: 34,
          }}
        >
          {new Date(slot.start).toLocaleDateString()}{' '}
          {new Date(slot.start).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          - {new Date(slot.end as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <ResourceInput
          label="Patient"
          resourceType="Patient"
          name="Patient-id"
          required={true}
          onChange={(value) => {
            handlePatientChange(value as Patient | undefined).catch(console.error);
          }}
          disabled={loading}
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
            setSelectedEpisode(id ? episodes.find((ep: EpisodeOfCare) => ep.id === id) : undefined);
          }}
          required={true}
          clearAriaLabel="Clear case"
        />

        <Button fullWidth type="submit" loading={loading} disabled={!patient || !selectedEpisode} mt="md">
          Create Appointment
        </Button>
      </Stack>
    </Form>
  );
}
