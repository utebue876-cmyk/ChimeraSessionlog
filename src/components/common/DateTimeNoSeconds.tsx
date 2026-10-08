import { Group, Select, TextInput } from '@mantine/core';
import { convertIsoToLocal, convertLocalToIso } from '@medplum/react';
import type { JSX } from 'react';
import { useState } from 'react';

interface DateTimeNoSecondsProps {
  name: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: Date | undefined) => void;
}

function generateHourOptions(): { value: string; label: string }[] {
  return Array.from({ length: 24 }, (_, h) => {
    const v = String(h).padStart(2, '0');
    return { value: v, label: v };
  });
}

function generateMinuteOptions(): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const v = String(i * 5).padStart(2, '0');
    return { value: v, label: v };
  });
}

const HOUR_OPTIONS = generateHourOptions();
const MINUTE_OPTIONS = generateMinuteOptions();

function parseDefaultValue(isoString?: string): { date: string; hour: string; minute: string } {
  if (!isoString) {
    return { date: '', hour: '', minute: '' };
  }
  const local = convertIsoToLocal(isoString);
  if (!local) {
    return { date: '', hour: '', minute: '' };
  }
  const separatorIndex = local.indexOf('T');
  if (separatorIndex === -1) {
    return { date: local, hour: '', minute: '' };
  }
  const fullTime = local.slice(separatorIndex + 1);
  const [hStr, mStr] = fullTime.split(':');
  const h = parseInt(hStr, 10);
  const m = (Math.round(parseInt(mStr, 10) / 5) * 5) % 60;
  return {
    date: local.slice(0, separatorIndex),
    hour: String(h).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
  };
}

export function DateTimeNoSeconds(props: DateTimeNoSecondsProps): JSX.Element {
  const { name, label, defaultValue, placeholder, required, disabled, onChange } = props;

  const parsed = parseDefaultValue(defaultValue);
  const [dateValue, setDateValue] = useState(parsed.date);
  const [hourValue, setHourValue] = useState(parsed.hour);
  const [minuteValue, setMinuteValue] = useState(parsed.minute);

  const handleChange = (newDate: string, newHour: string, newMinute: string): void => {
    if (!newDate || !newHour || !newMinute) {
      onChange?.(undefined);
      return;
    }
    const isoValue = convertLocalToIso(`${newDate}T${newHour}:${newMinute}`);
    onChange?.(isoValue ? new Date(isoValue) : undefined);
  };

  return (
    <Group grow align="flex-end">
      <TextInput
        type="date"
        name={name}
        label={label}
        placeholder={placeholder}
        value={dateValue}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const newDate = event.currentTarget.value;
          setDateValue(newDate);
          handleChange(newDate, hourValue, minuteValue);
        }}
      />
      <Select
        label="Hour"
        name={`${name}-hour`}
        data={HOUR_OPTIONS}
        value={hourValue || null}
        required={required}
        disabled={disabled}
        searchable
        placeholder="HH"
        onChange={(value) => {
          setHourValue(value ?? '');
          handleChange(dateValue, value ?? '', minuteValue);
        }}
      />
      <Select
        label="Minute"
        name={`${name}-minute`}
        data={MINUTE_OPTIONS}
        value={minuteValue || null}
        required={required}
        disabled={disabled}
        searchable
        placeholder="MM"
        onChange={(value) => {
          setMinuteValue(value ?? '');
          handleChange(dateValue, hourValue, value ?? '');
        }}
      />
    </Group>
  );
}
