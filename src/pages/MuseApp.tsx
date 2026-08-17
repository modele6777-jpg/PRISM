import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Music,
  Send,
  Mic,
  Pen,
  BookOpen,
  Zap,
  Volume2,
  VolumeX,
  Copy,
  Check,
  History,
  X,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Lightbulb,
  MessageCircle,
  Layers,
  ChevronRight,
  Star,
  TreeDeciduous,
  Bird,
  Brain,
  Activity,
  Home,
  Search,
  Settings,
  Heart,
  Wind,
  ShieldCheck,
  LayoutGrid,
  Disc,
  Palette,
  Image,
  Library,
  Calendar,
  Layout,
  Clock,
  BarChart2,
  User,
  Stars as LucideStars,
  Link,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useApp } from "../contexts/AppContext";
import { trpc } from "../lib/trpc";
import {
  auth,
  db,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  getDocs,
  limit,
  handleFirestoreError,
  OperationType,
  doc,
  getDoc,
  setDoc,
} from "@/lib/firebase";
import {
  invokeLLM,
  invokeLLMStream,
  invokeLLMStructured,
  PERSONAS,
  textToSpeech,
  poeQuickInsight,
  buildDeepSynapseContext,
  ResonanceSchema,
  ensureResonanceResult,
  isBrokenResonanceResult,
  isResonanceForApp,
  stampResonanceApp,
} from "../lib/ai";
import { cleanLucyChatText } from "../lib/lucyChatUtils";
import { shuffleCardDeck, quantumSeedShuffle } from "@/lib/cardShuffle";
import { dailyFocusPlaylistSchema } from "@/lib/dailyBgm";
import { recordPrismFeature } from "@/lib/prismOmniSync";
import { DailyBgmSection } from "@/components/shared/DailyBgmSection";
import {
  getTodayDateKey,
  pickDailySeededCard,
  findTodayOracleInSources,
  resolveOracleVisionResult,
  isTimestampToday,
  markDailyAutoRan,
  getDailyAutoRanKey,
  markOracleModalSeen,
  hasSeenOracleModalToday,
  markResonanceModalSeen,
} from "@/lib/dailyCache";
import { buildResonanceSyncPrompt } from "@/lib/copyTone";
import { useDailyResonanceAutoRun } from "@/hooks/useDailyAutoRun";
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";
import { resetAppScroll } from "@/utils/scrollToTop";
import { useDailyOracleFirstVisit } from "@/hooks/useDailyOracleFirstVisit";
import {
  buildOracleDeepInsightSystemContext,
  buildOracleDeepInsightUserMessage,
  type OracleDeepInsightSendOpts,
} from "@/lib/oracleDeepInsight";
import { DailyOracleLoadingOverlay } from "@/components/DailyOracleLoadingOverlay";
import { z } from "zod";
import { Streamdown } from "@/components/Streamdown";
import { ArtistWayBible } from "@/components/muse/ArtistWayBible";
import { RoleModelModal } from "@/components/muse/RoleModelModal";
import { ArtRecommendationView } from "@/components/muse/ArtRecommendationView";
import { TTSButton } from "@/components/TTSButton";
import { ResonanceTTSButton } from "@/components/ResonanceTTSButton";
import {
  ResonanceNoteCard,
  ResonancePillGrid,
  ResonanceShieldCard,
  ResonanceStatBarGrid,
  resonanceModalOverlayClass,
  resonanceModalPanelClass,
} from "@/components/resonance/ResonanceResultSections";
import { BinauralTrackMarquee } from "@/components/BinauralTrackMarquee";
import { BinauralRandomPlayControl } from "@/components/BinauralRandomPlayControl";
import { AnimatedText } from "@/components/AnimatedText";
import { StatusBarDashboard } from "@/components/StatusBarDashboard";
import {
  SoulFrequencyChart,
  SpiritualGrowthRadar,
} from "@/components/SoulCharts";
import { CalendarView } from "@/components/CalendarView";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import NoticeModal from "@/components/NoticeModal";

import { playTTS, playConversation, stopTTS, useTTSActive } from "@/utils/tts";

import { SpecialFeatureFabGroup, SpecialFeatureButton, ChatFabButton } from "@/components/SpecialFeatureFab";
import {
  SPECIAL_FEATURE_CHROME_HIDDEN_CLASS,
  useSpecialFeatureChromeHidden,
} from "@/components/SpecialFeaturePanel";
import {
  playBinauralBeat,
  stopBinauralBeat,
  getActiveBinauralTrackId,
  getBinauralBeatsForApp,
  saveCustomBinauralBeat,
  buildRecommendedBinauralName,
  deleteCustomBinauralBeat,
  BinauralBeatConfig,
} from "@/lib/binaural";
import { useBinauralSync } from "@/hooks/useBinauralSync";

const THEME_COLOR = "oklch(0.35 0.14 240)";
const BG = "oklch(0.08 0.03 240)";

const ARTIST_QUOTES = [
  {
    quote: "창조성은 지능이 즐거운 시간을 보내는 방식이다.",
    author: "알베르트 아인슈타인",
  },
  {
    quote: "그림을 그리는 꿈을 꾸고, 그 꿈을 그린다.",
    author: "빈센트 반 고흐",
  },
  {
    quote:
      "모든 어린이는 예술가다. 문제는 어른이 되어서도 예술가로 남느냐 하는 것이다.",
    author: "파블로 피카소",
  },
  {
    quote: "나는 예술이 사람들의 평화를 방해하길 원한다.",
    author: "조니 미첼",
  },
  {
    quote: "음악은 감점의 표현이며, 감정은 음악의 영혼이다.",
    author: "프레데리크 쇼팽",
  },
  {
    quote:
      "완벽함이란 더 이상 보탤 것이 없을 때가 아니라, 더 이상 뺄 것이 없을 때 완성된다.",
    author: "생텍쥐페리",
  },
  {
    quote: "가장 개인적인 것이 가장 창의적인 것이다.",
    author: "마틴 스코세이지",
  },
  {
    quote:
      "당신이 할 수 있다고 믿든 할 수 없다고 믿든, 당신의 믿음대로 될 것이다.",
    author: "헨리 포드",
  },
  { quote: "위대한 예술가는 훔친다.", author: "피카소(스티브 잡스 인용)" },
  {
    quote: "당신의 목소리만이 유일하게 중요한 것이다.",
    author: "줄리아 카메론",
  },
  {
    quote:
      "실수는 인간이 하는 것이고, 용서는 신이 하는 것이다. 하지만 창작은 그 사이 어딘가에 있다.",
    author: "불명",
  },
  {
    quote: "예술은 세상을 더 살기 좋게 만드는 영혼의 위로다.",
    author: "오스카 와일드",
  },
  {
    quote: "예술은 우리 영혼에서 일상의 먼지를 씻어내 준다.",
    author: "파블로 피카소",
  },
  {
    quote: "영감은 존재하지만, 그것은 당신이 일하고 있을 때 찾아와야 한다.",
    author: "파블로 피카소",
  },
  {
    quote: "예술은 보는 것이 아니라, 다른 사람들로 하여금 보게 만드는 것이다.",
    author: "에드가 드가",
  },
  {
    quote: "창조적인 삶을 살려면 틀릴지도 모른다는 두려움을 버려야 한다.",
    author: "조셉 칠튼 피어스",
  },
  {
    quote: "모든 위대한 예술 뒤에는 항상 위대한 열정이 있다.",
    author: "레오나르도 다 빈치",
  },
  {
    quote:
      "음악은 말로 표현할 수 없는, 그렇다고 침묵할 수도 없는 것을 표현한다.",
    author: "빅토르 위고",
  },
];

type MuseMode =
  | "coach"
  | "studio"
  | "inspiration"
  | "bible"
  | "soul"
  | "history"
  | "landing"
  | "simple"
  | "onboarding";

const MODES: {
  id: MuseMode;
  label: string;
  icon: any;
  desc: string;
  quick: string[];
}[] = [
  {
    id: "simple",
    label: "Simple",
    icon: Sparkles,
    desc: "Quick creative sync",
    quick: [
      "오늘의 창의적 에너지",
      "메타 영감 한 줄",
      "지금 바로 떠오르는 프로젝트",
      "창작 블록 깨기",
    ],
  },
  {
    id: "studio",
    label: "Creative Studio",
    icon: Layout,
    desc: "Lyrics, arrangement, and role model sync",
    quick: [
      "Britney Spears 스타일",
      "David Bowie 연성",
      "곡의 구조 설계",
      "창작 블록 깨기",
    ],
  },
];

const GENRES = [
  "인디팝",
  "R&B / 소울",
  "록 / 얼터너티브",
  "힙합 / 랩",
  "일렉트로니카 / EDM",
  "포크 / 어쿠스틱",
  "재즈 / 블루스",
  "발라드",
  "K-POP",
  "시티팝",
  "로파이(Lo-fi)",
  "엠비언트",
  "클래식 / 뉴에이지",
  "메탈",
  "코어류",
];

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}
interface HistoryItem {
  id: string;
  mode: MuseMode;
  question: string;
  answer: string;
  timestamp: number;
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg glass border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-widest text-white/60 uppercase">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const EnergyAnalysisSchema = z.object({
  luckScore: z.number(),
  loveScore: z.number(),
  wealthScore: z.number(),
  healthScore: z.number(),
  luckyColor: z.string(),
  luckyNumber: z.string(),
  luckyItem: z.string(),
  cosmicAspect: z.string(),
  deepSyncLevel: z.string(),
  guidance: z.string(),
});

const QuickInsightSchema = z.object({
  diagnosis: z.string(),
  luckyNumber: z.union([z.string(), z.number()]).transform((v) => String(v)),
  luckyColor: z.string(),
  remedy: z.string(),
  symbol: z.string(),
  frequency: z.union([z.string(), z.number()]).transform((v) => String(v)),
  focusPlaylist: dailyFocusPlaylistSchema,
});

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="w-full min-w-0">
      <div className="flex justify-between gap-2 text-[10px] mb-1">
        <span className="text-white/40 uppercase tracking-widest min-w-0 break-words">{label}</span>
        <span style={{ color }} className="font-bold shrink-0">
          {value}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

const MUSE_CARDS = [
  {
    name: "창조적 불꽃 (Creative Spark)",
    emoji: "🔥",
    keyphrase: "순간적인 직관의 발현",
    desc: "머뭇거리지 마십시오. 지금 가슴속을 번뜩치고 지나가는 원초적인 아이디어가 당신만의 강력한 예술작품이 됩니다.",
  },
  {
    name: "우물의 충전 (Replenish Well)",
    emoji: "⛲",
    keyphrase: "휴식과 영혼의 흡수",
    desc: "영감은 짜내는 것이 아니라 채우는 것입니다. 오늘 하루는 창작에 집착하지 말고 낯선 이국적 풍경과 소리를 감상하십시오.",
  },
  {
    name: "융합의 연금술 (Sensory Alchemy)",
    emoji: "🧪",
    keyphrase: "장르와 장르의 이원 충돌",
    desc: "시각적 영감과 청각적 비트를 뇌 안에서 충돌시키십시오. 경이롭고 기발한 경계 밖의 가능성이 피어납니다.",
  },
  {
    name: "거장의 응시 (Masterpiece Flow)",
    emoji: "🎨",
    keyphrase: "고밀도의 몰입과 정교화",
    desc: "생각을 완전히 끄고 감각만이 연주를 주도하게 하십시오. 당신의 거장적 소울이 손끝과 호흡 위로 내려앉습니다.",
  },
  {
    name: "경계의 파괴 (Limitless Border)",
    emoji: "💥",
    keyphrase: "기존 문법의 완전 파해",
    desc: "대중적인 문법에 얽매이지 않고 가장 파격적이고 미학적인 나만의 색채를 자유롭게 방출할 최고의 성문화 시기입니다.",
  },
  {
    name: "선율의 속삭임 (Melodic Whisper)",
    emoji: "🎵",
    keyphrase: "잠재된 리듬감의 무의식적 자각",
    desc: "마음속 깊이 고요히 흐르는 선율에 귀를 기울이세요. 그것은 당신의 무의식이 자아내는 가장 완벽한 창작 비트가 됩니다.",
  },
  {
    name: "색채의 폭발 (Chromatic Jet)",
    emoji: "🌈",
    keyphrase: "감각과 환각적 색감의 대융합",
    desc: "단조롭고 메마른 관념에서 탈피하십시오. 무지개 스펙트럼의 날것의 에너지를 뿜어내어 전방위적인 시각 충격을 연출할 타이밍입니다.",
  },
  {
    name: "불멸의 리듬 (Cosmic Pulsar)",
    emoji: "🥁",
    keyphrase: "원초적인 맥동과 행동력",
    desc: "가장 원시적인 타악기 비트가 피를 뛰게 합니다. 주저하기보다 본능이 이끄는 파괴적인 속도감으로 크리에이션을 관통하십시오.",
  },
  {
    name: "소울 저널링 (Ego Ink)",
    emoji: "📖",
    keyphrase: "내면의 상처를 예술로 치유",
    desc: "가슴 쓰리거나 어두운 기억들을 솔직하고 담담히 종이에 적거나 가사로 조각해 보세요. 위대한 비극의 영감이 명작을 탄생시킵니다.",
  },
  {
    name: "거장의 붓끝 (Sovereign Brush)",
    emoji: "🖌️",
    keyphrase: "흔들림 없는 세련된 선묘",
    desc: "세밀하고 숙달된 숙련공의 에너지가 충족됩니다. 정교한 완성도를 높여줄 미적 터치를 적용해 보세요.",
  },
  {
    name: "무대의 떨림 (Enraptured Stage)",
    emoji: "🎭",
    keyphrase: "숨겨진 마이너리티 극미 페르소나",
    desc: "평범하고 위축된 일상의 나를 지우고, 무대 위에서 가장 화려하고 파격적인 가사의 페르소나를 완벽 연기해 보세요.",
  },
  {
    name: "감각의 전이 (Synesthesia Glide)",
    emoji: "👁️",
    keyphrase: "소리가 보이고 색깔이 들리는 상태",
    desc: "당신의 모든 감각 기관들이 한 줄기로 융화됩니다. 기괴하리만치 독창적인 공감각적 아이디어를 획득할 탁월한 시기입니다.",
  },
  {
    name: "별밤의 서곡 (Heavenly Overture)",
    emoji: "🌌",
    keyphrase: "밤의 적막 속에 흐르는 오케스트라",
    desc: "모두가 깊게 잠든 고요 속에서 홀로 차오르는 극상의 클래식적 품격입니다. 가장 성스럽고 웅장한 사상을 주조하십시오.",
  },
  {
    name: "창의적 고독 (Monastic Arc)",
    emoji: "👤",
    keyphrase: "스스로를 완전 폐쇄하여 얻는 몰입",
    desc: "사교와 타인의 말소리를 완전히 소거하고 나만의 거룩한 방에서 외로움과 고독을 에너지원으로 영감을 수확하십시오.",
  },
  {
    name: "불완전한 명작 (Sublime Fracture)",
    emoji: "🧩",
    keyphrase: "미완성이 지닌 거친 마력과 본능",
    desc: "과도하게 다듬으려 애쓰지 마십시오. 거칠고 투박하게 찢겨진 그대로의 낙서나 성긴 메모가 날것의 매력을 뿜어냅니다.",
  },
  {
    name: "우주의 즉흥 시 (Spontaneous Verse)",
    emoji: "✍️",
    keyphrase: "규칙 없는 즉흥적 프리스타일",
    desc: "논리와 사전 설계를 완전히 지우고, 손과 목소리가 향하는 가장 자유로운 드립 혹은 프리스타일로 획기적인 흐름을 타세요.",
  },
  {
    name: "영적 악기 (Celestial Sonar)",
    emoji: "🎻",
    keyphrase: "보이지 않는 고유 소울과의 결탁",
    desc: "당신의 악기는 영혼 그 자체입니다. 가슴을 켜는 비장하고 아름다운 현악 소리의 파동이 당신을 높은 감수성으로 이끕니다.",
  },
  {
    name: "뮤즈의 미소 (Blessed Kiss from Muse)",
    emoji: "🌟",
    keyphrase: "우연한 발견과 신성한 수혜",
    desc: "계산해서 길러낼 수 없는 찬란한 행운이자 번뜩임입니다. 손을 뻗어 하늘에서 수수께끼처럼 쏟아진 아이디어를 포획하십시오.",
  },
  {
    name: "카타르시스 (Aesthetic Cleansing)",
    emoji: "🌊",
    keyphrase: "엄청난 감정 폭발을 통한 해방",
    desc: "감정의 극단에서 펼쳐지는 폭발입니다. 울부짖음, 소리침, 숨김 없는 광기마저 모두 작품의 거대한 재료가 정당하게 사용됩니다.",
  },
  {
    name: "영감의 번개 (Lightning Strike)",
    emoji: "⚡",
    keyphrase: "가슴을 정확히 관통하는 기폭제",
    desc: "영혼의 번개가 당신을 똑바로 관전합니다. 전율을 느끼는 순간 가상 회로를 켜고 즉각 녹음 혹은 스케치를 하십시오.",
  },
  {
    name: "시적 은유 (Metaphorical Riddle)",
    emoji: "📜",
    keyphrase: "고도의 상징과 세련된 비유",
    desc: "말을 곱씹어 숨기십시오. 직접적인 표현 대신 비밀스러운 문법과 상징으로 가득 채워 리스너들과 기묘한 소통 놀이를 벌여 보십시오.",
  },
  {
    name: "미학적 해방 (Ethereal Liberty)",
    emoji: "🕊️",
    keyphrase: "모든 세상적 기대를 깨부순 참된 자유",
    desc: "성공 의무감마저 침 뱉고 비웃으십시오. 철저히 '내가 재밌는가'는 유일한 지표만을 이 우주에서 믿고 날개를 활짝 펼치십시오.",
  },
];

