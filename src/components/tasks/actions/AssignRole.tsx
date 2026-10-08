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

interface AssignTaskProps {
  readonly task: Task;
  readonly onChange: (updatedTask: Task) => void;
}

export function AssignRole(props: AssignTaskProps): JSX.Element {
  const medplum = useMedplum();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleAssignToRole = async (
    role: Coding,
    task: Task,
    medplum: MedplumClient,
    onChange: (task: Task) => void
  ): Promise<void> => {
    const taskId = task.id as string;

    const updatedRole: CodeableConcept = { coding: [role] };

    const ops: PatchOperation[] = [{ op: 'test', path: '/meta/versionId', value: task.meta?.versionId }];
    const op: PatchOperation['op'] = task.performerType ? 'replace' : 'add';

    const updatedRoles = task.performerType ? [...task.performerType] : [];

    updatedRoles.push(updatedRole);

    ops.push({ op, path: '/performerType', value: updatedRoles });

    try {
      const result = await medplum.patchResource('Task', taskId, ops);
      recordPatientActivity(medplum, task.for?.reference?.replace('Patient/', ''));
      notifications.show({
        icon: <IconCircleCheck />,
        title: 'Success',
        message: 'Task assigned',
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
    const role = getQuestionnaireAnswers(formData)['assign-role'].valueCoding;

    if (role) {
      handleAssignToRole(role, props.task, medplum, props.onChange).catch((error) => console.error(error));
    }

    close();
  };

  return (
    <div>
      <Button fullWidth onClick={toggle}>
        Assign to a Role
      </Button>
      <AppModal
        opened={opened}
        onClose={close}
        title={
          <Group>
            <Title order={4} c="white">
              Assign to a Role
            </Title>
          </Group>
        }
        size="md"
      >
        <Stack mt="md">
          <QuestionnaireForm questionnaire={assignRoleQuestionnaire} onSubmit={onQuestionnaireSubmit} />
        </Stack>
      </AppModal>
    </div>
  );
}

const assignRoleQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  id: 'assign-role',
  // title: 'Assign to a Role',
  item: [
    {
      linkId: 'assign-role',
      text: 'Select Role',
      type: 'choice',
      answerValueSet: 'http://medplum.com/medplum-task-demo/practitioner-role-codes',
    },
  ],
};
