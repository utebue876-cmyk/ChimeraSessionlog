import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DemographicsSection, getDefaultSections } from './sidebarSectionConfigs';

describe('sidebarSectionConfigs', () => {
  test('returns expected default section keys', () => {
    const sections = getDefaultSections();
    expect(sections.map((s) => s.key)).toEqual(['demographics', 'episodesOfCare', 'problemList']);
  });

  test('demographics section component renders key summary items', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      identifier: [{ value: 'MRN-123' }],
      birthDate: '2000-01-01',
      gender: 'female',
      telecom: [
        { system: 'phone', use: 'home', value: '555-1234' },
        { system: 'email', use: 'home', value: 'a@example.com' },
      ],
    };

    const Component = DemographicsSection.component;
    render(
      <MantineProvider>
        <Component patient={patient} results={{}} />
      </MantineProvider>
    );

    expect(screen.getByText('MRN-123')).toBeInTheDocument();
    expect(screen.getByText(/No location/)).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
  });
});
