import { ActionIcon, Box, Collapse, Group, Text, Tooltip } from '@mantine/core';
import { IconChevronDown, IconPlus } from '@tabler/icons-react';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { killEvent } from '../../utils/patientSidebarUtils';
import classes from './SidebarCollapsibleSection.module.css';

export interface SidebarCollapsibleSectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly onAdd?: () => void;
  readonly tooltip?: string;
}

export function SidebarCollapsibleSection(props: SidebarCollapsibleSectionProps): JSX.Element {
  const { title, children, onAdd, tooltip } = props;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box className={classes.root}>
      <Group justify="space-between" className={classes.header}>
        <Group gap={8}>
          <ActionIcon
            variant="subtle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? `Show ${title.toLowerCase()}` : `Hide ${title.toLowerCase()}`}
            className={classes.chevron}
            data-collapsed={collapsed || undefined}
            size="md"
          >
            <IconChevronDown size={20} />
          </ActionIcon>
          <Text fz="md" fw={700} onClick={() => setCollapsed((c) => !c)} className={classes.title}>
            {title}
          </Text>
        </Group>

        {onAdd && (
          <Tooltip label={tooltip}>
            <ActionIcon
              role="button"
              aria-label={tooltip}
              className={classes.addButton}
              variant="subtle"
              onClick={(e) => {
                killEvent(e);
                onAdd();
              }}
              size="md"
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <Collapse in={!collapsed}>
        <Box ml="var(--mantine-spacing-xl)" mt="xs" mb="md" pl={4}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
