import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getCycleStatus, getCurrentDay, getDayDate, formatDateShort } from '@/utils/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function HomeScreen() {
  const { activeCycle, refreshCycles } = useCycles();
  const router = useSafeRouter();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshCycles();
    }, [refreshCycles]),
  );

  const today = new Date();
  const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;

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
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/create')}
          >
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
      <View style={styles.container}>
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
            <Pressable
              onPress={() => router.push('/list')}
              style={styles.viewAllBtn}
            >
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
          </View>
          <View style={styles.placeholderWrap}>
            <FontAwesome6 name="clock" size={24} color="#CBD5E1" />
            <Text style={styles.placeholderText}>任务功能即将上线</Text>
            <Text style={styles.placeholderHint}>后续版本可为每天添加定时音乐任务</Text>
          </View>
        </View>

        {/* Next Task Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="bell" size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle}>下一次任务</Text>
          </View>
          <View style={styles.placeholderWrap}>
            <FontAwesome6 name="music" size={24} color="#CBD5E1" />
            <Text style={styles.placeholderText}>暂无待播放任务</Text>
            <Text style={styles.placeholderHint}>添加任务后将在此显示下一次提醒</Text>
          </View>
        </View>

        {/* Navigate to detail */}
        <Pressable
          style={styles.detailButton}
          onPress={() => router.push('/detail', { cycleId: activeCycle.id })}
        >
          <Text style={styles.detailButtonText}>查看周期详情</Text>
          <FontAwesome6 name="arrow-right" size={14} color="#FFFFFF" />
        </Pressable>
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
  },
  placeholderWrap: {
    alignItems: 'center',
    paddingVertical: 20,
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
