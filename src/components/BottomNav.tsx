import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export type TabName = 'browse' | 'saved' | 'alerts';

type BottomNavProps = {
  active: TabName;
  alertCount: number;
  savedCount: number;
  onSelect: (tab: TabName) => void;
};

const items = [
  { id: 'browse', label: 'Browse', icon: 'storefront-outline', activeIcon: 'storefront' },
  { id: 'saved', label: 'Saved', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  { id: 'alerts', label: 'Alerts', icon: 'notifications-outline', activeIcon: 'notifications' },
] as const;

export function BottomNav({ active, alertCount, savedCount, onSelect }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isActive = active === item.id;
        const count = item.id === 'alerts' ? alertCount : item.id === 'saved' ? savedCount : 0;
        return (
          <Pressable
            accessibilityLabel={`${item.label}${count > 0 ? `, ${count}` : ''}`}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={styles.item}
          >
            <View>
              <Ionicons name={isActive ? item.activeIcon : item.icon} size={22} color={isActive ? colors.blue : colors.muted} />
              {count > 0 ? <View style={styles.dot} /> : null}
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 62, paddingTop: 7, paddingBottom: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11, lineHeight: 14, color: colors.muted, fontWeight: '600' },
  activeLabel: { color: colors.blue },
  dot: { position: 'absolute', right: -4, top: -1, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1, borderColor: colors.surface },
});
