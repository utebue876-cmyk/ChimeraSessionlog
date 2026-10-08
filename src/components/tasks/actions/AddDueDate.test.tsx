import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { AddDueDate } from './AddDueDate';

const mockPatchResource = vi.hoisted(() => vi.fn());

vi.mock('../../modal/AppModal', () => ({
  AppModal: ({ opened, children, title }: { opened: boolean; children: ReactNode; title?: ReactNode }) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('@medplum/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/core')>();
  return {
    ...actual,
    getQuestionnaireAnswers: () => ({ 'due-date': { valueDate: '2024-12-01' } }),
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ patchResource: mockPatchResource }),
    QuestionnaireForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
      <button onClick={() => onSubmit({})}>Submit due date</button>
    ),
  };
});

describe('AddDueDate', () => {
  test('opens modal and submits due date update', async () => {
    const onChange = vi.fn();
    mockPatchResource.mockResolvedValue({ resourceType: 'Task', id: 't1' });

    render(
      <AddDueDate
        task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order', meta: { versionId: '1' } }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Due-Date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit due date' }));

    await waitFor(() => {
      expect(mockPatchResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });
});
