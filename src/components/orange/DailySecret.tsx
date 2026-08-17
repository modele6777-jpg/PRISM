import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, KeyRound, Copy, Check, RefreshCw, Heart, Eye, PenLine,
  ListChecks, Moon, Timer, Plus, X,
} from 'lucide-react';
import { z } from 'zod';
import { useApp } from '@/contexts/AppContext';
import { invokeLLMStructured } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { TTSButton } from '@/components/TTSButton';

const DailySecretSchema = z.object({
  affirmation: z.string().describe('끌어당김의 법칙에 따른 오늘의 시크릿 확언 한 문장. 이미 이루어진 것처럼 선언형으로'),
  reflection: z.string().describe('이 확언을 믿으며 마음에 새길 2~3문장. 감사와 확신 중심'),
  action: z.string().describe('오늘 시각화·감사·받아들이기를 위한 작고 구체적인 실천 한 가지'),
  desire: z.string().describe('Ask: 오늘 우주에 명확히 요청할 한 가지'),
  visualizationGuide: z.string().describe('68초 시각화 안내 3~4문장. 눈을 감고 상상할 장면 중심'),
  gratitudeSeeds: z.array(z.string()).length(3).describe('오늘 감사할 것 3가지'),
  feelingAnchor: z.string().describe('이미 받은 것처럼 느끼게 할 감정·감각 한 줄'),
  mirrorPhrase: z.string().describe('거울 앞에서 읽을 한 문장'),
  eveningPrompt: z.string().describe('저녁 감사 마무리 한 문장'),
  scriptingStarter: z.string().describe('현재형 미래 스크립팅 시작 문장 한 줄'),
});

type DailySecretData = z.infer<typeof DailySecretSchema>;

const STORAGE_KEY = 'orange_daily_secret_v2';
const LEGACY_KEYS = ['orange_daily_secret_v1', 'orange_daily_affirmation_v1'];

const PRACTICE_ITEMS = [
  { id: 'affirmation', label: '시크릿 확언 읽기' },
  { id: 'gratitude', label: '감사 3가지 느끼기' },
  { id: 'visualization', label: '68초 시각화 완료' },
  { id: 'mirror', label: '거울 확언 말하기' },
  { id: 'feeling', label: '이미 받은 것처럼 기분 느끼기' },
  { id: 'action', label: '오늘의 작은 실천 하기' },
] as const;

type PracticeId = (typeof PRACTICE_ITEMS)[number]['id'];

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function dayStorageKey(suffix: string) {
  return `orange_daily_secret_${suffix}_${todayKey()}`;
}

