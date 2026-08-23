import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { FacebookWebAuth } from '../facebook/web-auth';
import { colors } from '../theme';

const loginUrl = 'https://www.facebook.com/login/?next=https%3A%2F%2Fwww.facebook.com%2Fmarketplace%2F';

type FacebookLoginModalProps = {
  visible: boolean;
  onAuthenticated: () => void;
  onClose: () => void;
};

export function FacebookLoginModal({ visible, onAuthenticated, onClose }: FacebookLoginModalProps) {
  const completing = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const inspectCookies = async () => {
    if (completing.current) return;
    completing.current = true;
    const result = await FacebookWebAuth.captureSession();
    if (result.ok) {
      setError(null);
      onAuthenticated();
      return;
    }
    completing.current = false;
    if (result.error.tag !== 'not_authenticated') setError(result.error.message);
  };

  const close = () => {
    completing.current = false;
    setError(null);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={close} presentationStyle="fullScreen" visible={visible}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close Facebook login" onPress={close} style={styles.closeButton}>
            <Ionicons name="close" size={25} color={colors.text} />
          </Pressable>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>Log in to Facebook</Text>
            <Text style={styles.host}>facebook.com</Text>
          </View>
          <View style={styles.closeButton} />
        </View>
        {error !== null ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <WebView
          domStorageEnabled
          javaScriptEnabled
          onHttpError={() => setError('Facebook couldn’t open this page. Check your connection and try again.')}
          onLoadEnd={() => void inspectCookies()}
          onNavigationStateChange={() => void inspectCookies()}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.blue} size="large" />
              <Text style={styles.loadingText}>Opening Facebook…</Text>
            </View>
          )}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          source={{ uri: loginUrl }}
          startInLoadingState
          thirdPartyCookiesEnabled
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 62, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleCopy: { alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  host: { marginTop: 1, color: colors.success, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  errorCard: { paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#FFF0EF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 17 },
  loading: { position: 'absolute', inset: 0, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
});
