import { Button, Group, Stack, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { MedplumClient, PatchOperation } from '@medplum/core';
import { getQuestionnaireAnswers, normalizeErrorString } from '@medplum/core';
import type { CodeableConcept, Coding, Questionnaire, QuestionnaireResponse, Task } from '@medplum/fhirtypes';
import { QuestionnaireForm, useMedplum } from '@medplum/react';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import type { JSX } from 'react';
import { recordPatientActivity } from '../../../utils/patientActivity';
import { AppModal } from '../../modal/AppModal';

interface UpdateBusinessStatusProps {
  readonly task: Task;
  readonly onChange: (updatedTask: Task) => void;
}

export function UpdateBusinessStatus(props: UpdateBusinessStatusProps): JSX.Element {
  const medplum = useMedplum();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleUpdateStatus = async (
    status: Coding,
    task: Task,
    medplum: MedplumClient,
    onChange: (task: Task) => void
  ): Promise<void> => {
    const taskId = task.id as string;

    // Create a businessStatus to add to the task. For more details, see https://www.medplum.com/docs/careplans/tasks#task-status
    const businessStatus: CodeableConcept = { coding: [status] };

    // We use a patch operation here to avoid race conditions. This ensures that if multiple users try to update the status simultaneously, only one will be successful.
    const ops: PatchOperation[] = [{ op: 'test', path: '/meta/versionId', value: task.meta?.versionId }];
    const op: PatchOperation['op'] = task.businessStatus ? 'replace' : 'add';

    ops.push({ op, path: '/businessStatus', value: businessStatus });

    // Patch the task with the new businessStatus
    try {
      const result = await medplum.patchResource('Task', taskId, ops);
      recordPatientActivity(medplum, task.for?.reference?.replace('Patient/', ''));
      notifications.show({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Status updated.',
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
    const status = getQuestionnaireAnswers(formData)['update-status'].valueCoding;

    if (status) {
      handleUpdateStatus(status, props.task, medplum, props.onChange).catch((error) => console.error(error));
    }

    close();
  };

  return (
    <div>
      <Button fullWidth onClick={toggle}>
        Update Business Status
      </Button>
      <AppModal
        opened={opened}
        onClose={close}
        title={
          <Group>
            <Title order={4} c="white">
              Update Business Status
            </Title>
          </Group>
        }
        size="md"
      >
        <Stack mt="md">
          <QuestionnaireForm questionnaire={updateStatusQuestionnaire} onSubmit={onQuestionnaireSubmit} />
        </Stack>
      </AppModal>
    </div>
  );
}

const updateStatusQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  id: 'update-status',
  // title: 'Update the Status of the Task',
  item: [
    {
      linkId: 'update-status',
      text: 'Update Status',
      type: 'choice',
      answerValueSet: 'https://medplum.com/medplum-task-example-app/task-status',
    },
  ],
};
