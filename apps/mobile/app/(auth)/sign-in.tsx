import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthProvider';
import { colors } from '@/theme/colors';

/**
 * Every family member downloads the same app; this is the one shared front
 * door. Primary/second admins and adult members sign in with email OTP here.
 * Kids and babysitters typically arrive via "Join a household" with an
 * invite code shared by an admin (see join.tsx).
 */
export default function SignIn() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    setSending(true);
    const { error: otpError } = await signInWithOtp(email.trim());
    setSending(false);
    if (otpError) {
      setError(otpError);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brandBlock}>
        <Text style={styles.logo}>Motherboard</Text>
        <Text style={styles.tagline}>Your family's AI life & home butler</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.dark.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleSend} disabled={sending || !email.includes('@')}>
          <Text style={styles.primaryButtonText}>{sending ? 'Sending code…' : 'Continue'}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(auth)/join')}>
          <Text style={styles.secondaryButtonText}>I have an invite code</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background, justifyContent: 'space-between', padding: 24 },
  brandBlock: { marginTop: 96, alignItems: 'center' },
  logo: { fontSize: 40, fontWeight: '700', color: colors.dark.textPrimary, letterSpacing: -1 },
  tagline: { marginTop: 8, fontSize: 15, color: colors.dark.textSecondary },
  form: { marginBottom: 40 },
  label: { color: colors.dark.textSecondary, marginBottom: 8, fontSize: 13 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.dark.textPrimary,
    fontSize: 16,
  },
  error: { color: colors.dark.danger, marginTop: 8, fontSize: 13 },
  primaryButton: {
    backgroundColor: colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { alignItems: 'center', marginTop: 20 },
  secondaryButtonText: { color: colors.dark.accentGlow, fontSize: 14, fontWeight: '500' },
});
