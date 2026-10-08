import { useMedplum, useSubscription } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { TaskListItem, toTaskListItems, UseTaskSearchPageResult } from '../pages/tasks/useTaskSearchPage';
import { isRequestedScheduleAssessmentTask, openScheduleAssessmentEncounter } from '../utils/scheduleAssessmentTask';
import { useActiveEpisode } from './useActiveEpisode';

export function useEpisodeTasksPage(pageSize: number): UseTaskSearchPageResult {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const { patientId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => Math.ceil(tasks.length / pageSize), [tasks.length, pageSize]);

  const { activeEpisode, setActiveEpisode } = useActiveEpisode();
  const episodeId = activeEpisode?.id;
  const episodeIdentifier = activeEpisode?.identifier?.[0]?.value;
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    if (!patientId || !episodeId) {
      setTasks([]);
      setCurrentPage(1);
      setLoading(false);
      return;
    }

    const episodeRef = `EpisodeOfCare/${episodeId}`;

    async function load(): Promise<void> {
      setLoading(true);
      setError(undefined);
      try {
        const results = await medplum.searchResources(
          'Task',
          [
            ['_count', '1000'],
            ['_sort', '-_lastUpdated'],
          ],
          { cache: 'no-cache' }
        );

        if (cancelled) return;

        const patientRef = `Patient/${patientId}`;
        const patientTasks = results.filter((t) => t.for?.reference === patientRef);
        // A task can link to the episode via `focus` (e.g. appointment tasks) or `basedOn` (e.g. schedule-assessment tasks).
        const filtered = patientTasks.filter(
          (task) => task.focus?.reference === episodeRef || task.basedOn?.some((ref) => ref.reference === episodeRef)
        );
        const items = await toTaskListItems(medplum, filtered);

        if (!cancelled) {
          setTasks(items);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('[useEpisodeTasksPage] search error:', err);
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
  }, [medplum, patientId, episodeId, refreshToken]);

  // Re-fetch tasks whenever one is created/updated/deleted for this patient, so the list (and the
  // "Schedule assessment" banner/New task button) reacts immediately to status changes made elsewhere.
  useSubscription(patientId ? `Task?patient=Patient/${patientId}` : undefined, refresh);

  const handleOpenTask = (task: TaskListItem): void => {
    if (isRequestedScheduleAssessmentTask(task.task)) {
      openScheduleAssessmentEncounter(medplum, setActiveEpisode, navigate, task.task).catch(console.error);
      return;
    }

    navigate(`/Patient/${patientId}/task/${task.task.id}`, { state: { targetEpisodeId: episodeId } })?.catch(
      console.error
    );
  };

  return { loading, error, tasks, currentPage, setCurrentPage, totalPages, handleOpenTask, refresh, episodeIdentifier };
}
