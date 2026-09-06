import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  configureNotificationChannels,
} from '@/utils/notificationService';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function PermissionGuideScreen() {
  const router = useSafeRouter();
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // 使用 ref 来避免 useEffect 中的 setState 问题
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    configureNotificationChannels();
    getNotificationPermissionStatus().then((s) => {
      setNotificationStatus(s);
    });
  }, []);

  async function handleRequestNotification() {
    const granted = await requestNotificationPermission();
    const newStatus = await getNotificationPermissionStatus();
    setNotificationStatus(newStatus);
    if (!granted) {
      Alert.alert(
        '通知权限被拒绝',
        '您已拒绝通知权限。请到系统设置中手动开启通知权限，否则无法收到到点提醒。',
        [{ text: '知道了' }],
      );
    }
  }

  async function handleOpenSettings() {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch {
      Alert.alert('无法打开设置', '请手动到系统设置中开启通知权限。');
    }
  }

  const brandGuides = [
    {
      id: 'xiaomi',
      name: '小米 / 红米',
      steps: [
        '设置 → 应用设置 → 应用管理 → 周期音乐提醒',
        '开启「自启动」',
        '省电策略 → 选择「无限制」',
        '锁定后台：打开最近任务 → 长按本应用 → 点击锁定图标',
      ],
    },
    {
      id: 'huawei',
      name: '华为 / 荣耀',
      steps: [
        '设置 → 应用和服务 → 应用启动管理 → 周期音乐提醒',
        '关闭「自动管理」，手动开启「允许自启动」「允许关联启动」「允许后台活动」',
        '电池 → 更多电池设置 → 休眠时始终保持网络连接',
        '锁定后台：打开最近任务 → 向下拉动本应用卡片 → 出现锁定图标',
      ],
    },
    {
      id: 'oppo',
      name: 'OPPO / 一加',
      steps: [
        '设置 → 电池 → 更多设置 → 优化电池使用 → 周期音乐提醒 → 选择「不优化」',
        '设置 → 应用管理 → 周期音乐提醒 → 允许自启动',
        '设置 → 电池 → 后台运行 → 添加周期音乐提醒',
        '锁定后台：打开最近任务 → 点击右上角菜单 → 锁定本应用',
      ],
    },
    {
      id: 'vivo',
      name: 'vivo / iQOO',
      steps: [
        '设置 → 电池 → 后台耗电管理 → 周期音乐提醒 → 允许后台高耗电',
        '设置 → 更多设置 → 权限管理 → 权限 → 自启动管理 → 周期音乐提醒 → 开启',
        '设置 → 电池 → 休眠时保持网络连接',
        '锁定后台：打开最近任务 → 长按本应用 → 点击锁定',
      ],
    },
    {
      id: 'samsung',
      name: '三星',
      steps: [
        '设置 → 设备维护 → 电池 → 后台使用限制 → 将本应用从「深度休眠」中移除',
        '设置 → 应用 → 周期音乐提醒 → 电池 → 选择「不限制」',
        '设置 → 设备维护 → 内存 → 排除本应用',
      ],
    },
  ];

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.title}>后台播放设置帮助</Text>
        </View>

        <Text style={styles.subtitle}>
          为了确保到点能自动播放音乐提醒，请按以下步骤设置权限
        </Text>

        {/* 通知权限 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
              <FontAwesome6 name="bell" size={20} color="#2563EB" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>通知权限</Text>
              <Text style={styles.sectionDesc}>
                允许 App 发送通知，到点弹出提醒
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      notificationStatus === 'granted'
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {notificationStatus === 'granted'
                  ? '已开启'
                  : notificationStatus === 'denied'
                    ? '已拒绝'
                    : '未设置'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={
                notificationStatus === 'granted'
                  ? handleOpenSettings
                  : handleRequestNotification
              }
            >
              <Text style={styles.actionButtonText}>
                {notificationStatus === 'granted' ? '去设置' : '开启'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 电池优化 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
              <FontAwesome6 name="battery-three-quarters" size={20} color="#10B981" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>电池优化</Text>
              <Text style={styles.sectionDesc}>
                将本应用加入电池优化白名单，防止后台被杀
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionButtonFull} onPress={handleOpenSettings}>
            <Text style={styles.actionButtonText}>打开系统设置</Text>
          </TouchableOpacity>
        </View>

        {/* 各品牌手机设置指南 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF7ED' }]}>
              <FontAwesome6 name="mobile-screen" size={20} color="#F59E0B" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>各品牌手机设置指南</Text>
              <Text style={styles.sectionDesc}>
                不同品牌手机需要额外设置，点击展开查看
              </Text>
            </View>
          </View>

          {brandGuides.map((brand) => (
            <View key={brand.id} style={styles.brandItem}>
              <TouchableOpacity
                style={styles.brandHeader}
                onPress={() =>
                  setExpandedBrand(expandedBrand === brand.id ? null : brand.id)
                }
              >
                <Text style={styles.brandName}>{brand.name}</Text>
                <FontAwesome6
                  name={expandedBrand === brand.id ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#8B8FA3"
                />
              </TouchableOpacity>
              {expandedBrand === brand.id && (
                <View style={styles.brandSteps}>
                  {brand.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 说明 */}
        <View style={styles.infoBox}>
          <FontAwesome6 name="circle-info" size={16} color="#2563EB" />
          <Text style={styles.infoText}>
            不同手机系统的后台限制不同。如果设置后仍无法到点播放，建议将本应用锁定在后台任务中（在最近任务页面长按应用卡片并锁定）。
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B8FA3',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#8B8FA3',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 52,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
  },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonFull: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  brandItem: {
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 12,
    marginTop: 12,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  brandSteps: {
    marginTop: 8,
    paddingLeft: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 8,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginLeft: 8,
  },
});
