import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { describeFilters, type SavedSearch } from '../domain/marketplace';
import { colors } from '../theme';

type AlertsScreenProps = {
  alerts: readonly SavedSearch[];
  onBrowse: () => void;
  onDelete: (alertId: string) => void;
  onOpen: (alert: SavedSearch) => void;
};

export function AlertsScreen({ alerts, onBrowse, onDelete, onOpen }: AlertsScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace alerts</Text>
        <Text style={styles.subtitle}>We’ll keep watch for new matches.</Text>
      </View>
      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="notifications-outline" size={31} color={colors.blue} /></View>
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptyText}>Create an alert from any set of Marketplace results.</Text>
          <Pressable onPress={onBrowse} style={styles.browseButton}><Text style={styles.browseText}>Browse Marketplace</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <Ionicons name="sparkles" size={20} color={colors.blue} />
            <Text style={styles.infoText}>We’ll check for new matches when you open the app and periodically in the background.</Text>
          </View>
          {alerts.map((alert) => (
            <Pressable key={alert.id} onPress={() => onOpen(alert)} style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}>
              <View style={styles.bell}><Ionicons name="notifications" size={20} color={colors.blue} /></View>
              <View style={styles.copy}>
                <Text style={styles.alertTitle}>{alert.label}</Text>
                <Text numberOfLines={2} style={styles.alertDescription}>{describeFilters(alert.query, alert.filters)}</Text>
                <View style={styles.activeRow}>
                  <View style={[styles.activeDot, alert.provider === 'legacy-local' && styles.localDot]} />
                  <Text style={[styles.activeText, alert.provider === 'legacy-local' && styles.localText]}>
                    {alert.provider === 'facebook' ? 'Alert active' : 'Saved on this device'} · Created {alert.createdAt}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel={`Delete alert ${alert.label}`}
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  onDelete(alert.id);
                }}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={19} color={colors.muted} />
              </Pressable>
            </Pressable>
          ))}
          <Pressable onPress={onBrowse} style={styles.addButton}>
            <Ionicons name="add" size={19} color={colors.blue} />
            <Text style={styles.addText}>Create another alert</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 17, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 3, color: colors.muted, fontSize: 13 },
  content: { padding: 14, gap: 10 },
  infoCard: { marginBottom: 3, padding: 14, borderRadius: 13, backgroundColor: colors.blueSoft, flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, color: '#174E96', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  alertCard: { padding: 15, borderRadius: 15, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'flex-start' },
  pressed: { opacity: 0.7 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12 },
  alertTitle: { color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  alertDescription: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 18 },
  activeRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  activeText: { color: colors.success, fontSize: 11, fontWeight: '700' },
  localDot: { backgroundColor: colors.muted },
  localText: { color: colors.muted },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addButton: { height: 48, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addText: { color: colors.blue, fontSize: 14, fontWeight: '800' },
  empty: { flex: 1, paddingHorizontal: 34, paddingBottom: 50, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 17, color: colors.text, fontSize: 19, fontWeight: '800' },
  emptyText: { maxWidth: 280, marginTop: 7, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  browseButton: { height: 44, marginTop: 20, paddingHorizontal: 20, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  browseText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
});
