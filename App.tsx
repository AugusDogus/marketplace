import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav, type TabName } from './src/components/BottomNav';
import { FacebookLoginModal } from './src/components/FacebookLoginModal';
import { SessionSheet } from './src/components/SessionSheet';
import { MarketplaceFilters, MarketplaceLocation, type Listing, type ListingDetailState, type SavedSearch } from './src/domain/marketplace';
import { FacebookMarketplace } from './src/facebook/marketplace';
import { FacebookSession } from './src/facebook/session';
import { FacebookWebAuth } from './src/facebook/web-auth';
import { useDebouncedValue } from './src/hooks/useDebouncedValue';
import { MarketplaceAlerts } from './src/notifications/marketplace-alerts';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { BrowseScreen } from './src/screens/BrowseScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { colors, shadow } from './src/theme';

const storageKey = 'marketplace-prototype-state-v1';

type Screen =
  | { name: 'tab'; tab: TabName }
  | { name: 'detail'; listingId: string };

type PersistedState = {
  savedIds: string[];
  alerts: SavedSearch[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCategory = (value: unknown): value is SavedSearch['filters']['category'] =>
  value === null ||
  value === 'Vehicles' ||
  value === 'Electronics' ||
  value === 'Home & garden' ||
  value === 'Clothing' ||
  value === 'Hobbies' ||
  value === 'Other';

const isRadius = (value: unknown): value is SavedSearch['filters']['radius'] =>
  value === null || value === 10 || value === 40 || value === 100;

const parseLocation = (value: unknown): SavedSearch['filters']['location'] => {
  if (
    isRecord(value) &&
    typeof value.label === 'string' &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude)
  ) return { label: value.label, latitude: value.latitude, longitude: value.longitude };
  if (value === 'Austin, TX') return { label: value, latitude: 30.2677, longitude: -97.7475 };
  return MarketplaceLocation.default();
};

const parseSavedSearch = (value: unknown): SavedSearch | null => {
  if (!isRecord(value) || !isRecord(value.filters)) return null;
  const persistedFilters = value.filters;
  if (!(
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.query === 'string' &&
    typeof value.createdAt === 'string' &&
    isCategory(persistedFilters.category) &&
    typeof persistedFilters.minPrice === 'string' &&
    typeof persistedFilters.maxPrice === 'string' &&
    isRadius(persistedFilters.radius) &&
    typeof persistedFilters.localPickupOnly === 'boolean'
  )) return null;
  return {
    id: value.id,
    label: value.label,
    query: value.query,
    createdAt: value.createdAt,
    provider: value.provider === 'facebook' ? 'facebook' : 'legacy-local',
    filters: {
      category: persistedFilters.category,
      minPrice: persistedFilters.minPrice,
      maxPrice: persistedFilters.maxPrice,
      location: parseLocation(persistedFilters.location),
      radius: persistedFilters.radius,
      localPickupOnly: persistedFilters.localPickupOnly,
    },
  };
};

const parsePersistedState = (raw: string): PersistedState | null => {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !Array.isArray(value.savedIds) || !Array.isArray(value.alerts)) return null;
    if (!value.savedIds.every((id) => typeof id === 'string')) return null;
    const alerts = value.alerts.map(parseSavedSearch);
    if (alerts.some((alert) => alert === null)) return null;
    return { savedIds: value.savedIds, alerts: alerts.filter((alert): alert is SavedSearch => alert !== null) };
  } catch {
    return null;
  }
};

