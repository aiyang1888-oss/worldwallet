import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

/**
 * @param {Array<string | { id?: string, message?: string, text?: string }>} notifications
 */
const Notifications = ({ notifications = [] }) => {
  const data = Array.isArray(notifications) ? notifications : [];

  const renderItem = ({ item }) => {
    const label =
      typeof item === 'string'
        ? item
        : item?.message ?? item?.text ?? String(item?.body ?? '');
    return (
      <Text style={styles.notification} accessibilityRole="text">
        {label}
      </Text>
    );
  };

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Notifications
        </Text>
        <Text style={styles.empty}>No notifications yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Notifications
      </Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          typeof item === 'object' && item !== null && item.id != null
            ? String(item.id)
            : `notification-${index}`
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
  },
  notification: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
});

export default Notifications;
