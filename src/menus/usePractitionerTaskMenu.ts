import {
  capitalize,
  formatCodeableConcept,
  formatSearchQuery,
  getExtension,
  getReferenceString,
  MedplumClient,
  normalizeErrorString,
  Operator,
  SearchRequest,
} from '@medplum/core';
import type { Practitioner } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile, type NavbarLink } from '@medplum/react';
import { IconCategory, IconGridDots, IconUser, IconUsersGroup } from '@tabler/icons-react';
import { createElement, useEffect, useState } from 'react';

const SEARCH_TABLE_FIELDS = ['code', 'owner', 'for', 'priority', 'due-date', '_lastUpdated', 'performerType'];
const ALL_TASKS_LINK: NavbarLink = {
  icon: createElement(IconGridDots),
  label: 'All Tasks',
  href: '/Task',
};
const TEAM_TASKS_LINK: NavbarLink = {
  icon: createElement(IconUsersGroup),
  label: 'Chimera MH Team Tasks',
  href: '/team-tasks',
};

export function usePractitionerTaskMenu(): NavbarLink[] {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [userLinks, setUserLinks] = useState<NavbarLink[]>([]);

  useEffect(() => {
    const profileReferenceString = profile && getReferenceString(profile);
    if (!profileReferenceString) {
      setUserLinks([]);
      return;
    }

    const myTasksLink = getMyTasksLink();
    const stateLinks = getTasksByState(profile as Practitioner);

    getTasksByRoleLinks(medplum, profileReferenceString)
      .then((roleLinks) => {
        setUserLinks([myTasksLink, ...roleLinks, ...stateLinks, ALL_TASKS_LINK, TEAM_TASKS_LINK]);
      })
      .catch((error) => {
        console.error('Failed to fetch PractitionerRoles', normalizeErrorString(error));
      });
  }, [profile, medplum]);

  return userLinks;
}

function getMyTasksLink(): NavbarLink {
  return { icon: createElement(IconCategory), label: 'My Tasks', href: '/my-tasks' };
}

function getTasksByState(profile: Practitioner): NavbarLink[] {
  const myStates =
    profile.qualification
      ?.map(
        (qualification) =>
          getExtension(
            qualification,
            'http://hl7.org/fhir/us/davinci-pdex-plan-net/StructureDefinition/practitioner-qualification',
            'whereValid'
          )?.valueCodeableConcept?.coding?.find((coding) => coding.system === 'https://www.usps.com/')?.code
      )
      .filter((state): state is string => !!state) ?? [];

  return myStates.map((state) => {
    const search: SearchRequest = {
      resourceType: 'Task',
      fields: SEARCH_TABLE_FIELDS,
      sortRules: [{ code: '-priority-order,due-date' }],
      filters: [
        { code: 'owner:missing', operator: Operator.EQUALS, value: 'true' },
        { code: 'status:not', operator: Operator.EQUALS, value: 'completed' },
        { code: 'patient.address-state', operator: Operator.EQUALS, value: state },
      ],
    };

    const searchQuery = formatSearchQuery(search);
    return { icon: createElement(IconUser), label: `${capitalize(state)} Tasks`, href: `/Task${searchQuery}` };
  });
}

async function getTasksByRoleLinks(medplum: MedplumClient, profileReference: string): Promise<NavbarLink[]> {
  const roles = await medplum.searchResources('PractitionerRole', {
    practitioner: profileReference,
  });

  return roles
    .map((role) => {
      const roleCode = role?.code?.[0];
      if (!roleCode?.coding?.[0]?.code) {
        return undefined;
      }

      const search: SearchRequest = {
        resourceType: 'Task',
        fields: SEARCH_TABLE_FIELDS,
        sortRules: [{ code: '-priority-order,due-date' }],
        filters: [
          { code: 'owner:missing', operator: Operator.EQUALS, value: 'true' },
          { code: 'status:not', operator: Operator.EQUALS, value: 'completed' },
          { code: 'performer', operator: Operator.EQUALS, value: roleCode.coding?.[0]?.code },
        ],
      };

      const searchQuery = formatSearchQuery(search);
      const roleDisplay = formatCodeableConcept(roleCode);
      return { icon: createElement(IconUser), label: `${roleDisplay} Tasks`, href: `/Task${searchQuery}` };
    })
    .filter((link): link is NonNullable<typeof link> => !!link);
}
