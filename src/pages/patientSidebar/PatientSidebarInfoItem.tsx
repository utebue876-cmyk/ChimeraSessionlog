import { Box, Group, Text, Tooltip } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import styles from './PatientSidebar.module.css';
import SidebarItem from './SidebarItem';

export interface PatientSidebarInfoItemProps {
  patient: Patient;
  value: string | undefined;
  icon: React.ReactNode;
  placeholder: string;
  label: string;
  onClickResource?: (patient: Patient) => void;
  showChevron?: boolean;
}

export const PatientSidebarInfoItem = (props: PatientSidebarInfoItemProps): JSX.Element => {
  const { patient, value, icon, placeholder, label, onClickResource, showChevron = true } = props;
  const displayText = value || placeholder;

  return (
    <SidebarItem
      showChevron={showChevron}
      onClick={() => {
        onClickResource?.(patient);
      }}
    >
      <Box className={styles.patientSummaryListItem}>
        <Tooltip label={label} position="top-start" openDelay={650}>
          <Group
            gap="sm"
            align="center"
            ml={6}
            mr={2}
            style={{ cursor: showChevron ? 'pointer' : 'default', flexWrap: 'nowrap', minWidth: 0 }}
          >
            {icon}
            <Text fz="sm" fw={400} truncate c={value ? 'inherit' : 'var(--mantine-color-gray-6)'}>
              {displayText}
            </Text>
          </Group>
        </Tooltip>
      </Box>
    </SidebarItem>
  );
};
