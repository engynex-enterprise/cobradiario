import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { verifyEmail, resendVerification } from '@/lib/graphql';
import { colors } from '@/lib/theme';

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onVerify() {
    setError(null); setMsg(null);
    if (!token.trim()) { setError('Pega el código o enlace de tu correo.'); return; }
    setLoading(true);
    try {
      // Acepta tanto el token suelto como un enlace que lo contenga (?token=...).
      const raw = token.trim();
      const match = raw.match(/token=([^&\s]+)/);
      const value = match ? decodeURIComponent(match[1]) : raw;
      const res = await verifyEmail(value);
      if (res.verifyEmail.ok) {
        setMsg('¡Cuenta verificada! Ya puedes iniciar sesión.');
        setTimeout(() => router.replace('/login'), 1200);
      } else {
        setError(res.verifyEmail.message || 'No se pudo verificar.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!email) { setError('No hay correo asociado.'); return; }
    setError(null); setMsg(null); setResending(true);
    try {
      await resendVerification(email);
      setMsg('Te reenviamos el correo de confirmación.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar');
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>📩</Text>
        <Text style={styles.title}>Confirma tu correo</Text>
        <Text style={styles.subtitle}>
          Enviamos un enlace de confirmación{email ? ` a ${email}` : ''}. Ábrelo desde tu correo o pega aquí el código.
        </Text>

        <Text style={styles.label}>Código o enlace</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="Pega aquí el enlace del correo"
          placeholderTextColor={colors.muted}
        />

        {msg && <Text style={styles.ok}>{msg}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={onVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onResend} disabled={resending}>
          <Text style={styles.link}>{resending ? 'Reenviando…' : 'Reenviar correo de confirmación'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.linkMuted}>Volver a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 24, gap: 6 },
  logo: { fontSize: 40, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: colors.card, color: colors.text },
  ok: { color: colors.primaryDark, fontSize: 13, marginTop: 10, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, marginTop: 10, fontWeight: '600' },
  button: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 16, borderBottomWidth: 4, borderBottomColor: colors.primaryDark },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  linkMuted: { color: colors.muted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 10 },
});
