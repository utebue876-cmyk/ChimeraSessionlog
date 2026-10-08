import { Button, Card, Divider, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import type { JSX } from 'react';
import classes from './PatientPortalPage.module.css';
import {
  formatAppointmentDateTime,
  formatSharedDate,
  getDocumentTitle,
  getInitials,
  getTaskCta,
  usePatientPortalPage,
} from './usePatientPortalPage';

export function PatientPortalPage(): JSX.Element {
  const {
    loading,
    patientFirstName,
    nextAppointment,
    appointmentSubLabel,
    practitionerName,
    practitionerRole,
    tasks,
    documents,
  } = usePatientPortalPage();

  return (
    <div>
      {patientFirstName && (
        <Title order={2} fw={600} mb={4}>
          Welcome, {patientFirstName}
        </Title>
      )}
      <Text size="sm" c="dimmed" mb="lg">
        Here's what you need to know about your care.
      </Text>

      <div className={classes.grid}>
        {/* Main column */}
        <div className={classes.mainColumn}>
          {/* Your Next Appointment */}
          <Card withBorder radius="md" p="lg">
            <div className={classes.sectionLabel}>Your next appointment</div>
            {loading ? (
              <Stack gap="sm">
                <Skeleton height={32} width="70%" />
                <Skeleton height={16} width="40%" />
                <Skeleton height={40} width="50%" mt={8} />
                <Skeleton height={36} width={160} mt={8} />
              </Stack>
            ) : nextAppointment?.start ? (
              <Stack gap="xs">
                <div className={classes.appointmentDate}>{formatAppointmentDateTime(nextAppointment.start)}</div>
                {appointmentSubLabel && (
                  <Text size="sm" c="dimmed">
                    {appointmentSubLabel}
                  </Text>
                )}
                {practitionerName && (
                  <>
                    <Divider color="gray.1" />
                    <Group gap="sm" mt={5}>
                      <div className={classes.avatar}>{getInitials(practitionerName)}</div>
                      <Stack gap={0}>
                        <Text fw={600} size="sm">
                          {practitionerName}
                        </Text>

                        <Text size="xs" c="dimmed">
                          {practitionerRole ? practitionerRole : 'Your session practitioner'}
                        </Text>
                      </Stack>
                    </Group>
                  </>
                )}
                <Button mt="sm" color="dark" size="md" radius={10} style={{ width: 'fit-content' }}>
                  Appointment details
                </Button>
              </Stack>
            ) : (
              <Text className={classes.emptyText}>No upcoming appointments.</Text>
            )}
          </Card>

          {/* Before Your Appointment */}
          <Card withBorder radius="md" p="lg">
            <div className={classes.sectionLabel}>Before your appointment</div>
            <Divider color="gray.1" mb="xs" />
            {loading ? (
              <Stack gap="md">
                <Skeleton height={44} />
                <Skeleton height={44} />
              </Stack>
            ) : tasks.length > 0 ? (
              <Stack gap={0}>
                {tasks.map((task, index) => {
                  const title = task.description ?? task.code?.text ?? 'Task';
                  const subText = task.note?.[0]?.text;
                  const cta = getTaskCta(task);
                  return (
                    <div key={task.id ?? index}>
                      {index > 0 && <Divider color="gray.1" />}
                      <Group justify="space-between" align="flex-start" wrap="nowrap" py={10}>
                        <Group align="flex-start" gap="sm" wrap="nowrap">
                          <div className={classes.taskNumber}>{index + 1}</div>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">
                              {title}
                            </Text>
                            {subText && (
                              <Text size="xs" c="dimmed">
                                {subText}
                              </Text>
                            )}
                          </Stack>
                        </Group>
                        <Button variant="transparent" fw={600} size="sm" color="blue.6" p={0} style={{ flexShrink: 0 }}>
                          {cta}
                        </Button>
                      </Group>
                    </div>
                  );
                })}
              </Stack>
            ) : (
              <Text className={classes.emptyText}>No tasks have been assigned before your appointment.</Text>
            )}
          </Card>

          {/* Information for You */}
          <Card withBorder radius="md" p="lg">
            <div className={classes.sectionLabel}>Information for you</div>
            <Divider color="gray.1" mb="xs" />
            {loading ? (
              <Stack gap="md">
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Stack>
            ) : documents.length > 0 ? (
              <Stack gap={0}>
                {documents.map((doc, index) => {
                  const title = getDocumentTitle(doc);
                  const authorDisplay = doc.author?.[0]?.display;
                  const sharedDate = formatSharedDate(doc.date);
                  const subText = [
                    authorDisplay ? `From ${authorDisplay}` : undefined,
                    sharedDate ? `Shared ${sharedDate}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div key={doc.id}>
                      {index > 0 && <Divider color="gray.1" />}
                      <Group align="flex-start" gap="sm" py={10}>
                        <span className={classes.pdfBadge}>PDF</span>
                        <Stack gap={2}>
                          <Text fw={600} size="sm">
                            {title}
                          </Text>
                          {subText && (
                            <Text size="xs" c="dimmed">
                              {subText}
                            </Text>
                          )}
                        </Stack>
                      </Group>
                    </div>
                  );
                })}
              </Stack>
            ) : (
              <Text className={classes.emptyText}>No documents have been shared with you yet.</Text>
            )}
          </Card>
        </div>

        {/* Right sidebar — Need Help */}
        <Card withBorder radius="md" p="lg">
          <div className={classes.sectionLabel}>Need help?</div>
          <Divider color="gray.1" mb="xs" />
          <Stack gap={0}>
            <div style={{ paddingTop: 0, paddingBottom: 10 }}>
              <Text fw={600} size="sm">
                Change or cancel an appointment
              </Text>
              <Text size="sm" c="dimmed">
                0300 000 0000
              </Text>
            </div>
            <Divider color="gray.1" />
            <div style={{ paddingTop: 10, paddingBottom: 10 }}>
              <Text fw={600} size="sm">
                Question about your care
              </Text>
              <Text
                size="sm"
                c="blue.6"
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                component="a"
                href="mailto:"
              >
                Contact your care team
              </Text>
            </div>
            <Divider color="gray.1" />
            <div style={{ paddingTop: 10, paddingBottom: 0 }}>
              <Text fw={600} size="sm">
                Technical problem with Chimera
              </Text>
              <Text size="sm" c="dimmed">
                0300 000 0001
              </Text>
            </div>
          </Stack>
        </Card>
      </div>
    </div>
  );
}
