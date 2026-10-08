import { describe, expect, test, vi } from 'vitest';
import { showErrorNotification } from './notifications';

const normalizeErrorStringMock = vi.hoisted(() => vi.fn());
const notificationsShowMock = vi.hoisted(() => vi.fn());

vi.mock('@medplum/core', () => ({
  normalizeErrorString: normalizeErrorStringMock,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: notificationsShowMock,
  },
}));

describe('notifications utils', () => {
  test('normalizes error and shows notification', () => {
    normalizeErrorStringMock.mockReturnValue('Mock error');
    notificationsShowMock.mockReturnValue('id');

    showErrorNotification('Original error');

    expect(normalizeErrorStringMock).toHaveBeenCalledWith('Original error');
    expect(notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        title: 'Error',
        message: 'Mock error',
      })
    );
  });
});