function loadCachedSecret(): DailySecretData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; data: DailySecretData };
      if (parsed.date === todayKey()) return parsed.data;
    }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const parsed = JSON.parse(legacy) as { date: string; data: Partial<DailySecretData> };
      if (parsed.date !== todayKey()) continue;
      if (parsed.data.affirmation && parsed.data.reflection && parsed.data.action) {
        return parsed.data as DailySecretData;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isFullSecretKit(data: DailySecretData | null): data is DailySecretData {
  return Boolean(
    data?.desire
    && data.visualizationGuide
    && data.gratitudeSeeds?.length === 3
    && data.feelingAnchor
    && data.mirrorPhrase
    && data.eveningPrompt
    && data.scriptingStarter,
  );
}

function loadWish(): string {
  return localStorage.getItem(dayStorageKey('wish')) || '';
}

function loadPractice(): Record<PracticeId, boolean> {
  try {
    const raw = localStorage.getItem(dayStorageKey('practice'));
    if (!raw) return {} as Record<PracticeId, boolean>;
    return JSON.parse(raw) as Record<PracticeId, boolean>;
  } catch {
    return {} as Record<PracticeId, boolean>;
  }
}

function loadGratitudeChecked(): boolean[] {
  try {
    const raw = localStorage.getItem(dayStorageKey('gratitude_checked'));
    if (!raw) return [false, false, false];
    const parsed = JSON.parse(raw) as boolean[];
    return [parsed[0] ?? false, parsed[1] ?? false, parsed[2] ?? false];
  } catch {
    return [false, false, false];
  }
}

function loadExtraGratitude(): string[] {
  try {
    const raw = localStorage.getItem(dayStorageKey('gratitude_extra'));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function loadScript(): string {
  return localStorage.getItem(dayStorageKey('script')) || '';
}

function VisualizationTimer({ guide, onComplete }: { guide: string; onComplete?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(68);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setDone(true);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, secondsLeft]);

  const start = () => {
    setSecondsLeft(68);
    setDone(false);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setDone(false);
    setSecondsLeft(68);
  };

  const progress = ((68 - secondsLeft) / 68) * 100;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/80">
            68초 시각화 스튜디오
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-300/80">
          {running || done ? `${secondsLeft}s` : '68s'}
        </span>
      </div>
      <p className="text-sm text-white/70 leading-relaxed break-keep">{guide}</p>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {!running && !done && (
          <button
            type="button"
            onClick={start}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-100 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Timer size={12} />
            시각화 시작
          </button>
        )}
        {running && (
          <span className="px-4 py-2 rounded-xl border border-amber-500/20 text-amber-200/80 text-[11px] font-mono">
            눈을 감고 이미 이루어진 장면을 느껴 보세요...
          </span>
        )}
        {done && (
          <span className="px-4 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 text-[11px] font-bold">
            시각화 완료 · 우주에 주문이 전달되었습니다
          </span>
        )}
        {(running || done) && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-[10px] cursor-pointer"
          >
            다시 하기
          </button>
        )}
      </div>
    </div>
  );
}

