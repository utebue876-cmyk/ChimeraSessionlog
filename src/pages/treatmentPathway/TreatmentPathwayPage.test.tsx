import { describe, expect, test, vi } from 'vitest';
import { act, render, screen, userEvent } from '../../testUtils/render';
import { TreatmentPathwayPage } from './TreatmentPathwayPage';

const mockOnConfirm = vi.hoisted(() => ({ fn: undefined as ((value: unknown) => void) | undefined }));

vi.mock('./TreatmentPathway', () => ({
  TreatmentPathway: ({ onConfirm }: { onConfirm: (value: unknown) => void }) => {
    mockOnConfirm.fn = onConfirm;
    return <div>treatment-pathway</div>;
  },
}));

vi.mock('./TreatmentCareplan', () => ({
  TreatmentCareplan: ({ onStartOver }: { onStartOver: () => void }) => (
    <div>
      treatment-careplan
      <button onClick={onStartOver}>Start over</button>
    </div>
  ),
}));

describe('TreatmentPathwayPage', () => {
  test('renders TreatmentPathway until a pathway is confirmed, then switches to TreatmentCareplan', async () => {
    render(<TreatmentPathwayPage />);

    expect(screen.getByText('treatment-pathway')).toBeInTheDocument();

    act(() => {
      mockOnConfirm.fn?.({
        pathwayLabel: 'CBT',
        sessionsAuthorised: 4,
        authorisationReference: 'AUTH-1',
        startedDate: '2026-01-01',
        caseLabel: 'CASE-001',
        funderLabel: 'Aviva Health',
      });
    });

    expect(await screen.findByText('treatment-careplan')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(await screen.findByText('treatment-pathway')).toBeInTheDocument();
  });
});
