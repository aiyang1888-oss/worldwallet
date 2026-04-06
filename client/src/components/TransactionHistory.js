import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const TransactionHistory = ({ transactions = [] }) => {
  const data = Array.isArray(transactions) ? transactions : [];

  const keyExtractor = (item, index) => {
    if (item && item.id != null) return String(item.id);
    const d = item?.date ?? '';
    const a = item?.amount ?? '';
    const c = item?.currency ?? '';
    return `tx-${index}-${String(d)}-${String(a)}-${String(c)}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.line}>{item?.date ?? '—'}</Text>
      <Text style={styles.line}>{item?.type ?? '—'}</Text>
      <Text style={styles.line}>
        {item?.amount ?? '—'} {item?.currency ?? ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Transaction History
      </Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions yet.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  empty: {
    color: '#666',
    fontSize: 15,
    paddingVertical: 16,
    textAlign: 'center',
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  line: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default TransactionHistory;
