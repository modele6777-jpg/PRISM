import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, User, Sparkles, Award, Volume2, VolumeX, Check, Copy, RefreshCw, Moon, Star, ShieldCheck, ArrowRight, Bookmark } from 'lucide-react';
import { useApp, getPersistentUserProfile } from '@/contexts/AppContext';
import { getApiBaseUrl, modelName, extractChatCompletionText } from '@/lib/ai';
import { GoogleGenAI } from '@google/genai';
import { recordPrismFeature } from '@/lib/prismOmniSync';

interface ChronicleStampData {
  title: string;
  soulEvolutionLevel: string;
  dailyCoreTheme: string;
  soulAlignmentSynthesis: string;
  sevenPrismStampStatus: {
    space: string;
    seal: string;
  }[];
  preSleepPrimingAffirmation: string;
  chronicleSealCode: string;
}

const FALLBACK_CHRONICLE: ChronicleStampData = {
  title: "영혼 연대기 & 마스터 아카이브 (Soul Chronicle Stamp)",
  soulEvolutionLevel: "Mastery Level VII · 다이아몬드 의식",
  dailyCoreTheme: "내면의 감사와 우주적 비전이 하나로 연결된 기적의 하루",
  soulAlignmentSynthesis: "당신이 오늘 기록한 소중한 감사들은 개인 프로필에 새겨진 고유한 영혼의 사명(Vision)과 완벽하게 공명하였습니다. 매 순간의 성찰은 미래의 더 위대한 도약을 위한 황금빛 디딤돌이 됩니다.",
  sevenPrismStampStatus: [
    { space: "PROLOGUE (프롤로그)", seal: "멘탈 방패 각인 완료 🛡️" },
    { space: "ORANGE (오렌지)", seal: "양자 현실화 가속 동조 🌲" },
    { space: "TRINITY (트리니티)", seal: "대운 개운 연금술 획득 ✨" },
    { space: "AURA (오라)", seal: "저항 0% 완전 방하착 ⚡" },
    { space: "BLUEBIRD (블루버드)", seal: "순수 백지 영점 환생 🐦" },
    { space: "MUSE (뮤즈)", seal: "거장의 영감 마스터클래스 🎶" },
    { space: "EPILOGUE (에필로그)", seal: "영혼 연대기 마스터 아카이브 🌙" }
  ],
  preSleepPrimingAffirmation: "나는 오늘 하루의 모든 배움과 감사를 가슴에 품고, 잠든 동안 잠재의식 속에서 무한한 가능성의 우주와 온전히 하나가 된다.",
  chronicleSealCode: "SOUL-CHRONICLE-PRISM-999"
};

