import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { GEMINI_KEY_STORAGE } from "@/config";
import { getItem, setItem } from "@/lib/secureStore";

export default function Settings() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getItem(GEMINI_KEY_STORAGE).then((v) => {
      if (v) setValue(v);
    });
  }, []);

  const onSave = async () => {
    await setItem(GEMINI_KEY_STORAGE, value.trim());
    setSaved(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Gemini API Key</Text>
      <Text style={styles.hint}>
        金鑰只會儲存在本機（手機用安全儲存，網頁用 localStorage），不會上傳到後端。
      </Text>
      <TextInput
        style={styles.input}
        placeholder="AIza…"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setSaved(false);
        }}
      />
      <Button title="儲存" onPress={onSave} disabled={value.trim().length === 0} />
      {saved && <Text style={styles.ok}>已儲存 ✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  label: { fontSize: 16, fontWeight: "600" },
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
