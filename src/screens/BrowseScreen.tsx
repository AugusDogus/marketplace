import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlertSheet } from '../components/AlertSheet';
import { DistancePickerSheet } from '../components/DistancePickerSheet';
import { FilterSheet } from '../components/FilterSheet';
import { ListingCard } from '../components/ListingCard';
import { LocationPickerSheet } from '../components/LocationPickerSheet';
import { MarketplaceHeader } from '../components/MarketplaceHeader';
import type { Listing, ListingCategory, MarketplaceFilters } from '../domain/marketplace';
import { describeFilters, filterListings, MarketplaceFilters as Filters } from '../domain/marketplace';
import { colors } from '../theme';

const quickCategories: readonly { label: string; category: ListingCategory; icon: 'car-sport' | 'phone-portrait' | 'home' | 'shirt' }[] = [
  { label: 'Vehicles', category: 'Vehicles', icon: 'car-sport' },
  { label: 'Electronics', category: 'Electronics', icon: 'phone-portrait' },
  { label: 'Home', category: 'Home & garden', icon: 'home' },
  { label: 'Clothing', category: 'Clothing', icon: 'shirt' },
];

type BrowseScreenProps = {
  listings: readonly Listing[];
  query: string;
  filters: MarketplaceFilters;
  alertCount: number;
  connected: boolean;
  error: string | null;
  hasMore: boolean;
  initialScrollOffset: number;
  loadMoreError: string | null;
  loading: boolean;
  loadingMore: boolean;
  savedIds: ReadonlySet<string>;
  onQueryChange: (query: string) => void;
  onQuerySubmit: (query: string) => void;
  onFiltersChange: (filters: MarketplaceFilters) => void;
  onOpenListing: (listingId: string, scrollOffset: number) => void;
  onLoadMore: () => void;
  onOpenAlerts: () => void;
  onOpenAccount: () => void;
  onRefresh: () => void;
  onToggleSaved: (listingId: string) => void;
  onCreateAlert: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

export function BrowseScreen({
  listings,
  query,
  filters,
  alertCount,
  connected,
  error,
  hasMore,
  initialScrollOffset,
  loadMoreError,
  loading,
  loadingMore,
  savedIds,
  onQueryChange,
  onQuerySubmit,
  onFiltersChange,
  onOpenListing,
  onLoadMore,
  onOpenAlerts,
  onOpenAccount,
  onRefresh,
  onToggleSaved,
  onCreateAlert,
}: BrowseScreenProps) {
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [locationVisible, setLocationVisible] = useState(false);
  const [distanceVisible, setDistanceVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const scrollOffset = useRef(initialScrollOffset);
  const visibleListings = useMemo(() => filterListings(listings, '', filters), [filters, listings]);
  const filterCount = Filters.count(filters);
  const alertDescription = describeFilters(query, filters);

  return (
    <View style={styles.container}>
      <MarketplaceHeader
        alertCount={alertCount}
        connected={connected}
        onOpenAccount={onOpenAccount}
        onOpenAlerts={onOpenAlerts}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        query={query}
      />
      {error !== null && listings.length > 0 ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.listContent}
        contentOffset={{ x: 0, y: initialScrollOffset }}
        data={visibleListings}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <>
                <ActivityIndicator color={colors.blue} size="large" />
                <Text style={styles.emptyTitle}>Loading Marketplace</Text>
                <Text style={styles.emptyText}>Finding fresh listings near {filters.location.label}.</Text>
              </>
            ) : !connected ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="logo-facebook" size={27} color={colors.blue} /></View>
                <Text style={styles.emptyTitle}>Sign in to Facebook</Text>
                <Text style={styles.emptyText}>{error ?? 'Sign in to browse live Marketplace listings.'}</Text>
                <Pressable onPress={onOpenAccount} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Sign in</Text>
                </Pressable>
              </>
            ) : error !== null ? (
              <>
                <View style={styles.emptyIcon}><Ionicons name="alert-circle-outline" size={27} color={colors.danger} /></View>
                <Text style={styles.emptyTitle}>Couldn’t load Facebook</Text>
                <Text style={styles.emptyText}>{error}</Text>
                <Pressable onPress={onRefresh} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Try again</Text></Pressable>
              </>
            ) : (
              <>
                <View style={styles.emptyIcon}><Ionicons name="search" size={26} color={colors.muted} /></View>
                <Text style={styles.emptyTitle}>No listings found</Text>
                <Text style={styles.emptyText}>Try changing your search or filters.</Text>
                <Pressable onPress={() => onFiltersChange(Filters.default())} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Clear filters</Text>
                </Pressable>
              </>
            )}
          </View>
        }
        ListHeaderComponent={
          <View>
            <ScrollView contentContainerStyle={styles.quickScroll} horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => setFiltersVisible(true)}
                style={[styles.quickChip, filterCount > 0 && styles.quickChipActive]}
              >
                <Ionicons name="options" size={17} color={filterCount > 0 ? colors.blue : colors.text} />
                <Text style={[styles.quickText, filterCount > 0 && styles.quickTextActive]}>
                  Filters{filterCount > 0 ? ` · ${filterCount}` : ''}
                </Text>
              </Pressable>
              {quickCategories.map((item) => {
                const active = filters.category === item.category;
                return (
                  <Pressable
                    key={item.category}
                    onPress={() => onFiltersChange({ ...filters, category: active ? null : item.category })}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                  >
                    <Ionicons name={item.icon} size={17} color={active ? colors.blue : colors.text} />
                    <Text style={[styles.quickText, active && styles.quickTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.locationRow}>
              <View style={styles.locationCopy}>
                <Text style={styles.eyebrow}>Today’s picks</Text>
                <View style={styles.placeRow}>
                  <Ionicons name="location-sharp" size={14} color={colors.blue} />
                  <Pressable
                    accessibilityLabel={`Change search location, currently ${filters.location.label}`}
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={() => setLocationVisible(true)}
                    style={({ pressed }) => [styles.inlineControl, styles.locationControl, pressed && styles.inlineControlPressed]}
                  >
                    <Text numberOfLines={1} style={styles.place}>{filters.location.label}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.blue} />
                  </Pressable>
                  <Text style={styles.placeSeparator}>·</Text>
                  <Pressable
                    accessibilityLabel={`Change search distance, currently ${filters.radius === null ? 'any distance' : `${filters.radius} miles`}`}
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={() => setDistanceVisible(true)}
                    style={({ pressed }) => [styles.inlineControl, pressed && styles.inlineControlPressed]}
                  >
                    <Text style={styles.place}>{filters.radius === null ? 'Any distance' : `${filters.radius} mi`}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.blue} />
                  </Pressable>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Save an alert for these results"
                onPress={() => setAlertVisible(true)}
                style={({ pressed }) => [styles.notifyButton, pressed && styles.pressed]}
              >
                <Ionicons name="notifications-outline" size={17} color={colors.blue} />
                <Text style={styles.notifyText}>Save alert</Text>
              </Pressable>
            </View>
            {!loading || visibleListings.length > 0 ? (
              <Text style={styles.resultCount}>{visibleListings.length} listings</Text>
            ) : null}
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreStatus}>
              <ActivityIndicator color={colors.blue} size="small" />
              <Text style={styles.loadMoreText}>Loading more listings</Text>
            </View>
          ) : loadMoreError !== null ? (
            <View style={styles.loadMoreStatus}>
              <Text style={styles.loadMoreError}>{loadMoreError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onLoadMore}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : hasMore ? (
            <View style={styles.loadMoreStatus}>
              <Pressable
                accessibilityRole="button"
                onPress={onLoadMore}
                style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}
              >
                <Text style={styles.loadMoreButtonText}>Load more</Text>
              </Pressable>
            </View>
          ) : null
        }
        numColumns={2}
        onScroll={(event) => {
          scrollOffset.current = event.nativeEvent.contentOffset.y;
        }}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onOpen={() => onOpenListing(item.id, scrollOffset.current)}
            onToggleSaved={() => onToggleSaved(item.id)}
            saved={savedIds.has(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshing={loading && visibleListings.length > 0}
      />
      <FilterSheet
        onApply={(nextFilters) => {
          onFiltersChange(nextFilters);
          setFiltersVisible(false);
        }}
        onClose={() => setFiltersVisible(false)}
        value={filters}
        visible={filtersVisible}
      />
      <DistancePickerSheet
        locationLabel={filters.location.label}
        onClose={() => setDistanceVisible(false)}
        onSelect={(radius) => onFiltersChange({ ...filters, radius })}
        selected={filters.radius}
        visible={distanceVisible}
      />
      <LocationPickerSheet
        onClose={() => setLocationVisible(false)}
        onSelect={(location) => onFiltersChange({ ...filters, location })}
        selected={filters.location}
        visible={locationVisible}
      />
      <AlertSheet
        busy={alertBusy}
        description={alertDescription}
        error={alertError}
        onClose={() => {
          setAlertError(null);
          setAlertVisible(false);
        }}
        onCreate={() => {
          setAlertBusy(true);
          setAlertError(null);
          void onCreateAlert().then((result) => {
            setAlertBusy(false);
            if (result.ok) setAlertVisible(false);
            else setAlertError(result.message);
          });
        }}
        visible={alertVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  errorBanner: { marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#FFF0EF', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorBannerText: { flex: 1, color: '#9B2C2C', fontSize: 12, lineHeight: 17 },
  listContent: { paddingHorizontal: 14, paddingBottom: 20, flexGrow: 1 },
  columns: { gap: 12 },
  quickScroll: { paddingTop: 2, paddingBottom: 18, gap: 8 },
  quickChip: { height: 38, borderRadius: 19, paddingHorizontal: 13, backgroundColor: colors.chip, flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickChipActive: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#B9D8FF' },
  quickText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  quickTextActive: { color: colors.blue },
  locationRow: { paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  locationCopy: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' },
  eyebrow: { color: colors.text, fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.35 },
  placeRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  inlineControl: { minHeight: 24, flexDirection: 'row', alignItems: 'center' },
  inlineControlPressed: { opacity: 0.55 },
  locationControl: { minWidth: 0, flexShrink: 1 },
  place: { flexShrink: 1, color: colors.blue, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  placeSeparator: { color: colors.blue, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  notifyButton: { height: 38, paddingHorizontal: 13, borderRadius: 19, backgroundColor: colors.blueSoft, flexDirection: 'row', alignItems: 'center', gap: 5 },
  notifyText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  resultCount: { marginBottom: 12, color: colors.muted, fontSize: 12, lineHeight: 16 },
  loadMoreStatus: { minHeight: 72, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadMoreText: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  loadMoreError: { maxWidth: 300, color: colors.danger, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  loadMoreButton: { minHeight: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  loadMoreButtonText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  retryButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.7 },
  empty: { paddingTop: 74, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 15, color: colors.text, fontSize: 18, fontWeight: '800' },
  emptyText: { marginTop: 5, color: colors.muted, fontSize: 14 },
  emptyButton: { marginTop: 18, height: 42, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { color: colors.surface, fontWeight: '800' },
});
