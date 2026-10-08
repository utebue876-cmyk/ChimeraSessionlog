import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '../../testUtils/render';
import { DateTimeNoSeconds } from './DateTimeNoSeconds';

vi.mock('@medplum/react', () => ({
  convertIsoToLocal: vi.fn((value: string) => (value === '2024-05-20T10:33:00.000Z' ? '2024-05-20T10:33' : '')),
  convertLocalToIso: vi.fn((value: string) => `${value}:00.000Z`),
}));

describe('DateTimeNoSeconds', () => {
  test('renders parsed default date value', () => {
    render(<DateTimeNoSeconds name="visit-start" label="Visit start" defaultValue="2024-05-20T10:33:00.000Z" />);

    expect(screen.getByLabelText('Visit start')).toHaveValue('2024-05-20');
  });

  test('emits undefined when date changes without complete time selection', () => {
    const onChange = vi.fn();

    render(<DateTimeNoSeconds name="visit-start" label="Visit start" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Visit start'), { target: { value: '2024-05-21' } });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
