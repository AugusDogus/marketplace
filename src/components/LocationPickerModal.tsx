import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MarketplaceLocation } from '../domain/marketplace';
import { FacebookMarketplace, type MarketplaceLocationSuggestion } from '../facebook/marketplace';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { colors } from '../theme';

type LocationPickerModalProps = {
  onClose: () => void;
  onSelect: (location: MarketplaceLocation) => void;
  selected: MarketplaceLocation;
  visible: boolean;
};

export function LocationPickerModal({ onClose, onSelect, selected, visible }: LocationPickerModalProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<readonly MarketplaceLocationSuggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSuggestions([]);
    setStatus('idle');
    setError(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      setStatus('idle');
      setError(null);
      return;
    }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setStatus('loading');
    setError(null);
    const load = async () => {
      const result = await FacebookMarketplace.locations(debouncedQuery);
      if (requestId.current !== currentRequest) return;
      if (result.ok) {
        setSuggestions(result.value);
        setStatus('loaded');
      } else {
        setSuggestions([]);
        setError(result.error.message);
        setStatus('error');
      }
    };
    void load();
  }, [debouncedQuery, visible]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close location search" onPress={onClose} style={styles.headerButton}>
            <Ionicons color={colors.text} name="arrow-back" size={25} />
          </Pressable>
          <Text style={styles.heading}>Search location</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.searchBox}>
          <Ionicons color={colors.muted} name="search" size={21} />
          <TextInput
            accessibilityLabel="Find a city or neighborhood"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={setQuery}
            placeholder="City or neighborhood"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          {query !== '' ? (
            <Pressable accessibilityLabel="Clear location search" onPress={() => setQuery('')} style={styles.clearButton}>
              <Ionicons color={colors.muted} name="close-circle" size={20} />
            </Pressable>
          ) : null}
        </View>
        {query.trim().length < 2 ? (
          <View style={styles.currentCard}>
            <View style={styles.locationIcon}><Ionicons color={colors.blue} name="location" size={21} /></View>
            <View style={styles.copy}>
              <Text style={styles.supporting}>Current search location</Text>
              <Text style={styles.currentLabel}>{selected.label}</Text>
            </View>
            <Ionicons color={colors.blue} name="checkmark-circle" size={22} />
          </View>
        ) : null}
        <FlatList
          contentContainerStyle={styles.results}
          data={suggestions}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => `${item.location.latitude}:${item.location.longitude}`}
          ListEmptyComponent={
            status === 'loading' ? (
              <View style={styles.message}><ActivityIndicator color={colors.blue} /><Text style={styles.messageText}>Searching locations…</Text></View>
            ) : status === 'loaded' ? (
              <View style={styles.message}><Text style={styles.messageTitle}>No matching locations</Text><Text style={styles.messageText}>Try a nearby city or a broader name.</Text></View>
            ) : status === 'error' ? (
              <View style={styles.message}><Text style={styles.messageTitle}>Couldn’t search locations</Text><Text style={styles.messageText}>{error}</Text></View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityLabel={`Use ${item.location.label}`}
              onPress={() => {
                onSelect(item.location);
                onClose();
              }}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}
            >
              <View style={styles.resultIcon}><Ionicons color={colors.text} name="location-outline" size={21} /></View>
              <View style={styles.copy}>
                <Text style={styles.resultLabel}>{item.location.label}</Text>
                <Text numberOfLines={1} style={styles.supporting}>{item.subtitle}</Text>
              </View>
              <Ionicons color={colors.muted} name="chevron-forward" size={20} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 58, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  searchBox: { height: 50, marginHorizontal: 18, marginTop: 8, marginBottom: 14, paddingHorizontal: 14, borderRadius: 25, backgroundColor: colors.chip, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, height: 50, color: colors.text, fontSize: 16 },
  clearButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  currentCard: { marginHorizontal: 18, padding: 14, borderRadius: 14, backgroundColor: colors.blueSoft, flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  currentLabel: { marginTop: 2, color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  results: { paddingHorizontal: 18, paddingBottom: 30 },
  result: { minHeight: 72, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  resultLabel: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  supporting: { marginTop: 2, color: colors.muted, fontSize: 13, lineHeight: 18 },
  message: { paddingTop: 52, paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  messageTitle: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  messageText: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
