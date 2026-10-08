import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useState } from 'react';
import { adminMenu } from './adminMenu';
import { patientMenu } from './patientMenu';
import { practitionerMenu } from './practitionerMenu';
import { relatedPersonMenu } from './relatedPersonMenu';
import { usePractitionerTaskMenu } from './usePractitionerTaskMenu';

const SETUP_DISMISSED_KEY = 'medplum-provider-setup-completed';

export const useMenu = () => {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [_setupDismissed, _setSetupDismissed] = useState(() => localStorage.getItem(SETUP_DISMISSED_KEY) === 'true');
  const userLinks = usePractitionerTaskMenu();

  const getMenus = () => {
    if (profile) {
      const membership = medplum.getProjectMembership();
      if (membership?.admin) {
        return adminMenu(userLinks);
      }
      switch (profile.resourceType) {
        case 'Practitioner':
          return practitionerMenu(userLinks);
        case 'Patient':
          return patientMenu();
        default:
          return relatedPersonMenu();
      }
    }

    return undefined;
  };

  const getHomeRoute = (): string => {
    const membership = medplum.getProjectMembership();
    if (membership?.admin && profile?.resourceType !== 'Practitioner') {
      return '/Patients';
    }
    if (profile?.resourceType === 'Patient') {
      return '/utilities/gp-practices';
    }
    if (profile?.resourceType === 'Practitioner') {
      //   return setupDismissed ? '/Patient?_count=20&_fields=name,email,gender&_sort=-_lastUpdated' : '/Calendar/Schedule';
      return '/Calendar/Schedule';
    }
    // RelatedPerson or other
    return '/utilities/gp-practices';
  };

  return { getMenus, getHomeRoute };
};
