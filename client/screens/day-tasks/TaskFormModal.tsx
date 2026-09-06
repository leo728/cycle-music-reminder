import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome6 } from '@expo/vector-icons';
import type { Task } from '@/types';

interface TaskFormModalProps {
  visible: boolean;
  editingTask: Task | null;
  onClose: () => void;
  onSave: (data: { time: string; name: string; isEnabled: boolean }) => void;
  onCheckTimeConflict: (time: string, excludeTaskId?: string) => boolean;
}

export default function TaskFormModal({
  visible,
  editingTask,
  onClose,
  onSave,
  onCheckTimeConflict,
}: TaskFormModalProps) {
  // Use key to force remount when editing task changes, avoiding useEffect setState
  const formKey = editingTask ? `edit-${editingTask.id}` : 'add';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TaskFormContent
            key={formKey}
            editingTask={editingTask}
            onClose={onClose}
            onSave={onSave}
            onCheckTimeConflict={onCheckTimeConflict}
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface TaskFormContentProps {
  editingTask: Task | null;
  onClose: () => void;
  onSave: (data: { time: string; name: string; isEnabled: boolean }) => void;
  onCheckTimeConflict: (time: string, excludeTaskId?: string) => boolean;
}

function TaskFormContent({
  editingTask,
  onClose,
  onSave,
  onCheckTimeConflict,
}: TaskFormContentProps) {
  // Initialize state from editingTask (key-based remount ensures correct init)
  const initialTime = (() => {
    if (editingTask) {
      const [hours, minutes] = editingTask.time.split(':').map(Number);
      const d = new Date();
      d.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  })();

  const [time, setTime] = useState(initialTime);
  const [name, setName] = useState(editingTask?.name ?? '');
  const [isEnabled, setIsEnabled] = useState(editingTask?.isEnabled ?? true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTimeChange = useCallback((_: unknown, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
    }
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('提示', '请输入任务名称');
      return;
    }

    // Check time conflict
    if (onCheckTimeConflict(timeStr, editingTask?.id)) {
      Alert.alert('提示', '这个时间已经存在任务，请修改时间。');
      return;
    }

    onSave({ time: timeStr, name: trimmedName, isEnabled });
  }, [name, timeStr, isEnabled, editingTask, onSave, onCheckTimeConflict]);

  const isEditing = editingTask !== null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{isEditing ? '编辑任务' : '新增任务'}</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <FontAwesome6 name="xmark" size={18} color="#64748B" />
        </Pressable>
      </View>

      {/* Time */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>时间</Text>
        <Pressable
          style={styles.timeTrigger}
          onPress={() => {
            if (Platform.OS === 'android') {
              setShowTimePicker(true);
            }
          }}
        >
          <FontAwesome6 name="clock" size={16} color="#2563EB" />
          <Text style={styles.timeText}>{timeStr}</Text>
        </Pressable>
        {(Platform.OS === 'ios' || showTimePicker) && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            is24Hour={true}
            textColor="#0F172A"
            style={styles.timePicker}
          />
        )}
      </View>

      {/* Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>任务名称</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：起床、午休、训练"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
          maxLength={30}
        />
      </View>

      {/* Music placeholder */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>音乐</Text>
        <View style={styles.musicPlaceholder}>
          <FontAwesome6 name="music" size={14} color="#CBD5E1" />
          <Text style={styles.musicPlaceholderText}>音乐功能将在后续版本开放</Text>
        </View>
      </View>

      {/* Enabled toggle */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>状态</Text>
        <Pressable style={styles.toggleRow} onPress={() => setIsEnabled(!isEnabled)}>
          <Text style={styles.toggleDesc}>{isEnabled ? '已开启' : '已关闭'}</Text>
          <View
            style={[
              styles.toggleTrack,
              { backgroundColor: isEnabled ? '#2563EB' : '#E2E8F0' },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                { transform: [{ translateX: isEnabled ? 20 : 2 }] },
              ]}
            />
          </View>
        </Pressable>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>取消</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  timeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    fontVariant: ['tabular-nums'],
  },
  timePicker: {
    marginTop: 8,
    height: 150,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  musicPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  musicPlaceholderText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleDesc: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
