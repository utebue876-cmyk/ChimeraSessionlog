import { NavbarLink } from '@medplum/react';
import {
  IconCalendarEvent,
  IconCalendarSearch,
  IconClipboardPlus,
  IconStethoscope,
  IconUserCog,
  IconUserPlus,
  IconUsers,
  IconUserSearch,
} from '@tabler/icons-react';

export const practitionerMenu = (userLinks: NavbarLink[]) => [
  {
    title: 'Tasks',
    links: userLinks,
  },
  {
    title: 'Schedule',
    links: [
      { icon: <IconCalendarEvent />, label: 'My Schedule', href: `/Calendar/Schedule` },
      { icon: <IconCalendarSearch />, label: 'Service Schedule', href: `/Calendar/ServiceSchedule` },
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
