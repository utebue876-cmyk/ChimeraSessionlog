import { Button, Group, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import type { JSX, ReactNode } from 'react';
import classes from './PatientPortalLayout.module.css';

interface PatientPortalLayoutProps {
  children: ReactNode;
}

export function PatientPortalLayout({ children }: PatientPortalLayoutProps): JSX.Element {
  const medplum = useMedplum();

  const handleSignOut = (): void => {
    medplum
      .signOut()
      .catch(() => medplum.clear())
      .finally(() => {
        window.location.href = '/signin';
      });
  };

  return (
    <div className={classes.root}>
      <header className={classes.header}>
        <Group gap="sm">
          <img src="/iprshealth.png" alt="IPRS Health" className={classes.logo} />
          <Text fw={600} size="lg" c="var(--mantine-color-gray-8)">
            Chimera Patient Portal
          </Text>
        </Group>
        <Button variant="subtle" color="black" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>
      <main className={classes.main}>{children}</main>
    </div>
  );
}
