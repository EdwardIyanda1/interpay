import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Sora_400Regular, Sora_600SemiBold, Sora_700Bold, useFonts } from "@expo-google-fonts/sora";
import { c, font } from "../src/theme";

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [loaded] = useFonts({ Sora_400Regular, Sora_600SemiBold, Sora_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: c.white }, headerTintColor: c.blue, headerTitleStyle: { fontFamily: font.bold, color: c.ink }, contentStyle: { backgroundColor: c.white } }}>
        <Stack.Screen name="index" options={{ title: "InterPay" }} />
        <Stack.Screen name="event/[slug]/[year]" options={{ title: "Event" }} />
        <Stack.Screen name="ticket/[token]" options={{ title: "Your tickets" }} />
        <Stack.Screen name="tickets" options={{ title: "My tickets" }} />
        <Stack.Screen name="scan" options={{ title: "Door check-in" }} />
      </Stack>
    </>
  );
}
