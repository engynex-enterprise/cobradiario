import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('cobrador@demo.com');
  const [password, setPassword] = useState('Password123');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>💵</Text>
        <Text style={styles.title}>Cobro Diario</Text>
        <Text style={styles.subtitle}>App del cobrador</Text>

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="correo@ejemplo.com"
        />
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>Demo: cobrador@demo.com / Password123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 24, gap: 6 },
  logo: { fontSize: 40, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderBottomWidth: 4,
    borderBottomColor: colors.primaryDark,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12 },
});
