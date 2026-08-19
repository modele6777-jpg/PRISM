import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, TreeDeciduous, Send, BookHeart, RefreshCw, Volume2, VolumeX,
  History, Copy, Check, X, Clock, Sparkles, Heart, Mic, MicOff, Image as ImageIcon,
  ShieldCheck, Lock,
  Camera, Plus, Trash2, Headphones, TrendingUp, Music, Bird, Brain, Home, Wind, Settings, Sprout, ChevronRight, Activity, Zap, MessageCircle, LayoutGrid, Eye, Palette, FlaskConical, Calendar, Library, User, Layout, BookOpen, Star, Stars as LucideStars, BarChart2, Search,
  ChevronDown, Coins, Sun, KeyRound,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useApp } from '../contexts/AppContext';
import { trpc } from '../lib/trpc';
import { auth, db, collection, addDoc, query, orderBy, onSnapshot, Timestamp, serverTimestamp, getDocs, limit, doc, getDoc, setDoc } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { invokeLLM, invokeLLMStream, invokeLLMStructured, PERSONAS, textToSpeech, poeQuickInsight, buildDeepSynapseContext, ResonanceSchema, ensureResonanceResult, isBrokenResonanceResult, isResonanceForApp, stampResonanceApp } from '../lib/ai';
import { shuffleCardDeck, quantumSeedShuffle } from '@/lib/cardShuffle';
import { z } from 'zod';
import { Streamdown } from '@/components/Streamdown';
import { TTSButton } from '@/components/TTSButton';
import { ResonanceTTSButton } from '@/components/ResonanceTTSButton';
import {
  ResonanceNoteCard,
  ResonancePillGrid,
  ResonanceShieldCard,
  ResonanceStatBarGrid,
  resonanceModalOverlayClass,
  resonanceModalPanelClass,
} from '@/components/resonance/ResonanceResultSections';
import { AnimatedText } from '@/components/AnimatedText';
import { StatusBarDashboard } from '@/components/StatusBarDashboard';
import { SoulFrequencyChart, EmotionDistribution } from '@/components/SoulCharts';
import { CalendarView } from '@/components/CalendarView';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import NoticeModal from '@/components/NoticeModal';

import imageCompression from 'browser-image-compression';
import { SecretBible } from '@/components/orange/SecretBible';
import { recordPrismFeature, recordDailyOracleResult } from '@/lib/prismOmniSync';
import { DailySecret } from '@/components/orange/DailySecret';
import { PictureDiaryModal } from '@/components/orange/PictureDiaryModal';
import { SpecialFeatureFabGroup, SpecialFeatureButton, ChatFabButton } from '@/components/SpecialFeatureFab';
import {
  SPECIAL_FEATURE_CHROME_HIDDEN_CLASS,
  useSpecialFeatureChromeHidden,
} from '@/components/SpecialFeaturePanel';
import { playTTS, playConversation, stopTTS, useTTSActive } from '@/utils/tts';

import { playBinauralBeat, stopBinauralBeat, getActiveBinauralTrackId, getBinauralBeatsForApp, saveCustomBinauralBeat, deleteCustomBinauralBeat, buildRecommendedBinauralName, BinauralBeatConfig } from '@/lib/binaural';
import { useBinauralSync } from '@/hooks/useBinauralSync';
import { BinauralRandomPlayControl } from '@/components/BinauralRandomPlayControl';
import { getTodayDateKey, markResonanceModalSeen } from '@/lib/dailyCache';
import { dailyFocusPlaylistSchema } from '@/lib/dailyBgm';
import { DailyBgmSection } from '@/components/shared/DailyBgmSection';
import { buildResonanceSyncPrompt } from '@/lib/copyTone';
import { useDailyResonanceAutoRun } from '@/hooks/useDailyAutoRun';
import { usePictureDiaryAutoRun } from '@/hooks/usePictureDiaryAutoRun';
import { notifyOrangeChatSaved } from '@/lib/pictureDiary';
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange';
import { resetAppScroll } from '@/utils/scrollToTop';
import { parseSuggestions, SUGGESTIONS_SYSTEM_SUFFIX } from '@/utils/suggestions';

const THEME_COLOR = 'oklch(0.72 0.18 55)';
const BG = 'oklch(0.10 0.02 55)';



const SUGGESTIONS = [
  '오늘 너무 힘들었어요', '아무도 나를 이해 못 해요', '미래가 불안해요',
  '자존감이 낮아졌어요', '관계가 어려워요', '그냥 우울해요',
  '화가 나는 걸 참을 수 없어요', '잠을 못 자고 있어요',
  '좋은 일이 생겼어요', '나를 사랑하고 싶어요',
];

const cleanOrangeChatText = (text: string) => text
  .replace(/\[EMOTION:\s*[^\]]*\]/gi, '')
  .replace(/\[EMOTION:[\s\S]*?$/, '')
  .replace(/\[SUGGESTIONS:.*?\]/g, '')
  .replace(/\[SOUL_UPDATE:[\s\S]*$/, '')
  .trim();

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  emotion?: string;
  image?: string;
  timestamp?: number;
}

interface DiaryEntry {
  id: string;
  date: string;
  summary: string;
  emotion: string;
  content: string;
  imageUrl?: string;
  type?: string;
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/10 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.9, y: 20 }} 
            className="w-full max-w-lg glass border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-widest text-white/60 uppercase">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-colors">
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

function OrangeHistoryModal({ isOpen, onClose, entries, onSelect }: { isOpen: boolean; onClose: () => void; entries: DiaryEntry[]; onSelect: (entry: DiaryEntry) => void }) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (!selectedDate) return true;
      const d = new Date((entry as any).createdAt?.toMillis?.() || entry.date);
      return d.getDate() === selectedDate.getDate() &&
             d.getMonth() === selectedDate.getMonth() &&
             d.getFullYear() === selectedDate.getFullYear();
    });
  }, [entries, selectedDate]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="The Oracle Archive">
      <div className="space-y-6 text-left">
        <CalendarView 
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          highlightDates={entries.map(e => new Date((e as any).createdAt?.toMillis?.() || e.date))}
          color={THEME_COLOR}
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
              {selectedDate ? `${selectedDate.toLocaleDateString()} 기록` : '최근 영감 기록'}
            </h4>
          </div>
          
          {filteredEntries.length === 0 ? (
            <p className="border border-dashed border-white/10 rounded-2xl p-8 text-center text-white/20 text-xs  font-sans">
              {selectedDate ? "이 날짜의 기록이 없습니다." : "아직 새겨진 역사가 없습니다."}
            </p>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} onClick={() => onSelect(entry)} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition-all cursor-pointer">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-lg uppercase tracking-widest">
                    {entry.type || 'IDEA'}
                  </span>
                  <span className="text-[9px] text-white/20 font-mono ">{entry.date}</span>
                </div>
                <h5 className="text-[11px] font-bold text-white/60 truncate tracking-wide mb-1">{entry.summary}</h5>
                <p className="text-[10px] text-white/40 font-sans line-clamp-2 ">{entry.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

const EnergyAnalysisSchema = z.object({
  luckScore: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v),
  loveScore: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v),
  wealthScore: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v),
  healthScore: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v),
  luckyColor: z.string().optional(),
  luckyNumber: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
  luckyItem: z.string().optional(),
  cosmicAspect: z.string().optional(),
  deepSyncLevel: z.string().optional(),
  guidance: z.string()
});

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="w-full min-w-0">
      <div className="flex justify-between gap-2 text-[10px] mb-1">
        <span className="text-white/40 uppercase tracking-widest min-w-0 break-words">{label}</span>
        <span style={{ color }} className="font-bold shrink-0">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ background: color }} />
      </div>
    </div>
  );
}

const QuickInsightSchema = z.object({
  diagnosis: z.string(),
  luckyNumber: z.union([z.string(), z.number()]).transform(v => String(v)),
  luckyColor: z.string(),
  remedy: z.string(),
  symbol: z.string(),
  frequency: z.union([z.string(), z.number()]).transform(v => String(v)),
  focusPlaylist: dailyFocusPlaylistSchema,
});

const translateEnglishValue = (val: string) => {
  if (!val) return '';
  const dict: Record<string, string> = {
    'cyan blue': '청청색 (시안 블루)',
    'blue feather': '푸른 깃털',
    'optimal': '최적 지향 (OPTIMAL)',
    'blue': '푸른색',
    'cyan': '시안 청록색',
    'sky blue': '하늘색',
    'crystal': '투명 정수정 원광 (크리스탈)',
    'feather': '푸른 깃털',
    'sapphire': '블루 사파이어',
    'aquamarine': '해람석 (아쿠아마린)',
    'silver': '은빛 보주',
    'water': '심청 정화수',
    'mirror': '성운 거울',
    'indigo': '남색 (인디고)',
    'red': '붉은 적색',
    'orange': '오렌지 주황색',
    'yellow': '황금 노란색',
    'green': '초록 녹색',
    'purple': '보랏빛 자색',
    'pink': '분홍빛 홍색',
    'violet': '제비꽃색',
    'gold': '황금색',
    'white': '순백색',
    'black': '칠흑색',
    'magenta': '진홍색 (마젠타)',
    'stable': '안정화 상태',
    'high': '고공 공명',
    'resonance': '공명 상태',
    'amethyst': '자수정',
    'ruby': '루비',
    'emerald': '에메랄드',
    'diamond': '다이아몬드',
    'obsidian': '흑요석 (옵시디언)',
    'stone': '에너지 원석',
    'ring': '공명 반지',
    'bell': '정화 청동종',
    'candle': '아로마 촛불',
    'incense': '치유 인센스 스ティック',
    'potion': '에너지 비약',
    'scroll': '고대 성서 레시피',
    'key': '통합의 열쇠',
    'emerald green': '에메랄드 녹색',
    'ruby red': '루비 적색'
  };
  const lower = val.toLowerCase().trim();
  if (lower.endsWith('.')) {
    const withoutDot = lower.slice(0, -1).trim();
    if (dict[withoutDot]) return dict[withoutDot];
  }
  if (dict[lower]) return dict[lower];
  return val;
};

