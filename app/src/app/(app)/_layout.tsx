import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';

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
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#16a34a' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ title: 'Ruta del día' }} />
    </Stack>
  );
}
