import { MantineProvider } from '@mantine/core';
import type { Task } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { NotesPage } from './NotesPage';

describe('NotesPage', () => {
  test('renders no notes state', () => {
    const task: Task = {
      resourceType: 'Task',
      id: 'task-1',
      status: 'requested',
      intent: 'order',
    };

    render(
      <MantineProvider>
        <NotesPage task={task} />
      </MantineProvider>
    );

    expect(screen.getByText('No Notes')).toBeInTheDocument();
  });

  test('renders notes sorted by most recent first', () => {
    const task: Task = {
      resourceType: 'Task',
      id: 'task-1',
      status: 'requested',
      intent: 'order',
      note: [
        { text: 'Old note', time: '2025-01-01T10:00:00Z' },
        { text: 'New note', time: '2025-01-02T10:00:00Z' },
      ],
    };

    render(
      <MantineProvider>
        <NotesPage task={task} />
      </MantineProvider>
    );

    const notes = screen.getAllByText(/note/i);
    expect(notes[0]).toHaveTextContent('New note');
    expect(notes[1]).toHaveTextContent('Old note');
  });
});
