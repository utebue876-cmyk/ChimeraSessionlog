import { ActionIcon, Badge, Box, Flex, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { EpisodeOfCare, Patient } from '@medplum/fhirtypes';
import {
  IconBuilding,
  IconCalendarWeek,
  IconChevronDown,
  IconChevronRight,
  IconReportMedical,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';
import { CaseModal } from '../case/CaseModal';
import { SidebarCollapsibleSection } from './SidebarCollapsibleSection';
import SidebarItem from './SidebarItem';
import styles from './SidebarItem.module.css';

export interface PatientCasesProps {
  readonly patient: Patient;
  readonly episodes: EpisodeOfCare[];
}

export function PatientCases(props: PatientCasesProps): JSX.Element {
  const { patient, episodes } = props;
  const { activeEpisode, setActiveEpisode, switchEpisode } = useActiveEpisode();
  const location = useLocation();
  const targetEpisodeId = (location.state as { targetEpisodeId?: string } | null)?.targetEpisodeId;
  const [navTargetApplied, setNavTargetApplied] = useState(false);
  const [episodesOfCareState, setEpisodesOfCareState] = useState(() => sortEpisodesOfCareByStartDate(episodes));
  const [editEpisodeOfCare, setEditEpisodeOfCare] = useState<EpisodeOfCare>();
  const [opened, { open, close }] = useDisclosure(false);
  const [expandedEpisodeKeys, setExpandedEpisodeKeys] = useState<Record<string, boolean>>({});

  const getEpisodeKey = useCallback((episode: EpisodeOfCare, index: number): string => {
    return episode.id ?? episode.identifier?.[0]?.value ?? `episode-${index}`;
  }, []);

  useEffect(() => {
    setEpisodesOfCareState((current) => {
      const incomingIds = new Set(episodes.map((e) => e.id).filter(Boolean));
      // Preserve any locally-created episodes not yet present in the incoming prop.
      const localOnly = current.filter((e) => e.id && !incomingIds.has(e.id));
      return sortEpisodesOfCareByStartDate([...episodes, ...localOnly]);
    });
  }, [episodes]);

  useEffect(() => {
    setExpandedEpisodeKeys({});
    setEditEpisodeOfCare(undefined);
    setActiveEpisode(undefined);
  }, [patient.id, setActiveEpisode]);

  useEffect(() => {
    setNavTargetApplied(false);
  }, [patient.id, targetEpisodeId]);

  // When navigated here with a targetEpisodeId (e.g. from a case ID search), immediately activate
  // that episode as soon as the episodes list is available, overriding the default first-episode selection.
  useEffect(() => {
    if (!targetEpisodeId || episodesOfCareState.length === 0 || navTargetApplied) {
      return;
    }

    const target = episodesOfCareState.find((e) => e.id === targetEpisodeId);
    if (!target) {
      // If the target episode is not present, fall back to normal default selection behavior.
      setNavTargetApplied(true);
      return;
    }

    setActiveEpisode(target);
    setExpandedEpisodeKeys({ [targetEpisodeId]: true });
    setNavTargetApplied(true);
  }, [targetEpisodeId, episodesOfCareState, navTargetApplied, setActiveEpisode]);

  useEffect(() => {
    if (episodesOfCareState.length === 0) {
      return;
    }

    // If nothing is actively selected yet, default to the first episode.
    if (!activeEpisode && (!targetEpisodeId || navTargetApplied)) {
      setActiveEpisode(episodesOfCareState[0]);
    }

    setExpandedEpisodeKeys((current) => {
      const targetId = activeEpisode?.id ?? episodesOfCareState[0]?.id;
      if (!targetId) {
        return current;
      }
      if (Object.keys(current).length === 1 && current[targetId]) {
        return current;
      }
      return { [targetId]: true };
    });
  }, [activeEpisode, episodesOfCareState, navTargetApplied, setActiveEpisode, targetEpisodeId]);

  useEffect(() => {
    if (!activeEpisode?.id) {
      return;
    }

    setEpisodesOfCareState((currentEpisodes) => {
      const existingIndex = currentEpisodes.findIndex((episode) => episode.id === activeEpisode.id);

      if (existingIndex < 0) {
        return sortEpisodesOfCareByStartDate([...currentEpisodes, activeEpisode]);
      }

      if (currentEpisodes[existingIndex] === activeEpisode) {
        return currentEpisodes;
      }

      const nextEpisodes = [...currentEpisodes];
      nextEpisodes[existingIndex] = activeEpisode;
      return sortEpisodesOfCareByStartDate(nextEpisodes);
    });
  }, [activeEpisode]);

  const selectedEpisodeKey = useCallback((): string | undefined => {
    if (!activeEpisode?.id) {
      return episodesOfCareState.length > 0 ? getEpisodeKey(episodesOfCareState[0], 0) : undefined;
    }
    const idx = episodesOfCareState.findIndex((e) => e.id === activeEpisode.id);
    return idx >= 0 ? getEpisodeKey(episodesOfCareState[idx], idx) : undefined;
  }, [activeEpisode, episodesOfCareState, getEpisodeKey]);

  const toggleEpisodeExpanded = useCallback((episodeKey: string) => {
    setExpandedEpisodeKeys((current) => {
      if (current[episodeKey]) {
        return {};
      }

      return { [episodeKey]: true };
    });
  }, []);

  // CaseModal handles FHIR persistence itself and passes back the already-saved episode.
  // handleSubmit only needs to merge it into local state and set it as active.
  const handleSubmit = useCallback(
    (episode: EpisodeOfCare): void => {
      setEpisodesOfCareState((currentEpisodes) => {
        const alreadyPresent = episode.id ? currentEpisodes.some((e) => e.id === episode.id) : false;
        if (alreadyPresent) {
          return sortEpisodesOfCareByStartDate(currentEpisodes.map((e) => (e.id === episode.id ? episode : e)));
        }
        return sortEpisodesOfCareByStartDate([...currentEpisodes, episode]);
      });
      if (episode.id) {
        setExpandedEpisodeKeys({ [episode.id]: true });
      }
      setActiveEpisode(episode);
      setEditEpisodeOfCare(undefined);
      close();
    },
    [close, setActiveEpisode]
  );

  return (
    <>
      <SidebarCollapsibleSection
        title={episodesOfCareState.length === 1 ? 'Case' : 'Cases'}
        onAdd={() => {
          setEditEpisodeOfCare(undefined);
          open();
        }}
        tooltip="New case"
      >
        {episodesOfCareState.length > 0 ? (
          <Flex direction="column" gap={15}>
            {episodesOfCareState.map((episode, index) => {
              const episodeKey = getEpisodeKey(episode, index);
              const expanded = Boolean(expandedEpisodeKeys[episodeKey]);
              const selected = selectedEpisodeKey() === episodeKey;
              const caseStatus = getCaseStatus(episode);

              return (
                <SidebarItem
                  key={episodeKey}
                  onClick={() => {
                    setExpandedEpisodeKeys({ [episodeKey]: true });
                    if (patient.id) {
                      switchEpisode(episode, patient.id);
                    } else {
                      setActiveEpisode(episode);
                    }
                  }}
                >
                  <Box>
                    <Flex align="center" gap={6}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        aria-label={expanded ? 'Collapse case details' : 'Expand case details'}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleEpisodeExpanded(episodeKey);
                        }}
                      >
                        {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                      </ActionIcon>
                      <Text fw={selected ? 700 : 400} className={styles.itemText}>
                        {episode?.identifier?.[0]?.value || episode.id}
                      </Text>
                    </Flex>

                    {expanded && (
                      <Stack pl={18} mt={10} gap={8} className={selected ? styles.caseDetailsActive : undefined}>
                        <Badge size="md" color="var(--mantine-color-blue-4)" variant="light">
                          {caseStatus}
                        </Badge>
                        <Group gap="sm" align="center">
                          <IconCalendarWeek size={16} stroke={2} color="var(--mantine-color-blue-6)" />
                          <Text fw={400} className={styles.itemText}>
                            {episode?.period?.start
                              ? new Date(episode.period.start).toLocaleDateString('en-GB')
                              : 'N/A'}
                          </Text>
                        </Group>
                        <Group gap="sm" align="center">
                          <IconBuilding size={16} stroke={2} color="var(--mantine-color-blue-6)" />
                          <Text fw={400} className={styles.itemText}>
                            {episode.managingOrganization?.display ?? 'No managing organization'}
                          </Text>
                        </Group>
                        <Group gap="sm" align="center">
                          <IconReportMedical size={16} stroke={2} color="var(--mantine-color-blue-6)" />
                          <Text fw={400} className={styles.itemText}>
                            {episode?.type?.[0]?.coding?.[0]?.display ?? 'N/A'}
                          </Text>
                        </Group>
                      </Stack>
                    )}
                  </Box>
                </SidebarItem>
              );
            })}
          </Flex>
        ) : (
          <Text>(none)</Text>
        )}
      </SidebarCollapsibleSection>
      <CaseModal
        patient={patient}
        opened={opened}
        onClose={close}
        onCreated={handleSubmit}
        editMode={!!editEpisodeOfCare}
      />
    </>
  );
}

function sortEpisodesOfCareByStartDate(episodes: EpisodeOfCare[]): EpisodeOfCare[] {
  return [...episodes].sort((left, right) => {
    const leftStart = left.period?.start;
    const rightStart = right.period?.start;

    if (!leftStart && !rightStart) {
      return 0;
    }

    if (!leftStart) {
      return 1;
    }

    if (!rightStart) {
      return -1;
    }

    return leftStart.localeCompare(rightStart);
  });
}
