import type { MedplumClient } from '@medplum/core';
import { resolveId } from '@medplum/core';
import type { EpisodeOfCare, Task } from '@medplum/fhirtypes';
import type { NavigateFunction } from 'react-router';
import { CASE_TASK_IDENTIFIER_URL } from '../config/chimera-urls';

// Whether a task is a requested "schedule assessment" task (completed once the first appointment is created)...
export function isRequestedScheduleAssessmentTask(task: Task): boolean {
  return (
    task.status === 'requested' &&
    !!task.identifier?.some(
      (identifier) =>
        identifier.system === CASE_TASK_IDENTIFIER_URL && identifier.value?.endsWith(':schedule-assessment')
    )
  );
}

// Whether any task is a requested "schedule assessment" task (completed once the first appointment is created)...
export function hasRequestedScheduleAssessmentTask(tasks: Task[] | undefined): boolean {
  return !!tasks?.some(isRequestedScheduleAssessmentTask);
}

/**
 * Opens the "New appointment" EncounterModal for a requested "schedule assessment" task, activating
 * the episode of care (from `task.basedOn`) that the new appointment needs to be booked under.
 *
 * @param medplum - The Medplum client, used to fetch the task's episode of care.
 * @param setActiveEpisode - Setter for the globally active episode of care.
 * @param navigate - The router navigate function.
 * @param task - The requested "schedule assessment" task that was clicked.
 */
export async function openScheduleAssessmentEncounter(
  medplum: MedplumClient,
  setActiveEpisode: (episode: EpisodeOfCare | undefined) => void,
  navigate: NavigateFunction,
  task: Task
): Promise<void> {
  const patientId = resolveId(task.for);
  const episodeReference = task.basedOn?.find((ref) => ref.reference?.startsWith('EpisodeOfCare/'));
  const episodeId = episodeReference ? resolveId(episodeReference) : undefined;

  if (!patientId || !episodeId) {
    return;
  }

  const episodeOfCare = await medplum.readResource('EpisodeOfCare', episodeId);
  setActiveEpisode(episodeOfCare);
  // Pass the task via route state so EncounterModal can mark it completed once the appointment is created...
  await navigate(`/Patient/${patientId}/Encounter/new`, { state: { scheduleAssessmentTask: task } });
}
