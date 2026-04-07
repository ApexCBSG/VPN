import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { KeyRound, ArrowLeft, Mail, Lock, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 = email, 2 = token + new password
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgotpassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Code Sent', 'A reset token has been sent to your email. Check your inbox.');
        setStep(2);
      } else {
        Alert.alert('Error', data.msg || 'Request failed');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      Alert.alert('Missing Token', 'Please enter the reset token from your email.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/resetpassword/${resetToken.trim()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Your password has been reset. Please log in with your new password.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', data.msg || 'Invalid or expired token');
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
        onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
      >
        <ArrowLeft color={theme.colors.onBackground} size={24} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          {step === 1 ? (
            <KeyRound color={theme.colors.primary} size={40} />
          ) : (
            <ShieldCheck color={theme.colors.primary} size={40} />
          )}
        </View>

        <Text style={styles.title}>{step === 1 ? 'Reset Password' : 'New Password'}</Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? "Enter your email and we'll send you a reset token."
            : 'Enter the token from your email and set a new password.'
          }
        </Text>

        {step === 1 ? (
          <>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetRequest}
              disabled={loading}
            >
              <LinearGradient colors={theme.colors.linearGradient} style={styles.btnGradient}>
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.resetButtonText}>SEND RESET TOKEN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <KeyRound size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Reset Token (from email)"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="none"
                value={resetToken}
                onChangeText={setResetToken}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <LinearGradient colors={theme.colors.linearGradient} style={styles.btnGradient}>
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.resetButtonText}>RESET PASSWORD</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendLink}
              onPress={() => setStep(1)}
            >
              <Text style={styles.resendText}>Didn't get the token? <Text style={styles.linkText}>Resend</Text></Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingTop: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '900',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.roundness.lg,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  },
  resetButton: {
    width: '100%',
    height: 56,
    borderRadius: theme.roundness.lg,
    marginTop: theme.spacing.md,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resendLink: {
    marginTop: theme.spacing.xl,
  },
  resendText: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
