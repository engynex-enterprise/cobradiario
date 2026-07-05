import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!tenantName.trim() || !fullName.trim() || !email.trim() || password.length < 8) {
      setError('Completa todos los campos. La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await signUp({
        tenantName: tenantName.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      router.replace({ pathname: '/verify', params: { email: res.email } } as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.logo}>💵</Text>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Empieza a gestionar tu negocio de cobro diario</Text>

          <Text style={styles.label}>Nombre del negocio</Text>
          <TextInput style={styles.input} value={tenantName} onChangeText={setTenantName} placeholder="Mi empresa" placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Tu nombre</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Nombre y apellido" placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Correo</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="correo@ejemplo.com" placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Teléfono (opcional)</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="300 000 0000" placeholderTextColor={colors.muted} />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.muted} />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 24, gap: 6 },
  logo: { fontSize: 40, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginTop: 10, fontWeight: '600' },
  button: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 16, borderBottomWidth: 4, borderBottomColor: colors.primaryDark },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 16 },
});
