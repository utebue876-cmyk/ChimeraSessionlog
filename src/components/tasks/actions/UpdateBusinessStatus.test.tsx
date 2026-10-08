import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { UpdateBusinessStatus } from './UpdateBusinessStatus';

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
    getQuestionnaireAnswers: () => ({ 'update-status': { valueCoding: { code: 'reviewed' } } }),
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ patchResource: mockPatchResource }),
    QuestionnaireForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
      <button onClick={() => onSubmit({})}>Submit status</button>
    ),
  };
});

describe('UpdateBusinessStatus', () => {
  test('opens modal and submits business status update', async () => {
    const onChange = vi.fn();
    mockPatchResource.mockResolvedValue({ resourceType: 'Task', id: 't1' });

    render(
      <UpdateBusinessStatus
        task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order', meta: { versionId: '1' } }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update Business Status' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit status' }));

    await waitFor(() => {
      expect(mockPatchResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });
});
