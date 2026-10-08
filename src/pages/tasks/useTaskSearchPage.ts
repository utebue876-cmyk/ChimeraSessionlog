import type { WithId } from '@medplum/core';
import { formatHumanName, resolveId } from '@medplum/core';
import type { HumanName, Patient, Practitioner, Task } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useEpisodeOfCareStore } from '../../store/episodeOfCareStore';
import { isRequestedScheduleAssessmentTask, openScheduleAssessmentEncounter } from '../../utils/scheduleAssessmentTask';

export interface TaskListItem {
  readonly task: WithId<Task>;
  readonly ownerDisplay: string;
  readonly forDisplay: string;
}

export interface UseTaskSearchPageResult {
  loading: boolean;
  error?: string;
  tasks: TaskListItem[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  handleOpenTask: (task: TaskListItem) => void;
  refresh: () => void;
  episodeIdentifier?: string;
}

export async function resolveTaskDisplay(
  medplum: ReturnType<typeof useMedplum>,
  reference: string | undefined
): Promise<string> {
  if (!reference) return '';

  const id = resolveId({ reference } as { reference: string });
  if (!id) return reference;

  const resourceType = reference.split('/')[0];
  try {
    if (resourceType === 'Practitioner') {
      const p = await medplum.readResource('Practitioner', id);
      return formatHumanName((p as Practitioner).name?.[0] as HumanName) || reference;
    }
    if (resourceType === 'Patient') {
      const p = await medplum.readResource('Patient', id);
      return formatHumanName((p as Patient).name?.[0] as HumanName) || reference;
    }
    return reference;
  } catch {
    return reference;
  }
}

export async function toTaskListItems(medplum: ReturnType<typeof useMedplum>, tasks: Task[]): Promise<TaskListItem[]> {
  return Promise.all(
    tasks.map(async (task) => {
      const ownerRef = task.owner?.reference;
      const forRef = task.for?.reference;
      const ownerDisplay = task.owner?.display || (ownerRef ? await resolveTaskDisplay(medplum, ownerRef) : '');
      const forDisplay = task.for?.display || (forRef ? await resolveTaskDisplay(medplum, forRef) : '');
      return { task: task as WithId<Task>, ownerDisplay, forDisplay };
    })
  );
}

/**
 * @param pageSize - number of tasks per page
 * @param extraFilters - FHIR search param pairs. Pass `null` to skip fetching.
 */
export function useTaskSearchPage(pageSize: number, extraFilters: [string, string][] | null): UseTaskSearchPageResult {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const setActiveEpisode = useEpisodeOfCareStore((s) => s.setActiveEpisode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => Math.ceil(tasks.length / pageSize), [tasks.length, pageSize]);

  const filterKey = extraFilters === null ? null : JSON.stringify(extraFilters);
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    if (filterKey === null) {
      setTasks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const filters = JSON.parse(filterKey) as [string, string][];

    async function load(): Promise<void> {
      setLoading(true);
      setError(undefined);
      try {
        const results = await medplum.searchResources('Task', [
          ['_count', '1000'],
          ['_sort', '-_lastUpdated'],
          ...filters,
        ]);

        if (cancelled) return;

        const items = await toTaskListItems(medplum, results);

        if (!cancelled) {
          setTasks(items);
          setCurrentPage(1);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load tasks');
          setTasks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [medplum, filterKey, refreshToken]);

  const handleOpenTask = (task: TaskListItem): void => {
    if (isRequestedScheduleAssessmentTask(task.task)) {
      openScheduleAssessmentEncounter(medplum, setActiveEpisode, navigate, task.task).catch(console.error);
      return;
    }

    const patientId = resolveId(task.task.for);
    const targetEpisodeId = task.task.focus?.reference?.startsWith('EpisodeOfCare/')
      ? resolveId(task.task.focus)
      : undefined;

    if (patientId && targetEpisodeId) {
      navigate(`/Patient/${patientId}/task/${task.task.id}`, { state: { targetEpisodeId } })?.catch(console.error);
    } else {
      navigate(`/Task/${task.task.id}`)?.catch(console.error);
    }
  };

  return { loading, error, tasks, currentPage, setCurrentPage, totalPages, handleOpenTask, refresh };
}
