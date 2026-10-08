import { type JSX, useState } from 'react';
import { TreatmentCareplan } from './TreatmentCareplan';
import { TreatmentPathway } from './TreatmentPathway';
import type { ConfirmedTreatmentPathway } from './useTreatmentPathway';

export function TreatmentPathwayPage(): JSX.Element {
  const [confirmedPathway, setConfirmedPathway] = useState<ConfirmedTreatmentPathway | null>(null);

  if (confirmedPathway) {
    return <TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={() => setConfirmedPathway(null)} />;
  }

  return <TreatmentPathway onConfirm={setConfirmedPathway} />;
}
