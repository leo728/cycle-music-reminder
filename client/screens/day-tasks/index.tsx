import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeSearchParams, useSafeRouter } from '@/hooks/useSafeRouter';
import { getTasksForDay, getDayDate, formatDateShort, hasTimeConflict, loadTasks } from '@/utils/storage';
import { checkMusicFileExists } from '@/utils/musicStorage';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import type { Task } from '@/types';
import TaskFormModal from './TaskFormModal';

function generateTaskId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggle,
  onPlayMusic,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onPlayMusic: (path: string) => void;
}) {
  const handleDelete = () => {
    Alert.alert('删除任务', '确定删除这个任务吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定删除', style: 'destructive', onPress: onDelete },
    ]);
  };

  const hasMusic = task.musicFileName && task.musicPath;

  return (
    <View style={[styles.taskCard, !task.isEnabled && styles.taskCardDisabled]}>
      <View style={styles.taskCardLeft}>
        <View style={[styles.timeBadge, !task.isEnabled && styles.timeBadgeDisabled]}>
          <Text style={[styles.timeText, !task.isEnabled && styles.timeTextDisabled]}>
            {task.time}
          </Text>
        </View>
        <View style={styles.taskInfo}>
          <Text style={[styles.taskName, !task.isEnabled && styles.taskNameDisabled]}>
            {task.name}
          </Text>
          <View style={styles.taskMeta}>
            <Text style={styles.taskStatus}>
              {task.isEnabled ? '已开启' : '已关闭'}
            </Text>
            {hasMusic && (
              <View style={styles.musicBadge}>
                <FontAwesome6 name="music" size={10} color={task.isEnabled ? '#2563EB' : '#94A3B8'} />
                <Text style={[styles.musicBadgeText, !task.isEnabled && styles.musicBadgeTextDisabled]} numberOfLines={1}>
                  {task.musicFileName}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.taskCardRight}>
        {hasMusic && task.isEnabled && (
          <Pressable onPress={() => onPlayMusic(task.musicPath)} hitSlop={8} style={styles.playBtn}>
            <FontAwesome6 name="play" size={14} color="#2563EB" />
          </Pressable>
        )}
        <Pressable onPress={onToggle} hitSlop={8} style={styles.toggleBtn}>
          <FontAwesome6
            name={task.isEnabled ? 'toggle-on' : 'toggle-off'}
            size={26}
            color={task.isEnabled ? '#2563EB' : '#CBD5E1'}
          />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.editBtn}>
          <FontAwesome6 name="pen" size={14} color="#94A3B8" />
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
          <FontAwesome6 name="trash-can" size={14} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}

