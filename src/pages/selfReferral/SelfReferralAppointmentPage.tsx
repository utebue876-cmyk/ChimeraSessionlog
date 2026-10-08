import { ActionIcon, Box, Button, Group, LoadingOverlay, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { Document } from '@medplum/react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import { SelfReferralStepper } from './SelfReferralStepper';
import { useSelfReferralAppointment } from './useSelfReferralAppointment';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatLocalDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SelfReferralAppointmentPage(): JSX.Element {
  const {
    dayColumns,
    filter,
    setFilter,
    loading,
    selectedTimeLabel,
    selectedDayIso,
    selectSlot,
    canGoBack,
    goBack,
    goForward,
    handleConfirm,
  } = useSelfReferralAppointment();

  const hasSelection = !!(selectedDayIso && selectedTimeLabel);
  const setStep = useSelfReferralStore((s) => s.setStep);
  const now = new Date();
  const todayIso = formatLocalDateIso(now);

  return (
    <Document width={800} fill>
      <Paper
        p="lg"
        style={{
          backgroundColor: 'var(--mantine-color-blue-9)',
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: 8,
          borderTopLeftRadius: 8,
        }}
      >
        <Stack gap="xs" align="left" c="white">
          <Title order={3}>Select Appointment Date and Time</Title>
          <Text size="sm" c="white">
            Please select a date and time that suits you
          </Text>
        </Stack>
      </Paper>

      <SelfReferralStepper currentStep={3} />

      <Group justify="space-between" m="md">
        <Group gap="xs">
          <Tooltip label="Show morning time slots" position="top" openDelay={500}>
            <Button
              size="sm"
              variant={filter === 'am' ? 'filled' : 'outline'}
              color="dark"
              onClick={() => setFilter('am')}
            >
              Morning
            </Button>
          </Tooltip>
          <Tooltip label="Show afternoon time slots" position="top" openDelay={500}>
            <Button
              size="sm"
              variant={filter === 'pm' ? 'filled' : 'outline'}
              color="dark"
              onClick={() => setFilter('pm')}
            >
              Afternoon
            </Button>
          </Tooltip>
          <Tooltip label="Show all time slots" position="top" openDelay={500}>
            <Button
              size="sm"
              variant={filter === 'all' ? 'filled' : 'outline'}
              color="dark"
              onClick={() => setFilter('all')}
            >
              Show all
            </Button>
          </Tooltip>
        </Group>
        <Group gap="xs">
          <Tooltip label="Go to previous week" position="top" openDelay={500}>
            <ActionIcon variant="outline" color="dark" size="lg" disabled={!canGoBack} onClick={goBack}>
              <IconChevronLeft size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Go to next week" position="top" openDelay={500}>
            <ActionIcon variant="outline" color="dark" size="lg" onClick={goForward}>
              <IconChevronRight size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Box pos="relative" style={{ minHeight: 200 }} m="md">
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Group align="flex-start" gap="xs" wrap="nowrap" style={{ width: '100%' }}>
          {dayColumns.map((col, _i) => {
            // day() → 0=Sun,1=Mon…6=Sat; map to Mon-based index 0–6
            const dayIndex = col.date.day() === 0 ? 6 : col.date.day() - 1;
            const dayLabel = DAY_LABELS[dayIndex] ?? '';
            const monthLabel = MONTH_LABELS[col.date.month()];
            const dayIso = col.date.format('YYYY-MM-DD');
            const headerLabel = `${dayLabel} ${col.date.date()} ${monthLabel}`;

            return (
              <Stack key={dayIso} gap={8} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <Text size="sm" fw={700} ta="center" c="dark" truncate mb={8}>
                  {headerLabel}
                </Text>
                {col.timeSlots.length === 0 && !loading && (
                  <Text size="xs" c="dimmed" ta="center">
                    —
                  </Text>
                )}
                {col.timeSlots.map((ts) => {
                  const isSelected = selectedDayIso === dayIso && selectedTimeLabel === ts.timeLabel;
                  const slotDateTime = new Date(`${dayIso}T${ts.timeLabel}:00`);
                  const isPastSlot = dayIso < todayIso || (dayIso === todayIso && slotDateTime < now);
                  return (
                    <Button
                      key={ts.timeLabel}
                      fullWidth
                      size="compact-xs"
                      variant={isSelected ? 'filled' : 'outline'}
                      color="dark"
                      style={{ fontSize: 'clamp(9px, 1.2vw, 12px)', padding: '2px 4px', height: 30 }}
                      onClick={() => selectSlot(dayIso, ts.timeLabel)}
                      disabled={isPastSlot || loading}
                    >
                      {ts.timeLabel}
                    </Button>
                  );
                })}
              </Stack>
            );
          })}
        </Group>
      </Box>

      <Group justify="right" m="lg">
        <Button size="md" variant="outline" color="blue" onClick={() => setStep(2)}>
          Previous
        </Button>
        <Button size="md" color="blue" disabled={!hasSelection} onClick={handleConfirm}>
          Next
        </Button>
      </Group>
    </Document>
  );
}
