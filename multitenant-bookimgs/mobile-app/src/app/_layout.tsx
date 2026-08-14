import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmProvider } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ToastProvider } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { queryClient } from '@/lib/query-client';

// Expo Router's convention: exporting ErrorBoundary from a layout file wraps
// its entire route subtree — an uncaught render error anywhere in the app
// shows this instead of a blank/crashed screen. This is the app's only
// safety net against a single bad render taking down the whole session.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <SafeAreaView style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <ThemedText type="subtitle" style={styles.errorTitle}>Something went wrong</ThemedText>
        <ThemedText type="small" style={styles.errorMessage}>
          {error.message || 'An unexpected error occurred.'}
        </ThemedText>
        <Pressable style={styles.retryButton} onPress={retry}>
          <ThemedText type="smallBold" style={styles.retryLabel}>Try again</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <RootNavigator />
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'authenticated'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unauthenticated'}>
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  errorTitle: {
    color: Brand.text1,
    textAlign: 'center',
  },
  errorMessage: {
    color: Brand.text3,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.three,
    backgroundColor: Brand.brand,
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
  },
  retryLabel: {
    color: '#ffffff',
  },
});
