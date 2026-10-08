import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '../../testUtils/render';
import { ChangePractitionerModal } from './ChangePractitionerModal';

const mockUseChangePractitionerModal = vi.hoisted(() => vi.fn());

vi.mock('./useChangePractitionerModal', () => ({
  useChangePractitionerModal: mockUseChangePractitionerModal,
}));

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    ResourceInput: () => <div>Practitioner selector</div>,
  };
});

describe('ChangePractitionerModal', () => {
  test('renders practitioner selector and save button when practitioners are available', () => {
    const submit = vi.fn();
    mockUseChangePractitionerModal.mockReturnValue({
      practitioner: undefined,
      setPractitioner: vi.fn(),
      availablePractitioners: [{ id: 'pr-1', resourceType: 'Practitioner' }],
      isLoadingPractitioners: false,
      serviceTypeLabel: 'Follow up',
      dateLabel: 'Mon',
      timeSlotLabel: '10:00-10:30',
      isLoading: false,
      practitionerError: undefined,
      submit,
      handleClose: vi.fn(),
    });

    render(
      <ChangePractitionerModal
        opened={true}
        onClose={vi.fn()}
        appointment={{ resourceType: 'Appointment', status: 'booked', participant: [] }}
        encounter={{ resourceType: 'Encounter', status: 'in-progress', class: { code: 'AMB' } }}
      />
    );

    expect(screen.getByText('Practitioner selector')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(submit).toHaveBeenCalled();
  });

  test('shows no practitioners message when none are available', () => {
    mockUseChangePractitionerModal.mockReturnValue({
      practitioner: undefined,
      setPractitioner: vi.fn(),
      availablePractitioners: [],
      isLoadingPractitioners: false,
      serviceTypeLabel: 'Follow up',
      dateLabel: 'Mon',
      timeSlotLabel: '10:00-10:30',
      isLoading: false,
      practitionerError: undefined,
      submit: vi.fn(),
      handleClose: vi.fn(),
    });

    render(
      <ChangePractitionerModal
        opened={true}
        onClose={vi.fn()}
        appointment={{ resourceType: 'Appointment', status: 'booked', participant: [] }}
        encounter={{ resourceType: 'Encounter', status: 'in-progress', class: { code: 'AMB' } }}
      />
    );

    expect(screen.getByText('No other practitioners available for the selected time slot.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
