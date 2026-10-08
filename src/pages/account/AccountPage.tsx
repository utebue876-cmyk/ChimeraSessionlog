import { Badge, Card, Group, LoadingOverlay, Paper, Stack, Table, Text, Title } from '@mantine/core';
import type { CSSProperties, JSX } from 'react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router';
import { getEncounterStatusColor } from '../../utils/statusColors';
import { useAccount } from './useAccount';

const SECTION_DARK_BORDER = '1px solid var(--mantine-color-dark-4)';
const SUBTOTAL_BLUE_BORDER = '1px solid var(--mantine-color-blue-3)';

const nonInteractiveRowStyle: CSSProperties = {
  borderBottom: 'none',
  pointerEvents: 'none',
};

const subtotalLabelCellStyle: CSSProperties = {
  borderBottom: 0,
  borderBottomColor: 'transparent',
  paddingTop: 4,
  paddingBottom: 4,
  lineHeight: 1.2,
};

const subtotalAmountCellStyle: CSSProperties = {
  borderTop: SUBTOTAL_BLUE_BORDER,
  borderBottom: SECTION_DARK_BORDER,
  borderLeft: SECTION_DARK_BORDER,
  borderRight: SECTION_DARK_BORDER,
  backgroundColor: 'var(--mantine-color-blue-1)',
  paddingTop: 4,
  paddingBottom: 4,
  lineHeight: 1.8,
};

const spacerRowStyle: CSSProperties = {
  pointerEvents: 'none',
};

const spacerCellStyle: CSSProperties = {
  border: 'none',
  height: 15,
  padding: 0,
};

const totalCardStyle: CSSProperties = {
  backgroundColor: 'var(--mantine-color-blue-1)',
  borderColor: 'var(--mantine-color-dark-4)',
};

function getSectionDataCellStyle(rowIndex: number, rowCount: number): CSSProperties {
  return {
    verticalAlign: 'top',
    borderTop: rowIndex === 0 ? SECTION_DARK_BORDER : undefined,
    borderBottom: rowIndex === rowCount - 1 ? SECTION_DARK_BORDER : undefined,
  };
}

export function AccountPage(): JSX.Element {
  const { caseId, loading, error, sections, totalBill, patient } = useAccount();
  const navigate = useNavigate();

  const handleRowClick = (encounterId: string | undefined): void => {
    if (!patient?.id || !encounterId) {
      return;
    }
    navigate(`/Patient/${patient.id}/Encounter/${encounterId}`)?.catch(console.error);
  };

  return (
    <Paper shadow="xs" m="xs" p="md">
      <Stack gap="lg" pos="relative">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <div>
              <Text size="sm" mt={10}>
                Case ID:
                <span style={{ marginLeft: 5, fontWeight: 700 }}>{caseId}</span>
              </Text>
            </div>
            <Text size="sm" c="var(--mantine-color-blue-4)" mt="md">
              {sections.length} Appointment{sections.length !== 1 ? 's' : ''} with Charge Item
            </Text>
          </Stack>
          <Title order={4} c="dimmed" mt="md" mr="md">
            CASE STATEMENT
          </Title>
        </Group>

        {loading ? (
          <LoadingOverlay visible={loading} />
        ) : error ? (
          <Text c="red" fw={600}>
            {error}
          </Text>
        ) : sections.length === 0 ? (
          <Text c="dark" ta="center">
            No charge items found for this case.
          </Text>
        ) : (
          <Stack gap="md">
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead
                style={{
                  borderTop: SECTION_DARK_BORDER,
                }}
              >
                <Table.Tr>
                  <Table.Th style={{ width: '15%' }}>Appointment Time</Table.Th>
                  <Table.Th style={{ width: '15%' }}>Service Type</Table.Th>
                  <Table.Th style={{ width: '15%' }}>Practitioner</Table.Th>
                  <Table.Th style={{ width: '10%' }}>Status</Table.Th>
                  <Table.Th>CPT Description</Table.Th>
                  <Table.Th style={{ width: '10%' }} ta="right">
                    Total
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sections.map((section, sectionIndex) => (
                  <Fragment key={section.id}>
                    {section.rows.length > 0 &&
                      section.rows.map((row, rowIndex) => {
                        const isFirstRow = rowIndex === 0;
                        const rowCellStyle = getSectionDataCellStyle(rowIndex, section.rows.length);

                        return (
                          <Table.Tr
                            key={row.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleRowClick(section.encounter?.id)}
                          >
                            <Table.Td style={rowCellStyle}>{isFirstRow ? row.appointmentDateTime : ''}</Table.Td>
                            <Table.Td style={rowCellStyle}>{isFirstRow ? section.serviceTypeDisplay : ''}</Table.Td>
                            <Table.Td style={rowCellStyle}>{isFirstRow ? section.practitioner : ''}</Table.Td>
                            <Table.Td style={rowCellStyle}>
                              {isFirstRow ? (
                                <Badge
                                  color={
                                    section.encounterStatus !== 'N/A'
                                      ? getEncounterStatusColor(section.encounterStatus)
                                      : undefined
                                  }
                                >
                                  {section.encounterStatus}
                                </Badge>
                              ) : (
                                ''
                              )}
                            </Table.Td>
                            <Table.Td style={rowCellStyle}>{row.cptCode}</Table.Td>
                            <Table.Td ta="right" fw={600} style={rowCellStyle}>
                              {row.calculatedPrice}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    <Table.Tr key={section.id} style={nonInteractiveRowStyle}>
                      <Table.Td colSpan={5} ta="right" fw={600} style={subtotalLabelCellStyle}>
                        Sub Total
                      </Table.Td>
                      <Table.Td ta="right" fw={600} style={subtotalAmountCellStyle}>
                        {section.calculatedCost}
                      </Table.Td>
                    </Table.Tr>
                    {sectionIndex < sections.length - 1 && (
                      <Table.Tr aria-hidden="true" style={spacerRowStyle}>
                        <Table.Td colSpan={6} style={spacerCellStyle} />
                      </Table.Tr>
                    )}
                  </Fragment>
                ))}
              </Table.Tbody>
            </Table>

            <Card withBorder shadow="sm" p="lg" style={totalCardStyle}>
              <Group justify="space-between" align="center">
                <Text fw="600">Total Calculated Bill</Text>
                <Title order={3}>{totalBill}</Title>
              </Group>
            </Card>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
