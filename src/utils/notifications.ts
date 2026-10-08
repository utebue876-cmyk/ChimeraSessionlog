import { notifications } from '@mantine/notifications';
import { normalizeErrorString } from '@medplum/core';
import { IconCircleOff } from '@tabler/icons-react';
import { createElement } from 'react';

export const showErrorNotification = (err: unknown): void => {
  notifications.show({
    color: 'red',
    icon: createElement(IconCircleOff),
    title: 'Error',
    message: normalizeErrorString(err),
  });
};
