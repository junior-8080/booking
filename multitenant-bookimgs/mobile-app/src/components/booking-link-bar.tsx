import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';

interface BookingLinkBarProps {
  subdomain?: string;
}

export function BookingLinkBar({ subdomain }: BookingLinkBarProps) {
  const toast = useToast();
  if (!subdomain) return null;

  const link = `bookaata.app/book/${subdomain}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link);
    toast.showToast('Link copied.');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: link });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <View style={styles.bar}>
      <Feather name="link" size={14} color={Brand.text3} />
      <ThemedText type="small" numberOfLines={1} style={styles.link}>{link}</ThemedText>
      <Pressable style={styles.iconButton} onPress={handleCopy} hitSlop={8}>
        <Feather name="copy" size={15} color={Brand.text2} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={handleShare} hitSlop={8}>
        <Feather name="share" size={15} color={Brand.text2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: Brand.border,
  },
  link: {
    flex: 1,
    color: Brand.text2,
  },
  iconButton: {
    padding: 2,
  },
});
