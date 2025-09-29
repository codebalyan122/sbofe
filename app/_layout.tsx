import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="newsbo" options={{ headerShown: false}} />
        <Stack.Screen name="my-observations" options={{ headerShown: false }} />
        <Stack.Screen name="AreaManagerdashboard" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}