export default function DayTasksScreen() {
  const {
    cycles,
    tasks,
    refreshTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskEnabled,
    copyPreviousDay,
    copyToAllSubsequentDays,
  } = useCycles();
  const params = useSafeSearchParams<{ cycleId: string; dayNumber: number }>();
  const router = useSafeRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useFocusEffect(() => {
    refreshTasks();
  });

  // Cleanup sound on unmount
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (soundRef.current) {
          soundRef.current.unloadAsync().catch(() => undefined);
          soundRef.current = null;
        }
      };
    }, [])
  );

  const cycle = cycles.find((c) => c.id === params.cycleId);
  const cycleId = cycle?.id ?? '';
  const dayNumber = params.dayNumber ?? 1;
  const dayDate = cycle ? getDayDate(cycle, dayNumber) : '';
  const totalDays = cycle?.totalDays ?? 1;

  const dayTasks = cycleId ? getTasksForDay(tasks, cycleId, dayNumber) : [];

  const checkTimeConflict = (time: string, excludeTaskId?: string): boolean => {
    if (!cycleId) return false;
    return hasTimeConflict(tasks, cycleId, dayNumber, time, excludeTaskId);
  };

  const handleAdd = () => {
    setEditingTask(null);
    setModalVisible(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const handleSave = async (data: {
    time: string;
    name: string;
    isEnabled: boolean;
    music: { musicFileName: string; musicPath: string };
  }) => {
    if (!cycleId) return;

    if (editingTask) {
      await updateTask({
        ...editingTask,
        time: data.time,
        name: data.name,
        isEnabled: data.isEnabled,
        musicFileName: data.music.musicFileName,
        musicPath: data.music.musicPath,
      });
    } else {
      const taskId = generateTaskId();
      const newTask: Task = {
        id: taskId,
        cycleId,
        dayNumber,
        time: data.time,
        name: data.name,
        musicFileName: data.music.musicFileName,
        musicPath: data.music.musicPath,
        isEnabled: data.isEnabled,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };
      await addTask(newTask);
    }

    setModalVisible(false);
    setEditingTask(null);
    await refreshTasks();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    await refreshTasks();
  };

  const handlePlayMusic = async (musicPath: string) => {
    try {
      // Check if file exists
      const exists = await checkMusicFileExists(musicPath);
      if (!exists) {
        Alert.alert('提示', '音乐文件不可用，请重新选择音乐。');
        return;
      }

      // Stop any current playback
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: musicPath },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            soundRef.current = null;
          }
        }
      );
      soundRef.current = sound;
    } catch {
      Alert.alert('提示', '音乐文件不可用，请重新选择音乐。');
    }
  };

  const handleToggle = async (taskId: string) => {
    await toggleTaskEnabled(taskId);
    await refreshTasks();
  };

  const handleCopyPreviousDay = async () => {
    if (dayNumber <= 1) {
      Alert.alert('无法复制', '第 1 天没有前一天可复制');
      return;
    }

    // Read directly from storage to avoid stale state issues
    const freshTasks = await loadTasks();
    const sourceTasks = cycleId
      ? getTasksForDay(freshTasks, cycleId, dayNumber - 1)
      : [];

    if (sourceTasks.length === 0) {
      Alert.alert('无法复制', '前一天还没有任务');
      return;
    }

    const doCopy = async () => {
      const result = await copyPreviousDay(cycleId, dayNumber);
      if (result.success) {
        await refreshTasks();
        Alert.alert('复制成功', `已复制前一天的 ${result.count} 个任务`);
      } else {
        Alert.alert('复制失败', '无法复制前一天的任务，请重试');
      }
    };

    // Check current day tasks from fresh data
    const currentDayTasks = cycleId
      ? getTasksForDay(freshTasks, cycleId, dayNumber)
      : [];

    if (currentDayTasks.length > 0) {
      Alert.alert(
        '替换确认',
        `当天已有 ${currentDayTasks.length} 个任务，复制前一天的任务将替换当天现有的全部任务，是否继续？`,
        [
          { text: '取消', style: 'cancel' },
          { text: '替换并复制', onPress: doCopy },
        ],
      );
    } else {
      doCopy();
    }
  };

  const handleCopyToAllSubsequent = async () => {
    if (dayNumber >= totalDays) {
      Alert.alert('无法复制', '已经是最后一天');
      return;
    }

    // Read directly from storage to avoid stale state issues
    const freshTasks = await loadTasks();
    const currentDayTasks = cycleId
      ? getTasksForDay(freshTasks, cycleId, dayNumber)
      : [];

    if (currentDayTasks.length === 0) {
      Alert.alert('无法复制', '当天还没有任务，无法复制');
      return;
    }

    const targetDays = totalDays - dayNumber;

    Alert.alert(
      '批量复制确认',
      `将把当天的 ${currentDayTasks.length} 个任务复制到第 ${dayNumber + 1} 天 ~ 第 ${totalDays} 天，共 ${targetDays} 天。这些天现有的任务将被替换，是否继续？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认复制',
          onPress: async () => {
            const result = await copyToAllSubsequentDays(cycleId, dayNumber, totalDays);
            if (result.success) {
              await refreshTasks();
              Alert.alert('复制成功', `已复制到之后 ${result.targetDays} 天`);
            } else {
              Alert.alert('复制失败', '无法复制到之后的天数，请重试');
            }
          },
        },
      ],
    );
  };

  if (!cycle) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <FontAwesome6 name="circle-exclamation" size={40} color="#CBD5E1" />
          <Text style={styles.notFoundText}>未找到该周期</Text>
          <Pressable style={styles.backBtnSolid} onPress={() => router.back()}>
            <Text style={styles.backBtnSolidText}>返回</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="chevron-left" size={18} color="#0F172A" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>第 {dayNumber} 天</Text>
            <Text style={styles.headerSubtitle}>{formatDateShort(dayDate)}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {/* Task Count */}
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            共 {dayTasks.length} 个任务
            {dayTasks.filter((t) => t.isEnabled).length !== dayTasks.length &&
              `（${dayTasks.filter((t) => t.isEnabled).length} 个已开启）`}
          </Text>
        </View>

        {/* Task List */}
        {dayTasks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <FontAwesome6 name="calendar-plus" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>还没有任务，点下方按钮添加</Text>
          </View>
        ) : (
          <FlatList
            data={dayTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
                onToggle={() => handleToggle(item.id)}
                onPlayMusic={handlePlayMusic}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Action Buttons */}
        <View style={styles.actionBtnRow}>
          <Pressable
            style={[styles.copyBtn, dayNumber <= 1 && styles.copyBtnDisabled]}
            onPress={handleCopyPreviousDay}
            disabled={dayNumber <= 1}
          >
            <FontAwesome6
              name="copy"
              size={13}
              color={dayNumber <= 1 ? '#CBD5E1' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.copyBtnText, dayNumber <= 1 && styles.copyBtnTextDisabled]}>
              复制前一天
            </Text>
          </Pressable>
          <Pressable
            style={[styles.copyBtn, dayNumber >= totalDays && styles.copyBtnDisabled]}
            onPress={handleCopyToAllSubsequent}
            disabled={dayNumber >= totalDays}
          >
            <FontAwesome6
              name="angles-right"
              size={13}
              color={dayNumber >= totalDays ? '#CBD5E1' : '#2563EB'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.copyBtnText,
                styles.copyBtnTextBlue,
                dayNumber >= totalDays && styles.copyBtnTextDisabled,
              ]}
            >
              复制到之后所有天
            </Text>
          </Pressable>
        </View>

        {/* Add Button */}
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <FontAwesome6 name="plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.addBtnText}>新增任务</Text>
        </Pressable>

        {/* Task Form Modal */}
        <TaskFormModal
          visible={modalVisible}
          editingTask={editingTask}
          onClose={() => {
            setModalVisible(false);
            setEditingTask(null);
          }}
          onSave={handleSave}
          onCheckTimeConflict={checkTimeConflict}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 20,
  },
  backBtnSolid: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  countBar: {
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  taskCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  taskCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  timeBadgeDisabled: {
    backgroundColor: '#F1F5F9',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
    fontVariant: ['tabular-nums'],
  },
  timeTextDisabled: {
    color: '#CBD5E1',
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  taskNameDisabled: {
    color: '#94A3B8',
  },
  taskStatus: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  musicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    maxWidth: 120,
  },
  musicBadgeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  musicBadgeTextDisabled: {
    color: '#94A3B8',
  },
  taskCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtn: {
    padding: 4,
  },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 14,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  copyBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.5,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  copyBtnTextBlue: {
    color: '#2563EB',
  },
  copyBtnTextDisabled: {
    color: '#CBD5E1',
  },
  addBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
