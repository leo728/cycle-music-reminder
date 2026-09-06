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

  // 初始化：配置通知渠道 + 初始调度
  useEffect(() => {
    if (isLoading) return;

    const init = async () => {
      // 配置通知渠道（Android）
      await configureNotificationChannels();
      // 初始调度
      await rescheduleAllNotifications(cycles, tasks);
    };

    init();
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听通知响应
  useEffect(() => {
    cleanupRef.current = setupNotificationHandler(async (notification) => {
      const data = notification.request.content.data as unknown as TaskNotificationData | undefined;
      if (!data || data.type !== 'task_trigger') return;

      // 如果有音乐文件，自动播放
      if (data.musicPath) {
        const result = await playMusic(data.musicPath);
        if (!result.success) {
          // 音乐文件不可用，停止播放但不崩溃
          console.warn('Music file unavailable:', result.error);
        }
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
        // App 回到前台，重新调度
        rescheduleAllNotifications(cycles, tasks).catch(() => { /* ignore */ });
      }
      lastAppStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [cycles, tasks]);

  // 设置前台通知展示
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
  }, []);

  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      stopMusic().catch(() => { /* ignore */ });
    };
  }, []);

  return null;
}
