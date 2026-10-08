import { Alert, Grid, Loader, Paper, Text } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { IconAlertCircle } from '@tabler/icons-react';
import type { JSX } from 'react';
import { CaseDetails } from './CaseDetails';
import { CaseModal } from './CaseModal';
import { CaseNotes } from './CaseNotes';
import { useCase } from './useCase';

interface CaseProps {
  patient: Patient;
}

const PANEL_HEIGHT = 430;

export function Case({ patient }: CaseProps): JSX.Element {
  const {
    activeEpisode,
    appointmentCount,
    nextAppointment,
    loading,
    error,
    editingEpisode,
    modalOpened,
    handleEdit,
    handleCloseModal,
    handleSavedCase,
    handleActiveEpisodeUpdated,
  } = useCase(patient);

  if (loading) {
    return (
      <Grid m="sm" gutter="sm" style={{ height: PANEL_HEIGHT, display: 'flex', alignItems: 'center' }}>
        <Grid.Col span={6}></Grid.Col>
        <Loader />
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error}
      </Alert>
    );
  }

  if (!activeEpisode) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="No Cases" color="blue">
        <Text>No cases found for this patient.</Text>
      </Alert>
    );
  }

  return (
    <>
      <Grid m="sm" gutter="sm">
        <Grid.Col span={7}>
          <Paper shadow="xs" style={{ minHeight: PANEL_HEIGHT }}>
            <CaseDetails
              episode={activeEpisode}
              appointmentCount={appointmentCount}
              nextAppointment={nextAppointment}
              onEdit={handleEdit}
            />
          </Paper>
        </Grid.Col>
        <Grid.Col span={5}>
          <Paper shadow="xs" p="md" style={{ height: PANEL_HEIGHT, display: 'flex', flexDirection: 'column' }}>
            <CaseNotes episode={activeEpisode} onUpdated={handleActiveEpisodeUpdated} />
          </Paper>
        </Grid.Col>
      </Grid>
      <CaseModal
        patient={patient}
        opened={modalOpened}
        onClose={handleCloseModal}
        episode={editingEpisode}
        onSaved={handleSavedCase}
        editMode={true}
      />
    </>
  );
}
