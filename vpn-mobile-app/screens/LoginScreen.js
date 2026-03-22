import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ShieldCheck, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen({ navigation }) {
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
            <Text style={styles.brandTagline}>VOICE OF THE SECURE LAYER</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>IDENTIFICATION</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="ACCESS EMAIL" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="SECURITY KEY" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.loginButton}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.loginButtonText}>ESTABLISH CONNECTION</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.secondaryText}>
                No credentials? <Text style={styles.linkText}>Register node</Text>
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
});
