import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

const SecuritySettings = ({
  isTwoFactorEnabled = false,
  toggleTwoFactor,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label} accessibilityRole="text">
          Two-Factor Authentication
        </Text>
        <Switch
          value={isTwoFactorEnabled}
          onValueChange={typeof toggleTwoFactor === 'function' ? toggleTwoFactor : undefined}
          accessibilityLabel="Two-factor authentication"
          accessibilityState={{ checked: isTwoFactorEnabled }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  label: {
    flex: 1,
    fontSize: 16,
    paddingRight: 12,
  },
});

export default SecuritySettings;
