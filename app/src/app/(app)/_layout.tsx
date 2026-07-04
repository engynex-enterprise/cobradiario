import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { TopBar } from '@/components/top-bar';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        header: () => <TopBar />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: 'Clientes', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{ title: 'Alertas', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menú', tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Screen name="ajustes" options={{ href: null }} />
      <Tabs.Screen name="cobro" options={{ href: null }} />
      <Tabs.Screen name="loan/[id]" options={{ href: null }} />
      <Tabs.Screen name="cliente/[id]" options={{ href: null }} />
    </Tabs>
  );
}
