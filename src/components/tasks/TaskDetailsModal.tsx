import { Box, Button, Card, Grid, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createReference, formatHumanName, normalizeErrorString } from '@medplum/core';
import type { Practitioner, Reference, Task } from '@medplum/fhirtypes';
import { CodeInput, Loading, ResourceInput, useMedplum, useMedplumProfile } from '@medplum/react';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { usePatient } from '../../hooks/usePatient';
import { DateTimeNoSeconds } from '../common/DateTimeNoSeconds';
import { AppModal } from '../modal/AppModal';
import classes from './TaskDetailsModal.module.css';

export const TaskDetailsModal = (): JSX.Element => {
  const { patientId, encounterId, taskId } = useParams();
  const patient = usePatient({ ignoreMissingPatientId: true });
  const medplum = useMedplum();
  const navigate = useNavigate();
  const author = useMedplumProfile();
  const [task, setTask] = useState<Task | undefined>(undefined);
  const [isOpened, setIsOpened] = useState(true);
  const [practitioner, setPractitioner] = useState<Practitioner | undefined>();
  const [dueDate, setDueDate] = useState<string | Date | undefined>(undefined);
  const [status, setStatus] = useState<Task['status'] | undefined>();
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    const fetchTask = async (): Promise<void> => {
      const task = await medplum.readResource('Task', taskId as string);
      setStatus(task.status as typeof status);
      setTask(task);
      setDueDate(task.restriction?.period?.end);
    };

    fetchTask().catch((err) => {
      notifications.show({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(err),
      });
    });
  }, [medplum, taskId]);

  const handleOnSubmit = async (): Promise<void> => {
    if (!task) {
      return;
    }

    const updatedTask: Task = {
      ...task,
    };

    const trimmedNote = note.trim();
    if (trimmedNote !== '') {
      updatedTask.note = [
        ...(task.note || []),
        {
          text: trimmedNote,
          authorReference: author && createReference(author),
          time: new Date().toISOString(),
        },
      ];
    }

    if (status) {
      updatedTask.status = status;
    }

    if (dueDate) {
      updatedTask.restriction = {
        ...updatedTask.restriction,
        period: {
          ...updatedTask.restriction?.period,
          end: dueDate.toString(),
        },
      };
    }

    if (practitioner) {
      updatedTask.owner = createReference(practitioner) as Reference<Practitioner>;
    }

    try {
      await medplum.updateResource(updatedTask);
      notifications.show({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Task updated',
      });
      setTask(updatedTask);
      navigate(`/Patient/${patientId}/Encounter/${encounterId}`)?.catch(console.error);
    } catch {
      notifications.show({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: 'Failed to update the task.',
      });
    }
  };

  if (!task) {
    return <Loading />;
  }

  return (
    <AppModal
      opened={isOpened}
      onClose={() => {
        navigate(-1)?.catch(console.error);
        setIsOpened(false);
      }}
      title={
        <Group>
          <Title order={4} component="div" c="white">
            Assessment Details & Notes
          </Title>
        </Group>
      }
      size="xl"
    >
      <Stack justify="space-between" gap={2} mt="xs">
        <Box flex={1}>
          <Grid p="xs">
            <Grid.Col span={6}>
              <Stack gap="xs">
                <Card p="md" radius="sm" className={classes.taskDetails}>
                  <Stack gap="xs">
                    <Text fz="lg" fw={700}>
                      {task?.code?.text}
                    </Text>
                    {task?.description && <Text>{task.description}</Text>}
                    {patient?.name && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text>View Patient:</Text>
                        <Button variant="outline" component={Link} to={`/Patient/${patient.id}`} ml="md" size="md">
                          {formatHumanName(patient.name?.[0])}
                        </Button>
                      </div>
                    )}
                  </Stack>
                </Card>

                <ResourceInput<Practitioner>
                  name="practitioner"
                  resourceType="Practitioner"
                  label="Assigned to"
                  defaultValue={task?.owner ? { reference: task.owner.reference } : undefined}
                  onChange={(value) => {
                    setPractitioner(value as Practitioner);
                  }}
                />

                <DateTimeNoSeconds
                  name="Due Date"
                  placeholder="End"
                  label="Due Date"
                  defaultValue={dueDate?.toString()}
                  onChange={setDueDate}
                />

                {task?.status && (
                  <CodeInput
                    name="status"
                    label="Status"
                    binding="http://hl7.org/fhir/ValueSet/task-status|4.0.1"
                    maxValues={1}
                    defaultValue={status}
                    onChange={(value) => {
                      if (value) {
                        setStatus(value as typeof status);
                      }
                    }}
                  />
                )}
              </Stack>
            </Grid.Col>

            <Grid.Col span={6}>
              <Stack gap="sm">
                <Text mb="-10px">Note</Text>
                <Textarea
                  placeholder="Add optional note to this task"
                  autosize
                  minRows={12}
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                />
              </Stack>
            </Grid.Col>
          </Grid>
        </Box>

        <Group p="xs" justify="flex-end" display="flex" gap="xs">
          <Button variant="filled" onClick={handleOnSubmit}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
};