const translateEnglishValue = (val: string) => {
  if (!val) return "";
  const dict: Record<string, string> = {
    "cyan blue": "청청색 (시안 블루)",
    "blue feather": "푸른 깃털",
    optimal: "최적 지향 (OPTIMAL)",
    blue: "푸른색",
    cyan: "시안 청록색",
    "sky blue": "하늘색",
    crystal: "투명 정수정 원광 (크리스탈)",
    feather: "푸른 깃털",
    sapphire: "블루 사파이어",
    aquamarine: "해람석 (아쿠아마린)",
    silver: "은빛 보주",
    water: "심청 정화수",
    mirror: "성운 거울",
    indigo: "남색 (인디고)",
    red: "붉은 적색",
    orange: "오렌지 주황색",
    yellow: "황금 노란색",
    green: "초록 녹색",
    purple: "보랏빛 자색",
    pink: "분홍빛 홍색",
    violet: "제비꽃색",
    gold: "황금색",
    white: "순백색",
    black: "칠흑색",
    magenta: "진홍색 (마젠타)",
    stable: "안정화 상태",
    high: "고공 공명",
    resonance: "공명 상태",
    amethyst: "자수정",
    ruby: "루비",
    emerald: "에메랄드",
    diamond: "다이아몬드",
    obsidian: "흑요석 (옵시디언)",
    stone: "에너지 원석",
    ring: "공명 반지",
    bell: "정화 청동종",
    candle: "아로마 촛불",
    incense: "치유 인센스 스ティック",
    potion: "에너지 비약",
    scroll: "고대 성서 레시피",
    key: "통합의 열쇠",
    "emerald green": "에메랄드 녹색",
    "ruby red": "루비 적색",
  };
  const lower = val.toLowerCase().trim();
  if (lower.endsWith(".")) {
    const withoutDot = lower.slice(0, -1).trim();
    if (dict[withoutDot]) return dict[withoutDot];
  }
  if (dict[lower]) return dict[lower];
  return val;
};

