import { notifications } from '@mantine/notifications';
import { createReference, normalizeErrorString } from '@medplum/core';
import type { CodeableConcept, EpisodeOfCare, Patient, Practitioner, Reference, Task } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useEpisodeOfCare } from '../../hooks/useEpisodeOfCare';
import type { FieldErrors } from '../../hooks/useFieldErrors';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { usePatient } from '../../hooks/usePatient';
import { useEpisodeOfCareStore } from '../../store/episodeOfCareStore';
import { recordPatientActivity } from '../../utils/patientActivity';

export type NewTaskModalField = 'title' | 'episodeOfCare' | 'status' | 'priority' | 'taskPatient' | 'assignee';

export interface UseNewTaskModalProps {
  opened: boolean;
  onClose: () => void;
  onTaskCreated?: (task: Task) => void;
}

export interface UseNewTaskModalResult {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  intent: string;
  setIntent: (value: string) => void;
  status: Task['status'] | undefined;
  setStatus: (value: Task['status'] | undefined) => void;
  priority: string | undefined;
  setPriority: (value: string | undefined) => void;
  assignee: Reference<Practitioner> | undefined;
  setAssignee: (value: Reference<Practitioner> | undefined) => void;
  dueDate: string | Date | undefined;
  setDueDate: (value: string | Date | undefined) => void;
  taskPatient: Reference<Patient> | undefined;
  setTaskPatient: (value: Reference<Patient> | undefined) => void;
  taskCode: CodeableConcept | undefined;
  setTaskCode: (value: CodeableConcept | undefined) => void;
  performerType: CodeableConcept | undefined;
  setPerformerType: (value: CodeableConcept | undefined) => void;
  isSubmitting: boolean;
  activeEpisode: EpisodeOfCare | undefined;
  episodeOfCareOptions: { value: string; label: string }[];
  episodeOfCareMap: Record<string, EpisodeOfCare>;
  selectedEpisodeOfCareId: string | null;
  setSelectedEpisodeOfCareId: (value: string | null) => void;
  isLoadingEpisodeOfCare: boolean;
  patient: ReturnType<typeof usePatient>;
  fieldErrors: FieldErrors<NewTaskModalField>;
  handleSubmit: () => Promise<void>;
  handleClose: () => void;
}

