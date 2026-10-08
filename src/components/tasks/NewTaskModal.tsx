import { Box, Button, Grid, Group, Input, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { createReference } from '@medplum/core';
import type { CodeableConcept, Patient, Practitioner, Reference, Task } from '@medplum/fhirtypes';
import { CodeableConceptInput, CodeInput, ReferenceInput, ResourceInput } from '@medplum/react';
import type { JSX } from 'react';
import { AppModal } from '../modal/AppModal';
import { useNewTaskModal } from './useNewTaskModal';

export interface NewTaskModalProps {
  opened: boolean;
  onClose: () => void;
  onTaskCreated?: (task: Task) => void;
}

export function NewTaskModal(props: NewTaskModalProps): JSX.Element {
  const { opened, onClose, onTaskCreated } = props;

  const {
    title,
    setTitle,
    description,
    setDescription,
    status,
    setStatus,
    priority,
    setPriority,
    assignee: _assignee,
    setAssignee,
    dueDate,
    setDueDate,
    taskPatient,
    setTaskPatient,
    taskCode: _taskCode,
    setTaskCode: _setTaskCode,
    performerType: _performerType,
    setPerformerType,
    isSubmitting,
    activeEpisode,
    episodeOfCareOptions,
    selectedEpisodeOfCareId,
    setSelectedEpisodeOfCareId,
    isLoadingEpisodeOfCare,
    patient,
    fieldErrors,
    handleSubmit,
    handleClose,
  } = useNewTaskModal({ opened, onClose, onTaskCreated });

  return (
    <AppModal
      opened={opened}
      onClose={handleClose}
      size="xl"
      title={
        <Group>
          <Title order={4} component="div" c="white">
            New Task
          </Title>
        </Group>
      }
    >
      <Stack h="100%" justify="space-between" gap={0}>
        <Box flex={1} miw={0}>
          <Grid p="sm">
            <Grid.Col span={6} pr="sm">
              <Stack gap="sm">
                <Box>
                  <Stack gap="sm">
                    {!patient && (
                      <ResourceInput
                        label="Patient"
                        resourceType="Patient"
                        name="Patient-id"
                        required={true}
                        onChange={(value) => setTaskPatient(createReference(value as Patient))}
                      />
                    )}
                    {!activeEpisode && (
                      <Select
                        label="Case"
                        placeholder={
                          !taskPatient
                            ? 'Select patient first'
                            : isLoadingEpisodeOfCare
                              ? 'Loading cases...'
                              : 'Select case'
                        }
                        data={episodeOfCareOptions}
                        value={selectedEpisodeOfCareId}
                        onChange={setSelectedEpisodeOfCareId}
                        required
                        disabled={!taskPatient || isLoadingEpisodeOfCare}
                        searchable
                        clearable={false}
                        error={!!fieldErrors.episodeOfCare}
                      />
                    )}

                    <TextInput
                      label="Title"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(event) => setTitle(event.currentTarget.value)}
                      required
                      size="sm"
                      error={!!fieldErrors.title}
                    />

                    <Textarea
                      label="Description"
                      placeholder="Enter task description (optional)"
                      value={description}
                      onChange={(event) => setDescription(event.currentTarget.value)}
                      minRows={4}
                      autosize
                      maxRows={8}
                    />
                    <CodeInput
                      name="status"
                      label="Status"
                      binding="http://hl7.org/fhir/ValueSet/task-status"
                      maxValues={1}
                      defaultValue={status}
                      onChange={(value) => setStatus(value as Task['status'] | undefined)}
                      required
                      error={!!fieldErrors.status}
                    />

                    <label
                      htmlFor="dueDate"
                      style={{ fontSize: 13, fontWeight: 600, marginBottom: -10, display: 'block' }}
                    >
                      Due Date<span style={{ color: 'red' }}> *</span>
                    </label>
                    <Input
                      component="input"
                      type="date"
                      name="dueDate"
                      placeholder="Select due date (optional)"
                      defaultValue={dueDate?.toString()}
                      onChange={(event) => setDueDate(event.currentTarget.value)}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Grid.Col>

            <Grid.Col span={6} pl="sm">
              <Stack gap="sm">
                <Box>
                  <Stack gap="sm">
                    <CodeInput
                      name="priority"
                      label="Priority"
                      binding="http://hl7.org/fhir/ValueSet/request-priority"
                      maxValues={1}
                      defaultValue={priority}
                      onChange={(value) => setPriority(value || undefined)}
                      required
                      error={!!fieldErrors.priority}
                    />

                    <ResourceInput<Patient>
                      resourceType="Patient"
                      name="patient"
                      label="Patient"
                      placeholder="Select patient"
                      defaultValue={taskPatient}
                      onChange={(value: Patient | undefined) =>
                        setTaskPatient(value ? createReference(value) : undefined)
                      }
                      required
                      error={!!fieldErrors.taskPatient}
                    />

                    <Box>
                      <Text size="sm" fw={500} mb="xs">
                        Assignee <span style={{ color: 'red' }}>*</span>
                      </Text>
                      <div className={fieldErrors.assignee ? 'input-error-highlight' : undefined}>
                        <ReferenceInput
                          name="assignee"
                          targetTypes={['Practitioner', 'Organization']}
                          placeholder="Select assignee"
                          onChange={(value) => setAssignee(value as Reference<Practitioner>)}
                          required
                        />
                      </div>
                    </Box>

                    <CodeableConceptInput
                      name="performerType"
                      label="Performer Type"
                      placeholder="Select performer type (optional)"
                      binding="http://hl7.org/fhir/ValueSet/performer-role"
                      maxValues={1}
                      onChange={(value) => setPerformerType(value as CodeableConcept)}
                      path={'Task.performerType'}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Box>

        <Stack p="sm">
          <Button variant="filled" w="100%" onClick={handleSubmit} loading={isSubmitting}>
            Create Task
          </Button>
        </Stack>
      </Stack>
    </AppModal>
  );
}
