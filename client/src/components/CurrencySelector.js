import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';

/**
 * @param {string[]} currencies - ISO codes or labels, e.g. ['USD','EUR']
 * @param {string} [selectedCurrency] - must match an entry in `currencies` when possible
 * @param {(value: string) => void} [onValueChange]
 */
const CurrencySelector = ({
  currencies = [],
  selectedCurrency,
  onValueChange,
}) => {
  const list = Array.isArray(currencies) ? currencies : [];

  const safeValue = React.useMemo(() => {
    if (list.length === 0) return undefined;
    if (selectedCurrency != null && list.includes(selectedCurrency)) {
      return selectedCurrency;
    }
    return list[0];
  }, [list, selectedCurrency]);

  React.useEffect(() => {
    if (
      list.length > 0 &&
      selectedCurrency != null &&
      !list.includes(selectedCurrency) &&
      typeof onValueChange === 'function'
    ) {
      onValueChange(list[0]);
    }
  }, [list, selectedCurrency, onValueChange]);

  if (list.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Select Currency</Text>
        <Text style={styles.empty}>No currencies available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="text">
        Select Currency
      </Text>
      <Picker
        selectedValue={safeValue}
        onValueChange={typeof onValueChange === 'function' ? onValueChange : undefined}
        accessibilityLabel="Currency picker"
        {...(Platform.OS === 'android' ? { mode: 'dropdown' } : {})}
      >
        {list.map((currency) => (
          <Picker.Item
            key={String(currency)}
            label={String(currency)}
            value={currency}
          />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  empty: {
    color: '#666',
    fontSize: 15,
  },
});

export default CurrencySelector;
