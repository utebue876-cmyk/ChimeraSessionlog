import { Box, Drawer, LoadingOverlay, Text } from '@mantine/core';
import type { JSX } from 'react';
import { Calendar } from '../../components/calendar/Calendar';
import { CalendarSchedule } from '../../components/calendar/CalendarSchedule';
import { AppointmentDetails } from '../../components/schedule/AppointmentDetails';
import { AppointmentInfo } from '../../components/schedule/AppointmentInfo';
import { BookAppointmentForm } from '../../components/schedule/BookAppointmentForm';
import classes from './ServiceSchedulePage.module.css';
import { ServiceSelectionPane } from './ServiceSelectionPane';
import { useServiceSchedulePage } from './useServiceSchedulePage';

export function ServiceSchedulePage(): JSX.Element {
  const {
    serviceTypeOptions,
    selectedServiceTypeKey,
    setSelectedServiceTypeKey,
    practitioners,
    practitionersLoading,
    selectedPractitioner,
    selectPractitioner,
    slotsLoading,
    slots,
    appointments,
    slotPropGetter,
    handleRangeChange,
    startLoading,
    bookingSlot,
    bookingDrawerOpen,
    setBookingDrawerOpen,
    handleSelectSlot,
    handleSelectAppointment,
    handleBookSuccess,
    appointmentDetails,
    appointmentDetailsOpen,
    setAppointmentDetailsOpen,
    selectedAppointment,
    selectedAppointmentEncounter,
    appointmentInfoOpen,
    setAppointmentInfoOpen,
    canShowSelectedAppointment,
    handleAppointmentUpdate,
    handleDeleteAppointment,
    handleShowAppointment,
    dayScheduleMode,
    dayScheduleDate,
    handleDaySchedule,
    exitDaySchedule,
    handleDayScheduleDate,
    practitionerSchedules,
    allPractitionersMode,
    handleAllPractitioners,
    dayScheduleLoading,
  } = useServiceSchedulePage();

  const height = window.innerHeight - 60;

  return (
    <Box pos="relative" bg="white" p="md" style={{ height }}>
      <div className={classes.wrapper}>
        <div className={classes.container}>
          <ServiceSelectionPane
            serviceTypeOptions={serviceTypeOptions}
            selectedServiceTypeKey={selectedServiceTypeKey}
            onSelectServiceType={setSelectedServiceTypeKey}
            practitioners={practitioners}
            practitionersLoading={practitionersLoading}
            selectedPractitioner={selectedPractitioner}
            onSelectPractitioner={selectPractitioner}
            allPractitionersSelected={allPractitionersMode}
            onSelectAllPractitioners={handleAllPractitioners}
            className={classes.practitionerPane}
          />
          <div className={classes.calendar}>
            {dayScheduleMode && selectedServiceTypeKey ? (
              <CalendarSchedule
                style={{ height: '100%' }}
                practitioners={practitionerSchedules}
                date={dayScheduleDate}
                onDateChange={handleDayScheduleDate}
                onSelectSlot={handleSelectSlot}
                onSelectAppointment={handleSelectAppointment}
                slotPropGetter={slotPropGetter}
                onBack={exitDaySchedule}
                lockView={allPractitionersMode}
                loading={dayScheduleLoading}
              />
            ) : !selectedServiceTypeKey || !selectedPractitioner ? (
              <div className={classes.placeholder}>
                <Text c="dark" fw={500}>
                  {!selectedServiceTypeKey && !selectedPractitioner
                    ? 'Select a service type and practitioner to view the schedule'
                    : !selectedServiceTypeKey
                      ? 'Select a service type to view the schedule'
                      : 'Select a practitioner to view the schedule'}
                </Text>
              </div>
            ) : (
              <>
                <LoadingOverlay visible={slotsLoading} zIndex={10} overlayProps={{ radius: 'sm', blur: 0 }} />
                <Calendar
                  key={selectedPractitioner?.id}
                  style={{ height: '100%' }}
                  slots={slots}
                  appointments={appointments}
                  onSelectSlot={handleSelectSlot}
                  onSelectAppointment={handleSelectAppointment}
                  onRangeChange={handleRangeChange}
                  onLoadStart={startLoading}
                  slotPropGetter={slotPropGetter}
                  onDaySchedule={handleDaySchedule}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <Drawer
        opened={bookingDrawerOpen}
        onClose={() => setBookingDrawerOpen(false)}
        title={
          <Text size="xl" fw={700} c="white">
            New Appointment
          </Text>
        }
        position="right"
        h="100%"
        styles={{
          header: {
            backgroundColor: 'var(--mantine-color-blue-9)',
            '--mantine-color-dimmed': 'white',
            marginBottom: 20,
          },
          close: { color: 'white' },
          content: { borderTopLeftRadius: 15, borderBottomLeftRadius: 15 },
        }}
      >
        {bookingSlot && <BookAppointmentForm slot={bookingSlot} onSuccess={handleBookSuccess} />}
      </Drawer>

      <Drawer
        opened={appointmentDetailsOpen}
        onClose={() => setAppointmentDetailsOpen(false)}
        title={
          <Text size="xl" fw={700}>
            Appointment Details
          </Text>
        }
        position="right"
        h="100%"
      >
        {appointmentDetails && (
          <AppointmentDetails appointment={appointmentDetails} onUpdate={handleAppointmentUpdate} />
        )}
      </Drawer>

      <Drawer
        opened={appointmentInfoOpen}
        onClose={() => setAppointmentInfoOpen(false)}
        title={
          <Text size="xl" fw={700} c="white">
            Appointment Information
          </Text>
        }
        position="right"
        h="100%"
        styles={{
          header: {
            backgroundColor: 'var(--mantine-color-blue-9)',
            '--mantine-color-dimmed': 'white',
            marginBottom: 20,
          },
          close: { color: 'white' },
          content: { borderTopLeftRadius: 15, borderBottomLeftRadius: 15 },
        }}
      >
        {selectedAppointment && (
          <AppointmentInfo
            appointment={selectedAppointment}
            encounter={selectedAppointmentEncounter}
            canShowAppointment={canShowSelectedAppointment}
            onShowAppointment={handleShowAppointment}
            onClose={() => setAppointmentInfoOpen(false)}
            onDelete={handleDeleteAppointment}
          />
        )}
      </Drawer>
    </Box>
  );
}
