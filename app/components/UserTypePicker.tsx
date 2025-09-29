import { View, StyleSheet, Text } from "react-native";
import { Picker } from "@react-native-picker/picker";
import React from "react";

type Props = {
  userType: string;
  setUserType: (value: string) => void;
};

export default function UserTypePicker({ userType, setUserType }: Props) {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>User Type</Text>
      <Picker
        selectedValue={userType}
        onValueChange={setUserType}
        style={styles.picker}
        dropdownIconColor="#007AFF"
      >
        <Picker.Item label="User" value="user" />
        <Picker.Item label="Area Manager" value="areaManager" />
        <Picker.Item label="Supervisor" value="moderator" />
        <Picker.Item label="Safety Manager" value="admin" />
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    borderColor: "#bfc0c0",
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 18,
    overflow: "hidden",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  picker: {
    height: 44,
    width: "100%",
  },
  label: {
    fontSize: 16,
    color: "#22223b",
    marginBottom: 4,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginLeft: 2,
  },
});