import { create } from 'zustand';

interface ProjectOrganizationStore {
  organizationCode: string | undefined;
  organizationName: string | undefined;
  setOrganization: (code: string, name: string) => void;
}

export const useProjectOrganizationStore = create<ProjectOrganizationStore>()((set) => ({
  organizationCode: undefined,
  organizationName: undefined,
  setOrganization: (organizationCode, organizationName) => set({ organizationCode, organizationName }),
}));
