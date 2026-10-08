import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { create } from 'zustand';

interface EpisodeOfCareStore {
  activeEpisode: EpisodeOfCare | undefined;
  setActiveEpisode: (episode: EpisodeOfCare | undefined) => void;
}

export const useEpisodeOfCareStore = create<EpisodeOfCareStore>()((set) => ({
  activeEpisode: undefined,
  setActiveEpisode: (episode) => set({ activeEpisode: episode }),
}));
