import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

/**
 * 与线上静态站点一致（完整功能、CDN 依赖 ethers / TronWeb 等）。
 * 本地开发 Web 使用 public/wallet.html（prestart 从 dist 或 assets 同步）。
 */
const WALLET_REMOTE_URL = 'https://www.worldtoken.cc/wallet.html';

/** Web：iframe 加载 /wallet.html */
function WebWalletShell() {
  const { width, height } = useWindowDimensions();
  const frameW = Math.min(width, 430);
  const frameH = Math.min(height, 932);

  return (
    <View style={styles.webBg}>
      <iframe
        src="/wallet.html"
        style={{
          width: frameW,
          height: frameH,
          maxWidth: '100%',
          maxHeight: '100vh',
          border: 'none',
          borderRadius: Math.min(frameW, frameH) > 500 ? 0 : 40,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        }}
        title="WorldWallet"
      />
    </View>
  );
}

/** 原生：与线上同一套页面（需网络以加载脚本与链上数据） */
function NativeWalletShell() {
  return (
    <SafeAreaView style={styles.nativeRoot} edges={['top', 'bottom']}>
      <WebView
        source={{ uri: WALLET_REMOTE_URL }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
      />
    </SafeAreaView>
  );
}

export default function Index() {
  if (Platform.OS === 'web') {
    return <WebWalletShell />;
  }
  return <NativeWalletShell />;
}

const styles = StyleSheet.create({
  webBg: {
    flex: 1,
    backgroundColor: '#050508',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh' as unknown as number,
  },
  nativeRoot: {
    flex: 1,
    backgroundColor: '#080810',
  },
  webview: {
    flex: 1,
    backgroundColor: '#080810',
  },
});