export default function OrangeApp() {
  const [, navigate] = useLocation();
  const isTTSActive = useTTSActive();
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const { firebaseUser, sharedState, updateSharedState, isChatOpen, setIsChatOpen, sendUnifiedMessage, openLucyChat } = useApp();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const [isMeasuringInsight, setIsMeasuringInsight] = useState(false);
  const [isDailyOracleLoading, setIsDailyOracleLoading] = useState(false);

  // States for creative center icon diagnostics (Quantum Resonance Sync)
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
  const [showEmblemModal, setShowEmblemModal] = useState(false);
  const [limitModalInfo, setLimitModalInfo] = useState<{ open: boolean; type: 'daily' | 'soul'; dapp: string } | null>(null);

  const handleResonanceSync = async (opts?: { silent?: boolean; auto?: boolean }) => {
    const todayStr = getTodayDateKey();
    const cachedDate = localStorage.getItem('resonance_orange_last_date');
    const cachedDataStr = localStorage.getItem('resonance_orange_last_data');

    if (cachedDate === todayStr && cachedDataStr) {
      try {
        const cachedData = JSON.parse(cachedDataStr);
        if (!isBrokenResonanceResult(cachedData) && isResonanceForApp(cachedData, 'orange')) {
          setResonanceData(cachedData);
          setIsResonanceLoading(false);
          if (!opts?.silent) {
            setIsResonanceModalOpen(true);
            setResonanceProgress(100);
            if (opts?.auto && firebaseUser?.uid) {
              markResonanceModalSeen('orange', firebaseUser.uid);
            }
          }
          return;
        }
        localStorage.removeItem('resonance_orange_last_data');
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
    
    // Smooth progress simulation
    const interval = setInterval(() => {
      setResonanceProgress(p => {
        if (p >= 98) {
          clearInterval(interval);
          return 98;
        }
        return p + Math.floor(Math.random() * 8) + 4;
      });
    }, 100);

    try {
      const concentration = sharedState?.productivityMetrics?.focusTime ?? 40;
      const tasks = sharedState?.productivityMetrics?.tasksCompleted ?? 1;
      const stress = sharedState?.healthMetrics?.stressLevel ?? 30;
      const vibe = sharedState?.currentVibe ?? "열정적";
      
      const prompt = buildResonanceSyncPrompt('orange', `- 집중 시간: ${concentration}분
- 완료한 일: ${tasks}개
- 스트레스: ${stress}/100
- 지금 기분: ${vibe}`);

      const res = stampResonanceApp(ensureResonanceResult(await invokeLLMStructured({
        messages: [{ role: "user", content: prompt }],
        schema: ResonanceSchema,
        resonanceApp: 'orange',
      }), 'orange'), 'orange');
      
      clearInterval(interval);
      setResonanceProgress(100);
      setResonanceData(res as any);
      setIsResonanceLoading(false);
      if (opts?.auto && firebaseUser?.uid) {
        markResonanceModalSeen('orange', firebaseUser.uid);
      }

      try {
        localStorage.setItem('resonance_orange_last_date', todayStr);
        localStorage.setItem('resonance_orange_last_data', JSON.stringify(res));
      } catch (storageErr) {
        console.warn("Failed to save resonance to local storage:", storageErr);
      }

      if (res.carrier && res.beat) {
        const newBeat = saveCustomBinauralBeat({
          name: buildRecommendedBinauralName('orange', res.bandText),
          carrier: res.carrier,
          beat: res.beat,
          desc: res.freqText,
          category: 'orange'
        });
        const list = getBinauralBeatsForApp('orange');
        setBinauralList(list);
        setCurrentBinauralTrack(newBeat);
      } else {
        refreshBinauralBeats();
      }

      recordPrismFeature({
        app: 'orange',
        featureName: '오렌지 마음 공명 동조',
        summary: `일관성 지수: ${res.coherence}%, 주파수: ${res.freqText || '639Hz'}, 수호방패: [${res.shieldToken}], 처방: "${res.prescription}", 실천: "${res.advice}"`,
        details: res,
      });

      if (firebaseUser && localStorage.getItem('developer_bypass') !== 'true') {
        try {
          await addDoc(collection(db, 'orange_history', firebaseUser.uid, 'entries'), {
            type: 'resonance',
            title: `오렌지 영혼 공명 동조 (일관성: ${res.coherence}%)`,
            content: `일관성 지수: ${res.coherence}%\n기후 대역: ${res.bandText}\n동조 주파수: ${res.freqText}\n\n수호 방패 코드: [${res.shieldToken}]\n\n[처방 전언]\n${res.prescription}\n\n[실천 지침]\n${res.advice}`,
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn("Failed to save resonance to firestore:", dbErr);
        }
      }
    } catch (err) {
      console.warn("Orange AI resonance fetch failed, invoking local fallback matrix:", err);
      setTimeout(async () => {
        clearInterval(interval);
        setResonanceProgress(100);
        const coherenceVal = Math.round(80 + Math.random() * 18);
        const fallbackData = {
          coherence: coherenceVal,
          bandText: "감마 고속 영감 자각 파동 (40Hz)",
          freqText: "좌뇌의 이성과 우뇌 of 시적 연합을 급속히 수렴하여 복잡다단한 아이디어 실타래를 한눈에 통찰하도록 주선합니다.",
          shieldToken: "시냅스 실드 (Synapse Sentry)",
          prescription: `현재 창조 활력 및 뇌 피로도에 의거해 잠재 전위 보호층이 작동을 개시했습니다. 주변의 불필요한 참견과 현실적 비아냥을 완전 차단하여 주체적인 발상의 날을 날카롭게 세우기에 비할 바 없이 웅장한 천체 흐름기입니다.`,
          advice: "지금 바로 마우스나 펜을 내려놓고 심장과 우뇌 사이에 뜨거운 감귤색 불씨를 하나 연상하시며 깊은 심호흡을 하십시오.",
          carrier: 200,
          beat: 40,
          luckScore: 88,
          loveScore: 75,
          wealthScore: 82,
          healthScore: 78,
          deepSyncLevel: "OPTIMAL",
          luckyItem: "연한 오렌지 오일 에센스",
          luckyColor: "고휘도 주황색 (Vibrant Amber)",
          cosmicAspect: "잠재되어 있는 아이디어와 에너지가 고도로 정렬되어, 마침내 감추어져 있던 기획적 능력이 싹을 틔우기 시작합니다.",
          guidance: "생각을 과도하게 분석하는 것을 멈추고 직관적인 감각에 의존하여 눈앞의 과업을 가볍게 조각해 나가기 시작하십시오."
        };
        setResonanceData(fallbackData);
        setIsResonanceLoading(false);
        if (opts?.auto && firebaseUser?.uid) {
          markResonanceModalSeen('orange', firebaseUser.uid);
        }

        try {
          localStorage.setItem('resonance_orange_last_date', todayStr);
          localStorage.setItem('resonance_orange_last_data', JSON.stringify(fallbackData));
        } catch (storageErr) {
          console.warn("Failed to save resonance to local storage:", storageErr);
        }

        const newBeat = saveCustomBinauralBeat({
          name: buildRecommendedBinauralName('orange', fallbackData.bandText),
          carrier: fallbackData.carrier,
          beat: fallbackData.beat,
          desc: fallbackData.freqText,
          category: 'orange'
        });
        const list = getBinauralBeatsForApp('orange');
        setBinauralList(list);
        setCurrentBinauralTrack(newBeat);

         if (firebaseUser && localStorage.getItem('developer_bypass') !== 'true') {
          try {
            await addDoc(collection(db, 'orange_history', firebaseUser.uid, 'entries'), {
              type: 'resonance',
              title: `오렌지 영혼 공명 동조 (일관성: ${coherenceVal}%)`,
              content: `일관성 지수: ${coherenceVal}%\n기후 대역: ${fallbackData.bandText}\n동조 주파수: ${fallbackData.freqText}\n\n수호 방패 코드: [${fallbackData.shieldToken}]\n\n[처방 전언]\n${fallbackData.prescription}\n\n[실천 지침]\n${fallbackData.advice}`,
              createdAt: serverTimestamp()
            });
          } catch (dbErr) {
            console.warn("Failed to save fallback resonance to firestore:", dbErr);
          }
        }
      }, 1200);
    }
  };

  useDailyResonanceAutoRun('orange', firebaseUser?.uid, handleResonanceSync, !!sharedState);
  usePictureDiaryAutoRun(firebaseUser?.uid);

  const [notice, setNotice] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const [dailyResult, setDailyResult] = useState<any>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showSoulModal, setShowSoulModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showPictureDiaryModal, setShowPictureDiaryModal] = useState(false);
  const isSpecialFeatureChromeHidden = useSpecialFeatureChromeHidden();
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const evName = showPictureDiaryModal ? "tarot-active" : "tarot-inactive";
    window.dispatchEvent(new CustomEvent(evName));
    return () => {
      window.dispatchEvent(new CustomEvent("tarot-inactive"));
    };
  }, [showPictureDiaryModal]);

  // Daily Oracle Card and Check-in State
  const [sessionCardDrawn, setSessionCardDrawn] = useState<{ name: string; emoji: string; keyphrase: string; desc: string; isReversed?: boolean } | null>({
    name: "Quantum Core (양자 아이디어 핵)",
    emoji: "⚛️",
    keyphrase: "확률적 아이디어 무한 중첩",
    desc: "모든 가능성이 동시에 공존하는 고밀도의 무한한 주파수입니다. 이 수호 기하학과 결합하면 우주적인 보호와 대업 달성의 비전이 조형될 것입니다.",
    isReversed: false
  });

  const [sessionComfortLevel, setSessionComfortLevel] = useState<number>(() => {
    const saved = localStorage.getItem(`orange_daily_level_${new Date().toLocaleDateString('sv')}`);
    return saved ? parseInt(saved, 10) : 3;
  });

  const [sessionLevelCheckedIn, setSessionLevelCheckedIn] = useState<boolean>(() => {
    return localStorage.getItem(`orange_daily_checked_${new Date().toLocaleDateString('sv')}`) === 'true';
  });

  const ORANGE_CARDS = useMemo(() => [
    { name: "Synergy Bolt (시너지 볼트)", emoji: "⚡", keyphrase: "순간적 스파크와 가속", desc: "서로 다른 영역의 아이디어가 충돌하며 번뜩이는 직관적 연결고리를 발산하는 강력한 동조 타이밍입니다." },
    { name: "Deep Node (딥 노드)", emoji: "🧠", keyphrase: "주파적 초몰입과 논리 정돈", desc: "외부 산만함을 전면 배제하고 중심 핵심 아키텍처나 코드 구조를 극도로 정교화할 수 있는 응축기입니다." },
    { name: "Chaos Fusion (카오스 퓨전)", emoji: "🌀", keyphrase: "모순개념의 예술적 연합", desc: "정반합의 모순과 비이성적 무의식을 엮어 차세대 패러다임을 설계해내는 과감한 모험 구도입니다." },
    { name: "Static Shifting (정적 전환)", emoji: "⏳", keyphrase: "컨텍스트 클리어 및 보존", desc: "과열된 싱크 주파수 편차를 가라앉히고 제3자 관점으로 전면 환기하는 지식 리부팅 지점입니다." },
    { name: "Vision Arch (비전 아치)", emoji: "🏛️", keyphrase: "장기 프레임워크 설계", desc: "산발적인 낙서 수준의 조각들을 미래 핵심 비전의 거대한 중심 구도로 전위화하는 구축 흐름입니다." }
  ], []);

  const renderDailySecret = () => <DailySecret />;

  const [activeMode, setActiveMode] = useState<'landing' | 'simple' | 'station' | 'history' | 'bible' | 'soul' | 'pictureDiary' | 'secret'>('landing');
  useScrollToTopOnChange([activeMode]);

  useEffect(() => {
    const handleNavClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.path === '/orange') {
        setActiveMode('landing');
        setShowDailyModal(false);
        setShowSoulModal(false);
        setShowChat(false);
        setShowDashboard(false);
        setShowEmblemModal(false);
        resetAppScroll();
      }
    };
    window.addEventListener('nav-click-active', handleNavClick);
    return () => window.removeEventListener('nav-click-active', handleNavClick);
  }, []);
  const [shuffledOrangeCards, setShuffledOrangeCards] = useState(() => 
    shuffleCardDeck(ORANGE_CARDS)
  );
  const [orangeOffsets, setOrangeOffsets] = useState<{ xOff: number; yOff: number; rotOff: number }[]>(() =>
    Array.from({ length: 22 }).map(() => ({
      xOff: 0,
      yOff: 0,
      rotOff: 0,
    }))
  );
  useEffect(() => {
    if ((activeMode as any) === 'station_removed' && !sessionCardDrawn) {
      setShuffledOrangeCards(shuffleCardDeck(ORANGE_CARDS));
      setOrangeOffsets(
        Array.from({ length: ORANGE_CARDS.length }).map(() => ({
          xOff: 0,
          yOff: 0,
          rotOff: 0,
        }))
      );
    }
  }, [activeMode, sessionCardDrawn]);
  useEffect(() => {
    if ((activeMode as any) !== 'station_removed' || sessionCardDrawn) return;

    const alignDeck = () => {
      const deck = cardContainerRef.current;
      if (deck && deck.scrollWidth > 0) {
        deck.scrollTo({
          left: Math.max(0, (deck.scrollWidth - deck.clientWidth) / 2),
          behavior: 'smooth'
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
          behavior: 'smooth'
        });
      }
    };

    deck.addEventListener('mousedown', onMouseDown);
    deck.addEventListener('mouseleave', onMouseLeave);
    deck.addEventListener('mouseup', onMouseUp);
    deck.addEventListener('mousemove', onMouseMove);
    deck.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.cancelAnimationFrame(frame);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      deck.removeEventListener('mousedown', onMouseDown);
      deck.removeEventListener('mouseleave', onMouseLeave);
      deck.removeEventListener('mouseup', onMouseUp);
      deck.removeEventListener('mousemove', onMouseMove);
      deck.removeEventListener('wheel', onWheel);
    };
  }, [activeMode, sessionCardDrawn, shuffledOrangeCards]);
  const [stage, setStage] = useState<'landing' | 'analysis' | 'station' | 'history' | 'onboarding' | 'soul'>('landing');
  const [insightResult, setInsightResult] = useState<any>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('chat_history_orange');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'greet', role: 'model', content: "안녕! 마음에 자욱한 그늘을 걷어내고 따스하게 보듬어주는 루시의 마음치유 채널이야. 너의 지치고 상처받은 감정들을 여기에 다 털어놓아 봐. 차분하게 토닥여줄게. [EMOTION: COMFORT]", timestamp: Date.now() }
    ];
  });

  const [isPlayingBinaural, setIsPlayingBinaural] = useState(false);
  const [binauralList, setBinauralList] = useState<BinauralBeatConfig[]>([]);
  const [currentBinauralTrack, setCurrentBinauralTrack] = useState<BinauralBeatConfig | null>(null);

  const refreshBinauralBeats = () => {
    const list = getBinauralBeatsForApp('orange');
    setBinauralList(list);
    const activeId = getActiveBinauralTrackId();
    const activeTrack = list.find(t => t.id === activeId);
    setCurrentBinauralTrack(activeTrack || list[0]);
  };

  const [showChat, setShowChat] = useState(false);
  const [soulData, setSoulData] = useState({
    coreValue: "혁신적 발상과 실행력",
    unconsciousPattern: "아이디어 과잉과 산만함",
    preference: "도전적이고 분석적인 어조",
    stats: [
      { subject: '창의성', A: 90, fullMark: 100 },
      { subject: '실행력', A: 75, fullMark: 100 },
      { subject: '논리력', A: 85, fullMark: 100 },
      { subject: '도전 정신', A: 95, fullMark: 100 },
      { subject: '분석력', A: 80, fullMark: 100 },
    ],
    energyFlow: [
      { time: '월', value: 70 }, { time: '화', value: 85 }, { time: '수', value: 60 }, { time: '목', value: 90 }, { time: '금', value: 95 }, { time: '토', value: 50 }, { time: '일', value: 40 }
    ],
    emotions: [
      { name: '열정', value: 45 }, { name: '조급함', value: 25 }, { name: '성취감', value: 20 }, { name: '피로', value: 10 }
    ]
  });
  const ALL_ORANGE_CHAT_SUGGESTIONS = [
    "힘든 하루였어.",
    "자꾸 미루게 돼.",
    "내 마음을 위로해줘.",
    "불안한 마음이 들어.",
    "지치는 날이야.",
    "손에 안 잡혀.",
    "의욕이 전혀 나지 않아.",
    "무기력함에서 벗어나는 방법",
    "오늘 나를 칭찬할 만한 점은?",
    "따뜻한 온기 가득한 위로",
    "스트레스로 머리가 복잡해",
    "나를 위한 작은 선물 같은 조언"
  ];

  const [orangeSuggestions, setOrangeSuggestions] = useState<string[]>(() => {
    const shuffled = [...ALL_ORANGE_CHAT_SUGGESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  });

  const handleRefreshOrangeSuggestions = () => {
    const shuffled = [...ALL_ORANGE_CHAT_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setOrangeSuggestions(shuffled.slice(0, 4));
  };
  const ORANGE_FLUX_SUGGESTIONS = [
    "따스한 햇볕이 드는 커피잔 속의 미니 바다와 종이배, 빈티지 유화",
    "밤하늘 은하수 아래 밝게 타오르는 오렌지빛 모닥불, 아늑한 파스텔화",
    "황금빛 오라를 뿜으며 피어나는 자그마한 영혼의 나무, 신비로운 서정적 드로잉",
    "깊고 푸른 바다 한가운데 은은하게 빛나는 등대와 오렌지빛 밤하늘, 수채화",
    "주황빛 구름 사이로 날아 다니는 투명한 크리스탈 나비들의 숲, 몽환적 유화",
    "고요한 호수 위에 내려앉은 따뜻한 초승달과 작은 노란 새들의 쉼터, 일러스트",
    "빈티지 책장 사이로 뿜어 나오는 눈부신 햇살과 공중에 떠 있는 책들, 입체화",
    "빛의 정원에서 날리는 주황색 장미 꽃잎들과 은빛 바람의 소용돌이, 크레용화",
    "구름 위에서 가만히 별글씨를 적어 내려가는 작은 오렌지 고양이, 동화풍 삽화",
    "마음의 걱정을 태워 주는 은은한 촛불과 그 주위를 맴도는 아늑한 나방들, 수채화"
  ];
  const [hasUnread, setHasUnread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [poeInsight, setPoeInsight] = useState<{ insight: string, category: string } | null>(null);
  const [isInsightCollapsed, setIsInsightCollapsed] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = useState<DiaryEntry | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ideaInput, setIdeaInput] = useState('');
  const [amplifyResult, setAmplifyResult] = useState<string | null>(null);
  const [isAmplifying, setIsAmplifying] = useState(false);
  const [alchemyMode, setAlchemyMode] = useState<'refine' | 'combine' | 'oracle' | 'focus'>('refine');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [alchemyInput, setAlchemyInput] = useState('');
  const [alchemyResult, setAlchemyResult] = useState<string | null>(null);
  const [isAlchemizing, setIsAlchemizing] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'simple' | 'daily' | 'soul'>('simple');
  const [luckyInput, setLuckyInput] = useState('');
  const isSendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateSharedState({}, 'ORANGE');
    setMessages([{ id: 'welcome', role: 'model', content: "당신의 마음 정원, 오랜지 샌추어리에 오신 것을 환영합니다. 저는 당신의 감정을 돌보는 가드너(Gardener) 오렌지입니다. 오늘 당신의 마음에는 어떤 바람이 불고 있나요?", timestamp: Date.now() }]);
    setSmartSuggestions(ORANGE_FLUX_SUGGESTIONS);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chat_history_orange', JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  useEffect(() => {
    if (showChat) {
      handleRefreshOrangeSuggestions();
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [showChat]);



  useBinauralSync({
    appId: 'orange',
    setIsPlayingBinaural,
    setBinauralList,
    setCurrentBinauralTrack,
  });

  useEffect(() => {
    if (!firebaseUser) return;
    const isDev = localStorage.getItem('developer_bypass') === 'true';
    if (isDev) return;

    let unsub: (() => void) | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      const q = query(collection(db, 'orange_history', firebaseUser.uid, 'entries'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs
          .map(d => ({ 
            id: d.id, 
            ...d.data() as any,
            date: (d.data() as any).createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || 'New'
          }))
          .filter((d: any) => d.type !== 'chat');
        setDiaryEntries(docs as any);
      }, (error) => {
        const msg = error?.message || '';
        if (msg.includes('INTERNAL ASSERTION FAILED')) {
          console.warn('[Orange] Firestore 내부 오류 — 5초 후 재연결합니다.');
          retryTimeout = setTimeout(subscribe, 5000);
        } else {
          console.error('[Orange] onSnapshot error:', error);
        }
      });
    };

    subscribe();
    return () => {
      unsub?.();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [firebaseUser]);


  useEffect(() => {
    if (diaryEntries && diaryEntries.length > 0) {
      const latestDaily = diaryEntries.find((h: any) => h.type === 'oracle-vision');
      if (latestDaily) {
        setDailyResult({ ...((latestDaily as any).data || latestDaily), dateKey: getTodayDateKey() });
      }
      const latestSoul = diaryEntries.find((h: any) => h.type === 'soul-sync');
      if (latestSoul) {
        setInsightResult((latestSoul as any).data || latestSoul);
      }
    }
  }, [diaryEntries]);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
      setSelectedImage(base64.split(',')[1]);
      setImagePreview(base64);
    } catch (err) { console.error(err); }
  };

  const removeImage = () => { setSelectedImage(null); setImagePreview(null); };

  const handleDailyOracle = async () => {
    if (isDailyOracleLoading) return;
    
    // Daily Limit Check
    const lastSync = sharedState?.lastOrangeDailySync;
    const todayStr = new Date().toDateString();
    const todayLocal = new Date().toLocaleDateString('sv');
    const uid = firebaseUser?.uid || 'guest';
    const dailyLockKey = `limit_daily_orange_${uid}_${todayLocal}`;

    if ((lastSync && new Date(lastSync).toDateString() === todayStr) || localStorage.getItem(dailyLockKey)) {
      setLimitModalInfo({ open: true, type: 'daily', dapp: 'ORANGE' });
      return;
    }

    setIsDailyOracleLoading(true);
    setDailyResult(null);

    const timeoutId = setTimeout(() => {
      setIsDailyOracleLoading(prev => {
        if (prev) {
          setNotice({ open: true, title: "오라클 지연", message: "오라클 비전을 불러오는 데 시간이 너무 오래 걸립니다." });
          return false;
        }
        return prev;
      });
    }, 45000);

    const modePrompt = alchemyMode === 'refine' ? '혼탁한 무의식과 파편화된 아이디어들의 불순물을 전소시켜, 오직 가장 순수하고 강력한 본질의 지혜만을 추출해내는 영적 연금술의 관점에서' :
                       alchemyMode === 'combine' ? '전혀 융합할 수 없던 세계와 개념들을 고온의 영적 에너지로 압착하여, 인류가 보지 못했던 새로운 차원의 강력한 가치로 주조해내는 관점에서' :
                       alchemyMode === 'oracle' ? '시대를 꿰뚫어보는 예리한 통찰과, 기하학적이고 미래지향적인 비전으로 당신의 잠재력의 거대한 돌파구를 선언하는 신탁의 형식으로' : 
                       alchemyMode === 'focus' ? '분산된 모든 생명력과 에너지를 단 하나의 절대적인 레이저 포인트로 응집시켜, 압도적인 실행력과 퀀텀 점프를 이룩해내는 몰입의 관점에서' : '종합적이고 초월적인 영적 조언과 함께';

    const userProfileStr = sharedState?.userProfile ? JSON.stringify(sharedState.userProfile) : "프로필 정보 없음";
    const recentMemory = sharedState?.orangeMemory || sharedState?.globalMemory || "최근 기록 없음";

    const isRev = (sessionCardDrawn as any)?.isReversed;
    const cardContext = sessionCardDrawn
      ? `\n[오늘의 연금술 아이디어 카드]: ${sessionCardDrawn.name} ${sessionCardDrawn.emoji} (${sessionCardDrawn.keyphrase}) [상태: ${isRev ? '역방향(Reversed - 경고, 에너지의 과잉/결핍, 창의적 정체, 극복해야 할 그림자적 측면)' : '정방향(Upright - 흐름의 순탄함, 활성화, 자연스러운 발현)'}] - 이 카드가 가진 연금술적 성질과 아이디어 모티브를 오늘의 리포트 전체와 긴밀하게 직조해주십시오. 특히 상태가 역방향(Reversed)인 경우, 경고나 내면의 그늘(Shadow), 또는 고정관념의 은유를 통해 이를 창조적 도전으로 승화시킬 수 있는 어두운 터치나 깊은 조언을 함께 담아 리포트를 작성할 것.`
      : "";
    const levelContext = `\n[창작 몰입도 자가 진단]: 5단계 중 현재 레벨 ${sessionComfortLevel}수준 (${sessionComfortLevel === 1 ? '아이디어가 정체되고 시냅스에 과부하가 걸린 피로 상태' : sessionComfortLevel === 5 ? '시냅스가 완전히 원활하고 번뜩이는 고속 흐름 상태' : '보통 혹은 미세 조율 중인 발상 상태'})`;

    try {
      const data = await invokeLLMStructured({
        messages: [
          { role: 'system', content: `당신은 마음의 정원을 돌보는 가드너(Gardener) 'ORANGE(오렌지)'이자 최고의 아이디어 연금술사입니다.
오늘 질문자가 뽑은 연금술 아이디어 카드는 **[${sessionCardDrawn ? `${sessionCardDrawn.name} ${sessionCardDrawn.emoji}` : "연금술 카드"}]**입니다.

[반드시 준수할 필수 지침]
1. 오늘 드로우한 [${sessionCardDrawn?.name || ''}] 카드의 핵심 모티브("${sessionCardDrawn?.keyphrase || ''}")를 진단의 최우선 중심축으로 삼아 풀이하세요.
2. 'diagnosis' 필드는 마크다운(소제목, 강조, 리스트)을 활용하여 4문단 이상의 장문으로 [${sessionCardDrawn?.name || ''}] 카드가 전하는 무의식과 감정의 연금술적 심층 분석 리포트를 작성하세요.
3. 'remedy'에는 이 카드의 지혜에 기반한 오늘 하루의 실행 팁 2문장을 전달하세요.
4. 'focusPlaylist'에는 오늘의 창의 에너지·주파수에 맞는 맞춤 사운드스케이프 이름을 제시할 것. [데이터: 프로필(${userProfileStr}), 최근감정기록(${recentMemory})${cardContext}${levelContext}]` },
          { role: 'user', content: `오늘 내가 뽑은 아이디어 카드는 [${sessionCardDrawn?.name || ''} ${sessionCardDrawn?.emoji || ''}] (${sessionCardDrawn?.keyphrase || ''})야. 이 카드의 모티브를 중심으로, ${modePrompt} 오늘 내 마음의 연금술 오라클 비전 리포트를 전해줘. 고민: ${luckyInput}` }
        ],
        schema: QuickInsightSchema
      });
      
      clearTimeout(timeoutId);
      if (data) {
        setIsDailyOracleLoading(false);
        const finalData = { ...data, drawnCard: sessionCardDrawn, dateKey: getTodayDateKey() };
        setDailyResult(finalData);
        setShowDailyModal(true);
        
        recordDailyOracleResult({
          app: 'orange',
          featureName: '오늘의 연금술 아이디어 오라클',
          cardName: sessionCardDrawn ? `${sessionCardDrawn.name} ${sessionCardDrawn.emoji || ''}` : '연금술 아이디어 카드',
          cardDesc: sessionCardDrawn?.keyphrase || '',
          diagnosis: data.diagnosis || '',
          remedy: data.remedy || '',
          focusPlaylist: data.focusPlaylist || '',
          symbol: data.symbol || sessionCardDrawn?.name || '',
          frequency: data.frequency || '639Hz',
        });

        const oracleItem = {
          id: 'oracle-' + Date.now(),
          timestamp: Date.now(),
          type: 'oracle-vision',
          content: `Orange Prophecy: ${data.diagnosis}`,
          data: finalData,
          createdAt: Date.now()
        };

        const updatedHistory = [oracleItem, ...(sharedState?.orangeHistory || [])];
        const todayL = new Date().toLocaleDateString('sv');
        const userUid = firebaseUser?.uid || 'guest';
        localStorage.setItem(`limit_daily_orange_${userUid}_${todayL}`, 'true');

        await updateSharedState({
          orangeHistory: updatedHistory.slice(0, 50),
          lastOrangeDailySync: Date.now()
        }, 'ORANGE');

        if (firebaseUser && localStorage.getItem('developer_bypass') !== 'true') {
          try {
            await addDoc(collection(db, 'orange_history', firebaseUser.uid, 'entries'), {
              type: 'oracle-vision', 
              content: `Oracle Vision: ${data.diagnosis}`, 
              createdAt: serverTimestamp(), 
              data 
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `orange_history/${firebaseUser.uid}/entries`);
          }
        }
      }
    } catch (err) {
      console.error(err);
      clearTimeout(timeoutId);
      setNotice({ open: true, title: "오류 발생", message: "비전을 열어보는 중 오류가 발생했습니다." });
    } finally {
      setIsDailyOracleLoading(false);
    }
  };

  // Handle errors and timeouts for loading states
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMeasuringInsight || isDailyOracleLoading) {
      timer = setTimeout(() => {
        setIsMeasuringInsight(false);
        setIsDailyOracleLoading(false);
      }, 60000); // 60s timeout
    }
    return () => clearTimeout(timer);
  }, [isMeasuringInsight, isDailyOracleLoading]);

  useEffect(() => {
    if (!firebaseUser) return;
    const isDev = localStorage.getItem('developer_bypass') === 'true';
    if (isDev) {
      try {
        const saved = localStorage.getItem('soul_mirror_orange');
        if (saved) {
          setSoulData(JSON.parse(saved));
        }
      } catch (_) {}
      return;
    }
    const fetchSoulData = async () => {
      try {
        const docRef = doc(db, 'soul_mirror', firebaseUser.uid, 'dapps', 'orange');
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

  const handleAlchemySynthesis = async () => {
    if (!alchemyInput) return;
    setIsAlchemizing(true);
    setAlchemyResult(null);
    try {
      const data = await invokeLLM({
        messages: [
          { role: 'system', content: `당신은 아이디어 연금술사 'ORANGE(오렌지)'입니다. 주어진 [모드]와 [아이디어]를 기반으로, 사용자의 생각을 전설적인 수준으로 구체화하고 발전시키는 분석 리포트를 한국어로 작성해주세요.` },
          { role: 'user', content: `[연금술 모드]: ${alchemyMode}\n[아이디어 파편]: ${alchemyInput}` }
        ]
      });
      setAlchemyResult(data);
      
      const newHistoryItem = {
        id: 'alchemy-' + Date.now(),
        timestamp: Date.now(),
        type: 'idea-alchemy',
        content: `Mode: ${alchemyMode}\nInput: ${alchemyInput}\n\nResult: ${data}`,
        data: { alchemyMode, alchemyInput, result: data }
      };
      
      const updatedHistory = [newHistoryItem, ...(sharedState?.orangeHistory || [])];
      updateSharedState({ orangeHistory: updatedHistory.slice(0, 50) }, 'ORANGE');
      
      if (firebaseUser && localStorage.getItem('developer_bypass') !== 'true') {
        try {
          await addDoc(collection(db, 'orange_history', firebaseUser.uid, 'entries'), {
            type: 'idea-alchemy', content: data, metadata: { alchemyMode, alchemyInput }, createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `orange_history/${firebaseUser.uid}/entries`);
        }
      }
    } catch (error) {
      console.error("Alchemy synthesis error:", error);
    } finally {
      setIsAlchemizing(false);
    }
  };

  const handleChat = async (text?: string) => {
    const userMsg = (text || input).trim();
    if ((!userMsg && !selectedImage) || isSendingRef.current) return;
    
    isSendingRef.current = true;
    setIsSending(true);
    if (!showChat) setHasUnread(true);
    setInput('');
    const userImage = selectedImage;
    const userImagePreview = imagePreview;
    removeImage();

    const userMsgObj: Message = { id: 'u-' + Date.now(), role: 'user', content: userMsg, image: userImagePreview || undefined };
    const newMessages = [...messages, userMsgObj];
    setMessages([...newMessages, { id: 'm-' + Date.now(), role: 'model', content: '' }]);

    // Trigger async insight gathering
    poeQuickInsight(userMsg, newMessages).then((res: any) => {
      if (res && res.insight) {
        setPoeInsight({ insight: res.insight, category: res.category });
        setIsInsightCollapsed(false);
        if (res.themeColor || res.currentVibe) {
          updateSharedState({
            ...(res.themeColor ? { themeColor: res.themeColor } : {}),
            ...(res.currentVibe ? { currentVibe: res.currentVibe } : {})
          }, 'ORANGE');
        }
      }
    }).catch(console.error);

    try {
      let finalResponse = "";
      const profile = sharedState?.userProfile;
      const deepCoreInfo = buildDeepSynapseContext(profile);
      const soulMirrorInfo = `\n[시냅스의 거울]\n- 핵심 가치: ${soulData.coreValue}\n- 무의식적 패턴: ${soulData.unconsciousPattern}\n- 취향 및 선호: ${soulData.preference}\n이 데이터를 바탕으로 사용자의 방향성을 교정하여 코칭에 반영할 것. 또한, 이번 대화를 바탕으로 이 시냅스 거울 데이터(핵심 가치, 패턴, 취향, stats, energyFlow, emotions 등)를 갱신해야 한다면 응답의 가장 마지막에 오직 다음 포맷으로만 업데이트 내용을 출력하세요: [SOUL_UPDATE: {"coreValue":"...","unconsciousPattern":"...","preference":"...","stats":[{"subject":"...","A":85,"fullMark":100}],"energyFlow":[{"time":"...","value":80}],"emotions":[{"name":"...","value":40}]}]`;
      const combinedContext = deepCoreInfo + "\n" + soulMirrorInfo;
      
      await invokeLLMStream({
        messages: [
          { role: 'system', content: PERSONAS.orangeChat('', sharedState?.globalMemory, combinedContext) + SUGGESTIONS_SYSTEM_SUFFIX },
          ...newMessages.slice(-5).map(m => ({ role: m.role === 'user' ? 'user' as const : 'model' as const, content: m.content }))
        ],
        onChunk: (chunk) => {
          finalResponse += chunk;
          const cleanText = cleanOrangeChatText(finalResponse);
          setMessages(prev => {
            const next = [...prev];
            if (next.length > 0 && next[next.length - 1].role === 'model') {
              next[next.length - 1] = { ...next[next.length - 1], content: cleanText };
            }
            return next;
          });
        }
      });
      const personalizedSuggestions = parseSuggestions(finalResponse);
      if (personalizedSuggestions.length > 0) {
        setSmartSuggestions(Array.from(new Set([...personalizedSuggestions, ...ORANGE_FLUX_SUGGESTIONS])).slice(0, 10));
      }
      
      const soulMatch = finalResponse.match(/\[SOUL_UPDATE:\s*({[\s\S]*?})\]/);
      if (soulMatch) {
        try {
          const parsed = JSON.parse(soulMatch[1]);
          setSoulData(prev => {
            const updated = { ...prev, ...parsed };
            if (firebaseUser) {
              const isDev = localStorage.getItem('developer_bypass') === 'true';
              if (isDev) {
                localStorage.setItem('soul_mirror_orange', JSON.stringify(updated));
              } else {
                setDoc(doc(db, 'soul_mirror', firebaseUser.uid, 'dapps', 'orange'), updated)
                  .catch(e => console.error("Error saving soulData to firestore", e));
              }
            }
            return updated;
          });
        } catch (e) {
          console.error("Soul update parse error", e);
        }
      }
      
      const content = cleanOrangeChatText(finalResponse);
      if (auth.currentUser && localStorage.getItem('developer_bypass') !== 'true') {
        try {
          await addDoc(collection(db, 'orange_history', auth.currentUser.uid, 'entries'), {
            type: 'chat', content, metadata: { question: userMsg }, createdAt: serverTimestamp()
          });
          notifyOrangeChatSaved();
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `orange_history/${auth.currentUser.uid}/entries`);
        }
      }
    } catch (err) { console.error(err); } finally {
      isSendingRef.current = false;
      setIsSending(false); 
    }
  };

  const handleEnergyAnalysis = async () => {
    // Check if we have onboarding data
    if (!sharedState?.userProfile?.basic?.nickname) {
      setNotice({ open: true, title: "프로필 필요", message: "먼저 라이브러리에서 소울 프로필을 완성해주세요." });
      setActiveMode('history');
      return;
    }

    // Prerequisite: Daily Oracle check
    const lastDaily = sharedState?.lastOrangeDailySync;
    const today = new Date().toDateString();
    const hasDailyToday = lastDaily && new Date(lastDaily).toDateString() === today;

    if (!hasDailyToday) {
      setNotice({ 
        open: true, 
        title: "데일리 꽃피우기 필요", 
        message: "시냅스 거울 분석을 위해서는 먼저 Blooming 탭에서 오늘의 꽃피우기를 완료해야 합니다." 
      });
      return;
    }

    // Soul Daily Limit Check
    const lastSoul = sharedState?.lastOrangeSoulSync;
    const todayStr = new Date().toDateString();
    const todayLocal = new Date().toLocaleDateString('sv');
    const uid = firebaseUser?.uid || 'guest';
    const soulLockKey = `limit_soul_orange_${uid}_${todayLocal}`;

    if ((lastSoul && new Date(lastSoul).toDateString() === todayStr) || localStorage.getItem(soulLockKey)) {
      setLimitModalInfo({ open: true, type: 'soul', dapp: 'ORANGE' });
      return;
    }

    if (isMeasuringInsight) return;

    setStage('analysis');
    setIsMeasuringInsight(true);
    setInsightResult(null);

    const timeoutId = setTimeout(() => {
      setIsMeasuringInsight(prev => {
        if (prev) {
          setNotice({ open: true, title: "분석 지연", message: "분석 시간이 너무 오래 걸립니다. 다시 시도해주세요." });
          setStage('landing');
          return false;
        }
        return prev;
      });
    }, 60000);

    try {
      const historyItems = (sharedState?.orangeHistory || []).slice(0, 10);
      const historyContext = historyItems.length > 0
        ? `최근 활동 기록:\n${historyItems.map((h: any) => `- ${h.type}: ${h.content?.substring(0, 100)}...`).join('\n')}`
        : "아직 활동 기록이 없습니다.";
      
      const consultationContext = messages.length > 2
        ? `최근 상담 내역: ${messages.slice(-6).filter(m => m.role === 'user').map(m => m.content).join(' | ')}`
        : "최근 상담 내역이 없습니다.";

      const dailyContext = dailyResult 
        ? `오늘의 Daily 진단: ${dailyResult.diagnosis} (상징: ${dailyResult.symbol}, 주파수: ${dailyResult.frequency})`
        : "오늘의 Daily 진단 데이터가 없습니다.";

      const data = await invokeLLMStructured({
        messages: [
          { 
            role: 'system', 
            content: "당신은 아이디어의 연금술사 오렌지(Orange)입니다. 사용자의 프로필, 오늘 받은 Daily 비전, 이전 활동 기록 및 상담 내역을 종합적으로 분석하여 사용자의 '현재 아이디어 영혼 상태'를 심층 리포트(The Idea Decree)로 작성해주세요. 사용자의 아이디어가 어떻게 세상에 발현될지 신비롭고 실질적인 통찰을 제공하세요. **반드시 모든 텍스트 필드를 한국어로만 작성하세요.**\n준수사항: 'guidance' 필드는 소제목, 리스트, 강조 등 마크다운 양식을 사용하여 최소 4문단 이상의 깊고 분석적인 비전을 세밀하게 제시할 것." 
          },
          { 
            role: 'user', 
            content: `사용자: ${sharedState?.userProfile?.basic?.nickname || '연금술사'}\n\n${dailyContext}\n\n${historyContext}\n\n${consultationContext}\n\n이 모든 데이터를 바탕으로 나의 'The Idea Decree'를 분석해줘.` 
          }
        ],
        schema: EnergyAnalysisSchema
      });

      clearTimeout(timeoutId);
      if (!data) throw new Error("분석 데이터를 생성하지 못했습니다.");
      
      setInsightResult(data);
      
      const syncResult = {
        id: 'soul-' + Date.now(),
        timestamp: Date.now(),
        type: 'soul-sync',
        content: `Soul Sync Report: ${data.guidance.substring(0, 100)}...`,
        data: data,
        createdAt: Date.now()
      };
      
      const todayL = new Date().toLocaleDateString('sv');
      const userUid = firebaseUser?.uid || 'guest';
      localStorage.setItem(`limit_soul_orange_${userUid}_${todayL}`, 'true');

      await updateSharedState({ 
        orangeHistory: [syncResult, ...(sharedState?.orangeHistory || [])].slice(0, 50),
        lastEnergyAnalysis: Date.now(),
        lastOrangeSoulSync: Date.now()
      }, 'ORANGE');

      if (firebaseUser && localStorage.getItem('developer_bypass') !== 'true') {
        try {
          await addDoc(collection(db, 'orange_history', firebaseUser.uid, 'entries'), {
            type: 'soul-sync', 
            content: `Soul Sync: ${data.guidance.substring(0, 120)}...`, 
            createdAt: serverTimestamp(), 
            data 
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `orange_history/${firebaseUser.uid}/entries`);
        }
      }
    } catch (error) {
      console.error("Soul Analysis Error:", error);
      setNotice({ open: true, title: "분석 오류", message: "영혼 분석 중 오류가 발생했습니다." });
      setStage('landing');
    } finally {
      setIsMeasuringInsight(false);
    }
  };

  // Standardized Soul mode handling
  useEffect(() => {
    if (activeMode === 'soul') {
      if (insightResult) {
        setStage('analysis');
      } else {
        setStage('landing');
      }
    }
  }, [activeMode, insightResult]);

  const handleStationInsight = async (topic: string) => {
    setIsAmplifying(true);
    setAmplifyResult("");
    try {
      let fullText = "";
      await invokeLLMStream({
        messages: [
          { role: 'system', content: `당신은 아이디어 스테이션의 마스터 멘토입니다. ${topic}에 대해 창의적이고 혁신적인 아이디어 맵을 한국어로 제안해주세요. 구조적이고 실행 가능한 단계별 로드맵을 포함하세요.` },
          { role: 'user', content: `${topic}에 대한 영감을 스테이션에서 연성해줘.` }
        ],
        onChunk: (chunk) => {
          fullText += chunk;
          setAmplifyResult(fullText);
        }
      });
    } catch (err) { console.error(err); } finally { setIsAmplifying(false); }
  };

  const handleAmplifyIdea = async () => {
    if (!ideaInput.trim() || isAmplifying) return;

    // Daily Limit Check
    const today = new Date().toDateString();
    const lastRefine = sharedState?.lastOrangeRefine;
    if (lastRefine && new Date(lastRefine).toDateString() === today) {
      setNotice({ open: true, title: "분석 완료", message: "오늘의 아이디어 연금술은 이미 완료되었습니다. 기록은 라이이브러리에서 확인하실 수 있습니다." });
      return;
    }

    setIsAmplifying(true);
    setAmplifyResult("");
    try {
      let fullText = "";
      await invokeLLMStream({
        messages: [
          { role: 'system', content: "당신은 아이디어 연금술사입니다. 사용자의 투박한 아이디어를 받아서, 이를 다각도로 구체화하고 실행 가능한 플랜으로 증폭시켜주세요. 창의적이고 현실적인 제안을 섞어서 답변하세요. **모든 답변은 반드시 한국어로 작성해야 하며, 영어를 사용하지 마세요.**" },
          { role: 'user', content: `${ideaInput}\n\n위 아이디어를 바탕으로 한국어 연금술 보고서를 작성해줘.` }
        ],
        onChunk: (chunk) => {
          fullText += chunk;
          setAmplifyResult(fullText);
        }
      });

      const newEntry = {
        id: Date.now().toString(),
        type: 'idea_alchemy',
        content: fullText,
        metadata: { originalIdea: ideaInput },
        createdAt: Date.now()
      };

      updateSharedState({
        orangeHistory: [newEntry, ...(sharedState?.orangeHistory || [])],
        lastOrangeRefine: Date.now()
      }, 'ORANGE');

      if (auth.currentUser && localStorage.getItem('developer_bypass') !== 'true') {
        await addDoc(collection(db, 'orange_history', auth.currentUser.uid, 'entries'), {
          type: 'idea_alchemy', content: fullText, metadata: { originalIdea: ideaInput }, createdAt: serverTimestamp()
        });
      }
    } catch (err) { console.error(err); } finally { setIsAmplifying(false); }
  };

  return (
    <div className="h-app-full w-full flex flex-col relative overflow-hidden font-sans bg-transparent">
      <div className={`fixed top-safe-2 left-1.5 sm:left-2 md:top-safe-4 md:left-6 pointer-events-auto z-[110] scale-[0.68] sm:scale-75 md:scale-100 origin-top-left transition-all duration-300 ${isSpecialFeatureChromeHidden ? SPECIAL_FEATURE_CHROME_HIDDEN_CLASS : 'opacity-100'}`}>
         <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] group backdrop-blur-md cursor-pointer" onClick={() => setShowEmblemModal(true)}>
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }} className="absolute inset-0 rounded-full border border-dashed border-white/30" />
               <div className="absolute inset-[3px] md:inset-[4px] rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
                 <TreeDeciduous size={24} className="relative z-10 text-orange-400 drop-shadow-[0_0_12px_currentColor] transition-transform group-hover:scale-110 duration-500 animate-pulse md:w-6 md:h-6" strokeWidth={1.5} />
               </div>
            </div>
            <div className="cursor-pointer" onClick={() => navigate('/')}>
               <h1 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-tighter ">PRISM</h1>
               <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-widest font-bold font-sans">ORANGE • IDEA SANCTUARY</p>
            </div>
         </div>
      </div>

      <SpecialFeatureFabGroup>
        <SpecialFeatureButton
          theme="orange"
          icon={BookHeart}
          isActive={showPictureDiaryModal}
          title="오늘 하루 그림일기"
          tooltipLabel="그림일기 (ORANGE 특수기능)"
          iconClassName={showPictureDiaryModal ? 'animate-bounce' : 'hover:scale-110 transition-transform'}
          onClick={() => setShowPictureDiaryModal(!showPictureDiaryModal)}
        />
        <ChatFabButton onClick={() => openLucyChat('orange')} />
      </SpecialFeatureFabGroup>

      {/* Orange Navigation Menu - Moved to Top */}
      <nav className={`prism-xs-subnav fixed top-safe-nav md:top-safe-nav-md left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar md:max-w-fit md:overflow-visible transition-all duration-300 ${isSpecialFeatureChromeHidden ? SPECIAL_FEATURE_CHROME_HIDDEN_CLASS : 'opacity-100'}`}>
        {[
          { id: 'landing', icon: Home, label: 'Core' },
          { id: 'secret', icon: KeyRound, label: 'DAILY' },
          { id: 'bible', icon: BookOpen, label: 'BIBLE' }
        ].map(item => {
          const isActive = activeMode === item.id;
          return (
            <button
               key={item.id}
               onClick={() => {
                 setActiveMode(item.id as any);
                 setStage('landing');
                 setShowChat(false);
               }}
              className={`prism-subnav-btn flex shrink-0 whitespace-nowrap items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon size={16} className={isActive ? 'animate-pulse' : ''} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto transition-all'}`}>
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
        appName="Orange" 
      />

      <main data-app-scroll-root className="flex-1 w-full pt-page pb-page md:pt-page-md md:pb-page-md flex flex-col relative z-10 overflow-y-auto no-scrollbar scroll-smooth text-white">
        <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 prism-xs-pad flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
              {activeMode === 'secret' ? (
                  <motion.div key="secret" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full min-w-0 pb-36 sm:pb-32 flex flex-col items-stretch">
                     {renderDailySecret()}
                  </motion.div>
               ) : activeMode === 'bible' ? (
                  <motion.div key="bible" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-32">
                     <div className="space-y-10">
                        <SecretBible onConsult={(text) => { openLucyChat('orange'); sendUnifiedMessage(text, 'orange'); }} />
                     </div>
                  </motion.div>
               ) : activeMode === 'simple' ? (
                 <motion.div key="simple" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center pt-24 pb-40">
                    <div className="w-full max-w-2xl glass p-5 md:p-12 rounded-[28px] md:rounded-[64px] border border-orange-500/30 shadow-2xl relative overflow-hidden group">
                       <div className="absolute inset-0 bg-orange-500/10 blur-[100px] rounded-full scale-110 group-hover:scale-125 transition-transform" />
                       <div className="relative z-10 space-y-6 md:space-y-12 text-white">
                          <div className="flex flex-col items-center gap-4 md:gap-6 text-center">
                             <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[32px] bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/30 shadow-2xl animate-pulse">
                                <Sparkles size={32} className="md:w-10 md:h-10" />
                             </div>
                             <h3 className="text-2xl md:text-5xl font-sans text-white font-bold tracking-tighter text-center">Flux Consultation</h3>
                             <p className="text-[10px] md:text-sm text-orange-500/60 uppercase tracking-[0.25em] md:tracking-[0.4em] font-sans font-black text-center">아이디어의 정수를 잇는 빠른 통찰</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {smartSuggestions.map((q) => (
                                <button 
                                  key={q} 
                                  onClick={() => { openLucyChat('orange'); sendUnifiedMessage(q, 'orange'); }} 
                                  className="px-6 py-6 rounded-[28px] bg-white/5 hover:bg-white/15 border border-white/10 transition-all text-sm sm:text-base text-left text-white/80 hover:text-white flex items-start justify-between gap-3 group/btn font-sans font-bold shadow-xl backdrop-blur-md"
                                >
                                   <span className="leading-tight">"{q}"</span>
                                   <ChevronRight size={20} className="mt-0.5 shrink-0 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-3 group-hover/btn:translate-x-0 text-orange-400" />
                                </button>
                              ))}
                          </div>
                       </div>
                    </div>
                 </motion.div>
              ) : null}
              {null}
              {activeMode === 'landing' ? (
                <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex-1 w-full flex flex-col items-center justify-start md:justify-center pt-6 pb-24 md:pt-16 md:pb-32 text-center lg:text-left gap-6 md:gap-12">
                     <div className="w-full max-w-5xl mx-auto animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                          
                          {/* Left Column: Visual Hub & Title & Description */}
                          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 md:space-y-12">
                            {/* Resonance Indicator Circle */}
                            <div className="relative group mx-auto lg:mx-0 w-fit mb-4">
                               <div className="absolute inset-0 bg-orange-500/30 blur-[80px] rounded-full scale-125 animate-pulse transition-all duration-300 group-hover:bg-orange-500/40" />
                               <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5 border border-orange-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.1)] transition-all duration-500 group-hover:scale-110 group-hover:border-orange-400/60 group-hover:shadow-[0_0_60px_rgba(249,115,22,0.3)] backdrop-blur-md">
                                  <div className="absolute inset-0 bg-white/5 rounded-full pointer-events-none" />
                                  <div 
                                    onClick={() => handleResonanceSync()}
                                    className="relative z-20 cursor-pointer active:scale-95 transition-all text-orange-400 font-bold group flex flex-col items-center justify-center"
                                    title="양자 의식 공명 조율 및 시냅스 정렬"
                                  >
                                    <TreeDeciduous size={64} className="relative z-10 w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_24px_currentColor] transition-transform group-hover:rotate-12 duration-700 animate-pulse group-hover:scale-105" strokeWidth={1} />
                                    <span className="absolute -bottom-7 md:-bottom-9 text-[9px] font-black tracking-[0.2em] md:tracking-[0.25em] text-orange-400/90 uppercase whitespace-nowrap md:animate-bounce font-mono">
                                      [ ATTUNE RESONANCE ]
                                    </span>
                                  </div>
                               </div>
                            </div>

                            {/* Main Titles */}
                            <div className="space-y-6">
                              <p className="text-4xl sm:text-5xl md:text-7xl font-display tracking-widest text-white leading-tight uppercase font-bold">
                                Deep
                                <br />
                                <span className="text-orange-400">Focus</span>
                              </p>
                              <p className="text-xs sm:text-sm md:text-base text-white/40 font-sans max-w-lg mx-auto lg:mx-0 leading-6 md:leading-relaxed tracking-wide px-2 md:px-0">
                                흩어지는 생각들을 모아 강력한 몰입의 에너지를 만듭니다.
                                <br className="hidden md:inline" /> ORANGE와 함께 복잡한 뇌내 회로를 정돈하고,
                                <br className="hidden md:inline" /> 작은 가능성을 거대한 현실의 결과물로 증폭시키세요.
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Audio Synchronizer & Memory Guides */}
                          <div className="lg:col-span-6 w-full space-y-6 md:space-y-8">
                            {/* Cosmic Binaural Beats Player Widget */}
                            <div className="mx-auto lg:mx-0 w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white/5 border border-orange-500/20 backdrop-blur-xl flex flex-col items-center gap-4 shadow-xl hover:border-orange-500/40 transition-all duration-300">
                              <div className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center justify-between gap-2 w-full border-b border-white/5 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlayingBinaural ? 'bg-orange-400' : 'bg-white/30'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlayingBinaural ? 'bg-orange-500' : 'bg-white/40'}`}></span>
                                  </span>
                                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] font-mono">Cosmic Binaural Beats</span>
                                </div>
                                <span className="text-[10px] font-bold text-orange-400 font-mono">
                                  {currentBinauralTrack ? `${currentBinauralTrack.carrier}Hz + ${currentBinauralTrack.beat}Hz` : '528Hz + 40Hz'}
                                </span>
                              </div>
                              <BinauralRandomPlayControl
                                appId="orange"
                                binauralList={binauralList}
                                currentBinauralTrack={currentBinauralTrack}
                                setCurrentBinauralTrack={setCurrentBinauralTrack}
                                isPlayingBinaural={isPlayingBinaural}
                                setIsPlayingBinaural={setIsPlayingBinaural}
                                defaultTrackName="아이디어 몰입 (200Hz)"
                              />

                              {/* List of custom and preset beats */}
                              {binauralList.length > 0 && (
                                <div className="w-full mt-2 border-t border-white/5 pt-3 flex flex-col gap-2 max-h-40 overflow-y-auto no-scrollbar">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.1em]">My Wave Patterns</span>
                                    <span className="text-[8px] text-orange-400 font-mono">{binauralList.length} Tracks</span>
                                  </div>
                                  {binauralList.map((track) => {
                                    const isThisTrackPlaying = isPlayingBinaural && getActiveBinauralTrackId() === track.id;
                                    const isThisSelected = currentBinauralTrack?.id === track.id;
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
                                          isThisSelected ? 'bg-white/10 border border-orange-500/20' : 'bg-white/[0.02] border border-transparent hover:bg-white/5'
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0 pr-2 text-left">
                                          <h5 className={`text-[11px] font-medium leading-tight truncate ${isThisTrackPlaying ? 'text-orange-400' : 'text-white/80'}`}>
                                            {track.name}
                                          </h5>
                                          <p className="text-[9px] text-white/40 truncate mt-0.5">{track.carrier}Hz + {track.beat}Hz • {track.desc}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {track.isCustom && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteCustomBinauralBeat(track.id);
                                                if (currentBinauralTrack?.id === track.id) {
                                                  stopBinauralBeat();
                                                  setIsPlayingBinaural(false);
                                                }
                                                refreshBinauralBeats();
                                              }}
                                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                                              title="Delete Track"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          )}
                                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isThisTrackPlaying ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-white/5 text-white/40'}`}>
                                            {isThisTrackPlaying ? (
                                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                            ) : (
                                              <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {false && (
                              <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass max-w-lg mx-auto p-6 rounded-[28px] border border-orange-500/20 text-left relative overflow-hidden backdrop-blur-xl shadow-xl mt-4"
                              >
                                <div className="absolute inset-0 bg-orange-500/[0.02] pointer-events-none" />
                                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em]">
                                  <TreeDeciduous size={12} className="animate-pulse" />
                                  <span>Orange Alignment Guide</span>
                                </div>
                                <p className="text-xs md:text-sm text-orange-100/70 font-sans leading-relaxed break-keep">
                                  {sharedState.orangeMemory}
                                </p>
                              </motion.div>
                            )}
                          </div>
                     </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </main>

          <AnimatePresence>
            {isDailyOracleLoading && (
              <motion.div 
                key="oracle-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center glass backdrop-blur-3xl"
              >
                <div className="flex flex-col items-center gap-8">
                   <div className="relative">
                      <div className="absolute inset-0 bg-orange-500/20 blur-3xl animate-pulse rounded-full" />
                      <RefreshCw className="text-orange-400 animate-spin" size={60} />
                   </div>
                   <div className="text-center space-y-2">
                     <p className="text-2xl font-display text-white  tracking-widest animate-pulse font-bold">Consulting the Oracle...</p>
                     <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.4em] font-sans">마음의 주파수를 정렬하고 있습니다</p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showChat && (
              <>
                {/* Click outside to close */}
                <div 
                  className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm cursor-pointer"
                  onClick={() => { setShowChat(false); stopTTS(); }}
                />
                <motion.div 
                  initial={{ opacity: 0, y: 50, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 20, scale: 0.95 }} 
                  className="fixed inset-0 md:inset-auto md:bottom-28 md:right-8 md:w-[450px] md:h-[650px] md:max-h-[85vh] z-[150] p-4 flex items-center justify-center md:p-0 pointer-events-none"
                >
                  <div 
                    className="w-full h-full max-h-[80vh] md:max-h-full flex flex-col bg-[#0b0b14]/95 md:bg-[#0c0f1d]/90 md:backdrop-blur-3xl rounded-[32px] md:rounded-[40px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                   
                   <div className="hidden flex items-center justify-between border-b border-white/10 p-6 shrink-0 bg-orange-900/10 relative z-10">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-[28px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                            <TreeDeciduous size={24} />
                         </div>
                         <div className="text-left">
                            <h3 className="text-2xl font-display font-bold  text-white tracking-tight">Orange Sync Room</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-sans">아이디어 창조와 융합의 전당</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                           onClick={() => {
                             playConversation(messages, 'Charon');
                           }} 
                           title="전체 대화 읽기"
                           className="relative p-4 rounded-full hover:bg-white/5 text-white/20 hover:text-orange-400 transition-all"
                         >
                           <Volume2 size={24}/>
                         </button>
                         <button onClick={() => { setShowChat(false); stopTTS(); }} className="relative p-4 rounded-full hover:bg-white/5 text-white/20 transition-all">
                           <X size={24}/>
                         </button>
                      </div>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 flex flex-col bg-slate-950/20 relative min-h-0 z-10 scroll-smooth premium-scroll">
                      {messages.length === 0 && (
                         <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-20">
                            <TreeDeciduous size={48} className="text-orange-400 animate-pulse" />
                            <p className="text-lg font-sans text-white">"오렌지가 당신의 아이디어에 귀를 기울이고 있습니다..."</p>
                         </div>
                       )}
                      {messages.map((m, i) => (
                         <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            <div className={`max-w-[85%] rounded-[24px] px-6 py-4 ${
                              m.role === 'user' 
                                ? 'bg-orange-600 text-white rounded-br-none shadow-lg shadow-orange-500/20' 
                                : 'bg-white/5 border border-white/10 text-orange-50 rounded-bl-none'
                            }`}>
                              {m.role === 'user' ? (
                                <p className="whitespace-pre-wrap font-sans leading-relaxed text-[15px]">{m.content}</p>
                              ) : (
                                <Streamdown>{cleanOrangeChatText(m.content)}</Streamdown>
                              )}
                              {m.image && <img src={m.image} className="w-40 mt-4 rounded-xl" />}
                            </div>
                            {m.role !== 'user' && (
                               <TTSButton text={m.content} voice="Charon" className="shrink-0 mb-1" />
                            )}
                         </div>
                      ))}
                      <div ref={chatEndRef} className="h-4" />
                   </div>

                   <div className="p-4 border-t border-white/10 shrink-0 bg-white/5 backdrop-blur-md z-50 flex flex-col gap-4 relative">
                                           <AnimatePresence>
                                             {poeInsight && (
                                               <motion.div
                                                 initial={{ opacity: 0, y: 10 }}
                                                 animate={{ opacity: 1, y: 0 }}
                                                 exit={{ opacity: 0, y: 10 }}
                                                 className="mx-2 bg-orange-900/40 border border-orange-500/20 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300"
                                               >
                                                 <div 
                                                   onClick={() => setIsInsightCollapsed(!isInsightCollapsed)}
                                                   className="p-4 flex items-center justify-between cursor-pointer hover:bg-orange-500/5 active:bg-orange-500/10 transition-colors select-none"
                                                 >
                                                   <div className="flex items-center gap-3">
                                                     <Sparkles size={16} className="text-orange-400 animate-pulse" />
                                                     <div className="text-[10px] font-bold text-orange-300 uppercase tracking-widest font-mono">
                                                       {poeInsight.category} • 실시간 창의적 통찰
                                                     </div>
                                                   </div>
                                                   <div className="flex items-center gap-2">
                                                     <span className="text-[10px] text-orange-300/60 font-sans">
                                                       {isInsightCollapsed ? "펼치기" : "접기"}
                                                     </span>
                                                     <ChevronDown 
                                                       size={14} 
                                                       className={`text-orange-400 transition-transform duration-300 ${isInsightCollapsed ? "" : "rotate-180"}`} 
                                                     />
                                                   </div>
                                                 </div>
                                                 
                                                 {!isInsightCollapsed && (
                                                   <div className="px-4 pb-4 pt-0 text-sm text-white/80 leading-relaxed border-t border-orange-500/10 font-sans">
                                                     {poeInsight.insight}
                                                   </div>
                                                 )}
                                               </motion.div>
                                             )}
                                           </AnimatePresence>
                      <div 
                        onWheel={(e) => {
                          if (e.currentTarget) {
                            const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                            e.currentTarget.scrollLeft += delta * 1.5;
                          }
                        }}
                        className="flex items-center gap-2 overflow-x-auto select-none px-2 pb-2 scroll-smooth [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]"
                      >
                        <button
                          type="button"
                          onClick={handleRefreshOrangeSuggestions}
                          className="flex-none p-2 rounded-full bg-white/5 border border-orange-500/10 text-orange-400/80 hover:text-orange-300 hover:bg-orange-500/15 transition-all shadow-md active:scale-95 cursor-pointer"
                          title="다른 걱정 질문 보기"
                        >
                          <RefreshCw size={11} className="animate-pulse" />
                        </button>
                        {orangeSuggestions.map((s, i) => (
                          <button key={i} onClick={() => setInput(s)} className="flex-none px-4 py-2 rounded-2xl bg-white/5 border border-orange-500/15 text-xs text-orange-300/90 hover:text-orange-200 hover:bg-orange-500/20 hover:border-orange-500/30 transition-all font-sans whitespace-nowrap cursor-pointer active:scale-95">
                             {s}
                          </button>
                        ))}
                      </div>                       <div className="relative group p-2 bg-white/10 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-2xl focus-within:border-orange-500/50 transition-all flex items-center border-white/10 pr-16 pl-3">
                         <button 
                           onClick={() => playConversation(messages, 'Charon')} 
                           title={isTTSActive ? "재생 멈추기" : "전체 대화 듣기"}
                           className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-orange-400 hover:bg-white/5 transition-all shrink-0 mr-1"
                         >
                           {isTTSActive ? <VolumeX size={18} className="text-orange-400 animate-pulse" /> : <Volume2 size={18} className="text-orange-400" />}
                         </button>
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}
                          placeholder="ORANGE에게 속마음을 털어놔보세요..." className="w-full h-14 bg-transparent pl-2 pr-16 text-sm text-white focus:outline-none font-sans placeholder:text-white/20" />
                        <button onClick={() => handleChat()} disabled={isSending} className="absolute right-2 top-2 w-12 h-12 rounded-[24px] bg-orange-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-30">
                            {isSending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} className="translate-x-0.5 -translate-y-0.5" />}
                        </button>
                      </div>
                    </div>
                 </div>
               </motion.div></>)}
          </AnimatePresence>
        

        {/* Global Portals for Orange Daily and Soul Modals */}
        <AnimatePresence>
          {showSecretModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[250] bg-zinc-950/95 backdrop-blur-3xl overflow-y-auto w-full h-full flex flex-col font-sans p-6 md:p-12 scrollbar-none"
              onClick={() => setShowSecretModal(false)}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-5xl mx-auto flex-1 flex flex-col gap-6 text-left"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <div className="flex items-center justify-between relative z-10 border-b border-white/5 pb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                         <KeyRound size={18} className="text-amber-400 animate-pulse" />
                      </div>
                      <div>
                         <span className="text-[9px] font-black text-amber-500/55 uppercase tracking-[0.3em] block leading-none mb-1 font-mono">DAILY</span>
                         <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">오늘의 시크릿</span>
                      </div>
                   </div>
                   <button onClick={() => setShowSecretModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                      <X size={16} />
                   </button>
                </div>

                <div className="relative z-10 w-full overflow-x-hidden">
                  {renderDailySecret()}
                </div>
              </div>
            </motion.div>
          )}

          {showPictureDiaryModal && (
            <PictureDiaryModal
              isOpen={showPictureDiaryModal}
              onClose={() => setShowPictureDiaryModal(false)}
            />
          )}

          {showDailyModal && dailyResult && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/90 sm:bg-black/80 backdrop-blur-md"
              onClick={() => setShowDailyModal(false)}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-[#0c0c12] border border-orange-500/30 p-5 sm:p-8 md:p-12 text-left flex flex-col gap-6 overflow-y-auto rounded-[28px] sm:rounded-[48px] shadow-2xl relative z-10"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                         <Sparkles size={18} className="text-orange-400" />
                      </div>
                      <div>
                         <span className="text-[9px] font-black text-orange-500/50 uppercase tracking-[0.3em] block leading-none mb-1">Orange Oracle</span>
                         <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">오늘의 영적 선언</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <TTSButton text={dailyResult.diagnosis} voice="Charon" className="text-orange-400 border-orange-500/20" />
                      <button onClick={() => setShowDailyModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                         <X size={16} />
                      </button>
                   </div>
                </div>

                <div className="space-y-6 relative z-10">
                   <div className="space-y-4">
                      <div className="text-base sm:text-lg text-white/90 font-sans leading-relaxed [&>h3]:text-orange-300 [&>h3]:text-xl [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>p]:mb-4">
                         <Streamdown>{dailyResult.diagnosis}</Streamdown>
                      </div>
                      <div className="h-[1px] w-full bg-gradient-to-r from-orange-500/30 via-orange-500/10 to-transparent" />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div className="md:col-span-3 p-6 md:p-8 rounded-[32px] bg-orange-500/5 border border-orange-500/10">
                         <div className="flex items-center gap-2 mb-4">
                            <Star size={14} className="text-orange-400" />
                            <span className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">Oracle Remedy</span>
                         </div>
                         <p className="text-sm md:text-base text-white/80 font-sans leading-relaxed">
                            {dailyResult.remedy}
                         </p>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 gap-3">
                         {[
                            { l: 'Symbol', v: dailyResult.symbol, c: '#818cf8' },
                            { l: 'Freq', v: dailyResult.frequency, c: '#34d399' }
                         ].map(item => (
                            <div key={item.l} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center gap-1 group hover:border-orange-500/20 transition-all">
                               <span className="text-[8px] text-white/20 uppercase tracking-widest group-hover:text-orange-400/40 transition-colors">{item.l}</span>
                               <span className="text-xs font-bold truncate max-w-full" style={{ color: item.c }}>{item.v}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                   
                   <DailyBgmSection
                     appId="orange"
                     dailyResult={dailyResult}
                     onPersist={(patch) => setDailyResult((prev: any) => (prev ? { ...prev, ...patch } : prev))}
                     accentClass="text-orange-300"
                     borderClass="border-orange-500/30"
                     buttonClass="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-300"
                     iconClass="text-orange-400"
                   />

                   <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-4">
                         <div className="flex -space-x-2">
                            {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/5 border border-white/20" />)}
                         </div>
                         <span className="text-[9px] text-white/20 uppercase tracking-widest">Connecting with your creative spark</span>
                      </div>
                      <button 
                        onClick={() => { openLucyChat('orange'); sendUnifiedMessage(`오늘의 오렌지 오라클 "${dailyResult.diagnosis}"에 대해 더 깊이 알고 싶어.`, 'orange'); }}
                        className="flex items-center gap-2 text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-widest group"
                      >
                         Deep Insight <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                   </div>
                   <div className="border-t border-white/5 pt-4 flex justify-end shrink-0 relative z-20 font-sans">
                     <button
                       onClick={() => setShowDailyModal(false)}
                       className="px-6 py-2 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold transition-all shadow-lg active:scale-95 duration-200"
                     >
                       확인
                     </button>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {false && showSoulModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/95 sm:bg-black/80 backdrop-blur-md font-sans"
              onClick={() => setShowSoulModal(false)}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] bg-[#0c0c12] border border-orange-500/30 p-5 sm:p-8 md:p-12 text-left flex flex-col gap-6 overflow-y-auto rounded-[28px] sm:rounded-[48px] shadow-2xl relative z-10 font-sans"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
                
                <div className="flex items-center justify-between border-b border-orange-500/10 pb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <User size={22} className="text-orange-400" />
                    <span className="text-sm font-mono tracking-widest text-orange-400 font-bold uppercase">
                      Synapse Mirror (시냅스 거울 분석 결과)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isMeasuringInsight && insightResult && (
                      <TTSButton text={insightResult.guidance} voice="Charon" className="text-orange-400 border-orange-500/20" />
                    )}
                    <button onClick={() => setShowSoulModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-all shrink-0">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 space-y-6">
                  {isMeasuringInsight ? (
                     <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Zap size={32} className="text-orange-500 animate-spin" />
                        <span className="text-xs text-white/40 font-mono tracking-widest uppercase">Analyzing your energy state...</span>
                     </div>
                  ) : insightResult ? (
                    <div className="space-y-10 px-2 text-white">
                       <div className="w-full bg-white/[0.01] border border-orange-500/20 p-8 rounded-[40px] shadow-[0_0_50px_rgba(249,115,22,0.05)] text-left">
                          <div className="flex items-center gap-3 mb-8">
                             <Zap size={22} className="text-orange-400" />
                             <span className="text-sm font-bold text-orange-500 tracking-[0.4em] uppercase">The Idea Decree</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                             <StatBar label="Creativity" value={insightResult.luckScore || 0} color="#f97316" />
                             <StatBar label="Passion" value={insightResult.loveScore || 0} color="#ef4444" />
                             <StatBar label="Focus" value={insightResult.wealthScore || 0} color="#22c55e" />
                             <StatBar label="Vitality" value={insightResult.healthScore || 0} color="#eab308" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 font-sans font-medium uppercase tracking-tight text-center">
                            {[
                               { label: '동기화 상태', v: translateEnglishValue(insightResult.deepSyncLevel || 'OPTIMAL'), c: 'text-orange-400' },
                               { label: '파워 아이템', v: translateEnglishValue(insightResult.luckyItem), c: 'text-orange-300' },
                               { label: '집중 색상', v: translateEnglishValue(insightResult.luckyColor), c: 'text-yellow-400' }
                            ].map(i => (
                              <div key={i.label} className="p-6 bg-white/[0.03] border border-white/5 rounded-[30px] flex flex-col items-center justify-center">
                                <span className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-sans font-bold">{i.label}</span>
                                <span className={`text-base ${i.c}`}>{i.v}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-6 text-left">
                            <div className="p-6 md:p-8 bg-orange-500/10 border border-orange-500/20 rounded-[32px] font-sans text-white text-sm">
                               <div className="flex items-center gap-3 mb-4">
                                                       <Sparkles size={18} className="text-orange-400 animate-pulse" />
                                                       <div className="flex flex-col text-left">
                                                         <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest leading-none">Master's Guidance</span>
                                                         <span className="text-[9px] text-white/40 font-sans mt-1 leading-none">오늘 하루의 구체적 행동 지침과 따뜻한 심리 멘토링 조언입니다.</span>
                                                       </div>
                                                    </div>
                               <div className="text-sm sm:text-base text-white/90 font-sans leading-relaxed">
                                  <Streamdown>{insightResult.guidance}</Streamdown>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 bg-orange-500/5 rounded-[32px] border border-orange-500/20 font-sans text-white/70 leading-relaxed relative overflow-hidden backdrop-blur-md shadow-[0_4px_30px_rgba(249,115,22,0.05)] text-left">
                                                   <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                                   <div className="flex items-center gap-2.5 mb-3">
                                                     <div className="p-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                                       <Coins size={14} className="animate-pulse" />
                                                     </div>
                                                     <div className="flex flex-col">
                                                       <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none">Abundance Current & Achievement Alchemy</span>
                                                       <span className="text-[9px] text-white/40 mt-0.5 font-sans leading-none">풍요의 흐름과 연금술적 성취 분석</span>
                                                     </div>
                                                   </div>
                                                   <p className="text-[10px] text-white/50 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 mb-3 leading-relaxed font-sans font-medium">
                                                     ✨ 물질적인 부의 에너지 순환과 잠재된 아이디어의 금맥을 깨우기 위해 필요한 운명적 흐름과 정렬 상태입니다.
                                                   </p>
                                                   <div className="text-xs sm:text-sm text-white/90 font-sans leading-relaxed text-left">
                                                     <Streamdown>{insightResult.cosmicAspect}</Streamdown>
                                                   </div>
                                                 </div>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto bg-white/[0.02] border border-white/5 p-16 rounded-[40px] flex flex-col items-center justify-center text-center space-y-8 min-h-[400px]">
                       <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-orange-500 shadow-inner">
                          <Sparkles size={32} />
                       </div>
                       <div className="space-y-4 max-w-sm">
                         <h3 className="text-2xl font-display text-white">Initialize Synapse Analysis</h3>
                         <p className="text-sm font-sans text-white/40 leading-relaxed">자신의 시냅스 거울과 아이디어 심연 분석 결과 데이터를 확인하세요.</p>
                       </div>
                       <button onClick={() => handleEnergyAnalysis()} className="px-10 py-4 rounded-[28px] bg-white text-orange-950 font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">Analyze Synapse Mirror</button>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-end shrink-0 relative z-20">
                  <button onClick={() => setShowSoulModal(false)} className="px-6 py-2 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-lg select-none">
                    확인
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subconscious Resonance Attunement Modal */}
        <AnimatePresence>
          {isResonanceModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${resonanceModalOverlayClass} z-[1100] glass backdrop-blur-3xl`}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className={`${resonanceModalPanelClass} bg-black/80 backdrop-blur-md border border-orange-500/30 shadow-[0_0_80px_rgba(249,115,22,0.25)] my-2 sm:my-8`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Orange dynamic background glows */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full filter blur-[100px] -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full filter blur-[100px] translate-y-1/2 pointer-events-none" />

                {resonanceProgress < 100 ? (
                  // Loading Diagnostic Sequence
                  <div className="space-y-10 py-12 relative z-10">
                    <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 border-[3px] border-orange-500/10 rounded-full" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-[3px] border-t-orange-400 border-r-amber-500 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-[0_0_35px_rgba(249,115,22,0.5)]"
                      >
                        <Zap size={28} className="text-white fill-white/20" />
                      </motion.div>
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-xl md:text-2xl font-bold tracking-widest text-orange-400 font-sans uppercase">
                        오늘 상태 분석 중
                      </h2>
                      <p className="text-xs text-white/40 font-mono tracking-widest leading-relaxed">
                        REALIGNING CORTEX SYNAPSES WITH THE QUANTUM SLATE...
                      </p>
                    </div>

                    <div className="w-full max-w-xs mx-auto space-y-2">
                      <div className="flex justify-between text-xs font-mono text-orange-300">
                        <span>RESONATING COGNITION</span>
                        <span className="font-bold">{resonanceProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <motion.div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                          style={{ width: `${resonanceProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-white/30 font-mono tracking-widest flex flex-col gap-1 uppercase">
                      <span>• TARGET ACTION: Focus and Brainwave Alignment</span>
                      <span>• TUNING FILTER: 40Hz Gamma-wave Cognitive Boost</span>
                    </div>
                  </div>
                ) : (
                  // Attunement Report Screen (Perfect structured layout)
                  <div className="space-y-8 text-left relative z-10 pt-4 pb-2 min-w-0">
                    <div className="flex items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.15)] shrink-0 animate-pulse">
                        <Sparkles size={26} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-orange-400/80 font-mono">Cognitive Resonance Alignment</span>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white/95 uppercase font-sans mt-0.5 break-words leading-snug">
                          오늘 맞춤 코칭
                        </h2>
                      </div>
                    </div>

                    {/* Coherence rating meter and Live metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white/[0.02] border border-white/5 rounded-[32px] p-6 backdrop-blur-sm">
                      {/* Coherence radial */}
                      <div className="md:col-span-5 text-center flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-4 font-mono">오늘 컨디션</span>
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-transparent" strokeWidth="6" />
                            <motion.circle
                              cx="56"
                              cy="56"
                              r="48"
                              className="stroke-orange-400 fill-transparent shadow-lg"
                              strokeWidth="6"
                              strokeDasharray={2 * Math.PI * 48}
                              initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                              animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - (resonanceData?.coherence ?? 85) / 100) }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-mono font-bold text-orange-300">{resonanceData?.coherence}%</span>
                            <span className="text-[9px] text-white/30 tracking-widest font-mono">COHERENCE</span>
                          </div>
                        </div>
                      </div>

                      {/* Param bars */}
                      <div className="md:col-span-7 space-y-3 w-full border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-white/50">
                            <span>집중 몰입 시간 (Focus Time)</span>
                            <span className="text-white/80">{sharedState?.productivityMetrics?.focusTime ?? 40}분</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]" style={{ width: `${Math.min(100, (sharedState?.productivityMetrics?.focusTime ?? 40) * 1.5)}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-white/50">
                            <span>스트레스 누적 (Stress Level)</span>
                            <span className="text-white/80">{sharedState?.healthMetrics?.stressLevel ?? 30}/100</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]" style={{ width: `${sharedState?.healthMetrics?.stressLevel ?? 30}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-white/50">
                            <span>완료된 창작 과업 (Tasks Metric)</span>
                            <span className="text-white/80">{sharedState?.productivityMetrics?.tasksCompleted ?? 1}개 완료</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 shadow-[0_0_8px_rgba(234,179,8,0.3)]" style={{ width: `${Math.min(100, (sharedState?.productivityMetrics?.tasksCompleted ?? 1) * 20)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Merged Soul Resonance Alignment Stats */}
                    <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-[32px] space-y-6 relative min-w-0">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-orange-400 shrink-0" />
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-mono break-words">나의 상태</span>
                      </div>

                      <ResonanceStatBarGrid>
                        <StatBar label="Creativity" value={resonanceData?.luckScore ?? 80} color="#f97316" />
                        <StatBar label="Passion" value={resonanceData?.loveScore ?? 75} color="#ef4444" />
                        <StatBar label="Focus" value={resonanceData?.wealthScore ?? 85} color="#22c55e" />
                        <StatBar label="Vitality" value={resonanceData?.healthScore ?? 70} color="#eab308" />
                      </ResonanceStatBarGrid>

                      <ResonancePillGrid
                        pills={[
                          { label: "동기화", value: resonanceData?.deepSyncLevel || "PEAK", valueClassName: "text-orange-400" },
                          { label: "파워 아이템", value: resonanceData?.luckyItem || "나무 연필", valueClassName: "text-orange-300" },
                          { label: "집중 색상", value: resonanceData?.luckyColor || "Vibrant Orange", valueClassName: "text-yellow-400" },
                        ]}
                      />

                      {resonanceData?.guidance && (
                        <ResonanceNoteCard label="오늘 할 일" labelClassName="text-orange-400">
                          {resonanceData.guidance}
                        </ResonanceNoteCard>
                      )}

                      {resonanceData?.cosmicAspect && (
                        <ResonanceNoteCard label="⚡ ALCHEMY ANALYSIS (풍요 및 성취 패턴)" labelClassName="text-amber-400">
                          {resonanceData.cosmicAspect}
                        </ResonanceNoteCard>
                      )}
                    </div>

                    {/* Spectral frequency definition and Shield Token */}
                    <div className="space-y-4 min-w-0">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">Attuned Subconscious Spectrum</span>
                        <p className="text-sm font-bold text-orange-400 font-sans leading-relaxed break-words">
                          {resonanceData?.bandText}
                        </p>
                        <p className="text-xs text-white/60 font-sans leading-relaxed break-words">
                          {resonanceData?.freqText}
                        </p>
                      </div>

                      <ResonanceShieldCard
                        badge="QUANTUM COGNITIVE SHIELD"
                        token={resonanceData?.shieldToken || ""}
                        gradientClass="from-orange-500/10 via-amber-500/5 to-transparent"
                        borderClass="border-orange-500/30"
                        accentBarClass="bg-orange-400"
                        badgeClass="text-orange-400/80"
                        iconClass="text-orange-400"
                        Icon={ShieldCheck}
                      />
                    </div>

                    {/* Prescription */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">Deciphered Subconscious Prescription</span>
                      <p className="text-xs md:text-sm text-white/80 font-sans leading-relaxed break-words">
                        {resonanceData?.prescription}
                      </p>
                    </div>

                    {/* Immediate Action Advice */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1 text-left">
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block font-mono">★ 극약 시냅스 정렬 임무 (Subconscious Action)</span>
                      <p className="text-xs text-white/90 font-sans font-medium leading-relaxed break-words">
                        {resonanceData?.advice}
                      </p>
                    </div>

                    {/* Modal Action buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <ResonanceTTSButton
                        data={resonanceData}
                        app="orange"
                        className="border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
                      />
                      <button
                        onClick={() => setIsResonanceModalOpen(false)}
                        className="flex-1 py-4.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold tracking-widest hover:text-white shadow-[0_0_30px_rgba(249,115,22,0.25)] active:scale-95 transition-all text-xs md:text-sm cursor-pointer select-none text-center"
                      >
                        공명 자각 완료 (Authorize)
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {limitModalInfo && limitModalInfo.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]"
              onClick={() => setLimitModalInfo(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 70, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 70, opacity: 0 }}
                transition={{ type: "spring", stiffness: 75, damping: 18 }}
                className="glass p-8 max-w-md w-full rounded-[40px] border border-orange-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
                <button
                  onClick={() => setLimitModalInfo(null)}
                  className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={18} />
                </button>
                
                <div className="mx-auto w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                  <Lock className="text-orange-400 animate-pulse" size={28} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold font-sans text-white">Daily Connection Locked</h3>
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em]">{limitModalInfo.type === 'daily' ? '오늘의 데일리 오라클 완료' : '오늘의 소울 분석 완료'}</p>
                </div>

                <p className="text-sm text-white/60 leading-relaxed font-sans break-keep">
                  이 댑의 {limitModalInfo.type === 'daily' ? '데일리 비전' : '소울 분석'} 기능은 하루에 한 번만 실행할 수 있습니다. 이미 오늘의 주파수가 우주와 동조되었습니다. 에필로그에서 이전의 찬란했던 동조 기록들을 살펴보세요.
                </p>

                <button
                  onClick={() => {
                    setLimitModalInfo(null);
                    navigate('/epilogue');
                  }}
                  className="w-full py-4 rounded-[20px] bg-orange-500/20 text-orange-400 font-black uppercase tracking-[0.2em] border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)] hover:bg-orange-500/30 active:scale-95 transition-all text-xs"
                >
                  Go to Epilogue 🧪
                </button>
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
              className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto z-[9999]"
              onClick={() => setShowEmblemModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass p-8 md:p-10 max-w-lg w-full rounded-[48px] border border-orange-500/30 text-center space-y-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowEmblemModal(false)}
                  className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={18} />
                </button>

                <div className="mx-auto w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                  <TreeDeciduous className="text-orange-400 animate-pulse" size={40} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold font-sans text-white tracking-tight uppercase">Orange Sanctuary Lore</h3>
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.3em]">아이디어 연금술사</p>
                </div>

                <p className="text-sm text-orange-100/70 leading-relaxed font-sans text-left break-keep bg-white/5 p-6 rounded-3xl border border-orange-500/10">
                  <strong>ORANGE</strong>는 번득이는 영감의 불꽃을 피워내고, 흩어진 사색의 조각들을 정교하게 결합하는 아이디어 연금술사의 안식처입니다. 당신이 지닌 창조의 원동력과 잠재의식 속 무한한 아이디어 원석을 수렴하여 세상에 단 하나뿐인 혁신적인 가치로 조형해 낼 수 있도록 돕습니다.
                </p>

                <div className="space-y-4">
                  {[
                    { label: 'Creative Synthesis Velocity', val: 95, color: 'from-orange-400 to-amber-500' },
                    { label: 'Synaptic Flow Density', val: 90, color: 'from-amber-400 to-orange-400' },
                    { label: 'Conceptual Alchemy Coherence', val: 93, color: 'from-orange-500 to-red-600' }
                  ].map(spec => (
                    <div key={spec.label} className="space-y-1 text-left">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-white/60">{spec.label}</span>
                        <span className="text-orange-400 font-bold">{spec.val}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${spec.val}%` }} 
                          transition={{ duration: 1.2, ease: "easeOut" }} 
                          className={`h-full bg-gradient-to-r ${spec.color}`} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowEmblemModal(false)}
                  className="w-full py-4 rounded-[20px] bg-orange-600 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs"
                >
                  Sync Complete 🌀
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <NoticeModal isOpen={notice.open} onClose={() => setNotice(p => ({ ...p, open: false }))} title={notice.title} message={notice.message} />

    </div>
  );
}
