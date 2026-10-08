import type { Patient } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '../../testUtils/render';
import {
  DemographicsSectionComponent,
  EpisodesOfCareSectionComponent,
  PatientProblemsSectionComponent,
} from './sidebarSectionComponents';

vi.mock('./PatientCases', () => ({
  PatientCases: ({ episodes }: { episodes: unknown[] }) => <div>episodes-count:{episodes.length}</div>,
}));

vi.mock('./PatientProblems', () => ({
  PatientProblems: ({ problems }: { problems: unknown[] }) => <div>problems-count:{problems.length}</div>,
}));

function buildPatient(overrides?: Partial<Patient>): Patient {
  return {
    resourceType: 'Patient',
    id: 'patient-1',
    identifier: [{ value: 'MRN-1' }],
    gender: 'female',
    address: [
      { use: 'home', line: ['1 Home St'], city: 'Springfield' },
      { use: 'work', line: ['2 Work Ave'], city: 'Shelbyville' },
    ],
    telecom: [
      { system: 'phone', use: 'home', value: '111-111' },
      { system: 'phone', use: 'work', value: '222-222' },
      { system: 'email', use: 'home', value: 'home@example.com' },
      { system: 'email', use: 'work', value: 'work@example.com' },
    ],
    ...overrides,
  };
}

describe('DemographicsSectionComponent', () => {
  test('shows the MRN and home contact details by default', () => {
    const patient = buildPatient({ birthDate: '1990-01-01' });

    render(<DemographicsSectionComponent patient={patient} results={{}} />);

    expect(screen.getByText('MRN-1')).toBeInTheDocument();
    expect(screen.getByText('111-111')).toBeInTheDocument();
    expect(screen.getByText('home@example.com')).toBeInTheDocument();
    expect(screen.queryByText('222-222')).not.toBeInTheDocument();
  });

  test('switches to work contact details when the Work tab is selected', async () => {
    const patient = buildPatient({ birthDate: '1990-01-01' });

    render(<DemographicsSectionComponent patient={patient} results={{}} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Work' }));

    expect(screen.getByText('222-222')).toBeInTheDocument();
    expect(screen.getByText('work@example.com')).toBeInTheDocument();
    expect(screen.queryByText('111-111')).not.toBeInTheDocument();
  });

  test('shows a Deceased badge for deceased patients', () => {
    const patient = buildPatient({ birthDate: '1990-01-01', deceasedBoolean: true });

    render(<DemographicsSectionComponent patient={patient} results={{}} />);

    expect(screen.getByText('Deceased')).toBeInTheDocument();
    expect(screen.queryByText('Minor')).not.toBeInTheDocument();
  });

  test('shows a Minor badge for patients under 18 who are not deceased', () => {
    const patient = buildPatient({ birthDate: '2020-01-01' });

    render(<DemographicsSectionComponent patient={patient} results={{}} />);

    expect(screen.getByText('Minor')).toBeInTheDocument();
    expect(screen.queryByText('Deceased')).not.toBeInTheDocument();
  });
});

describe('EpisodesOfCareSectionComponent', () => {
  test('passes the episodesOfCare results through to PatientCases', () => {
    const patient = buildPatient();

    render(
      <EpisodesOfCareSectionComponent
        patient={patient}
        results={{
          episodesOfCare: [
            { resourceType: 'EpisodeOfCare', status: 'active', patient: { reference: 'Patient/patient-1' } },
          ],
        }}
      />
    );

    expect(screen.getByText('episodes-count:1')).toBeInTheDocument();
  });
});

describe('PatientProblemsSectionComponent', () => {
  test('passes the conditions results through to PatientProblems', () => {
    const patient = buildPatient();

    render(
      <PatientProblemsSectionComponent
        patient={patient}
        results={{
          conditions: [
            { resourceType: 'Condition', subject: { reference: 'Patient/patient-1' } },
            { resourceType: 'Condition', subject: { reference: 'Patient/patient-1' } },
          ],
        }}
      />
    );

    expect(screen.getByText('problems-count:2')).toBeInTheDocument();
  });
});
