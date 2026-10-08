import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { FindPatientModal } from './FindPatientModal';
import { initialFormValues } from './findPatientForm';

const medplumState = vi.hoisted(() => ({
  valueSetExpand: vi.fn(),
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: any) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

describe('FindPatientModal', () => {
  test('loads gender options and triggers callbacks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onFind = vi.fn();
    const onReset = vi.fn();
    medplumState.valueSetExpand.mockResolvedValue({
      expansion: {
        contains: [
          { code: 'male', display: 'Male' },
          { code: 'female', display: 'Female' },
        ],
      },
    });

    render(
      <MantineProvider>
        <FindPatientModal
          opened={true}
          loading={false}
          formValues={initialFormValues}
          onClose={vi.fn()}
          onReset={onReset}
          onFind={onFind}
          onChange={onChange}
        />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(medplumState.valueSetExpand).toHaveBeenCalled();
    });

    await user.type(screen.getByLabelText('First Name'), 'Jane');
    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Find' }));
    expect(onFind).toHaveBeenCalled();
  });
});
