import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

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

  if (loading) return <ActivityIndicator style={styles.center} />;
  if (err) return <Text style={styles.error}>{err}</Text>;

  // MVP：先以純文字呈現 Markdown；之後可換 react-native-markdown-display 美化。
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.note} selectable>
        {note}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: 48 },
  container: { flex: 1 },
  content: { padding: 20 },
  note: { fontSize: 15, lineHeight: 23, color: "#111" },
  error: { color: "#dc2626", margin: 20 },
});
