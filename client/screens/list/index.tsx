import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getCycleStatus, getEndDate, formatDateShort } from '@/utils/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import type { Cycle } from '@/types';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'not_started':
      return '未开始';
    case 'in_progress':
      return '进行中';
    case 'completed':
      return '已完成';
    default:
      return '';
  }
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'not_started':
      return { bg: '#F1F5F9', text: '#64748B' };
    case 'in_progress':
      return { bg: '#DBEAFE', text: '#2563EB' };
    case 'completed':
      return { bg: '#D1FAE5', text: '#059669' };
    default:
      return { bg: '#F1F5F9', text: '#64748B' };
  }
}

function CycleItem({
  cycle,
  onPress,
  onToggle,
}: {
  cycle: Cycle;
  onPress: () => void;
  onToggle: () => void;
}) {
  const status = getCycleStatus(cycle);
  const statusColors = getStatusColor(status);
  const endDate = getEndDate(cycle);

  return (
    <Pressable style={styles.cycleItem} onPress={onPress}>
      <View style={styles.cycleItemLeft}>
        <Text style={styles.cycleItemName}>{cycle.name}</Text>
        <View style={styles.cycleItemMeta}>
          <Text style={styles.cycleItemDays}>{cycle.totalDays} 天</Text>
          <Text style={styles.cycleItemDot}>·</Text>
          <Text style={styles.cycleItemDate}>
            {formatDateShort(cycle.startDate)} ~ {formatDateShort(endDate)}
          </Text>
        </View>
      </View>
      <View style={styles.cycleItemRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
            {getStatusLabel(status)}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onToggle();
          }}
          hitSlop={8}
          style={styles.toggleBtn}
        >
          <FontAwesome6
            name={cycle.isActive ? 'toggle-on' : 'toggle-off'}
            size={22}
            color={cycle.isActive ? '#2563EB' : '#CBD5E1'}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function CycleListScreen() {
  const { cycles, refreshCycles, toggleCycleActive } = useCycles();
  const router = useSafeRouter();
  const [, setRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refreshCycles();
      setRefresh((v) => v + 1);
    }, [refreshCycles]),
  );

  const handleToggle = useCallback(
    (id: string) => {
      toggleCycleActive(id).then(() => {
        refreshCycles();
        setRefresh((v) => v + 1);
      });
    },
    [toggleCycleActive, refreshCycles],
  );

  const sortedCycles = [...cycles].sort((a, b) => {
    // Active first, then by creation date desc
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>周期列表</Text>
          <Text style={styles.headerCount}>共 {cycles.length} 个周期</Text>
        </View>

        {cycles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <FontAwesome6 name="calendar-xmark" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>还没有创建任何周期</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/create')}
            >
              <FontAwesome6 name="plus" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addButtonText}>创建第一个周期</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={sortedCycles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CycleItem
                cycle={item}
                onPress={() => router.push('/detail', { cycleId: item.id })}
                onToggle={() => {
                  const status = getCycleStatus(item);
                  if (!item.isActive && status === 'completed') {
                    Alert.alert('提示', '已完成的周期无法重新启用');
                    return;
                  }
                  handleToggle(item.id);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Floating add button */}
        {cycles.length > 0 && (
          <Pressable
            style={styles.fab}
            onPress={() => router.push('/create')}
          >
            <FontAwesome6 name="plus" size={20} color="#FFFFFF" />
          </Pressable>
        )}
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
  header: {
    marginBottom: 20,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 80,
  },
  cycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 10,
  },
  cycleItemLeft: {
    flex: 1,
  },
  cycleItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  cycleItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cycleItemDays: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  cycleItemDot: {
    fontSize: 13,
    color: '#CBD5E1',
    marginHorizontal: 6,
  },
  cycleItemDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cycleItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleBtn: {
    padding: 4,
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
    marginTop: 12,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
