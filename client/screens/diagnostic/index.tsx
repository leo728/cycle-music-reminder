/**
 * 诊断信息页 - 用于排查通知和复制问题
 * 显示：周期状态、通知权限、已调度通知、存储数据等
 */

import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { getCycleStatus, getDayDate, loadTasks, formatDate } from '@/utils/storage';
import { getNotificationPermissionStatus, getScheduledCount } from '@/utils/notificationService';
import { getMusicFileCount, getMusicStoragePath } from '@/utils/musicStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

interface DiagnosticInfo {
  systemTime: string;
  platform: string;
  cycles: Array<{
    id: string;
    name: string;
    startDate: string;
    totalDays: number;
    isActive: boolean;
    status: string;
    statusReason: string;
  }>;
  taskCount: number;
  tasksByDay: Array<{
    dayNumber: number;
    date: string;
    tasks: Array<{ id: string; time: string; name: string; isEnabled: boolean; musicFileName: string }>;
  }>;
  notificationPermission: string;
  scheduledNotificationCount: number;
  scheduledNotifications: Array<{
    identifier: string;
    title: string;
    body: string;
    triggerTime: string;
    data: Record<string, unknown>;
  }>;
  musicFileCount: number;
  musicStoragePath: string;
  rawStorageCycles: string;
  rawStorageTasks: string;
}

