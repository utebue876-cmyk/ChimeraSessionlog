import { MantineProvider } from '@mantine/core';
import type { WithId } from '@medplum/core';
import { createReference } from '@medplum/core';
import type { Encounter, Patient, Practitioner, Questionnaire, Task } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { QuestionnaireTaskPicker } from './QuestionnaireTaskPicker';

const encounter: WithId<Encounter> = {
  resourceType: 'Encounter',
  id: 'enc-1',
  status: 'in-progress',
  class: { code: 'AMB' },
  subject: { reference: 'Patient/p1' },
};

const patient: WithId<Patient> = {
  resourceType: 'Patient',
  id: 'p1',
};

const practitioner: WithId<Practitioner> = {
  resourceType: 'Practitioner',
  id: 'prac-1',
};

describe('QuestionnaireTaskPicker', () => {
  let medplum: MockClient;

  beforeEach(() => {
    medplum = new MockClient();
    vi.clearAllMocks();
  });

  function setup(onTaskCreated = vi.fn()): ReturnType<typeof render> {
    return render(
      <MedplumProvider medplum={medplum}>
        <MantineProvider>
          <QuestionnaireTaskPicker
            encounter={encounter}
            patient={patient}
            practitioner={practitioner}
            existingTasks={[]}
            onTaskCreated={onTaskCreated}
          />
        </MantineProvider>
      </MedplumProvider>
    );
  }

  test('loads active questionnaire options', async () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-1',
      status: 'active',
      title: 'Mood Assessment',
    };
    await medplum.createResource(questionnaire);

    setup();

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Add questionnaire task' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mood Assessment' })).toBeInTheDocument();
    });
  });

  test('creates a persisted questionnaire task and adds it via callback', async () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-2',
      status: 'active',
      title: 'Anxiety Screening',
    };
    await medplum.createResource(questionnaire);

    const createSpy = vi.spyOn(medplum, 'createResource');
    const onTaskCreated = vi.fn();
    const user = userEvent.setup();

    setup(onTaskCreated);

    const select = await screen.findByRole('combobox', { name: 'Add questionnaire task' });
    await user.selectOptions(select, 'q-2');
    await user.click(screen.getByRole('button', { name: 'Add questionnaire task' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Task',
          status: 'draft',
          intent: 'order',
          encounter: createReference(encounter),
          for: createReference(patient),
          owner: createReference(practitioner),
          focus: { reference: 'Questionnaire/q-2' },
          input: [
            {
              type: { text: 'Questionnaire' },
              valueReference: { reference: 'Questionnaire/q-2' },
            },
          ],
        })
      );
      expect(onTaskCreated).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Task' }));
    });
  });

  test('excludes questionnaires already represented by existing tasks', async () => {
    await medplum.createResource({ resourceType: 'Questionnaire', id: 'q-keep', status: 'active', title: 'Keep Me' });
    await medplum.createResource({ resourceType: 'Questionnaire', id: 'q-hide', status: 'active', title: 'Hide Me' });

    const existingTasks: WithId<Task>[] = [
      {
        resourceType: 'Task',
        id: 'task-1',
        status: 'in-progress',
        intent: 'order',
        focus: { reference: 'Questionnaire/q-hide' },
      },
    ];

    render(
      <MedplumProvider medplum={medplum}>
        <MantineProvider>
          <QuestionnaireTaskPicker
            encounter={encounter}
            patient={patient}
            practitioner={practitioner}
            existingTasks={existingTasks}
            onTaskCreated={vi.fn()}
          />
        </MantineProvider>
      </MedplumProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Keep Me' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Hide Me' })).not.toBeInTheDocument();
    });
  });
});
