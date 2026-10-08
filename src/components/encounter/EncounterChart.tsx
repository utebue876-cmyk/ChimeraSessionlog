import { Box, Card, Stack, Text, Textarea } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { Encounter, Reference } from '@medplum/fhirtypes';
import { Loading } from '@medplum/react';
import type { JSX } from 'react';
import { ChartNoteStatus } from '../../types/encounter';
import { TaskPanel } from '../tasks/encounter/TaskPanel';
import { BillingTab } from './BillingTab';
import { EncounterHeader } from './EncounterHeader';
import { QuestionnaireTaskPicker } from './QuestionnaireTaskPicker';
import { SignAddendum } from './SignAddendum';
import { useEncounterChart } from './useEncounterChart';

export interface EncounterChartProps {
  encounter: WithId<Encounter> | Reference<Encounter>;
}

export const EncounterChart = (props: EncounterChartProps): JSX.Element => {
  const { encounter: encounterProp } = props;
  const {
    activeTab,
    encounter,
    patientResource,
    claim,
    practitioner,
    tasks,
    clinicalImpression,
    chargeItems,
    provenances,
    chartNote,
    chartNoteStatus,
    setEncounter,
    setClaim,
    setPractitioner,
    setChargeItems,
    prependTask,
    updateTaskList,
    handleEncounterStatusChange,
    handleTabChange,
    handleChartNoteChange,
    handleSign,
  } = useEncounterChart(encounterProp);

  if (!patientResource || !encounter) {
    return <Loading />;
  }

  return (
    <>
      <Stack justify="space-between" gap={0} maw={800} mt="-5px" ml="-5px">
        <EncounterHeader
          encounter={encounter}
          chartNoteStatus={chartNoteStatus}
          practitioner={practitioner}
          onStatusChange={handleEncounterStatusChange}
          onTabChange={handleTabChange}
          onSign={handleSign}
        />
        <Box pl="md" pr="md" pb="md">
          {activeTab === 'notes' && (
            <Stack gap="md">
              <SignAddendum encounter={encounter} provenances={provenances} chartNoteStatus={chartNoteStatus} />

              {clinicalImpression && (
                <Card withBorder shadow="sm" mt="md">
                  <Text fw={600} size="lg" pb={5}>
                    Appointment Notes
                  </Text>
                  <Textarea
                    defaultValue={clinicalImpression.note?.[0]?.text}
                    value={chartNote}
                    onChange={handleChartNoteChange}
                    autosize
                    minRows={4}
                    maxRows={8}
                    disabled={chartNoteStatus === ChartNoteStatus.SignedAndLocked || encounter.status === 'finished'}
                  />
                </Card>
              )}

              <Card withBorder shadow="sm">
                <Text fw={600} size="lg" pb={5}>
                  Additional Questionnaires
                </Text>
                <Text size="sm" pb={10}>
                  You can select additional questionnaires outside of the plan definition and add them to the
                  appointment for the patient to complete.
                </Text>
                <QuestionnaireTaskPicker
                  encounter={encounter}
                  patient={patientResource}
                  practitioner={practitioner}
                  existingTasks={tasks}
                  onTaskCreated={prependTask}
                  disabled={chartNoteStatus === ChartNoteStatus.SignedAndLocked || encounter.status === 'finished'}
                />
              </Card>
              {tasks.map((task) => (
                <TaskPanel
                  key={task.id}
                  task={task}
                  onUpdateTask={updateTaskList}
                  enabled={chartNoteStatus !== ChartNoteStatus.SignedAndLocked && encounter.status !== 'finished'}
                />
              ))}
            </Stack>
          )}
          {activeTab === 'details' && (
            <BillingTab
              encounter={encounter}
              setEncounter={setEncounter}
              claim={claim}
              patient={patientResource}
              practitioner={practitioner}
              setPractitioner={setPractitioner}
              chargeItems={chargeItems}
              setChargeItems={setChargeItems}
              setClaim={setClaim}
              chartNoteStatus={chartNoteStatus}
            />
          )}
        </Box>
      </Stack>
    </>
  );
};