export default function DiagnosticScreen() {
  const { cycles, tasks } = useCycles();
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const gatherInfo = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const permStatus = await getNotificationPermissionStatus();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const musicCount = await getMusicFileCount();
      const musicPath = await getMusicStoragePath();
      const rawCycles = await AsyncStorage.getItem('@cycle_music_reminder:cycles') ?? '(empty)';
      const rawTasks = await AsyncStorage.getItem('@cycle_music_reminder:tasks') ?? '(empty)';

      // Parse all tasks for display
      const allTasks = await loadTasks();

      // Group tasks by day for active cycle
      const activeCycle = cycles.find((c) => c.isActive && getCycleStatus(c) === 'in_progress');
      const tasksByDay: DiagnosticInfo['tasksByDay'] = [];
      if (activeCycle) {
        for (let d = 1; d <= activeCycle.totalDays; d++) {
          const dayTasks = allTasks
            .filter((t) => t.cycleId === activeCycle.id && t.dayNumber === d)
            .sort((a, b) => a.time.localeCompare(b.time));
          if (dayTasks.length > 0) {
            tasksByDay.push({
              dayNumber: d,
              date: getDayDate(activeCycle, d),
              tasks: dayTasks.map((t) => ({
                id: t.id,
                time: t.time,
                name: t.name,
                isEnabled: t.isEnabled,
                musicFileName: t.musicFileName || '(none)',
              })),
            });
          }
        }
      }

      const diagInfo: DiagnosticInfo = {
        systemTime: now.toString(),
        platform: `${Platform.OS} ${Platform.Version}`,
        cycles: cycles.map((c) => {
          const status = getCycleStatus(c);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startDate = new Date(c.startDate + 'T00:00:00');
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + c.totalDays - 1);
          return {
            id: c.id,
            name: c.name,
            startDate: c.startDate,
            totalDays: c.totalDays,
            isActive: c.isActive,
            status,
            statusReason: `today=${formatDate(today)}, start=${formatDate(startDate)}, end=${formatDate(endDate)}`,
          };
        }),
        taskCount: allTasks.length,
        tasksByDay,
        notificationPermission: permStatus,
        scheduledNotificationCount: scheduled.length,
        scheduledNotifications: scheduled.slice(0, 5).map((s) => {
          const trigger = s.trigger as Record<string, unknown> | null;
          let triggerTime = 'unknown';
          if (trigger) {
            const triggerType = trigger.type as string;
            const triggerDate = trigger.date;
            if (triggerDate) {
              // Handle both number (timestamp) and string formats
              const dateObj = typeof triggerDate === 'number'
                ? new Date(triggerDate)
                : new Date(triggerDate as string);
              triggerTime = `${triggerType}: ${dateObj.toString()}`;
            } else {
              triggerTime = `type=${triggerType}, date=${String(triggerDate)}`;
            }
          }
          return {
            identifier: s.identifier,
            title: s.content.title ?? '',
            body: s.content.body ?? '',
            triggerTime,
            data: (s.content.data ?? {}) as Record<string, unknown>,
          };
        }),
        musicFileCount: musicCount,
        musicStoragePath: musicPath,
        rawStorageCycles: rawCycles.length > 500 ? rawCycles.slice(0, 500) + '...(truncated)' : rawCycles,
        rawStorageTasks: rawTasks.length > 500 ? rawTasks.slice(0, 500) + '...(truncated)' : rawTasks,
      };

      setInfo(diagInfo);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [cycles, tasks]);

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
          诊断信息
        </Text>

        <Pressable
          onPress={gatherInfo}
          disabled={loading}
          style={{ backgroundColor: '#2563EB', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {loading ? '加载中...' : '刷新诊断信息'}
          </Text>
        </Pressable>

        {info && (
          <View style={{ gap: 16 }}>
            {/* System Info */}
            <Section title="系统信息">
              <InfoRow label="系统时间" value={info.systemTime} />
              <InfoRow label="平台" value={info.platform} />
            </Section>

            {/* Cycles */}
            <Section title={`周期 (${info.cycles.length} 个)`}>
              {info.cycles.length === 0 ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>无周期数据</Text>
              ) : (
                info.cycles.map((c) => (
                  <View key={c.id} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{c.name}</Text>
                    <InfoRow label="ID" value={c.id} />
                    <InfoRow label="开始日期" value={c.startDate} />
                    <InfoRow label="天数" value={String(c.totalDays)} />
                    <InfoRow label="启用" value={c.isActive ? '是' : '否'} />
                    <InfoRow
                      label="状态"
                      value={c.status}
                      valueColor={c.status === 'in_progress' ? '#059669' : c.status === 'completed' ? '#94A3B8' : '#F59E0B'}
                    />
                    <InfoRow label="判定依据" value={c.statusReason} />
                  </View>
                ))
              )}
            </Section>

            {/* Tasks by Day */}
            <Section title={`任务 (${info.taskCount} 个, 按天分组)`}>
              {info.tasksByDay.length === 0 ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>无任务数据（或无进行中的周期）</Text>
              ) : (
                info.tasksByDay.map((day) => (
                  <View key={day.dayNumber} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                      第 {day.dayNumber} 天 ({day.date})
                    </Text>
                    {day.tasks.map((t) => (
                      <View key={t.id} style={{ marginTop: 4, paddingLeft: 8 }}>
                        <Text style={{ fontSize: 12, color: t.isEnabled ? '#334155' : '#94A3B8' }}>
                          {t.time} · {t.name} · {t.isEnabled ? '开启' : '关闭'} · 音乐: {t.musicFileName}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#CBD5E1' }}>ID: {t.id}</Text>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </Section>

            {/* Notification Permission */}
            <Section title="通知权限">
              <InfoRow
                label="权限状态"
                value={info.notificationPermission}
                valueColor={info.notificationPermission === 'granted' ? '#059669' : '#EF4444'}
              />
            </Section>

            {/* Scheduled Notifications */}
            <Section title={`已调度通知 (${info.scheduledNotificationCount} 个)`}>
              {info.scheduledNotifications.length === 0 ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>无已调度通知</Text>
              ) : (
                info.scheduledNotifications.map((n) => (
                  <View key={n.identifier} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{n.title}</Text>
                    <Text style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{n.body}</Text>
                    <InfoRow label="触发时间" value={n.triggerTime} />
                    <InfoRow label="ID" value={n.identifier} />
                  </View>
                ))
              )}
            </Section>

            {/* Music Files */}
            <Section title="音乐文件">
              <InfoRow label="文件数量" value={String(info.musicFileCount)} />
              <InfoRow label="存储路径" value={info.musicStoragePath} />
            </Section>

            {/* Raw Storage */}
            <Section title="原始存储数据">
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 }}>Cycles:</Text>
              <Text style={{ fontSize: 10, color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                {info.rawStorageCycles}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 8, marginBottom: 4 }}>Tasks:</Text>
              <Text style={{ fontSize: 10, color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                {info.rawStorageTasks}
              </Text>
            </Section>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#2563EB', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 2 }}>
      <Text style={{ fontSize: 12, color: '#64748B', width: 80 }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: valueColor ?? '#334155', flex: 1 }}>{value}</Text>
    </View>
  );
}
