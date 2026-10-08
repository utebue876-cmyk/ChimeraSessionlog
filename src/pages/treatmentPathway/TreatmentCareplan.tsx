import { Badge, Box, Button, Divider, Group, Paper, Select, Stack, Table, Text } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import { DateField } from '../../components/common/DateField';
import { useTreatmentCareplan } from './useTreatmentCareplan';
import type { ConfirmedTreatmentPathway } from './useTreatmentPathway';

interface TreatmentCareplanProps {
  confirmedPathway: ConfirmedTreatmentPathway;
  onStartOver: () => void;
}

export function TreatmentCareplan({ confirmedPathway, onStartOver }: TreatmentCareplanProps): JSX.Element {
  const {
    pathwayLabel,
    sessionsAuthorised,
    authorisationReference,
    caseLabel,
    funderLabel,
    startedDate,
    authorisedServices,
    authorisedServicesLoading,
    authorisedServicesError,
    sessionLog,
    outcomeOptions,
    setSessionOutcome,
    setSessionDate,
    countsTowardsAuthorisation,
    addSession,
    saveSessions,
    canAddSession,
    closureReasonOptions,
    closureReasonOptionsLoading,
    closureReason,
    setClosureReason,
  } = useTreatmentCareplan(confirmedPathway);

  return (
    <Stack gap="md" m="xs" maw={800}>
      <Paper shadow="xs" withBorder p="md">
        <Stack gap="md">
          <Box
            bg="white"
            p="sm"
            style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-green-2)' }}
          >
            <Group gap="sm">
              <IconCircleCheck size={40} color="green" />
              <Text component="span" fw={700} size="sm" c="green.9">
                Pathway confirmed.
              </Text>{' '}
              <Text component="span" size="sm">
                Care plan created, case moved to In treatment, treatment decision task closed.
              </Text>
            </Group>
          </Box>

          <Stack gap={2}>
            <Text size="lg" fw={600}>
              {pathwayLabel}
            </Text>
            <Text size="sm" c="gray.7">
              {sessionsAuthorised} sessions authorised · Care plan active
            </Text>
          </Stack>

          <Paper
            p="md"
            radius="sm"
            shadow="none"
            style={{ backgroundColor: 'var(--mantine-color-blue-0)', border: '1px solid var(--mantine-color-blue-2)' }}
          >
            <Group gap="xl">
              <Text size="sm">
                Case:{' '}
                <Text component="span" fw={700}>
                  {caseLabel}
                </Text>
              </Text>
              <Text size="sm">
                Funder:{' '}
                <Text component="span" fw={700}>
                  {funderLabel}
                </Text>
              </Text>
              <Text size="sm">
                Authorisation:{' '}
                <Text component="span" fw={700}>
                  {authorisationReference}
                </Text>
              </Text>
              <Text size="sm">
                Started:{' '}
                <Text component="span" fw={700}>
                  {startedDate}
                </Text>
              </Text>
            </Group>
          </Paper>

          <Text size="xs" fw={700} c="gray.7" mb="-10px" style={{ letterSpacing: '0.075em' }}>
            AUTHORISED SERVICES
          </Text>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  SERVICE
                </Table.Th>
                <Table.Th fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Tier
                </Table.Th>
                <Table.Th ta="right" fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Authorised
                </Table.Th>
                <Table.Th ta="right" fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Used
                </Table.Th>
                <Table.Th ta="right" fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Remaining
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(authorisedServicesLoading || authorisedServicesError) && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" role={authorisedServicesError ? 'alert' : 'status'}>
                      {authorisedServicesError ?? 'Loading authorised services...'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {authorisedServices.map((row, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{row.service}</Table.Td>
                  <Table.Td>{row.tier}</Table.Td>
                  <Table.Td ta="right">{row.authorised}</Table.Td>
                  <Table.Td ta="right">{row.used}</Table.Td>
                  <Table.Td
                    ta="right"
                    c={row.remaining === 0 ? 'red' : undefined}
                    fw={row.remaining === 0 ? 700 : undefined}
                  >
                    {row.remaining}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Text size="xs" c="gray.7" mt="-5px">
            Used counts attended, DNA and late-cancelled sessions. Cancellations inside notice do not count.
          </Text>
        </Stack>
      </Paper>

      <Paper shadow="xs" withBorder p="md">
        <Stack gap="md">
          <Stack gap={2}>
            <Text size="lg" fw={600}>
              Session Log
            </Text>
            <Text size="sm" c="gray.7">
              Each row records a session against the authorised service.
            </Text>
          </Stack>

          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Date
                </Table.Th>
                <Table.Th fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Service
                </Table.Th>
                <Table.Th fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Outcome
                </Table.Th>
                <Table.Th ta="right" fw={500} fz="xs" style={{ textTransform: 'uppercase' }}>
                  Chargeable
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessionLog.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td maw={170}>
                    <DateField value={row.date} onChange={(date) => setSessionDate(row.id, date)} />
                  </Table.Td>
                  <Table.Td>{row.service}</Table.Td>
                  <Table.Td maw={220}>
                    <Select
                      placeholder="— Select —"
                      data={outcomeOptions}
                      value={row.outcome}
                      onChange={(v) => v && setSessionOutcome(row.id, v as (typeof outcomeOptions)[number]['value'])}
                      allowDeselect={false}
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Badge
                      color={row.outcome !== 'dna' && countsTowardsAuthorisation(row.outcome) ? 'green' : 'red'}
                      variant="light"
                      radius={5}
                      size="md"
                    >
                      {countsTowardsAuthorisation(row.outcome) ? 'Yes' : 'No'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="flex-start" mt="sm">
            <Button variant="filled" onClick={saveSessions} disabled={!canAddSession}>
              Save Sessions
            </Button>
            <Button variant="outline" onClick={addSession} disabled={!canAddSession}>
              Add session
            </Button>
            <Button variant="default" onClick={onStartOver}>
              Start over
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper shadow="xs" withBorder p="md">
        <Stack gap="md">
          <Stack gap={2}>
            <Text size="lg" fw={600}>
              Close Case
            </Text>
            <Text size="sm" c="gray.7">
              Ten reasons, taken from live service data. The Pharos label glues a completion state to a reason; here the
              reason is the code and the state is a pair of properties.
            </Text>
          </Stack>

          <Stack gap={4} maw={600}>
            <Select
              label="Closure reason"
              withAsterisk
              placeholder="— Select —"
              data={closureReasonOptions}
              value={closureReason}
              onChange={setClosureReason}
              disabled={closureReasonOptionsLoading}
            />
            <Text size="xs" c="gray.7">
              The reason is the code; the completion state is carried as properties.
            </Text>
          </Stack>

          <Divider />

          <Group justify="flex-start">
            <Button color="blue" disabled={!closureReason}>
              Close case
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
