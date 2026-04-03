import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ShieldPlus, Mail, Lock, User } from 'lucide-react-native';
import { API_URL } from '../config';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Incomplete Form', 'Please provide your full name, email address, and a secure password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Verification Required', 'A verification code has been dispatched to your email address.');
        navigation.navigate('VerifyEmail', { email });
      } else {
        Alert.alert('Registration Error', data.msg || 'The account could not be initialized. Please try again.');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to reach the secure network. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ShieldPlus size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Register Account</Text>
            <Text style={styles.subtitle}>Secure your corporate connectivity by joining Sentinel.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <User size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Full Name" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Mail size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Email Address" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Password" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.actionButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.actionButtonText}>SIGN UP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryText}>
                Already have an account? <Text style={styles.linkText}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.huge,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  form: {
    marginTop: theme.spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.roundness.md,
    paddingHorizontal: theme.spacing.md,
    height: 56,
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
    letterSpacing: 1,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  actionButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontFamily: theme.fonts.label,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  secondaryAction: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  secondaryText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: theme.fonts.body,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
