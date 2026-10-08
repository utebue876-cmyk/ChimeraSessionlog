import { ActionIcon, TextInput, type TextInputProps } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { isValidIsoDate } from '../../utils/dateUtils';

export interface DateFieldProps extends Omit<TextInputProps, 'type' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  disableFutureDates?: boolean;
}

function isoToDigits(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return '';
  }
  const [, year, month, day] = match;
  return `${day}${month}${year}`;
}

function digitsToDisplay(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

function digitsToIso(digits: string): string {
  if (digits.length < 8) {
    return '';
  }
  const iso = `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  return isValidIsoDate(iso) ? iso : '';
}

// Renders a DD/MM/YYYY masked text field instead of the native <input type="date">, whose segmented
// day/month/year auto-advance drops or misplaces digits when typed continuously (e.g. "01011900" ->
// year 0900) in Chrome/Edge. Rejects a complete date that isn't a real calendar date or falls outside
// minDate/maxDate, instead of accepting it and only flagging the problem afterwards. A hidden native
// date input backs the calendar button so users can still pick a date visually...
export function DateField(props: DateFieldProps): JSX.Element {
  const { value, onChange, minDate, maxDate: maxDateProp, disableFutureDates, ...rest } = props;
  const todayIso = new Date().toISOString().slice(0, 10);
  const maxDate = disableFutureDates && (!maxDateProp || todayIso < maxDateProp) ? todayIso : maxDateProp;
  const [digits, setDigits] = useState(() => isoToDigits(value));
  const digitsRef = useRef(digits);
  digitsRef.current = digits;
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Resync from external changes (e.g. loading a different record) without clobbering active typing.
    // digitsRef (rather than the digits state) is read here so this effect only depends on `value`...
    if (digitsToIso(digitsRef.current) !== value && isoToDigits(value) !== digitsRef.current) {
      setDigits(isoToDigits(value));
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextDigits = event.currentTarget.value.replace(/\D/g, '').slice(0, 8);
    setDigits(nextDigits);

    if (nextDigits.length < 8) {
      onChange('');
      return;
    }
    const iso = digitsToIso(nextDigits);
    if (!iso) {
      return;
    }
    if ((minDate && iso < minDate) || (maxDate && iso > maxDate)) {
      return;
    }
    onChange(iso);
  };

  const handlePickerChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const iso = event.currentTarget.value;
    if (!iso || (minDate && iso < minDate) || (maxDate && iso > maxDate)) {
      return;
    }
    setDigits(isoToDigits(iso));
    onChange(iso);
  };

  return (
    <div style={{ position: 'relative' }}>
      <TextInput
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={digitsToDisplay(digits)}
        onChange={handleChange}
        rightSection={
          <ActionIcon
            variant="subtle"
            color="var(--mantine-color-gray-7)"
            aria-label="Open date picker"
            disabled={rest.disabled}
            onClick={() => {
              if (typeof pickerRef.current?.showPicker === 'function') {
                pickerRef.current.showPicker();
              }
            }}
          >
            <IconCalendarEvent size={16} />
          </ActionIcon>
        }
        {...rest}
      />
      <input
        ref={pickerRef}
        type="date"
        value={value}
        min={minDate}
        max={maxDate}
        disabled={rest.disabled}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: 0,
          border: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