function MarketplaceApp() {
  const [screen, setScreen] = useState<Screen>({ name: 'tab', tab: 'browse' });
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(MarketplaceFilters.default);
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [alerts, setAlerts] = useState<readonly SavedSearch[]>([]);
  const [listings, setListings] = useState<readonly Listing[]>([]);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'unavailable'>('checking');
  const [sessionVisible, setSessionVisible] = useState(false);
  const [webLoginVisible, setWebLoginVisible] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [detailStates, setDetailStates] = useState<ReadonlyMap<string, ListingDetailState>>(() => new Map());
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detailOriginTab, setDetailOriginTab] = useState<TabName>('browse');
  const listingRequestId = useRef(0);
  const loadingMoreRef = useRef(false);
  const debouncedQuery = useDebouncedValue(query, 400);

  const refreshListings = useCallback(async (request: { query: string; location: MarketplaceFilters['location']; radius: MarketplaceFilters['radius'] }) => {
    const requestId = listingRequestId.current + 1;
    listingRequestId.current = requestId;
    loadingMoreRef.current = false;
    setListingLoading(true);
    setListingError(null);
    setNextCursor(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    const result = await FacebookMarketplace.listings(request);
    if (requestId !== listingRequestId.current) return;
    if (result.ok) {
      setListings(result.value.listings);
      setNextCursor(result.value.nextCursor);
      setSessionStatus('connected');
    } else {
      setListingError(result.error.message);
      if (result.error.tag === 'not_authenticated' || result.error.tag === 'session_expired') {
        setSessionStatus('disconnected');
      }
      if (result.error.tag === 'unsupported_platform') setSessionStatus('unavailable');
    }
    if (requestId === listingRequestId.current) setListingLoading(false);
  }, []);

  const loadMoreListings = useCallback(async () => {
    if (nextCursor === null || loadingMoreRef.current || sessionStatus !== 'connected') return;
    const requestId = listingRequestId.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    const result = await FacebookMarketplace.moreListings({
      query: debouncedQuery,
      location: filters.location,
      radius: filters.radius,
    }, nextCursor);
    if (requestId !== listingRequestId.current) return;
    if (result.ok) {
      setListings((current) => {
        const seen = new Set(current.map((listing) => listing.id));
        const appended = result.value.listings.filter((listing) => !seen.has(listing.id));
        return [...current, ...appended];
      });
      setNextCursor(result.value.nextCursor);
    } else {
      setLoadMoreError(result.error.message);
      if (result.error.tag === 'not_authenticated' || result.error.tag === 'session_expired') {
        setSessionStatus('disconnected');
      }
    }
    if (requestId === listingRequestId.current) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [debouncedQuery, filters.location, filters.radius, nextCursor, sessionStatus]);

  useEffect(() => {
    const checkSession = async () => {
      const result = await FacebookSession.load();
      if (!result.ok) {
        setSessionStatus('disconnected');
        setSessionError(result.error.message);
        return;
      }
      if (result.value === null) {
        setSessionStatus('disconnected');
        return;
      }
      setSessionStatus('connected');
    };
    void checkSession();
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'connected') return;
    void refreshListings({
      query: debouncedQuery,
      location: filters.location,
      radius: filters.radius,
    });
  }, [debouncedQuery, filters.location.label, filters.location.latitude, filters.location.longitude, filters.radius, refreshListings, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'connected') return;
    void MarketplaceAlerts.start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void MarketplaceAlerts.sync();
    });
    return () => subscription.remove();
  }, [sessionStatus]);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const persisted = raw === null ? null : parsePersistedState(raw);
        if (persisted !== null) {
          setSavedIds(new Set(persisted.savedIds));
          setAlerts(persisted.alerts);
        }
      } catch {
        setStorageError('Saved items and alerts could not be restored. Your current session still works.');
      } finally {
        setHydrated(true);
      }
    };
    void hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ savedIds: [...savedIds], alerts }));
        setStorageError(null);
      } catch {
        setStorageError('Changes could not be saved to this device. They remain available for this session.');
      }
    };
    void persist();
  }, [alerts, hydrated, savedIds]);

  useEffect(() => {
    if (toast === null) return;
    const timeout = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const navigateBack = useCallback((): boolean => {
    if (webLoginVisible) {
      setWebLoginVisible(false);
      return true;
    }
    if (sessionVisible) {
      setSessionVisible(false);
      return true;
    }
    if (screen.name === 'detail') {
      setScreen({ name: 'tab', tab: detailOriginTab });
      return true;
    }
    if (screen.tab !== 'browse') {
      setScreen({ name: 'tab', tab: 'browse' });
      return true;
    }
    return false;
  }, [detailOriginTab, screen, sessionVisible, webLoginVisible]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', navigateBack);
    return () => subscription.remove();
  }, [navigateBack]);

  const currentTab = screen.name === 'tab' ? screen.tab : null;
  const savedListings = useMemo(() => listings.filter((listing) => savedIds.has(listing.id)), [listings, savedIds]);
  const detailListing = screen.name === 'detail' ? listings.find((listing) => listing.id === screen.listingId) : undefined;

  const importHar = async () => {
    setSessionBusy(true);
    setSessionError(null);
    const result = await FacebookSession.importHar();
    if (result.ok) {
      await MarketplaceAlerts.reset();
      setSessionStatus('connected');
      setToast('Facebook session imported');
      await refreshListings({ query, location: filters.location, radius: filters.radius });
      await MarketplaceAlerts.start();
      setSessionVisible(false);
    } else if (result.error.tag !== 'cancelled') {
      setSessionStatus('disconnected');
      setSessionError(result.error.message);
    }
    setSessionBusy(false);
  };

  const openWebLogin = () => {
    setSessionError(null);
    setSessionVisible(false);
    setWebLoginVisible(true);
  };

  const webLoginAuthenticated = async () => {
    await MarketplaceAlerts.reset();
    setWebLoginVisible(false);
    setSessionStatus('connected');
    setToast('Logged in to Facebook');
    await refreshListings({ query, location: filters.location, radius: filters.radius });
    await MarketplaceAlerts.start();
  };

  const logout = async () => {
    setSessionBusy(true);
    setSessionError(null);
    const result = await FacebookWebAuth.clear();
    if (result.ok) {
      try {
        await MarketplaceAlerts.stop();
        await MarketplaceAlerts.reset();
      } catch {
        setStorageError('Facebook was logged out, but the background alert schedule could not be cleared. It cannot access the removed session.');
      }
      setSessionStatus('disconnected');
      setListings([]);
      setListingError(null);
      setNextCursor(null);
      setLoadMoreError(null);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setDetailStates(new Map());
      setToast('Logged out of this app');
      setSessionVisible(false);
    } else {
      setSessionError(result.error.message);
    }
    setSessionBusy(false);
  };

  const openListing = async (listingId: string) => {
    if (screen.name === 'tab') setDetailOriginTab(screen.tab);
    setScreen({ name: 'detail', listingId });
    setDetailStates((current) => new Map(current).set(listingId, { status: 'loading' }));
    const result = await FacebookMarketplace.detail(listingId);
    setDetailStates((current) => new Map(current).set(
      listingId,
      result.ok
        ? { status: 'loaded', detail: result.value }
        : { status: 'error', message: result.error.message },
    ));
  };

  const toggleSaved = (listingId: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(listingId)) {
        next.delete(listingId);
        setToast('Removed from saved listings');
      } else {
        next.add(listingId);
        setToast('Saved for later');
      }
      return next;
    });
  };

  const createAlert = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const monitor = await MarketplaceAlerts.start();
    const permission = await MarketplaceAlerts.requestPermission();
    const result = await FacebookMarketplace.createSavedSearch({ query, filters });
    if (!result.ok) {
      if (result.error.tag === 'not_authenticated' || result.error.tag === 'session_expired') {
        setSessionStatus('disconnected');
      }
      return { ok: false, message: result.error.message };
    }
    const label = query.trim() || filters.category || 'All Marketplace';
    const nextAlert: SavedSearch = {
      id: result.value.id,
      label,
      query,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      filters,
      provider: 'facebook',
    };
    setAlerts((current) => [nextAlert, ...current]);
    setToast(
      !permission.ok
        ? permission.error.message
        : !monitor.ok
          ? monitor.error.message
          : 'Facebook Marketplace alert created',
    );
    return { ok: true };
  };

  const deleteAlert = async (alertId: string) => {
    const alert = alerts.find((candidate) => candidate.id === alertId);
    if (alert === undefined) return;
    if (alert.provider === 'facebook') {
      const result = await FacebookMarketplace.deleteSavedSearch(alert.id);
      if (!result.ok) {
        setToast(result.error.message);
        return;
      }
    }
    setAlerts((current) => current.filter((candidate) => candidate.id !== alertId));
    setToast(alert.provider === 'facebook' ? 'Facebook alert removed' : 'Saved alert removed');
  };

  const openAlert = (alert: SavedSearch) => {
    setQuery(alert.query);
    setFilters(alert.filters);
    setScreen({ name: 'tab', tab: 'browse' });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.shell}>
        {storageError !== null ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={17} color="#8C4B00" />
            <Text style={styles.errorText}>{storageError}</Text>
          </View>
        ) : null}

        <View style={styles.screen}>
          {screen.name === 'detail' && detailListing !== undefined ? (
            <DetailScreen
              detailState={detailStates.get(detailListing.id) ?? { status: 'loading' }}
              listing={detailListing}
              onBack={() => void navigateBack()}
              onToggleSaved={() => toggleSaved(detailListing.id)}
              saved={savedIds.has(detailListing.id)}
            />
          ) : null}
          {screen.name === 'tab' && screen.tab === 'browse' ? (
            <BrowseScreen
              alertCount={alerts.length}
              connected={sessionStatus === 'connected'}
              error={listingError}
              filters={filters}
              hasMore={nextCursor !== null}
              listings={listings}
              loadMoreError={loadMoreError}
              loading={listingLoading}
              loadingMore={loadingMore}
              onCreateAlert={createAlert}
              onFiltersChange={setFilters}
              onOpenAlerts={() => setScreen({ name: 'tab', tab: 'alerts' })}
              onOpenAccount={() => setSessionVisible(true)}
              onOpenListing={(listingId) => void openListing(listingId)}
              onQueryChange={setQuery}
              onLoadMore={() => void loadMoreListings()}
              onRefresh={() => void refreshListings({ query, location: filters.location, radius: filters.radius })}
              onToggleSaved={toggleSaved}
              query={query}
              savedIds={savedIds}
            />
          ) : null}
          {screen.name === 'tab' && screen.tab === 'saved' ? (
            <SavedScreen
              listings={savedListings}
              onBrowse={() => setScreen({ name: 'tab', tab: 'browse' })}
              onOpenListing={(listingId) => void openListing(listingId)}
              onToggleSaved={toggleSaved}
            />
          ) : null}
          {screen.name === 'tab' && screen.tab === 'alerts' ? (
            <AlertsScreen
              alerts={alerts}
              onBrowse={() => setScreen({ name: 'tab', tab: 'browse' })}
              onDelete={(alertId) => void deleteAlert(alertId)}
              onOpen={openAlert}
            />
          ) : null}
        </View>

        {currentTab !== null ? (
          <BottomNav
            active={currentTab}
            alertCount={alerts.length}
            onSelect={(tab) => setScreen({ name: 'tab', tab })}
            savedCount={savedIds.size}
          />
        ) : null}

        <SessionSheet
          busy={sessionBusy}
          error={sessionError}
          onClose={() => setSessionVisible(false)}
          onImport={() => void importHar()}
          onLogin={openWebLogin}
          onLogout={() => void logout()}
          status={sessionStatus}
          visible={sessionVisible}
        />

        <FacebookLoginModal
          onAuthenticated={() => void webLoginAuthenticated()}
          onClose={() => setWebLoginVisible(false)}
          visible={webLoginVisible}
        />

        {toast !== null ? (
          <View pointerEvents="none" style={styles.toast}>
            <Ionicons name="checkmark-circle" size={19} color={colors.surface} />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MarketplaceApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  shell: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', backgroundColor: colors.surface, overflow: 'hidden' },
  screen: { flex: 1 },
  errorBanner: { paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#FFF3DB', flexDirection: 'row', alignItems: 'center', gap: 7 },
  errorText: { flex: 1, color: '#754100', fontSize: 11, lineHeight: 15 },
  toast: { position: 'absolute', zIndex: 20, bottom: 76, alignSelf: 'center', maxWidth: '88%', minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#25272A', flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow },
  toastText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
});
