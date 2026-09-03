import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Compass, Flame, Volume2, VolumeX, Copy, Check, RefreshCw, Award, ArrowRight, ShieldCheck, Zap, Disc } from 'lucide-react';
import { useApp, getPersistentUserProfile } from '@/contexts/AppContext';
import { getApiBaseUrl, modelName, extractChatCompletionText } from '@/lib/ai';
import { GoogleGenAI } from '@google/genai';
import { recordPrismFeature } from '@/lib/prismOmniSync';

interface DestinyAlchemyData {
  title: string;
  tarotCardName: string;
  tarotKeyword: string;
  tarotMessage: string;
  fiveElementDeficiency: string;
  alchemyRemedy: {
    luckyColor: string;
    luckyDirection: string;
    luckyNumber: string;
    luckyFood: string;
    luckyAction: string;
  };
  destinyAlchemyAffirmation: string;
  talismanSecretCode: string;
}

const FALLBACK_ALCHEMY: DestinyAlchemyData = {
  title: "황금 대운 연금술 크로스 (Destiny Alchemy Cross)",
  tarotCardName: "The Sun (태양 - XIX)",
  tarotKeyword: "생명력 · 대성공 · 활력과 명예",
  tarotMessage: "당신을 둘러싼 먹구름이 걷히고 황금빛 태양의 직사광선이 내리쬡니다. 숨겨두었던 잠재력을 당당하게 세상에 드러낼 때입니다.",
  fiveElementDeficiency: "화(火)의 열정 기운 보충 필요",
  alchemyRemedy: {
    luckyColor: "황금 골드 & 딥 크림슨 레드",
    luckyDirection: "정남쪽 (오방위 명예의 길방)",
    luckyNumber: "3, 7, 9",
    luckyFood: "따뜻한 생강 홍차, 토마토, 붉은 베리류",
    luckyAction: "정오 무렵 5분간 햇살을 받으며 기운 흡수하기"
  },
  destinyAlchemyAffirmation: "나의 운명은 지금 최상의 황금 주파수로 정렬되었으며, 막혔던 모든 운의 물줄기가 막힘없이 터져 나온다.",
  talismanSecretCode: "SUN-SOLARIS-ALCHEMY-777"
};

const TAROT_CARDS = [
  { name: 'The Magician (마법사)', emoji: '🪄', key: '무한한 창조력과 새로운 시작' },
  { name: 'The Empress (여황제)', emoji: '👑', key: '풍요와 번영, 결실의 완성' },
  { name: 'Wheel of Fortune (운명의 수레바퀴)', emoji: '☸️', key: '대운의 전환과 상승 기류' },
  { name: 'The Star (별)', emoji: '⭐', key: '희망과 영감, 천상의 인도' },
  { name: 'The Sun (태양)', emoji: '☀️', key: '압도적 성공과 생명력의 폭발' },
  { name: 'The World (세계)', emoji: '🌍', key: '완벽한 조화와 새로운 차원의 완성' },
];

