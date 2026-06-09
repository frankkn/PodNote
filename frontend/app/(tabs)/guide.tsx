import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const FLOW_STEPS = [
  { num: 1, emoji: "🎬", title: "輸入網址", desc: "貼上 YouTube 或其他影片網址", color: "#3b82f6", bg: "#eff6ff" },
  { num: 2, emoji: "🔑", title: "轉錄 API Key", desc: "Groq（免費，推薦!）或 OpenAI（付費）或跳過不設定（懶人，速度慢）", color: "#f97316", bg: "#fff7ed" },
  { num: 3, emoji: "✨", title: "Gemini API Key", desc: "將逐字稿整理成結構化筆記", color: "#8b5cf6", bg: "#f5f3ff" },
  { num: 4, emoji: "📝", title: "生成筆記完成", desc: "點擊生成，自動處理所有步驟", color: "#10b981", bg: "#ecfdf5" },
];

interface ApiStep {
  step: number;
  title: string;
  desc: string;
  warn?: boolean;
  action?: string;
  url?: string;
}

const GROQ_STEPS: ApiStep[] = [
  {
    step: 1,
    title: "前往 Groq 官網",
    desc: "開啟 console.groq.com",
    action: "開啟 Groq Console →",
    url: "https://console.groq.com",
  },
  {
    step: 2,
    title: "註冊 / 登入",
    desc: "可以用 Google 帳號快速登入，完全免費，不需要信用卡。",
  },
  {
    step: 3,
    title: "進入 API Keys 頁面",
    desc: "登入後，點擊右上角的「API Keys」。",
  },
  {
    step: 4,
    title: "建立新 Key",
    desc: "點擊「Create API Key」，隨意輸入一個名稱（如 PodNote），然後按確認。",
  },
  {
    step: 5,
    title: "複製並保存 Key",
    desc: "⚠️ Key 只會顯示這一次！請立即複製，貼到記事本等地方保存好。",
    warn: true,
  },
  {
    step: 6,
    title: "貼到 PodNote 設定",
    desc: "開啟左側「設定」頁面，將 Key 貼入「Groq API Key」欄位，按下儲存。",
  },
];

const GEMINI_STEPS: ApiStep[] = [
  {
    step: 1,
    title: "前往 Google AI Studio",
    desc: "開啟 aistudio.google.com",
    action: "開啟 AI Studio →",
    url: "https://aistudio.google.com",
  },
  {
    step: 2,
    title: "用 Google 帳號登入",
    desc: "點擊「Sign in with Google」，使用你的 Google 帳號登入即可，有 Gmail 就能用。",
  },
  {
    step: 3,
    title: "點擊「Get API Key」",
    desc: "頁面左下角選單點「Get API Key」，或直接開啟 aistudio.google.com/apikey。",
  },
  {
    step: 4,
    title: "建立 API Key",
    desc: "點擊「Create API key」→ 選擇現有 Google Cloud 專案，或建立新專案 → 確認。",
  },
  {
    step: 5,
    title: "複製並保存 Key",
    desc: "複製產生的 Key。之後也可以回到此頁面重新查看或建立新的 Key。",
  },
  {
    step: 6,
    title: "貼到 PodNote 設定",
    desc: "開啟左側「設定」頁面，將 Key 貼入「Gemini API Key」欄位，按下儲存。",
  },
];

