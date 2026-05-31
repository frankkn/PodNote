import AsyncStorage from "@react-native-async-storage/async-storage";

// 已生成的筆記，持久化到本機（web: localStorage / 原生: AsyncStorage）。
const KEY = "podnote_notes";

export interface SavedNote {
  id: string; // = job_id
  title: string;
  url: string;
  markdown: string;
  createdAt: number;
}

export async function listNotes(): Promise<SavedNote[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as SavedNote[];
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getNote(id: string): Promise<SavedNote | undefined> {
  const notes = await listNotes();
  return notes.find((n) => n.id === id);
}

export async function saveNote(note: SavedNote): Promise<void> {
  const notes = await listNotes();
  const others = notes.filter((n) => n.id !== note.id);
  others.unshift(note);
  await AsyncStorage.setItem(KEY, JSON.stringify(others));
}

export async function deleteNote(id: string): Promise<void> {
  const notes = await listNotes();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(notes.filter((n) => n.id !== id))
  );
}
