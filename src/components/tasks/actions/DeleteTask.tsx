import { Button, Group, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { MedplumClient } from '@medplum/core';
import { normalizeErrorString } from '@medplum/core';
import type { Task } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import type { JSX } from 'react';
import type { NavigateFunction } from 'react-router';
import { useNavigate } from 'react-router';
import { AppModal } from '../../modal/AppModal';

interface DeleteTaskProps {
  readonly task: Task;
  readonly onChange: (updatedTask: Task) => void;
}

export function DeleteTask(props: DeleteTaskProps): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleDelete = async (task: Task, medplum: MedplumClient, navigate: NavigateFunction): Promise<void> => {
    // Get the task id
    const taskId = task.id as string;

    try {
      // Delete the task and navigate back to the main page
      await medplum.deleteResource('Task', taskId);
      notifications.show({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Task deleted',
      });
      navigate('/Task')?.catch(console.error);
    } catch (error) {
      notifications.show({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(error),
      });
    }
  };

  return (
    <div>
      <Button fullWidth onClick={toggle} color="red">
        Delete Task
      </Button>
      <AppModal
        opened={opened}
        onClose={close}
        title={
          <Group>
            <Title order={4} c="white">
              Delete Task
            </Title>
          </Group>
        }
      >
        <Text mt="md">Are you sure you wish to delete this task?</Text>
        <Group mt={20} justify="flex-end">
          <Button onClick={close} color="blue" variant="outline">
            Cancel
          </Button>
          <Button onClick={() => handleDelete(props.task, medplum, navigate)} color="red">
            Yes, Delete
          </Button>
        </Group>
      </AppModal>
    </div>
  );
}
