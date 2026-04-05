/**
 * 未接入 package.json 的 main（当前为 expo-router）。
 * 正式壳与钱包页：见 app/index.tsx + dist/wallet.html / public/wallet.html。
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { loadWallet, createWallet, restoreWallet, WalletState } from './src/store/walletStore';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';

type Screen = 'loading' | 'welcome' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [wallet, setWallet] = useState<WalletState | null>(null);

  useEffect(() => {
    checkWallet();
  }, []);

  async function checkWallet() {
    const saved = await loadWallet();
    if (saved) {
      setWallet(saved);
      setScreen('home');
    } else {
      setScreen('welcome');
    }
  }

  async function handleCreateWallet() {
    const w = await createWallet();
    setWallet(w);
    setScreen('home');
  }

  async function handleImportWallet() {
    // TODO: 打开输入助记词页面
    // 临时：用测试助记词
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const w = await restoreWallet(testMnemonic);
    setWallet(w);
    setScreen('home');
  }

  if (screen === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#c8a84b" />
      </View>
    );
  }

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        onCreateWallet={handleCreateWallet}
        onImportWallet={handleImportWallet}
      />
    );
  }

  if (screen === 'home' && wallet) {
    return (
      <HomeScreen
        wallet={wallet}
        onTransfer={() => {}}
        onAddress={() => {}}
        onSettings={() => {}}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, backgroundColor: '#080810',
    alignItems: 'center', justifyContent: 'center',
  },
});
