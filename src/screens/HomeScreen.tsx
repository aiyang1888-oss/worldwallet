import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Clipboard, Alert,
} from 'react-native';
import { WalletState, getWorldAddress } from '../store/walletStore';
import { getETHBalance, getUSDTBalanceETH } from '../crypto/wallet';

interface Props {
  wallet: WalletState;
  onTransfer: () => void;
  onAddress: () => void;
  onSettings: () => void;
}

export default function HomeScreen({ wallet, onTransfer, onAddress, onSettings }: Props) {
  const [ethBalance, setEthBalance] = useState('0.00');
  const [usdtBalance, setUsdtBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);

  const worldAddr = getWorldAddress(wallet);

  useEffect(() => {
    loadBalances();
  }, []);

  async function loadBalances() {
    setLoading(true);
    const [eth, usdt] = await Promise.all([
      getETHBalance(wallet.ethAddress),
      getUSDTBalanceETH(wallet.ethAddress),
    ]);
    setEthBalance(parseFloat(eth).toFixed(4));
    setUsdtBalance(usdt);
    setLoading(false);
  }

  function copyAddress() {
    Clipboard.setString(worldAddr);
    Alert.alert('已复制', '万语地址已复制到剪贴板');
  }

  const totalUSD = parseFloat(usdtBalance) + parseFloat(ethBalance) * 3200;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 顶部 Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>我的资产</Text>
          <Text style={styles.balance}>${totalUSD.toFixed(2)}</Text>
          
          {/* 万语地址 */}
          <View style={styles.addrRow}>
            <Text style={styles.addrText} numberOfLines={1}>
              <Text style={styles.addrGray}>{wallet.worldPrefix}</Text>
              {wallet.worldChars.map((c, i) => (
                <Text key={i} style={styles.addrGold}>{c}</Text>
              ))}
              <Text style={styles.addrGray}>{wallet.worldSuffix}</Text>
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={copyAddress}>
              <Text style={styles.copyText}>复制</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 快捷按钮 */}
        <View style={styles.quickBtns}>
          {[
            { icon: '📤', label: '转账', onPress: onTransfer },
            { icon: '📥', label: '收款', onPress: onAddress },
            { icon: '💱', label: '兑换', onPress: () => {} },
            { icon: '🎁', label: '礼物', onPress: () => {} },
          ].map((btn) => (
            <TouchableOpacity key={btn.label} style={styles.quickBtn} onPress={btn.onPress}>
              <Text style={styles.quickIcon}>{btn.icon}</Text>
              <Text style={styles.quickLabel}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 资产列表 */}
        <View style={styles.assets}>
          <Text style={styles.assetsTitle}>我的资产</Text>
          
          <AssetRow
            icon="💚" name="USDT" chain="TRC-20 · Tron"
            amount={usdtBalance} usd={usdtBalance}
            change="+0.01%"
          />
          <AssetRow
            icon="🔷" name="ETH" chain="Ethereum"
            amount={ethBalance} usd={(parseFloat(ethBalance) * 3200).toFixed(2)}
            change="+2.4%"
          />
        </View>
      </ScrollView>

      {/* 底部导航 */}
      <View style={styles.tabBar}>
        <TabItem icon="🏠" label="资产" active onPress={() => {}} />
        <TabItem icon="🏷️" label="地址" onPress={onAddress} />
        <TabItem icon="📰" label="资讯" onPress={() => {}} />
        <TabItem icon="⚙️" label="设置" onPress={onSettings} />
      </View>
    </SafeAreaView>
  );
}

function AssetRow({ icon, name, chain, amount, usd, change }: any) {
  const isUp = change.startsWith('+');
  return (
    <View style={styles.assetRow}>
      <Text style={styles.assetIcon}>{icon}</Text>
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>{name}</Text>
        <Text style={styles.assetChain}>{chain}</Text>
      </View>
      <View style={styles.assetRight}>
        <Text style={styles.assetAmount}>{amount}</Text>
        <Text style={styles.assetUSD}>${usd}</Text>
        <Text style={[styles.assetChange, { color: isUp ? '#4ac84a' : '#ff6060' }]}>
          {change}
        </Text>
      </View>
    </View>
  );
}

function TabItem({ icon, label, active, onPress }: any) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, active && { color: '#c8a84b' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  header: {
    padding: 20, alignItems: 'center',
    backgroundColor: '#0d0d18', paddingBottom: 24,
  },
  headerTitle: { fontSize: 14, color: '#555', marginBottom: 8 },
  balance: { fontSize: 36, fontWeight: '800', color: '#e0e0f0', marginBottom: 12 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrText: { fontSize: 11, maxWidth: 240 },
  addrGray: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Courier' },
  addrGold: { color: '#f0d070', fontWeight: '700' },
  copyBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  copyText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  quickBtns: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 16, backgroundColor: '#0d0d18',
    borderTopWidth: 1, borderTopColor: '#0f0f1c',
  },
  quickBtn: { alignItems: 'center', gap: 4 },
  quickIcon: { fontSize: 28 },
  quickLabel: { fontSize: 12, color: '#888' },
  assets: { padding: 16 },
  assetsTitle: { fontSize: 12, color: '#555', letterSpacing: 2, marginBottom: 12 },
  assetRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f1c', borderRadius: 16,
    padding: 16, marginBottom: 8,
  },
  assetIcon: { fontSize: 28, marginRight: 12 },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 15, fontWeight: '700', color: '#e0e0f0' },
  assetChain: { fontSize: 11, color: '#555', marginTop: 2 },
  assetRight: { alignItems: 'flex-end' },
  assetAmount: { fontSize: 15, fontWeight: '600', color: '#e0e0f0' },
  assetUSD: { fontSize: 11, color: '#555' },
  assetChange: { fontSize: 11 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#0a0a12',
    borderTopWidth: 1, borderTopColor: '#0f0f1c',
    paddingBottom: 20, paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#555' },
});