export function DailySecret() {
  const { sharedState } = useApp();
  const [data, setData] = useState<DailySecretData | null>(() => loadCachedSecret());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [wish, setWish] = useState(loadWish);
  const [practice, setPractice] = useState<Record<PracticeId, boolean>>(loadPractice);
  const [gratitudeChecked, setGratitudeChecked] = useState(loadGratitudeChecked);
  const [extraGratitude, setExtraGratitude] = useState(loadExtraGratitude);
  const [newGratitude, setNewGratitude] = useState('');
  const [script, setScript] = useState(loadScript);

  const hasReceivedToday = data !== null;
  const hasFullKit = isFullSecretKit(data);

  useEffect(() => {
    setData(loadCachedSecret());
    setWish(loadWish());
    setPractice(loadPractice());
    setGratitudeChecked(loadGratitudeChecked());
    setExtraGratitude(loadExtraGratitude());
    setScript(loadScript());
  }, []);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('wish'), wish);
  }, [wish]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('practice'), JSON.stringify(practice));
  }, [practice]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('gratitude_checked'), JSON.stringify(gratitudeChecked));
  }, [gratitudeChecked]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('gratitude_extra'), JSON.stringify(extraGratitude));
  }, [extraGratitude]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('script'), script);
  }, [script]);

  const practiceCount = useMemo(
    () => PRACTICE_ITEMS.filter((item) => practice[item.id]).length,
    [practice],
  );

  const buildPromptContext = useCallback(() => {
    const userProfileStr = sharedState?.userProfile
      ? JSON.stringify(sharedState.userProfile)
      : '프로필 없음';
    const memory = sharedState?.orangeMemory || sharedState?.globalMemory || '최근 기록 없음';
    const name =
      sharedState?.userProfile?.basic?.nickname ||
      sharedState?.userProfile?.basic?.name ||
      '여행자';
    const wishLine = wish.trim() ? `\n[사용자가 오늘 요청한 소원] ${wish.trim()}` : '';
    return { userProfileStr, memory, name, wishLine };
  }, [sharedState, wish]);

  const receiveSecret = useCallback(async (upgradeOnly = false) => {
    if (loading) return;
    if (!upgradeOnly && hasReceivedToday && hasFullKit) return;
    setLoading(true);
    try {
      const { userProfileStr, memory, name, wishLine } = buildPromptContext();
      const upgradeNote = upgradeOnly && data
        ? `\n[기존 확언 유지 참고] affirmation: ${data.affirmation}`
        : '';

      const result = await invokeLLMStructured({
        messages: [
          {
            role: 'system',
            content: [
              '당신은 론다 번(Rhonda Byrne)의 『시크릿(The Secret)』— 끌어당김의 법칙을 바탕으로 오늘의 시크릿 키트를 만드는 ORANGE 가이드입니다.',
              '핵심: Ask(요청)-Believe(믿음)-Receive(받음). 생각과 감정이 현실을 끌어당깁니다.',
              '확언·시각화·감사·거울확언·스크립팅·저녁마무리를 하나의 흐름으로 연결하세요.',
              '쉬운 말로, 따뜻하고 확신 있게. 과장된 마케팅 문구는 피하세요.',
              `[프로필: ${userProfileStr}]`,
              `[최근 기록: ${memory}]${wishLine}${upgradeNote}`,
            ].join('\n'),
          },
          {
            role: 'user',
            content: `${name}님을 위한 오늘의 시크릿 키트를 주세요. affirmation, reflection, action, desire, visualizationGuide, gratitudeSeeds(3개), feelingAnchor, mirrorPhrase, eveningPrompt, scriptingStarter를 모두 채워 주세요.`,
          },
        ],
        schema: DailySecretSchema,
      });

      if (result) {
        const merged = upgradeOnly && data
          ? { ...data, ...result, affirmation: data.affirmation }
          : result;
        setData(merged);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ date: todayKey(), data: merged }),
        );

        recordPrismFeature({
          app: 'orange',
          featureName: '시크릿(The Secret) 확언 키트',
          summary: `확언: "${merged.affirmation}", 요청(Ask): "${merged.desire}", 감사씨앗: [${merged.gratitudeSeeds?.join(', ')}], 실천: "${merged.action}"`,
          details: merged,
        });

        if (result.scriptingStarter && !script.trim()) {
          setScript(`${result.scriptingStarter}\n\n`);
        }
      }
    } catch (error) {
      console.error('[DailySecret]', error);
    } finally {
      setLoading(false);
    }
  }, [buildPromptContext, data, hasFullKit, hasReceivedToday, loading, script]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const togglePractice = (id: PracticeId) => {
    setPractice((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGratitude = (index: number) => {
    setGratitudeChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const addGratitude = () => {
    const trimmed = newGratitude.trim();
    if (!trimmed) return;
    setExtraGratitude((prev) => [...prev, trimmed].slice(0, 5));
    setNewGratitude('');
  };

  return (
    <div className="space-y-6 sm:space-y-10 text-left w-full min-w-0">
      <div className="text-center space-y-3 sm:space-y-4 px-1">
        <span className="text-[9px] sm:text-[10px] text-amber-400 font-extrabold uppercase tracking-[0.2em] sm:tracking-[0.3em] font-mono block">
          DAILY
        </span>
        <h3 className="text-2xl sm:text-4xl md:text-5xl font-display text-white tracking-tighter break-words">
          오늘의 시크릿
        </h3>
        <p className="text-[11px] md:text-xs text-white/50 max-w-2xl mx-auto leading-relaxed px-1 sm:px-0">
          론다 번의 『시크릿』— 끌어당김의 법칙을 실천하는 확언, 시각화, 감사, 스크립팅 도구를 한곳에서 만나보세요.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {['Ask · 원함', 'Believe · 믿음', 'Receive · 받음'].map((step) => (
            <span
              key={step}
              className="text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300/90"
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 space-y-3">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
          Ask · 오늘 우주에 요청하기
        </label>
        <textarea
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          placeholder="오늘 끌어당기고 싶은 것을 한 문장으로 적어 보세요. 예: 마음이 편안한 하루, 좋은 소식, 자신감..."
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85 placeholder:text-white/25 resize-none focus:outline-none focus:border-amber-500/30"
        />
        <p className="text-[10px] text-white/35 font-mono">
          소원을 적어 두면 오늘의 시크릿이 더 맞춤화됩니다
        </p>
      </div>

      {!data ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg mx-auto"
        >
          <button
            type="button"
            onClick={() => void receiveSecret()}
            disabled={loading}
            className="w-full group relative overflow-hidden rounded-[28px] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-white/5 to-orange-500/10 p-8 sm:p-10 text-center shadow-2xl shadow-amber-500/10 transition-all hover:border-amber-400/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="absolute inset-0 bg-amber-500/10 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                {loading ? (
                  <RefreshCw size={28} className="text-amber-400 animate-spin" />
                ) : (
                  <KeyRound size={28} className="text-amber-400 animate-pulse" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {loading ? '시크릿 키트를 여는 중...' : '오늘의 시크릿 키트 받기'}
                </p>
                <p className="text-[10px] sm:text-xs text-white/40 font-sans">
                  하루 1회 · 확언 + 시각화 + 감사 + 실천 도구
                </p>
              </div>
            </div>
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl mx-auto space-y-5"
        >
          {!hasFullKit && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-amber-100/90">
                시크릿 실천 도구 키트를 아직 받지 않았어요. 시각화·감사·거울 확언 등을 추가로 받을 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => void receiveSecret(true)}
                disabled={loading}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/30 text-amber-100 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                키트 확장 받기
              </button>
            </div>
          )}

          <div className="relative overflow-hidden rounded-[32px] border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-zinc-950/80 to-orange-950/30 p-6 sm:p-10 shadow-2xl">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/15 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative z-10 space-y-6 text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">
                <Sparkles size={12} />
                <span>Today&apos;s Secret Affirmation</span>
                <Sparkles size={12} />
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-serif text-white/95 leading-relaxed break-keep font-medium">
                &ldquo;{data.affirmation}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <TTSButton
                  text={data.affirmation}
                  voice="Kore"
                  className="text-amber-300 border-amber-500/20 text-xs py-2 px-4"
                />
                <button
                  type="button"
                  onClick={() => {
                    void copyText(data.affirmation, 'affirmation');
                    togglePractice('affirmation');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  {copied === 'affirmation' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied === 'affirmation' ? '복사됨' : '복사'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
                Believe · 믿음으로 새기기
              </span>
              <p className="text-sm text-white/75 leading-relaxed break-keep">{data.reflection}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
                Receive · 오늘의 작은 실천
              </span>
              <p className="text-sm text-white/80 leading-relaxed break-keep font-medium">{data.action}</p>
            </div>
          </div>

          {hasFullKit && (
            <>
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-5 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400/70 block">
                  Ask · 오늘의 소원 (Desire)
                </span>
                <p className="text-sm text-white/85 leading-relaxed break-keep font-medium">
                  {data.desire}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
                  Feel · 이미 받은 것처럼 느끼기
                </span>
                <p className="text-sm text-white/80 leading-relaxed break-keep italic">
                  {data.feelingAnchor}
                </p>
                <button
                  type="button"
                  onClick={() => togglePractice('feeling')}
                  className="text-[10px] text-amber-300/80 hover:text-amber-200 underline-offset-2 hover:underline cursor-pointer"
                >
                  {practice.feeling ? '✓ 기분 연습 완료' : '기분 연습했다고 표시'}
                </button>
              </div>

              <VisualizationTimer
                guide={data.visualizationGuide}
                onComplete={() => setPractice((prev) => ({ ...prev, visualization: true }))}
              />

              <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-rose-400" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400/80">
                    감사 자석 · Gratitude Magnet
                  </span>
                </div>
                <div className="space-y-2">
                  {data.gratitudeSeeds.map((item, index) => (
                    <label
                      key={item}
                      className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={gratitudeChecked[index]}
                        onChange={() => {
                          toggleGratitude(index);
                          if (!gratitudeChecked[index]) togglePractice('gratitude');
                        }}
                        className="mt-0.5 accent-amber-500"
                      />
                      <span className={`text-sm break-keep ${gratitudeChecked[index] ? 'text-white/50 line-through' : 'text-white/80'}`}>
                        {item}
                      </span>
                    </label>
                  ))}
                  {extraGratitude.map((item) => (
                    <div key={item} className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-black/20 text-sm text-white/70">
                      <Sparkles size={12} className="text-amber-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newGratitude}
                    onChange={(e) => setNewGratitude(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGratitude()}
                    placeholder="나만의 감사 한 가지 추가"
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-amber-500/30"
                  />
                  <button
                    type="button"
                    onClick={addGratitude}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <PenLine size={14} className="text-violet-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400/80">
                      스크립팅 노트 · 현재형 미래
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(script || data.scriptingStarter, 'script')}
                    className="text-[9px] text-white/40 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copied === 'script' ? <Check size={10} /> : <Copy size={10} />}
                    복사
                  </button>
                </div>
                <p className="text-[10px] text-white/45">
                  이미 이루어진 것처럼 현재형으로 적어 보세요. 감정까지 생생하게 쓸수록 좋습니다.
                </p>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={5}
                  placeholder={data.scriptingStarter}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85 placeholder:text-white/25 resize-y focus:outline-none focus:border-violet-500/30 font-serif leading-relaxed"
                />
              </div>

              <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-5 space-y-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80 block">
                  거울 확언 · Mirror Work
                </span>
                <p className="text-base sm:text-lg font-serif text-white/90 leading-relaxed break-keep">
                  &ldquo;{data.mirrorPhrase}&rdquo;
                </p>
                <div className="flex flex-wrap gap-2">
                  <TTSButton
                    text={data.mirrorPhrase}
                    voice="Kore"
                    className="text-cyan-300 border-cyan-500/20 text-xs py-2 px-4"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void copyText(data.mirrorPhrase, 'mirror');
                      togglePractice('mirror');
                    }}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] text-white/50 hover:text-white cursor-pointer"
                  >
                    {copied === 'mirror' ? '복사됨' : '거울 확언 복사'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.04] p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Moon size={14} className="text-indigo-400" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/80">
                    Evening · 저녁 감사 마무리
                  </span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed break-keep">{data.eveningPrompt}</p>
              </div>
            </>
          )}

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks size={14} className="text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">
                  오늘의 끌어당김 실천 체크리스트
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300/80">
                {practiceCount}/{PRACTICE_ITEMS.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRACTICE_ITEMS.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(practice[item.id])}
                    onChange={() => togglePractice(item.id)}
                    className="accent-emerald-500"
                  />
                  <span className={`text-xs ${practice[item.id] ? 'text-white/45 line-through' : 'text-white/75'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <AnimatePresence>
              {practiceCount === PRACTICE_ITEMS.length && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-emerald-300 font-bold"
                >
                  오늘의 시크릿 실천 완료 · 우주와 같은 주파수에 맞춰졌습니다
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-[10px] text-white/30 font-mono">
            오늘의 시크릿 키트는 자정 이후 새로 받을 수 있습니다
          </p>
        </motion.div>
      )}

      {!data && (
        <div className="w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Eye, title: '68초 시각화', desc: '이미 이루어진 장면을 느껴 보세요' },
            { icon: Heart, title: '감사 자석', desc: '감사가 더 많은 좋은 일을 끌어당깁니다' },
            { icon: PenLine, title: '스크립팅', desc: '현재형으로 미래를 기록하세요' },
          ].map((tool) => (
            <div
              key={tool.title}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center space-y-2 opacity-70"
            >
              <tool.icon size={18} className="mx-auto text-amber-400/70" />
              <p className="text-[11px] font-bold text-white/60">{tool.title}</p>
              <p className="text-[10px] text-white/35 leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}