export default function MuseApp() {
  const [, navigate] = useLocation();
  const isTTSActive = useTTSActive();
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const {
    firebaseUser,
    sharedState,
    updateSharedState,
    isChatOpen,
    setIsChatOpen,
    sendUnifiedMessage,
    openLucyChat,
    personaMessages,
    isGenerating,
  } = useApp();
  const lucyMessages = personaMessages.lucy || [];
  const isSpecialFeatureChromeHidden = useSpecialFeatureChromeHidden();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCardDrawn, setSessionCardDrawn] = useState<{
    name: string;
    emoji: string;
    keyphrase: string;
    desc: string;
    isReversed?: boolean;
  } | null>(null);

  // Custom Muse interactive resonance tuner states
  const [activeResonanceGems, setActiveResonanceGems] = useState<string[]>([
    "melody",
  ]);
  const [resonanceFreq, setResonanceFreq] = useState<number>(528);
  const [isSynthesizingAura, setIsSynthesizingAura] = useState(false);

  const [sessionComfortLevel, setSessionComfortLevel] = useState<number>(() => {
    try {
      const dateStr = new Date().toLocaleDateString("sv");
      const saved = localStorage.getItem(`muse_daily_level_${dateStr}`);
      return saved ? Number(saved) : 3;
    } catch (e) {
      return 3;
    }
  });

  const [sessionLevelCheckedIn, setSessionLevelCheckedIn] = useState<boolean>(
    () => {
      try {
        const dateStr = new Date().toLocaleDateString("sv");
        const saved = localStorage.getItem(`muse_daily_checked_${dateStr}`);
        return saved === "true";
      } catch (e) {
        return false;
      }
    },
  );

  const [isMeasuringInsight, setIsMeasuringInsight] = useState(false);
  const [insightResult, setInsightResult] = useState<any>(null);
  const [isDailyOracleLoading, setIsDailyOracleLoading] = useState(false);
  const [dailyMode, setDailyMode] = useState<string>("analyze");
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const renderDailyOracle = () => {
    return (
      <div className="space-y-12 text-left">
        <div className="text-center space-y-4">
          <h3 className="text-5xl font-display text-white tracking-tighter">
            Daily Muse Vision
          </h3>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.4em] font-sans">
            예술적 영감의 동조와 창조 피치
          </p>
        </div>

        <div className="w-full max-w-6xl mx-auto">
          {!dailyResult ? (
            <div className="space-y-8">
              {/* Unified Card Deck and Interactive Draw Frame */}
              <div className="w-full rounded-[40px] bg-zinc-950/80 border border-blue-500/20 p-8 md:p-12 text-center space-y-12 relative overflow-hidden backdrop-blur-xl min-h-[480px] flex flex-col justify-between overflow-x-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="space-y-4">
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.3em] font-mono block">
                    일일 창조 아우라 동전
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-display text-white tracking-widest uppercase">
                    Your Selected Muse Oracle
                  </h4>
                  <p className="text-xs text-white/40 max-w-md mx-auto leading-relaxed font-sans">
                    오늘 당신의 지적 신디케이트와 조우한 예술성 수호의
                    카드입니다. 카드를 뒤집어 레벨을 정조율해 보세요.
                  </p>
                </div>

                {sessionCardDrawn ? (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 55, damping: 16 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-3xl mx-auto z-10 font-sans"
                  >
                    {/* 3D Flip Card */}
                    <div
                      className="w-44 h-72 cursor-pointer relative shrink-0 animate-fade-in"
                      style={{ perspective: "1000px" }}
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      <motion.div
                        className="w-full h-full relative"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 border border-blue-500/40 flex items-center justify-center p-3 shadow-2xl group/card"
                          style={{
                            transform: "rotateY(0deg)",
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        >
                          <div className="absolute inset-1.5 border border-blue-500/20 rounded-xl flex flex-col items-center justify-center bg-blue-500/5 group-hover/card:bg-blue-500/10 transition-all shadow-inner">
                            <div className="w-10 h-10 rounded-full border border-blue-500/20 flex items-center justify-center bg-black/40 shadow-md">
                              <Music
                                size={20}
                                className="text-blue-400 transition-all shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse"
                              />
                            </div>
                            <span className="absolute bottom-3 text-[10px] font-mono text-blue-500/45 tracking-widest uppercase font-sans">
                              MUSE
                            </span>
                          </div>
                        </div>
                        <div
                          className="absolute inset-0 rounded-2xl border border-amber-500/30 flex flex-col justify-between p-4 shadow-[0_0_30px_rgba(251,191,36,0.15)] bg-cover bg-center overflow-hidden"
                          style={{
                            transform: "rotateY(180deg)",
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            backgroundImage: "url('/cards/muse_bg.png')",
                          }}
                        >
                          {/* Frosted Glass Overlay */}
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1.5px] z-0" />

                          {/* Cosmic Foil Borders & Corner Accents */}
                          <div className="absolute inset-1.5 border border-amber-500/25 rounded-xl pointer-events-none z-10" />
                          <div className="absolute inset-2 border border-amber-500/10 rounded-xl pointer-events-none z-10" />
                          <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-amber-500/40 pointer-events-none z-10" />
                          <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-amber-500/40 pointer-events-none z-10" />
                          <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-amber-500/40 pointer-events-none z-10" />
                          <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-amber-500/40 pointer-events-none z-10" />

                          {/* Upper Roman Numeral & Sparkles */}
                          <div className="flex justify-between items-center text-[9px] font-mono text-amber-400/80 font-sans z-10 tracking-[0.2em]">
                            <span>
                              {(() => {
                                const cardIdx = MUSE_CARDS.findIndex(
                                  (c) => c.name === sessionCardDrawn.name,
                                );
                                const numerals = [
                                  "I",
                                  "II",
                                  "III",
                                  "IV",
                                  "V",
                                  "VI",
                                  "VII",
                                  "VIII",
                                  "IX",
                                  "X",
                                  "XI",
                                  "XII",
                                  "XIII",
                                  "XIV",
                                  "XV",
                                  "XVI",
                                  "XVII",
                                  "XVIII",
                                  "XIX",
                                  "XX",
                                  "XXI",
                                  "XXII",
                                ];
                                return numerals[cardIdx] || "I";
                              })()}
                            </span>
                            <Sparkles
                              size={10}
                              className="text-amber-400/80 animate-pulse"
                            />
                          </div>

                          {/* Central Medallion (Talisman) */}
                          <div className="relative w-14 h-14 mx-auto flex items-center justify-center z-10 my-auto animate-pulse">
                            <div className="absolute inset-0 border border-dashed border-amber-500/40 rounded-full animate-[spin_20s_linear_infinite]" />
                            <div className="absolute inset-1 border border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                            <div
                              className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-amber-600/30 border border-amber-500/60 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.45)] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-transform duration-500"
                              style={{
                                transform: sessionCardDrawn.isReversed
                                  ? "rotateZ(180deg)"
                                  : "rotateZ(0deg)",
                              }}
                            >
                              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                {sessionCardDrawn.emoji}
                              </span>
                            </div>
                          </div>

                          {/* Lower Typography Section */}
                          <div className="text-center space-y-0.5 z-10">
                            <span className="text-[8px] text-amber-400/80 font-serif tracking-[0.15em] uppercase block">
                              {sessionCardDrawn.keyphrase}
                            </span>
                            <h4 className="text-xs font-bold font-sans text-white tracking-widest leading-tight block truncate max-w-full">
                              {sessionCardDrawn.name}
                            </h4>
                            {sessionCardDrawn.isReversed && (
                              <span className="text-[8px] font-mono text-red-400/90 font-bold block uppercase tracking-widest mt-0.5">
                                Reversed
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Right column: Description */}
                    <div className="flex-1 space-y-4 text-left md:pl-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 animate-fade-in font-sans">
                      <p className="text-xs text-white/50 leading-relaxed min-h-[40px]">
                        {!isFlipped
                          ? "카드를 탭하여 미래의 창조 코드와 잠재운 천재성의 비전을 뒤집어 보세요."
                          : `아우라 합성을 통해 인계된 예술성 영감 카드는 [${sessionCardDrawn.name}]입니다.`}
                      </p>

                      {isFlipped && (
                        <div className="space-y-3 bg-white/[0.02] border border-white/5 p-5 rounded-2xl animate-fade-in">
                          <div className="space-y-1">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest font-mono">
                              영감 상징 해석
                            </span>
                            <h5 className="text-sm font-bold text-white leading-snug">
                              {sessionCardDrawn.name}
                            </h5>
                          </div>
                          <div className="text-xs text-white/70 leading-relaxed bg-white/[0.02] border border-white/5 p-3 rounded-xl font-sans">
                            {sessionCardDrawn.desc}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* Custom Muse Aura Spark Frequency Synthesizer */
                  <div className="flex flex-col items-center justify-center py-6 space-y-8 z-10 w-full max-w-md mx-auto animate-fade-in">
                    {/* Gems Selector */}
                    <div className="grid grid-cols-4 gap-3 w-full animate-fade-in">
                      {[
                        {
                          id: "melody",
                          icon: Music,
                          label: "멜로디",
                          color:
                            "text-rose-400 shadow-rose-950/40 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20",
                        },
                        {
                          id: "palette",
                          icon: Palette,
                          label: "색채",
                          color:
                            "text-violet-400 shadow-violet-950/40 bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20",
                        },
                        {
                          id: "beat",
                          icon: Disc,
                          label: "리듬",
                          color:
                            "text-cyan-400 shadow-cyan-950/40 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20",
                        },
                        {
                          id: "soul",
                          icon: Sparkles,
                          label: "영혼",
                          color:
                            "text-amber-400 shadow-amber-950/40 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
                        },
                      ].map((gem) => {
                        const isSelected = activeResonanceGems.includes(gem.id);
                        return (
                          <button
                            key={gem.id}
                            type="button"
                            disabled={isSynthesizingAura}
                            onClick={() => {
                              try {
                                const ctx = new (
                                  window.AudioContext ||
                                  (window as any).webkitAudioContext
                                )();
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                osc.connect(gain);
                                gain.connect(ctx.destination);
                                osc.type = "triangle";
                                const pitches: Record<string, number> = {
                                  melody: 440,
                                  palette: 494,
                                  beat: 523,
                                  soul: 587,
                                };
                                osc.frequency.setValueAtTime(
                                  pitches[gem.id] || 440,
                                  ctx.currentTime,
                                );
                                gain.gain.setValueAtTime(
                                  0.012,
                                  ctx.currentTime,
                                );
                                gain.gain.exponentialRampToValueAtTime(
                                  0.001,
                                  ctx.currentTime + 0.3,
                                );
                                osc.start();
                                osc.stop(ctx.currentTime + 0.3);
                              } catch (e) {}

                              if (isSelected) {
                                if (activeResonanceGems.length > 1) {
                                  setActiveResonanceGems(
                                    activeResonanceGems.filter(
                                      (id) => id !== gem.id,
                                    ),
                                  );
                                }
                              } else {
                                setActiveResonanceGems([
                                  ...activeResonanceGems,
                                  gem.id,
                                ]);
                              }
                            }}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center ${
                              isSelected
                                ? `${gem.color} border-current ring-1 ring-current/40 scale-105 shadow-md`
                                : "text-white/40 border-white/5 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <gem.icon
                              size={18}
                              className={isSelected ? "animate-pulse" : ""}
                            />
                            <span className="text-[10px] font-bold font-sans tracking-tight">
                              {gem.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Interactive Tuning Dial / Wave */}
                    <div className="relative w-36 h-36 flex items-center justify-center animate-fade-in">
                      <div className="absolute inset-0 rounded-full border border-dashed border-violet-500/20 animate-[spin_60s_linear_infinite]" />
                      <motion.div
                        className="w-28 h-28 rounded-full border border-violet-500/30 flex flex-col items-center justify-center bg-black/50 overflow-hidden relative shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                        animate={{
                          rotate: isSynthesizingAura ? 360 : 0,
                        }}
                        transition={{
                          duration: isSynthesizingAura ? 1.5 : 10,
                          repeat: isSynthesizingAura ? Infinity : 0,
                          ease: isSynthesizingAura ? "linear" : "easeInOut",
                        }}
                      >
                        <span className="text-xl font-display font-black text-violet-400 drop-shadow-[0_0_8px_currentColor]">
                          {resonanceFreq}Hz
                        </span>
                        <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-sans mt-1">
                          {isSynthesizingAura ? "Synthesizing" : "Resonance"}
                        </span>
                      </motion.div>
                    </div>

                    {/* Frequency Range Slider */}
                    <div className="w-full space-y-1 animate-fade-in">
                      <div className="flex justify-between text-[10px] text-white/40 px-2 font-sans font-bold">
                        <span>창작 저음 (396Hz)</span>
                        <span>초월적 진동 (963Hz)</span>
                      </div>
                      <input
                        type="range"
                        min="396"
                        max="963"
                        disabled={isSynthesizingAura}
                        value={resonanceFreq}
                        onChange={(e) =>
                          setResonanceFreq(Number(e.target.value))
                        }
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>

                    {/* Transmute Action Button */}
                    <button
                      type="button"
                      disabled={isSynthesizingAura}
                      onClick={() => {
                        setIsSynthesizingAura(true);
                        try {
                          const ctx = new (
                            window.AudioContext ||
                            (window as any).webkitAudioContext
                          )();
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.type = "triangle";
                          osc.frequency.setValueAtTime(
                            resonanceFreq,
                            ctx.currentTime,
                          );
                          gain.gain.setValueAtTime(0.04, ctx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(
                            0.001,
                            ctx.currentTime + 1.2,
                          );
                          osc.start();
                          osc.stop(ctx.currentTime + 1.2);
                        } catch (e) {}

                        setTimeout(() => {
                          setIsSynthesizingAura(false);
                          const cardIndex = Math.floor(
                            Math.random() * MUSE_CARDS.length,
                          );
                          const selected = MUSE_CARDS[cardIndex];
                          setSessionCardDrawn(selected);
                          setIsFlipped(true);
                        }, 1500);
                      }}
                      className={`w-full py-3 rounded-2xl text-xs font-bold border tracking-[0.2em] uppercase transition-all shadow-xl ${
                        isSynthesizingAura
                          ? "border-violet-500/30 bg-violet-950/20 text-violet-400 cursor-wait animate-pulse"
                          : "border-violet-500/40 bg-gradient-to-r from-violet-600/20 to-blue-600/20 text-violet-400 hover:from-violet-600/30 hover:to-blue-600/30 hover:text-white hover:border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                      }`}
                    >
                      {isSynthesizingAura
                        ? "영감의 배음 합성 중..."
                        : "창조 아우라 합성하기"}
                    </button>
                  </div>
                )}
              </div>

              {/* 3-Column Grid Structure Under Card (100% same as Trinity) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pt-8">
                <div className="lg:col-span-2 space-y-8 opacity-100">
                  {!sessionCardDrawn ? (
                    <div className="p-8 rounded-[40px] text-center border-2 border-dashed border-white/10 bg-white/[0.01] text-white/30 text-xs font-sans">
                      뮤즈 카드를 드로우하고 자가 레벨을 정렬하여 비전을
                      가동하세요.
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02, translateY: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDailyOracle()}
                      disabled={isDailyOracleLoading}
                      className="w-full relative group overflow-hidden rounded-[40px] p-1 glass border border-blue-500/30 shadow-2xl disabled:opacity-50 cursor-pointer block text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="glass rounded-[36px] p-8 md:p-12 text-center space-y-6 relative z-10 border border-white/10 group-hover:border-blue-500/40 shadow-2xl hover:bg-white/[0.08] transition-all font-sans">
                        <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                          {isDailyOracleLoading ? (
                            <RefreshCw
                              size={32}
                              className="text-blue-400 animate-spin"
                            />
                          ) : (
                            <Sparkles size={32} className="text-blue-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-white mb-2">
                            Check Daily Vision
                          </h4>
                          <p className="text-[11px] text-blue-100/40 uppercase tracking-widest font-bold font-sans">
                            예술 오라클이 자가 지적 영감과 웰니스 테마를
                            설계합니다
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="glass p-8 rounded-[40px] border border-blue-500/30 shadow-2xl hover:border-blue-500/50 hover:bg-white/[0.08] transition-all duration-300 space-y-6 text-left font-sans">
                    <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                      <Wind size={16} /> Daily Remedy
                    </h4>
                    <p className="text-sm text-blue-100/70 leading-relaxed font-sans">
                      오늘의 자가 지적 영감과 주파수 분포 분석을 인-페이지로
                      해독 전사 전송합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* dailyResult 가 존재할 때 - 웅장한 인-페이지 리프트 대공개! */
            <div className="w-full rounded-[40px] bg-zinc-950/85 border border-blue-500/20 p-8 md:p-12 space-y-8 relative overflow-hidden backdrop-blur-xl text-left font-sans">
              <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] text-blue-400/80 font-bold uppercase tracking-[0.3em] font-mono block">
                    Daily Muse Vision Alignment Complete
                  </span>
                  <h4 className="text-3xl font-display text-white tracking-widest uppercase font-sans">
                    Muse Oracle Registry
                  </h4>
                  <p className="text-sm text-white/50 leading-relaxed max-w-xl font-sans">
                    생체 영감과 아티스트 천상 균형이 완전하게 연계되었습니다.
                    전사된 계시와 기조 비전을 확인하십시오.
                  </p>
                </div>

                {sessionCardDrawn && (
                  <div
                    className="w-36 h-56 rounded-2xl border border-amber-500/30 relative shadow-2xl flex flex-col justify-between p-3 shrink-0 self-center bg-cover bg-center overflow-hidden"
                    style={{ backgroundImage: "url('/cards/muse_bg.png')" }}
                  >
                    {/* Frosted Glass Overlay */}
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[1.5px] z-0" />

                    {/* Cosmic Foil Borders & Corner Accents */}
                    <div className="absolute inset-1 border border-amber-500/25 rounded-xl pointer-events-none z-10" />
                    <div className="absolute inset-1.5 border border-amber-500/10 rounded-xl pointer-events-none z-10" />
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-amber-500/40 pointer-events-none z-10" />
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-amber-500/40 pointer-events-none z-10" />
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-amber-500/40 pointer-events-none z-10" />
                    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-amber-500/40 pointer-events-none z-10" />

                    {/* Upper Roman Numeral & Sparkles */}
                    <div className="flex justify-between items-center text-[8px] font-mono text-amber-400/80 font-sans z-10 tracking-[0.2em]">
                      <span>
                        {(() => {
                          const cardIdx = MUSE_CARDS.findIndex(
                            (c) => c.name === sessionCardDrawn.name,
                          );
                          const numerals = [
                            "I",
                            "II",
                            "III",
                            "IV",
                            "V",
                            "VI",
                            "VII",
                            "VIII",
                            "IX",
                            "X",
                            "XI",
                            "XII",
                            "XIII",
                            "XIV",
                            "XV",
                            "XVI",
                            "XVII",
                            "XVIII",
                            "XIX",
                            "XX",
                            "XXI",
                            "XXII",
                          ];
                          return numerals[cardIdx] || "I";
                        })()}
                      </span>
                      <Sparkles
                        size={8}
                        className="text-amber-400/80 animate-pulse"
                      />
                    </div>

                    {/* Central Medallion (Talisman) */}
                    <div className="relative w-10 h-10 mx-auto flex items-center justify-center z-10 my-auto animate-pulse">
                      <div className="absolute inset-0 border border-dashed border-amber-500/40 rounded-full animate-[spin_20s_linear_infinite]" />
                      <div className="absolute inset-0.5 border border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                      <div
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-amber-600/30 border border-amber-500/60 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(245,158,11,0.4)] drop-shadow-[0_0_6px_rgba(245,158,11,0.3)] transition-transform duration-500"
                        style={{
                          transform: sessionCardDrawn.isReversed
                            ? "rotateZ(180deg)"
                            : "rotateZ(0deg)",
                        }}
                      >
                        <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                          {sessionCardDrawn.emoji}
                        </span>
                      </div>
                    </div>

                    {/* Lower Typography Section */}
                    <div className="text-center space-y-0.5 z-10">
                      <span className="text-[7px] text-amber-400/80 font-serif tracking-[0.1em] uppercase block truncate max-w-full">
                        {sessionCardDrawn.keyphrase}
                      </span>
                      <h4 className="text-[10px] font-bold font-sans text-white tracking-wider leading-tight block truncate max-w-full">
                        {sessionCardDrawn.name}
                      </h4>
                      {sessionCardDrawn.isReversed && (
                        <span className="text-[7px] font-mono text-red-400/90 font-bold block uppercase tracking-widest mt-0.5">
                          Reversed
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Detail Grid Body */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-blue-500 font-bold flex items-center gap-1 font-sans">
                      <Sparkles size={14} /> 심층 인과 관계식 비전 해독
                    </span>
                    <TTSButton
                      text={dailyResult.diagnosis}
                      voice="Kore"
                      className="text-blue-400 border-blue-500/20 text-xs py-1.5 scale-90 font-sans"
                    />
                  </div>
                  <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-white/90 text-sm sm:text-base font-sans leading-relaxed space-y-4 outline-none [&>h3]:text-blue-300 [&>h3]:text-lg [&>h3]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>p]:mb-3 [&>strong]:text-blue-200">
                    <Streamdown>{dailyResult.diagnosis}</Streamdown>
                  </div>

                  {dailyResult.guidance && (
                    <div className="p-6 rounded-3xl bg-white/[0.04] border border-blue-500/10 text-left space-y-2 font-sans">
                      <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest block flex items-center gap-1.5 font-sans">
                        <Sparkles size={12} /> Synergy Muse Vibration
                      </span>
                      <div className="text-xs text-white/70 leading-relaxed font-sans mt-1">
                        <Streamdown>{dailyResult.guidance}</Streamdown>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6 text-left font-sans">
                  {/* Remedy */}
                  <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-3 font-sans">
                    <h5 className="text-xs font-bold text-blue-400 flex items-center gap-2">
                      <Wind size={14} /> Daily Prescribed Remedy
                    </h5>
                    <p className="text-xs text-blue-100/90 leading-relaxed font-serif">
                      {dailyResult.remedy ||
                        "트리니티 비전에 동조하는 마음으로 오늘 평온의 완성을 유도하는 액션을 수행하십시오."}
                    </p>
                  </div>

                  {/* Blessing */}
                  {dailyResult.blessingMessage && (
                    <div className="p-6 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 text-center space-y-2">
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest block">
                        Aura's High Blessing
                      </span>
                      <p className="text-sm text-blue-100/90 font-serif italic leading-relaxed">
                        "{dailyResult.blessingMessage}"
                      </p>
                    </div>
                  )}

                  {/* Aura Stats */}
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 font-sans">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block font-sans">
                      Inspiration Symmetry Stats
                    </span>
                    <div className="space-y-3 font-sans">
                      <StatBar
                        label={`Creative Symmetry: ${dailyResult.symbol || "Ascension"}`}
                        value={80}
                        color="#3b82f6"
                      />
                      <StatBar
                        label={`Universal Resonance: ${dailyResult.frequency || "396Hz"}`}
                        value={85}
                        color="#06b6d4"
                      />
                    </div>
                  </div>

                  <DailyBgmSection
                    appId="muse"
                    dailyResult={dailyResult}
                    onPersist={(patch) => setDailyResult((prev: any) => (prev ? { ...prev, ...patch } : prev))}
                    accentClass="text-blue-300"
                    borderClass="border-blue-500/30"
                    buttonClass="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-300"
                    iconClass="text-blue-400"
                  />

                  {/* Deep Action Button */}
                  <button
                    type="button"
                    onClick={() => handleOracleDeepInsight()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all cursor-pointer uppercase tracking-wider font-sans"
                  >
                    Deep Insight <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const [notice, setNotice] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
  const [dailyResult, setDailyResult] = useState<any>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showSoulModal, setShowSoulModal] = useState(false);
  const [activeMode, setActiveMode] = useState<
    | "landing"
    | "simple"
    | "studio"
    | "soul"
    | "history"
    | "daily"
    | "bible"
    | "roleModel"
    | "artRecommendation"
  >("landing");
  useScrollToTopOnChange([activeMode]);

  useEffect(() => {
    const handleNavClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.path === "/muse") {
        setActiveMode("landing");
        setShowDailyModal(false);
        setShowSoulModal(false);

        setShowDashboard(false);
        setShowEmblemModal(false);
        resetAppScroll();
      }
    };
    window.addEventListener("nav-click-active", handleNavClick);
    return () => window.removeEventListener("nav-click-active", handleNavClick);
  }, []);
  const [shuffledMuseCards, setShuffledMuseCards] = useState(() =>
    shuffleCardDeck(MUSE_CARDS),
  );
  const [museOffsets, setMuseOffsets] = useState<
    { xOff: number; yOff: number; rotOff: number }[]
  >(() =>
    Array.from({ length: 22 }).map(() => ({
      xOff: 0,
      yOff: 0,
      rotOff: 0,
    })),
  );
  useEffect(() => {
    if (activeMode === "daily" && !sessionCardDrawn) {
      setShuffledMuseCards(shuffleCardDeck(MUSE_CARDS));
      setMuseOffsets(
        Array.from({ length: MUSE_CARDS.length }).map(() => ({
          xOff: 0,
          yOff: 0,
          rotOff: 0,
        })),
      );
    }
  }, [activeMode, sessionCardDrawn]);
  useEffect(() => {
    if (activeMode !== "daily" || sessionCardDrawn) return;

    const alignDeck = () => {
      const deck = cardContainerRef.current;
      if (deck && deck.scrollWidth > 0) {
        deck.scrollTo({
          left: Math.max(0, (deck.scrollWidth - deck.clientWidth) / 2),
          behavior: "smooth",
        });
      }
    };

    // Multi-stage triggers to capture exact browser reflow timing
    alignDeck();
    const frame = window.requestAnimationFrame(alignDeck);
    const timer1 = setTimeout(alignDeck, 60);
    const timer2 = setTimeout(alignDeck, 180);
    const timer3 = setTimeout(alignDeck, 350);

    const deck = cardContainerRef.current;
    if (!deck) {
      return () => {
        window.cancelAnimationFrame(frame);
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }

    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    let dragDistance = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      isDraggingRef.current = false;
      dragDistance = 0;
      startX = e.pageX - deck.offsetLeft;
      scrollLeft = deck.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown = false;
    };

    const onMouseUp = () => {
      isDown = false;
      if (dragDistance > 6) {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 30);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - deck.offsetLeft;
      const walk = (x - startX) * 1.6;
      if (Math.abs(walk) > 5) {
        isDraggingRef.current = true;
        dragDistance = Math.abs(walk);
      }
      deck.scrollLeft = scrollLeft - walk;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        deck.scrollBy({
          left: e.deltaY * 0.85,
          behavior: "smooth",
        });
      }
    };

    deck.addEventListener("mousedown", onMouseDown);
    deck.addEventListener("mouseleave", onMouseLeave);
    deck.addEventListener("mouseup", onMouseUp);
    deck.addEventListener("mousemove", onMouseMove);
    deck.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.cancelAnimationFrame(frame);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      deck.removeEventListener("mousedown", onMouseDown);
      deck.removeEventListener("mouseleave", onMouseLeave);
      deck.removeEventListener("mouseup", onMouseUp);
      deck.removeEventListener("mousemove", onMouseMove);
      deck.removeEventListener("wheel", onWheel);
    };
  }, [activeMode, sessionCardDrawn, shuffledMuseCards]);
  const [stage, setStage] = useState<
    "landing" | "analysis" | "station" | "history" | "onboarding" | "soul"
  >("landing");
  const [isPlayingBinaural, setIsPlayingBinaural] = useState(false);
  const [binauralList, setBinauralList] = useState<BinauralBeatConfig[]>([]);
  const [currentBinauralTrack, setCurrentBinauralTrack] =
    useState<BinauralBeatConfig | null>(null);

  const refreshBinauralBeats = () => {
    const list = getBinauralBeatsForApp("muse");
    setBinauralList(list);
    const activeId = getActiveBinauralTrackId();
    const activeTrack = list.find((t) => t.id === activeId);
    setCurrentBinauralTrack(activeTrack || list[0]);
  };

  const isSendingRef = useRef(false);
  const [inspirationSpark, setInspirationSpark] = useState<string | null>(null);
  const [isAmplifying, setIsAmplifying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [soulData, setSoulData] = useState({
    coreValue: "예술적 직관과 감성",
    unconsciousPattern: "영감의 기복과 완벽주의",
    preference: "풍부한 은유와 지지적인 어조",
    stats: [
      { subject: "창의성", A: 90, fullMark: 100 },
      { subject: "직관력", A: 85, fullMark: 100 },
      { subject: "공감 능력", A: 80, fullMark: 100 },
      { subject: "몰입도", A: 75, fullMark: 100 },
      { subject: "발상력", A: 85, fullMark: 100 },
    ],
    energyFlow: [
      { time: "월", value: 30 },
      { time: "화", value: 50 },
      { time: "수", value: 90 },
      { time: "목", value: 60 },
      { time: "금", value: 80 },
      { time: "토", value: 95 },
      { time: "일", value: 70 },
    ],
    emotions: [
      { name: "영감", value: 40 },
      { name: "불안", value: 30 },
      { name: "설렘", value: 20 },
      { name: "공허", value: 10 },
    ],
  });
  useEffect(() => {
    const isRoleModelActive = activeMode === "roleModel";
    const evName = isRoleModelActive ? "tarot-active" : "tarot-inactive";
    window.dispatchEvent(new CustomEvent(evName));
    return () => {
      window.dispatchEvent(new CustomEvent("tarot-inactive"));
    };
  }, [activeMode]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showEmblemModal, setShowEmblemModal] = useState(false);

  const [isResonanceModalOpen, setIsResonanceModalOpen] = useState(false);
  const [resonanceProgress, setResonanceProgress] = useState(0);
  const [resonanceData, setResonanceData] = useState<{
    coherence: number;
    bandText: string;
    freqText: string;
    shieldToken: string;
    prescription: string;
    advice: string;
    luckScore?: number;
    loveScore?: number;
    wealthScore?: number;
    healthScore?: number;
    deepSyncLevel?: string;
    luckyItem?: string;
    luckyColor?: string;
    guidance?: string;
    cosmicAspect?: string;
  } | null>(null);
  const [isResonanceLoading, setIsResonanceLoading] = useState(false);

  useEffect(() => {
    updateSharedState({}, "MUSE");
  }, []);

  useBinauralSync({
    appId: "muse",
    setIsPlayingBinaural,
    setBinauralList,
    setCurrentBinauralTrack,
  });

  const handleResonanceSync = async (opts?: { silent?: boolean; auto?: boolean }) => {
    const todayStr = getTodayDateKey();
    const cachedDate = localStorage.getItem("resonance_muse_last_date");
    const cachedDataStr = localStorage.getItem("resonance_muse_last_data");

    if (cachedDate === todayStr && cachedDataStr) {
      try {
        const cachedData = JSON.parse(cachedDataStr);
        if (!isBrokenResonanceResult(cachedData) && isResonanceForApp(cachedData, "muse")) {
          setResonanceData(cachedData);
          setIsResonanceLoading(false);
          if (!opts?.silent) {
            setIsResonanceModalOpen(true);
            setResonanceProgress(100);
            if (opts?.auto && firebaseUser?.uid) {
              markResonanceModalSeen("muse", firebaseUser.uid);
            }
          }
          return;
        }
        localStorage.removeItem("resonance_muse_last_data");
      } catch (err) {
        console.warn("Failed to load cached resonance data", err);
      }
    }

    if (!opts?.silent) {
      setIsResonanceModalOpen(true);
      setResonanceProgress(0);
      setIsResonanceLoading(true);
    }
    setResonanceData(null);

    // Play a gentle alignment chord (432Hz / 540Hz creative cosmic harmony)
    try {
      const sampleRate = 8000;
      const duration = 1.0;
      const numSamples = sampleRate * duration;
      const buffer = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        buffer[i] =
          (Math.sin(2 * Math.PI * 432 * t) +
            0.5 * Math.sin(2 * Math.PI * 540 * t)) *
          0.3 *
          Math.exp(-3 * t);
      }
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const audioBuffer = audioCtx.createBuffer(1, buffer.length, sampleRate);
      audioBuffer.getChannelData(0).set(buffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.warn("PCM audio playback failed", e);
    }

    // Smooth progress simulation
    const interval = setInterval(() => {
      setResonanceProgress((p) => {
        if (p >= 98) {
          clearInterval(interval);
          return 98;
        }
        return p + Math.floor(Math.random() * 8) + 4;
      });
    }, 100);

    try {
      const fatigue = sharedState?.healthMetrics?.fatigue ?? 20;
      const stress = sharedState?.healthMetrics?.stressLevel ?? 30;
      const focus = sharedState?.productivityMetrics?.focusTime ?? 40;
      const vibe = sharedState?.currentVibe ?? "영감적";

      const prompt = buildResonanceSyncPrompt('muse', `- 피로: ${fatigue}/100
- 스트레스: ${stress}/100
- 집중 시간: ${focus}분
- 지금 기분: ${vibe}`);

      const res = stampResonanceApp(ensureResonanceResult(await invokeLLMStructured({
        messages: [{ role: "user", content: prompt }],
        schema: ResonanceSchema,
        resonanceApp: "muse",
      }), "muse"), "muse");

      clearInterval(interval);
      setResonanceProgress(100);
      setResonanceData(res as any);
      setIsResonanceLoading(false);
      if (opts?.auto && firebaseUser?.uid) {
        markResonanceModalSeen("muse", firebaseUser.uid);
      }

      try {
        const todayStr = (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })();
        localStorage.setItem("resonance_muse_last_date", todayStr);
        localStorage.setItem("resonance_muse_last_data", JSON.stringify(res));
      } catch (storageErr) {
        console.warn("Failed to save resonance to local storage:", storageErr);
      }

      if (res.carrier && res.beat) {
        const newBeat = saveCustomBinauralBeat({
          name: buildRecommendedBinauralName('muse', res.bandText),
          carrier: res.carrier,
          beat: res.beat,
          desc: res.freqText,
          category: "muse",
        });
        const list = getBinauralBeatsForApp("muse");
        setBinauralList(list);
        setCurrentBinauralTrack(newBeat);
      } else {
        refreshBinauralBeats();
      }

      recordPrismFeature({
        app: 'muse',
        featureName: '뮤즈 창작 영감 오라클 동조',
        summary: `일관성 지수: ${res.coherence}%, 주파수: ${res.freqText || '639Hz'}, 수호방패: [${res.shieldToken}], 처방: "${res.prescription}", 실천: "${res.advice}"`,
        details: res,
      });

      if (firebaseUser && localStorage.getItem("developer_bypass") !== "true") {
        try {
          await addDoc(
            collection(db, "muse_history", firebaseUser.uid, "entries"),
            {
              type: "resonance",
              title: `뮤즈 영혼 공명 동조 (일관성: ${res.coherence}%)`,
              content: `일관성 지수: ${res.coherence}%\n기후 대역: ${res.bandText}\n동조 주파수: ${res.freqText}\n\n수호 방패 코드: [${res.shieldToken}]\n\n[처방 전언]\n${res.prescription}\n\n[실천 지침]\n${res.advice}`,
              createdAt: serverTimestamp(),
            },
          );
        } catch (dbErr) {
          console.warn("Failed to save resonance to firestore:", dbErr);
        }
      }
    } catch (err) {
      console.warn(
        "Muse resonance AI sync failed, calling local matrix fallback:",
        err,
      );
      setTimeout(async () => {
        clearInterval(interval);
        setResonanceProgress(100);
        const coherenceVal = Math.round(85 + Math.random() * 13);
        const fallbackData = {
          coherence: coherenceVal,
          bandText: "아티스트 인디고 솔루션 대역 (432Hz 공명)",
          freqText:
            "흐트러진 예술적 주파수와 무의식의 진동수를 창작 몰입 상태로 리셋하여 아이디어 순환을 가속합니다.",
          shieldToken: "창조의 방벽 (Creative Aegis)",
          prescription: `현재 영감 지표에 맞춘 에너지 조율막이 신속 편제되었습니다. 일정한 시간에 어깨와 목의 피로를 순환시키고 불쾌한 불안 자극들을 완전히 발산하기 위한 창작적 주파수가 팽배하고 있습니다.`,
          advice:
            "지금 바로 온수를 한 모금 마신 뒤, 1분간 눈을 감고 온전히 고요한 인디고 블루의 빛을 머릿속에 연상하십시오.",
          carrier: 432,
          beat: 8,
        };
        setResonanceData(fallbackData);
        setIsResonanceLoading(false);
        if (opts?.auto && firebaseUser?.uid) {
          markResonanceModalSeen("muse", firebaseUser.uid);
        }

        try {
          const todayStr = (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })();
          localStorage.setItem("resonance_muse_last_date", todayStr);
          localStorage.setItem(
            "resonance_muse_last_data",
            JSON.stringify(fallbackData),
          );
        } catch (storageErr) {
          console.warn(
            "Failed to save resonance to local storage:",
            storageErr,
          );
        }

        const newBeat = saveCustomBinauralBeat({
          name: buildRecommendedBinauralName('muse', fallbackData.bandText),
          carrier: fallbackData.carrier,
          beat: fallbackData.beat,
          desc: fallbackData.freqText,
          category: "muse",
        });
        const list = getBinauralBeatsForApp("muse");
        setBinauralList(list);
        setCurrentBinauralTrack(newBeat);

        if (
          firebaseUser &&
          localStorage.getItem("developer_bypass") !== "true"
        ) {
          try {
            await addDoc(
              collection(db, "muse_history", firebaseUser.uid, "entries"),
              {
                type: "resonance",
                title: `뮤즈 영혼 공명 동조 (일관성: ${coherenceVal}%)`,
                content: `일관성 지수: ${coherenceVal}%\n기후 대역: ${fallbackData.bandText}\n동조 주파수: ${fallbackData.freqText}\n\n수호 방패 코드: [${fallbackData.shieldToken}]\n\n[처방 전언]\n${fallbackData.prescription}\n\n[실천 지침]\n${fallbackData.advice}`,
                createdAt: serverTimestamp(),
              },
            );
          } catch (dbErr) {
            console.warn(
              "Failed to save fallback resonance to firestore:",
              dbErr,
            );
          }
        }
      }, 1200);
    }
  };

  useEffect(() => {
    if (!firebaseUser) return;
    const isDev = localStorage.getItem("developer_bypass") === "true";
    if (isDev) return;

    let unsub: (() => void) | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      const q = query(
        collection(db, "muse_history", firebaseUser.uid, "entries"),
        orderBy("createdAt", "desc"),
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as any),
              timestamp:
                (d.data() as any).createdAt?.toMillis?.() || Date.now(),
            }))
            .filter((d: any) => d.type !== "chat");
          updateSharedState({ museHistory: docs }, "MUSE");
        },
        (error) => {
          const msg = error?.message || "";
          if (msg.includes("INTERNAL ASSERTION FAILED")) {
            console.warn("[Muse] Firestore 내부 오류 — 5초 후 재연결합니다.");
            retryTimeout = setTimeout(subscribe, 5000);
          } else {
            handleFirestoreError(
              error,
              OperationType.GET,
              `muse_history/${firebaseUser?.uid}/entries`,
            );
          }
        },
      );
    };

    subscribe();
    return () => {
      unsub?.();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    const isDev = localStorage.getItem("developer_bypass") === "true";
    if (isDev) {
      try {
        const saved = localStorage.getItem("soul_mirror_muse");
        if (saved) {
          setSoulData(JSON.parse(saved));
        }
      } catch (_) {}
      return;
    }
    const fetchSoulData = async () => {
      try {
        const docRef = doc(
          db,
          "soul_mirror",
          firebaseUser.uid,
          "dapps",
          "muse",
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSoulData(docSnap.data() as any);
        }
      } catch (err) {
        console.error("Error loading soulData", err);
      }
    };
    fetchSoulData();
  }, [firebaseUser]);

  const museOracleHistory = useMemo(
    () => [...(sharedState?.museHistory || [])],
    [sharedState?.museHistory],
  );

  useEffect(() => {
    const history = sharedState?.museHistory || [];
    if (history.length > 0) {
      const latestSoul = history.find((h: any) => h.type === "soul-energy");
      if (latestSoul) {
        setInsightResult(latestSoul.data || latestSoul);
      }
    }
  }, [sharedState?.museHistory]);

  const handleStudioSynthesis = async () => {
    setIsSynthesizing(true);
    setStudioResult(null);
    try {
      const data = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `당신은 아티스트들의 영감을 깨우는 창조의 요정 '뮤즈(Muse)'입니다. 주어진 입력값을 기반으로 사용자의 예술적 비전을 구체화하는 전설적인 창작 가이드를 한국어로 작성해주세요.`,
          },
          { role: "user", content: `영감을 정제하거나 통합해주세요.` },
        ],
      });
      setStudioResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleConsultation = async (text: string, sendOpts?: OracleDeepInsightSendOpts) => {
    if (!text.trim()) return;
    if (!sendOpts?.force && (isSendingRef.current || isGenerating.lucy)) return;
    isSendingRef.current = true;
    openLucyChat('muse');

    poeQuickInsight(text, lucyMessages as any)
      .then((res: any) => {
        if (res && res.insight) {
          if (res.themeColor || res.currentVibe) {
            updateSharedState(
              {
                ...(res.themeColor ? { themeColor: res.themeColor } : {}),
                ...(res.currentVibe ? { currentVibe: res.currentVibe } : {}),
              },
              "MUSE",
            );
          }
        }
      })
      .catch(console.error);

    try {
      const profile = sharedState?.userProfile;
      const deepCoreInfo = buildDeepSynapseContext(profile);
      const soulMirrorInfo = `\n[영혼의 거울]\n- 핵심 가치: ${soulData.coreValue}\n- 무의식적 패턴: ${soulData.unconsciousPattern}\n- 취향 및 선호: ${soulData.preference}\n이 데이터를 바탕으로 사용자의 방향성을 교정하여 코칭에 반영할 것. 또한, 이번 대화를 바탕으로 이 영혼의 거울 데이터(핵심 가치, 패턴, 취향, stats, energyFlow, emotions 등)를 갱신해야 한다면 응답의 가장 마지막에 오직 다음 포맷으로만 업데이트 내용을 출력하세요: [SOUL_UPDATE: {"coreValue":"...","unconsciousPattern":"...","preference":"...","stats":[{"subject":"...","A":85,"fullMark":100}],"energyFlow":[{"time":"...","value":80}],"emotions":[{"name":"...","value":40}]}]`;
      const combinedContext = deepCoreInfo + "\n" + soulMirrorInfo;

      const oracleCtx = sendOpts?.oracleContext ? `\n${sendOpts.oracleContext}` : '';
      await sendUnifiedMessage(text, "muse", undefined, {
        extraSystemContext: `${combinedContext}\n[현재 뮤즈 상담 주제]: ${text}${oracleCtx}`,
        onFinish: async (finalResponse, sentText) => {
          const match = finalResponse.match(/\[SOUL_UPDATE:\s*({[\s\S]*?})\]/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              setSoulData((prev) => {
                const updated = { ...prev, ...parsed };
                if (firebaseUser) {
                  const isDev = localStorage.getItem("developer_bypass") === "true";
                  if (isDev) {
                    localStorage.setItem(
                      "soul_mirror_muse",
                      JSON.stringify(updated),
                    );
                  } else {
                    setDoc(
                      doc(db, "soul_mirror", firebaseUser.uid, "dapps", "muse"),
                      updated,
                    ).catch((e) =>
                      console.error("Error saving soulData to firestore", e),
                    );
                  }
                }
                return updated;
              });
            } catch (e) {
              console.error("Soul update parse error", e);
            }
          }

          const cleaned = cleanLucyChatText(finalResponse);
          if (
            auth.currentUser &&
            localStorage.getItem("developer_bypass") !== "true"
          ) {
            try {
              await addDoc(
                collection(db, "muse_history", auth.currentUser.uid, "entries"),
                {
                  type: "chat",
                  mode: activeMode,
                  content: cleaned,
                  question: sentText,
                  createdAt: serverTimestamp(),
                },
              );
            } catch (error) {
              handleFirestoreError(
                error,
                OperationType.WRITE,
                `muse_history/${auth.currentUser.uid}/entries`,
              );
            }
          }
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleOracleDeepInsight = useCallback(() => {
    if (!dailyResult) return;
    markOracleModalSeen("muse");
    setShowDailyModal(false);
    void handleConsultation(buildOracleDeepInsightUserMessage("muse", dailyResult), {
      force: true,
      oracleContext: buildOracleDeepInsightSystemContext(dailyResult, "muse"),
    });
  }, [dailyResult, handleConsultation]);

  const handleDailyOracle = async (
    overrideCard?: typeof sessionCardDrawn,
    opts?: { autoRun?: boolean },
  ) => {
    if (isDailyOracleLoading) return;

    const uid = firebaseUser?.uid || "guest";
    const limitKey = `limit_daily_muse_${uid}_${getTodayDateKey()}`;
    const lastSync = sharedState?.lastMuseDailySync;
    const hasTodayEntry = !!findTodayOracleInSources(museOracleHistory, ["oracle-vision"]);
    const isLockedToday =
      !!localStorage.getItem(limitKey) ||
      (isTimestampToday(lastSync) && (!!dailyResult || hasTodayEntry));

    if (isLockedToday) {
      const entry = findTodayOracleInSources(museOracleHistory, ["oracle-vision"]);
      const resolved = entry ? resolveOracleVisionResult(entry) : null;
      if (resolved) {
        setDailyResult({ ...resolved, dateKey: getTodayDateKey() });
        if (!hasSeenOracleModalToday("muse")) {
          setShowDailyModal(true);
          markOracleModalSeen("muse");
        }
        return;
      }
      if (!opts?.autoRun) {
        setNotice({
          open: true,
          title: "일일 한도 도달",
          message:
            "오늘의 일일 아티스트 진단은 이미 완료되었습니다. 이전 진단 내역을 확인하기 위해 에필로그로 이동합니다.",
        });
        setTimeout(() => {
          navigate("/epilogue");
        }, 1500);
      }
      return;
    }

    setIsDailyOracleLoading(true);

    const modePrompt =
      dailyMode === "analyze"
        ? "창작의 본질을 날카롭게 해체하고, 숨겨진 미학적 가치와 잠재된 영감의 뿌리를 꿰뚫어보는 초고도화된 예술적 분석의 관점에서"
        : dailyMode === "expand"
          ? "경계를 허물고 기존의 관념을 파괴하며, 전혀 다른 차원의 장르와 폭발적인 영감으로 세계관을 무한히 팽창시키는 관점에서"
          : dailyMode === "oracle"
            ? "영혼을 뒤흔드는 강렬하고 파격적인 선언이자, 새로운 예술적 시대의 서막을 알리는 시적인 신탁의 형태로"
            : dailyMode === "connect"
              ? "서로 닿을 수 없던 이질적인 감각들을 화학적으로 충돌시켜, 기적처럼 놀라운 새로운 차원의 시너지를 창조해내는 관점에서"
              : "종합적이고 초월적인 영적 조언과 함께";

    const userProfileStr = sharedState?.userProfile
      ? JSON.stringify(sharedState.userProfile)
      : "프로필 정보 없음";
    const recentMemory =
      sharedState?.museMemory || sharedState?.globalMemory || "최근 기록 없음";

    try {
      const activeCard = overrideCard ?? sessionCardDrawn;
      const isRev = (activeCard as any)?.isReversed;
      const cardContext = activeCard
        ? `\n[오늘의 예술 뮤즈 카드]: ${activeCard.name} ${activeCard.emoji} (${activeCard.keyphrase}) [상태: ${isRev ? "역방향(Reversed - 경고, 에너지의 과잉/결핍, 창의적 정체, 극복해야 할 그림자적 측면)" : "정방향(Upright - 흐름의 순탄함, 활성화, 자연스러운 발현)"}] - 이 카드가 가진 창의 모티브와 충전 상징들을 오늘의 아티스트 비전 전체에 깊이 연계하여 제시할 것. 특히 상태가 역방향(Reversed)인 경우, 경고나 내면의 그늘(Shadow), 또는 고정관념의 은유를 통해 이를 창조적 도전으로 승화시킬 수 있는 어두운 터치나 깊은 조언을 함께 담아 리포트를 작성할 것.`
        : "";
      const levelContext = `\n[자가 진단 창작 영감 수준]: 현재 5레벨 중 ${sessionComfortLevel}수준 (${sessionComfortLevel === 1 ? "아이디어가 완전히 막혀 고갈되고 무거움" : sessionComfortLevel === 5 ? "가장 폭발적이고 가벼운 창조지수" : "보통의 흐름"}).. 이 레벨 상태에 맞춰 영감 보정 처방을 줄 것`;

      const data = await invokeLLMStructured({
        messages: [
          {
            role: "system",
            content: `당신은 예술적 영감을 선사하는 뮤즈(Muse) 마스터입니다.
오늘 아티스트가 뽑은 영감 카드는 **[${activeCard ? `${activeCard.name} ${activeCard.emoji}` : "영감의 뮤즈"}]**입니다.

[반드시 준수할 필수 지침]
1. 오늘 뽑은 영감 카드 **[${activeCard?.name || ''}]**(${activeCard?.keyphrase || ''})의 상징과 예술적 모티브를 진단의 최우선 중심축으로 삼아 풀이하세요.
2. 'diagnosis' 필드는 마크다운(소제목, 글머리 기호, 굵은 글씨)을 활용해 3~4문단 이상의 장문으로 [${activeCard?.name || ''}] 카드가 전하는 창작 영감, 예술적 돌파구, 표현 기법을 심층 분석하세요.
3. 'remedy'에는 이 카드의 영감을 오늘 즉각 창작/작업에 적용할 수 있는 구체적인 실행 팁 2문장을 작성하세요.
4. 'focusPlaylist'에는 오늘의 창작 에너지·주파수에 맞는 맞춤 영감 사운드스케이프 이름을 제시할 것. [데이터: 프로필(${userProfileStr}), 최근상태(${recentMemory})${cardContext}${levelContext}]`,
          },
          {
            role: "user",
            content: `오늘 내가 뽑은 영감 카드는 [${activeCard?.name || ''} ${activeCard?.emoji || ''}] (${activeCard?.keyphrase || ''})야. 이 카드의 모티브를 중심으로, ${modePrompt} 오늘 나의 예술적 주파수와 창작 비전을 깊이 있게 진단해줘.`,
          },
        ],
        schema: QuickInsightSchema,
      });

      if (data) {
        setDailyResult({ ...data, dateKey: getTodayDateKey() });
        setShowDailyModal(true);
        markOracleModalSeen("muse");
        markDailyAutoRan("muse_oracle", uid);
        localStorage.setItem(limitKey, "true");
        await updateSharedState({ lastMuseDailySync: Date.now() }, "MUSE");
        if (
          auth.currentUser &&
          localStorage.getItem("developer_bypass") !== "true"
        ) {
          try {
            await addDoc(
              collection(db, "muse_history", auth.currentUser.uid, "entries"),
              {
                type: "oracle-vision",
                content: `Oracle Vision: ${data.diagnosis}`,
                createdAt: serverTimestamp(),
                data,
              },
            );
          } catch (error) {
            handleFirestoreError(
              error,
              OperationType.WRITE,
              `muse_history/${auth.currentUser.uid}/entries`,
            );
          }
        }
      } else {
        localStorage.removeItem(getDailyAutoRanKey("muse_oracle", uid));
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem(getDailyAutoRanKey("muse_oracle", uid));
    } finally {
      setIsDailyOracleLoading(false);
    }
  };

  useDailyResonanceAutoRun('muse', firebaseUser?.uid, handleResonanceSync, !!sharedState);
  useDailyOracleFirstVisit({
    appPrefix: "muse",
    featureKey: "muse_oracle",
    appLockPrefix: "muse",
    limitKeyPrefix: "limit_daily_muse",
    uid: firebaseUser?.uid,
    enabled: !!sharedState,
    lastSync: sharedState?.lastMuseDailySync,
    dailyResult,
    setDailyResult,
    isLoading: isDailyOracleLoading,
    historySources: museOracleHistory,
    setShowDailyModal,
    onPrepare: () => {
      const card = pickDailySeededCard(MUSE_CARDS, "muse_oracle");
      setSessionCardDrawn(card);
    },
    runOracle: (opts) => {
      const card = pickDailySeededCard(MUSE_CARDS, "muse_oracle");
      setSessionCardDrawn(card);
      return handleDailyOracle(card, opts);
    },
  });

  const handleEnergyAnalysis = async () => {
    if (isMeasuringInsight) return;

    const lastSync = sharedState?.lastMuseSoulSync;
    const today = new Date().toDateString();
    if (lastSync && new Date(lastSync).toDateString() === today) {
      setNotice({
        open: true,
        title: "일일 한도 도달",
        message:
          "아티스트 소울 분석은 하루에 한 번만 이용 가능합니다. 이전 보았던 소울 분석 결과를 확인하기 위해 에필로그로 이동합니다.",
      });
      setTimeout(() => {
        navigate("/epilogue");
      }, 1500);
      return;
    }

    setIsMeasuringInsight(true);
    setInsightResult(null);

    const userProfileStr = sharedState?.userProfile
      ? JSON.stringify(sharedState.userProfile)
      : "프로필 정보 없음";
    const recentMemory =
      sharedState?.museMemory || sharedState?.globalMemory || "최근 기록 없음";
    const dailyContext = dailyResult
      ? `오늘의 Daily 진단: ${dailyResult.diagnosis} (상징: ${dailyResult.symbol}, 주파수: ${dailyResult.frequency})`
      : "오늘의 Daily 진단 데이터 없음";

    try {
      const data = await invokeLLMStructured({
        messages: [
          {
            role: "system",
            content: `당신은 음악적 영감을 깨우는 뮤즈(Muse)입니다. 사용자의 프로필, 최근 창작 흐름, 영감 데이터 및 오늘의 Daily 오라클을 종합하여 '예술적 에너지 심층 분석 리포트'를 초고도화된 수준으로 작성하세요. [데이터 가이드: 프로필(${userProfileStr}), 최근상태(${recentMemory}), 데일리진단(${dailyContext})]\n준수사항: 'guidance' 필드는 소제목, 리스트, 강조 등 마크다운 양식을 사용하여 최소 4문단 이상의 깊고 창의적인 비전을 세밀하게 제시할 것.`,
          },
          {
            role: "user",
            content: `나의 영혼과 창작 주파수를 꿰뚫어보는 완벽하고 깊이 있는 에너지 진단 리포트를 작성해줘.`,
          },
        ],
        schema: EnergyAnalysisSchema,
      });
      setInsightResult(data);
      await updateSharedState(
        { lastMuseSoulSync: Date.now(), lastMuseSync: Date.now() },
        "MUSE",
      );
      if (
        auth.currentUser &&
        localStorage.getItem("developer_bypass") !== "true"
      ) {
        try {
          await addDoc(
            collection(db, "muse_history", auth.currentUser.uid, "entries"),
            {
              type: "soul-energy",
              content: `Artist Soul Analysis: ${data.guidance}`,
              createdAt: serverTimestamp(),
              data,
            },
          );
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.WRITE,
            `muse_history/${auth.currentUser.uid}/entries`,
          );
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsMeasuringInsight(false);
    }
  };

  return (
    <div
      className="h-app-full w-full flex flex-col relative overflow-hidden font-sans bg-transparent"
    >

      <div
        className={`fixed top-safe-2 left-1.5 sm:left-2 md:top-safe-4 md:left-6 pointer-events-auto z-[110] scale-[0.68] sm:scale-75 md:scale-100 origin-top-left transition-all duration-300 ${isSpecialFeatureChromeHidden ? SPECIAL_FEATURE_CHROME_HIDDEN_CLASS : 'opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] group backdrop-blur-md cursor-pointer" onClick={() => setShowEmblemModal(true)}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="absolute inset-0 rounded-full border border-dashed border-white/30"
            />
            <div className="absolute inset-[3px] md:inset-[4px] rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
              <Music
                size={24}
                className="relative z-10 text-blue-400 drop-shadow-[0_0_12px_currentColor] transition-transform group-hover:scale-110 duration-500 animate-pulse md:w-6 md:h-6"
                strokeWidth={1.5}
              />
            </div>
          </div>
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-tighter ">
              PRISM
            </h1>
            <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-widest font-bold font-sans">
              MUSE • CREATIVE SANCTUARY
            </p>
          </div>
        </div>
      </div>

      <SpecialFeatureFabGroup>
        <SpecialFeatureButton
          theme="muse"
          icon={User}
          isActive={activeMode === "roleModel"}
          title="롤모델 멘토 (뮤즈 특수기능)"
          tooltipLabel="롤모델 멘토 (MUSE 특수기능)"
          onClick={() => {
            setActiveMode((prev) => (prev === "roleModel" ? "landing" : "roleModel"));
          }}
        />
        <ChatFabButton onClick={() => openLucyChat('muse')} />
      </SpecialFeatureFabGroup>

      <nav className={`prism-xs-subnav fixed top-safe-nav md:top-safe-nav-md left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar md:max-w-fit md:overflow-visible transition-all duration-300 ${isSpecialFeatureChromeHidden ? SPECIAL_FEATURE_CHROME_HIDDEN_CLASS : 'opacity-100'}`}>
        {[
          { id: "landing", icon: Home, label: "Core" },
          { id: "artRecommendation", icon: Sparkles, label: "DAILY" },
          { id: "bible", icon: BookOpen, label: "BIBLE" },
        ].map((item) => {
          const isActive = activeMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveMode(item.id as any);
              }}
              className={`prism-subnav-btn flex shrink-0 whitespace-nowrap items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl transition-all duration-300 group ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <item.icon
                size={16}
                className={isActive ? "animate-pulse" : ""}
              />
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto transition-all"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <StatusBarDashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        color={THEME_COLOR}
        appName="Muse"
      />

      <main data-app-scroll-root className="flex-1 w-full pt-page pb-page md:pt-page-md md:pb-page-md flex flex-col relative z-10 overflow-y-auto no-scrollbar scroll-smooth text-white">
        <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 prism-xs-pad flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {activeMode === "landing" ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 w-full flex flex-col items-center justify-start md:justify-center pt-6 pb-24 md:pt-16 md:pb-32 text-center lg:text-left gap-6 md:gap-12"
              >
                <div className="w-full max-w-5xl mx-auto animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                    {/* Left Column: Visual Hub & Title & Description */}
                    <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 md:space-y-12">
                      {/* Resonance Indicator Circle */}
                      <div className="relative group mx-auto lg:mx-0 w-fit mb-4">
                        <div className="absolute inset-0 bg-blue-500/30 blur-[80px] rounded-full scale-125 animate-pulse transition-all duration-300 group-hover:bg-blue-500/40" />
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5 border border-blue-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.1)] transition-all duration-500 group-hover:scale-110 group-hover:border-blue-400/60 group-hover:shadow-[0_0_60px_rgba(59,130,246,0.3)] backdrop-blur-md">
                          <div className="absolute inset-0 bg-white/5 rounded-full pointer-events-none" />
                          <div
                            onClick={() => handleResonanceSync()}
                            className="relative z-20 cursor-pointer active:scale-95 transition-all text-blue-400 font-bold group flex flex-col items-center justify-center"
                            title="양자 의식 공명 조율 및 시냅스 정렬"
                          >
                            <Music
                              size={64}
                              className="relative z-10 w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_24px_currentColor] transition-transform group-hover:rotate-12 duration-700 animate-pulse group-hover:scale-105"
                              strokeWidth={1}
                            />
                            <span className="absolute -bottom-7 md:-bottom-9 text-[9px] font-black tracking-[0.2em] md:tracking-[0.25em] text-blue-400/90 uppercase whitespace-nowrap md:animate-bounce font-mono">
                              [ ATTUNE RESONANCE ]
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Titles */}
                      <div className="space-y-6">
                        <p className="text-4xl sm:text-5xl md:text-7xl font-display tracking-widest text-white leading-tight uppercase font-bold text-center lg:text-left">
                          Creative
                          <br />
                          <span className="text-blue-400">Canvas</span>
                        </p>
                        <p className="text-xs sm:text-sm md:text-base text-white/40 font-sans max-w-lg mx-auto lg:mx-0 leading-6 md:leading-relaxed tracking-wide px-2 md:px-0">
                          무의식 저편에 잠든 예술적 영감을 깨워냅니다.
                          <br className="hidden md:inline" /> MUSE와 동기화하여
                          고차원적인 아이디어를 스케치하고,
                          <br className="hidden md:inline" /> 한계를 뛰어넘는
                          당신만의 창작 지평을 열어보세요.
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Audio Synchronizer & Memory Guides */}
                    <div className="lg:col-span-6 w-full space-y-6 md:space-y-8">
                      {/* Cosmic Binaural Beats Player Widget */}
                      <div className="mx-auto lg:mx-0 w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white/5 border border-blue-500/20 backdrop-blur-xl flex flex-col items-center gap-4 shadow-xl hover:border-blue-500/40 transition-all duration-300">
                        <div className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center justify-between gap-2 w-full border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span
                                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlayingBinaural ? "bg-blue-400" : "bg-white/30"}`}
                              ></span>
                              <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${isPlayingBinaural ? "bg-blue-500" : "bg-white/40"}`}
                              ></span>
                            </span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] font-mono">
                              Cosmic Binaural Beats
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-400 font-mono">
                            {currentBinauralTrack
                              ? `${currentBinauralTrack.carrier}Hz + ${currentBinauralTrack.beat}Hz`
                              : "528Hz + 10Hz"}
                          </span>
                        </div>
                        <BinauralRandomPlayControl
                          appId="muse"
                          binauralList={binauralList}
                          currentBinauralTrack={currentBinauralTrack}
                          setCurrentBinauralTrack={setCurrentBinauralTrack}
                          isPlayingBinaural={isPlayingBinaural}
                          setIsPlayingBinaural={setIsPlayingBinaural}
                          defaultTrackName="창작 집중 (432Hz)"
                        />

                        {/* List of custom and preset beats */}
                        {binauralList.length > 0 && (
                          <div className="w-full mt-2 border-t border-white/5 pt-3 flex flex-col gap-2 max-h-40 overflow-y-auto no-scrollbar">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.1em]">
                                My Wave Patterns
                              </span>
                              <span className="text-[8px] text-blue-400 font-mono">
                                {binauralList.length} Tracks
                              </span>
                            </div>
                            {binauralList.map((track) => {
                              const isThisTrackPlaying =
                                isPlayingBinaural &&
                                getActiveBinauralTrackId() === track.id;
                              const isThisSelected =
                                currentBinauralTrack?.id === track.id;
                              return (
                                <div
                                  key={track.id}
                                  onClick={() => {
                                    if (isThisTrackPlaying) {
                                      stopBinauralBeat();
                                      setIsPlayingBinaural(false);
                                    } else {
                                      setCurrentBinauralTrack(track);
                                      playBinauralBeat(track);
                                      setIsPlayingBinaural(true);
                                    }
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                                    isThisSelected
                                      ? "bg-white/10 border border-blue-500/20"
                                      : "bg-white/[0.02] border border-transparent hover:bg-white/5"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0 text-left pr-2 overflow-hidden">
                                    <BinauralTrackMarquee active={isThisTrackPlaying} text={track.name} className={`text-[11px] font-medium leading-tight ${isThisTrackPlaying ? "text-blue-400" : "text-white/80"}`} />
                                    <BinauralTrackMarquee active={isThisTrackPlaying} text={`${track.carrier}Hz + ${track.beat}Hz • ${track.desc}`} className="text-[9px] text-white/40 mt-0.5" />
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {track.isCustom && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteCustomBinauralBeat(track.id);
                                          if (
                                            currentBinauralTrack?.id ===
                                            track.id
                                          ) {
                                            stopBinauralBeat();
                                            setIsPlayingBinaural(false);
                                          }
                                          refreshBinauralBeats();
                                        }}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all cursor-pointer"
                                        title="Delete Track"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${isThisTrackPlaying ? "bg-blue-500/20 text-blue-400 animate-pulse" : "bg-white/5 text-white/40"}`}
                                    >
                                      {isThisTrackPlaying ? (
                                        <svg
                                          className="w-3.5 h-3.5 fill-current"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                        </svg>
                                      ) : (
                                        <svg
                                          className="w-3.5 h-3.5 fill-current translate-x-0.5"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : isMeasuringInsight && !insightResult ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-40"
              >
                <RefreshCw size={48} className="text-blue-400 animate-spin" />
                <p className="mt-6 text-sm text-blue-400 font-bold uppercase tracking-widest animate-pulse">
                  Analyzing Energy Frequency...
                </p>
              </motion.div>
            ) : (activeMode as any) === "soul_inactive" ? (
              <div className="text-center py-24 text-white/40">
                모달 팝업으로 결과를 확인하고, 아래 기능은 닫혀있습니다.
              </div>
            ) : false ? (
              <div>
                {insightResult ? (
                  <div className="w-full max-w-4xl mx-auto glass p-10 rounded-[60px] border border-blue-700/30 shadow-[0_0_100px_rgba(30,64,175,0.1)]">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-3">
                        <Zap size={22} className="text-blue-400" />
                        <span className="text-sm font-bold text-blue-500 tracking-[0.4em] uppercase ">
                          The Artist Decree
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setInsightResult(null);
                          }}
                          className="hidden"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                      <StatBar
                        label="Creativity"
                        value={insightResult.luckScore || 0}
                        color="#3b82f6"
                      />
                      <StatBar
                        label="Emotion"
                        value={insightResult.loveScore || 0}
                        color="#f472b6"
                      />
                      <StatBar
                        label="Vision"
                        value={insightResult.wealthScore || 0}
                        color="#4ade80"
                      />
                      <StatBar
                        label="Focus"
                        value={insightResult.healthScore || 0}
                        color="#60a5fa"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 font-sans font-medium uppercase tracking-tight">
                      {[
                        {
                          label: "동기화 상태",
                          v: translateEnglishValue(
                            insightResult.deepSyncLevel || "OPTIMAL",
                          ),
                          c: "text-blue-400",
                        },
                        {
                          label: "파워 아이템",
                          v: translateEnglishValue(insightResult.luckyItem),
                          c: "text-blue-300",
                        },
                        {
                          label: "집중 색상",
                          v: translateEnglishValue(insightResult.luckyColor),
                          c: "text-blue-200",
                        },
                      ].map((i, idx) => (
                        <div
                          key={idx}
                          className="p-6 bg-white/[0.03] border border-white/5 rounded-[40px] flex flex-col items-center justify-center"
                        >
                          <span className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-sans font-bold">
                            {i.label}
                          </span>
                          <span className={`text-base text-center flex ${i.c}`}>
                            {i.v}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6 text-left">
                      <div className="p-8 bg-blue-900/10 border border-blue-700/20 rounded-[48px] shadow-inner font-sans">
                        <div className="flex items-center gap-3 mb-4">
                          <Sparkles
                            size={18}
                            className="text-blue-400 animate-pulse"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">
                              Master's Guidance
                            </span>
                            <span className="text-[9px] text-white/40 font-sans mt-1 leading-none">
                              오늘 하루의 구체적 행동 지침과 따뜻한 심리 멘토링
                              조언입니다.
                            </span>
                          </div>
                        </div>
                        <div className="text-base sm:text-lg text-white/90 font-sans leading-relaxed [&>h3]:text-blue-300 [&>h3]:text-xl [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>p]:mb-4">
                          <Streamdown>{insightResult.guidance}</Streamdown>
                        </div>
                      </div>
                      <div className="p-10 bg-blue-500/5 rounded-[54px] border border-blue-500/20 font-sans text-white/70 leading-relaxed relative overflow-hidden backdrop-blur-md shadow-[0_4px_30px_rgba(59,130,246,0.05)] text-left">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <Palette size={18} className="animate-pulse" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                              Inspiration Nebula & Creative Frequency
                            </span>
                            <span className="text-[10px] text-white/40 mt-0.5 font-sans">
                              영감의 성좌와 예술적 주파수 분석
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-white/50 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-2.5 mb-4 leading-relaxed font-sans font-medium">
                          ✨ 오늘의 무의식 깊은 곳 창조의 우물 상태와 별들이
                          보내는 예술적 영감의 동기화 상태를 형이상학적으로
                          분석한 결과입니다.
                        </p>
                        <div className="text-base sm:text-lg text-white/90 font-sans leading-relaxed text-left">
                          <Streamdown>{insightResult.cosmicAspect}</Streamdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-8 max-w-md mx-auto text-center">
                    <div className="w-20 h-20 rounded-[28px] bg-blue-900/30 border border-blue-700/20 flex items-center justify-center">
                      <Zap size={40} className="text-blue-500" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-display text-white font-bold tracking-tight uppercase">
                        Energy Analysis
                      </h3>
                      <p className="text-sm text-white/40 font-sans leading-relaxed">
                        "현재 당신의 예술적 주파수와 창조적 감각을 다차원적으로
                        분석합니다. 뮤즈의 영감과 결합하여 오늘의 창작 선언문을
                        발행하세요."
                      </p>
                    </div>
                    <div className="flex flex-col gap-4 w-full">
                      <button
                        onClick={handleEnergyAnalysis}
                        disabled={isMeasuringInsight}
                        className="w-full px-10 py-5 rounded-[32px] bg-blue-800 text-white font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center"
                      >
                        {isMeasuringInsight ? (
                          <RefreshCw className="animate-spin" size={20} />
                        ) : (
                          "분석 시작하기"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (activeMode as any) === "daily_removed" ? (
              <motion.div
                key="daily"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12 pb-32"
              >
                <div className="text-center space-y-4 pt-24">
                  <h3 className="text-5xl font-sans text-white font-bold tracking-tighter">
                    Theme Oracle
                  </h3>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.4em] font-sans">
                    창조의 전령과 예술적 배열
                  </p>
                </div>

                <div className="w-full max-w-6xl mx-auto space-y-8 text-left">
                  <div className="space-y-12">
                    {false ? (
                      <div className="w-full rounded-[40px] bg-violet-950/20 border border-violet-500/10 p-8 md:p-12 text-center space-y-8 relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.03)_0%,transparent_70%)] pointer-events-none" />

                        <div className="space-y-3">
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] font-mono">
                            Creative Card Casting
                          </span>
                          <h4 className="text-2xl font-bold text-white tracking-tight">
                            오늘의 창조적 영감 뮤즈 카드 드로우
                          </h4>
                          <p className="text-xs text-white/50 max-w-lg mx-auto leading-relaxed break-keep">
                            내면에 움트고 있는 독창적 예술 정신을 일깨울 뮤즈
                            카드를 선택합니다. 고도의 영감 필드에 주파수를
                            정렬하고 터치하세요.
                          </p>
                        </div>

                        {/* Mobile: show a readable slice of the 22-card fan and let users swipe through it. */}
                        {isMobile ? (
                          <div className="relative w-full overflow-hidden py-2 my-1">
                            {/* Left & Right Edge Vignette Fades */}
                            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950/90 to-transparent z-20 pointer-events-none" />
                            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950/90 to-transparent z-20 pointer-events-none" />

                            <div
                              ref={cardContainerRef}
                              className="w-full flex items-end overflow-x-auto premium-scroll -space-x-14 py-10 px-[calc(50%-3.5rem)] select-none flex-nowrap scrollbar-none snap-x snap-mandatory font-sans cursor-grab active:cursor-grabbing"
                            >
                              {shuffledMuseCards.map((card, idx) => {
                                const fanOffset =
                                  idx - (shuffledMuseCards.length - 1) / 2;
                                const offset = museOffsets[idx] || {
                                  xOff: 0,
                                  yOff: 0,
                                  rotOff: 0,
                                };
                                return (
                                  <motion.div
                                    key={`muse-dewdrop-mobile-${card.name}`}
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{
                                      y:
                                        Math.abs(fanOffset) * 2.2 +
                                        offset.yOff * 0.4,
                                      opacity: 1,
                                      rotate:
                                        fanOffset * 1.45 + offset.rotOff * 0.4,
                                    }}
                                    transition={{ delay: idx * 0.015 }}
                                    onClick={() => {
                                      if (isDraggingRef.current) return;
                                      try {
                                        const ctx = new (
                                          window.AudioContext ||
                                          (window as any).webkitAudioContext
                                        )();
                                        const osc = ctx.createOscillator();
                                        const gain = ctx.createGain();
                                        osc.connect(gain);
                                        gain.connect(ctx.destination);
                                        osc.type = "triangle";
                                        osc.frequency.setValueAtTime(
                                          261.63 * Math.pow(1.059463, idx),
                                          ctx.currentTime,
                                        );
                                        gain.gain.setValueAtTime(
                                          0.04,
                                          ctx.currentTime,
                                        );
                                        gain.gain.exponentialRampToValueAtTime(
                                          0.001,
                                          ctx.currentTime + 0.5,
                                        );
                                        osc.start();
                                        osc.stop(ctx.currentTime + 0.6);
                                      } catch (e) {}

                                      setSessionCardDrawn(card);
                                    }}
                                    className="w-28 h-44 shrink-0 snap-center snap-always bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 border border-violet-500/30 rounded-2xl shadow-2xl flex items-center justify-center cursor-pointer hover:border-violet-400 hover:-translate-y-4 active:scale-95 group/card relative transition-transform"
                                    style={{ transformOrigin: "bottom center" }}
                                  >
                                    {/* Beautiful patterned icon on back */}
                                    <div className="absolute inset-1.5 border border-violet-500/20 rounded-xl flex flex-col items-center justify-center bg-violet-500/5 group-hover/card:bg-violet-500/10 transition-all shadow-inner">
                                      <div className="w-10 h-10 rounded-full border border-violet-500/20 flex items-center justify-center bg-black/40 shadow-md">
                                        <Music
                                          size={20}
                                          className="text-violet-400 group-hover/card:scale-110 transition-all shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse"
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="relative h-48 w-full flex items-center justify-center select-none overflow-visible py-4 my-2"
                            style={{ perspective: "1000px" }}
                          >
                            {shuffledMuseCards.map((card, idx) => {
                              const total = shuffledMuseCards.length;
                              const progress = idx / (total - 1) - 0.5;
                              const offset = museOffsets[idx] || {
                                xOff: 0,
                                yOff: 0,
                                rotOff: 0,
                              };

                              // Gorgeous, mathematically precise clean fan shape
                              const xOffset = progress * 680 + offset.xOff;
                              // Beautiful parabolic curve (arched downwards at the edges)
                              const yOffset =
                                progress * progress * 160 + offset.yOff;
                              // Elegant rotational angling spreading outwards
                              const rotateZ = progress * 45 + offset.rotOff;
                              const zIndex = Math.round(
                                (0.5 - Math.abs(progress)) * 100,
                              );

                              return (
                                <motion.div
                                  key={`muse-dewdrop-${card.name}`}
                                  initial={{ y: 80, opacity: 0, scale: 0.8 }}
                                  animate={{
                                    x: xOffset,
                                    y: yOffset,
                                    rotateZ: rotateZ,
                                    scale: 1,
                                    opacity: 1,
                                  }}
                                  whileHover={{
                                    y: yOffset - 30,
                                    scale: 1.15,
                                    rotateZ: rotateZ * 0.45,
                                    zIndex: 200,
                                    transition: { duration: 0.15 },
                                  }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 80,
                                    damping: 15,
                                    delay: idx * 0.02,
                                  }}
                                  onClick={() => {
                                    try {
                                      const ctx = new (
                                        window.AudioContext ||
                                        (window as any).webkitAudioContext
                                      )();
                                      const osc = ctx.createOscillator();
                                      const gain = ctx.createGain();
                                      osc.connect(gain);
                                      gain.connect(ctx.destination);
                                      osc.type = "triangle";
                                      osc.frequency.setValueAtTime(
                                        261.63 * Math.pow(1.059463, idx),
                                        ctx.currentTime,
                                      );
                                      gain.gain.setValueAtTime(
                                        0.04,
                                        ctx.currentTime,
                                      );
                                      gain.gain.exponentialRampToValueAtTime(
                                        0.001,
                                        ctx.currentTime + 0.5,
                                      );
                                      osc.start();
                                      osc.stop(ctx.currentTime + 0.6);
                                    } catch (e) {}

                                    setSessionCardDrawn(card);
                                  }}
                                  className="absolute w-18 h-30 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 border border-violet-500/30 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer hover:border-violet-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all active:scale-95 group/card"
                                  style={{
                                    left: "calc(50% - 2.25rem)",
                                    top: "calc(50% - 3.75rem)",
                                    transformOrigin: "bottom center",
                                    zIndex: zIndex,
                                  }}
                                >
                                  <div className="absolute inset-1 border border-violet-500/10 rounded-xl pointer-events-none" />
                                  <div className="absolute inset-1 border border-violet-500/20 rounded-xl flex flex-col items-center justify-center bg-violet-500/5 group-hover/card:bg-violet-500/10 transition-all shadow-inner">
                                    <div className="w-8 h-8 rounded-full border border-violet-500/20 flex items-center justify-center bg-black/40 shadow-md">
                                      <Music
                                        size={14}
                                        className="text-violet-400 group-hover/card:scale-110 transition-all shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse"
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : false ? (
                      <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 max-w-4xl mx-auto py-4">
                        {/* Revealed Card */}
                        <motion.div
                          initial={{ rotateY: 180, scale: 0.9, opacity: 0 }}
                          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                          }}
                          style={{
                            transform: sessionCardDrawn?.isReversed
                              ? "rotateZ(180deg)"
                              : "rotateZ(0deg)",
                          }}
                          className="w-full md:w-56 h-80 rounded-[32px] bg-gradient-to-br from-[#0c1f36] to-[#040911] border-2 border-blue-500/40 relative flex flex-col items-center justify-between p-6 shadow-[0_0_35px_rgba(59,130,246,0.15)] overflow-hidden shrink-0"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
                          <div className="text-[10px] font-mono font-bold text-blue-400/60 uppercase tracking-widest text-center w-full">
                            Inspiration Card
                          </div>

                          <div className="text-5xl my-4 text-blue-400 flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/25">
                            {sessionCardDrawn.emoji}
                          </div>

                          <div className="text-center space-y-2">
                            <h4 className="text-sm font-bold text-white relative z-10">
                              {sessionCardDrawn.name}
                              {sessionCardDrawn.isReversed && (
                                <span className="ml-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-1.5 py-0.5 rounded-full inline-block">
                                  (역방향)
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-blue-300 font-medium tracking-tight bg-blue-950/40 px-3 py-1.5 rounded-full inline-block mt-1">
                              {sessionCardDrawn.keyphrase}
                            </p>
                          </div>

                          <p className="text-[9px] text-white/40 leading-relaxed font-sans mt-2 break-keep text-center">
                            {sessionCardDrawn.desc}
                          </p>
                        </motion.div>

                        {/* Energy level & Comfort check */}
                        <div className="flex-1 rounded-[32px] bg-blue-950/10 border border-blue-500/10 p-6 flex flex-col justify-between space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Sparkles
                                size={16}
                                className="text-blue-400 animate-pulse"
                              />
                              <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest font-mono">
                                Creative Output Alignment
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-white">
                              예술창조 영감 레벨 체크인
                            </h4>
                            <p className="text-[11px] text-white/50 leading-relaxed break-keep">
                              오늘 당신이 지닌 창작 몰입 활성도와 영감의 깊이를
                              선택하십시오. 뮤즈가 오늘의 비전을 그 주사위에
                              얹어 승화시킬 것입니다.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <button
                                  key={lvl}
                                  disabled={sessionLevelCheckedIn}
                                  onClick={() => {
                                    setSessionComfortLevel(lvl);
                                    try {
                                      const ctx = new (
                                        window.AudioContext ||
                                        (window as any).webkitAudioContext
                                      )();
                                      const osc = ctx.createOscillator();
                                      const gain = ctx.createGain();
                                      osc.connect(gain);
                                      gain.connect(ctx.destination);
                                      osc.frequency.setValueAtTime(
                                        290 + lvl * 60,
                                        ctx.currentTime,
                                      );
                                      gain.gain.setValueAtTime(
                                        0.04,
                                        ctx.currentTime,
                                      );
                                      gain.gain.exponentialRampToValueAtTime(
                                        0.001,
                                        ctx.currentTime + 0.3,
                                      );
                                      osc.start();
                                      osc.stop(ctx.currentTime + 0.3);
                                    } catch (e) {}
                                  }}
                                  className={`flex-1 py-3 rounded-2xl border transition-all text-xs font-bold font-mono ${
                                    sessionComfortLevel === lvl
                                      ? "bg-blue-500 border-blue-400 text-black shadow-lg shadow-blue-500/20"
                                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  Lv.${lvl}
                                </button>
                              ))}
                            </div>

                            {!sessionLevelCheckedIn ? (
                              <button
                                onClick={() => {
                                  const dateStr = new Date().toLocaleDateString(
                                    "sv",
                                  );
                                  localStorage.setItem(
                                    `muse_daily_level_${dateStr}`,
                                    String(sessionComfortLevel),
                                  );
                                  localStorage.setItem(
                                    `muse_daily_checked_${dateStr}`,
                                    "true",
                                  );
                                  setSessionLevelCheckedIn(true);
                                }}
                                className="w-full py-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold text-xs transition-all hover:bg-blue-500/20 shadow-xl"
                              >
                                창작 정서 영감 수준 반영하기
                              </button>
                            ) : (
                              <div className="py-2.5 px-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-bold font-sans text-center">
                                ✓ 오늘의 예술 충전도가 창작 영감 주파수 피조
                                필터 깊숙이 편입되었습니다.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8 opacity-100">
                      {false ? (
                        <div className="p-8 rounded-[40px] text-center border-2 border-dashed border-white/10 bg-white/[0.01] text-white/30 text-xs">
                          위 오늘의 예술 창조 융합 카드를 먼저 드로우하여 영감
                          오라클 주파수를 정렬한 다음 비전을 확인하세요.
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{
                            scale: 1.02,
                            translateY: -8,
                            boxShadow: "0 20px 40px rgba(30, 64, 175, 0.1)",
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDailyOracle()}
                          disabled={isDailyOracleLoading}
                          className="w-full glass p-12 rounded-[80px] border border-blue-700/30 flex flex-col items-center justify-center text-center relative group overflow-hidden cursor-pointer min-h-[450px] shadow-2xl"
                        >
                          <div className="absolute inset-0 bg-blue-900/[0.02] pointer-events-none group-hover:bg-blue-800/[0.05] transition-colors" />
                          <div className="w-40 h-40 rounded-full bg-blue-900/10 border border-blue-700/10 flex items-center justify-center mb-8 relative">
                            <div
                              className={`absolute inset-0 bg-blue-700/10 blur-2xl rounded-full ${isDailyOracleLoading ? "animate-ping" : "animate-pulse"}`}
                            />
                            <LucideStars
                              size={64}
                              className={`text-blue-400 relative z-10 ${isDailyOracleLoading ? "animate-spin" : ""}`}
                            />
                          </div>
                          <h3 className="text-3xl font-display text-white mb-4 tracking-tighter">
                            Daily Muse Vision
                          </h3>
                          <p className="text-sm text-white/40 font-sans leading-relaxed max-w-sm mx-auto">
                            {isDailyOracleLoading
                              ? "영감의 채널을 여는 중입니다..."
                              : "오늘의 예술적 우주는 당신에게 어떤 주파수를 보내고 있을까요? 오라클 비전을 통해 확인하세요."}
                          </p>
                        </motion.button>
                      )}

                      <AnimatePresence>
                        {dailyResult && (
                          <button
                            onClick={() => setShowDailyModal(true)}
                            className="w-full mt-4 py-3 rounded-2xl bg-blue-900/20 hover:bg-blue-900/30 text-blue-300 border border-blue-700/20 text-xs font-bold transition-all flex items-center justify-center gap-2 font-sans cursor-pointer"
                          >
                            오라클 비전 새창으로 열기 <Sparkles size={12} />
                          </button>
                        )}
                        {false && dailyResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="p-10 rounded-[50px] glass border border-blue-700/30 shadow-2xl text-left relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                              <Sparkles size={60} className="text-blue-400" />
                            </div>
                            <div className="flex items-center gap-3 mb-6">
                              <Sparkles size={20} className="text-blue-400" />
                              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest font-sans">
                                Revelation
                              </span>
                            </div>
                            <div className="space-y-6">
                              <div className="text-base sm:text-lg text-white/90 font-sans leading-relaxed [&>h3]:text-blue-300 [&>h3]:text-xl [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>p]:mb-4">
                                <Streamdown>{dailyResult.diagnosis}</Streamdown>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                      <div className="glass p-8 rounded-[40px] border border-blue-700/20 space-y-6 text-left">
                        <h4 className="text-sm font-bold text-blue-400 font-sans flex items-center gap-2">
                          <Wind size={16} /> Daily Remedy
                        </h4>
                        <p className="text-sm text-blue-100/70 leading-relaxed font-sans">
                          {dailyResult
                            ? dailyResult.remedy
                            : "뮤즈 비전을 통해 오늘 하루 예술적 영감을 빛낼 최적의 액션을 받아보세요."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeMode === "history" ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12 pb-32"
              >
                <div className="glass p-10 rounded-[60px] border border-blue-700/20 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-700/20">
                        <Library size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-display text-white">
                          Oracle Library
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="mb-8">
                      <CalendarView
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        highlightDates={(sharedState?.museHistory || []).map(
                          (h: any) =>
                            new Date(h.timestamp || h.createdAt || Date.now()),
                        )}
                        color={"#3b82f6"}
                      />
                    </div>
                    {/* Category Filter */}
                    {(sharedState?.museHistory || []).length > 0 &&
                      Array.from(
                        new Set(
                          (sharedState?.museHistory || []).map(
                            (h: any) => h.type || "RECORD",
                          ),
                        ),
                      ).length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          <button
                            onClick={() => setCategoryFilter("all")}
                            className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${categoryFilter === "all" ? "bg-blue-900/30 text-blue-400 border border-blue-700/30" : "bg-white/5 text-white/20 border border-white/5 hover:text-white/40"}`}
                          >
                            All Categories
                          </button>
                          {Array.from(
                            new Set(
                              (sharedState?.museHistory || []).map(
                                (h: any) => h.type || "RECORD",
                              ),
                            ),
                          ).map((cat: any) => (
                            <button
                              key={cat}
                              onClick={() => setCategoryFilter(cat)}
                              className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${categoryFilter === cat ? "bg-blue-900/30 text-blue-400 border border-blue-700/30" : "bg-white/5 text-white/20 border border-white/5 hover:text-white/40"}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}

                    {(sharedState?.museHistory || []).filter(
                      (h: any) =>
                        (!selectedDate ||
                          new Date(
                            h.timestamp || h.createdAt || Date.now(),
                          ).toDateString() === selectedDate.toDateString()) &&
                        (categoryFilter === "all" ||
                          (h.type || "RECORD") === categoryFilter),
                    ).length > 0 ? (
                      (sharedState?.museHistory || [])
                        .filter(
                          (h: any) =>
                            (!selectedDate ||
                              new Date(
                                h.timestamp || h.createdAt || Date.now(),
                              ).toDateString() ===
                                selectedDate.toDateString()) &&
                            (categoryFilter === "all" ||
                              (h.type || "RECORD") === categoryFilter),
                        )
                        .map((h: any, i: number) => (
                          <div
                            key={i}
                            className="p-6 rounded-3xl glass border border-white/10 hover:border-blue-400/40 shadow-2xl hover:bg-white/[0.08] transition-all text-left"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                {h.type || "RECORD"}
                              </span>
                              <span className="text-[10px] text-white/20 font-mono ">
                                {new Date(
                                  h.timestamp || h.createdAt || Date.now(),
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-white/70 font-sans">
                              "{h.content || "분석 데이터"}"
                            </p>
                          </div>
                        ))
                    ) : (
                      <p className="text-center text-white/20  py-20">
                        아직 기록된 영감이 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : activeMode === "bible" ? (
              <motion.div
                key="bible"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 md:space-y-12 pb-24 md:pb-32 pt-8 md:pt-16"
              >
                <div className="space-y-10">
                  <ArtistWayBible onConsult={handleConsultation} />
                </div>
              </motion.div>
            ) : activeMode === "simple" ? (
              <motion.div
                key="simple"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center pt-24 pb-40"
              >
                <div className="w-full max-w-2xl glass p-5 md:p-12 rounded-[28px] md:rounded-[64px] border border-blue-500/30 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full scale-110 group-hover:scale-125 transition-transform" />
                  <div className="relative z-10 space-y-6 md:space-y-12 text-white">
                    <div className="flex flex-col items-center gap-4 md:gap-6 text-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[32px] bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-2xl animate-pulse">
                        <Sparkles size={32} className="md:w-10 md:h-10" />
                      </div>
                      <h3 className="text-2xl md:text-5xl font-sans text-white font-bold tracking-tighter text-center">
                        Flux Consultation
                      </h3>
                      <p className="text-[10px] md:text-sm text-blue-500/60 uppercase tracking-[0.25em] md:tracking-[0.4em] font-sans font-black text-center">
                        예술적 영감을 깨우는 찰나의 대화
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        "오늘의 창의적 에너지를 일깨우는 질문은?",
                        "지금 내 작품에서 가장 보완해야 할 점은?",
                        "생각이 막혔을 때 한 단계 도약하기 위한 방법",
                        "일상에서 얻을 수 있는 뜻밖의 영감 찾기",
                        "내면의 창작 욕구를 깨우는 오늘의 한 마디",
                        "나만의 예술적 고유성을 발견하기 위한 조언",
                        "창작의 고통을 긍정적인 에너지로 바꾸는 마인드셋",
                        "어떤 곡을 만들어야 할지 모를 때 던지는 첫 질문",
                        "비슷한 스타일에서 벗어나 새로운 시도를 위한 힌트",
                        "내 작품의 감정을 청중에게 더 깊이 전달하는 법",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => handleConsultation(q)}
                          className="px-6 py-6 rounded-[28px] bg-white/5 hover:bg-white/15 border border-white/10 transition-all text-sm sm:text-base text-left text-white/80 hover:text-white flex items-start justify-between gap-3 group/btn font-sans font-bold shadow-xl backdrop-blur-md"
                        >
                          <span className="leading-tight">"{q}"</span>
                          <ChevronRight
                            size={20}
                            className="mt-0.5 shrink-0 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-3 group-hover/btn:translate-x-0 text-blue-400"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeMode === 'artRecommendation' ? (
              <motion.div
                key="artRecommendation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center pt-8 pb-24 w-full max-w-3xl mx-auto"
              >
                <ArtRecommendationView />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      <DailyOracleLoadingOverlay isLoading={isDailyOracleLoading} theme="blue" />
      <NoticeModal
        isOpen={notice.open}
        onClose={() => setNotice((p) => ({ ...p, open: false }))}
        title={notice.title}
        message={notice.message}
      />

      <AnimatePresence>
        {showDailyModal && dailyResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/95 sm:bg-black/85 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowDailyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-[#0c0c12] border border-blue-500/30 p-5 sm:p-8 md:p-12 text-left flex flex-col gap-6 overflow-y-auto rounded-[28px] sm:rounded-[42px] shadow-2xl relative z-10 font-sans pointer-events-auto text-white no-scrollbar"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />

              <div className="flex flex-wrap items-end justify-between gap-6 relative z-10 border-b border-blue-500/10 pb-8">
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 font-bold uppercase tracking-widest">
                      일일 진단 완료
                    </div>
                    <span className="text-xs text-blue-100/30 font-mono">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-2xl md:text-3xl font-bold font-sans text-white leading-tight">
                    Daily Muse Vision
                  </h4>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <TTSButton
                    text={dailyResult.diagnosis}
                    voice="Kore"
                    className="text-blue-400 border-blue-500/20"
                  />
                  <button
                    onClick={() => setShowDailyModal(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-all shrink-0 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="text-white/90 font-sans text-sm md:text-base leading-relaxed text-left z-10 relative">
                <Streamdown>{dailyResult.diagnosis}</Streamdown>
              </div>

              <DailyBgmSection
                appId="muse"
                dailyResult={dailyResult}
                onPersist={(patch) => setDailyResult((prev: any) => (prev ? { ...prev, ...patch } : prev))}
                accentClass="text-blue-300"
                borderClass="border-blue-500/30"
                buttonClass="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-300"
                iconClass="text-blue-400"
              />

              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-blue-500/10 text-left">
                {Object.entries({
                  Remedy: dailyResult.remedy,
                }).map(([k, v]) => (
                  <div
                    key={k}
                    className="p-4 rounded-3xl bg-white/5 border border-blue-500/20 backdrop-blur-md col-span-2"
                  >
                    <p className="text-[9px] text-blue-400/60 uppercase tracking-widest font-bold mb-2">
                      {k}
                    </p>
                    <p className="text-sm text-white font-sans leading-relaxed">
                      {String(v)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0 relative z-20 mt-4 font-sans">
                <button
                  type="button"
                  onClick={handleOracleDeepInsight}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
                >
                  Deep Insight <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => { markOracleModalSeen("muse"); setShowDailyModal(false); }}
                  className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95 duration-200 cursor-pointer"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creative Soul Modal */}
      <AnimatePresence>
        {showSoulModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/95 sm:bg-black/85 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowSoulModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-[#0c0c12] border border-blue-500/30 p-5 sm:p-8 md:p-12 text-left flex flex-col gap-6 overflow-y-auto rounded-[28px] sm:rounded-[42px] shadow-2xl relative z-10 no-scrollbar select-none text-white font-sans pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />

              <div className="flex items-center justify-between border-b border-blue-500/10 pb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <Zap size={22} className="text-blue-400 animate-pulse" />
                  <span className="text-xs font-bold text-blue-500 tracking-[0.4em] uppercase font-sans">
                    The Artist Decree
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isMeasuringInsight && insightResult && (
                    <TTSButton
                      text={insightResult.guidance}
                      voice="Kore"
                      className="text-blue-400 border-blue-500/20"
                    />
                  )}
                  <button
                    onClick={() => setShowSoulModal(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-all shrink-0 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {isMeasuringInsight && !insightResult ? (
                <div className="flex flex-col items-center justify-center py-20 relative z-10">
                  <RefreshCw size={48} className="text-blue-400 animate-spin" />
                  <p className="mt-6 text-sm text-blue-400 font-bold uppercase tracking-widest animate-pulse">
                    Analyzing Energy Frequency...
                  </p>
                </div>
              ) : insightResult ? (
                <div className="space-y-6 relative z-10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBar
                      label="Creativity"
                      value={insightResult.luckScore || 0}
                      color="#3b82f6"
                    />
                    <StatBar
                      label="Emotion"
                      value={insightResult.loveScore || 0}
                      color="#f472b6"
                    />
                    <StatBar
                      label="Vision"
                      value={insightResult.wealthScore || 0}
                      color="#4ade80"
                    />
                    <StatBar
                      label="Focus"
                      value={insightResult.healthScore || 0}
                      color="#60a5fa"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans font-medium uppercase tracking-tight">
                    {[
                      {
                        label: "동기화 상태",
                        v: translateEnglishValue(
                          insightResult.deepSyncLevel || "OPTIMAL",
                        ),
                        c: "text-blue-400",
                      },
                      {
                        label: "파워 아이템",
                        v: translateEnglishValue(insightResult.luckyItem),
                        c: "text-blue-300",
                      },
                      {
                        label: "집중 색상",
                        v: translateEnglishValue(insightResult.luckyColor),
                        c: "text-blue-200",
                      },
                    ].map((i, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col items-center justify-center"
                      >
                        <span className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-sans font-bold">
                          {i.label}
                        </span>
                        <span
                          className={`text-sm text-center font-bold ${i.c}`}
                        >
                          {i.v}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="p-6 bg-blue-900/10 border border-blue-700/20 rounded-[28px] shadow-inner font-sans">
                      <div className="flex items-center gap-3 mb-3">
                        <Sparkles
                          size={16}
                          className="text-blue-400 animate-pulse"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">
                            Master's Guidance
                          </span>
                          <span className="text-[9px] text-white/40 font-sans mt-1 leading-none">
                            오늘 하루의 구체적 행동 지침과 따뜻한 심리 멘토링
                            조언입니다.
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-white/90 font-sans leading-relaxed text-left [&>h3]:text-blue-300 [&>h3]:text-xl [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>p]:mb-4">
                        <Streamdown>{insightResult.guidance}</Streamdown>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-500/5 rounded-[28px] border border-blue-500/20 font-sans text-white/70 leading-relaxed relative overflow-hidden backdrop-blur-md shadow-[0_4px_30px_rgba(59,130,246,0.05)] text-left">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          <Palette size={14} className="animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">
                            Inspiration Nebula & Creative Frequency
                          </span>
                          <span className="text-[9px] text-white/40 mt-0.5 font-sans leading-none">
                            영감의 성좌와 예술적 주파수 분석
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/50 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 mb-3 leading-relaxed font-sans font-medium">
                        ✨ 오늘의 무의식 깊은 곳 창조의 우물 상태와 별들이
                        보내는 예술적 영감의 동기화 상태를 형이상학적으로
                        진단합니다.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NoticeModal
        isOpen={notice.open}
        onClose={() => setNotice((p) => ({ ...p, open: false }))}
        title={notice.title}
        message={notice.message}
      />

      {/* Creative Resonance Attunement Modal */}
      <AnimatePresence>
        {isResonanceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={resonanceModalOverlayClass}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`${resonanceModalPanelClass} bg-[#0c0c12] border border-blue-500/30`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cobalt dynamic background glows */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -ml-32 -mb-32 rounded-full pointer-events-none" />

              {resonanceProgress < 100 ? (
                // Loading Diagnostic Sequence
                <div className="space-y-10 py-12 relative z-10">
                  <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 border-[3px] border-blue-500/10 rounded-full" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 border-[3px] border-t-blue-400 border-r-indigo-500 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_35px_rgba(30,64,175,0.5)]"
                    >
                      <Zap size={28} className="text-white fill-white/20" />
                    </motion.div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-xl md:text-2xl font-bold tracking-widest text-blue-400 font-sans uppercase">
                      오늘 상태 분석 중
                    </h2>
                    <p className="text-xs text-white/40 font-mono tracking-widest leading-relaxed">
                      SCANNING CREATIVE CHANNELS FOR ARTISTIC FLOWS...
                    </p>
                  </div>

                  <div className="w-full max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-mono text-blue-300">
                      <span>동기화 중</span>
                      <span className="font-bold">{resonanceProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                        style={{ width: `${resonanceProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-white/30 font-mono tracking-widest flex flex-col gap-1 uppercase">
                    <span>• PARAMETER AUDIT: Creative Synapse Syncing</span>
                    <span>
                      • RESONATING AGENT: 432Hz/540Hz Geometric chords
                    </span>
                  </div>
                </div>
              ) : (
                // Attunement Report Screen (Perfect structured layout)
                <div className="space-y-8 text-left relative z-10 pt-4 pb-2 min-w-0">
                  <div className="flex items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(30,64,175,0.15)] shrink-0 animate-pulse">
                      <Sparkles size={26} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-400/80 font-mono">
                        Biometric Muse Coherence Sheet
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white/95 uppercase font-sans mt-0.5 break-words leading-snug">
                        뮤즈 예술적 공명 정렬도
                      </h2>
                    </div>
                  </div>

                  {/* Coherence rating meter and Live metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white/[0.02] border border-white/5 rounded-[32px] p-6 backdrop-blur-sm">
                    {/* Coherence radial */}
                    <div className="md:col-span-5 text-center flex flex-col items-center">
                      <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-4 font-mono">
                        Inspiration Coherence
                      </span>
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="56"
                            cy="56"
                            r="48"
                            className="stroke-white/5 fill-transparent"
                            strokeWidth="6"
                          />
                          <motion.circle
                            cx="56"
                            cy="56"
                            r="48"
                            className="stroke-blue-400 fill-transparent shadow-lg"
                            strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 48}
                            initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                            animate={{
                              strokeDashoffset:
                                2 *
                                Math.PI *
                                48 *
                                (1 - (resonanceData?.coherence ?? 85) / 100),
                            }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-mono font-bold text-blue-300">
                            {resonanceData?.coherence}%
                          </span>
                          <span className="text-[9px] text-white/30 tracking-widest font-mono">
                            FLOW RATE
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Param bars */}
                    <div className="md:col-span-7 space-y-3 w-full border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-white/50">
                          <span>창작 정체 & 피로 부하 (Fatigue)</span>
                          <span className="text-white/80">
                            {sharedState?.healthMetrics?.fatigue ?? 20}/100
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                            style={{
                              width: `${sharedState?.healthMetrics?.fatigue ?? 20}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-white/50">
                          <span>뇌 피로 & 스트레스 지수 (Stress)</span>
                          <span className="text-white/80">
                            {sharedState?.healthMetrics?.stressLevel ?? 30}/100
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                            style={{
                              width: `${sharedState?.healthMetrics?.stressLevel ?? 30}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-white/50">
                          <span>몰입 & 집중 시간 (Focus Time)</span>
                          <span className="text-white/80">
                            {sharedState?.productivityMetrics?.focusTime ?? 40}
                            /100
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                            style={{
                              width: `${sharedState?.productivityMetrics?.focusTime ?? 40}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spectral frequency definition and Shield Token */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">
                        Tuned Inspiration Band
                      </span>
                      <p className="text-sm font-bold text-blue-400 font-sans leading-relaxed break-words">
                        {resonanceData?.bandText}
                      </p>
                      <p className="text-xs text-white/60 font-sans leading-relaxed break-words">
                        {resonanceData?.freqText}
                      </p>
                    </div>

                    <ResonanceShieldCard
                      badge="MUSE CREATIVE COHERENCE SHIELD"
                      token={resonanceData?.shieldToken || ""}
                      gradientClass="from-blue-500/10 via-indigo-500/5 to-transparent"
                      borderClass="border-blue-500/30"
                      accentBarClass="bg-blue-500"
                      badgeClass="text-blue-400/80"
                      iconClass="text-blue-400"
                      Icon={ShieldCheck}
                    />
                  </div>

                  {/* Merged Soul Resonance Alignment Stats */}
                  <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[32px] space-y-6 relative min-w-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-blue-400 shrink-0" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono break-words">
                        나의 상태
                      </span>
                    </div>

                    <ResonanceStatBarGrid>
                      <StatBar label="Creativity" value={resonanceData?.luckScore ?? 85} color="#0ea5e9" />
                      <StatBar label="Passion" value={resonanceData?.loveScore ?? 90} color="#f43f5e" />
                      <StatBar label="Focus" value={resonanceData?.wealthScore ?? 75} color="#10b981" />
                      <StatBar label="Vitality" value={resonanceData?.healthScore ?? 80} color="#f59e0b" />
                    </ResonanceStatBarGrid>

                    <ResonancePillGrid
                      pills={[
                        { label: "동기화", value: resonanceData?.deepSyncLevel || "OPTIMAL", valueClassName: "text-blue-400" },
                        { label: "파워 아이템", value: resonanceData?.luckyItem || "온화한 촛불", valueClassName: "text-blue-300" },
                        { label: "집중 색상", value: resonanceData?.luckyColor || "Deep Blue", valueClassName: "text-indigo-400" },
                      ]}
                    />

                    {resonanceData?.guidance && (
                      <ResonanceNoteCard label="오늘 할 일" labelClassName="text-blue-400">
                        {resonanceData.guidance}
                      </ResonanceNoteCard>
                    )}

                    {resonanceData?.cosmicAspect && (
                      <ResonanceNoteCard label="⚡ ALCHEMY ANALYSIS (풍요 및 성취 패턴)" labelClassName="text-[#60a5fa]">
                        {resonanceData.cosmicAspect}
                      </ResonanceNoteCard>
                    )}
                  </div>

                  {/* Prescription */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">
                      Derived Inspiration Prescription
                    </span>
                    <p className="text-xs md:text-sm text-white/80 font-sans leading-relaxed break-words">
                      {resonanceData?.prescription}
                    </p>
                  </div>

                  {/* Immediate Action Advice */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1 text-left">
                    <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block font-mono">
                      ★ 뮤즈 예술적 가이드 조치 (Creative Action)
                    </span>
                    <p className="text-xs text-white/90 font-sans font-medium leading-relaxed break-words">
                      {resonanceData?.advice}
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <ResonanceTTSButton
                      data={resonanceData}
                      app="muse"
                      className="border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                    />
                    <button
                      onClick={() => setIsResonanceModalOpen(false)}
                      className="flex-1 py-4.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest hover:text-white shadow-[0_0_30px_rgba(30,64,175,0.25)] active:scale-95 transition-all text-xs md:text-sm cursor-pointer select-none text-center"
                    >
                      공명 완료
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmblemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 sm:bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans select-none pointer-events-auto"
            onClick={() => setShowEmblemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-[#0c0c12] border border-blue-500/30 p-6 sm:p-10 text-center flex flex-col gap-6 overflow-y-auto rounded-[28px] sm:rounded-[42px] shadow-2xl relative z-10 no-scrollbar select-none text-white font-sans overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />

              <button
                onClick={() => setShowEmblemModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all cursor-pointer z-50 unique-close-btn"
              >
                <X size={18} />
              </button>

              <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <Music className="text-blue-400 animate-pulse" size={40} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-sans text-white tracking-tight uppercase">
                  Muse Sanctuary Lore
                </h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.3em]">
                  예술적 직관 가이드
                </p>
              </div>

              <p className="text-sm text-blue-100/70 leading-relaxed font-sans text-left break-keep bg-white/5 p-6 rounded-3xl border border-blue-500/10">
                <strong>MUSE</strong>는 예술적 직관과 감성을 극대화하기 위해
                창조된 영감의 안내 정원입니다. 내면의 무의식적 예술 자아를
                깨우고 완벽주의의 장벽을 허물어 번뜩이는 아이디어를 하나의
                아름다운 주파수와 실질적인 기획서로 응축해 낼 수 있도록
                돕습니다.
              </p>

              <div className="space-y-4">
                {[
                  {
                    label: "Creative Intuition Coherence",
                    val: 95,
                    color: "from-blue-400 to-indigo-500",
                  },
                  {
                    label: "Inspirational Wave Flow",
                    val: 90,
                    color: "from-indigo-400 to-purple-400",
                  },
                  {
                    label: "Artistic Alchemy Density",
                    val: 93,
                    color: "from-blue-500 to-sky-600",
                  },
                ].map((spec) => (
                  <div key={spec.label} className="space-y-1 text-left">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/60">{spec.label}</span>
                      <span className="text-blue-400 font-bold">
                        {spec.val}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: spec.val + "%" }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className={"h-full bg-gradient-to-r " + spec.color}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowEmblemModal(false)}
                className="w-full py-4 rounded-[20px] bg-blue-600 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs cursor-pointer"
              >
                Sync Complete 🌀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeMode === 'roleModel' && (
        <RoleModelModal
          isOpen
          onClose={() => setActiveMode('landing')}
          isInline={false}
        />
      )}
    </div>
  );
}
