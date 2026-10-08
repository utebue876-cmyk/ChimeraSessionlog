import { ActionIcon, Divider, Flex, Group, Stack, Text, Tooltip } from '@mantine/core';
import { formatHumanName, resolveId } from '@medplum/core';
import type { HumanName, Patient, Reference, Resource } from '@medplum/fhirtypes';
import { ResourceAvatar } from '@medplum/react';
import { useMedplum, useResource } from '@medplum/react-hooks';
import { IconUserEdit } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePatientSidebarData } from '../../hooks/usePatientSidebarData';
import { killEvent } from '../../utils/patientSidebarUtils';
import styles from './PatientSidebar.module.css';
import type { PatientSidebarSectionConfig } from './PatientSidebarTypes';
import SidebarItem from './SidebarItem';
import { getDefaultSections } from './sidebarSectionConfigs';

export interface PatientSidebarProps {
  readonly patient: Patient | Reference<Patient>;
  readonly onClickResource?: (resource: Resource) => void;
  readonly sections?: PatientSidebarSectionConfig[];
}

export function PatientSidebar(props: PatientSidebarProps): JSX.Element | null {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const { patient: propsPatient, onClickResource } = props;
  const patient = useResource(propsPatient);
  const [createdDate, setCreatedDate] = useState<string | undefined>();

  // Determine sections: custom or default
  const defaultSections = useMemo(() => getDefaultSections(), []);
  const sections = props.sections ?? defaultSections;

  // Fetch all data for all sections (with search deduplication)
  const { sectionData, loading, error } = usePatientSidebarData(propsPatient, sections);

  useEffect(() => {
    const id = resolveId(propsPatient);
    if (id) {
      medplum
        .readHistory('Patient', id)
        .then((history) => {
          const firstEntry = history.entry?.[history.entry.length - 1];
          const lastUpdated = firstEntry?.resource?.meta?.lastUpdated;
          setCreatedDate(typeof lastUpdated === 'string' ? lastUpdated : '');
        })
        .catch(() => {});
    }
  }, [propsPatient, medplum]);

  if (!patient) {
    return null;
  }

  return (
    <Flex direction="column" gap="xs" w="100%" h="100vh" className={styles.panel} style={{ cursor: 'default' }}>
      <SidebarItem
        showChevron={false}
        onClick={() => {
          onClickResource?.(patient);
        }}
      >
        <Group align="center" gap="sm" p={16} bg="var(--mantine-color-blue-1)">
          <ResourceAvatar value={patient} size={48} radius={48} style={{ border: '2px solid white' }} />
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text fz="h4" fw={700} truncate style={{ minWidth: 0 }}>
              {formatHumanName(patient.name?.[0] as HumanName)}
            </Text>

            {(() => {
              const dateString = typeof createdDate === 'string' && createdDate.length > 0 ? createdDate : undefined;
              if (!dateString) {
                return null;
              }
              const d = new Date(dateString);
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              return (
                <Text fz="xs" mt={-2} fw={500} c="gray.8" truncate style={{ minWidth: 0 }}>
                  Patient since {day}/{month}/{d.getFullYear()}
                </Text>
              );
            })()}
          </Stack>{' '}
          <Tooltip label="Edit patient">
            <ActionIcon
              role="button"
              aria-label="Edit patient"
              variant="subtle"
              onClick={(e) => {
                killEvent(e);
                navigate(`/Patient/${patient.id}/edit-patient`)?.catch(console.error);
              }}
              size="md"
            >
              <IconUserEdit size={18} color="var(--mantine-color-blue-6)" />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Divider />
      </SidebarItem>

      <Stack gap="xs" px={16} pt={12} pb={16} style={{ flex: 2, overflowY: 'auto', minHeight: 0 }}>
        {error && (
          <Text c="red" fz="sm">
            Error loading patient summary: {error.message}
          </Text>
        )}
        {!loading && sections.length > 0 && (
          <>
            {sections.map((section, index) => {
              const SectionComponent = section.component;
              return (
                <div key={section.key}>
                  <SectionComponent
                    patient={patient}
                    onClickResource={onClickResource}
                    results={sectionData[index] ?? {}}
                  />
                  <Divider color="var(--mantine-color-blue-2)" mx={-16} />
                </div>
              );
            })}
          </>
        )}
      </Stack>
    </Flex>
  );
}
