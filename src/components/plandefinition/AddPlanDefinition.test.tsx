import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../testUtils/render';
import { AddPlanDefinition } from './AddPlanDefinition';

const mockSearchResources = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockFhirUrl = vi.hoisted(() => vi.fn(() => 'PlanDefinition/pd-1/$apply'));
const mockShowNotification = vi.hoisted(() => vi.fn());

vi.mock('@mantine/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/notifications')>();
  return {
    ...actual,
    showNotification: mockShowNotification,
  };
});

vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Modal: ({ opened, children, title }: { opened: boolean; children: ReactNode; title?: ReactNode }) =>
      opened ? (
        <div>
          <div>{title}</div>
          {children}
        </div>
      ) : null,
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({
      searchResources: mockSearchResources,
      post: mockPost,
      fhirUrl: mockFhirUrl,
    }),
  };
});

describe('AddPlanDefinition', () => {
  test('loads plan definitions when opening modal', async () => {
    mockSearchResources.mockResolvedValue([{ resourceType: 'PlanDefinition', id: 'pd-1', name: 'Cardiology plan' }]);
    render(<AddPlanDefinition encounterId="enc-1" patientId="pat-1" onApply={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Care Template' }));

    await waitFor(() => {
      expect(mockSearchResources).toHaveBeenCalledWith('PlanDefinition', undefined);
    });
  });

  test('applies selected plan definition', async () => {
    const onApply = vi.fn();
    mockSearchResources.mockResolvedValue([{ resourceType: 'PlanDefinition', id: 'pd-1', name: 'Cardiology plan' }]);
    mockPost.mockResolvedValue({ resourceType: 'Parameters' });

    render(<AddPlanDefinition encounterId="enc-1" patientId="pat-1" onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Care Template' }));

    await waitFor(() => {
      expect(screen.getByText('Cardiology plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cardiology plan'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Care Template' })[1]);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
      expect(onApply).toHaveBeenCalled();
    });
  });
});
