import { Alert, Button, Checkbox, Group, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import type { Slot } from '@medplum/fhirtypes';
import { IconX } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppModal } from '../../components/modal/AppModal';
import type { BlockSelection } from './useSchedulePage';

const BLOCK_REASONS = [
  { value: 'Annual Leave', label: 'Annual Leave' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Training', label: 'Training' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Other', label: 'Other' },
];

interface BlockPaneProps {
  readonly slots: Slot[];
  readonly selection: BlockSelection | undefined;
  readonly errorMessage?: string;
  readonly canBlockSelectedSchedule: boolean;
  readonly onSelectionChange: (selection: BlockSelection | undefined) => void;
  readonly onConfirm: () => Promise<void>;
  readonly onCancel: () => void;
  readonly pendingRemoveSlot?: Slot;
  readonly onConfirmRemove?: () => Promise<void>;
  readonly onCancelRemove?: () => void;
  readonly className?: string;
}

export function BlockPane({
  slots,
  selection,
  errorMessage,
  canBlockSelectedSchedule,
  onSelectionChange,
  onConfirm,
  onCancel,
  pendingRemoveSlot,
  onConfirmRemove,
  onCancelRemove,
  className,
}: BlockPaneProps): JSX.Element {
  const timeOptions = useMemo(() => buildTimeOptions(slots), [slots]);
  const [localSelection, setLocalSelection] = useState<BlockSelection | undefined>(selection);

  useEffect(() => {
    setLocalSelection(selection);
  }, [selection]);

  const updateSelection = (nextSelection: BlockSelection | undefined): void => {
    setLocalSelection(nextSelection);
    onSelectionChange(nextSelection);
  };

  const currentSelection = localSelection ?? selection;
  const startDate = formatDateInputValue(currentSelection?.start);
  const endDate = formatDateInputValue(currentSelection?.end);
  const startTime = currentSelection?.start ? formatTimeInputValue(currentSelection.start) : '';
  const endTime = currentSelection?.end ? formatTimeInputValue(currentSelection.end) : '';
  const allDay = currentSelection?.allDay ?? false;

  return (
    <>
      <Paper
        radius="md"
        className={className}
        style={{
          background: 'var(--mantine-color-gray-0)',
          minWidth: 320,
          maxWidth: 320,
          paddingLeft: '15px',
          paddingRight: '15px',
          paddingBottom: '10px',
          paddingTop: '0px',
          marginTop: '0px',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Stack gap="sm">
          <Title order={4}>
            <Group justify="space-between">
              <span>Block Availability</span>
              <Button variant="filled" onClick={() => onCancel()} aria-label="Clear selection" p={4} size="compact-md">
                <IconX size={16} />
              </Button>
            </Group>
          </Title>
          {canBlockSelectedSchedule ? (
            <Stack
              mt="sm"
              mb="sm"
              bg="var(--mantine-color-blue-0)"
              p="sm"
              style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-blue-4)' }}
            >
              <Text size="sm">
                To block availability, drag on the calendar to choose a range, or edit the dates below. Once you are
                happy with your selection, click "Block". To unblock a slot, click on the blocked slot in the calendar
                and confirm when prompted.
              </Text>
            </Stack>
          ) : (
            <Alert
              mt="sm"
              mb="sm"
              variant="light"
              color="orange"
              style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-orange-4)' }}
            >
              You can only block your own calendar.
            </Alert>
          )}

          {errorMessage && (
            <Alert
              variant="light"
              color="red"
              style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-red-4)' }}
            >
              {errorMessage}
            </Alert>
          )}

          {currentSelection ? (
            <>
              <Group align="flex-end" grow>
                <TextInput
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    if (!currentSelection) return;
                    const nextDate = parseDateInputValue(event.currentTarget.value);
                    if (!nextDate) return;
                    updateSelection({
                      ...currentSelection,
                      start: mergeDateAndTime(nextDate, startTime),
                      end: mergeDateAndTime(nextDate, endTime),
                    });
                  }}
                />
                <Select
                  label="Start time"
                  data={timeOptions}
                  value={startTime}
                  onChange={(value) => {
                    if (!currentSelection || !value) return;
                    const nextStart = mergeDateAndTime(parseDateInputValue(startDate) ?? new Date(), value);
                    updateSelection({ ...currentSelection, start: nextStart });
                  }}
                  disabled={allDay}
                  searchable
                  allowDeselect={false}
                />
              </Group>

              <Group align="flex-end" grow>
                <TextInput
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    if (!currentSelection) return;
                    const nextDate = parseDateInputValue(event.currentTarget.value);
                    if (!nextDate) return;
                    updateSelection({
                      ...currentSelection,
                      start: mergeDateAndTime(parseDateInputValue(startDate) ?? nextDate, startTime),
                      end: mergeDateAndTime(nextDate, endTime),
                    });
                  }}
                />
                <Select
                  label="End time"
                  data={timeOptions}
                  value={endTime}
                  onChange={(value) => {
                    if (!currentSelection || !value) return;
                    const nextEnd = mergeDateAndTime(parseDateInputValue(endDate) ?? new Date(), value);
                    updateSelection({ ...currentSelection, end: nextEnd });
                  }}
                  disabled={allDay}
                  searchable
                  allowDeselect={false}
                />
              </Group>

              <Checkbox
                label="All day"
                checked={allDay}
                onChange={(event) => {
                  if (!currentSelection) return;
                  const checked = event.currentTarget.checked;
                  updateSelection({
                    ...currentSelection,
                    allDay: checked,
                    start: checked
                      ? startOfDay(parseDateInputValue(startDate) ?? currentSelection.start)
                      : currentSelection.start,
                    end: checked
                      ? endOfDay(parseDateInputValue(endDate) ?? currentSelection.end)
                      : currentSelection.end,
                  });
                }}
              />

              <Select
                label="Reason"
                placeholder="Select reason (optional)"
                data={BLOCK_REASONS}
                value={currentSelection?.reason ?? null}
                onChange={(value) => {
                  if (!currentSelection) return;
                  updateSelection({ ...currentSelection, reason: value ?? undefined });
                }}
                clearable
              />

              <Group justify="center" mt="md" grow>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateSelection({ start: startOfDay(new Date()), end: endOfDay(new Date()), allDay: true })
                  }
                >
                  Reset to Today
                </Button>

                <Button disabled={!canBlockSelectedSchedule} onClick={() => onConfirm().catch(console.error)}>
                  Block
                </Button>
              </Group>
            </>
          ) : (
            <Alert variant="light" color="blue">
              Select a range on the calendar to begin blocking.
            </Alert>
          )}
        </Stack>
      </Paper>

      <AppModal
        opened={!!pendingRemoveSlot}
        onClose={onCancelRemove ?? (() => undefined)}
        title={
          <Group>
            <Title order={4} c="white">
              Unblock Slot
            </Title>
          </Group>
        }
      >
        <Stack gap="md">
          <Text size="md" fw={400} mt="sm">
            Are you sure you want to unblock this slot?
            <br />
            {pendingRemoveSlot
              ? ` (${formatTimeInputValue(new Date(pendingRemoveSlot.start))} – ${formatTimeInputValue(new Date(pendingRemoveSlot.end))})`
              : ''}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={onCancelRemove}>
              No
            </Button>
            <Button color="red" onClick={() => onConfirmRemove?.().catch(console.error)}>
              Yes, unblock
            </Button>
          </Group>
        </Stack>
      </AppModal>
    </>
  );
}

function buildTimeOptions(slots: Slot[]): string[] {
  const values = new Set<string>();

  slots
    .filter((slot) => slot.status === 'free')
    .forEach((slot) => {
      values.add(formatTimeInputValue(new Date(slot.start)));
      values.add(formatTimeInputValue(new Date(slot.end)));
    });

  if (values.size === 0) {
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      values.add(formatMinutes(minutes));
    }
  }

  return Array.from(values).sort((a, b) => minutesFromTime(a) - minutesFromTime(b));
}

function formatDateInputValue(date: Date | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatMinutes(totalMinutes: number): string {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

function parseDateInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function mergeDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map((part) => Number(part));
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
