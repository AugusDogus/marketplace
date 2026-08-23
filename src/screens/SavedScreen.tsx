import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ListingCard } from '../components/ListingCard';
import type { Listing } from '../domain/marketplace';
import { colors } from '../theme';

type SavedScreenProps = {
  listings: readonly Listing[];
  onBrowse: () => void;
  onOpenListing: (listingId: string) => void;
  onToggleSaved: (listingId: string) => void;
};

export function SavedScreen({ listings, onBrowse, onOpenListing, onToggleSaved }: SavedScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved listings</Text>
        <Text style={styles.subtitle}>Keep an eye on the things you like.</Text>
      </View>
      <FlatList
        columnWrapperStyle={styles.columns}
        contentContainerStyle={[styles.content, listings.length === 0 && styles.emptyContent]}
        data={listings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.iconWrap}><Ionicons name="bookmark-outline" size={30} color={colors.blue} /></View>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>Tap the bookmark on a listing to find it here later.</Text>
            <Pressable onPress={onBrowse} style={styles.browseButton}><Text style={styles.browseText}>Browse listings</Text></Pressable>
          </View>
        }
        numColumns={2}
        renderItem={({ item }) => (
          <ListingCard listing={item} onOpen={() => onOpenListing(item.id)} onToggleSaved={() => onToggleSaved(item.id)} saved />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 17, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 3, color: colors.muted, fontSize: 13 },
  content: { padding: 14, flexGrow: 1 },
  emptyContent: { justifyContent: 'center' },
  columns: { gap: 12 },
  empty: { paddingHorizontal: 24, paddingBottom: 50, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 17, color: colors.text, fontSize: 19, fontWeight: '800' },
  emptyText: { maxWidth: 280, marginTop: 7, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  browseButton: { height: 44, marginTop: 20, paddingHorizontal: 20, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  browseText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
});
