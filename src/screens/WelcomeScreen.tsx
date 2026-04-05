import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';

interface Props {
  onCreateWallet: () => void;
  onImportWallet: () => void;
}

export default function WelcomeScreen({ onCreateWallet, onImportWallet }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🌍</Text>
        </View>
        <Text style={styles.title}>WorldWallet</Text>
        <Text style={styles.subtitle}>One wallet, every language.</Text>

        {/* 按钮区 */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btnPrimary} onPress={onCreateWallet}>
            <Text style={styles.btnPrimaryText}>🚀 创建新钱包</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={onImportWallet}>
            <Text style={styles.btnSecondaryText}>📥 导入已有钱包</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  logoBox: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: '#b8982a',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#c8a84b', shadowOpacity: 0.5, shadowRadius: 20,
  },
  logoEmoji: { fontSize: 54 },
  title: {
    fontSize: 32, fontWeight: '800', color: '#f0d070',
    letterSpacing: 3, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#555', letterSpacing: 2, marginBottom: 60 },
  buttons: { width: '100%', gap: 12 },
  btnPrimary: {
    backgroundColor: '#c8a84b', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#0a0a05' },
  btnSecondary: {
    borderWidth: 1, borderColor: '#22223a', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 15, color: '#888' },
});
