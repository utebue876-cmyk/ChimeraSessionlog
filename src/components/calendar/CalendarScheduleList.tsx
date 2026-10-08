import { Badge, Center, Loader, ScrollArea, Table, Text } from '@mantine/core';
import { formatCodeableConcept, getReferenceString } from '@medplum/core';
import type { Appointment, CodeableConcept } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import dayjs from 'dayjs';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { serviceTypesFromSchedulingParameters } from '../../utils/scheduling';

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function getAppointmentStatusColor(status: string): string {
  switch (status) {
    case 'booked':
      return 'blue';
    case 'arrived':
      return 'cyan';
    case 'fulfilled':
      return 'green';
    case 'cancelled':
      return 'red';
    case 'noshow':
      return 'orange';
    case 'pending':
      return 'yellow';
    default:
      return 'gray';
  }
}

interface CalendarScheduleListProps {
  appointments: Appointment[];
  style?: React.CSSProperties;
}

export function CalendarScheduleList({ appointments, style }: CalendarScheduleListProps): JSX.Element {
  const medplum = useMedplum();
  const [serviceTypeMap, setServiceTypeMap] = useState<Record<string, CodeableConcept>>({});
  const [planDefinitionMap, setPlanDefinitionMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const map: Record<string, string> = {};
    setLoading(true);

    async function resolvePlans(): Promise<void> {
      await Promise.all(
        appointments.map(async (appt) => {
          if (!appt.id) return;
          try {
            const encounters = await medplum.searchResources('Encounter', {
              appointment: getReferenceString(appt),
              _count: '1',
            });
            if (!encounters[0]) return;
            const tasks = await medplum.searchResources('Task', `encounter=${getReferenceString(encounters[0])}`);
            const name = tasks[0]?.basedOn?.[0]?.display;
            if (name) map[appt.id] = name;
          } catch {
            // leave blank
          }
        })
      );
      if (!cancelled) setPlanDefinitionMap({ ...map });
      if (!cancelled) setLoading(false);
    }

    resolvePlans().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [appointments, medplum]);

  useEffect(() => {
    let cancelled = false;
    const map: Record<string, CodeableConcept> = {};

    async function resolveAll(): Promise<void> {
      await Promise.all(
        appointments.map(async (appt) => {
          if (!appt.id) return;
          // Check appointment directly first
          const direct = appt.serviceType?.[0];
          if (direct) {
            map[appt.id] = direct;
            return;
          }
          // Fall back: fetch schedule via practitioner
          const practitionerRef = appt.participant?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))?.actor
            ?.reference;
          if (!practitionerRef) return;
          const schedule = await medplum.searchOne('Schedule', { actor: practitionerRef }).catch(() => undefined);
          if (schedule) {
            const types = serviceTypesFromSchedulingParameters(schedule);
            if (types[0]) map[appt.id] = types[0];
          }
        })
      );
      if (!cancelled) setServiceTypeMap({ ...map });
    }

    resolveAll().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [appointments, medplum]);

  if (loading) {
    return (
      <Center style={style}>
        <Loader />
      </Center>
    );
  }

  const sorted = [...appointments]
    .filter((a) => a.start)
    .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());

  const byDay = new Map<string, Appointment[]>();
  for (const appt of sorted) {
    const key = dayjs(appt.start).format('YYYY-MM-DD');
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(appt);
  }

  return (
    <ScrollArea style={style}>
      <Table highlightOnHover withRowBorders stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Start</Table.Th>
            <Table.Th>End</Table.Th>
            <Table.Th>Patient</Table.Th>
            <Table.Th>Service Type</Table.Th>
            <Table.Th>Care Plan Definition</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {byDay.size === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text size="sm" pt="xs">
                  No appointments in this range.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {[...byDay.entries()].map(([key, dayAppts]) => {
            const d = dayjs(key);
            const title = `${d.format('dddd')} ${ordinalSuffix(d.date())} ${d.format('MMMM YYYY')}`;
            return [
              <Table.Tr key={`date-${key}`} style={{ backgroundColor: 'var(--mantine-color-blue-1)' }}>
                <Table.Td colSpan={6}>
                  <Text fw={700} size="sm">
                    {title}
                  </Text>
                </Table.Td>
              </Table.Tr>,
              ...dayAppts.map((appt) => {
                const patient = appt.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'));
                return (
                  <Table.Tr key={appt.id}>
                    <Table.Td>{dayjs(appt.start).format('HH:mm')}</Table.Td>
                    <Table.Td>{dayjs(appt.end).format('HH:mm')}</Table.Td>
                    <Table.Td>{patient?.actor?.display ?? '—'}</Table.Td>
                    <Table.Td>
                      {serviceTypeMap[appt.id ?? ''] ? formatCodeableConcept(serviceTypeMap[appt.id ?? '']) : '—'}
                    </Table.Td>
                    <Table.Td>{planDefinitionMap[appt.id ?? ''] ?? '—'}</Table.Td>
                    <Table.Td>
                      <Badge size="md" color={getAppointmentStatusColor(appt.status ?? '')} variant="light">
                        {appt.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              }),
            ];
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
