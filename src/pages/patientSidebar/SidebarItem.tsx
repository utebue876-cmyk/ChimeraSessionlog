import { ActionIcon, Box } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import type { JSX, ReactNode } from 'react';
import styles from './SidebarItem.module.css';

interface SidebarItemProps {
  children: ReactNode;
  onClick: () => void;
  showChevron?: boolean;
}

export default function SidebarItem(props: SidebarItemProps): JSX.Element {
  const { children, onClick, showChevron = true } = props;
  return (
    <Box className={showChevron ? styles.item : styles.item_no_cursor} onClick={onClick}>
      {children}
      {showChevron && (
        <>
          <div className={styles.gradient} />
          <div className={styles.container}>
            <ActionIcon className={styles.chevron} size="md" variant="transparent" tabIndex={-1}>
              <IconChevronRight size={16} stroke={2.5} />
            </ActionIcon>
          </div>
        </>
      )}
    </Box>
  );
}
