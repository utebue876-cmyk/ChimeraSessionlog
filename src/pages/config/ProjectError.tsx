import { Button } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import type { ProjectNotConfiguredError } from '../../config/projectOrganization';

interface ProjectErrorProps {
  error: ProjectNotConfiguredError;
}

export function ProjectError({ error }: ProjectErrorProps): JSX.Element {
  const medplum = useMedplum();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        padding: 32,
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <h2 style={{ margin: 0 }}>Your project settings are not configured</h2>
      <p style={{ margin: 0, color: 'var(--mantine-color-gray-6)' }}>
        <span style={{ fontWeight: 'bold', color: 'var(--mantine-color-gray-7)' }}>{error.projectName}</span> has some
        missing project organisation settings.
      </p>
      <p style={{ margin: 0, color: 'var(--mantine-color-gray-6)' }}>
        Please contact your administrator to resolve this.
      </p>
      <Button
        mt="sm"
        onClick={() => {
          medplum
            .signOut()
            .catch(() => medplum.clear())
            .finally(() => {
              window.location.href = '/signin';
            });
        }}
      >
        Sign in with a different account
      </Button>
    </div>
  );
}
