import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Timer, Sparkles, Wind, Volume2, VolumeX, Check, Copy, RefreshCw, Zap, Award, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useApp, getPersistentUserProfile } from '@/contexts/AppContext';
import { getApiBaseUrl, modelName, extractChatCompletionText } from '@/lib/ai';
import { GoogleGenAI } from '@google/genai';
import { recordPrismFeature } from '@/lib/prismOmniSync';

interface SanctuaryData {
  title: string;
  tensionArea: string;
  sedonaInquiryAnswer: string;
  sixtySecondSanctuaryProtocol: string[];
  zeroResistanceDeclaration: string;
  pureLightState: string;
}

const FALLBACK_SANCTUARY: SanctuaryData = {
  title: "완전 해방 방하착 챔버 (Zero-Resistance Sanctuary)",
  tensionArea: "가슴 답답함 & 어깨 긴장",
  sedonaInquiryAnswer: "지금 쥐고 있는 통제의 욕구와 불안을 가슴 밖으로 완전히 열어놓습니다. 손을 펴듯 마음에 쥔 힘을 내려놓습니다.",
  sixtySecondSanctuaryProtocol: [
    "00~15초: 숨을 깊게 들이쉬며 긴장된 몸 부위를 따뜻한 시선으로 자각합니다.",
    "15~35초: '이 느낌을 환영하고 기꺼이 머물게 할 수 있는가?' 속으로 묻고 허용합니다.",
    "35~50초: '이 감정을 놓아줄 수 있는가? 놓아줄 것인가? 언제? 지금!' 호흡과 함께 날려보냅니다.",
    "50~60초: 텅 빈 공간에 채워지는 순수한 평온과 고요함을 누립니다."
  ],
  zeroResistanceDeclaration: "나는 모든 저항과 집착을 허공 속으로 가볍게 흘려보내고, 본래의 완전한 자유와 평온으로 돌아옵니다.",
  pureLightState: "저항 0% · 순수 현존 (Zero-Resistance Pure Presence)"
};

const TENSION_PRESETS = [
  { id: 'chest', label: '가슴의 압박감과 답답함', icon: '🫀' },
  { id: 'shoulders', label: '어깨와 목덜미의 뻐근한 긴장', icon: '🧘' },
  { id: 'head', label: '머릿속 복잡한 생각과 두통', icon: '🧠' },
  { id: 'stomach', label: '명치와 복부의 조여듦', icon: '🌀' },
  { id: 'control', label: '모든 것을 통제하려는 강박', icon: '⛓️' },
  { id: 'fear', label: '불확실성에 대한 막연한 두려움', icon: '🌫️' },
];

