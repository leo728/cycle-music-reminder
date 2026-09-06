import { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeSearchParams, useSafeRouter } from '@/hooks/useSafeRouter';
import {
  getCycleStatus,
  getCurrentDay,
  getEndDate,
  getDayDate,
  getDayStatus,
  formatDateShort,
  getTasksForDay,
} from '@/utils/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface DayItem {
  dayNumber: number;
  date: string;
  status: 'completed' | 'today' | 'future';
  taskCount: number;
}

function DayRow({ item, onPress }: { item: DayItem; onPress: () => void }) {
  const statusConfig = {
    completed: { icon: 'check-circle' as const, color: '#10B981', label: '已完成' },
    today: { icon: 'circle-dot' as const, color: '#2563EB', label: '今天' },
    future: { icon: 'circle' as const, color: '#CBD5E1', label: '' },
  };
  const cfg = statusConfig[item.status];

  return (
    <Pressable onPress={onPress} style={dayStyles.row}>
      <View style={dayStyles.left}>
        <View style={[dayStyles.dayBadge, item.status === 'today' && dayStyles.dayBadgeActive]}>
          <Text
            style={[
              dayStyles.dayNumber,
              item.status === 'today' && dayStyles.dayNumberActive,
            ]}
          >
            {item.dayNumber}
          </Text>
        </View>
        <View style={dayStyles.dayInfo}>
          <Text style={dayStyles.dayLabel}>第 {item.dayNumber} 天</Text>
          <Text style={dayStyles.dayDate}>{formatDateShort(item.date)}</Text>
        </View>
      </View>
      <View style={dayStyles.right}>
        {item.taskCount > 0 && (
          <View style={dayStyles.taskCountBadge}>
            <Text style={dayStyles.taskCountText}>{item.taskCount}</Text>
          </View>
        )}
        {cfg.label ? (
          <View style={[dayStyles.statusTag, { backgroundColor: cfg.color + '15' }]}>
            <FontAwesome6 name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[dayStyles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        ) : (
          <FontAwesome6 name={cfg.icon} size={16} color={cfg.color} />
        )}
      </View>
    </Pressable>
  );
}

const dayStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayBadgeActive: {
    backgroundColor: '#2563EB',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  dayInfo: {
    gap: 2,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  dayDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  right: {
    paddingRight: 4,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskCountBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginRight: 4,
  },
  taskCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default function CycleDetailScreen() {
  const { cycles, tasks, refreshCycles } = useCycles();
  const params = useSafeSearchParams<{ cycleId: string }>();
  const router = useSafeRouter();

  useFocusEffect(
    useCallback(() => {
      refreshCycles();
    }, [refreshCycles]),
  );

  const cycle = cycles.find((c) => c.id === params.cycleId);

  const dayItems: DayItem[] = useMemo(() => {
    if (!cycle) return [];
    return Array.from({ length: cycle.totalDays }, (_, i) => {
      const dayNumber = i + 1;
      const taskCount = getTasksForDay(tasks, cycle.id, dayNumber).length;
      return {
        dayNumber,
        date: getDayDate(cycle, dayNumber),
        status: getDayStatus(cycle, dayNumber),
        taskCount,
      };
    });
  }, [cycle, tasks]);

  if (!cycle) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <FontAwesome6 name="circle-exclamation" size={40} color="#CBD5E1" />
          <Text style={styles.notFoundText}>未找到该周期</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>返回</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const status = getCycleStatus(cycle);
  const endDate = getEndDate(cycle);
  const currentDay = status === 'in_progress' ? getCurrentDay(cycle) : 0;

  const statusLabel = status === 'not_started' ? '未开始' : status === 'in_progress' ? '进行中' : '已完成';
  const statusColor = status === 'not_started' ? '#64748B' : status === 'in_progress' ? '#2563EB' : '#10B981';

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="chevron-left" size={18} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>周期详情</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.cycleName}>{cycle.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>开始日期</Text>
              <Text style={styles.infoValue}>{formatDateShort(cycle.startDate)}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>结束日期</Text>
              <Text style={styles.infoValue}>{formatDateShort(endDate)}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>总天数</Text>
              <Text style={styles.infoValue}>{cycle.totalDays} 天</Text>
            </View>
          </View>

          {status === 'in_progress' && (
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                第 <Text style={styles.progressHighlight}>{currentDay}</Text> 天 / {cycle.totalDays} 天
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(currentDay / cycle.totalDays) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Day List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>天数列表</Text>
          <Text style={styles.listHeaderCount}>{cycle.totalDays} 天</Text>
        </View>

        {/* Day List */}
        <FlatList
          data={dayItems}
          keyExtractor={(item) => String(item.dayNumber)}
          renderItem={({ item }) => (
            <DayRow
              item={item}
              onPress={() =>
                router.push('/day-tasks', { cycleId: cycle.id, dayNumber: item.dayNumber })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyDayList}>
              <Text style={styles.emptyDayText}>暂无天数数据</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.listFooter}>
              <FontAwesome6 name="circle-info" size={14} color="#94A3B8" />
              <Text style={styles.listFooterText}>
                点击某天可管理当天的任务
              </Text>
            </View>
          }
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
  backButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cycleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  progressRow: {
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
  },
  progressHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  listHeaderCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  listContent: {
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  emptyDayList: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  listFooterText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
