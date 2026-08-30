import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, RefreshCw, ShieldCheck, Eye, Activity, Maximize2, Download, BookOpen,
} from 'lucide-react';
import { ImageOutputActions, downloadImage } from '@/components/ImageOutputActions';
import { z } from 'zod';
import { auth, db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { invokeLLMStructured, buildDeepSynapseContext } from '@/lib/ai';
import { recordPrismFeature, recordDailyOracleResult } from '@/lib/prismOmniSync';
import {
  getTodayDateKey,
  getDailyLockKey,
  clearStaleDailyLocks,
  pickDailySeededItem,
  pickDailySeededCard,
  isTimestampToday,
} from '@/lib/dailyCache';
import { TTSButton } from '@/components/TTSButton';
import { Streamdown } from '@/components/Streamdown';
import { MeditationOverlay, RELEASE_THEMES, RELEASE_THEME_KEYS, type ReleaseType } from '@/components/heal/MeditationOverlay';
import { AURA_CARDS, type AuraThemeCard, getAuraCardSedonaRecommendation } from '@/lib/auraCards';
import { useApp } from '@/contexts/AppContext';
import { buildSpecificSedonaDailyOracle } from '@/lib/dailyTarotOracle';

const QuickInsightSchema = z.object({
  diagnosis: z.string().default('마음의 억압된 감정을 차분히 흘려보내고 평온을 회복합니다.'),
  luckyNumber: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().default('7'),
  luckyColor: z.string().optional().default('에메랄드 그린'),
  remedy: z.string().optional().default('호흡과 함께 가슴 속 긴장을 10초간 온전히 흘려보내기'),
  symbol: z.string().optional().default('방하착의 물결'),
  frequency: z.string().optional().default('528Hz'),
  spiritualEnergy: z.string().optional().default('에고의 저항을 녹이고 순수 의식의 평온을 회복합니다.'),
  blessingMessage: z.string().optional().default('모든 집착이 스러진 자리에 평온과 빛이 함께하기를 축복합니다.'),
});

function sedonaStorageKey(suffix: string) {
  return `heal_sedona_${getTodayDateKey()}_${suffix}`;
}

const SEDONA_CARD_MOOD: Record<string, string> = {
  white_purifier: 'pure white light, clarity, fresh dawn',
  emerald_healer: 'emerald green healing, nature, balance',
  indigo_sage: 'deep indigo wisdom, intuition, stillness',
  golden_sun: 'golden sunlight, abundance, confidence',
  crimson_fire: 'crimson fire, courage, vitality',
  solar_yellow: 'solar yellow, creativity, warmth',
  violet_mystic: 'violet mysticism, spiritual art, intuition',
  pink_harmony: 'soft pink love, compassion, harmony',
  turquoise_flow: 'turquoise flow, freedom, expression',
  silver_moon: 'silver moonlight, reflection, calm',
  amber_earth: 'amber earth grounding, stability, patience',
  coral_passion: 'coral warmth, joy, creative intimacy',
  rainbow_light: 'rainbow spectrum, integration, wholeness',
  obsidian_protection: 'obsidian shield, protection, purification',
  sapphire_peace: 'sapphire blue peace, trust, serenity',
  pearl_purity: 'pearl luminance, purity, inner beauty',
  copper_grounding: 'copper grounding, alignment, balance',
  platinum_evolution: 'platinum evolution, transcendence, renewal',
  bronze_strength: 'bronze strength, endurance, tradition',
  jade_balance: 'jade harmony, health, gentle fortune',
  crystal_clarity: 'crystal clarity, focus, transparency',
  cosmic_nebula: 'cosmic nebula, infinite space, surrender',
};

function buildSedonaCardArtPrompt(card: AuraThemeCard): string {
  const mood = SEDONA_CARD_MOOD[card.id] || card.name.toLowerCase();
  return [
    `Mystical oracle tarot card art, "${card.name}".`,
    `${mood}. Sedona releasing energy, emerald and amber glow, sacred geometry,`,
    'meditative watercolor digital painting, vertical tarot card, luminous atmosphere, no text, no watermark.',
  ].join(' ');
}

function getRandomArtSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % 1_000_000_000;
  }
  return Math.floor(Math.random() * 1_000_000_000);
}

