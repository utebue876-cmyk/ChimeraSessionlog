import {
  OdsOrganisationResponse,
  OdsPractitionerResponse,
  OrganisationReportSearch,
  OrganisationReportSearchResponse,
} from '../types/odsTypes';

export interface PractitionerSearchRequest {
  searchQueryGeneral: string;
  offset?: number;
  batchSize?: number;
}

// In dev, requests go through Vite's proxy (/ods-api → ODS API) to avoid CORS.
// In production, VITE_ODS_API_URL should point to a server-side proxy.
const ODS_BASE = import.meta.env.DEV ? '/ods-api' : (import.meta.env.VITE_ODS_API_URL ?? '/ods-api');

export const fetchPractitioners = async (request: PractitionerSearchRequest): Promise<OdsPractitionerResponse> => {
  try {
    const response = await fetch(`${ODS_BASE}/search/practitionerGeneralSearch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch practitioners: ${response.statusText}`);
    }
    return response.json() as Promise<OdsPractitionerResponse>;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchOrganisationById = async (orgId: string): Promise<OdsOrganisationResponse> => {
  try {
    const response = await fetch(
      `${ODS_BASE}/search/singleOrganisationSearchByCode?code=${encodeURIComponent(orgId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch organisation ${orgId}: ${response.statusText}`);
    }
    return response.json() as Promise<OdsOrganisationResponse>;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchOrganisations = async (
  request: OrganisationReportSearch
): Promise<OrganisationReportSearchResponse> => {
  try {
    const response = await fetch(`${ODS_BASE}/search/organisationReportSearch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch GP organisations: ${response.statusText}`);
    }
    return response.json() as Promise<OrganisationReportSearchResponse>;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
