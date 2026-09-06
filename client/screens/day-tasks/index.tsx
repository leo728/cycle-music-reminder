import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeSearchParams, useSafeRouter } from '@/hooks/useSafeRouter';
import { getTasksForDay, getDayDate, formatDateShort, hasTimeConflict } from '@/utils/storage';
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
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const handleDelete = () => {
    Alert.alert('删除任务', '确定删除这个任务吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定删除', style: 'destructive', onPress: onDelete },
    ]);
  };

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
          <Text style={styles.taskStatus}>
            {task.isEnabled ? '已开启' : '已关闭'}
          </Text>
        </View>
      </View>
      <View style={styles.taskCardRight}>
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
  const { cycles, tasks, refreshTasks, addTask, updateTask, deleteTask, toggleTaskEnabled } =
    useCycles();
  const params = useSafeSearchParams<{ cycleId: string; dayNumber: number }>();
  const router = useSafeRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useFocusEffect(() => {
    refreshTasks();
  });

  const cycle = cycles.find((c) => c.id === params.cycleId);
  const cycleId = cycle?.id ?? '';
  const dayNumber = params.dayNumber ?? 1;
  const dayDate = cycle ? getDayDate(cycle, dayNumber) : '';

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

  const handleSave = async (data: { time: string; name: string; isEnabled: boolean }) => {
    if (!cycleId) return;

    if (editingTask) {
      await updateTask({
        ...editingTask,
        time: data.time,
        name: data.name,
        isEnabled: data.isEnabled,
      });
    } else {
      const taskId = generateTaskId();
      const newTask: Task = {
        id: taskId,
        cycleId,
        dayNumber,
        time: data.time,
        name: data.name,
        musicFileName: '',
        musicPath: '',
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

  const handleToggle = async (taskId: string) => {
    await toggleTaskEnabled(taskId);
    await refreshTasks();
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
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

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
  taskCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
