import { Platform, Text, useWindowDimensions } from "react-native";
import { useEffect, useState } from "react";
import { Tabs } from "expo-router";

const BREAKPOINT = 768;

// 桌面用 root layout 的 sidebar 導覽，底部 tab bar 以 display:none 隱藏
// （切「樣式」而非抽換 tabBar 元件，避免 navigator 結構變動造成崩潰）。
// emoji 取代 @expo/vector-icons（其字型載入在 web 會觸發 CSSStyleDeclaration 錯誤）。
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDesktop = mounted && Platform.OS === "web" && width >= BREAKPOINT;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarStyle: isDesktop
          ? { display: "none" }
          : { borderTopColor: "#e5e7eb" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "生成筆記",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>✏️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "筆記歷史",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>⚙️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: "使用說明",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📖</Text>
          ),
        }}
      />
    </Tabs>
  );
}
