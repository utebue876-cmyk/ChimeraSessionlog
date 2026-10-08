import { Alert, Badge, LoadingOverlay, Stack, Table, Text, Title } from '@mantine/core';
import type { JSX } from 'react';
import { AppModal } from '../../components/modal/AppModal';
import { useOrgPractitioners } from './useOrgPractitioners';

interface OrgPractitionersModalProps {
  orgId: string;
  orgName: string;
  opened: boolean;
  onClose: () => void;
}

export function OrgPractitionersModal({ orgId, orgName, opened, onClose }: OrgPractitionersModalProps): JSX.Element {
  const { practitioners, loading, error } = useOrgPractitioners(orgId, opened);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Title order={4} c="white">
            Practitioners
          </Title>
          <Text size="sm" c="blue.1">
            {orgName} ({orgId})
          </Text>
        </Stack>
      }
      size="60%"
    >
      <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

      {error && (
        <Alert color="red" title="Failed to load practitioners">
          {error}
        </Alert>
      )}

      {!loading && !error && practitioners.length === 0 && (
        <Text c="dimmed" size="sm">
          No practitioners found for this organisation.
        </Text>
      )}

      {practitioners.length > 0 && (
        <Table highlightOnHover withRowBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Role Code</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Join Date</Table.Th>
              <Table.Th>Left Date</Table.Th>
              <Table.Th>Type</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {practitioners.map((p) => (
              <Table.Tr key={`${p.code}-${p.roleCode}`}>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {p.code}
                  </Text>
                </Table.Td>
                <Table.Td>{p.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm">
                    {p.roleCode}
                  </Badge>
                </Table.Td>
                <Table.Td>{p.roleName}</Table.Td>
                <Table.Td>{p.joinDate ? new Date(p.joinDate).toLocaleDateString('en-GB') : 'N/A'}</Table.Td>
                <Table.Td>{p.leftDate ? new Date(p.leftDate).toLocaleDateString('en-GB') : '—'}</Table.Td>
                <Table.Td>{p.type}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </AppModal>
  );
}
