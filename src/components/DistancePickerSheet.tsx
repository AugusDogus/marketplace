import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MarketplaceRadius } from '../domain/marketplace';
import { colors } from '../theme';
import { BottomDrawerBackdrop } from './BottomDrawerBackdrop';

const radii: readonly MarketplaceRadius[] = [null, 10, 40, 100];

const radiusLabel = (radius: MarketplaceRadius): string =>
  radius === null ? 'Any distance' : `Within ${radius} miles`;

type DistancePickerSheetProps = {
  locationLabel: string;
  onClose: () => void;
  onSelect: (radius: MarketplaceRadius) => void;
  selected: MarketplaceRadius;
  visible: boolean;
};

export function DistancePickerSheet({
  locationLabel,
  onClose,
  onSelect,
  selected,
  visible,
}: DistancePickerSheetProps) {
  const sheet = useRef<BottomSheetModal>(null);
  const presented = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && !presented.current) {
      presented.current = true;
      sheet.current?.present();
    } else if (!visible && presented.current) {
      sheet.current?.dismiss();
    }
  }, [visible]);

  return (
    <BottomSheetModal
      backdropComponent={BottomDrawerBackdrop}
      backgroundStyle={styles.background}
      enablePanDownToClose
      handleIndicatorStyle={styles.handle}
      onDismiss={() => {
        presented.current = false;
        onClose();
      }}
      ref={sheet}
    >
      <BottomSheetView
        accessibilityViewIsModal
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Distance</Text>
            <Text style={styles.supporting}>Show listings around {locationLabel}</Text>
          </View>
          <Pressable accessibilityLabel="Close distance picker" onPress={onClose} style={styles.closeButton}>
            <Ionicons color={colors.text} name="close" size={23} />
          </Pressable>
        </View>
        <View style={styles.choices}>
          {radii.map((radius) => {
            const active = selected === radius;
            return (
              <Pressable
                accessibilityLabel={radiusLabel(radius)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                key={radius ?? 'any'}
                onPress={() => {
                  onSelect(radius);
                  onClose();
                }}
                style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              >
                <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{radiusLabel(radius)}</Text>
                {active ? <Ionicons color={colors.blue} name="checkmark-circle" size={22} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: { borderRadius: 22, backgroundColor: colors.surface },
  handle: { backgroundColor: '#C7C9CC' },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  title: { color: colors.text, fontSize: 21, lineHeight: 26, fontWeight: '800' },
  supporting: { marginTop: 3, color: colors.muted, fontSize: 13, lineHeight: 18 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  choices: { marginTop: 18 },
  choice: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choiceText: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  choiceTextActive: { color: colors.blue, fontWeight: '800' },
  pressed: { opacity: 0.6 },
});
