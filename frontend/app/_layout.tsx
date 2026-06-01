import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useEffect, useState } from "react";
import { Stack, usePathname, useRouter } from "expo-router";

const BREAKPOINT = 768;

const NAV_ITEMS = [
  { href: "/", label: "生成筆記", emoji: "✏️", match: (p: string) => p === "/" || p.startsWith("/(tabs)") },
  { href: "/history", label: "筆記歷史", emoji: "📋", match: (p: string) => p.includes("history") },
  { href: "/settings", label: "設定", emoji: "⚙️", match: (p: string) => p.includes("settings") },
];

function Sidebar({ hidden }: { hidden: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View style={[styles.sidebar, hidden && styles.hidden]}>
      <Text style={styles.brand}>🎙 PodNote</Text>
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Pressable
            key={item.href}
            style={[styles.navItem, active && styles.navItemActive]}
            onPress={() => router.push(item.href as any)}
          >
            <Text style={styles.navEmoji}>{item.emoji}</Text>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function RootLayout() {
  const { width } = useWindowDimensions();
  // 先讓 SSR 與初次 client render 都跑手機版（mounted=false），避免 hydration
  // 結構不符；mount 後才切換。結構恆定（sidebar 永遠存在，只切 display），
  // 故切換時 React 只更新樣式、不會 re-parent/unmount Stack。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDesktop = mounted && Platform.OS === "web" && width >= BREAKPOINT;

  return (
    <View style={[styles.shell, !isDesktop && styles.shellMobile]}>
      <Sidebar hidden={!isDesktop} />
      <View style={[styles.main, !isDesktop && styles.mainMobile]}>
        <View style={[styles.card, !isDesktop && styles.cardMobile]}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="note/[id]" options={{ title: "筆記" }} />
          </Stack>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: "row", backgroundColor: "#f3f4f6" },
  shellMobile: { flexDirection: "column", backgroundColor: "#fff" },
  hidden: { display: "none" },
  sidebar: {
    width: 220,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  brand: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: "#eff6ff" },
  navEmoji: { fontSize: 16 },
  navLabel: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  navLabelActive: { color: "#2563eb", fontWeight: "600" },
  // main 撐滿剩餘寬高、把 card 水平置中（在 row 容器裡用 alignSelf 會塌成內容高度）
  main: { flex: 1, alignItems: "center" },
  mainMobile: { alignItems: "stretch" },
  card: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    backgroundColor: "#fff",
    marginVertical: 24,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardMobile: {
    maxWidth: "100%",
    marginVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
});
