import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "PodNote" }} />
      <Stack.Screen name="settings" options={{ title: "設定" }} />
      <Stack.Screen name="note/[id]" options={{ title: "筆記" }} />
    </Stack>
  );
}
