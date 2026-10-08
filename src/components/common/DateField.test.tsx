import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DateField } from './DateField';

function renderField(props: Partial<React.ComponentProps<typeof DateField>> = {}) {
  const onChange = vi.fn();
  render(
    <MantineProvider>
      <DateField label="Date of Birth" value="" onChange={onChange} {...props} />
    </MantineProvider>
  );
  return { onChange, input: screen.getByLabelText('Date of Birth') as HTMLInputElement };
}

describe('DateField', () => {
  test('typing all 8 digits continuously (no tabbing) produces the correct ISO date', () => {
    const { onChange, input } = renderField();

    fireEvent.change(input, { target: { value: '01011900' } });

    expect(onChange).toHaveBeenCalledWith('1900-01-01');
    expect(input).toHaveValue('01/01/1900');
  });

  test('formats digits as DD/MM/YYYY as they are typed', () => {
    const { input } = renderField();

    fireEvent.change(input, { target: { value: '1505' } });

    expect(input).toHaveValue('15/05');
  });

  test('reports an empty value while the date is incomplete', () => {
    const { onChange, input } = renderField();

    fireEvent.change(input, { target: { value: '1505' } });

    expect(onChange).toHaveBeenLastCalledWith('');
  });

  test('propagates a valid, in-range date', () => {
    const { onChange, input } = renderField({ minDate: '1900-01-01', maxDate: '2024-12-31' });

    fireEvent.change(input, { target: { value: '15052000' } });

    expect(onChange).toHaveBeenCalledWith('2000-05-15');
  });

  test('propagates clearing the field', () => {
    const { onChange, input } = renderField({ value: '2000-05-15' });

    fireEvent.change(input, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });

  test('rejects a value that is not a real calendar date', () => {
    const { onChange, input } = renderField();

    fireEvent.change(input, { target: { value: '30022024' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test('rejects a date before minDate', () => {
    const { onChange, input } = renderField({ minDate: '1900-01-01' });

    fireEvent.change(input, { target: { value: '31121899' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test('rejects a date after maxDate', () => {
    const { onChange, input } = renderField({ maxDate: '2024-12-31' });

    fireEvent.change(input, { target: { value: '01012025' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test('displays an existing ISO value as DD/MM/YYYY', () => {
    const { input } = renderField({ value: '1985-06-15' });

    expect(input).toHaveValue('15/06/1985');
  });

  test('renders a calendar picker button and picking a date propagates it', () => {
    const { onChange } = renderField({ minDate: '1900-01-01', maxDate: '2024-12-31' });

    expect(screen.getByLabelText('Open date picker')).toBeInTheDocument();
    const pickerInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(pickerInput, { target: { value: '2000-05-15' } });

    expect(onChange).toHaveBeenCalledWith('2000-05-15');
  });

  test('disableFutureDates rejects a date after today even without an explicit maxDate', () => {
    const { onChange, input } = renderField({ disableFutureDates: true });
    const futureYear = new Date().getFullYear() + 1;

    fireEvent.change(input, { target: { value: `0101${futureYear}` } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test('disableFutureDates still allows a past date', () => {
    const { onChange, input } = renderField({ disableFutureDates: true });

    fireEvent.change(input, { target: { value: '01011990' } });

    expect(onChange).toHaveBeenCalledWith('1990-01-01');
  });

  test('disableFutureDates keeps an explicit maxDate that is already in the past', () => {
    const { onChange, input } = renderField({ disableFutureDates: true, maxDate: '2000-12-31' });

    fireEvent.change(input, { target: { value: '01012001' } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
