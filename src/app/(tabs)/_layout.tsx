import { Tabs } from 'expo-router';
import { Compass, Inbox, MessageSquare, User } from 'lucide-react-native';

import { useMock } from '@/mock/store';
import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
  const pending = useMock((s) => s.received.length);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bgBase },
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        tabBarBadgeStyle: {
          backgroundColor: colors.coral,
          color: colors.textOnBrand,
          fontFamily: fonts.sansBold,
          fontSize: 10,
        },
      }}>
      <Tabs.Screen
        name="nearby"
        options={{ title: 'Nearby', tabBarIcon: ({ color }) => <Compass color={color} size={22} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarBadge: pending || undefined,
          tabBarIcon: ({ color }) => <Inbox color={color} size={22} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: 'Chats', tabBarIcon: ({ color }) => <MessageSquare color={color} size={22} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Me', tabBarIcon: ({ color }) => <User color={color} size={22} strokeWidth={1.75} /> }}
      />
    </Tabs>
  );
}
