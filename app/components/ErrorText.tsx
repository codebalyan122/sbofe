import { Text, StyleSheet } from "react-native";
import React from "react";

export default function ErrorText({ children }: { children: React.ReactNode }) {
  // Return null for falsy values, empty strings, or whitespace-only strings
  if (!children || (typeof children === 'string' && children.trim() === '')) {
    return null;
  }
  
  return (
    <Text style={styles.errorText}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: "#e63946",
    fontSize: 15,
    marginBottom: 10,
    textAlign: "left",
    fontWeight: "bold",
    marginLeft: 2,
    letterSpacing: 0.2,
  },
});