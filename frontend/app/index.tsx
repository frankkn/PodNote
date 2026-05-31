import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";

import { createJob } from "@/api/backend";
import { useJobPolling } from "@/hooks/usePolling";
import { savePending } from "@/store/results";
import { deleteNote, listNotes, SavedNote } from "@/store/notes";

export default function Home() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const { status, start } = useJobPolling();
  const router = useRouter();

  const refresh = useCallback(() => {
    listNotes().then(setNotes);
  }, []);

  // 每次回到首頁都重新載入歷史（新生成的筆記會即時出現）
  useFocusEffect(refresh);

  const onSubmit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { job_id } = await createJob(url.trim());
      const done = await start(job_id);
      savePending(job_id, {
        transcript: done.transcript ?? "",
        title: done.title ?? "(未命名)",
        url: url.trim(),
      });
      router.push(`/note/${job_id}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    await deleteNote(id);
    refresh();
  };

  const stageLabel =
    status?.stage === "probing"
      ? "檢查節目資訊…"
      : status?.stage === "downloading"
        ? "下載音訊中…"
        : status?.stage === "transcribing"
          ? `轉檔中 ${Math.round((status?.progress ?? 0) * 100)}%`
          : "建立任務中…";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Podcast 單集連結</Text>
      <TextInput
        style={styles.input}
        placeholder="https://…（podcast 單集）"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={url}
        onChangeText={setUrl}
        editable={!busy}
      />
      <Button
        title={busy ? "處理中…" : "產生筆記"}
        onPress={onSubmit}
        disabled={busy || url.trim().length === 0}
      />

      <Link href="/settings" style={styles.link}>
        設定 Gemini API Key →
      </Link>

      {busy && (
        <View style={styles.status}>
          <ActivityIndicator />
          <Text style={styles.statusText}>{stageLabel}</Text>
        </View>
      )}
      {msg && <Text style={styles.error}>{msg}</Text>}

      <Text style={styles.histTitle}>歷史筆記</Text>
      {notes.length === 0 ? (
        <Text style={styles.empty}>還沒有筆記，產生第一份吧！</Text>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/note/${item.id}`)}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowDate}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Pressable>
              <Pressable onPress={() => onDelete(item.id)} hitSlop={8}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  label: { fontSize: 16, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  link: { color: "#2563eb", marginTop: 4 },
  status: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { color: "#444" },
  error: { color: "#dc2626" },
  histTitle: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  empty: { color: "#999" },
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 8,
  },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, color: "#111" },
  rowDate: { fontSize: 12, color: "#999", marginTop: 2 },
  del: { color: "#dc2626", fontSize: 16, paddingHorizontal: 6 },
});
