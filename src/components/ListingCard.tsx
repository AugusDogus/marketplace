import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Listing } from '../domain/marketplace';
import { colors } from '../theme';

type ListingCardProps = {
  listing: Listing;
  saved: boolean;
  onOpen: () => void;
  onToggleSaved: () => void;
};

export function ListingCard({ listing, saved, onOpen, onToggleSaved }: ListingCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${listing.formattedPrice}, ${listing.title}, ${listing.city}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <Image source={listing.image} resizeMode="cover" style={styles.image} />
        <Pressable
          accessibilityLabel={saved ? `Unsave ${listing.title}` : `Save ${listing.title}`}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onToggleSaved();
          }}
          style={styles.saveButton}
        >
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? colors.blue : colors.text} />
        </Pressable>
      </View>
      <Text style={styles.price}>{listing.formattedPrice}</Text>
      <Text numberOfLines={2} style={styles.title}>{listing.title}</Text>
      <Text numberOfLines={1} style={styles.location}>{listing.city}, {listing.state}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, paddingBottom: 17 },
  pressed: { opacity: 0.74 },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.line },
  image: { width: '100%', height: '100%' },
  saveButton: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  price: { marginTop: 9, color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  title: { marginTop: 2, color: colors.text, fontSize: 14, lineHeight: 18, minHeight: 18 },
  location: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 16 },
});
