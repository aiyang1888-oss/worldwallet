import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

const UserProfile = ({ user = {}, onUpdate }) => {
  const [displayName, setDisplayName] = React.useState(() => user.displayName ?? '');

  React.useEffect(() => {
    setDisplayName(user.displayName ?? '');
  }, [user?.displayName]);

  const handleUpdate = () => {
    if (typeof onUpdate === 'function') {
      onUpdate(displayName.trim());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        User Profile
      </Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display Name"
        autoCapitalize="words"
        autoCorrect={false}
        accessibilityLabel="Display name"
        style={styles.input}
      />
      <Button title="Update Profile" onPress={handleUpdate} accessibilityLabel="Update profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 44,
  },
});

export default UserProfile;
