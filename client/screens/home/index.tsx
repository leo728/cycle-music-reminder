import { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  getCycleStatus,
  getCurrentDay,
  getDayDate,
  formatDateShort,
  getTodayTasks,
  getNextTask,
  getTomorrowFirstTask,
} from '@/utils/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const { activeCycle, tasks, refreshCycles, refreshTasks } = useCycles();
  const router = useSafeRouter();

  useFocusEffect(
    useCallback(() => {
      refreshCycles();
      refreshTasks();
    }, [refreshCycles, refreshTasks]),
  );

  const today = new Date();
  const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const todayTaskList = useMemo(() => {
    if (!activeCycle) return [];
    const status = getCycleStatus(activeCycle);
    if (status !== 'in_progress') return [];
    return getTodayTasks(tasks, activeCycle);
  }, [tasks, activeCycle]);

  const nextTaskInfo = useMemo(() => {
    if (!activeCycle) return null;
    const status = getCycleStatus(activeCycle);
    if (status !== 'in_progress') return null;

    const next = getNextTask(tasks, activeCycle);
    if (next) {
      return { type: 'today' as const, task: next };
    }

    // Today's enabled tasks are all done, check tomorrow
    const tomorrow = getTomorrowFirstTask(tasks, activeCycle);
    if (tomorrow) {
      return { type: 'tomorrow' as const, task: tomorrow.task, dayNumber: tomorrow.dayNumber };
    }

    return null;
  }, [tasks, activeCycle]);

  if (!activeCycle) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <FontAwesome6 name="music" size={40} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>周期音乐提醒</Text>
          <Text style={styles.emptySubtitle}>还没有周期计划</Text>
          <Text style={styles.emptyHint}>创建一个周期，开始规划你的音乐日程</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/create')}>
            <FontAwesome6 name="plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>创建周期</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const status = getCycleStatus(activeCycle);
  const currentDay = status === 'in_progress' ? getCurrentDay(activeCycle) : 0;
  const currentDayDate = status === 'in_progress' ? getDayDate(activeCycle, currentDay) : '';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>周期音乐提醒</Text>
          <Text style={styles.todayDate}>{todayStr}</Text>
        </View>

        {/* Active Cycle Card */}
        <View style={styles.cycleCard}>
          <View style={styles.cycleCardHeader}>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>进行中</Text>
            </View>
            <Pressable onPress={() => router.push('/list')} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>全部周期</Text>
              <FontAwesome6 name="chevron-right" size={12} color="#2563EB" />
            </Pressable>
          </View>

          <Text style={styles.cycleName}>{activeCycle.name}</Text>

          <View style={styles.progressSection}>
            <Text style={styles.progressNumber}>{currentDay}</Text>
            <Text style={styles.progressUnit}> / {activeCycle.totalDays} 天</Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(currentDay / activeCycle.totalDays) * 100}%` },
              ]}
            />
          </View>

          {currentDayDate ? (
            <Text style={styles.cycleDateRange}>
              今日：第 {currentDay} 天（{formatDateShort(currentDayDate)}）
            </Text>
          ) : null}
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="list-check" size={16} color="#2563EB" />
            <Text style={styles.sectionTitle}>今天的任务</Text>
            {todayTaskList.length > 0 && (
              <Text style={styles.sectionCount}>{todayTaskList.length} 个</Text>
            )}
          </View>

          {todayTaskList.length === 0 ? (
            <View style={styles.placeholderWrap}>
              <FontAwesome6 name="inbox" size={24} color="#CBD5E1" />
              <Text style={styles.placeholderText}>今天还没有任务</Text>
              <Pressable
                style={styles.inlineAddBtn}
                onPress={() =>
                  router.push('/day-tasks', {
                    cycleId: activeCycle.id,
                    dayNumber: currentDay,
                  })
                }
              >
                <Text style={styles.inlineAddBtnText}>去添加任务</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.taskListWrap}>
              {todayTaskList.map((task) => (
                <View key={task.id} style={styles.miniTaskRow}>
                  <View style={styles.miniTaskTime}>
                    <Text
                      style={[
                        styles.miniTaskTimeText,
                        !task.isEnabled && styles.miniTaskTimeTextDisabled,
                      ]}
                    >
                      {task.time}
                    </Text>
                  </View>
                  <View style={styles.miniTaskInfo}>
                    <Text
                      style={[
                        styles.miniTaskName,
                        !task.isEnabled && styles.miniTaskNameDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {task.name}
                    </Text>
                    {task.musicFileName ? (
                      <View style={styles.miniTaskMusic}>
                        <FontAwesome6 name="music" size={9} color={task.isEnabled ? '#2563EB' : '#94A3B8'} />
                        <Text
                          style={[
                            styles.miniTaskMusicText,
                            !task.isEnabled && styles.miniTaskMusicTextDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {task.musicFileName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.miniTaskStatus,
                      {
                        backgroundColor: task.isEnabled ? '#DBEAFE' : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniTaskStatusText,
                        { color: task.isEnabled ? '#2563EB' : '#94A3B8' },
                      ]}
                    >
                      {task.isEnabled ? '开启' : '关闭'}
                    </Text>
                  </View>
                </View>
              ))}
              <Pressable
                style={styles.viewDayBtn}
                onPress={() =>
                  router.push('/day-tasks', {
                    cycleId: activeCycle.id,
                    dayNumber: currentDay,
                  })
                }
              >
                <Text style={styles.viewDayBtnText}>管理今日任务</Text>
                <FontAwesome6 name="chevron-right" size={12} color="#2563EB" />
              </Pressable>
            </View>
          )}
        </View>

        {/* Next Task Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="bell" size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle}>下一次任务</Text>
          </View>

          {nextTaskInfo ? (
            <View style={styles.nextTaskContent}>
              <View style={styles.nextTaskIcon}>
                <FontAwesome6 name="music" size={20} color="#2563EB" />
              </View>
              <View style={styles.nextTaskInfo}>
                <Text style={styles.nextTaskTime}>
                  {nextTaskInfo.type === 'tomorrow' ? '明天 ' : '今天 '}
                  <Text style={styles.nextTaskTimeHighlight}>{nextTaskInfo.task.time}</Text>
                </Text>
                <Text style={styles.nextTaskName}>{nextTaskInfo.task.name}</Text>
              </View>
            </View>
          ) : todayTaskList.length > 0 ? (
            <View style={styles.placeholderWrap}>
              <FontAwesome6 name="circle-check" size={24} color="#10B981" />
              <Text style={styles.placeholderText}>今天的任务已全部结束</Text>
            </View>
          ) : (
            <View style={styles.placeholderWrap}>
              <FontAwesome6 name="music" size={24} color="#CBD5E1" />
              <Text style={styles.placeholderText}>暂无待执行任务</Text>
              <Text style={styles.placeholderHint}>添加任务后将在此显示下一次提醒</Text>
            </View>
          )}
        </View>

        {/* Navigate to detail */}
        <Pressable
          style={styles.detailButton}
          onPress={() => router.push('/detail', { cycleId: activeCycle.id })}
        >
          <Text style={styles.detailButtonText}>查看周期详情</Text>
          <FontAwesome6 name="arrow-right" size={14} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
    paddingTop: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  todayDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  cycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
  },
  cycleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginRight: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
    marginRight: 4,
  },
  cycleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  progressNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2563EB',
  },
  progressUnit: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  cycleDateRange: {
    fontSize: 13,
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  placeholderWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 10,
    fontWeight: '500',
  },
  placeholderHint: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
  },
  inlineAddBtn: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  inlineAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  taskListWrap: {
    gap: 0,
  },
  miniTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  miniTaskTime: {
    width: 50,
  },
  miniTaskTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    fontVariant: ['tabular-nums'],
  },
  miniTaskTimeTextDisabled: {
    color: '#CBD5E1',
  },
  miniTaskName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  miniTaskNameDisabled: {
    color: '#94A3B8',
  },
  miniTaskInfo: {
    flex: 1,
    marginHorizontal: 8,
  },
  miniTaskMusic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  miniTaskMusicText: {
    fontSize: 11,
    color: '#2563EB',
  },
  miniTaskMusicTextDisabled: {
    color: '#94A3B8',
  },
  miniTaskStatus: {
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  miniTaskStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewDayBtnText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  nextTaskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nextTaskIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  nextTaskInfo: {
    flex: 1,
    gap: 3,
  },
  nextTaskTime: {
    fontSize: 13,
    color: '#64748B',
  },
  nextTaskTimeHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 4,
  },
  nextTaskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  detailButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  detailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
