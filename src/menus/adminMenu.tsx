import { NavbarLink } from '@medplum/react';
import {
  IconBriefcase,
  IconCalendarEvent,
  IconCalendarSearch,
  IconClipboardPlus,
  IconStethoscope,
  IconUserCog,
  IconUserPlus,
  IconUsers,
  IconUserSearch,
} from '@tabler/icons-react';

export const adminMenu = (userLinks: NavbarLink[]) => [
  {
    title: 'Tasks',
    links: userLinks,
  },
  {
    title: 'Schedule',
    links: [
      { icon: <IconCalendarEvent />, label: 'My Schedule', href: `/Calendar/Schedule` },
      { icon: <IconCalendarSearch />, label: 'Service Schedule', href: `/Calendar/ServiceSchedule` },
      // {
      //   icon: <IconClipboardCheck />,
      //   label: 'Tasks',
      //   href: `/Task?owner=${getReferenceString(profile)}&_sort=-_lastUpdated&status=requested,ready,received,accepted,in-progress,draft`,
      // },
    ],
  },
  {
    title: 'Care Manager',
    links: [
      {
        icon: <IconBriefcase />,
        label: 'My Cases',
        href: '/my-cases',
      },
    ],
  },
  {
    title: 'Patients',
    links: [
      {
        icon: <IconUserCog />,
        label: 'My Recent Patients',
        href: '/recentPatients',
      },
      {
        icon: <IconUserSearch />,
        label: 'Patient Search',
        href: '/findPatient',
      },
      {
        icon: <IconUsers />,
        label: 'All Patients',
        href: '/Patients',
      },
      { icon: <IconUserPlus />, label: 'Patient Intake', href: '/intake/new' },
      { icon: <IconClipboardPlus />, label: 'AW Self-Referral *', href: '/self-referral' },
    ],
  },
  {
    title: 'Utilities',
    links: [
      {
        icon: <IconStethoscope />,
        label: 'NHS GP Lookup',
        href: '/utilities/gp-practices',
      },
    ],
  },
];
