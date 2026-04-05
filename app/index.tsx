import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getWalletUrl } from './walletUrl';

const WALLET_REMOTE_URL = getWalletUrl();

/** 与钱包页 CSS 变量对齐 */
const C = {
  bg: '#080810',
  bgElevated: 'rgba(20, 20, 36, 0.92)',
  gold: '#c8a84b',
  goldLight: '#f0d070',
  goldDim: 'rgba(200, 168, 75, 0.35)',
  text: 'rgba(236, 236, 245, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.48)',
  textDim: 'rgba(255, 255, 255, 0.32)',
  border: 'rgba(200, 168, 75, 0.22)',
  danger: '#ff7070',
};

function ShellCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const reload = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setError(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  const onLoadStart = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const onError = useCallback(() => {
    setLoading(false);
    setError('网络异常，无法连接服务器');
  }, []);

  const onHttpError = useCallback(
    (e: { nativeEvent: { statusCode: number } }) => {
      const code = e.nativeEvent.statusCode;
      if (code >= 400) {
        setLoading(false);
        setError(`服务器返回 ${code}`);
      }
    },
    []
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <WebView
        key={retryKey}
        source={{ uri: WALLET_REMOTE_URL }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onHttpError={onHttpError}
      />

      {loading && !error ? (
        <View style={styles.overlay} accessibilityViewIsModal>
          <ShellCard>
            <View style={styles.brandMark} accessibilityLabel="WorldWallet">
              <Text style={styles.brandEmoji}>🌍</Text>
            </View>
            <ActivityIndicator size="large" color={C.gold} style={styles.spinner} />
            <Text style={styles.loadingTitle}>正在加载钱包</Text>
            <Text style={styles.loadingSub}>WorldToken · 安全连接中</Text>
          </ShellCard>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorOverlay} accessibilityViewIsModal>
          <ShellCard>
            <View style={styles.errorIconWrap}>
              <Ionicons name="cloud-offline-outline" size={44} color={C.danger} />
            </View>
            <Text style={styles.errorTitle}>加载失败</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <Text style={styles.errorHint}>请检查网络后重试</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
              onPress={reload}
              accessibilityRole="button"
              accessibilityLabel="重试加载钱包"
              android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
            >
              <Ionicons name="refresh" size={20} color={C.goldLight} />
              <Text style={styles.retryLabelText}>重试</Text>
            </Pressable>
          </ShellCard>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  webview: {
    flex: 1,
    backgroundColor: C.bg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(5, 5, 12, 0.72)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: C.bg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: C.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(200, 168, 75, 0.12)',
    borderWidth: 1,
    borderColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  brandEmoji: {
    fontSize: 28,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    letterSpacing: 0.3,
  },
  loadingSub: {
    marginTop: 8,
    fontSize: 13,
    color: C.textMuted,
  },
  errorIconWrap: {
    marginBottom: 16,
    opacity: 0.95,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  errorHint: {
    fontSize: 12,
    color: C.textDim,
    marginBottom: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 168, 75, 0.18)',
    borderWidth: 1,
    borderColor: C.goldDim,
    minWidth: 160,
  },
  retryBtnPressed: {
    backgroundColor: 'rgba(200, 168, 75, 0.28)',
  },
  retryLabelText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: C.goldLight,
  },
});
