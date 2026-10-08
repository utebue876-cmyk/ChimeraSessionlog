import type { Slot } from '@medplum/fhirtypes';
import { within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent, waitFor } from '../../testUtils/render';
import { BlockPane } from './BlockPane';
import type { BlockSelection } from './useSchedulePage';

const baseSelection: BlockSelection = {
  start: new Date('2026-07-28T08:00:00.000Z'),
  end: new Date('2026-07-28T13:00:00.000Z'),
  allDay: false,
};

const freeSlots: Slot[] = [
  {
    resourceType: 'Slot',
    id: 'slot-1',
    status: 'free',
    start: '2026-07-28T08:00:00.000Z',
    end: '2026-07-28T08:30:00.000Z',
    schedule: { reference: 'Schedule/schedule-1' },
  },
  {
    resourceType: 'Slot',
    id: 'slot-2',
    status: 'free',
    start: '2026-07-28T09:00:00.000Z',
    end: '2026-07-28T09:30:00.000Z',
    schedule: { reference: 'Schedule/schedule-1' },
  },
];

describe('BlockPane', () => {
  test('shows guidance when no range is selected', () => {
    render(
      <BlockPane
        slots={freeSlots}
        selection={undefined}
        canBlockSelectedSchedule={true}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Select a range on the calendar to begin blocking/i)).toBeInTheDocument();
  });

  test('disables time pickers when all day is checked', async () => {
    const onSelectionChange = vi.fn();
    const user = userEvent.setup();

    render(
      <BlockPane
        slots={freeSlots}
        selection={baseSelection}
        canBlockSelectedSchedule={true}
        onSelectionChange={onSelectionChange}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByLabelText('All day'));

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        allDay: true,
      })
    );
    expect(screen.getByRole('textbox', { name: 'Start time' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'End time' })).toBeDisabled();
  });

  test('calls onConfirm when Block is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <BlockPane
        slots={freeSlots}
        selection={baseSelection}
        canBlockSelectedSchedule={true}
        onSelectionChange={vi.fn()}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Block' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  test('shows matching free slot times in the start time dropdown', async () => {
    const user = userEvent.setup();

    render(
      <BlockPane
        slots={freeSlots}
        selection={baseSelection}
        canBlockSelectedSchedule={true}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />
    );

    const startTimeInput = screen.getByRole('textbox', { name: 'Start time' });
    await user.click(startTimeInput);

    const listboxId = startTimeInput.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();

    const listbox = document.getElementById(listboxId ?? '');
    expect(listbox).toBeTruthy();

    const options = within(listbox as HTMLElement).getAllByRole('option', { hidden: true });
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  test('renders an error message when provided', () => {
    render(
      <BlockPane
        slots={freeSlots}
        selection={baseSelection}
        errorMessage="This range contains booked appointments."
        canBlockSelectedSchedule={true}
        onSelectionChange={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('This range contains booked appointments.')).toBeInTheDocument();
  });
});
