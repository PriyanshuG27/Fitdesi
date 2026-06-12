import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestNotificationPermission, sendBrowserNotification, sendPushNotification } from '../utils/notificationHelper';
import { callZenkaiAPI } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({
  callZenkaiAPI: vi.fn()
}));

describe('notificationHelper', () => {
  let originalNotification;
  let originalVisibilityState;
  let consoleWarnSpy;

  beforeEach(() => {
    originalNotification = global.Notification;
    originalVisibilityState = global.document.visibilityState;
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.Notification = originalNotification;
    Object.defineProperty(global.document, 'visibilityState', {
      value: originalVisibilityState,
      writable: true,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  describe('requestNotificationPermission', () => {
    it('does nothing if Notification is not in window', async () => {
      delete global.Notification;
      await requestNotificationPermission();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('calls requestPermission if permission is default and resolves', async () => {
      const requestPermissionSpy = vi.fn().mockResolvedValue('granted');
      global.Notification = {
        permission: 'default',
        requestPermission: requestPermissionSpy
      };

      await requestNotificationPermission();
      expect(requestPermissionSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('catches and logs error if requestPermission rejects', async () => {
      const error = new Error('Permission denied');
      const requestPermissionSpy = vi.fn().mockRejectedValue(error);
      global.Notification = {
        permission: 'default',
        requestPermission: requestPermissionSpy
      };

      await requestNotificationPermission();
      expect(requestPermissionSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('[NotificationHelper] Failed to request permission:', error);
    });

    it('does not call requestPermission if permission is not default', async () => {
      const requestPermissionSpy = vi.fn();
      global.Notification = {
        permission: 'granted',
        requestPermission: requestPermissionSpy
      };

      await requestNotificationPermission();
      expect(requestPermissionSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendBrowserNotification', () => {
    it('does nothing if document is visible', () => {
      Object.defineProperty(global.document, 'visibilityState', {
        value: 'visible',
        configurable: true
      });
      const notificationSpy = vi.fn();
      global.Notification = notificationSpy;
      global.Notification.permission = 'granted';

      sendBrowserNotification('Title', 'Body');
      expect(notificationSpy).not.toHaveBeenCalled();
    });

    it('does nothing if squad notifications are muted', () => {
      Object.defineProperty(global.document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      });
      localStorage.setItem('zenkai_mute_squad_notifications', 'true');
      const notificationSpy = vi.fn();
      global.Notification = notificationSpy;
      global.Notification.permission = 'granted';

      sendBrowserNotification('Title', 'Body');
      expect(notificationSpy).not.toHaveBeenCalled();
    });

    it('creates a new notification if document is hidden, not muted, and permission is granted', () => {
      Object.defineProperty(global.document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      });
      
      const mockNotificationInstance = {};
      const notificationSpy = vi.fn().mockImplementation(function() {
        return mockNotificationInstance;
      });
      global.Notification = notificationSpy;
      global.Notification.permission = 'granted';

      sendBrowserNotification('Title', 'Body');
      expect(notificationSpy).toHaveBeenCalledWith('Title', {
        body: 'Body',
        icon: '/favicon.ico'
      });
    });

    it('catches and logs error if new Notification throws', () => {
      Object.defineProperty(global.document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      });
      
      const error = new Error('Notification failed');
      const notificationSpy = vi.fn().mockImplementation(function() {
        throw error;
      });
      global.Notification = notificationSpy;
      global.Notification.permission = 'granted';

      sendBrowserNotification('Title', 'Body');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[NotificationHelper] Failed to trigger notification:', error);
    });

    it('does not send if permission is not granted', () => {
      Object.defineProperty(global.document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      });
      const notificationSpy = vi.fn();
      global.Notification = notificationSpy;
      global.Notification.permission = 'default';

      sendBrowserNotification('Title', 'Body');
      expect(notificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendPushNotification', () => {
    it('calls callZenkaiAPI with correct arguments', async () => {
      vi.mocked(callZenkaiAPI).mockResolvedValue({ success: true });
      await sendPushNotification({
        recipientUids: ['user1'],
        squadCode: 'SQUAD1',
        title: 'Title',
        body: 'Body',
        url: '/squad-custom'
      });

      expect(callZenkaiAPI).toHaveBeenCalledWith('sendNotification', {
        recipientUids: ['user1'],
        squadCode: 'SQUAD1',
        title: 'Title',
        body: 'Body',
        data: { url: '/squad-custom' }
      });
    });

    it('uses default url if not provided', async () => {
      vi.mocked(callZenkaiAPI).mockResolvedValue({ success: true });
      await sendPushNotification({
        recipientUids: ['user1'],
        squadCode: 'SQUAD1',
        title: 'Title',
        body: 'Body'
      });

      expect(callZenkaiAPI).toHaveBeenCalledWith('sendNotification', {
        recipientUids: ['user1'],
        squadCode: 'SQUAD1',
        title: 'Title',
        body: 'Body',
        data: { url: '/squad' }
      });
    });

    it('logs warning when API call fails', async () => {
      const error = new Error('Network Error');
      vi.mocked(callZenkaiAPI).mockRejectedValue(error);

      await sendPushNotification({
        recipientUids: ['user1'],
        title: 'Title',
        body: 'Body'
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[NotificationHelper] Failed to send push notification:', error.message);
    });
  });
});
