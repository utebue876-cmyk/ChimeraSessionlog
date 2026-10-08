import react from '@vitejs/plugin-react';
import dns from 'dns';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

dns.setDefaultResultOrder('verbatim');

// Resolve aliases to local packages when working within the monorepo
const alias: NonNullable<UserConfig['resolve']>['alias'] = Object.fromEntries(
  Object.entries({
    '@medplum/core': path.resolve(__dirname, '../../packages/core/src'),
    '@medplum/dosespot-react': path.resolve(__dirname, '../../packages/dosespot-react/src'),
    '@medplum/react$': path.resolve(__dirname, '../../packages/react/src'),
    '@medplum/react/styles.css': path.resolve(__dirname, '../../packages/react/dist/esm/index.css'),
    '@medplum/react-hooks': path.resolve(__dirname, '../../packages/react-hooks/src'),
    '@medplum/health-gorilla-core': path.resolve(__dirname, '../../packages/health-gorilla-core/src'),
    '@medplum/health-gorilla-react': path.resolve(__dirname, '../../packages/health-gorilla-react/src'),
  }).filter(([, relPath]) => existsSync(relPath))
);

// Version information from package.json and environment variables
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version?: string };
const appVersion = packageJson.version ?? '0.0.0';
const appCommit =
  process.env.BUILD_SOURCEVERSION ?? process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev';
const appBuildTime = new Date().toISOString();

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify(appCommit),
    'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(appBuildTime),
    'import.meta.env.MEDPLUM_APP_NAME': JSON.stringify('Chimera'),
  },
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000,
    proxy: {
      '/ods-api': {
        target: 'https://www.odsdatasearchandexport.nhs.uk/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ods-api/, ''),
      },
    },
  },
  preview: {
    host: 'localhost',
    port: 3000,
  },
  resolve: {
    alias,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@mantine')) return 'mantine-vendor';
          if (id.includes('node_modules/@medplum/core') || id.includes('node_modules/@medplum/fhirtypes'))
            return 'medplum-core-vendor';
          if (id.includes('node_modules/@medplum')) return 'medplum-ui-vendor';
          if (id.includes('node_modules/@tabler')) return 'icons-vendor';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor';
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/fflate') ||
            id.includes('node_modules/pako') ||
            id.includes('node_modules/rgbcolor') ||
            id.includes('node_modules/svg-pathdata')
          )
            return 'pdf-vendor';
          if (
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/stackblur') ||
            id.includes('node_modules/fast-png')
          )
            return 'canvas-vendor';
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/@kurkle')) return 'charts-vendor';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test.setup.ts',
    pool: 'threads',
    maxWorkers: 3,
  },
});
