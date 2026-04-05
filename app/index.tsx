import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

/** 直接使用线上部署的完整钱包页 */
const WALLET_REMOTE_URL = 'https://www.worldtoken.cc/wallet.html';

export default function Index() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <WebView
        source={{ uri: WALLET_REMOTE_URL }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
      />
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
});
