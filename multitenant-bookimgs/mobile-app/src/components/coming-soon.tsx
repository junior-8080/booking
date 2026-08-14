import { Feather } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

interface ComingSoonProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
}

// Placeholder for screens not yet built out in this pass — a real screen
// with the same route name replaces this without touching navigation.
export function ComingSoon({ icon, title }: ComingSoonProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Feather name={icon} size={32} color={Brand.text3} />
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      <ThemedText type="small" style={styles.message}>Coming soon</ThemedText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  title: {
    color: Brand.text1,
    fontSize: 20,
  },
  message: {
    color: Brand.text3,
  },
});
