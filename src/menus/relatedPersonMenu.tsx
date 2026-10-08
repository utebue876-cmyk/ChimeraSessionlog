import { IconStethoscope } from '@tabler/icons-react';

export const relatedPersonMenu = () => [
  {
    title: 'Related Person',
    links: [
      {
        icon: <IconStethoscope />,
        label: 'NHS GP Lookup',
        href: '/utilities/gp-practices',
      },
    ],
  },
];
