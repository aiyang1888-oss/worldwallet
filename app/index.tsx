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

import { getWalletUrl } from './walletUrl';

const WALLET_REMOTE_URL = getWalletUrl();

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const reload = useCallback(() => {
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
    setError('网络异常，无法加载钱包页面');
  }, []);

  const onHttpError = useCallback(
    (e: { nativeEvent: { statusCode: number } }) => {
      const code = e.nativeEvent.statusCode;
      if (code >= 400) {
        setLoading(false);
        setError(`页面错误 (${code})`);
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
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#c8a84b" />
          <Text style={styles.loadingText}>加载中…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryLabel}>重试</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080810',
  },
  webview: {
    flex: 1,
    backgroundColor: '#080810',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8,8,16,0.35)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  errorWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#080810',
  },
  errorText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(200,168,75,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.45)',
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0d070',
  },
});
