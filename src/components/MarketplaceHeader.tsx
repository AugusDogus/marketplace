import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme';

type MarketplaceHeaderProps = {
  query: string;
  alertCount: number;
  connected: boolean;
  onQueryChange: (query: string) => void;
  onQuerySubmit: (query: string) => void;
  onOpenAlerts: () => void;
  onOpenAccount: () => void;
};

export function MarketplaceHeader({
  query,
  alertCount,
  connected,
  onQueryChange,
  onQuerySubmit,
  onOpenAlerts,
  onOpenAccount,
}: MarketplaceHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Marketplace</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={`Notifications${alertCount > 0 ? `, ${alertCount} active` : ''}`}
            onPress={onOpenAlerts}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={23} color={colors.text} />
            {alertCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityLabel={connected ? 'Facebook account connected' : 'Connect Facebook account'}
            onPress={onOpenAccount}
            style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
          >
            <Ionicons name="person" size={20} color={connected ? colors.blue : colors.muted} />
            <View style={[styles.connectionDot, connected ? styles.connectedDot : styles.disconnectedDot]} />
          </Pressable>
        </View>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={19} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search Marketplace"
          onChangeText={onQueryChange}
          onSubmitEditing={(event) => onQuerySubmit(event.nativeEvent.text)}
          placeholder="Search Marketplace"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        {query !== '' ? (
          <Pressable
            accessibilityLabel="Clear search"
            onPress={() => {
              onQueryChange('');
              onQuerySubmit('');
            }}
          >
            <Ionicons name="close-circle" size={18} color="#8A8D91" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingBottom: 12 },
  titleRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, color: colors.ink },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  accountButton: { position: 'relative', width: 42, height: 42, borderRadius: 21, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  connectionDot: { position: 'absolute', right: 0, bottom: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.surface },
  connectedDot: { backgroundColor: colors.success },
  disconnectedDot: { backgroundColor: '#9A9DA1' },
  pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
  badge: { position: 'absolute', right: -1, top: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.surface, fontSize: 10, lineHeight: 12, fontWeight: '800' },
  searchBox: { height: 42, borderRadius: 21, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chip, gap: 8 },
  searchInput: { flex: 1, height: 42, paddingVertical: 0, color: colors.text, fontSize: 16 },
});
