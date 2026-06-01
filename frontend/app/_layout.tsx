import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions } from "react-native";

const BREAKPOINT = 768;

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={[styles.navItem, active && styles.navItemActive]}>
        <Ionicons name={icon} size={20} color={active ? "#2563eb" : "#6b7280"} />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const isIndex =
    pathname === "/" ||
    pathname === "/(tabs)" ||
    pathname === "/(tabs)/";
  const isHistory = pathname.includes("history");
  const isSettings = pathname.includes("settings");

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Text style={styles.brandEmoji}>🎙</Text>
        <Text style={styles.brandText}>PodNote</Text>
      </View>
      <NavItem href="/" label="生成筆記" icon="create-outline" active={isIndex} />
      <NavItem href="/history" label="筆記歷史" icon="time-outline" active={isHistory} />
      <NavItem href="/settings" label="設定" icon="settings-outline" active={isSettings} />
    </View>
  );
}

function DesktopLayout() {
  return (
    <View style={styles.shell}>
      <Sidebar />
      <View style={styles.main}>
        <View style={styles.card}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="note/[id]" options={{ title: "筆記" }} />
          </Stack>
        </View>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= BREAKPOINT;

  if (isDesktop) return <DesktopLayout />;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="note/[id]" options={{ title: "筆記" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
  },
  sidebar: {
    width: 220,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  brandEmoji: { fontSize: 22 },
  brandText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
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
  navLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  navLabelActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  main: {
    flex: 1,
    padding: 24,
  },
  card: {
    flex: 1,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
});
