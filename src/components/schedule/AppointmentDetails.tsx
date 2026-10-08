import { Button, Stack, Text, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { createReference, formatHumanName, isReference } from '@medplum/core';
import type { Appointment, EpisodeOfCare, Patient, PlanDefinition, Practitioner } from '@medplum/fhirtypes';
import { Form, ResourceInput, useMedplum } from '@medplum/react';
import { useResource } from '@medplum/react-hooks';
import { IconAlertSquareRounded } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { createEncounter } from '../../utils/encounter';
import { encounterClass } from '../../utils/encounterClass';
import { showErrorNotification } from '../../utils/notifications';
import { recordPatientActivity } from '../../utils/patientActivity';
import { PlanDefinitionSummary } from '../plandefinition/PlanDefinitionSummary';

type UpdateAppointmentFormProps = {
  appointment: Appointment;
  onUpdate: (appointment: Appointment) => void;
};

function UpdateAppointmentForm(props: UpdateAppointmentFormProps): JSX.Element {
  const medplum = useMedplum();
  const [patient, setPatient] = useState<Patient | undefined>(undefined);

  const { appointment, onUpdate } = props;
  const handleSubmit = useCallback(async () => {
    if (!patient) {
      return;
    }
    const updated = {
      ...appointment,
      participant: [
        ...appointment.participant,
        {
          actor: createReference(patient),
          status: 'tentative',
        },
      ],
    } satisfies Appointment;

    let result: Appointment;
    try {
      result = await medplum.updateResource(updated);
    } catch (error) {
      showErrorNotification(error);
      return;
    }
    recordPatientActivity(medplum, patient.id);
    onUpdate?.(result);
  }, [medplum, patient, appointment, onUpdate]);

  return (
    <Form onSubmit={handleSubmit}>
      <Stack gap="md">
        <ResourceInput
          label="Patient"
          resourceType="Patient"
          name="Patient-id"
          required={true}
          onChange={(value) => setPatient(value as Patient)}
        />

        <Button fullWidth type="submit">
          Update Appointment
        </Button>
      </Stack>
    </Form>
  );
}

// This component is used when an appointment does not have a related Encounter
// that we can direct the viewer to. It allows us to show some details for
// appointments that are not fully configured and offer UI to complete set up.
//
// As one example, this can be used after a patient has scheduled an appointment
// via $find/$hold to set up an Encounter and apply a plan definition to it.
export function AppointmentDetails(props: {
  appointment: Appointment;
  onUpdate: (appointment: Appointment) => void;
}): JSX.Element {
  const medplum = useMedplum();
  const [planDefinition, setPlanDefinition] = useState<PlanDefinition | undefined>();

  // Extract references to a Patient and a Practitioner from `Appointment.participants`; we expect
  // one of each.
  const participants = props.appointment.participant.map((p) => p.actor);
  const patientRef = participants.find((r) => isReference<Patient>(r, 'Patient'));
  const practitionerRef = participants.find((r) => isReference<Practitioner>(r, 'Practitioner'));

  const patient = useResource(patientRef);
  const navigate = useNavigate();

  const handleSubmit = useCallback(async () => {
    if (!patient) {
      showNotification({
        color: 'yellow',
        icon: <IconAlertSquareRounded />,
        title: 'Error',
        message: 'Patient not loaded',
      });
      return;
    }

    if (!practitionerRef) {
      showNotification({
        color: 'yellow',
        icon: <IconAlertSquareRounded />,
        title: 'Error',
        message: 'Appointment has no Practitioner participant',
      });
      return;
    }

    if (!planDefinition) {
      showNotification({
        color: 'yellow',
        icon: <IconAlertSquareRounded />,
        title: 'Error',
        message: 'Please fill out required fields.',
      });
      return;
    }

    try {
      const episodeRef = props.appointment.supportingInformation?.find((ref) =>
        isReference<EpisodeOfCare>(ref, 'EpisodeOfCare')
      );
      const episodeOfCare = episodeRef ? ((await medplum.readReference(episodeRef)) as EpisodeOfCare) : undefined;

      const encounter = await createEncounter(
        medplum,
        encounterClass,
        patient,
        planDefinition,
        props.appointment,
        practitionerRef,
        episodeOfCare
      );

      navigate(`/Patient/${patient.id}/Encounter/${encounter.id}`, {
        state: episodeOfCare?.id ? { targetEpisodeId: episodeOfCare.id } : undefined,
      })?.catch(console.error);
      recordPatientActivity(medplum, patient.id);
    } catch (err) {
      showErrorNotification(err);
    }
  }, [medplum, patient, planDefinition, props.appointment, navigate, practitionerRef]);

  return (
    <Stack gap="md" style={{ padding: 10 }}>
      <Text size="lg" mt="-4px" fw={600} c="var(--mantine-color-dark-9)">
        {new Date(props.appointment.start as string).toLocaleDateString()}{' '}
        {new Date(props.appointment.start as string).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        - {new Date(props.appointment.end as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {!patientRef && <UpdateAppointmentForm appointment={props.appointment} onUpdate={props.onUpdate} />}

      {!!patient && (
        <>
          <div>
            <h3>Setup Care Template</h3>
            <Form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  name="patient"
                  label="Patient"
                  defaultValue={formatHumanName(patient.name?.[0])}
                  disabled={true}
                  styles={{
                    input: { color: 'var(--mantine-color-gray-8)', opacity: 1 },
                  }}
                />
                <ResourceInput<Practitioner>
                  name="practitioner"
                  resourceType="Practitioner"
                  label="Practitioner"
                  defaultValue={practitionerRef}
                  disabled={true}
                  required={true}
                />

                <ResourceInput<PlanDefinition>
                  name="plandefinition"
                  resourceType="PlanDefinition"
                  label="Care Template"
                  onChange={setPlanDefinition}
                  required={true}
                />

                <PlanDefinitionSummary planDefinition={planDefinition} />

                <Button fullWidth type="submit" disabled={!planDefinition}>
                  Apply Care Template
                </Button>
              </Stack>
            </Form>
          </div>
        </>
      )}
    </Stack>
  );
}
