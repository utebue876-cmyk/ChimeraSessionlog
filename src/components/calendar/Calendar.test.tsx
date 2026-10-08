import type { Appointment, Slot } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '../../testUtils/render';
import type { Range } from '../../types/scheduling';
import type { ScheduleAvailability } from '../../utils/scheduling';
import * as schedulingUtils from '../../utils/scheduling';
import { Calendar } from './Calendar';

// Mock document.elementFromPoint for react-big-calendar Selection
document.elementFromPoint = vi.fn(() => null);

describe('Calendar', () => {
  const setup = ({
    slots = [],
    appointments = [],
    onSelectInterval,
    onSelectSlot,
    onSelectAppointment,
    onRangeChange,
    availability,
  }: {
    slots?: Slot[];
    appointments?: Appointment[];
    onSelectInterval?: () => void;
    onSelectSlot?: (slot: Slot) => void;
    onSelectAppointment?: (appointment: Appointment) => void;
    onRangeChange?: (range: Range) => void;
    availability?: ScheduleAvailability;
  } = {}): ReturnType<typeof render> => {
    return render(
      <Calendar
        slots={slots}
        appointments={appointments}
        onSelectInterval={onSelectInterval}
        onSelectSlot={onSelectSlot}
        onSelectAppointment={onSelectAppointment}
        onRangeChange={onRangeChange}
        availability={availability}
      />
    );
  };

  describe('CalendarToolbar', () => {
    test('renders toolbar with navigation buttons', async () => {
      setup();

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByLabelText('Next')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous')).toBeInTheDocument();
    });

    test('renders view switcher with Month, Week, Day options', async () => {
      setup();
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Day')).toBeInTheDocument();
    });

    test('displays current month/year in title for non-day views', async () => {
      setup();

      // Check for month/year format (e.g., "January 2024")
      const title = screen.getByText(/\w+\s+\d{4}/);
      expect(title).toBeInTheDocument();
    });

    test('navigates to previous period when clicking prev button', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(onRangeChange).toHaveBeenCalled();

      const initialCallCount = onRangeChange.mock.calls.length;

      // Navigation should trigger a range change
      await userEvent.click(screen.getByLabelText('Previous'));
      expect(onRangeChange.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    test('navigates to next period when clicking next button', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(onRangeChange).toHaveBeenCalled();

      const initialCallCount = onRangeChange.mock.calls.length;

      // Navigation should trigger a range change
      await userEvent.click(screen.getByLabelText('Next'));
      expect(onRangeChange.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    test('navigates to today when clicking today button', async () => {
      setup();

      // First navigate away from today
      await userEvent.click(screen.getByLabelText('Previous'));

      // Then click today
      await userEvent.click(screen.getByText('Today'));

      // Should be back to current month
      const title = screen.getByRole('heading', { level: 5 }).textContent;
      const today = new Date();
      const expectedYear = today.getFullYear().toString();
      expect(title).toContain(expectedYear);
    });

    test('switches to day view and triggers range change', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });

      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(onRangeChange).toHaveBeenCalled();

      const initialCallCount = onRangeChange.mock.calls.length;

      // Click on the Day option in the SegmentedControl
      await userEvent.click(screen.getByText('Day'));

      // Day view should trigger a range change with different range
      expect(onRangeChange.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    test('switches between views', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });

      const callsBefore = onRangeChange.mock.calls.length;

      // Switch to Month view via Select
      await userEvent.click(screen.getByText('Month'));
      expect(onRangeChange.mock.calls.length).toBeGreaterThan(callsBefore);

      const callsAfterMonth = onRangeChange.mock.calls.length;

      // Switch to Day view
      await userEvent.click(screen.getByText('Day'));
      expect(onRangeChange.mock.calls.length).toBeGreaterThan(callsAfterMonth);
    });
  });

  describe('onRangeChange', () => {
    test('calls onRangeChange on initial render', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });
      expect(onRangeChange).toHaveBeenCalled();

      const range = onRangeChange.mock.calls[0][0];
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    test('calls onRangeChange when navigating', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });
      expect(onRangeChange).toHaveBeenCalled();

      const initialCallCount = onRangeChange.mock.calls.length;

      // Navigate to next period
      const nextButton = screen.getByLabelText('Next');
      await userEvent.click(nextButton);

      expect(onRangeChange.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    test('calls onRangeChange when switching views', async () => {
      const onRangeChange = vi.fn();
      setup({ onRangeChange });
      expect(onRangeChange).toHaveBeenCalled();

      const initialCallCount = onRangeChange.mock.calls.length;

      // Switch to month view
      await userEvent.click(screen.getByText('Month'));
      expect(onRangeChange.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('styling', () => {
    test('applies custom style prop', async () => {
      const { container } = render(
        <Calendar slots={[]} appointments={[]} style={{ height: '500px', width: '100%' }} />
      );
      const calendar = container.querySelector('[data-testid="calendar"]');
      expect(calendar).toHaveStyle({ height: '500px', width: '100%' });
    });

    test('wrapper has chimera-calendar class for scoped CSS', () => {
      const { container } = render(<Calendar slots={[]} appointments={[]} />);
      const calendar = container.querySelector('[data-testid="calendar"]');
      expect(calendar).toHaveClass('chimera-calendar');
    });
  });

  describe('availability prop', () => {
    const workingHoursAvailability: ScheduleAvailability = {
      windows: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], startMinutes: 9 * 60, endMinutes: 17 * 60 }],
      timezone: 'UTC',
    };

    test('renders without error when availability with windows is provided', () => {
      setup({ availability: workingHoursAvailability });
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    test('renders without error when availability has no windows', () => {
      setup({ availability: { windows: [], timezone: 'UTC' } });
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    test('calls isSlotWithinAvailability when availability with windows is provided', async () => {
      const spy = vi.spyOn(schedulingUtils, 'isSlotWithinAvailability');

      setup({ availability: workingHoursAvailability });

      // RBC calls slotPropGetter for every time-slot row it renders in the time grid
      expect(spy).toHaveBeenCalled();
      const [, passedAvailability] = spy.mock.calls[0];
      expect(passedAvailability).toEqual(workingHoursAvailability);

      spy.mockRestore();
    });

    test('does not call isSlotWithinAvailability when no availability is provided', () => {
      const spy = vi.spyOn(schedulingUtils, 'isSlotWithinAvailability');

      setup();

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('applies gray-0 background for slots outside availability', () => {
      // Force isSlotWithinAvailability to return false so every slot is "outside"
      vi.spyOn(schedulingUtils, 'isSlotWithinAvailability').mockReturnValue(false);

      const { container } = render(<Calendar slots={[]} appointments={[]} availability={workingHoursAvailability} />);

      const graySlots = container.querySelectorAll('[style*="gray-0"]');
      expect(graySlots.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    test('falls through to external slotPropGetter when slot is within availability', () => {
      vi.spyOn(schedulingUtils, 'isSlotWithinAvailability').mockReturnValue(true);
      const externalGetter = vi.fn().mockReturnValue({ className: 'my-slot' });

      render(
        <Calendar
          slots={[]}
          appointments={[]}
          availability={workingHoursAvailability}
          slotPropGetter={externalGetter}
        />
      );

      expect(externalGetter).toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    test('grays out future cells after the last free slot ends when no availability windows', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      const spy = vi.spyOn(schedulingUtils, 'isSlotWithinAvailability');

      const freeSlot: Slot = {
        resourceType: 'Slot',
        id: 'free-1',
        status: 'free',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T10:30:00Z',
        schedule: { reference: 'Schedule/1' },
      };

      const { container } = render(
        <Calendar slots={[freeSlot]} appointments={[]} availability={{ windows: [], timezone: 'UTC' }} />
      );

      // No windows → isSlotWithinAvailability must not be called
      expect(spy).not.toHaveBeenCalled();

      // Cells after the free slot end (10:30) should be gray-0
      const graySlots = container.querySelectorAll('[style*="gray-0"]');
      expect(graySlots.length).toBeGreaterThan(0);

      spy.mockRestore();
      vi.useRealTimers();
    });
  });
});