export function TrinitySynergySection() {
  const { updateSharedState } = useApp();
  const userProfile = getPersistentUserProfile();
  const [selectedCard, setSelectedCard] = useState<typeof TAROT_CARDS[0]>(TAROT_CARDS[4]);
  const [userQuery, setUserQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alchemyData, setAlchemyData] = useState<DestinyAlchemyData>(FALLBACK_ALCHEMY);
  const [isDrawn, setIsDrawn] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const toggle741Hz = () => {
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
        osc.frequency.setValueAtTime(741, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscRef.current = osc;
        setIsAudioPlaying(true);
      } catch (e) {
        console.warn('Audio synthesis failed:', e);
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

  const handleDrawAndSynthesize = async () => {
    setIsLoading(true);
    const randomCard = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    setSelectedCard(randomCard);

    const systemPrompt = "당신은 트리니티의 운명 개운 연금술 마스터입니다. 행운 상승 비법(사주/오행 개운법/길방위/행운의 색)과 타로 카드의 상징 체계를 융합하여 사용자의 운을 극적으로 상승시키는 '운명 개운 타로 솔루션'을 설계하세요.";
    const userPrompt = `[드로우된 타로 카드]: ${randomCard.name} (${randomCard.key})
[사용자 고민/소망]: "${userQuery.trim() || '오늘 나의 운명을 극대화할 행운 개운 비법'}"
[사용자 닉네임]: "${userProfile?.basic?.nickname || '구도자'}"

반드시 아래 JSON 스키마로만 엄격하게 응답하세요:
{
  "title": "운명 개운 고유 칭호 (예: 741Hz 천상 수호 대운 연금술 크로스)",
  "tarotCardName": "${randomCard.name}",
  "tarotKeyword": "타로 카드의 핵심 상징 키워드",
  "tarotMessage": "타로 카드가 건네는 심오한 운명 계시 (2~3문장)",
  "fiveElementDeficiency": "현재 보충이 필요한 오행 기운 및 이유",
  "alchemyRemedy": {
    "luckyColor": "행운의 개운 색상 2가지",
    "luckyDirection": "행운을 부르는 길방위",
    "luckyNumber": "행운의 숫자 3개",
    "luckyFood": "기운을 보충하는 개운 음식",
    "luckyAction": "오늘 실천할 즉각적 개운 행동 1가지"
  },
  "destinyAlchemyAffirmation": "운명을 황금빛으로 바꾸는 1인칭 대운 확언문",
  "talismanSecretCode": "영문 대문자와 숫자로 이루어진 연금술 부적 시길 코드"
}`;

    const safetyTimeout = new Promise<DestinyAlchemyData>((resolve) => {
      setTimeout(() => {
        resolve({
          ...FALLBACK_ALCHEMY,
          tarotCardName: randomCard.name,
          tarotKeyword: randomCard.key,
          title: `〈${randomCard.name}〉 운명 개운 연금술 크로스`
        });
      }, 6500);
    });

    const runAI = async (): Promise<DestinyAlchemyData> => {
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
          if (parsed && parsed.tarotMessage) {
            return parsed;
          }
        } catch (e) {
          console.warn('[TrinitySynergy] Gemini direct error:', e);
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
        if (parsed && parsed.tarotMessage) {
          return parsed;
        }
      }
      throw new Error('Need fallback');
    };

    try {
      const result = await Promise.race([runAI(), safetyTimeout]);
      setAlchemyData(result);
      setIsDrawn(true);
      recordPrismFeature({
        app: 'trinity',
        featureName: 'Trinity Destiny Alchemy Synergy',
        summary: result.title,
        details: { card: randomCard.name, title: result.title }
      });
      updateSharedState({}, 'TRINITY');
    } catch (e) {
      console.warn('Alchemy fallback error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const text = `✨ [${alchemyData.title}]\n\n🃏 타로 오라클: ${alchemyData.tarotCardName}\n💬 계시: ${alchemyData.tarotMessage}\n\n🔮 오행 개운 솔루션:\n- 부족 기운: ${alchemyData.fiveElementDeficiency}\n- 행운의 색: ${alchemyData.alchemyRemedy.luckyColor}\n- 길방위: ${alchemyData.alchemyRemedy.luckyDirection}\n- 행운의 숫자: ${alchemyData.alchemyRemedy.luckyNumber}\n- 개운 음식: ${alchemyData.alchemyRemedy.luckyFood}\n- 실천 행동: ${alchemyData.alchemyRemedy.luckyAction}\n\n🌟 대운 확언: "${alchemyData.destinyAlchemyAffirmation}"\n- PRISM TRINITY Destiny Alchemy Cross`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12 text-white font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 border border-yellow-500/30 bg-gradient-to-br from-yellow-950/50 via-zinc-950/90 to-amber-950/40 shadow-[0_0_50px_rgba(234,179,8,0.15)] backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-yellow-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5">
                <Sparkles size={12} className="text-yellow-400 animate-pulse" />
                LUCKY TIPS + TAROT READING FUSION
              </span>
              <span className="text-[10px] text-white/40 font-mono">741Hz INTUITION FREQUENCY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Compass className="text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.8)]" size={28} />
              <span>운명 개운 타로 솔루션 (Destiny Alchemy Cross)</span>
            </h2>
            <p className="text-xs sm:text-sm text-yellow-100/70 max-w-xl leading-relaxed">
              <strong>행운 상승 비법(섹션1)</strong>의 사주 오행 개운 처방과 <strong>타로 리딩(섹션2)</strong>의 천상 아르카나 상징을 융합하여, 닫힌 운로를 활짝 열어젖히는 맞춤형 개운 연금술 솔루션입니다.
            </p>
          </div>

          <button
            onClick={toggle741Hz}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-sans flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
              isAudioPlaying
                ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
            }`}
          >
            {isAudioPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioPlaying ? '741Hz 직관 주파수 재생 중' : '741Hz 주파수 켜기'}</span>
          </button>
        </div>
      </div>

      {/* Input & Draw Action Card */}
      <div className="glass p-6 sm:p-8 rounded-[32px] border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-yellow-300 flex items-center gap-2 font-mono uppercase tracking-wider">
            <Sparkles size={16} className="text-yellow-400" />
            <span>오늘 알고 싶은 운명과 개운 소망</span>
          </label>
          <span className="text-[10px] text-white/40 font-sans">오행 &amp; 타로 결합</span>
        </div>

        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="예: 이번 달 이직과 재물운을 최대로 끌어올릴 수 있는 개운 비방을 알려주세요..."
          className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400/60 font-sans"
        />

        <button
          onClick={handleDrawAndSynthesize}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin text-black" />
              <span>타로 아르카나 & 오행 연금술 합성 중...</span>
            </>
          ) : (
            <>
              <Zap size={18} className="text-black" />
              <span>〈운명 개운 타로 솔루션 & 부적〉 즉시 발급받기</span>
            </>
          )}
        </button>
      </div>

      {/* Output Display */}
      {isDrawn && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[36px] sm:rounded-[44px] bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black/95 border border-yellow-500/30 p-6 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-yellow-400">
                  DESTINY ALCHEMY ORACLE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 font-mono">
                  {alchemyData.talismanSecretCode}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">{alchemyData.title}</h3>
            </div>

            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? '복사 완료' : '솔루션 전체 복사'}</span>
            </button>
          </div>

          {/* Drawn Tarot Card Info */}
          <div className="p-6 rounded-3xl bg-yellow-950/30 border border-yellow-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border border-yellow-400/50 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(234,179,8,0.4)] shrink-0">
              {selectedCard.emoji}
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase">
                {alchemyData.tarotKeyword}
              </span>
              <h4 className="text-lg font-bold text-white">{alchemyData.tarotCardName}</h4>
              <p className="text-xs text-yellow-100/80 leading-relaxed font-sans">{alchemyData.tarotMessage}</p>
            </div>
          </div>

          {/* 5-Elements Remedy Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-yellow-300 uppercase font-mono tracking-wider flex items-center gap-2">
                <Flame size={14} className="text-orange-400" /> 맞춤형 오행 개운 처방전
              </h4>
              <span className="text-[11px] text-amber-300 font-medium">
                {alchemyData.fiveElementDeficiency}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: '행운의 색상', val: alchemyData.alchemyRemedy.luckyColor, icon: '🎨' },
                { label: '길방위', val: alchemyData.alchemyRemedy.luckyDirection, icon: '🧭' },
                { label: '행운의 숫자', val: alchemyData.alchemyRemedy.luckyNumber, icon: '🔢' },
                { label: '개운 음식', val: alchemyData.alchemyRemedy.luckyFood, icon: '🍵' },
                { label: '실천 행동', val: alchemyData.alchemyRemedy.luckyAction, icon: '⚡', span: 'col-span-2' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1 ${
                    item.span ? item.span : ''
                  }`}
                >
                  <span className="text-[10px] text-white/40 font-mono block">
                    {item.icon} {item.label}
                  </span>
                  <p className="text-xs font-bold text-white">{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Affirmation Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-950/40 via-zinc-900/60 to-amber-950/40 border border-yellow-500/30 space-y-1">
            <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase">
              DESTINY ALCHEMY AFFIRMATION
            </span>
            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
              "{alchemyData.destinyAlchemyAffirmation}"
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
