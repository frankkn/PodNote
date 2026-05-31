import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Markdown from "react-native-markdown-display";

import { summarize } from "@/api/gemini";
import { GEMINI_KEY_STORAGE } from "@/config";
import { getItem } from "@/lib/secureStore";
import { loadTranscript } from "@/store/results";

export default function Note() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const transcript = loadTranscript(String(id));
        if (!transcript) throw new Error("找不到逐字稿，請回首頁重新產生");
        const key = await getItem(GEMINI_KEY_STORAGE);
        if (!key) throw new Error("尚未設定 Gemini API Key，請先到設定頁");
        const result = await summarize(transcript, key);
        setNote(result);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "發生未知錯誤");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.hint}>生成筆記中…</Text>
      </View>
    );
  }
  if (err) return <Text style={styles.error}>{err}</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Markdown style={mdStyles}>{note}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  hint: { color: "#666" },
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 48 },
  error: { color: "#dc2626", margin: 20 },
});

// react-native-markdown-display 的樣式鍵
const mdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 24, color: "#1f2937" },
  heading1: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginTop: 22,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  heading3: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
  },
  list_item: { marginVertical: 3 },
  strong: { fontWeight: "700", color: "#111827" },
  blockquote: {
    backgroundColor: "#f3f4f6",
    borderLeftWidth: 4,
    borderLeftColor: "#9ca3af",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: "monospace",
  },
});
