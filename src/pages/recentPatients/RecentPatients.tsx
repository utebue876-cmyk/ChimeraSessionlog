import { LoadingOverlay, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { formatAddress, formatHumanName } from '@medplum/core';
import type { HumanName } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { formatGender, getTelecomValue } from '../../utils/patientUtils';
import { TOP_N, useRecentPatients } from './useRecentPatients';

export function RecentPatients(): JSX.Element {
  const { entries, loading, onPatientClick, formatLastActivity } = useRecentPatients();

  return (
    <Paper shadow="xs" m="xs" p="md">
      <Stack gap="lg" pos="relative">
        <div>
          <Title order={3}>My Recent Patients</Title>
          <Text size="sm" c="dimmed">
            The {TOP_N} patients you most recently updated
          </Text>
        </div>

        <LoadingOverlay visible={loading} />

        {!loading && entries.length === 0 && (
          <div>
            <Text ta="center">No recent patient activity found.</Text>
          </div>
        )}

        {entries.length > 0 && (
          <Table highlightOnHover withRowBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Gender</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th>Last Activity</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map(({ patient, lastActivityAt }) => (
                <Table.Tr key={patient.id} style={{ cursor: 'pointer' }} onClick={() => onPatientClick(patient.id)}>
                  <Table.Td>{formatHumanName(patient.name?.[0] as HumanName) || 'Unnamed patient'}</Table.Td>
                  <Table.Td>{formatGender(patient.gender)}</Table.Td>
                  <Table.Td>{getTelecomValue(patient, 'phone')}</Table.Td>
                  <Table.Td>{getTelecomValue(patient, 'email')}</Table.Td>
                  <Table.Td>{formatAddress(patient.address?.[0])}</Table.Td>
                  <Table.Td>{patient.identifier?.[0]?.value ?? ''}</Table.Td>
                  <Table.Td>{formatLastActivity(lastActivityAt)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
