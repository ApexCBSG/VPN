import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

export default function VerifyEmailScreen({ navigation, route }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { email } = route.params;

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      } else {
        Alert.alert('Error', data.msg || 'Could not resend code.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not reach the server.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      if (response.ok) {
        await SecureStore.setItemAsync('userToken', data.token);
        Alert.alert('Success', 'Your account has been verified.');
        navigation.navigate('Main');
      } else {
        Alert.alert('Error', data.msg || 'Verification failed');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft color={theme.colors.onBackground} size={24} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <ShieldCheck color={theme.colors.primary} size={40} />
        </View>
        
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to{"\n"}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          autoFocus
        />

        <TouchableOpacity 
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.verifyButtonText}>VERIFY</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={resending}>
          <Text style={styles.resendText}>
            {resending ? 'Sending…' : "Didn't receive code? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: theme.spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.huge,
  },
  emailText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  otpInput: {
    width: '100%',
    height: 60,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.roundness.md,
    textAlign: 'center',
    fontSize: 32,
    letterSpacing: 10,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.display,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontFamily: theme.fonts.label,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resendButton: {
    marginTop: theme.spacing.xl,
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    fontWeight: '600',
  },
});