function FlowDiagram({ isWide }: { isWide: boolean }) {
  return (
    <View style={[fd.wrap, !isWide && fd.wrapV]}>
      {FLOW_STEPS.map((item, i) => (
        <View key={i} style={[fd.group, !isWide && fd.groupV]}>
          <View style={[fd.card, { backgroundColor: item.bg, borderColor: item.color + "66" }]}>
            <View style={[fd.badge, { backgroundColor: item.color }]}>
              <Text style={fd.badgeNum}>{item.num}</Text>
            </View>
            <Text style={fd.emoji}>{item.emoji}</Text>
            <Text style={[fd.title, { color: item.color }]}>{item.title}</Text>
            <Text style={fd.desc}>{item.desc}</Text>
          </View>
          {i < FLOW_STEPS.length - 1 && (
            <Text style={[fd.arrow, !isWide && fd.arrowV]}>
              {isWide ? "›" : "↓"}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function StepCard({ item, color }: { item: ApiStep; color: string }) {
  return (
    <View style={[sc.card, item.warn && sc.warnCard]}>
      <View style={[sc.numBadge, { backgroundColor: color }]}>
        <Text style={sc.numText}>{item.step}</Text>
      </View>
      <View style={sc.body}>
        <Text style={sc.title}>{item.title}</Text>
        <Text style={[sc.desc, item.warn && sc.warnDesc]}>{item.desc}</Text>
        {item.action && item.url && (
          <Pressable
            style={[sc.linkBtn, { borderColor: color + "aa", backgroundColor: color + "11" }]}
            onPress={() => Linking.openURL(item.url!)}
          >
            <Text style={[sc.linkText, { color }]}>{item.action}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ApiSection({
  emoji, title, badge, badgeColor, badgeBg, note, steps, color,
}: {
  emoji: string; title: string; badge: string; badgeColor: string;
  badgeBg: string; note: string; steps: ApiStep[]; color: string;
}) {
  return (
    <View style={[as.section, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={as.header}>
        <Text style={as.emoji}>{emoji}</Text>
        <View style={as.headerText}>
          <Text style={[as.title, { color }]}>{title}</Text>
          <View style={[as.pill, { backgroundColor: badgeBg }]}>
            <Text style={[as.pillText, { color: badgeColor }]}>{badge}</Text>
          </View>
        </View>
      </View>
      <View style={as.noteBox}>
        <Text style={as.noteText}>{note}</Text>
      </View>
      <View style={as.steps}>
        {steps.map((s) => (
          <StepCard key={s.step} item={s} color={color} />
        ))}
      </View>
    </View>
  );
}

export default function GuideTab() {
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === "web" && width >= 640;

  return (
    <ScrollView style={g.container} contentContainerStyle={g.content}>
      <View style={g.hero}>
        <Text style={g.heroTitle}>使用說明</Text>
        <Text style={g.heroSub}>依照以下步驟完成 API Key 設定，即可開始自動生成 Podcast 筆記</Text>
      </View>

      <View style={g.block}>
        <Text style={g.blockTitle}>📌 整體流程</Text>
        <FlowDiagram isWide={isWide} />
      </View>

      <View style={g.block}>
        <Text style={g.blockTitle}>步驟二　取得 Groq API Key</Text>
        <ApiSection
          emoji="⚡"
          title="Groq — 轉錄引擎"
          badge="免費 · 無需信用卡"
          badgeColor="#ea580c"
          badgeBg="#ffedd5"
          note="💡 Groq 提供每日免費配額，使用 Whisper 模型進行語音轉文字，速度極快。一般 Podcast 使用完全夠用，不需要付費。"
          steps={GROQ_STEPS}
          color="#f97316"
        />
      </View>

      <View style={g.block}>
        <Text style={g.blockTitle}>步驟三　取得 Gemini API Key</Text>
        <ApiSection
          emoji="✨"
          title="Google Gemini — 筆記生成引擎"
          badge="有免費額度 · Google 帳號即可"
          badgeColor="#7c3aed"
          badgeBg="#ede9fe"
          note="💡 Gemini API 提供每日免費請求次數，用於將逐字稿整理成結構化筆記。有 Google 帳號即可免費申請，一般用量不會超過限制。"
          steps={GEMINI_STEPS}
          color="#8b5cf6"
        />
      </View>

      <View style={g.doneBox}>
        <Text style={g.doneEmoji}>🎉</Text>
        <Text style={g.doneTitle}>設定完成！</Text>
        <Text style={g.doneSub}>
          回到「生成筆記」頁面，貼上 YouTube 網址，點擊生成，剩下的交給 PodNote！
        </Text>
      </View>
    </ScrollView>
  );
}

const g = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, paddingBottom: 48, gap: 24 },
  hero: { backgroundColor: "#1e40af", borderRadius: 14, padding: 24, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  heroSub: { fontSize: 14, color: "#bfdbfe", lineHeight: 20 },
  block: { backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  blockTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  doneBox: { backgroundColor: "#ecfdf5", borderRadius: 14, borderWidth: 1, borderColor: "#6ee7b7", padding: 24, alignItems: "center", gap: 8 },
  doneEmoji: { fontSize: 36 },
  doneTitle: { fontSize: 18, fontWeight: "700", color: "#065f46" },
  doneSub: { fontSize: 14, color: "#047857", textAlign: "center", lineHeight: 20 },
});

const fd = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center" },
  wrapV: { flexDirection: "column", alignItems: "stretch" },
  group: { flexDirection: "row", alignItems: "center", flex: 1 },
  groupV: { flexDirection: "column", alignItems: "center" },
  card: { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 14, alignItems: "center", gap: 6, position: "relative" },
  badge: { position: "absolute", top: -10, left: -10, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeNum: { fontSize: 11, fontWeight: "700", color: "#fff" },
  emoji: { fontSize: 26 },
  title: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  desc: { fontSize: 11, color: "#6b7280", textAlign: "center", lineHeight: 16 },
  arrow: { fontSize: 24, color: "#9ca3af", paddingHorizontal: 4 },
  arrowV: { fontSize: 20, paddingHorizontal: 0, paddingVertical: 2, color: "#9ca3af" },
});

const sc = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", padding: 14 },
  warnCard: { backgroundColor: "#fffbeb", borderColor: "#fbbf24" },
  numBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  numText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: "600", color: "#111827" },
  desc: { fontSize: 13, color: "#6b7280", lineHeight: 19 },
  warnDesc: { color: "#92400e" },
  linkBtn: { marginTop: 8, alignSelf: "flex-start", borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  linkText: { fontSize: 13, fontWeight: "600" },
});

const as = StyleSheet.create({
  section: { gap: 12, paddingLeft: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 28 },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "700" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: "600" },
  noteBox: { backgroundColor: "#f0fdf4", borderRadius: 8, borderWidth: 1, borderColor: "#bbf7d0", padding: 12 },
  noteText: { fontSize: 13, color: "#166534", lineHeight: 19 },
  steps: { gap: 10 },
});