function getRecentSedonaArtSeeds(): number[] {
  try {
    const raw = localStorage.getItem('heal_sedona_art_seed_history');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => Number.isInteger(value)).slice(-30)
      : [];
  } catch {
    return [];
  }
}

function rememberSedonaArtSeed(seed: number) {
  try {
    const recent = getRecentSedonaArtSeeds().filter((value) => value !== seed);
    localStorage.setItem('heal_sedona_art_seed_history', JSON.stringify([...recent, seed].slice(-30)));
  } catch {
    // Art generation remains available if storage is unavailable.
  }
}

function buildSedonaCardArtUrl(card: AuraThemeCard, seed: number, width = 800, height = 1280) {
  const prompt = buildSedonaCardArtPrompt(card).slice(0, 480);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

function preloadSedonaCardImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Sedona card image failed to load'));
    img.src = url;
  });
}

interface SedonaDailyViewProps {
  firebaseUser: { uid: string } | null;
  onDailyComplete?: () => void;
}

export function SedonaDailyView({ firebaseUser, onDailyComplete }: SedonaDailyViewProps) {
  const { sharedState, updateSharedState } = useApp();
  const todayKey = getTodayDateKey();
  const uid = firebaseUser?.uid || 'guest';

  const dailyCard = useMemo(
    () => pickDailySeededCard(AURA_CARDS as any, 'heal_sedona_card') as any,
    [todayKey],
  );

  const [drawnCard, setDrawnCard] = useState<AuraThemeCard & { isReversed?: boolean }>(dailyCard);

  const dailyThemeKey = useMemo(
    () => {
      const cardRecommendation = getAuraCardSedonaRecommendation(drawnCard || dailyCard);
      return cardRecommendation?.themeId || pickDailySeededItem(RELEASE_THEME_KEYS, 'heal_sedona_theme');
    },
    [drawnCard, dailyCard],
  );
  const [isFlipped, setIsFlipped] = useState<boolean>(() => {
    try {
      const today = getTodayDateKey();
      const flipped = localStorage.getItem(`heal_sedona_${today}_card_flipped`) === 'true';
      const meditationDone = localStorage.getItem(`heal_sedona_${today}_meditation_done`) === 'true';
      const savedOracle = Boolean(localStorage.getItem(`heal_sedona_${today}_oracle`));
      return flipped || meditationDone || savedOracle;
    } catch {
      return false;
    }
  });
  const [cardArtUrl, setCardArtUrl] = useState<string | null>(null);
  const [isCardArtLoading, setIsCardArtLoading] = useState(false);
  const [isCardArtOpen, setIsCardArtOpen] = useState(false);
  const cardArtAttemptRef = useRef(0);
  const cardArtGeneratingRef = useRef(false);

  const cardArtFilename = useMemo(
    () => `sedona-card-${drawnCard.nameKo}-${todayKey}`,
    [drawnCard.nameKo, todayKey],
  );
  const [meditationDone, setMeditationDone] = useState(false);
  const [completedTheme, setCompletedTheme] = useState<ReleaseType | null>(null);
  const [oracleResult, setOracleResult] = useState<any | null>(null);
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  const [isDailyComplete, setIsDailyComplete] = useState(false);
  const [showReport, setShowReport] = useState(true);

  const loadDailySession = useCallback(() => {
    clearStaleDailyLocks(uid);
    const completed = localStorage.getItem(getDailyLockKey('heal_sedona', uid)) === 'true';
    setIsDailyComplete(completed);

    setMeditationDone(localStorage.getItem(sedonaStorageKey('meditation_done')) === 'true');

    const savedTheme = localStorage.getItem(sedonaStorageKey('completed_theme')) as ReleaseType | null;
    setCompletedTheme(savedTheme || null);

    let activeCard = dailyCard;
    const savedCard = localStorage.getItem(sedonaStorageKey('card'));
    if (savedCard) {
      try {
        activeCard = JSON.parse(savedCard);
        setDrawnCard(activeCard);
      } catch {
        setDrawnCard(dailyCard);
      }
    } else {
      setDrawnCard(dailyCard);
      localStorage.setItem(sedonaStorageKey('card'), JSON.stringify(dailyCard));
    }

    const hasCloudDailyHeal = Boolean(
      sharedState?.todayOracles?.[todayKey]?.heal ||
      (sharedState?.latestDailyOracles?.heal && (sharedState.latestDailyOracles.heal as any).dateKey === todayKey) ||
      (sharedState?.lastHealDailySync && isTimestampToday(sharedState.lastHealDailySync))
    );

    const savedFlipped =
      localStorage.getItem(sedonaStorageKey('card_flipped')) === 'true' ||
      localStorage.getItem(sedonaStorageKey('meditation_done')) === 'true' ||
      Boolean(localStorage.getItem(sedonaStorageKey('oracle'))) ||
      hasCloudDailyHeal ||
      completed;

    if (savedFlipped) {
      setIsFlipped(true);
    }

    const artCacheKey = sedonaStorageKey(`card_art_${activeCard.id}`);
    const savedArt = localStorage.getItem(artCacheKey);
    if (savedArt) {
      setCardArtUrl(savedArt);
      setIsCardArtLoading(false);
      void preloadSedonaCardImage(savedArt).catch(() => {
        localStorage.removeItem(artCacheKey);
        setCardArtUrl(null);
      });
    } else {
      setCardArtUrl(null);
      setIsCardArtLoading(false);
    }

    let resolvedOracle: any = null;
    const savedOracle = localStorage.getItem(sedonaStorageKey('oracle')) ||
                        localStorage.getItem(`heal_sedona_oracle_${todayKey}`) ||
                        localStorage.getItem(`prism_daily_oracle_heal_${todayKey}`);
    if (savedOracle) {
      try {
        resolvedOracle = JSON.parse(savedOracle);
      } catch {
        resolvedOracle = null;
      }
    }

    if (!resolvedOracle) {
      const cloudToday = sharedState?.todayOracles?.[todayKey]?.heal;
      if (cloudToday) {
        resolvedOracle = cloudToday;
      } else if (sharedState?.latestDailyOracles?.heal) {
        const latest = sharedState.latestDailyOracles.heal as any;
        if (latest.dateKey === todayKey) {
          resolvedOracle = latest;
        }
      }
    }

    if (resolvedOracle && (resolvedOracle.diagnosis || resolvedOracle.remedy || resolvedOracle.prescription)) {
      setOracleResult(resolvedOracle);
      setIsFlipped(true);
      setShowReport(true);
      setIsDailyComplete(true);
      setMeditationDone(true);
    } else {
      setOracleResult(null);
    }
  }, [uid, dailyCard, sharedState?.todayOracles, sharedState?.latestDailyOracles, sharedState?.lastHealDailySync]);

  useEffect(() => {
    loadDailySession();
  }, [loadDailySession, todayKey]);

  const handleReleaseComplete = async (theme: ReleaseType) => {
    setMeditationDone(true);
    setCompletedTheme(theme);
    setIsFlipped(true);
    localStorage.setItem(sedonaStorageKey('card_flipped'), 'true');
    localStorage.setItem(sedonaStorageKey('meditation_done'), 'true');
    localStorage.setItem(sedonaStorageKey('completed_theme'), theme);

    if (!oracleResult && !isOracleLoading) {
      await generateDailyOracle(theme);
    }
  };

  const generateCardArt = useCallback(async (card: AuraThemeCard, startAttempt = 0) => {
    if (cardArtGeneratingRef.current) return;
    cardArtGeneratingRef.current = true;

    const cacheKey = sedonaStorageKey(`card_art_v2_${card.id}`);
    const cached = localStorage.getItem(cacheKey);

    if (cached && startAttempt === 0) {
      setIsCardArtLoading(true);
      try {
        await preloadSedonaCardImage(cached);
        setCardArtUrl(cached);
        setIsCardArtLoading(false);
        cardArtGeneratingRef.current = false;
        return;
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    setIsCardArtLoading(true);
    setCardArtUrl(null);

    const recentSeeds = new Set(getRecentSedonaArtSeeds());
    const maxAttempts = 3;
    for (let attempt = startAttempt; attempt < startAttempt + maxAttempts; attempt += 1) {
      let seed = getRandomArtSeed();
      while (recentSeeds.has(seed)) seed = getRandomArtSeed();
      recentSeeds.add(seed);
      const url = buildSedonaCardArtUrl(card, seed);
      try {
        await preloadSedonaCardImage(url);
        setCardArtUrl(url);
        localStorage.setItem(cacheKey, url);
        rememberSedonaArtSeed(seed);
        cardArtAttemptRef.current = attempt;
        setIsCardArtLoading(false);
        cardArtGeneratingRef.current = false;
        return;
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    setCardArtUrl(null);
    setIsCardArtLoading(false);
    cardArtGeneratingRef.current = false;
  }, []);

  const handleCardArtError = useCallback(() => {
    cardArtGeneratingRef.current = false;
    const cacheKey = sedonaStorageKey(`card_art_${drawnCard.id}`);
    localStorage.removeItem(cacheKey);
    setCardArtUrl(null);

    const nextAttempt = cardArtAttemptRef.current + 1;
    if (nextAttempt >= 5) {
      setIsCardArtLoading(false);
      return;
    }

    void generateCardArt(drawnCard, nextAttempt);
  }, [drawnCard, generateCardArt]);

  const handleCardClick = () => {
    setIsFlipped((prev) => {
      const next = !prev;
      localStorage.setItem(sedonaStorageKey('card_flipped'), next ? 'true' : 'false');
      if (next) {
        cardArtAttemptRef.current = 0;
        void generateCardArt(drawnCard);
      }
      return next;
    });
  };

  const generateDailyOracle = async (themeOverride?: ReleaseType) => {
    if (isOracleLoading || isDailyComplete) return;

    const activeTheme = themeOverride || completedTheme;
    setIsOracleLoading(true);
    try {
      let data: any = null;

      // Try fast dedicated server endpoint first
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const apiRes = await fetch('/api/ai/daily-sedona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            card: drawnCard,
            theme: activeTheme,
            profile: sharedState?.userProfile,
          }),
        });
        clearTimeout(timer);

        if (apiRes.ok) {
          const parsed = await apiRes.json();
          if (parsed && (parsed.diagnosis || parsed.summary)) {
            data = parsed;
          }
        }
      } catch (fetchErr) {
        console.warn('[Sedona Daily] Dedicated API fetch failed/timed out, using local specialized oracle engine:', fetchErr);
      }

      // Fallback to rich card-specific local engine if server response is unavailable
      if (!data || !data.diagnosis) {
        data = buildSpecificSedonaDailyOracle(drawnCard, activeTheme);
      }

      const finalData = { ...data, drawnCard };
      setOracleResult(finalData);
      setShowReport(true);
      setIsFlipped(true);
      localStorage.setItem(sedonaStorageKey('card_flipped'), 'true');
      localStorage.setItem(sedonaStorageKey('oracle'), JSON.stringify(finalData));
      localStorage.setItem(getDailyLockKey('heal_sedona', uid), 'true');
      setIsDailyComplete(true);

      // Non-blocking state update
      try {
        void updateSharedState({ lastHealDailySync: Date.now() }, 'HEAL');
      } catch (_) {}
      onDailyComplete?.();

      recordDailyOracleResult({
        app: 'heal',
        featureName: '세도나 방하착(감정 릴리즈)',
        cardName: `${drawnCard.nameKo} (${drawnCard.name})`,
        cardKeywords: drawnCard.keywords,
        cardDesc: drawnCard.desc,
        diagnosis: finalData.diagnosis || '',
        remedy: finalData.remedy || '',
        frequency: finalData.frequency || '528Hz',
      });

      if (firebaseUser && localStorage.getItem('developer_bypass') !== 'true') {
        void addDoc(collection(db, 'heal_history', firebaseUser.uid, 'entries'), {
          type: 'sedona_daily',
          title: `데일리 세도나 방하착 (${todayKey})`,
          content: finalData.diagnosis,
          createdAt: serverTimestamp(),
          metadata: { dateKey: todayKey, themeId: activeTheme, card: drawnCard.nameKo },
          ...finalData,
        }).catch((dbErr) => console.warn('Sedona history logging skipped', dbErr));
      }
    } catch (err) {
      console.warn('Sedona daily oracle error, recovering with local engine:', err);
      const fallbackData = { ...buildSpecificSedonaDailyOracle(drawnCard, activeTheme), drawnCard };
      setOracleResult(fallbackData);
      setShowReport(true);
      localStorage.setItem(sedonaStorageKey('oracle'), JSON.stringify(fallbackData));
      localStorage.setItem(getDailyLockKey('heal_sedona', uid), 'true');
      setIsDailyComplete(true);
    } finally {
      setIsOracleLoading(false);
    }
  };

  return (
    <div className="space-y-12 text-left animate-fade-in font-sans w-full max-w-6xl">
      <div className="text-center space-y-4 pt-4 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-mono tracking-widest uppercase">
          <ShieldCheck size={14} />
          <span>DAILY SEDONA METHOD · {todayKey}</span>
        </div>
        <h3 className="text-4xl md:text-5xl font-display text-white tracking-tighter font-bold">
          Sedona Release Station
        </h3>
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.4em] font-sans">
          세도나 4문답 흐름과 데이비드 호킨스 의식장 정렬
        </p>
        
        {isDailyComplete && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles size={12} />
            오늘의 데일리 방하착 완료 (1일 1회 완료)
          </div>
        )}
      </div>

      {isOracleLoading && (
        <div className="max-w-md mx-auto p-10 rounded-[32px] bg-zinc-950/90 border border-emerald-500/30 text-center space-y-4 backdrop-blur-xl shadow-2xl animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <RefreshCw size={24} className="animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-emerald-300 tracking-wide">세도나 방하착 심층 에너지 리포트 분석 중</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              무의식의 억압된 감정 전압을 흘려보내고 평온의 의식장을 동조하고 있습니다.
            </p>
          </div>
        </div>
      )}

      {oracleResult && !isOracleLoading ? (
        <div className="w-full rounded-[40px] bg-gradient-to-br from-emerald-500/15 via-zinc-950/85 to-teal-950/20 border border-emerald-500/30 p-8 md:p-12 space-y-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-teal-500/5 blur-[150px] rounded-full pointer-events-none" />

          <div className="space-y-4 text-center relative z-10">
            <span className="text-[10px] text-emerald-400/70 font-mono tracking-[0.3em] uppercase block">
              Today&apos;s Emotional Release Sync Complete
            </span>
            <h4 className="text-3xl font-display text-white tracking-widest uppercase">
              Release &amp; Letting Go
            </h4>
          </div>

          <div className="max-w-xs mx-auto p-6 rounded-3xl bg-white/5 border border-emerald-500/20 text-center space-y-4 relative z-10 shadow-2xl">
            <div className="relative w-40 h-56 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 overflow-hidden flex items-center justify-center">
              {cardArtUrl ? (
                <img
                  src={cardArtUrl}
                  alt={drawnCard.nameKo}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover cursor-zoom-in"
                  onError={() => setCardArtUrl(null)}
                  onClick={() => setIsCardArtOpen(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/20 via-teal-500/10 to-amber-600/30 border border-emerald-500/60 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(16,185,129,0.45)]">
                  <span>{oracleResult.drawnCard?.emoji || drawnCard.emoji}</span>
                </div>
              )}
            </div>
            {cardArtUrl && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCardArtOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 size={12} />
                  크게 보기
                </button>
                <button
                  type="button"
                  onClick={() => void downloadImage(cardArtUrl, cardArtFilename)}
                  className="px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={12} />
                  다운로드
                </button>
              </div>
            )}
            <div>
              <span className="text-[9px] uppercase tracking-widest text-white/40 block mb-1">SEDONA SURRENDER CARD</span>
              <p className="text-xl font-bold text-emerald-300">{oracleResult.drawnCard?.nameKo || drawnCard.nameKo}</p>
              <p className="text-xs text-white/30 mt-0.5 font-mono">{oracleResult.drawnCard?.name || drawnCard.name}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {(oracleResult.drawnCard?.keywords || drawnCard.keywords).map((kw: string) => (
                <span key={kw} className="text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/80">
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles size={14} /> Deep Energy Report
            </span>
            <div className="flex items-center gap-2">
              <TTSButton text={oracleResult.diagnosis} voice="Kore" className="text-emerald-400 border-emerald-500/20 text-xs" />
              <button
                type="button"
                onClick={() => setShowReport(!showReport)}
                className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              >
                <Eye size={12} />
                {showReport ? '접기' : '상세보기'}
              </button>
            </div>
          </div>

          {showReport && (
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-white/90 text-sm leading-relaxed space-y-4 relative z-10 animate-fade-in">
              <Streamdown>{oracleResult.diagnosis}</Streamdown>
            </div>
          )}
        </div>
      ) : !isOracleLoading && (
        <>
          <div className="max-w-sm mx-auto">
            <div className="rounded-[40px] bg-zinc-950/80 border border-emerald-500/20 p-8 space-y-6 backdrop-blur-xl">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.3em] font-mono block text-center">
                Today&apos;s Release Healing Card
              </span>
              <div
                className="w-44 h-72 mx-auto cursor-pointer relative"
                style={{ perspective: '1000px' }}
                onClick={handleCardClick}
              >
                <motion.div
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 border border-emerald-500/40 flex items-center justify-center p-3 shadow-2xl group/card"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <div className="absolute inset-1.5 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center bg-emerald-500/5 group-hover/card:bg-emerald-500/10 transition-all shadow-inner">
                      <div className="w-10 h-10 rounded-full border border-emerald-500/20 flex items-center justify-center bg-black/40 shadow-md">
                        <Activity size={20} className="text-emerald-400 animate-pulse" />
                      </div>
                      <span className="absolute bottom-3 text-[10px] font-mono text-emerald-500/45 tracking-widest uppercase">AURA</span>
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 rounded-2xl border border-amber-500/30 flex flex-col justify-between p-3 shadow-[0_0_30px_rgba(251,191,36,0.15)] bg-cover bg-center overflow-hidden"
                    style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', backgroundImage: "url('/cards/heal_bg.png')" }}
                  >
                    <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] z-0" />
                    <div className="absolute inset-1.5 border border-amber-500/25 rounded-xl pointer-events-none z-10" />
                    <div className="flex justify-between items-center text-[9px] font-mono text-amber-400/80 z-10 tracking-[0.2em] px-0.5">
                      <span>{(() => {
                        const cardIdx = AURA_CARDS.findIndex((c) => c.name === drawnCard.name);
                        const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
                        return numerals[cardIdx] || 'I';
                      })()}</span>
                      <Sparkles size={10} className="text-amber-400/80 animate-pulse" />
                    </div>
                    <div className="relative flex-1 mx-1 my-1 rounded-xl overflow-hidden z-10 border border-amber-500/20 bg-black/30 min-h-0">
                      {isCardArtLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 z-20">
                          <RefreshCw size={18} className="text-emerald-400 animate-spin" />
                          <span className="text-[8px] text-emerald-300/80 font-mono tracking-widest uppercase">Drawing Card...</span>
                        </div>
                      )}
                      {cardArtUrl ? (
                        <>
                          <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setIsCardArtOpen(true);
                              }}
                              className="p-1.5 rounded-xl bg-black/70 border border-white/15 text-white/80 hover:text-white hover:bg-black/90 backdrop-blur-md transition-all shadow-lg"
                              title="이미지 크게 보기"
                              aria-label="이미지 크게 보기"
                            >
                              <Maximize2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void downloadImage(cardArtUrl, cardArtFilename);
                              }}
                              className="p-1.5 rounded-xl bg-black/70 border border-white/15 text-white/80 hover:text-white hover:bg-black/90 backdrop-blur-md transition-all shadow-lg"
                              title="이미지 다운로드"
                              aria-label="이미지 다운로드"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                          <img
                            src={cardArtUrl}
                            alt={drawnCard.nameKo}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover cursor-zoom-in"
                            onLoad={() => setIsCardArtLoading(false)}
                            onError={handleCardArtError}
                            onClick={(event) => {
                              event.stopPropagation();
                              setIsCardArtOpen(true);
                            }}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-amber-600/30 border border-amber-500/60 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.45)]">
                            <span>{drawnCard.emoji}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-center space-y-0.5 z-10 px-1">
                      <span className="text-[8px] text-amber-400/80 font-serif tracking-[0.15em] uppercase block line-clamp-1">
                        {drawnCard.keywords.join(', ')}
                      </span>
                      <h4 className="text-xs font-bold text-white tracking-widest leading-tight">{drawnCard.nameKo}</h4>
                      {drawnCard.isReversed && (
                        <span className="text-[8px] font-mono text-red-400/90 font-bold block uppercase tracking-widest">Reversed</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
              <p className="text-[10px] text-white/40 text-center">
                {!isFlipped
                  ? '카드를 탭하면 키워드 기반 카드 그림과 AI 맞춤 방하착 추천이 나타납니다'
                  : isCardArtLoading
                    ? '카드 그림을 생성하는 중...'
                    : cardArtUrl
                      ? '그림을 탭하거나 아래 버튼으로 크게 보기 · 다운로드'
                      : drawnCard.desc}
              </p>

              {isFlipped && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 text-center animate-fade-in">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 font-sans">
                    <Sparkles size={11} className="text-emerald-400" />
                    <span>[{drawnCard.nameKo}] AI 맞춤 방하착 연동</span>
                  </div>
                  <p className="text-xs font-bold text-white">
                    {RELEASE_THEMES[dailyThemeKey]?.name}
                  </p>
                  <p className="text-[10px] text-white/60 leading-relaxed break-keep">
                    {getAuraCardSedonaRecommendation(drawnCard).briefTip}
                  </p>
                </div>
              )}

              {isFlipped && cardArtUrl && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsCardArtOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    크게 보기
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void downloadImage(cardArtUrl, cardArtFilename);
                    }}
                    className="px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={12} />
                    다운로드
                  </button>
                </div>
              )}
            </div>
          </div>

          <MeditationOverlay
            isInline
            card={drawnCard}
            highlightThemeKey={dailyThemeKey}
            onReleaseComplete={handleReleaseComplete}
            contextHint={`오늘의 릴리즈 힐링카드: ${drawnCard.nameKo} (${drawnCard.name}) · 키워드: ${drawnCard.keywords.join(', ')} · ${drawnCard.desc}`}
          />
        </>
      )}

      {cardArtUrl && (
        <ImageOutputActions
          src={cardArtUrl}
          alt={drawnCard.nameKo}
          filename={cardArtFilename}
          isOpen={isCardArtOpen}
          onOpenChange={setIsCardArtOpen}
          modalOnly
        />
      )}

      
    </div>
  );
}
