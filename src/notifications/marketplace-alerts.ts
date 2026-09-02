import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const backgroundTaskName = 'marketplace-notification-poll-v1';
const stateStorageKey = 'marketplace-notification-state-v1';

export type AlertShutdownResult =
  | { ok: true }
  | { ok: false; message: string };

if (!TaskManager.isTaskDefined(backgroundTaskName)) {
  TaskManager.defineTask(backgroundTaskName, async () => BackgroundTask.BackgroundTaskResult.Success);
}

export const MarketplaceAlerts = {
  reset: async (): Promise<void> => {
    await AsyncStorage.removeItem(stateStorageKey);
  },
  stop: async (): Promise<AlertShutdownResult> => {
    if (Platform.OS === 'web') return { ok: true };
    try {
      if (await TaskManager.isTaskRegisteredAsync(backgroundTaskName)) {
        await BackgroundTask.unregisterTaskAsync(backgroundTaskName);
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Automatic Facebook checks could not be disabled. Force-stop or uninstall the previous app version before using Facebook again.',
      };
    }
  },
} as const;
