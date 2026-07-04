import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TopBar } from '@/components/top-bar';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        header: () => <TopBar />,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: '#e9f9e0',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
        // Cada tab es una "pill": se resalta con fondo verde claro cuando está activo.
        tabBarItemStyle: { borderRadius: 16, marginVertical: 8, marginHorizontal: 5, paddingTop: 6 },
        // Barra flotante estilo Duolingo (margen amplio, redondeada, sombra, respeta el home indicator).
        tabBarStyle: {
          position: 'absolute',
          left: 22,
          right: 22,
          bottom: insets.bottom > 0 ? insets.bottom + 4 : 14,
          height: 68,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 6,
          borderRadius: 26,
          borderTopWidth: 0,
          borderWidth: 2,
          borderColor: colors.border,
          backgroundColor: colors.card,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="resumen" options={{ title: 'Resumen', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="balances" options={{ title: 'Balances', tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
