import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/AuthProvider';
import { colors } from '@/theme/colors';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await verifyOtp(email, code.trim());
    setVerifying(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    // Root index.tsx will redirect based on whether a household exists.
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        placeholderTextColor={colors.dark.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleVerify} disabled={verifying || code.length < 6}>
        <Text style={styles.primaryButtonText}>{verifying ? 'Verifying…' : 'Verify'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background, padding: 24, paddingTop: 120 },
  title: { fontSize: 26, fontWeight: '700', color: colors.dark.textPrimary },
  subtitle: { marginTop: 8, fontSize: 14, color: colors.dark.textSecondary, marginBottom: 32 },
  input: {
    backgroundColor: colors.dark.surface,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.dark.textPrimary,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { color: colors.dark.danger, marginTop: 8, fontSize: 13 },
  primaryButton: { backgroundColor: colors.dark.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
