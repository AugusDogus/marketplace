import { BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketplaceFilters, type ListingCategory } from '../domain/marketplace';
import { colors } from '../theme';
import { BottomDrawerBackdrop } from './BottomDrawerBackdrop';
import { LocationPickerSheet } from './LocationPickerSheet';

const categories: readonly ListingCategory[] = [
  'Vehicles',
  'Electronics',
  'Home & garden',
  'Clothing',
  'Hobbies',
  'Other',
];

const radii = [null, 10, 40, 100] as const;
const snapPoints = ['92%'];

type FilterSheetProps = {
  visible: boolean;
  value: MarketplaceFilters;
  onApply: (filters: MarketplaceFilters) => void;
  onClose: () => void;
};

export function FilterSheet({ visible, value, onApply, onClose }: FilterSheetProps) {
  const sheet = useRef<BottomSheetModal>(null);
  const presented = useRef(false);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [locationVisible, setLocationVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      if (!presented.current) {
        presented.current = true;
        sheet.current?.present();
      }
    } else {
      setLocationVisible(false);
      if (presented.current) sheet.current?.dismiss();
    }
  }, [value, visible]);

  return (
    <>
      <BottomSheetModal
        backdropComponent={BottomDrawerBackdrop}
        backgroundStyle={styles.background}
        enableDynamicSizing={false}
        enablePanDownToClose
        handleIndicatorStyle={styles.handle}
        onDismiss={() => {
          presented.current = false;
          onClose();
        }}
        ref={sheet}
        snapPoints={snapPoints}
        topInset={insets.top}
      >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close filters" onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={25} color={colors.text} />
          </Pressable>
          <Text style={styles.heading}>Filters</Text>
          <Pressable onPress={() => setDraft(MarketplaceFilters.default())} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
        <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityLabel={`Change search location, currently ${draft.location.label}`}
            onPress={() => setLocationVisible(true)}
            style={({ pressed }) => [styles.locationCard, pressed && styles.pressed]}
          >
            <View style={styles.locationIcon}><Ionicons name="location" size={20} color={colors.blue} /></View>
            <View style={styles.grow}>
              <Text style={styles.locationLabel}>Search location</Text>
              <Text numberOfLines={1} style={styles.locationValue}>{draft.location.label}</Text>
              <Text style={styles.supporting}>Listings will be shown around this location.</Text>
            </View>
            <Ionicons color={colors.muted} name="chevron-forward" size={20} />
          </Pressable>

          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.row}>
            {radii.map((radius) => (
              <Pressable
                key={radius ?? 'any'}
                onPress={() => setDraft((current) => ({ ...current, radius }))}
                style={[styles.choice, draft.radius === radius && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, draft.radius === radius && styles.choiceTextActive]}>
                  {radius === null ? 'Any' : `${radius} mi`}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.wrap}>
            {categories.map((category) => {
              const active = draft.category === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => setDraft((current) => ({ ...current, category: active ? null : category }))}
                  style={[styles.choice, active && styles.choiceActive]}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{category}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Price</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrap}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                accessibilityLabel="Minimum price"
                inputMode="numeric"
                onChangeText={(minPrice) => setDraft((current) => ({ ...current, minPrice: minPrice.replace(/[^0-9]/g, '') }))}
                placeholder="Min"
                placeholderTextColor={colors.muted}
                style={styles.priceInput}
                value={draft.minPrice}
              />
            </View>
            <Text style={styles.to}>to</Text>
            <View style={styles.priceInputWrap}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                accessibilityLabel="Maximum price"
                inputMode="numeric"
                onChangeText={(maxPrice) => setDraft((current) => ({ ...current, maxPrice: maxPrice.replace(/[^0-9]/g, '') }))}
                placeholder="Max"
                placeholderTextColor={colors.muted}
                style={styles.priceInput}
                value={draft.maxPrice}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.grow}>
              <Text style={styles.switchTitle}>Pickup options only</Text>
              <Text style={styles.supporting}>Door pickup or public meetup listings</Text>
            </View>
            <Switch
              accessibilityLabel="Pickup options only"
              onValueChange={(localPickupOnly) => setDraft((current) => ({ ...current, localPickupOnly }))}
              trackColor={{ false: '#C9CDD2', true: '#A8CAFF' }}
              thumbColor={draft.localPickupOnly ? colors.blue : colors.surface}
              value={draft.localPickupOnly}
            />
          </View>
        </BottomSheetScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            onPress={() => onApply(draft)}
            style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}
          >
            <Text style={styles.applyText}>Show results</Text>
          </Pressable>
        </View>
      </BottomSheetView>
      </BottomSheetModal>
      <LocationPickerSheet
        onClose={() => setLocationVisible(false)}
        onSelect={(location) => setDraft((current) => ({ ...current, location }))}
        selected={draft.location}
        visible={visible && locationVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  background: { borderRadius: 22, backgroundColor: colors.surface },
  handle: { backgroundColor: '#C7C9CC' },
  container: { flex: 1 },
  header: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: colors.text },
  resetButton: { minWidth: 54, height: 44, alignItems: 'center', justifyContent: 'center' },
  resetText: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  locationCard: { padding: 14, borderRadius: 14, backgroundColor: colors.canvas, flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  locationLabel: { color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  locationValue: { marginTop: 2, color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  supporting: { marginTop: 2, color: colors.muted, fontSize: 13, lineHeight: 18 },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.text, fontSize: 17, lineHeight: 21, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 9 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  choice: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  choiceActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  choiceText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  choiceTextActive: { color: colors.blue, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInputWrap: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  dollar: { color: colors.text, fontSize: 16 },
  priceInput: { flex: 1, height: 46, paddingLeft: 4, color: colors.text, fontSize: 16 },
  to: { color: colors.muted, fontSize: 14 },
  switchRow: { marginTop: 28, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 16 },
  switchTitle: { color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  applyButton: { height: 50, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
