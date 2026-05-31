import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";

import { createJob } from "@/api/backend";
import { useJobPolling } from "@/hooks/usePolling";
import { saveTranscript } from "@/store/results";

export default function Home() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { status, start } = useJobPolling();
  const router = useRouter();

  const onSubmit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { job_id } = await createJob(url.trim());
      const done = await start(job_id);
      saveTranscript(job_id, done.transcript ?? "");
      router.push(`/note/${job_id}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setBusy(false);
    }
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
        placeholder="https://…（podcast 單集或 YouTube）"
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
  link: { color: "#2563eb", marginTop: 8 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  statusText: { color: "#444" },
  error: { color: "#dc2626", marginTop: 12 },
});
