import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  let tabBarStyle = {
    ...styles.tabBar,
    paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
  };

  if (Platform.OS === 'web') {
    tabBarStyle = {
      ...tabBarStyle,
      height: 'auto' as unknown as number,
    };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="house" size={size ?? 18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: '周期列表',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="list-check" size={size ?? 18} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
