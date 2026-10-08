import type { WithId } from '@medplum/core';
import { createReference } from '@medplum/core';
import type { Encounter, Patient, Practitioner, Questionnaire, Task } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';
import { showErrorNotification } from '../../utils/notifications';

export interface UseQuestionnaireTaskPickerProps {
  encounter: WithId<Encounter>;
  patient: WithId<Patient>;
  practitioner?: WithId<Practitioner>;
  existingTasks: WithId<Task>[];
  onTaskCreated: (task: WithId<Task>) => void;
}

export interface UseQuestionnaireTaskPickerResult {
  selectedQuestionnaireId: string;
  setSelectedQuestionnaireId: (value: string) => void;
  isCreating: boolean;
  options: Array<{ value: string; label: string }>;
  canCreateTask: boolean;
  handleCreateTask: () => Promise<void>;
}

export function useQuestionnaireTaskPicker(props: UseQuestionnaireTaskPickerProps): UseQuestionnaireTaskPickerResult {
  const { encounter, patient, practitioner, existingTasks, onTaskCreated } = props;
  const medplum = useMedplum();
  const [questionnaires, setQuestionnaires] = useState<WithId<Questionnaire>[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function fetchQuestionnaires(): Promise<void> {
      const results = await medplum.searchResources('Questionnaire', '_count=200&status=active');
      setQuestionnaires(results as WithId<Questionnaire>[]);
    }

    fetchQuestionnaires().catch(showErrorNotification);
  }, [medplum]);

  const excludedQuestionnaireRefs = useMemo(() => {
    const refs = new Set<string>();
    for (const task of existingTasks) {
      const focusRef = task.focus?.reference;
      if (focusRef?.startsWith('Questionnaire/')) {
        refs.add(focusRef);
      }

      for (const input of task.input ?? []) {
        const inputRef = input.valueReference?.reference;
        if (inputRef?.startsWith('Questionnaire/')) {
          refs.add(inputRef);
        }
      }
    }
    return refs;
  }, [existingTasks]);

  const availableQuestionnaires = useMemo(
    () => questionnaires.filter((q) => !excludedQuestionnaireRefs.has(`Questionnaire/${q.id}`)),
    [questionnaires, excludedQuestionnaireRefs]
  );

  const options = useMemo(
    () => [
      { value: '', label: 'Select questionnaire' },
      ...availableQuestionnaires.map((q) => ({
        value: q.id,
        label: q.title ?? q.name ?? q.url ?? q.id,
      })),
    ],
    [availableQuestionnaires]
  );

  useEffect(() => {
    if (selectedQuestionnaireId && !availableQuestionnaires.some((q) => q.id === selectedQuestionnaireId)) {
      setSelectedQuestionnaireId('');
    }
  }, [availableQuestionnaires, selectedQuestionnaireId]);

  const canCreateTask = !!selectedQuestionnaireId && !isCreating;

  const handleCreateTask = async (): Promise<void> => {
    if (!selectedQuestionnaireId) {
      return;
    }

    const questionnaire = availableQuestionnaires.find((q) => q.id === selectedQuestionnaireId);
    if (!questionnaire) {
      return;
    }

    setIsCreating(true);
    try {
      const reference = createReference(questionnaire);
      const createdTask = await medplum.createResource<Task>({
        resourceType: 'Task',
        status: 'draft',
        intent: 'order',
        code: { text: questionnaire.title ?? questionnaire.name ?? 'Questionnaire' },
        description: questionnaire.description,
        encounter: createReference(encounter),
        for: createReference(patient),
        owner: practitioner ? createReference(practitioner) : undefined,
        focus: reference,
        input: [
          {
            type: { text: 'Questionnaire' },
            valueReference: reference,
          },
        ],
      });

      onTaskCreated(createdTask as WithId<Task>);
      setSelectedQuestionnaireId('');
    } catch (err) {
      showErrorNotification(err);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    selectedQuestionnaireId,
    setSelectedQuestionnaireId,
    isCreating,
    options,
    canCreateTask,
    handleCreateTask,
  };
}
