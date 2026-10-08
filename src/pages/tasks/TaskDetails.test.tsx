import { MantineProvider } from '@mantine/core';
import type { Task } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { TaskDetails } from './TaskDetails';

describe('TaskDetails', () => {
  test('renders populated task details', () => {
    const task: Task = {
      resourceType: 'Task',
      id: 'task-1',
      status: 'in-progress',
      intent: 'order',
      authoredOn: '2026-01-15T00:00:00Z',
      priority: 'urgent',
      restriction: { period: { end: '2026-01-20T00:00:00Z' } },
      requester: { display: 'Org A' },
      owner: { display: 'Dr Smith' },
      for: { display: 'Jane Doe' },
      note: [{ text: 'n1' }, { text: 'n2' }],
    };

    render(
      <MantineProvider>
        <TaskDetails task={task} focusIdentifier="CASE-123" />
      </MantineProvider>
    );

    expect(screen.getByText('CASE-123')).toBeInTheDocument();
    expect(screen.getByText('in-progress')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('Org A')).toBeInTheDocument();
    expect(screen.getByText('Dr Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('renders fallback values when optional fields are missing', () => {
    const task: Task = {
      resourceType: 'Task',
      id: 'task-2',
      status: 'requested',
      intent: 'order',
      priority: 'routine',
    };

    render(
      <MantineProvider>
        <TaskDetails task={task} focusIdentifier={undefined} />
      </MantineProvider>
    );

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.getByText('routine')).toBeInTheDocument();
  });
});
