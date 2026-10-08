import { ActionIcon, Select } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { JSX } from 'react';

export interface SelectListItem {
  value: string;
  label: string;
}

interface SelectListProps {
  label: string;
  data: SelectListItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  clearAriaLabel?: string;
  inputBackgroundColor?: string;
}

export function SelectList(props: SelectListProps): JSX.Element {
  const {
    label,
    data,
    value,
    onChange,
    placeholder,
    disabled,
    required,
    error,
    clearAriaLabel = 'Clear selection',
    inputBackgroundColor = 'white',
  } = props;

  return (
    <Select
      label={label}
      data={data}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={error}
      rightSectionPointerEvents="all"
      rightSection={
        value ? (
          <ActionIcon
            size="md"
            variant="transparent"
            color="gray.7"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(null);
            }}
            aria-label={clearAriaLabel}
          >
            <IconX size={16} />
          </ActionIcon>
        ) : null
      }
      styles={{
        input: {
          backgroundColor: inputBackgroundColor,
        },
      }}
    />
  );
}
