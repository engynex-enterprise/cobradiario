import { Text as RNText, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AuthProvider } from '@/lib/auth';
import { AnalyticsProvider } from '@/lib/analytics';

// Mapea fontWeight → variante Nunito (RN no selecciona el peso en fuentes custom).
const FAMILY: Record<string, string> = {
  '300': 'Nunito_400Regular',
  '400': 'Nunito_400Regular',
  normal: 'Nunito_400Regular',
  '500': 'Nunito_500Medium',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  bold: 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_800ExtraBold',
};

// Parche único: cada <Text> usa Nunito según su fontWeight (el estilo propio gana si define fontFamily).
const AnyText = RNText as unknown as { render?: (...a: unknown[]) => unknown; __nunitoPatched?: boolean };
if (!AnyText.__nunitoPatched && typeof AnyText.render === 'function') {
  const original = AnyText.render.bind(AnyText);
  AnyText.render = (...args: unknown[]) => {
    const [props, ref] = args as [{ style?: unknown }, unknown];
    const flat = (StyleSheet.flatten(props?.style) as { fontWeight?: string | number }) || {};
    const family = FAMILY[String(flat.fontWeight ?? '400')] ?? 'Nunito_400Regular';
    return original({ ...props, style: [{ fontFamily: family }, props?.style] }, ref);
  };
  AnyText.__nunitoPatched = true;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AnalyticsProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </AnalyticsProvider>
    </SafeAreaProvider>
  );
}
