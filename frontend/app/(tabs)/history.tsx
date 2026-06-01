import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { deleteNote, listNotes, SavedNote } from "@/store/notes";

export default function HistoryTab() {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const router = useRouter();

  const refresh = useCallback(() => {
    listNotes().then(setNotes);
  }, []);

  useFocusEffect(refresh);

  if (notes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>還沒有筆記</Text>
        <Text style={styles.emptyHint}>到「生成筆記」頁貼入連結，產生第一份吧！</Text>
      </View>
    );
  }

  // 用 ScrollView + map 取代 FlatList：FlatList(VirtualizedList) 在
  // react-native-web 0.19 會觸發 CSSStyleDeclaration 崩潰。筆記量不大，不需虛擬化。
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {notes.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.rowDate}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable
              style={styles.btn}
              onPress={() => router.push(`/note/${item.id}?tab=transcript`)}
            >
              <Text style={styles.btnText}>逐字稿</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => router.push(`/note/${item.id}?tab=notes`)}
            >
              <Text style={[styles.btnText, styles.btnTextPrimary]}>筆記</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await deleteNote(item.id);
                refresh();
              }}
              hitSlop={10}
            >
              <Text style={styles.del}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#374151" },
  emptyHint: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
  list: { padding: 16, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 10,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  rowDate: { fontSize: 12, color: "#9ca3af" },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  btn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnPrimary: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  btnText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  btnTextPrimary: { color: "#2563eb" },
  del: { color: "#d1d5db", fontSize: 16, paddingHorizontal: 4 },
});