export function EpilogueSynergySection() {
  const { updateSharedState } = useApp();
  const userProfile = getPersistentUserProfile();
  const [gratitude1, setGratitude1] = useState<string>('');
  const [gratitude2, setGratitude2] = useState<string>('');
  const [gratitude3, setGratitude3] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chronicleData, setChronicleData] = useState<ChronicleStampData>(FALLBACK_CHRONICLE);
  const [isSynthesized, setIsSynthesized] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const toggle852Hz = () => {
    if (isAudioPlaying) {
      try {
        oscRef.current?.stop();
        audioCtxRef.current?.close();
      } catch (e) {}
      audioCtxRef.current = null;
      oscRef.current = null;
      setIsAudioPlaying(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(852, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscRef.current = osc;
        setIsAudioPlaying(true);
      } catch (e) {
        console.warn('Audio synthesis error:', e);
      }
    }
  };

  useEffect(() => {
    return () => {
      try {
        oscRef.current?.stop();
        audioCtxRef.current?.close();
      } catch (e) {}
    };
  }, []);

  const handleSynthesizeChronicle = async () => {
    setIsLoading(true);
    const grats = [gratitude1.trim(), gratitude2.trim(), gratitude3.trim()].filter(Boolean);
    const gratText = grats.length > 0 ? grats.join(' / ') : '오늘 하루를 무사히 살아낸 호흡과 삶에 대한 깊은 감사';
    const mbti = userProfile?.psychology?.mbti || 'INFJ';
    const nickname = userProfile?.basic?.nickname || '빛의 순례자';

    const systemPrompt = "당신은 에필로그의 영혼 연대기 & 마스터 아카이브 대마스터입니다. 감사 일기(하루의 3가지 감사와 성찰)와 개인 프로필(MBTI, 영혼의 성향, 비전)을 융합하여 오늘의 영혼 진화 지수와 마스터 스탬프를 발행하세요.";
    const userPrompt = `[오늘의 3가지 감사]: "${gratText}"
[사용자 프로필]: 닉네임(${nickname}), MBTI(${mbti})

반드시 아래 JSON 스키마로만 엄격하게 응답하세요:
{
  "title": "영혼 연대기 고유 칭호 (예: 852Hz 다이아몬드 마스터 아카이브)",
  "soulEvolutionLevel": "오늘의 영혼 진화 등급 (예: Mastery Level VII · 순수 현존)",
  "dailyCoreTheme": "오늘 하루를 관통하는 핵심 영혼 테마 1문장",
  "soulAlignmentSynthesis": "기록된 감사와 개인의 영혼 사명이 어떻게 융합되어 진화했는지를 통찰하는 거룩한 해설 (2~3문장)",
  "sevenPrismStampStatus": [
    { "space": "PROLOGUE", "seal": "멘탈 방패 각인 🛡️" },
    { "space": "ORANGE", "seal": "양자 현실화 가속 🌲" },
    { "space": "TRINITY", "seal": "대운 개운 연금술 ✨" },
    { "space": "AURA", "seal": "저항 0% 완전 해방 ⚡" },
    { "space": "BLUEBIRD", "seal": "순수 백지 영점 환생 🐦" },
    { "space": "MUSE", "seal": "거장의 영감 마스터클래스 🎶" },
    { "space": "EPILOGUE", "seal": "영혼 연대기 마스터 아카이브 🌙" }
  ],
  "preSleepPrimingAffirmation": "취침 전 잠재의식을 우주와 동조시키는 수면 전 영혼 프라이밍 확언 1문장",
  "chronicleSealCode": "SOUL-CHRONICLE-PRISM-777"
}`;

    const safetyTimeout = new Promise<ChronicleStampData>((resolve) => {
      setTimeout(() => {
        resolve({
          ...FALLBACK_CHRONICLE,
          title: `〈${nickname}의 영혼 연대기〉 마스터 아카이브`,
          soulAlignmentSynthesis: `오늘 기록한 감사 [${gratText}]는 당신의 영혼에 깊은 평화와 지혜의 빛을 새겼습니다. 잠든 동안에도 우주의 축복이 계속됩니다.`
        });
      }, 6500);
    });

    const runAI = async (): Promise<ChronicleStampData> => {
      const geminiApiKey =
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        (import.meta as any).env?.VITE_AI_API_KEY ||
        'AQ.Ab8RN6LJzmJJ3ExtNix-ERyIkxzPtsV23WdCr71NRGItFPK41A';

      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const res = await (ai.models as any).generateContent({
            model: 'gemini-3.7-flash',
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 900,
            }
          });
          const parsed = JSON.parse(res?.text || '{}');
          if (parsed && parsed.soulAlignmentSynthesis) {
            return parsed;
          }
        } catch (e) {
          console.warn('[EpilogueSynergy] Gemini direct error:', e);
        }
      }

      const url = `${getApiBaseUrl()}/api/openai/v1/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName || 'gemini-3.7-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = extractChatCompletionText(data?.choices?.[0]?.message?.content);
        const parsed = JSON.parse(content || '{}');
        if (parsed && parsed.soulAlignmentSynthesis) {
          return parsed;
        }
      }
      throw new Error('Need fallback');
    };

    try {
      const result = await Promise.race([runAI(), safetyTimeout]);
      setChronicleData(result);
      setIsSynthesized(true);
      recordPrismFeature({
        app: 'epilogue',
        featureName: 'Epilogue Soul Chronicle Synergy',
        summary: result.title,
        details: { title: result.title }
      });
      updateSharedState({}, 'EPILOGUE');
    } catch (e) {
      console.warn('Epilogue fallback error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const text = `🌙 [${chronicleData.title}]\n\n✨ 진화 등급: ${chronicleData.soulEvolutionLevel}\n🌟 오늘 하루 테마: ${chronicleData.dailyCoreTheme}\n\n📜 영혼 정렬 통찰: ${chronicleData.soulAlignmentSynthesis}\n\n🌌 수면 전 잠재의식 프라이밍 확언:\n"${chronicleData.preSleepPrimingAffirmation}"\n- PRISM EPILOGUE Soul Chronicle Stamp`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12 text-white font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-zinc-950/90 to-pink-950/40 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-pink-500/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Sparkles size={12} className="text-purple-400 animate-pulse" />
                GRATITUDE DIARY + PROFILE FUSION
              </span>
              <span className="text-[10px] text-white/40 font-mono">852Hz INTUITION FREQUENCY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Award className="text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]" size={28} />
              <span>영혼 연대기 & 마스터 아카이브</span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/70 max-w-xl leading-relaxed">
              <strong>감사 일기(섹션1)</strong>의 3가지 감사 성찰과 <strong>개인 프로필(섹션2)</strong>의 고유한 영혼 지향점을 융합하여, 오늘 하루의 영혼 진화 지수를 측정하고 황금 마스터 스탬프를 발행합니다.
            </p>
          </div>

          <button
            onClick={toggle852Hz}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-sans flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
              isAudioPlaying
                ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
            }`}
          >
            {isAudioPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioPlaying ? '852Hz 영혼 주파수 재생 중' : '852Hz 주파수 켜기'}</span>
          </button>
        </div>
      </div>

      {/* Gratitude & Profile Input */}
      <div className="glass p-6 sm:p-8 rounded-[32px] border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-purple-300 flex items-center gap-2 font-mono uppercase tracking-wider">
            <BookOpen size={16} className="text-purple-400" />
            <span>1. 오늘 하루 기억에 남는 3가지 감사와 성찰</span>
          </label>
          <span className="text-[10px] text-white/40 font-sans">영혼 정렬 아카이빙</span>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={gratitude1}
            onChange={(e) => setGratitude1(e.target.value)}
            placeholder="감사 1: 오늘 따뜻한 차 한 잔과 함께 누린 평온한 10분의 시간..."
            className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 font-sans"
          />
          <input
            type="text"
            value={gratitude2}
            onChange={(e) => setGratitude2(e.target.value)}
            placeholder="감사 2: 어려운 과제를 끝까지 포기하지 않고 마무리한 나 자신에게..."
            className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 font-sans"
          />
          <input
            type="text"
            value={gratitude3}
            onChange={(e) => setGratitude3(e.target.value)}
            placeholder="감사 3: 곁에서 늘 묵묵히 응원해 주는 소중한 사람에게..."
            className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 font-sans"
          />
        </div>

        <button
          onClick={handleSynthesizeChronicle}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin text-white" />
              <span>영혼 연대기 & 마스터 아카이브 각인 중...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} className="text-yellow-300" />
              <span>〈영혼 연대기 스탬프 & 수면 프라이밍〉 즉시 발행</span>
            </>
          )}
        </button>
      </div>

      {/* Output Display */}
      {isSynthesized && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[36px] sm:rounded-[44px] bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black/95 border border-purple-500/30 p-6 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
                  SOUL CHRONICLE GOLDEN STAMP
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  {chronicleData.soulEvolutionLevel}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">{chronicleData.title}</h3>
            </div>

            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? '복사 완료' : '연대기 전체 복사'}</span>
            </button>
          </div>

          {/* Theme & Synthesis Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-900/30 via-zinc-900/50 to-pink-900/20 border border-purple-400/40 relative shadow-inner space-y-3">
            <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Star size={14} className="text-yellow-400" />
              오늘의 영혼 테마: {chronicleData.dailyCoreTheme}
            </span>
            <p className="text-base sm:text-lg font-bold text-white leading-relaxed tracking-tight break-keep">
              "{chronicleData.soulAlignmentSynthesis}"
            </p>
          </div>

          {/* 7 Space Synergy Stamp Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-purple-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <Award size={14} className="text-pink-400" /> PRISM 7대 우주 공간 통합 여정 스탬프
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {chronicleData.sevenPrismStampStatus.map((stamp, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-white/80">{stamp.space}</span>
                  <span className="text-[10px] text-purple-300 font-mono font-semibold">{stamp.seal}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sleep Priming Banner */}
          <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-1">
            <span className="text-[10px] text-purple-300 font-mono font-bold uppercase flex items-center gap-1.5">
              <Moon size={12} className="text-purple-400" /> PRE-SLEEP SUBCONSCIOUS PRIMING AFFIRMATION
            </span>
            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
              "{chronicleData.preSleepPrimingAffirmation}"
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
