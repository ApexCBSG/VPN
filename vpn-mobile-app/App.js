import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Manrope_400Regular, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { Shield, Map, Activity, Zap, User } from 'lucide-react-native';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import MapScreen from './screens/MapScreen';
import UsageScreen from './screens/UsageScreen';
import SpeedTestScreen from './screens/SpeedTestScreen';
import ServerListScreen from './screens/ServerListScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import AccountScreen from './screens/AccountScreen';
import PaywallScreen from './screens/PaywallScreen';
import VPNSettingsScreen from './screens/VPNSettingsScreen';
import { theme } from './styles/theme';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { VPNSettingsProvider } from './context/VPNSettingsContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainerLow,
          borderTopColor: theme.colors.outlineVariant,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.label,
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Shield') return <Shield size={size} color={color} />;
          if (route.name === 'Map') return <Map size={size} color={color} />;
          if (route.name === 'Stats') return <Activity size={size} color={color} />;
          if (route.name === 'Speed') return <Zap size={size} color={color} />;
          return <User size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Shield" component={DashboardScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Stats" component={UsageScreen} />
      <Tab.Screen name="Speed" component={SpeedTestScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const [initialRoute, setInitialRoute] = React.useState('Login');
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setInitialRoute('Main');
        }
      } catch (e) {
        // Fallback to login
      } finally {
        setIsReady(true);
      }
    }
    checkAuth();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if ((fontsLoaded || fontError) && isReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isReady]);

  if ((!fontsLoaded && !fontError) || !isReady) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <SubscriptionProvider>
        <VPNSettingsProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName={initialRoute}
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: theme.colors.background }
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Servers" component={ServerListScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} />
            <Stack.Screen name="VPNSettings" component={VPNSettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        </VPNSettingsProvider>
      </SubscriptionProvider>
    </SafeAreaProvider>
  );
}
