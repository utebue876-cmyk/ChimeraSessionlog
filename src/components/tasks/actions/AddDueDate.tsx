import { Button, Group, Stack, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { MedplumClient, PatchOperation } from '@medplum/core';
import { getQuestionnaireAnswers, normalizeErrorString } from '@medplum/core';
import type { Questionnaire, QuestionnaireResponse, Task, TaskRestriction } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum } from '@medplum/react';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import type { JSX } from 'react';
import { recordPatientActivity } from '../../../utils/patientActivity';
import { AppModal } from '../../modal/AppModal';

interface AddDueDateProps {
  readonly task: Task;
  readonly onChange: (updatedTask: Task) => void;
}

export function AddDueDate(props: AddDueDateProps): JSX.Element {
  const medplum = useMedplum();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleAddDueDate = async (
    date: string,
    task: Task,
    medplum: MedplumClient,
    onChange: (task: Task) => void
  ): Promise<void> => {
    const taskId = task.id as string;

    // We use a patch operation here to avoid race conditions. This ensures that if multiple users try to update the due-date simultaneously, only one will be successful.
    const ops: PatchOperation[] = [{ op: 'test', path: '/meta/versionId', value: task.meta?.versionId }];

    // Create a restriction period with the due-date if one doesn't already exist and add it to the PatchOperation. For more details on task due-dates, see https://www.medplum.com/docs/careplans/tasks#task-start--due-dates
    const restriction: TaskRestriction = {
      ...task.restriction,
      period: {
        ...task?.restriction?.period,
        end: date,
      },
    };

    const op: PatchOperation['op'] = task.restriction ? 'replace' : 'add';

    ops.push({ op, path: '/restriction', value: restriction });

    // Patch the resource with the new due-date
    try {
      const result = await medplum.patchResource('Task', taskId, ops);
      recordPatientActivity(medplum, task.for?.reference?.replace('Patient/', ''));
      notifications.show({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Due-date updated.',
      });
      onChange(result);
    } catch (error) {
      notifications.show({
        color: 'red',
        icon: <IconCircleOff />,
        title: 'Error',
        message: normalizeErrorString(error),
      });
    }
  };

  const onQuestionnaireSubmit = (formData: QuestionnaireResponse): void => {
    const dueDate = getQuestionnaireAnswers(formData)['due-date'].valueDate;

    if (dueDate) {
      handleAddDueDate(dueDate, props.task, medplum, props.onChange).catch((error) => console.error(error));
    }

    close();
  };

  return (
    <div>
      {props.task.restriction?.period?.end ? (
        <Button fullWidth onClick={toggle}>
          Change Due-Date
        </Button>
      ) : (
        <Button fullWidth onClick={toggle}>
          Add Due-Date
        </Button>
      )}
      <AppModal
        opened={opened}
        onClose={close}
        title={
          <Group>
            <Title order={4} c="white">
              {props.task.restriction?.period?.end ? 'Change Due-Date' : 'Add Due-Date'}
            </Title>
          </Group>
        }
        size="md"
      >
        <Stack mt="md">
          <QuestionnaireForm questionnaire={dueDateQuestionnaire} onSubmit={onQuestionnaireSubmit} />
        </Stack>
      </AppModal>
    </div>
  );
}

const dueDateQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  id: 'due-date',
  // title: 'Due-Date',
  item: [
    {
      linkId: 'due-date',
      text: 'The date the task should be completed',
      type: 'date',
    },
  ],
};
