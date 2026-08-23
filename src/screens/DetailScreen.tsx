import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Listing, ListingDetailState } from '../domain/marketplace';
import { colors, shadow } from '../theme';

type DetailScreenProps = {
  listing: Listing;
  detailState: ListingDetailState;
  saved: boolean;
  onBack: () => void;
  onToggleSaved: () => void;
};

export function DetailScreen({ listing, detailState, saved, onBack, onToggleSaved }: DetailScreenProps) {
  const detail = detailState.status === 'loaded' ? detailState.detail : null;
  const sellerName = detail?.sellerName ?? 'Facebook seller';
  const initials = sellerName.slice(0, 1).toLocaleUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Back to Marketplace" onPress={onBack} style={styles.roundButton}>
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable accessibilityLabel="Share listing" style={styles.roundButton}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable accessibilityLabel={saved ? 'Unsave listing' : 'Save listing'} onPress={onToggleSaved} style={styles.roundButton}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={21} color={saved ? colors.blue : colors.text} />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={listing.image} resizeMode="cover" style={styles.hero} />
        <View style={styles.body}>
          <Text style={styles.price}>{listing.formattedPrice}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text style={styles.meta}>{listing.city}, {listing.state} · Listed {listing.listedAgo}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Seller information</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}>
              {detail?.sellerAvatarUrl !== null && detail?.sellerAvatarUrl !== undefined
                ? <Image source={{ uri: detail.sellerAvatarUrl }} style={styles.avatarImage} />
                : <Text style={styles.avatarText}>{initials}</Text>}
            </View>
            <View style={styles.sellerCopy}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              <Text style={styles.sellerMeta}>Marketplace seller</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={18} color={colors.muted} />
            <Text style={styles.detailText}>Category: {listing.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={18} color={colors.muted} />
            <Text style={styles.detailText}>{listing.pickupOptions.length > 0 ? listing.pickupOptions.join(' · ') : 'Local pickup'}</Text>
          </View>
          {detailState.status === 'loading' ? (
            <View style={styles.detailLoading}><ActivityIndicator color={colors.blue} /><Text style={styles.detailLoadingText}>Loading live details from Facebook…</Text></View>
          ) : detailState.status === 'error' ? (
            <Text style={styles.detailError}>{detailState.message}</Text>
          ) : (
            <Text style={styles.description}>{detailState.detail.description ?? 'The seller did not provide a description.'}</Text>
          )}

          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
            <View style={styles.safetyCopy}>
              <Text style={styles.safetyTitle}>Buy safely</Text>
              <Text style={styles.safetyText}>Meet in a public place and inspect the item before paying.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.messageBar}>
        <Pressable
          accessibilityLabel="Open this listing on Facebook"
          onPress={() => void Linking.openURL(`https://www.facebook.com/marketplace/item/${listing.id}/`)}
          style={({ pressed }) => [styles.facebookButton, pressed && styles.pressed]}
        >
          <Ionicons name="logo-facebook" size={19} color={colors.surface} />
          <Text style={styles.facebookButtonText}>Open on Facebook</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: { position: 'absolute', zIndex: 4, top: 10, left: 0, right: 0, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', gap: 8 },
  roundButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center', ...shadow },
  content: { paddingBottom: 24 },
  hero: { width: '100%', aspectRatio: 1, backgroundColor: colors.line },
  body: { padding: 18 },
  price: { color: colors.text, fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.5 },
  title: { marginTop: 3, color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  metaRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 22, backgroundColor: colors.line },
  sectionTitle: { color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  sellerRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#D9E8FF', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { color: colors.blue, fontSize: 18, fontWeight: '900' },
  sellerCopy: { flex: 1, marginLeft: 11 },
  sellerName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  sellerMeta: { marginTop: 4, color: colors.muted, fontSize: 12 },
  detailRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { color: colors.text, fontSize: 14 },
  description: { marginTop: 17, color: colors.text, fontSize: 14, lineHeight: 21 },
  detailLoading: { marginTop: 17, padding: 14, borderRadius: 12, backgroundColor: colors.canvas, flexDirection: 'row', alignItems: 'center', gap: 9 },
  detailLoadingText: { color: colors.muted, fontSize: 13 },
  detailError: { marginTop: 17, padding: 13, borderRadius: 12, backgroundColor: '#FFF0EF', color: colors.danger, fontSize: 13, lineHeight: 18 },
  safetyCard: { marginTop: 22, padding: 14, borderRadius: 13, backgroundColor: '#ECF8F2', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  safetyCopy: { flex: 1 },
  safetyTitle: { color: '#176544', fontSize: 14, fontWeight: '800' },
  safetyText: { marginTop: 3, color: '#35745D', fontSize: 12, lineHeight: 17 },
  messageBar: { paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface },
  facebookButton: { height: 48, borderRadius: 12, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  facebookButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
