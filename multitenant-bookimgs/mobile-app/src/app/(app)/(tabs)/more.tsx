import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useConfirm } from '@/components/confirm-dialog';
import { Brand, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

const ROWS: Array<{ href: '/more/customers' | '/more/analytics' | '/more/billing' | '/more/settings'; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { href: '/more/customers', label: 'Customers', icon: 'users' },
  { href: '/more/analytics', label: 'Analytics', icon: 'bar-chart-2' },
  { href: '/more/billing', label: 'Billing', icon: 'credit-card' },
  { href: '/more/settings', label: 'Settings', icon: 'settings' },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const handleSignOut = async () => {
    const ok = await confirm({ title: 'Sign out', message: 'You will need to sign in again to manage this business.', confirmLabel: 'Sign out', destructive: true });
    if (ok) await logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {user && (
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.name}>{user.full_name}</ThemedText>
          <ThemedText type="small" style={styles.email}>{user.email}</ThemedText>
        </View>
      )}

      <View style={styles.section}>
        {ROWS.map((row) => (
          <Link key={row.href} href={row.href} asChild>
            <Pressable style={styles.row}>
              <Feather name={row.icon} size={20} color={Brand.text2} />
              <ThemedText style={styles.rowLabel}>{row.label}</ThemedText>
              <Feather name="chevron-right" size={18} color={Brand.text3} />
            </Pressable>
          </Link>
        ))}
      </View>

      <Pressable style={styles.row} onPress={handleSignOut}>
        <Feather name="log-out" size={20} color={Brand.dangerFg} />
        <ThemedText style={[styles.rowLabel, { color: Brand.dangerFg }]}>Sign out</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  name: {
    color: Brand.text1,
    fontSize: 18,
  },
  email: {
    color: Brand.text3,
    marginTop: 2,
  },
  section: {
    paddingTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  rowLabel: {
    flex: 1,
    color: Brand.text1,
  },
});
