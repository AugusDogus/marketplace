import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { MarketplaceNotification } from '../domain/marketplace';
import { FacebookMarketplace } from '../facebook/marketplace';

const backgroundTaskName = 'marketplace-notification-poll-v1';
const notificationChannelId = 'marketplace-alerts';
const stateStorageKey = 'marketplace-notification-state-v1';
const maximumRememberedNotifications = 250;

type NotificationState = {
  status: 'initialized';
  seenIds: readonly string[];
};

export type AlertMonitorError = {
  tag: 'background_unavailable' | 'notification_denied' | 'request_failed' | 'storage_failed';
  message: string;
};

export type AlertMonitorResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AlertMonitorError };

const parseState = (raw: string | null): NotificationState | null => {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'status' in value &&
      value.status === 'initialized' &&
      'seenIds' in value &&
      Array.isArray(value.seenIds) &&
      value.seenIds.every((id) => typeof id === 'string')
    ) return { status: 'initialized', seenIds: value.seenIds };
  } catch {
    return null;
  }
  return null;
};

const saveState = async (seenIds: readonly string[]): Promise<AlertMonitorResult<null>> => {
  try {
    await AsyncStorage.setItem(
      stateStorageKey,
      JSON.stringify({ status: 'initialized', seenIds: seenIds.slice(0, maximumRememberedNotifications) }),
    );
    return { ok: true, value: null };
  } catch {
    return {
      ok: false,
      error: {
        tag: 'storage_failed',
        message: 'Recent alert activity could not be saved. Your alerts are still active.',
      },
    };
  }
};

const notificationPermissionGranted = async (): Promise<boolean> => {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
};

const deliver = async (notification: MarketplaceNotification): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    identifier: `marketplace-${notification.id}`,
    content: {
      title: 'New Marketplace match',
      body: notification.body.slice(0, 240),
      data: {
        marketplaceNotificationId: notification.id,
        ...(notification.url === null ? {} : { url: notification.url }),
      },
      sound: 'default',
    },
    trigger: Platform.OS === 'android' ? { channelId: notificationChannelId } : null,
  });
};

const synchronize = async (): Promise<AlertMonitorResult<{ delivered: number }>> => {
  const response = await FacebookMarketplace.notifications();
  if (!response.ok) {
    return { ok: false, error: { tag: 'request_failed', message: response.error.message } };
  }
  let state: NotificationState | null;
  try {
    state = parseState(await AsyncStorage.getItem(stateStorageKey));
  } catch {
    return {
      ok: false,
      error: {
        tag: 'storage_failed',
        message: 'Recent alert activity could not be loaded, so no notifications were sent.',
      },
    };
  }
  const currentIds = response.value.map((notification) => notification.id);
  if (state === null) {
    const saved = await saveState(currentIds);
    return saved.ok ? { ok: true, value: { delivered: 0 } } : saved;
  }
  const seenIds = new Set(state.seenIds);
  const unseen = response.value.filter((notification) => !seenIds.has(notification.id));
  let delivered = 0;
  if (unseen.length > 0 && await notificationPermissionGranted()) {
    try {
      for (const notification of [...unseen].reverse()) {
        await deliver(notification);
        delivered += 1;
      }
    } catch {
      return {
        ok: false,
        error: {
          tag: 'request_failed',
          message: 'New Marketplace matches were found, but Android could not display their notifications.',
        },
      };
    }
  }
  const saved = await saveState([...currentIds, ...state.seenIds]);
  return saved.ok ? { ok: true, value: { delivered } } : saved;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (!TaskManager.isTaskDefined(backgroundTaskName)) {
  TaskManager.defineTask(backgroundTaskName, async () => {
    const result = await synchronize();
    return result.ok ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
  });
}

const configureChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(notificationChannelId, {
    name: 'Marketplace matches',
    description: 'New results from Facebook Marketplace alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 220, 120, 220],
  });
};

const registerBackgroundTask = async (): Promise<AlertMonitorResult<null>> => {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      error: { tag: 'background_unavailable', message: 'Background Marketplace checks require the Android or iOS app.' },
    };
  }
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return {
      ok: false,
      error: {
        tag: 'background_unavailable',
        message: 'This device currently prevents Marketplace checks from running in the background.',
      },
    };
  }
  if (!await TaskManager.isTaskRegisteredAsync(backgroundTaskName)) {
    await BackgroundTask.registerTaskAsync(backgroundTaskName, { minimumInterval: 15 });
  }
  return { ok: true, value: null };
};

export const MarketplaceAlerts = {
  start: async (): Promise<AlertMonitorResult<{ delivered: number }>> => {
    try {
      await configureChannel();
      const registered = await registerBackgroundTask();
      if (!registered.ok) return registered;
      return synchronize();
    } catch {
      return {
        ok: false,
        error: {
          tag: 'background_unavailable',
          message: 'Marketplace background checks could not be scheduled. Alerts remain active on Facebook.',
        },
      };
    }
  },
  sync: synchronize,
  requestPermission: async (): Promise<AlertMonitorResult<null>> => {
    try {
      await configureChannel();
      const current = await Notifications.getPermissionsAsync();
      const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
      return permission.granted
        ? { ok: true, value: null }
        : {
            ok: false,
            error: {
              tag: 'notification_denied',
              message: 'The Facebook alert was created, but Android notifications are disabled for this app.',
            },
          };
    } catch {
      return {
        ok: false,
        error: {
          tag: 'background_unavailable',
          message: 'Android notification permission could not be checked.',
        },
      };
    }
  },
  reset: async (): Promise<void> => {
    await AsyncStorage.removeItem(stateStorageKey);
  },
  stop: async (): Promise<void> => {
    if (await TaskManager.isTaskRegisteredAsync(backgroundTaskName)) {
      await BackgroundTask.unregisterTaskAsync(backgroundTaskName);
    }
  },
} as const;
