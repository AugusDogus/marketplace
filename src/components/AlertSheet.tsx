import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow } from '../theme';

type AlertSheetProps = {
  description: string;
  busy: boolean;
  error: string | null;
  visible: boolean;
  onClose: () => void;
  onCreate: () => void;
};

export function AlertSheet({ busy, description, error, visible, onClose, onCreate }: AlertSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close notification setup" onPress={onClose} style={styles.scrim}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={28} color={colors.blue} />
          </View>
          <Text style={styles.title}>Get notified about new listings?</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.noticeRow}>
            <Ionicons name="flash" size={18} color={colors.success} />
            <Text style={styles.noticeText}>Facebook will save this alert. We’ll check for new matches about every 15 minutes.</Text>
          </View>
          {error === null ? null : <Text style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} onPress={onCreate} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}>
            {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Create alert</Text>}
          </Pressable>
          <Pressable disabled={busy} onPress={onClose} style={styles.secondary}>
            <Text style={styles.secondaryText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, padding: 20, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 24, backgroundColor: colors.surface, ...shadow },
  iconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { marginTop: 18, color: colors.text, fontSize: 21, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  description: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  noticeRow: { marginTop: 18, padding: 13, borderRadius: 12, backgroundColor: '#EAF8F1', flexDirection: 'row', alignItems: 'center', gap: 9 },
  noticeText: { flex: 1, color: '#176544', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  error: { marginTop: 14, color: colors.danger, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  primary: { height: 50, marginTop: 20, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  secondary: { height: 44, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
