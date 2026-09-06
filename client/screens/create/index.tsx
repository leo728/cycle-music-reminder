import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { Screen } from '@/components/Screen';
import { useCycles } from '@/contexts/CycleContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { formatDate } from '@/utils/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Cycle } from '@/types';

export default function CreateCycleScreen() {
  const { addCycle } = useCycles();
  const router = useSafeRouter();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [totalDays, setTotalDays] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDateChange = useCallback((_: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  }, []);

  const handleDaysChange = useCallback((text: string) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '');
    setTotalDays(cleaned);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('提示', '请输入周期名称');
      return;
    }

    const days = parseInt(totalDays, 10);
    if (!totalDays || isNaN(days) || days < 1 || days > 365) {
      Alert.alert('提示', '周期天数需在 1 ~ 365 之间');
      return;
    }

    setIsSubmitting(true);
    try {
      const cycle: Cycle = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: trimmedName,
        startDate: formatDate(startDate),
        totalDays: days,
        isActive,
        createdAt: new Date().toISOString(),
      };

      const result = await addCycle(cycle);

      if (!result.success) {
        // Has active cycle, save as inactive
        Alert.alert('提示', result.message ?? '已有进行中的周期', [
          { text: '取消', style: 'cancel' },
          {
            text: '保存为未启用',
            onPress: async () => {
              const inactiveCycle = { ...cycle, isActive: false };
              await addCycle(inactiveCycle);
              router.back();
            },
          },
        ]);
        return;
      }

      router.back();
    } finally {
      setIsSubmitting(false);
    }
  }, [name, startDate, totalDays, isActive, addCycle, router]);

  const dateStr = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日`;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="chevron-left" size={18} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>创建周期</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>周期名称</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：训练计划"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              maxLength={30}
            />
          </View>

          {/* Start Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>开始日期</Text>
            <Pressable
              style={styles.datePickerTrigger}
              onPress={() => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(true);
                }
              }}
            >
              <FontAwesome6 name="calendar" size={16} color="#2563EB" />
              <Text style={styles.datePickerText}>{dateStr}</Text>
            </Pressable>
            {(Platform.OS === 'ios' || showDatePicker) && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                textColor="#0F172A"
                style={styles.datePicker}
              />
            )}
          </View>

          {/* Total Days */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>周期天数</Text>
            <TextInput
              style={styles.input}
              placeholder="1 ~ 365"
              placeholderTextColor="#94A3B8"
              value={totalDays}
              onChangeText={handleDaysChange}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.fieldHint}>设置周期持续的天数</Text>
          </View>

          {/* Active Toggle */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>立即启用</Text>
            <Pressable
              style={styles.toggleRow}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.toggleDesc}>
                {isActive ? '创建后立即开始计时' : '仅保存，稍后手动启用'}
              </Text>
              <FontAwesome6
                name={isActive ? 'toggle-on' : 'toggle-off'}
                size={28}
                color={isActive ? '#2563EB' : '#CBD5E1'}
              />
            </Pressable>
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '创建中...' : '创建周期'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
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
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  datePickerText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  datePicker: {
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#94A3B8',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleDesc: {
    fontSize: 14,
    color: '#64748B',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
