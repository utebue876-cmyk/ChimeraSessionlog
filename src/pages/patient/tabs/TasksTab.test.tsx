import { MantineProvider } from '@mantine/core';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TasksTab } from './TasksTab';

describe('TasksTab', () => {
  let medplum: MockClient;

  beforeEach(() => {
    medplum = new MockClient();
    vi.clearAllMocks();
  });

  const setup = (initialPath = '/Patient/patient-123/Task'): ReturnType<typeof render> => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Routes>
              <Route path="/Patient/:patientId/Task" element={<TasksTab />} />
              <Route path="/Patient/:patientId/Task/:taskId" element={<TasksTab />} />
            </Routes>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  };

  test('renders Active and Completed tabs', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
  });

  test('renders task table headers', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByText('Code')).toBeInTheDocument();
    });
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  test('renders empty table when no active episode', async () => {
    setup();

    // Without an active episode, the hook returns early with empty tasks.
    // The table renders with headers but no rows.
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    const rows = screen.queryAllByRole('row');
    // Only the header row should be present
    expect(rows).toHaveLength(1);
  });

  test('renders new task button', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New task' })).toBeInTheDocument();
    });
  });
});
