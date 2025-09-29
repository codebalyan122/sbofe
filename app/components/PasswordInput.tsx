import { TextInput, Text, StyleSheet, View } from "react-native";
import React from "react";
import ErrorText from "./ErrorText";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
};

export default function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: Props) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        secureTextEntry={true}
        placeholderTextColor="#aaa"
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    color: "#22223b",
    marginBottom: 4,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  input: {
    height: 48,
    borderColor: "#bfc0c0",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f8f9fa",
    fontSize: 17,
    marginBottom: 2,
    shadowColor: "#007AFF",
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});