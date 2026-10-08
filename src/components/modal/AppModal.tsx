import type { ModalProps } from '@mantine/core';
import { Modal } from '@mantine/core';
import type { JSX } from 'react';

export function AppModal({
  styles,
  closeButtonProps,
  radius = 'lg',
  centered = true,
  ...rest
}: ModalProps): JSX.Element {
  return (
    <Modal
      radius={radius}
      centered={centered}
      styles={{
        header: {
          backgroundColor: 'var(--mantine-color-blue-7)',
          borderRadius: '12px 12px 0 0',
        },
        body: { position: 'relative', minHeight: 80 },
        ...styles,
      }}
      closeButtonProps={{
        style: { color: 'white', borderRadius: 6 },
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        },
        ...closeButtonProps,
      }}
      {...rest}
    />
  );
}
