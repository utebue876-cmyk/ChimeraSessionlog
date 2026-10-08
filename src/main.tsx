import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { MedplumClient } from '@medplum/core';
import { MedplumProvider } from '@medplum/react';
import '@medplum/react/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { App } from './App';
import { medplumApiParam, medplumBaseUrl } from './config/environment';
import { theme } from './config/theme';

const queryClient = new QueryClient();

if (window.location.hostname === 'localhost') {
  document.title = 'Chimera Pilot (localhost)';
}

const router = createBrowserRouter([{ path: '*', element: <App /> }]);
const navigate = (path: string): Promise<void> => router.navigate(path);

const medplum = new MedplumClient({
  onUnauthenticated: () => (window.location.href = medplumApiParam ? `/?api=${medplumApiParam}` : '/'),
  // baseUrl: 'http://localhost:8103/', // Uncomment to run against a local server
  baseUrl: medplumBaseUrl,
  cacheTime: 60000,
  autoBatchTime: 100,
});

// Always start with the sidebar open on page load. This is the only way to ensure
// that the sidebar is open when the user first loads the app. The sidebar state is
// persisted in localStorage, so this will only affect the initial load.
localStorage.setItem('navbarOpen', 'true');

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MedplumProvider medplum={medplum} navigate={navigate}>
        <MantineProvider theme={theme}>
          <Notifications position="bottom-right" />
          <RouterProvider router={router} />
        </MantineProvider>
      </MedplumProvider>
    </QueryClientProvider>
  </StrictMode>
);
