import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchOrganisationById, fetchOrganisations, fetchPractitioners } from './odsService';

describe('odsService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('fetchPractitioners', () => {
    test('posts the search request and returns the parsed response', async () => {
      const responseBody = { practitioners: [] };
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => responseBody } as Response);

      const result = await fetchPractitioners({ searchQueryGeneral: 'Smith' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/practitionerGeneralSearch'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ searchQueryGeneral: 'Smith' }),
        })
      );
      expect(result).toBe(responseBody);
    });

    test('throws when the response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Bad Request' } as Response);

      await expect(fetchPractitioners({ searchQueryGeneral: 'Smith' })).rejects.toThrow(
        'Failed to fetch practitioners: Bad Request'
      );
    });
  });

  describe('fetchOrganisationById', () => {
    test('gets the organisation by code and returns the parsed response', async () => {
      const responseBody = { id: 'org-1' };
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => responseBody } as Response);

      const result = await fetchOrganisationById('org-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('singleOrganisationSearchByCode?code=org-1'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toBe(responseBody);
    });

    test('throws when the response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Not Found' } as Response);

      await expect(fetchOrganisationById('org-1')).rejects.toThrow('Failed to fetch organisation org-1: Not Found');
    });
  });

  describe('fetchOrganisations', () => {
    test('posts the search request and returns the parsed response', async () => {
      const responseBody = { organisations: [] };
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => responseBody } as Response);

      const result = await fetchOrganisations({ searchQueryGeneral: 'Health' } as any);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/organisationReportSearch'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toBe(responseBody);
    });

    test('throws when the response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Server Error' } as Response);

      await expect(fetchOrganisations({} as any)).rejects.toThrow('Failed to fetch GP organisations: Server Error');
    });
  });
});
