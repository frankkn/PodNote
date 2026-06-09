import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { createJob, TranscribeMode } from "@/api/backend";
import { summarize } from "@/api/gemini";
import { GEMINI_KEY_STORAGE, GROQ_KEY_STORAGE, OPENAI_KEY_STORAGE, TRANSCRIBE_PROVIDER_STORAGE } from "@/config";
import { getItem } from "@/lib/secureStore";
import { addJob, dismissJob, getJobs, updateJob, ActiveJob } from "@/store/activeJobs";
import { savePending } from "@/store/results";
import { saveNote } from "@/store/notes";
import { startPolling } from "@/hooks/usePolling";
import { useActiveJobs } from "@/hooks/useActiveJobs";

// 轉錄完成後自動呼叫 Gemini 生成摘要並存檔。模組層函式：即使使用者切走分頁，
// 摘要仍會在背景完成；完成後「查看筆記」可直接秒開（note 頁讀本機存檔）。
async function generateSummary(jobId: string, url: string): Promise<void> {
  const job = getJobs().find((j) => j.id === jobId);
  if (!job?.transcript) return;
  // 保留 pending 當 fallback（萬一摘要失敗，note 頁仍能重試）
  savePending(jobId, {
    transcript: job.transcript,
    title: job.title ?? "(未命名)",
    url,
  });
  updateJob(jobId, { noteStatus: "summarizing", noteError: null });
  try {
    const key = (await getItem(GEMINI_KEY_STORAGE))?.trim();
    if (!key) {
      updateJob(jobId, {
        noteStatus: "error",
        noteError: "尚未設定 Gemini API Key（到設定頁輸入後可重看）",
      });
      return;
    }
    const markdown = await summarize(job.transcript, key);
    await saveNote({
      id: jobId,
      title: job.title ?? "(未命名)",
      url,
      markdown,
      transcript: job.transcript,
      createdAt: Date.now(),
    });
    updateJob(jobId, { noteStatus: "ready" });
  } catch (e) {
    updateJob(jobId, {
      noteStatus: "error",
      noteError: e instanceof Error ? e.message : "摘要失敗",
    });
  }
}

function getDisplayTitle(job: ActiveJob): string {
  if (job.title) return job.title;
  try {
    return new URL(job.url).hostname;
  } catch {
    return job.url;
  }
}

function stageLabel(job: ActiveJob): string {
  if (job.state === "error") return `錯誤：${job.error ?? "轉檔失敗"}`;
  if (job.state === "done") return "完成 ✓";
  if (job.stage === "probing") return "檢查節目資訊…";
  if (job.stage === "downloading") return "下載音訊中…";
  if (job.stage === "transcribing")
    return `轉錄中 ${Math.round((job.progress ?? 0) * 100)}%`;
  return "建立任務中…";
}