export function useNewTaskModal({ opened, onClose, onTaskCreated }: UseNewTaskModalProps): UseNewTaskModalResult {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const patient = usePatient({ ignoreMissingPatientId: true });
  const activeEpisode = useEpisodeOfCareStore((s) => s.activeEpisode);
  const { fieldErrors, setFieldErrors, clearFieldError, clearAllFieldErrors } = useFieldErrors<NewTaskModalField>();

  const [title, setTitleRaw] = useState('');
  const [description, setDescription] = useState('');
  const [intent, setIntent] = useState('order');
  const [status, setStatusRaw] = useState<Task['status'] | undefined>('draft');
  const [priority, setPriorityRaw] = useState<string | undefined>('routine');
  const [assignee, setAssigneeRaw] = useState<Reference<Practitioner> | undefined>();
  const [dueDate, setDueDate] = useState<string | Date | undefined>();
  const [taskPatient, setTaskPatientRaw] = useState<Reference<Patient> | undefined>();
  const [taskCode, setTaskCode] = useState<CodeableConcept | undefined>();
  const [performerType, setPerformerType] = useState<CodeableConcept | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setTitle = useCallback(
    (value: string) => {
      clearFieldError('title');
      setTitleRaw(value);
    },
    [clearFieldError]
  );

  const setStatus = useCallback(
    (value: Task['status'] | undefined) => {
      clearFieldError('status');
      setStatusRaw(value);
    },
    [clearFieldError]
  );

  const setPriority = useCallback(
    (value: string | undefined) => {
      clearFieldError('priority');
      setPriorityRaw(value);
    },
    [clearFieldError]
  );

  const setAssignee = useCallback(
    (value: Reference<Practitioner> | undefined) => {
      clearFieldError('assignee');
      setAssigneeRaw(value);
    },
    [clearFieldError]
  );

  const setTaskPatient = useCallback(
    (value: Reference<Patient> | undefined) => {
      clearFieldError('episodeOfCare');
      setTaskPatientRaw(value);
    },
    [clearFieldError]
  );

  const {
    options: episodeOfCareOptions,
    map: episodeOfCareMap,
    selectedId: selectedEpisodeOfCareId,
    setSelectedId: setSelectedEpisodeOfCareIdRaw,
    isLoading: isLoadingEpisodeOfCare,
  } = useEpisodeOfCare(taskPatient?.reference);

  const setSelectedEpisodeOfCareId = useCallback(
    (value: string | null) => {
      clearFieldError('episodeOfCare');
      setSelectedEpisodeOfCareIdRaw(value);
    },
    [clearFieldError, setSelectedEpisodeOfCareIdRaw]
  );

  useEffect(() => {
    if (opened && patient?.id) {
      setTaskPatientRaw(createReference(patient));
    }
  }, [opened, patient, activeEpisode]);

  const handleClose = useCallback((): void => {
    setTitleRaw('');
    setDescription('');
    setIntent('order');
    setStatusRaw('draft');
    setPriorityRaw('routine');
    setAssigneeRaw(undefined);
    setDueDate(undefined);
    setTaskCode(undefined);
    setPerformerType(undefined);
    setTaskPatientRaw(undefined);
    setIsSubmitting(false);
    clearAllFieldErrors();
    onClose();
  }, [clearAllFieldErrors, onClose]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    const errors: FieldErrors<NewTaskModalField> = {};

    if (!title.trim()) errors.title = 'Required';
    if (!status) errors.status = 'Required';
    if (!priority) errors.priority = 'Required';
    if (!taskPatient) errors.taskPatient = 'Required';
    if (!assignee) errors.assignee = 'Required';

    const episodeOfCareId = activeEpisode?.id ?? selectedEpisodeOfCareId;
    if (!episodeOfCareId) errors.episodeOfCare = 'Required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      notifications.show({
        color: 'yellow',
        title: 'Missing required fields',
        message: 'Please provide Title, Status, Priority, Patient, Assignee, and Case before creating a task.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newTask: Task = {
        resourceType: 'Task',
        status: status!,
        intent: intent as Task['intent'],
        priority: priority as Task['priority'],
        code: taskCode ?? { text: title },
        description: description.trim() || undefined,
        for: taskPatient,
        authoredOn: new Date().toISOString(),
        requester: profile ? createReference(profile) : undefined,
        owner: assignee,
        focus: createReference(
          episodeOfCareMap[episodeOfCareId ?? ''] ?? { resourceType: 'EpisodeOfCare', id: episodeOfCareId ?? undefined }
        ),
        performerType: performerType ? [performerType] : undefined,
        restriction: dueDate
          ? { period: { end: dueDate instanceof Date ? dueDate.toISOString() : dueDate } }
          : undefined,
      };

      const createdTask = await medplum.createResource(newTask);
      recordPatientActivity(medplum, taskPatient?.reference?.replace('Patient/', ''));

      notifications.show({
        color: 'green',
        title: 'Success',
        message: 'Task created successfully',
      });

      onTaskCreated?.(createdTask);
      handleClose();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Error',
        message: normalizeErrorString(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    activeEpisode,
    selectedEpisodeOfCareId,
    setFieldErrors,
    status,
    intent,
    priority,
    taskCode,
    description,
    taskPatient,
    profile,
    assignee,
    episodeOfCareMap,
    performerType,
    dueDate,
    medplum,
    onTaskCreated,
    handleClose,
  ]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    intent,
    setIntent,
    status,
    setStatus,
    priority,
    setPriority,
    assignee,
    setAssignee,
    dueDate,
    setDueDate,
    taskPatient,
    setTaskPatient,
    taskCode,
    setTaskCode,
    performerType,
    setPerformerType,
    isSubmitting,
    activeEpisode,
    episodeOfCareOptions,
    episodeOfCareMap,
    selectedEpisodeOfCareId,
    setSelectedEpisodeOfCareId,
    isLoadingEpisodeOfCare,
    patient,
    fieldErrors,
    handleSubmit,
    handleClose,
  };
}
