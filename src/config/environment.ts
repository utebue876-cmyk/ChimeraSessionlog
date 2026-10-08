interface ApiConfig {
  baseUrl: string;
  clientId: string;
}

// Switch environments during development via ?api=AWS or ?api=AZ query param.
// In production a single VITE_MEDPLUM_BASE_URL / VITE_MEDPLUM_CLIENT_ID is set
// at build time by the pipeline.
const API_CONFIGS: Record<string, ApiConfig> = {
  AWS: {
    baseUrl: 'https://api.medplum.com/',
    clientId: import.meta.env.VITE_MEDPLUM_CLIENT_ID_AWS ?? '',
  },
  AZ: {
    baseUrl: 'https://api.medplum.chimeradev.handlhealth.co.uk/',
    clientId: import.meta.env.VITE_MEDPLUM_CLIENT_ID_AZ ?? '',
  },
};

const apiParam = new URLSearchParams(window.location.search).get('api')?.toUpperCase();
const activeConfig: ApiConfig = apiParam && API_CONFIGS[apiParam] ? API_CONFIGS[apiParam] : API_CONFIGS.AWS;

export const medplumBaseUrl = activeConfig.baseUrl;
export const medplumClientId = activeConfig.clientId;
export const medplumApiParam = apiParam;
