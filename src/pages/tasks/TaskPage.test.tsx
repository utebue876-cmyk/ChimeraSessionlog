import { MantineProvider } from '@mantine/core';
import type { Task } from '@medplum/fhirtypes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TaskPage } from './TaskPage';

const medplumState = vi.hoisted(() => ({
  readResource: vi.fn(),
  readReference: vi.fn(),
}));

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useMedplumNavigate: () => navigateSpy,
  Document: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./TaskDetails', () => ({
  TaskDetails: () => <div>Task Details Content</div>,
}));

vi.mock('./NotesPage', () => ({
  NotesPage: () => <div>Task Notes Content</div>,
}));

vi.mock('../../components/tasks/actions/TaskActions', () => ({
  TaskActions: () => <div>Task Actions Content</div>,
}));

describe('TaskPage', () => {
  const task: Task = {
    resourceType: 'Task',
    id: 'task-1',
    status: 'requested',
    intent: 'order',
    description: 'Test task',
    for: { reference: 'Patient/p1' },
    focus: { reference: 'EpisodeOfCare/e1' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ id: 'task-1', patientId: 'p1' } as any);
    medplumState.readResource.mockImplementation(async (type: string, id: string) => {
      if (type === 'Task') return task;
      if (type === 'Patient') return { resourceType: 'Patient', id };
      return undefined;
    });
    medplumState.readReference.mockResolvedValue({
      resourceType: 'EpisodeOfCare',
      id: 'e1',
      identifier: [{ value: 'CASE-22' }],
    });
  });

  test('shows loading fallback before task is loaded', () => {
    medplumState.readResource.mockImplementation(() => new Promise(() => undefined));

    render(
      <MantineProvider>
        <TaskPage />
      </MantineProvider>
    );

    expect(screen.getByText('No Task found')).toBeInTheDocument();
  });

  test('renders details and actions after task load', async () => {
    render(
      <MantineProvider>
        <TaskPage />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test task')).toBeInTheDocument();
    });

    expect(screen.getByText('Task Details Content')).toBeInTheDocument();
    expect(screen.getByText('Task Actions Content')).toBeInTheDocument();
  });

  test('switches to notes tab content', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <TaskPage />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Notes' }));

    expect(navigateSpy).toHaveBeenCalled();
  });
});
