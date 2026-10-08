import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SearchPage } from './SearchPage';

const medplumState = vi.hoisted(() => ({}));
const navigateSpy = vi.hoisted(() => vi.fn());
const parseSearchRequestMock = vi.hoisted(() => vi.fn());
const formatSearchQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@medplum/core', () => ({
  Operator: { EQUALS: 'equals', NOT: 'not' },
  parseSearchRequest: (...args: any[]) => parseSearchRequestMock(...args),
  formatSearchQuery: (...args: any[]) => formatSearchQueryMock(...args),
  getReferenceString: () => 'Task/task-1',
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  Loading: () => <div>Loading</div>,
  Document: ({ children }: any) => <div>{children}</div>,
  SearchControl: ({ onNew }: any) => <button onClick={onNew}>Open Create Task</button>,
}));

vi.mock('../../components/tasks/actions/CreateTaskModal', () => ({
  CreateTaskModal: ({ opened }: any) => (opened ? <div>Create Task Modal</div> : null),
}));

vi.mock('../../utils/searchControl', () => ({
  getPopulatedSearch: (s: any) => s,
}));

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy as any);
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ pathname: '/Task', search: '?_count=20' } as any);
    parseSearchRequestMock.mockReturnValue({
      resourceType: 'Task',
      fields: ['code'],
      filters: [{ code: 'status:not', operator: 'equals', value: 'completed' }],
    });
    formatSearchQueryMock.mockReturnValue('?_count=20');
  });

  test('renders tabs for task searches', async () => {
    render(
      <MantineProvider>
        <SearchPage />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
    });
  });

  test('opens create task modal from search control action', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <SearchPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Open Create Task' }));

    expect(screen.getByText('Create Task Modal')).toBeInTheDocument();
  });
});
