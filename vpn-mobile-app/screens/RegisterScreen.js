import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { ShieldPlus, Mail, Lock, User } from 'lucide-react-native';

export default function RegisterScreen({ navigation }) {
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
            <Text style={styles.title}>Initialize Node</Text>
            <Text style={styles.subtitle}>Join the encrypted network layer</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <User size={18} color={theme.colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="FULL IDENTIFIER" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
            </View>

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
              style={styles.actionButton}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.actionButtonText}>AUTHORIZE ACCOUNT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryText}>
                Existing node? <Text style={styles.linkText}>Access terminal</Text>
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
