import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TaskSearchPage } from './TaskSearchPage';

const episodeHookSpy = vi.hoisted(() => vi.fn());
const taskHookSpy = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useEpisodeTasksPage', () => ({
  useEpisodeTasksPage: (...args: any[]) => episodeHookSpy(...args),
}));

vi.mock('./useTaskSearchPage', () => ({
  useTaskSearchPage: (...args: any[]) => taskHookSpy(...args),
}));

vi.mock('../../hooks/useSortResults', () => ({
  useSortResults: (items: any[]) => ({
    sorted: items,
    sortCol: undefined,
    sortDir: undefined,
    handleSort: vi.fn(),
  }),
  SortIcon: () => <span data-testid="sort-icon" />,
}));

vi.mock('@medplum/react', () => ({
  useMedplumProfile: () => ({ resourceType: 'Practitioner', id: 'pr-1' }),
}));

vi.mock('../../components/tasks/NewTaskModal', () => ({
  NewTaskModal: ({ opened }: any) => (opened ? <div>New Task Modal</div> : null),
}));

describe('TaskSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const commonResult = {
      loading: false,
      tasks: [
        {
          task: {
            resourceType: 'Task',
            id: 'task-1',
            status: 'requested',
            intent: 'order',
            code: { text: 'Follow up' },
            priority: 'routine',
          },
          ownerDisplay: 'Owner',
          forDisplay: 'Jane Doe',
        },
      ],
      currentPage: 1,
      setCurrentPage: vi.fn(),
      totalPages: 1,
      handleOpenTask: vi.fn(),
      refresh: vi.fn(),
      episodeIdentifier: undefined,
    };

    episodeHookSpy.mockReturnValue({ ...commonResult, episodeIdentifier: 'CASE-123' });
    taskHookSpy.mockReturnValue(commonResult);
  });

  test('uses episode hook when mode is episode', () => {
    render(
      <MantineProvider>
        <TaskSearchPage mode="episode" />
      </MantineProvider>
    );

    expect(episodeHookSpy).toHaveBeenCalled();
    expect(screen.getByText('Case ID:')).toBeInTheDocument();
    expect(screen.getByText('CASE-123')).toBeInTheDocument();
  });

  test('uses task search hook for all mode and opens new task modal', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <TaskSearchPage mode="all" />
      </MantineProvider>
    );

    expect(taskHookSpy).toHaveBeenCalled();
    expect(screen.getByText('All Tasks:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New task' }));
    expect(screen.getByText('New Task Modal')).toBeInTheDocument();
  });
});
