/**
 * Notification Service - 通知调度服务
 * 负责通知权限、调度、取消等操作
 * 核心逻辑：根据进行中的周期和开启的任务，计算触发时间并调度通知
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Cycle, Task } from '@/types';
import { getCycleStatus } from '@/utils/storage';

// 通知数据中携带的任务信息
export interface TaskNotificationData {
  taskId: string;
  cycleId: string;
  cycleName: string;
  dayNumber: number;
  taskName: string;
  musicFileName: string;
  musicPath: string;
  type: 'task_trigger';
}

// 调度窗口：始终保证未来 48 小时的任务已调度
const SCHEDULE_WINDOW_MS = 48 * 60 * 60 * 1000;

// 已调度的通知 ID 列表（用于清理）
let scheduledNotificationIds: string[] = [];

/**
 * 配置通知渠道（Android 高优先级）
 */
export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // 创建高优先级通知渠道（类似闹钟级别）
    await Notifications.setNotificationChannelAsync('task-alarms', {
      name: '任务提醒',
      importance: Notifications.AndroidImportance.HIGH,
      description: '到点播放音乐提醒',
      vibrationPattern: [0, 500, 200, 500],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // 尝试绕过勿扰模式
    });

    // 创建默认渠道
    await Notifications.setNotificationChannelAsync('default', {
      name: '默认通知',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * 请求通知权限
 * @returns 是否已授权
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      android: {
        // 尝试请求精确闹钟权限（Android 12+）
        // 注意：在 Expo 托管工作流中可能不直接支持，需要原生模块
      },
    });
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * 检查通知权限状态
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'denied';
  }
}

/**
 * 计算任务的触发时间
 * @param cycle 周期
 * @param task 任务
 * @returns 触发时间的 Date 对象，如果已过期返回 null
 */
function calculateTriggerTime(cycle: Cycle, task: Task): Date | null {
  const startDate = new Date(cycle.startDate + 'T00:00:00');
  const [hours, minutes] = task.time.split(':').map(Number);

  // 计算任务所在天的日期
  const taskDate = new Date(startDate);
  taskDate.setDate(startDate.getDate() + (task.dayNumber - 1));
  taskDate.setHours(hours, minutes, 0, 0);

  // 如果触发时间已过，返回 null（错过不补播）
  if (taskDate.getTime() <= Date.now()) {
    return null;
  }

  return taskDate;
}

/**
 * 取消所有已调度的通知
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    // 取消所有通知
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledNotificationIds = [];
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

/**
 * 调度单个任务的通知
 * @returns 通知 ID，如果无法调度返回 null
 */
async function scheduleTaskNotification(
  cycle: Cycle,
  task: Task,
): Promise<string | null> {
  try {
    const triggerTime = calculateTriggerTime(cycle, task);
    if (!triggerTime) {
      console.log(`[Notification] Skipping task ${task.id} (${task.name}) - trigger time is in the past`);
      return null; // 已过期，跳过
    }

    const notificationId = `task-${task.id}`;
    console.log(`[Notification] Scheduling task ${task.id} (${task.name}) for ${triggerTime.toString()}`);
    console.log(`[Notification] Trigger timestamp: ${triggerTime.getTime()}, Now: ${Date.now()}, Diff: ${triggerTime.getTime() - Date.now()}ms`);

    const notificationData: TaskNotificationData = {
      taskId: task.id,
      cycleId: cycle.id,
      cycleName: cycle.name,
      dayNumber: task.dayNumber,
      taskName: task.name,
      musicFileName: task.musicFileName || '',
      musicPath: task.musicPath || '',
      type: 'task_trigger',
    };

    const result = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: cycle.name,
        body: `第 ${task.dayNumber} 天 · ${task.name}${task.musicFileName ? `\n正在播放 ${task.musicFileName}` : ''}`,
        data: notificationData as unknown as Record<string, unknown>,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 200, 500],
        categoryIdentifier: 'task-alarm',
        ...(Platform.OS === 'android'
          ? { channelId: 'task-alarms' }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });

    console.log(`[Notification] Scheduled notification ${notificationId}, result: ${result}`);
    return notificationId;
  } catch (error) {
    console.error('[Notification] Failed to schedule notification:', error);
    return null;
  }
}

