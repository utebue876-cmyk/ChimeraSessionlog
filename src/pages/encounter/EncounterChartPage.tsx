import { isReference } from '@medplum/core';
import type { Encounter, EpisodeOfCare, Reference } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import { EncounterChart } from '../../components/encounter/EncounterChart';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import { showErrorNotification } from '../../utils/notifications';

export const EncounterChartPage = (): JSX.Element | null => {
  const { encounterId } = useParams();
  const medplum = useMedplum();
  const { setActiveEpisode } = useActiveEpisode();

  useEffect(() => {
    if (!encounterId) {
      return;
    }

    let cancelled = false;

    async function loadEncounterEpisode(): Promise<void> {
      try {
        const encounter = await medplum.readResource('Encounter', encounterId as string);
        if (!cancelled) {
          // Extract the episodeOfCare reference and load the full resource
          const episodeRef = encounter.episodeOfCare?.[0];
          if (episodeRef && isReference<EpisodeOfCare>(episodeRef, 'EpisodeOfCare')) {
            const episode = await medplum.readReference(episodeRef);
            if (!cancelled) {
              setActiveEpisode(episode as EpisodeOfCare);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          showErrorNotification(error);
        }
      }
    }

    loadEncounterEpisode().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [encounterId, medplum, setActiveEpisode]);

  if (!encounterId) {
    showErrorNotification('Encounter ID not found');
    return null;
  }

  const encounterRef: Reference<Encounter> = {
    reference: `Encounter/${encounterId}`,
  };

  return (
    <>
      <EncounterChart encounter={encounterRef} />
      <Outlet />
    </>
  );
};
