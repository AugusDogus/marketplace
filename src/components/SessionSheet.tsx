import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'unavailable';

type SessionSheetProps = {
  busy: boolean;
  error: string | null;
  status: ConnectionStatus;
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function SessionSheet({ busy, error, status, visible, onClose, onLogin, onLogout }: SessionSheetProps) {
  const connected = status === 'connected';
  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close account" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={25} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Facebook account</Text>
          <View style={styles.closeButton} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.heroIcon, connected && styles.heroIconConnected]}>
            <Ionicons name={connected ? 'checkmark' : 'logo-facebook'} size={30} color={connected ? colors.surface : colors.blue} />
          </View>
          <Text style={styles.title}>{connected ? 'You’re signed in' : 'Sign in to Marketplace'}</Text>
          <Text style={styles.description}>
            {connected
              ? 'Your Facebook account is ready to browse Marketplace.'
              : 'Continue with Facebook to browse live listings and create alerts.'}
          </Text>

          <View style={styles.securityCard}>
            <Ionicons name="lock-closed" size={20} color={colors.success} />
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Your sign-in stays private</Text>
              <Text style={styles.securityText}>Your account information is stored securely on this device.</Text>
            </View>
          </View>

          {error !== null ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={19} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {busy || status === 'checking' ? (
            <View style={styles.busyRow}><ActivityIndicator color={colors.blue} /><Text style={styles.busyText}>Checking your account…</Text></View>
          ) : connected ? (
            <>
              <Pressable onPress={onLogout} style={styles.logoutButton}><Text style={styles.logoutText}>Log out of this app</Text></Pressable>
              <Text style={styles.footnote}>This will not log you out of Facebook in other apps or browsers.</Text>
            </>
          ) : (
            <View style={styles.form}>
              <Pressable
                onPress={onLogin}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Ionicons name="logo-facebook" size={19} color={colors.surface} />
                <Text style={styles.primaryText}>Continue with Facebook</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 34, paddingBottom: 28, alignItems: 'center' },
  heroIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  heroIconConnected: { backgroundColor: colors.success },
  title: { marginTop: 18, color: colors.text, fontSize: 22, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  description: { maxWidth: 380, marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  securityCard: { width: '100%', marginTop: 25, padding: 15, borderRadius: 13, backgroundColor: '#ECF8F2', flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  securityCopy: { flex: 1 },
  securityTitle: { color: '#176544', fontSize: 14, fontWeight: '800' },
  securityText: { marginTop: 3, color: '#35745D', fontSize: 12, lineHeight: 17 },
  errorCard: { width: '100%', marginTop: 12, padding: 13, borderRadius: 12, backgroundColor: '#FFF0EF', flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  errorText: { flex: 1, color: '#9B2C2C', fontSize: 12, lineHeight: 17 },
  busyRow: { marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 9 },
  busyText: { color: colors.muted, fontSize: 13 },
  form: { width: '100%', marginTop: 22 },
  primaryButton: { width: '100%', height: 50, borderRadius: 12, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  logoutButton: { width: '100%', height: 48, marginTop: 25, borderRadius: 12, borderWidth: 1, borderColor: '#F0B3B3', alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  footnote: { maxWidth: 360, marginTop: 12, color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