/**
 * 核心调度方法：根据当前数据重新调度所有通知
 * 规则：
 * 1. 只调度「进行中」的周期
 * 2. 只调度「开启」状态的任务
 * 3. 只调度未来 48 小时内的任务（滚动调度）
 * 4. 错过不补播
 */
export async function rescheduleAllNotifications(
  cycles: Cycle[],
  tasks: Task[],
): Promise<number> {
  console.log('[NotificationService] rescheduleAllNotifications called with', cycles.length, 'cycles and', tasks.length, 'tasks');

  // 先取消所有旧调度
  await cancelAllScheduledNotifications();

  const now = Date.now();
  const scheduleWindowEnd = now + SCHEDULE_WINDOW_MS;

  // 找到进行中的周期
  const activeCycle = cycles.find((c) => {
    const status = getCycleStatus(c);
    console.log('[NotificationService] Cycle:', c.name, 'status:', status, 'isActive:', c.isActive);
    return c.isActive && status === 'in_progress';
  });

  if (!activeCycle) {
    console.log('[NotificationService] No active cycle found, skipping scheduling');
    return 0; // 没有进行中的周期
  }

  console.log('[NotificationService] Active cycle:', activeCycle.name, 'startDate:', activeCycle.startDate, 'totalDays:', activeCycle.totalDays);

  // 找到该周期中所有开启的任务
  const enabledTasks = tasks.filter(
    (t) => t.cycleId === activeCycle.id && t.isEnabled,
  );
  console.log('[NotificationService] Enabled tasks for active cycle:', enabledTasks.length);

  if (enabledTasks.length === 0) {
    return 0;
  }

  // 计算周期结束时间
  const cycleEndDate = new Date(activeCycle.startDate + 'T00:00:00');
  cycleEndDate.setDate(cycleEndDate.getDate() + activeCycle.totalDays);
  const cycleEndMs = cycleEndDate.getTime();

  // 调度每个任务
  const newIds: string[] = [];
  for (const task of enabledTasks) {
    const triggerTime = calculateTriggerTime(activeCycle, task);
    if (!triggerTime) {
      console.log('[NotificationService] Task', task.name, 'at', task.time, 'on day', task.dayNumber, '- trigger time already passed, skipping');
      continue; // 已过期
    }

    const triggerMs = triggerTime.getTime();

    // 只调度在调度窗口内且不超过周期结束的任务
    if (triggerMs > scheduleWindowEnd || triggerMs > cycleEndMs) {
      console.log('[NotificationService] Task', task.name, '- trigger time outside window, skipping');
      continue;
    }

    console.log('[NotificationService] Scheduling task', task.name, 'at', task.time, 'on day', task.dayNumber, '- trigger:', triggerTime.toISOString(), 'local:', triggerTime.toString());

    const id = await scheduleTaskNotification(activeCycle, task);
    if (id) {
      newIds.push(id);
    }
  }

  scheduledNotificationIds = newIds;
  console.log('[NotificationService] Total scheduled:', newIds.length, 'notifications');
  return newIds.length;
}

/**
 * 获取已调度的通知数量
 */
export function getScheduledCount(): number {
  return scheduledNotificationIds.length;
}

/**
 * 设置通知响应处理器
 * 当用户点击通知时调用
 */
export function setupNotificationHandler(
  handler: (notification: Notifications.Notification) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const notification = response.notification;
      handler(notification);
    },
  );

  return () => {
    subscription.remove();
  };
}

/**
 * 设置前台通知展示处理器
 * 当 App 在前台时收到通知
 */
export function setupForegroundHandler(): () => void {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // 前台时也展示通知
      // 返回 undefined 使用默认行为
      void notification;
    },
  );

  return () => {
    subscription.remove();
  };
}

/**
 * 检查是否有待处理的通知（App 启动时检查）
 */
export async function getInitialNotification(): Promise<Notifications.Notification | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification ?? null;
  } catch {
    return null;
  }
}
