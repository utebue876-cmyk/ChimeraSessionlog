import { Title } from '@mantine/core';
import { SignInForm } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
// import { medplumClientId } from '../../config/environment';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <SignInForm
      googleClientId="921088377005-3j1sa10vr6hj86jgmdfh2l53v3mp7lfi.apps.googleusercontent.com"
      // clientId={medplumClientId}
      onSuccess={() => navigate('/')?.catch(console.error)}
      projectId={searchParams.get('project') || undefined}
      login={searchParams.get('login') || undefined}
    >
      {/* <Logo size={32} /> */}
      <img src="/iprshealth.png" alt="IPRS Health" style={{ height: 48, width: 48 }} />
      <Title order={3} py="lg">
        Sign in to Provider
      </Title>
    </SignInForm>
  );
}
