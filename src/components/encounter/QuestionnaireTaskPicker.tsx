import { ActionIcon, Group, NativeSelect, Tooltip } from '@mantine/core';
import type { WithId } from '@medplum/core';
import type { Encounter, Patient, Practitioner, Task } from '@medplum/fhirtypes';
import { IconPlus } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useQuestionnaireTaskPicker } from './useQuestionnaireTaskPicker';

interface QuestionnaireTaskPickerProps {
  encounter: WithId<Encounter>;
  patient: WithId<Patient>;
  practitioner?: WithId<Practitioner>;
  existingTasks: WithId<Task>[];
  onTaskCreated: (task: WithId<Task>) => void;
  disabled?: boolean;
}

export const QuestionnaireTaskPicker = (props: QuestionnaireTaskPickerProps): JSX.Element => {
  const { encounter, patient, practitioner, existingTasks, onTaskCreated, disabled = false } = props;
  const { selectedQuestionnaireId, setSelectedQuestionnaireId, isCreating, options, canCreateTask, handleCreateTask } =
    useQuestionnaireTaskPicker({ encounter, patient, practitioner, existingTasks, onTaskCreated });

  return (
    <Group align="end" gap="sm" data-testid="questionnaire-task-picker">
      <NativeSelect
        aria-label="Add questionnaire task"
        value={selectedQuestionnaireId}
        onChange={(e) => setSelectedQuestionnaireId(e.currentTarget.value)}
        data={options}
        disabled={disabled || isCreating}
      />
      <Tooltip label="Select a questionnaire to add" disabled={disabled || isCreating || !selectedQuestionnaireId}>
        <ActionIcon
          variant="filled"
          size="lg"
          color="var(--mantine-color-blue-6)"
          onClick={handleCreateTask}
          aria-label="Add questionnaire task"
          disabled={disabled || !canCreateTask}
          loading={isCreating}
          mb={1}
        >
          <IconPlus size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};
