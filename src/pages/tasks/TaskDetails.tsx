import { Badge, Group, Stack, Text } from '@mantine/core';
import { Task } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { getTaskPriorityColor, getTaskStatusColor } from '../../utils/statusColors';

const TITLE_WIDTH = 200;

interface TaskDetailsProps {
  task: Task;
  focusIdentifier: string | undefined;
}

export function TaskDetails({ task, focusIdentifier }: TaskDetailsProps): JSX.Element {
  return (
    <Stack gap={15} p={10}>
      <Group justify="space-between" mt={10}>
        <Group>
          <Text fw={500} w={TITLE_WIDTH}>
            Case ID:
          </Text>
          <Text style={{ fontWeight: 700 }}>{focusIdentifier ?? 'N/A'}</Text>
        </Group>
        <Badge size="lg" color={getTaskStatusColor(task.status)} variant="light">
          {task.status}
        </Badge>
      </Group>

      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Authored On:
        </Text>
        <Text>{task.authoredOn ? new Date(task.authoredOn).toLocaleDateString('en-GB') : 'N/A'}</Text>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Priority:
        </Text>
        <Badge size="md" color={getTaskPriorityColor(task.priority)} variant="light">
          {task.priority}
        </Badge>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Due Date:
        </Text>
        <Text>
          {task.restriction?.period?.end ? new Date(task.restriction?.period?.end).toLocaleDateString('en-GB') : 'N/A'}
        </Text>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Requester:
        </Text>
        <Text>{task.requester?.display || task.requester?.reference?.replace('Organization/', '') || 'N/A'}</Text>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Practitioner:
        </Text>
        <Text>{task.owner?.display || task.owner?.reference?.replace('Practitioner/', '') || 'N/A'}</Text>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Patient:
        </Text>
        <Text>{task.for?.display || task.for?.reference?.replace('Patient/', '') || 'N/A'}</Text>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Intent:
        </Text>
        <Text>{task.intent?.charAt(0).toUpperCase() + task.intent?.slice(1)}</Text>
      </Group>
      <Group>
        <Text fw={500} w={TITLE_WIDTH}>
          Number of Notes:
        </Text>
        <Text>{task.note?.length ?? 0}</Text>
      </Group>
    </Stack>
  );
}
