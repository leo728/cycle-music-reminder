import { useState, useCallback, useRef, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { FontAwesome6 } from '@expo/vector-icons';
import type { Task } from '@/types';
import { saveMusicFile } from '@/utils/musicStorage';

interface MusicData {
  musicFileName: string;
  musicPath: string;
}

interface TaskFormModalProps {
  visible: boolean;
  editingTask: Task | null;
  onClose: () => void;
  onSave: (data: { time: string; name: string; isEnabled: boolean; music: MusicData }) => void;
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
  onSave: (data: { time: string; name: string; isEnabled: boolean; music: MusicData }) => void;
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

  // Music state
  const [musicFileName, setMusicFileName] = useState(editingTask?.musicFileName ?? '');
  const [musicPath, setMusicPath] = useState(editingTask?.musicPath ?? '');
  const [isPickingMusic, setIsPickingMusic] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    };
  }, []);

  // Stop playback when closing modal
  const handleClose = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
    setIsPlaying(false);
    onClose();
  }, [onClose]);

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

  // Pick music file
  const handlePickMusic = useCallback(async () => {
    try {
      setIsPickingMusic(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsPickingMusic(false);
        return;
      }

      const asset = result.assets[0];
      const originalName = asset.name || 'unknown_audio';

      // Stop any current playback
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      }

      // Copy to permanent storage
      const { permanentPath, fileName } = await saveMusicFile(asset.uri, originalName);

      setMusicFileName(fileName);
      setMusicPath(permanentPath);
      setIsPickingMusic(false);
    } catch (error) {
      console.error('Failed to pick music:', error);
      setIsPickingMusic(false);
      Alert.alert('提示', '选择音乐文件失败，请重试。');
    }
  }, []);

  // Preview/play music
  const handlePreview = useCallback(async () => {
    if (!musicPath) return;

    if (isPlaying && soundRef.current) {
      // Stop playback
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      return;
    }

    try {
      // Unload previous sound if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: musicPath },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            soundRef.current = null;
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play music:', error);
      Alert.alert('提示', '音乐文件不可用，请重新选择音乐。');
      setIsPlaying(false);
    }
  }, [musicPath, isPlaying]);

  // Remove selected music
  const handleRemoveMusic = useCallback(() => {
    // Stop playback if playing
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
      setIsPlaying(false);
    }
    setMusicFileName('');
    setMusicPath('');
  }, []);

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

    // Stop any playback before saving
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }

    onSave({
      time: timeStr,
      name: trimmedName,
      isEnabled,
      music: {
        musicFileName,
        musicPath,
      },
    });
  }, [name, timeStr, isEnabled, musicFileName, musicPath, editingTask, onSave, onCheckTimeConflict]);

  const isEditing = editingTask !== null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{isEditing ? '编辑任务' : '新增任务'}</Text>
        <Pressable onPress={handleClose} style={styles.closeBtn}>
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

      {/* Music selection */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>音乐</Text>
        <View style={styles.musicSection}>
          {musicFileName ? (
            <View style={styles.musicSelected}>
              <View style={styles.musicInfo}>
                <FontAwesome6 name="music" size={14} color="#2563EB" />
                <Text style={styles.musicFileName} numberOfLines={1}>
                  {musicFileName}
                </Text>
              </View>
              <View style={styles.musicActions}>
                <Pressable style={styles.musicActionBtn} onPress={handlePreview}>
                  {isPlaying ? (
                    <View style={styles.musicActionContent}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={styles.musicActionText}>停止</Text>
                    </View>
                  ) : (
                    <View style={styles.musicActionContent}>
                      <FontAwesome6 name="play" size={12} color="#2563EB" />
                      <Text style={styles.musicActionText}>试听</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable style={styles.musicRemoveBtn} onPress={handleRemoveMusic}>
                  <FontAwesome6 name="xmark" size={12} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.musicPickBtn} onPress={handlePickMusic} disabled={isPickingMusic}>
              {isPickingMusic ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <>
                  <FontAwesome6 name="folder-open" size={14} color="#2563EB" />
                  <Text style={styles.musicPickText}>选择音乐</Text>
                </>
              )}
            </Pressable>
          )}
          {!musicFileName && !isPickingMusic && (
            <Text style={styles.musicHint}>支持 MP3、WAV、M4A、AAC 格式</Text>
          )}
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
        <Pressable style={styles.cancelBtn} onPress={handleClose}>
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
  musicSection: {
    gap: 8,
  },
  musicPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
    justifyContent: 'center',
  },
  musicPickText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  musicHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  musicSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  musicFileName: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  musicActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  musicActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  musicActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  musicRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
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