export function AuraSynergySection() {
  const { updateSharedState } = useApp();
  const userProfile = getPersistentUserProfile();
  const [selectedTension, setSelectedTension] = useState<string>(TENSION_PRESETS[0].id);
  const [customDetail, setCustomDetail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sanctuaryData, setSanctuaryData] = useState<SanctuaryData>(FALLBACK_SANCTUARY);
  const [copied, setCopied] = useState<boolean>(false);
  const [isChamberActive, setIsChamberActive] = useState<boolean>(false);
  const [chamberTimer, setChamberTimer] = useState<number>(60);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const toggleTone = () => {
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
        osc.frequency.setValueAtTime(528, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscRef.current = osc;
        setIsAudioPlaying(true);
      } catch (e) {
        console.warn('Sanctuary audio error:', e);
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

  // Chamber 60-second countdown
  useEffect(() => {
    if (!isChamberActive) return;
    const interval = setInterval(() => {
      setChamberTimer((prev) => {
        if (prev <= 1) {
          setIsChamberActive(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isChamberActive]);

  const handleSynthesizeSanctuary = async () => {
    setIsLoading(true);
    const item = TENSION_PRESETS.find(p => p.id === selectedTension);
    const tensionLabel = item ? item.label : '긴장';
    const combined = customDetail.trim() ? `${tensionLabel} (${customDetail.trim()})` : tensionLabel;

    const systemPrompt = "당신은 오라(AURA)의 완전 해방 방하착 챔버 마스터입니다. 세도나 메서드의 흘려보내기 5문답과 1분 마이크로 명상의 60초 집중 동조를 융합하여 '완전 해방 방하착 챔버' 가이드를 설계하세요.";
    const userPrompt = `[집착/긴장 상태]: "${combined}"
[사용자 닉네임]: "${userProfile?.basic?.nickname || '치유자'}"

반드시 아래 JSON 스키마로만 엄격하게 응답하세요:
{
  "title": "방하착 챔버 고유 명칭 (예: 528Hz 완전 해방 무저항 챔버)",
  "tensionArea": "${tensionLabel}",
  "sedonaInquiryAnswer": "세도나 5문답을 바탕으로 쥐고 있던 집착을 놓아주는 해방적 깨달음 문장",
  "sixtySecondSanctuaryProtocol": [
    "00~15초: 자각 단계 가이드",
    "15~35초: 허용 및 환영 단계 가이드",
    "35~50초: 흘려보내기(놓아줌) 단계 가이드",
    "50~60초: 순수 현존 상태 정착 가이드"
  ],
  "zeroResistanceDeclaration": "저항 0%로 회귀하는 1인칭 완전 해방 선언문",
  "pureLightState": "순수 해방 상태 명칭 (예: 저항 0% · 절대 평온)"
}`;

    const safetyTimeout = new Promise<SanctuaryData>((resolve) => {
      setTimeout(() => {
        resolve({
          ...FALLBACK_SANCTUARY,
          tensionArea: tensionLabel,
          title: `〈${tensionLabel} 해방〉 완전 방하착 챔버`
        });
      }, 6500);
    });

    const runAI = async (): Promise<SanctuaryData> => {
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
          if (parsed && parsed.zeroResistanceDeclaration) {
            return parsed;
          }
        } catch (e) {
          console.warn('[AuraSynergy] Gemini direct error:', e);
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
        if (parsed && parsed.zeroResistanceDeclaration) {
          return parsed;
        }
      }
      throw new Error('Need fallback');
    };

    try {
      const result = await Promise.race([runAI(), safetyTimeout]);
      setSanctuaryData(result);
      recordPrismFeature({
        app: 'heal',
        featureName: 'Aura Zero-Resistance Sanctuary Synergy',
        summary: result.title,
        details: { tension: combined, title: result.title }
      });
      updateSharedState({}, 'HEAL');
    } catch (e) {
      console.warn('Aura fallback error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const text = `⚡ [${sanctuaryData.title}]\n\n🌿 타겟 긴장: ${sanctuaryData.tensionArea}\n💬 세도나 방하착: ${sanctuaryData.sedonaInquiryAnswer}\n\n⏱️ 60초 챔버 프로토콜:\n${sanctuaryData.sixtySecondSanctuaryProtocol.join('\n')}\n\n🕊️ 완전 해방 선언: "${sanctuaryData.zeroResistanceDeclaration}"\n- PRISM AURA Zero-Resistance Sanctuary`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12 text-white font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-zinc-950/90 to-teal-950/40 shadow-[0_0_50px_rgba(16,185,129,0.15)] backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-teal-500/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                SEDONA METHOD + 1-MIN MEDITATION FUSION
              </span>
              <span className="text-[10px] text-white/40 font-mono">ZERO RESISTANCE 528Hz</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Leaf className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" size={28} />
              <span>완전 해방 방하착 챔버 (Zero-Resistance)</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/70 max-w-xl leading-relaxed">
              <strong>세도나 메서드(섹션1)</strong>의 5문답 흘려보내기 원리와 <strong>1분 마이크로 명상(섹션2)</strong>의 60초 집중 동조를 융합하여, 몸과 마음에 맺힌 저항을 0%로 증발시키는 방하착 챔버입니다.
            </p>
          </div>

          <button
            onClick={toggleTone}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-sans flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
              isAudioPlaying
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
            }`}
          >
            {isAudioPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioPlaying ? '치유 주파수 재생 중' : '528Hz 치유음 켜기'}</span>
          </button>
        </div>
      </div>

      {/* Tension Preset Selection */}
      <div className="glass p-6 sm:p-8 rounded-[32px] border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-emerald-300 flex items-center gap-2 font-mono uppercase tracking-wider">
            <Wind size={16} className="text-emerald-400" />
            <span>1. 오늘 즉시 흘려보내고 싶은 긴장/집착 영역 선택</span>
          </label>
          <span className="text-[10px] text-white/40 font-sans">실시간 해방 처방</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TENSION_PRESETS.map((p) => {
            const isSelected = selectedTension === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedTension(p.id)}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/25 border-emerald-400/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]'
                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="text-xs font-bold font-sans truncate">{p.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-[11px] text-white/50 mb-2 font-medium">
            마음에 걸리는 생각이나 쥐고 있는 감정이 있다면 자유롭게 적어주세요 (선택):
          </label>
          <input
            type="text"
            value={customDetail}
            onChange={(e) => setCustomDetail(e.target.value)}
            placeholder="예: 이번 프로젝트 결과에 대해 온종일 초조하고 안절부절못하겠어요..."
            className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/60 font-sans"
          />
        </div>

        <button
          onClick={handleSynthesizeSanctuary}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin text-black" />
              <span>세도나 5문답 & 60초 명상 챔버 융합 중...</span>
            </>
          ) : (
            <>
              <Zap size={18} className="text-black" />
              <span>〈완전 해방 방하착 챔버 & 60초 프로토콜〉 가동하기</span>
            </>
          )}
        </button>
      </div>

      {/* Output Chamber Card */}
      <motion.div
        key={sanctuaryData.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[36px] sm:rounded-[44px] bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black/95 border border-emerald-500/30 p-6 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                ZERO-RESISTANCE CHAMBER
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                {sanctuaryData.pureLightState}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{sanctuaryData.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? '복사 완료' : '전체 복사'}</span>
            </button>
          </div>
        </div>

        {/* 60s Interactive Chamber Timer Widget */}
        <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-2 font-mono">
              <Timer size={16} className="text-emerald-400" />
              <span>60초 무저항 방하착 챔버 가동</span>
            </span>
            <button
              onClick={() => {
                if (isChamberActive) {
                  setIsChamberActive(false);
                  setChamberTimer(60);
                } else {
                  setIsChamberActive(true);
                  setChamberTimer(60);
                }
              }}
              className="text-xs font-bold px-4 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer"
            >
              {isChamberActive ? '챔버 중단' : '60초 방하착 시작'}
            </button>
          </div>

          {isChamberActive && (
            <div className="relative w-36 h-36 flex items-center justify-center py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-emerald-400/40"
              />
              <div className="w-28 h-28 rounded-full bg-emerald-500/20 border border-emerald-400 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <span className="text-3xl font-mono font-black text-white">{chamberTimer}s</span>
                <span className="text-[9px] uppercase tracking-widest text-emerald-300">LETTING GO</span>
              </div>
            </div>
          )}
        </div>

        {/* 60s Protocol Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-emerald-300 uppercase font-mono tracking-wider flex items-center gap-2">
            <Wind size={14} /> 60초 단계별 방하착 가이드
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sanctuaryData.sixtySecondSanctuaryProtocol.map((proto, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <p className="text-xs text-white/80 leading-relaxed font-sans">{proto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Zero Resistance Declaration */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-900/30 via-zinc-900/50 to-teal-900/20 border border-emerald-400/40 relative shadow-inner space-y-2">
          <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400" />
            저항 0% 완전 해방 선언문 (Zero-Resistance Declaration)
          </span>
          <p className="text-base sm:text-lg font-bold text-white leading-relaxed tracking-tight break-keep">
            "{sanctuaryData.zeroResistanceDeclaration}"
          </p>
        </div>
      </motion.div>
    </div>
  );
}