function JobCard({
  job,
  onView,
}: {
  job: ActiveJob;
  onView: () => void;
}) {
  const isRunning = job.state === "pending" || job.state === "running";
  const isDone = job.state === "done";
  const isError = job.state === "error";

  return (
    <View
      style={[
        cardStyles.card,
        job.noteStatus === "ready" && cardStyles.cardDone,
        (isError || job.noteStatus === "error") && cardStyles.cardError,
      ]}
    >
      <View style={cardStyles.header}>
        <Text style={cardStyles.title} numberOfLines={1}>
          {getDisplayTitle(job)}
        </Text>
        <Pressable onPress={() => dismissJob(job.id)} hitSlop={12}>
          <Text style={cardStyles.dismiss}>✕</Text>
        </Pressable>
      </View>

      <Text
        style={[cardStyles.stage, isError && cardStyles.stageError]}
        numberOfLines={2}
      >
        {stageLabel(job)}
      </Text>

      {isRunning && (
        <View style={cardStyles.track}>
          <View
            style={[
              cardStyles.fill,
              { width: `${Math.round((job.progress ?? 0) * 100)}%` },
            ]}
          />
        </View>
      )}

      {isRunning && !job.transcript && (
        <ActivityIndicator style={{ marginTop: 8 }} size="small" />
      )}

      {isRunning && job.transcript ? (
        <Text style={cardStyles.partial} numberOfLines={3}>
          …{job.transcript.slice(-200)}
        </Text>
      ) : null}

      {isDone && (job.noteStatus === "idle" || job.noteStatus === "summarizing") && (
        <View style={cardStyles.summarizing}>
          <ActivityIndicator size="small" />
          <Text style={cardStyles.summarizingText}>摘要中…</Text>
        </View>
      )}

      {isDone && job.noteStatus === "ready" && (
        <Pressable style={cardStyles.viewBtn} onPress={onView}>
          <Text style={cardStyles.viewBtnText}>查看筆記 →</Text>
        </Pressable>
      )}

      {isDone && job.noteStatus === "error" && (
        <>
          <Text style={[cardStyles.stage, cardStyles.stageError]} numberOfLines={2}>
            摘要失敗：{job.noteError}
          </Text>
          <Pressable style={cardStyles.viewBtn} onPress={onView}>
            <Text style={cardStyles.viewBtnText}>重試 / 查看 →</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export default function GenerateTab() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<TranscribeMode>("gpu");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const jobs = useActiveJobs();
  const router = useRouter();

  const onSubmit = async () => {
    setMsg(null);
    let groqKey: string | undefined;
    let openaiKey: string | undefined;
    if (mode === "gpu") {
      const prov = (await getItem(TRANSCRIBE_PROVIDER_STORAGE)) ?? "groq";
      if (prov === "openai") {
        openaiKey = (await getItem(OPENAI_KEY_STORAGE))?.trim() || undefined;
        if (!openaiKey) {
          setMsg("快速模式已選擇 OpenAI，請先到設定頁輸入 OpenAI API Key，或切換回 Groq。");
          return;
        }
      } else {
        groqKey = (await getItem(GROQ_KEY_STORAGE))?.trim() || undefined;
        if (!groqKey) {
          setMsg("快速模式需要 Groq API Key，請先到設定頁輸入，或改用慢速模式。");
          return;
        }
      }
    }
    setSubmitting(true);
    const trimmedUrl = url.trim();
    try {
      const { job_id } = await createJob(trimmedUrl, mode, groqKey, openaiKey);
      addJob(job_id, trimmedUrl, mode);
      setUrl("");
      startPolling(job_id)
        .then(() => generateSummary(job_id, trimmedUrl))
        .catch(() => {});
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  const onViewNote = (job: ActiveJob) => {
    if (job.transcript) {
      savePending(job.id, {
        transcript: job.transcript,
        title: job.title ?? "(未命名)",
        url: job.url,
      });
    }
    router.push(`/note/${job.id}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Podcast 連結</Text>
      <TextInput
        style={styles.input}
        placeholder="https://…（podcast 單集連結）"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={url}
        onChangeText={setUrl}
        editable={!submitting}
      />

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.mode, mode === "gpu" && styles.modeOn]}
          onPress={() => setMode("gpu")}
          disabled={submitting}
        >
          <Text style={[styles.modeTitle, mode === "gpu" && styles.modeTitleOn]}>
            快速（推薦）
          </Text>
          <Text style={styles.modeHint}>外部GPU，須設定Gemini + Groq Key</Text>
        </Pressable>
        <Pressable
          style={[styles.mode, mode === "cpu" && styles.modeOn]}
          onPress={() => setMode("cpu")}
          disabled={submitting}
        >
          <Text style={[styles.modeTitle, mode === "cpu" && styles.modeTitleOn]}>
            慢速（簡單）
          </Text>
          <Text style={styles.modeHint}>只需設定Gemini Key，速度較慢。</Text>
        </Pressable>
      </View>

      <Button
        title={submitting ? "送出中…" : "產生筆記"}
        onPress={onSubmit}
        disabled={submitting || url.trim().length === 0}
      />

      {msg && <Text style={styles.error}>{msg}</Text>}

      {jobs.length > 0 && (
        <View style={styles.jobsSection}>
          <Text style={styles.sectionTitle}>進行中 / 最近完成</Text>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onView={() => onViewNote(job)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, gap: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f9fafb",
  },
  modeRow: { flexDirection: "row", gap: 10 },
  mode: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9fafb",
  },
  modeOn: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  modeTitle: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  modeTitleOn: { color: "#2563eb" },
  modeHint: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  error: { color: "#dc2626", fontSize: 14 },
  jobsSection: { gap: 10, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
});

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    gap: 8,
    backgroundColor: "#fff",
  },
  cardDone: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  cardError: { borderColor: "#dc2626", backgroundColor: "#fef2f2" },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111" },
  dismiss: { color: "#9ca3af", fontSize: 16, paddingHorizontal: 4 },
  stage: { fontSize: 13, color: "#6b7280" },
  stageError: { color: "#dc2626" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#2563eb" },
  partial: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 6,
  },
  viewBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  viewBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  summarizing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-end",
  },
  summarizingText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
});
