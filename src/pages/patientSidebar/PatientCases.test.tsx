import { MantineProvider } from '@mantine/core';
import type { EpisodeOfCare, Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PatientCases } from './PatientCases';

const activeEpisodeState = vi.hoisted(() => ({
  activeEpisode: undefined as EpisodeOfCare | undefined,
  setActiveEpisode: vi.fn(),
  switchEpisode: vi.fn(),
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => activeEpisodeState,
}));

vi.mock('../case/CaseModal', () => ({
  CaseModal: ({ opened }: any) => (opened ? <div>Case Modal Open</div> : null),
}));

describe('PatientCases', () => {
  const patient: Patient = { resourceType: 'Patient', id: 'p1' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: null } as any);
    activeEpisodeState.activeEpisode = undefined;
  });

  test('shows empty state when there are no episodes', () => {
    render(
      <MantineProvider>
        <PatientCases patient={patient} episodes={[]} />
      </MantineProvider>
    );

    expect(screen.getByText('(none)')).toBeInTheDocument();
  });

  test('expands and switches episode on click', async () => {
    const user = userEvent.setup();
    const episodes: EpisodeOfCare[] = [
      {
        resourceType: 'EpisodeOfCare',
        id: 'e1',
        status: 'active',
        patient: { reference: 'Patient/p1' },
        identifier: [{ value: 'CASE-1' }],
        period: { start: '2026-01-01' },
      },
    ];

    render(
      <MantineProvider>
        <PatientCases patient={patient} episodes={episodes} />
      </MantineProvider>
    );

    await user.click(screen.getByText('CASE-1'));
    expect(activeEpisodeState.switchEpisode).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), 'p1');
  });
});
