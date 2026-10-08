import { IconStethoscope, IconUsers } from '@tabler/icons-react';

export const patientMenu = () => [
  {
    title: 'Patient',
    links: [
      {
        icon: <IconStethoscope />,
        label: 'NHS GP Lookup',
        href: '/utilities/gp-practices',
      },
    ],
  },
  {
    title: 'Patients',
    links: [
      {
        icon: <IconUsers />,
        label: 'All Patients',
        href: '/Patients',
      },
    ],
  },
];
