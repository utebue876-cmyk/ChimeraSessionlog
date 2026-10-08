import { Alert, Button, Divider, Group, LoadingOverlay, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { Document } from '@medplum/react';
import { IconCircleCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { AppModal } from '../../components/modal/AppModal';
import { SelfReferralStepper } from './SelfReferralStepper';
import { useSelfReferralConfirmation } from './useSelfReferralConfirmation';

function formatDob(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatGender(g: string): string {
  if (!g) return '—';
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function formatAppointment(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function SelfReferralConfirmationPage(): JSX.Element {
  const navigate = useNavigate();
  const {
    firstName,
    lastName,
    dob,
    gender,
    cardLastThree,
    appointmentStartIso,
    loading,
    error,
    bookingResult,
    handleConfirmBooking,
    goBack,
  } = useSelfReferralConfirmation();

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
        <Stack gap="xs">
          <Title order={3} style={{ color: 'white' }}>
            Review &amp; Confirm Booking
          </Title>
          <Text size="sm" c="white" opacity={0.85}>
            Please ensure your details are correct before confirming as you will not be able to change them after this
            point. If you need to make any changes, please click the "Previous" button below.
          </Text>
        </Stack>
      </Paper>

      <SelfReferralStepper currentStep={4} />

      <Stack gap="md" p="lg" pos="relative">
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

        {error && (
          <Alert color="red" title="Booking failed">
            {error}
          </Alert>
        )}

        <Title order={5} c="dark">
          Booking Summary
        </Title>

        <Table withRowBorders={false} ml={-8}>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600} w="30%" c="dark">
                Patient Name
              </Table.Td>
              <Table.Td>
                {firstName} {lastName}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600} c="dark">
                Date of Birth
              </Table.Td>
              <Table.Td>{formatDob(dob)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600} c="dark">
                Gender
              </Table.Td>
              <Table.Td>{formatGender(gender)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600} c="dark">
                Payment Card
              </Table.Td>
              <Table.Td>•••• •••• •••• {cardLastThree || '•••'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600} c="dark">
                Appointment
              </Table.Td>
              <Table.Td>{formatAppointment(appointmentStartIso)}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Divider />

        <Group justify="right">
          <Button size="md" variant="outline" color="blue" onClick={goBack} disabled={loading}>
            Previous
          </Button>
          <Button size="md" color="blue" onClick={handleConfirmBooking} loading={loading}>
            Confirm Booking
          </Button>
        </Group>
      </Stack>

      <AppModal
        opened={!!bookingResult}
        onClose={() => void navigate(`/Patient/${bookingResult?.patient.id}/case`)}
        withCloseButton={false}
        centered
        title={
          <Group>
            <IconCircleCheck size={20} color="var(--mantine-color-white)" />
            <Title order={4} c="white">
              Booking Confirmed
            </Title>
          </Group>
        }
      >
        <Stack gap="md" align="center" p="md">
          <IconCircleCheck size={56} color="var(--mantine-color-green-6)" />
          <Title order={4} ta="center">
            Your appointment has been booked
          </Title>
          <Text size="sm" c="dark" ta="center">
            A confirmation SMS and email have been sent to the patient's email address.
          </Text>
          <Text size="sm" ta="center">
            Your case reference is:{' '}
            <Text component="span" fw={700} c="var(--mantine-color-blue-9)">
              {bookingResult?.caseReference}
            </Text>
          </Text>
          <Button
            size="md"
            variant="outline"
            color="blue"
            fullWidth
            mt="sm"
            onClick={() => void navigate(`/Patient/${bookingResult?.patient.id}/case`)}
          >
            Close
          </Button>
        </Stack>
      </AppModal>
    </Document>
  );
}
