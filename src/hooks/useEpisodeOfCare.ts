import { notifications } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';

interface EpisodeOfCareOption {
  value: string;
  label: string;
}

interface UseEpisodeOfCareResult {
  options: EpisodeOfCareOption[];
  map: Record<string, EpisodeOfCare>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isLoading: boolean;
}

export function useEpisodeOfCare(patientRef: string | undefined): UseEpisodeOfCareResult {
  const medplum = useMedplum();
  const [options, setOptions] = useState<EpisodeOfCareOption[]>([]);
  const [map, setMap] = useState<Record<string, EpisodeOfCare>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    const loadEpisodes = async (): Promise<void> => {
      setOptions([]);
      setMap({});
      setSelectedId(null);

      if (!patientRef) {
        return;
      }

      setIsLoading(true);

      try {
        const episodes = await medplum.searchResources('EpisodeOfCare', { patient: patientRef });

        if (!active) {
          return;
        }

        const loadedOptions = episodes
          .filter((episode) => Boolean(episode.id))
          .map((episode) => ({
            value: episode.id as string,
            label: episode.identifier?.[0]?.value || (episode.id as string),
          }));

        const loadedMap = episodes.reduce<Record<string, EpisodeOfCare>>((result, episode) => {
          if (episode.id) {
            result[episode.id] = episode;
          }
          return result;
        }, {});

        setOptions(loadedOptions);
        setMap(loadedMap);

        // Auto-select if only one episode exists
        if (loadedOptions.length === 1) {
          setSelectedId(loadedOptions[0].value);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        notifications.show({
          color: 'red',
          title: 'Error',
          message: `Failed to load cases: ${normalizeErrorString(error)}`,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadEpisodes().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [medplum, patientRef]);

  return {
    options,
    map,
    selectedId,
    setSelectedId,
    isLoading,
  };
}
