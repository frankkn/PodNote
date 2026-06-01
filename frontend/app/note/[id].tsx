import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { loadPending } from "@/store/results";
import { getNote, saveNote } from "@/store/notes";

type Tab = "notes" | "transcript";

export default function Note() {
  const { id, tab: tabParam } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === "transcript" ? "transcript" : "notes"
  );
  const [note, setNote] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) 已存過的筆記：直接讀本機，不重打 Gemini
        const saved = await getNote(String(id));
        if (saved) {
          setNote(saved.markdown);
          setTranscript(saved.transcript ?? null);
          return;
        }
        // 2) 剛轉好、尚未生成：用逐字稿生成筆記並存檔
        const pending = loadPending(String(id));
        if (!pending) throw new Error("找不到逐字稿，請回首頁重新產生");
        setTranscript(pending.transcript);
        const key = await getItem(GEMINI_KEY_STORAGE);
        if (!key) throw new Error("尚未設定 Gemini API Key，請先到設定頁");
        const result = await summarize(pending.transcript, key);
        await saveNote({
          id: String(id),
          title: pending.title,
          url: pending.url,
          markdown: result,
          transcript: pending.transcript,
          createdAt: Date.now(),
        });
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
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "notes" && styles.tabActive]}
          onPress={() => setActiveTab("notes")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "notes" && styles.tabTextActive,
            ]}
          >
            筆記
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "transcript" && styles.tabActive]}
          onPress={() => setActiveTab("transcript")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "transcript" && styles.tabTextActive,
            ]}
          >
            逐字稿
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {activeTab === "notes" ? (
          <Markdown style={mdStyles}>{note}</Markdown>
        ) : transcript ? (
          <Text style={styles.transcriptText}>{transcript}</Text>
        ) : (
          <Text style={styles.noTranscript}>
            逐字稿不可用（此筆記以舊版生成，未儲存逐字稿）
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  hint: { color: "#666" },
  error: { color: "#dc2626", margin: 20 },
  container: { flex: 1, backgroundColor: "#fff" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#2563eb" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#2563eb" },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  transcriptText: {
    fontSize: 15,
    lineHeight: 26,
    color: "#374151",
  },
  noTranscript: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
});

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
