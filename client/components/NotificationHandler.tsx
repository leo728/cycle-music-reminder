/**
 * NotificationHandler - 通知处理组件
 * 放在 Provider 内部，负责：
 * 1. 配置通知渠道
 * 2. 监听通知响应（点击通知时自动播放音乐）
 * 3. 初始调度
 * 4. 前台通知展示
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCycles } from '@/contexts/CycleContext';
import {
  configureNotificationChannels,
  rescheduleAllNotifications,
  setupNotificationHandler,
  type TaskNotificationData,
} from '@/utils/notificationService';
import { playMusic, stopMusic } from '@/utils/audioService';

export function NotificationHandler() {
  const { cycles, tasks, isLoading } = useCycles();
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasInitializedRef = useRef(false);

  // 设置前台通知展示处理器（必须尽早设置，否则前台通知不显示）
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    console.log('[NotificationHandler] Foreground notification handler set');
  }, []);

  // 初始化：配置通知渠道 + 初始调度
  useEffect(() => {
    if (isLoading) return;
    // 只在首次加载完成后初始化一次
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const init = async () => {
      console.log('[NotificationHandler] Initializing with cycles:', cycles.length, 'tasks:', tasks.length);
      // 配置通知渠道（Android）
      await configureNotificationChannels();
      console.log('[NotificationHandler] Notification channels configured');
      // 初始调度
      const count = await rescheduleAllNotifications(cycles, tasks);
      console.log('[NotificationHandler] Initial scheduling complete:', count, 'notifications scheduled');
    };

    init();
  }, [isLoading, cycles, tasks]);

  // 监听通知响应
  useEffect(() => {
    cleanupRef.current = setupNotificationHandler(async (notification) => {
      console.log('[NotificationHandler] Notification response received:', notification.request.content.title);
      const data = notification.request.content.data as unknown as TaskNotificationData | undefined;
      if (!data || data.type !== 'task_trigger') {
        console.log('[NotificationHandler] Not a task_trigger notification, ignoring');
        return;
      }

      console.log('[NotificationHandler] Task trigger:', data.taskName, 'musicPath:', data.musicPath);

      // 如果有音乐文件，自动播放
      if (data.musicPath) {
        const result = await playMusic(data.musicPath);
        if (!result.success) {
          console.warn('[NotificationHandler] Music playback failed:', result.error);
        } else {
          console.log('[NotificationHandler] Music playback started');
        }
      } else {
        console.log('[NotificationHandler] No music path in notification data');
      }
    });

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // 监听 App 回到前台时重新调度
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        lastAppStateRef.current !== 'active' &&
        nextState === 'active'
      ) {
        console.log('[NotificationHandler] App came to foreground, rescheduling with cycles:', cycles.length, 'tasks:', tasks.length);
        // App 回到前台，重新调度
        rescheduleAllNotifications(cycles, tasks)
          .then((count) => console.log('[NotificationHandler] Rescheduled:', count, 'notifications'))
          .catch((err) => console.error('[NotificationHandler] Reschedule failed:', err));
      }
      lastAppStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [cycles, tasks]);

  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      stopMusic().catch(() => undefined);
    };
  }, []);

  return null;
}
