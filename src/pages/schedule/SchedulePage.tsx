import { Alert, Box, Button, Divider, Drawer, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Practitioner, Reference } from '@medplum/fhirtypes';
import { ReferenceInput } from '@medplum/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { Calendar } from '../../components/calendar/Calendar';
import { ClinicalHoursMetrics } from '../../components/practitionerMetrics/ClinicalHoursMetrics';
import { PractitionerMetrics } from '../../components/practitionerMetrics/PractitionerMetrics';
import { usePractitionerMetrics } from '../../components/practitionerMetrics/usePractitionerMetrics';
import { AppointmentDetails } from '../../components/schedule/AppointmentDetails';
import { AppointmentInfo } from '../../components/schedule/AppointmentInfo';
import { CreateVisit } from '../../components/schedule/CreateVisit';
import { BlockPane } from './BlockPane';
import { FindPane } from './FindPane';
import classes from './SchedulePage.module.css';
import { useSchedulePage } from './useSchedulePage';

/**
 * Schedule page that displays the practitioner's schedule.
 * Allows the practitioner to create/update slots and create appointments.
 * @returns A React component that displays the schedule page.
 */
export function SchedulePage(): JSX.Element | null {
  const {
    createAppointmentOpened,
    createAppointmentHandlers,
    appointmentDetailsOpened,
    appointmentDetailsHandlers,
    appointmentInfoOpened,
    appointmentInfoHandlers,
    schedule,
    range,
    setRange,
    slots,
    appointments,
    appointmentSlot,
    appointmentDetails,
    selectedAppointment,
    selectedAppointmentEncounter,
    canShowSelectedAppointment,
    practitioner,
    workingWeekHours,
    clinicalHours,
    handleSelectInterval,
    handleSelectSlot,
    handleBookSuccess,
    handleSelectAppointment,
    handleShowAppointment,
    handleAppointmentUpdate,
    handleDeleteAppointment,
    handleActorChange,
    availability,
    mode,
    setMode,
    canBlockSelectedSchedule,
    blockSelection,
    setBlockSelection,
    blockError,
    handleConfirmBlock,
    pendingRemoveSlot,
    handleConfirmRemove,
    handleCancelRemove,
  } = useSchedulePage();

  const [metricsOpened, metricsHandlers] = useDisclosure(false);
  const [calendarView, setCalendarView] = useState<string>('week');
  const showClinicalHours = calendarView === 'week' || calendarView === 'work_week';
  const { clinicalHoursSummary } = usePractitionerMetrics(
    slots ?? [],
    appointments ?? [],
    range,
    workingWeekHours,
    clinicalHours
  );
  const height = window.innerHeight - 60;

  return (
    <Box pos="relative" bg="white" p="md" style={{ height }}>
      <div className={classes.wrapper}>
        <div className={classes.container}>
          <Stack bg="var(--mantine-color-gray-0)" style={{ minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <Box mb="sm" miw={320} p="sm">
              <Title order={4} mb="xs">
                Practitioner
              </Title>
              <ReferenceInput
                key={schedule?.id}
                name="schedule-actor"
                targetTypes={['Practitioner']}
                placeholder="Switch schedule..."
                defaultValue={schedule?.actor?.[0] as Reference<Practitioner>}
                onChange={handleActorChange}
              />
              {schedule?.serviceType && showClinicalHours && (
                <>
                  <div
                    style={{
                      borderRadius: 'var(--mantine-radius-sm)',
                      border: '1px solid var(--mantine-color-gray-4)',
                      backgroundColor: 'var(--mantine-color-white)',
                      display: 'flex',
                      flex: 1,
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      maxWidth: '300px',
                      paddingLeft: '10px',
                      paddingRight: '10px',
                      paddingBottom: '10px',
                      marginTop: '10px',
                    }}
                  >
                    <Group
                      align="flex-start"
                      justify="space-between"
                      wrap="nowrap"
                      gap="sm"
                      mt="xs"
                      style={{ width: '100%' }}
                    >
                      <Stack gap={8} style={{ flex: 1 }}>
                        <ClinicalHoursMetrics
                          clinicalHoursSummary={clinicalHoursSummary}
                          clinicalHours={clinicalHours}
                        />
                      </Stack>
                      <Button variant="outline" size="xs" onClick={metricsHandlers.open} style={{ marginLeft: 'auto' }}>
                        View
                      </Button>
                    </Group>
                  </div>
                  <SegmentedControl
                    mt="sm"
                    value={mode}
                    onChange={(value) => setMode(value as 'book' | 'block')}
                    data={[
                      { value: 'book', label: 'Book Appointments' },
                      { value: 'block', label: 'Manage Availability' },
                    ]}
                    style={{
                      backgroundColor: 'var(--mantine-color-white)',
                      border: '1px solid var(--mantine-color-gray-4)',
                    }}
                    styles={{
                      root: { height: 32, padding: 2, minHeight: 'unset' },
                      control: { height: '100%' },
                      indicator: { backgroundColor: 'var(--mantine-color-blue-2)', height: '100%' },
                      label: {
                        color: 'var(--mantine-color-gray-9)',
                        padding: '0 10px',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                      },
                    }}
                  />
                </>
              )}
            </Box>
            {mode === 'book' && schedule && range && (
              <>
                <Divider style={{ border: '8px solid var(--mantine-color-white)', marginTop: '-20px' }} />
                {!schedule?.serviceType && (
                  <div
                    style={{
                      display: 'flex',
                      flex: 1,
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      paddingLeft: '15px',
                      paddingRight: '15px',
                      maxWidth: '320px',
                    }}
                  >
                    <Alert
                      variant="light"
                      color="orange"
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        border: '1px solid var(--mantine-color-orange-4)',
                      }}
                    >
                      You have no schedules set up. Please create a schedule in the Practitioner profile.
                    </Alert>
                  </div>
                )}
                <FindPane
                  key={schedule.id}
                  schedule={schedule}
                  range={range}
                  blockedSlots={slots?.filter((s) => s.status === 'busy-unavailable')}
                  onSuccess={handleBookSuccess}
                  className={classes.findPane}
                />
              </>
            )}
            {mode === 'block' && schedule && (
              <>
                <Divider style={{ border: '8px solid var(--mantine-color-white)', marginTop: '-20px' }} />
                <BlockPane
                  slots={slots ?? []}
                  selection={blockSelection}
                  errorMessage={blockError}
                  canBlockSelectedSchedule={canBlockSelectedSchedule}
                  onSelectionChange={setBlockSelection}
                  onConfirm={handleConfirmBlock}
                  onCancel={() => setMode('book')}
                  pendingRemoveSlot={pendingRemoveSlot}
                  onConfirmRemove={handleConfirmRemove}
                  onCancelRemove={handleCancelRemove}
                  className={classes.findPane}
                />
              </>
            )}
          </Stack>
          <div className={classes.calendar}>
            <Calendar
              style={{ height: '100%' }}
              onSelectInterval={mode === 'block' ? handleSelectInterval : undefined}
              onSelectAppointment={handleSelectAppointment}
              onSelectSlot={handleSelectSlot}
              slots={slots ?? []}
              appointments={appointments ?? []}
              onRangeChange={setRange}
              onViewChange={setCalendarView}
              availability={availability}
              pendingBlock={
                mode === 'block' && blockSelection
                  ? { start: blockSelection.start, end: blockSelection.end }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {practitioner && (
        <Drawer
          opened={createAppointmentOpened}
          onClose={createAppointmentHandlers.close}
          title={
            <Text size="xl" fw={700} c="white">
              New Appointment
            </Text>
          }
          position="right"
          h="100%"
          styles={{
            header: { backgroundColor: 'var(--mantine-color-blue-9)', '--mantine-color-dimmed': 'white' },
            close: { color: 'white' },
            content: { borderTopLeftRadius: 15, borderBottomLeftRadius: 15 },
          }}
          closeButtonProps={{ className: classes.drawerCloseButton }}
        >
          <CreateVisit appointmentSlot={appointmentSlot} practitioner={practitioner} schedule={schedule} />
        </Drawer>
      )}

      <Drawer
        opened={appointmentDetailsOpened}
        onClose={appointmentDetailsHandlers.close}
        title={
          <Text size="xl" fw={700} c="white">
            Appointment Details
          </Text>
        }
        position="left"
        h="100%"
        styles={{
          header: { backgroundColor: 'var(--mantine-color-blue-9)', '--mantine-color-dimmed': 'white' },
          close: { color: 'white' },
          content: { borderTopRightRadius: 15, borderBottomRightRadius: 15 },
        }}
        closeButtonProps={{ className: classes.drawerCloseButton }}
      >
        {appointmentDetails && (
          <AppointmentDetails appointment={appointmentDetails} onUpdate={handleAppointmentUpdate} />
        )}
      </Drawer>

      <Drawer
        opened={appointmentInfoOpened}
        onClose={appointmentInfoHandlers.close}
        title={
          <Text size="xl" fw={700} c="white">
            Appointment Information
          </Text>
        }
        position="right"
        h="100%"
        styles={{
          header: { backgroundColor: 'var(--mantine-color-blue-9)', '--mantine-color-dimmed': 'white' },
          close: { color: 'white' },
          content: { borderTopLeftRadius: 15, borderBottomLeftRadius: 15 },
        }}
        closeButtonProps={{ className: classes.drawerCloseButton }}
      >
        {selectedAppointment && (
          <AppointmentInfo
            appointment={selectedAppointment}
            encounter={selectedAppointmentEncounter}
            canShowAppointment={canShowSelectedAppointment}
            onShowAppointment={handleShowAppointment}
            onClose={appointmentInfoHandlers.close}
            onDelete={handleDeleteAppointment}
          />
        )}
      </Drawer>

      <Drawer
        opened={metricsOpened}
        onClose={metricsHandlers.close}
        title={
          <Text size="xl" fw={700} c="white">
            Weekly Metrics
          </Text>
        }
        position="left"
        size="md"
        h="100%"
        styles={{
          header: { backgroundColor: 'var(--mantine-color-blue-9)', '--mantine-color-dimmed': 'white' },
          close: { color: 'white' },
          content: { borderTopRightRadius: 15, borderBottomRightRadius: 15 },
        }}
        closeButtonProps={{ className: classes.drawerCloseButton }}
      >
        <PractitionerMetrics
          slots={slots ?? []}
          appointments={appointments ?? []}
          range={range}
          workingWeekHours={workingWeekHours}
          clinicalHours={clinicalHours}
        />
      </Drawer>
    </Box>
  );
}
