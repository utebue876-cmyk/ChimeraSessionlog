import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useEpisodeOfCareStore } from '../store/episodeOfCareStore';

/** Hook to read and set the active EpisodeOfCare. */
export function useActiveEpisode() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeEpisode = useEpisodeOfCareStore((s) => s.activeEpisode);
  const setActiveEpisode = useEpisodeOfCareStore((s) => s.setActiveEpisode);

  const switchEpisode = useCallback(
    (episode: EpisodeOfCare, patientId: string): void => {
      setActiveEpisode(episode);
      const pathname = location.pathname;
      if (pathname.match(/\/Patient\/[^/]+\/Encounter\/[^/]+/)) {
        navigate(`/Patient/${patientId}/encounters`)?.catch(console.error);
      } else if (pathname.match(/\/Patient\/[^/]+\/task\/[^/]+/)) {
        navigate(`/Patient/${patientId}/Task`)?.catch(console.error);
      }
    },
    [location.pathname, navigate, setActiveEpisode]
  );

  return { activeEpisode, setActiveEpisode, switchEpisode };
}
