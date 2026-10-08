import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { DeleteTask } from './DeleteTask';

const mockDeleteResource = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('../../modal/AppModal', () => ({
  AppModal: ({ opened, children, title }: { opened: boolean; children: ReactNode; title?: ReactNode }) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ deleteResource: mockDeleteResource }),
  };
});

describe('DeleteTask', () => {
  test('deletes task after confirmation', async () => {
    mockDeleteResource.mockResolvedValue({});
    render(
      <DeleteTask task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order' }} onChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(mockDeleteResource).toHaveBeenCalledWith('Task', 't1');
      expect(mockNavigate).toHaveBeenCalledWith('/Task');
    });
  });
});
