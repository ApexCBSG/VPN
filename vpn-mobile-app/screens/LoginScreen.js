import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ShieldCheck, Mail, Lock } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';
import { useSubscription } from '../context/SubscriptionContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { syncIdentity } = useSubscription();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and security key.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store Token
        await SecureStore.setItemAsync('userToken', data.token);
        
        // Sync with RevenueCat
        if (data.user && data.user._id) {
          await syncIdentity(data.user._id);
        }

        navigation.navigate('Main');
      } else if (response.status === 401 && data.email) {
        Alert.alert('Verification Required', 'Please verify your email to access the network.');
        navigation.navigate('VerifyEmail', { email: data.email });
      } else {
        Alert.alert('Login Failed', data.msg || 'Invalid Credentials');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Could not connect to the security layer.');
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
          <View style={styles.brandContainer}>
            <View style={styles.logoOuter}>
              <ShieldCheck size={40} color={theme.colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.brandName}>SENTINEL</Text>
            <Text style={styles.brandTagline}>SECURE CORPORATE VPN ACCESS</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>ACCOUNT SIGN IN</Text>
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
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.loginButtonText}>SIGN IN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.secondaryText}>
                No account? <Text style={styles.linkText}>Create one here</Text>
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
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.huge,
  },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  brandName: {
    fontSize: 32,
    fontFamily: theme.fonts.display,
    color: theme.colors.onBackground,
    fontWeight: '800',
    letterSpacing: 4,
  },
  brandTagline: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  form: {
    marginTop: theme.spacing.huge,
  },
  label: {
    fontSize: 10,
    fontFamily: theme.fonts.label,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
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
  loginButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButtonText: {
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    fontWeight: '500',
  },
});
