import { useEffect, useState } from "react";
import { Button, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  APP_VERSION,
  GEMINI_KEY_STORAGE,
  GROQ_KEY_STORAGE,
  OPENAI_KEY_STORAGE,
  TRANSCRIBE_PROVIDER_STORAGE,
} from "@/config";
import { getItem, setItem } from "@/lib/secureStore";

type Provider = "groq" | "openai";

export default function SettingsTab() {
  const [gemini, setGemini] = useState("");
  const [groq, setGroq] = useState("");
  const [openai, setOpenai] = useState("");
  const [provider, setProvider] = useState<Provider>("groq");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getItem(GEMINI_KEY_STORAGE).then((v) => { if (v) setGemini(v); });
    getItem(GROQ_KEY_STORAGE).then((v) => { if (v) setGroq(v); });
    getItem(OPENAI_KEY_STORAGE).then((v) => { if (v) setOpenai(v); });
    getItem(TRANSCRIBE_PROVIDER_STORAGE).then((v) => {
      if (v === "groq" || v === "openai") setProvider(v);
    });
  }, []);

  const onSave = async () => {
    await setItem(GEMINI_KEY_STORAGE, gemini.trim());
    await setItem(GROQ_KEY_STORAGE, groq.trim());
    await setItem(OPENAI_KEY_STORAGE, openai.trim());
    await setItem(TRANSCRIBE_PROVIDER_STORAGE, provider);
    setSaved(true);
  };

  const activeKey = provider === "groq" ? groq : openai;
  const hasActiveKey = activeKey.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* 轉錄 API */}
      <Text style={styles.label}>轉錄 API（快速模式）</Text>
      <Text style={styles.hint}>
        用於將影片轉成逐字稿。Key 存在本機，產生筆記時傳至伺服器呼叫 API，用完即丟、不會被記錄。
      </Text>

      <View style={styles.seg}>
        <Pressable
          style={[styles.segBtn, provider === "groq" && styles.segBtnOn]}
          onPress={() => { setProvider("groq"); setSaved(false); }}
        >
          <Text style={[styles.segText, provider === "groq" && styles.segTextOn]}>
            ⚡ Groq
          </Text>
          <Text style={[styles.segSub, provider === "groq" && styles.segSubOn]}>
            免費 · 推薦
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segBtn, provider === "openai" && styles.segBtnOn]}
          onPress={() => { setProvider("openai"); setSaved(false); }}
        >
          <Text style={[styles.segText, provider === "openai" && styles.segTextOn]}>
            🤖 OpenAI
          </Text>
          <Text style={[styles.segSub, provider === "openai" && styles.segSubOn]}>
            付費 · 備選
          </Text>
        </Pressable>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 二選一即可。兩個都填也沒關係，目前會使用上方選取的服務商。
        </Text>
      </View>

      {provider === "groq" ? (
        <>
          <Text style={styles.fieldLabel}>Groq API Key</Text>
          <Text style={styles.hint}>可到 console.groq.com 免費申請。</Text>
          <TextInput
            style={styles.input}
            placeholder="gsk_…"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={groq}
            onChangeText={(t) => { setGroq(t); setSaved(false); }}
          />
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>OpenAI API Key</Text>
          <Text style={styles.hint}>可到 platform.openai.com 申請（需付費）。</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-…"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={openai}
            onChangeText={(t) => { setOpenai(t); setSaved(false); }}
          />
        </>
      )}

      {hasActiveKey && (
        <View style={styles.activeTag}>
          <Text style={styles.activeTagText}>
            ✓ 目前使用 {provider === "groq" ? "Groq" : "OpenAI"}
          </Text>
        </View>
      )}

      {/* Gemini */}
      <Text style={[styles.label, styles.gap]}>Gemini API Key（筆記生成）</Text>
      <Text style={styles.hint}>
        用於把逐字稿整理成筆記。金鑰只存在本機，由瀏覽器直接連 Google，不會經過後端。
      </Text>
      <TextInput
        style={styles.input}
        placeholder="AIza…"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={gemini}
        onChangeText={(t) => { setGemini(t); setSaved(false); }}
      />

      <Button title="儲存" onPress={onSave} />
      {saved && <Text style={styles.ok}>已儲存 ✓</Text>}

      <View style={styles.versionRow}>
        <Text style={styles.versionLabel}>目前版本</Text>
        <Text style={styles.versionValue}>v{APP_VERSION}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  label: { fontSize: 16, fontWeight: "600" },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  gap: { marginTop: 8 },
  hint: { color: "#666", fontSize: 13 },
  seg: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    gap: 2,
  },
  segBtnOn: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  segText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  segTextOn: { color: "#2563eb" },
  segSub: { fontSize: 11, color: "#9ca3af" },
  segSubOn: { color: "#93c5fd" },
  noteBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 10,
  },
  noteText: { fontSize: 12, color: "#166534" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  activeTag: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeTagText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  ok: { color: "#16a34a", marginTop: 4 },
  versionRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 16,
  },
  versionLabel: { color: "#666", fontSize: 14 },
  versionValue: { color: "#111827", fontSize: 14, fontWeight: "600" },
});
