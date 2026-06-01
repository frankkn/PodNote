import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { GEMINI_KEY_STORAGE, GROQ_KEY_STORAGE } from "@/config";
import { getItem, setItem } from "@/lib/secureStore";

export default function Settings() {
  const [gemini, setGemini] = useState("");
  const [groq, setGroq] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getItem(GEMINI_KEY_STORAGE).then((v) => {
      if (v) setGemini(v);
    });
    getItem(GROQ_KEY_STORAGE).then((v) => {
      if (v) setGroq(v);
    });
  }, []);

  const onSave = async () => {
    await setItem(GEMINI_KEY_STORAGE, gemini.trim());
    await setItem(GROQ_KEY_STORAGE, groq.trim());
    setSaved(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Gemini API Key</Text>
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
        onChangeText={(t) => {
          setGemini(t);
          setSaved(false);
        }}
      />

      <Text style={[styles.label, styles.gap]}>Groq API Key（快速模式用）</Text>
      <Text style={styles.hint}>
        用於「快速(推薦)」轉錄。金鑰存在本機；產生筆記時會傳到後端去呼叫 Groq，
        用完即丟、不會被保存。沒有此金鑰仍可使用「慢速(簡單)」模式。
        可到 console.groq.com 免費申請。
      </Text>
      <TextInput
        style={styles.input}
        placeholder="gsk_…"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={groq}
        onChangeText={(t) => {
          setGroq(t);
          setSaved(false);
        }}
      />

      <Button title="儲存" onPress={onSave} />
      {saved && <Text style={styles.ok}>已儲存 ✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  label: { fontSize: 16, fontWeight: "600" },
  gap: { marginTop: 12 },
  hint: { color: "#666", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  ok: { color: "#16a34a", marginTop: 8 },
});
