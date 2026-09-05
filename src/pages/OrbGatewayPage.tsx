import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  Square,
  Play,
  Check,
  Copy,
} from "lucide-react";
import { sacredAudio } from "@/lib/omniWarp/sacredAudio";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";
import { recordPrismFeature } from "@/lib/prismOmniSync";
import { playTTS, stopTTS, useTTSActive } from "@/utils/tts";

interface ScryingCard {
  id: string;
  name: string;
  subTitle: string;
  arcana: string;
  color: string;
  glow: string;
  oraclePoem: string;
  guidance: string;
}

const ORACLE_ARCHETYPES: ScryingCard[] = [
  {
    id: "the_star",
    name: "희망의 별 (The Star)",
    subTitle: "혼란 속에서 길을 비추는 영혼의 정화",
    arcana: "제17번 아르카나",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.6)",
    oraclePoem: "가장 깊은 어둠 속에서도 은하의 나침반은 언제나 제자리를 가리킵니다. 쥐고 있던 불안을 맑은 물에 조용히 씻어내세요.",
    guidance: "지금 겪고 있는 혼란은 새로운 빛이 스며들기 위한 과정입니다. 스스로를 향한 비판을 멈추고 맑은 호흡으로 중심을 잡으세요.",
  },
  {
    id: "the_magician",
    name: "창조의 연금술사 (The Magician)",
    subTitle: "상상을 현실로 빚어내는 즉각적인 실행",
    arcana: "제1번 아르카나",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.6)",
    oraclePoem: "테이블 위의 모든 원소가 이미 당신의 손끝에서 깨어나고 있습니다. 생각의 무게를 줄이고 첫 발을 내딛으세요.",
    guidance: "완벽한 타이밍이란 없습니다. 바로 지금 시작하는 5분의 작은 움직임이 거대한 돌파구를 만들어냅니다.",
  },
  {
    id: "the_high_priestess",
    name: "심연의 여사제 (The High Priestess)",
    subTitle: "소음을 넘어 본질을 짚어내는 직관의 힘",
    arcana: "제2번 아르카나",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.6)",
    oraclePoem: "세상의 시끄러운 소음 아래, 당신이 이미 알고 있는 직관의 열쇠가 맑게 빛나고 있습니다.",
    guidance: "논리와 타인의 의견에 억지로 끼워 맞추지 마세요. 당신의 내면이 보내는 첫 느낌이 가장 정확한 해답입니다.",
  },
  {
    id: "the_empress",
    name: "풍요의 여황제 (The Empress)",
    subTitle: "생명력과 감각을 깨우는 창조적 카타르시스",
    arcana: "제3번 아르카나",
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.6)",
    oraclePoem: "꽃은 서두르지 않아도 제 계절을 알아차립니다. 눈과 귀를 열어 세상의 아름다운 영감을 마음껏 흡수하세요.",
    guidance: "지금 당신에게 필요한 것은 조급한 재촉이 아니라 감각의 충전입니다. 온전히 쉬고 생기를 회복하세요.",
  },
  {
    id: "the_sun",
    name: "환희의 태양 (The Sun)",
    subTitle: "명료한 확신과 활기찬 긍정의 생명력",
    arcana: "제19번 아르카나",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.6)",
    oraclePoem: "먹구름을 뚫고 쏟아지는 찬란한 햇살처럼, 당신이 지닌 본래의 밝은 에너지가 곧 모든 것을 명료하게 드러냅니다.",
    guidance: "주저함을 털어내세요. 당신의 진심과 에너지가 향하는 곳에 순조로운 결실과 기쁨이 따릅니다.",
  },
  {
    id: "the_hermit",
    name: "등불의 은둔자 (The Hermit)",
    subTitle: "복잡한 생각 속 본질을 꿰뚫는 고요한 통찰",
    arcana: "제9번 아르카나",
    color: "#6366f1",
    glow: "rgba(99, 102, 241, 0.6)",
    oraclePoem: "세상의 분주한 소음에서 한 걸음 물러설 때, 비로소 당신 안의 등불이 가장 선명한 해답을 비춥니다.",
    guidance: "혼란스러울 때는 외부의 조언보다 내면의 고요를 먼저 찾으세요. 답은 이미 당신의 중심에 있습니다.",
  },
];

export default function OrbGatewayPage() {
  const [inquiry, setInquiry] = useState("");
  const [isScrying, setIsScrying] = useState(false);
  const [scryingResult, setScryingResult] = useState<ScryingCard | null>(null);
  const [aiCustomText, setAiCustomText] = useState<string | null>(null);

  // Audio & Mic States
  const [isDroneOn, setIsDroneOn] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // TTS State from Prism Hook
  const isTTSActive = useTTSActive();

  // Prism Sync Info
  const [prismUserName, setPrismUserName] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synchronize Prism identity
  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem("prism_user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.displayName) setPrismUserName(p.displayName);
      }
    } catch (_) {}

    return () => {
      stopTTS();
    };
  }, []);

  // Swirling Particle Nebula Inside Orb Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = 380);
    const height = (canvas.height = 380);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      speed: number;
      dist: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = ["#60a5fa", "#a78bfa", "#38bdf8", "#c084fc", "#ffffff"];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        radius: Math.random() * 2.2 + 0.6,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.012 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        dist: Math.random() * 130 + 8,
        alpha: Math.random() * 0.65 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep glowing core
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        width / 2
      );
      grad.addColorStop(0, "rgba(96, 165, 250, 0.22)");
      grad.addColorStop(0.5, "rgba(167, 139, 250, 0.12)");
      grad.addColorStop(1, "rgba(4, 3, 10, 0.95)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      // Swirling Stardust Particles
      particles.forEach((p) => {
        p.angle += p.speed * (1 + audioLevel * 2.5 + (isScrying ? 4 : 0));
        const px = width / 2 + Math.cos(p.angle) * p.dist;
        const py = height / 2 + Math.sin(p.angle) * p.dist;

        ctx.beginPath();
        ctx.arc(px, py, p.radius * (1 + audioLevel * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (isScrying ? 0.95 : 0.7);
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [audioLevel, isScrying]);

  // Toggle 528Hz Solfeggio Healing Drone
  const handleToggleDrone = () => {
    const active = sacredAudio.toggleDrone();
    setIsDroneOn(active);
    triggerHaptic("whitehole");
  };

  // Toggle Vocal Resonance Microphone
  const handleToggleMic = async () => {
    if (isMicActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setIsMicActive(false);
      setAudioLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = actx;
      const src = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyserRef.current = analyser;
      setIsMicActive(true);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (!analyserRef.current || !mediaStreamRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;
        setAudioLevel(Math.min(1.0, avg / 70));
        requestAnimationFrame(poll);
      };
      poll();
    } catch {
      setIsMicActive(true);
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.3 + 0.1);
      }, 250);
      setTimeout(() => clearInterval(interval), 15000);
    }
  };

  // Speak Oracle Message with TTS
  const handleSpeakTTS = (card: ScryingCard, textToRead: string) => {
    if (isTTSActive) {
      stopTTS();
      return;
    }

    const speechScript = `${card.name}. ${textToRead} 마음을 위한 조언입니다. ${card.guidance}`;
    playTTS(speechScript, "lucy");
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyResult = (card: ScryingCard, text: string) => {
    try {
      navigator.clipboard.writeText(`[크리스탈 오라클]\n상징: ${card.name}\n계시: "${text}"\n조언: ${card.guidance}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  // Execute True Scrying Divination with Prism Bidirectional Context
  const executeScrying = async (questionText?: string) => {
    const query = questionText || inquiry.trim() || "지금 나에게 필요한 가장 명료한 통찰과 직관의 해답";
    stopTTS();
    setIsScrying(true);
    setScryingResult(null);
    setAiCustomText(null);

    sacredAudio.playSingingBowl(528);
    triggerHaptic("blackhole");

    // Gather Prism background knowledge (Profile, MBTI, Saju)
    let prismContextBriefing = "";
    try {
      const profileRaw = localStorage.getItem("prism_user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.displayName) prismContextBriefing += `이름: ${p.displayName}. `;
        if (p?.basic?.mbti) prismContextBriefing += `성향/MBTI: ${p.basic.mbti}. `;
      }
    } catch (_) {}

    // Random Archetype seed based on query
    const hash = query.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const chosen = ORACLE_ARCHETYPES[hash % ORACLE_ARCHETYPES.length];

    let revealedText = chosen.oraclePoem;

    // Call API for real-time poetic oracle revelation
    try {
      const resp = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[질문자 프리즘 배경지식: ${prismContextBriefing || "자유 탐색자"}]\n질문: "${query}"\n뽑힌 상징: "${chosen.name}" (${chosen.subTitle})\n역할: 필요할 때 언제든 즉시 꺼내어 보는 직관과 결단의 수정구슬 오라클. 밤 인사나 회고조 말투를 완전히 지양하고, 사용자가 지금 당장 명료한 통찰과 용기를 얻을 수 있는 2~3문장의 따뜻하고 명쾌한 시적 계시와 실천 조언을 한국어로 답해줘. (이모티콘이나 기호 없이 순수 문장으로 작성)`,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const generated = data?.text || data?.response || data?.content;
        if (generated && typeof generated === "string" && generated.trim().length > 10) {
          revealedText = generated.trim();
          setAiCustomText(revealedText);
        }
      }
    } catch (e) {
      console.warn("AI generation fallback:", e);
    }

    setTimeout(() => {
      setIsScrying(false);
      setScryingResult(chosen);
      sacredAudio.playSingingBowl(639);

      // Auto play TTS voice reading
      const speechScript = `${chosen.name}. ${revealedText} 조언. ${chosen.guidance}`;
      playTTS(speechScript, "lucy");

      // Bidirectional Synchronization: Save Oracle Insight into Prism Background Knowledge
      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const orbPayload = {
          cardId: chosen.id,
          cardName: chosen.name,
          subTitle: chosen.subTitle,
          query,
          revealedText,
          guidance: chosen.guidance,
          timestamp: Date.now(),
          dateKey: todayKey,
        };

        // 1. Dedicated Prism background storage slots
        localStorage.setItem("prism_orb_latest_scrying", JSON.stringify(orbPayload));
        localStorage.setItem(`prism_daily_oracle_orb_${todayKey}`, JSON.stringify(orbPayload));
        localStorage.setItem("prism_latest_daily_orb", JSON.stringify(orbPayload));

        // 2. Register to general Prism feature history
        recordPrismFeature({
          app: "hub",
          featureName: "수정구슬 오라클 신탁",
          summary: `[${chosen.name}] ${revealedText.slice(0, 80)}`,
          details: orbPayload,
        });

        // 3. Real-time Cross-tab Broadcast Channel
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("prism-cross-app");
          bc.postMessage({
            type: "PRISM_ORB_INSIGHT",
            payload: orbPayload,
          });
          bc.close();
        }

        // 4. CustomEvents for live reactivity
        window.dispatchEvent(new CustomEvent("prism:orb_scrying_updated", { detail: orbPayload }));
        window.dispatchEvent(new CustomEvent("prism:feature_updated", { detail: orbPayload }));
      } catch (syncErr) {
        console.warn("[OrbGateway] Prism sync error:", syncErr);
      }
    }, 2000);
  };

  return (
    <div
      className="relative w-full h-screen text-slate-100 flex flex-col items-center justify-between overflow-hidden select-none font-sans bg-[#05050c]"
      style={{
        background: "radial-gradient(circle at 50% 30%, #0d0d1e 0%, #05050e 65%, #020206 100%)",
      }}
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-40 w-full max-w-4xl px-5 pt-5 sm:pt-7 flex items-center justify-between">
        {/* Left: Real-time Prism Sync Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-slate-300 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">프리즘 실시간 연동</span>
          <span className="sm:hidden">연동됨</span>
        </div>

        {/* Center Title */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg">
          <Sparkles size={14} className="text-cyan-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200">
            {prismUserName ? `${prismUserName}의 수정구슬` : "크리스탈 오라클"}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDrone}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl border transition-all active:scale-95 ${
              isDroneOn
                ? "bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title="528Hz 치유 사운드 토글"
          >
            {isDroneOn ? <Volume2 size={13} className="text-purple-400 animate-pulse" /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">528Hz</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl border transition-all active:scale-95 ${
              isMicActive
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title="마이크 공명 토글"
          >
            {isMicActive ? <Mic size={13} className="text-cyan-400 animate-bounce" /> : <MicOff size={13} />}
            <span className="hidden sm:inline">{isMicActive ? "공명 중" : "음성"}</span>
          </button>
        </div>
      </header>

      {/* Main Stage: Pristine 3D Crystal Ball */}
      <main className="relative z-30 flex-1 flex flex-col items-center justify-center w-full max-w-lg px-4 my-auto">
        <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
          {/* Subtle Outer Energy Rings (Minimalist Cyber-Glass Halo) */}
          <div
            className="absolute inset-0 rounded-full border border-cyan-500/20 pointer-events-none transition-all duration-700"
            style={{
              transform: `scale(${1 + audioLevel * 0.15})`,
              boxShadow: isScrying ? "0 0 35px rgba(56, 189, 248, 0.3)" : "none",
            }}
          />
          <div
            className="absolute -inset-4 rounded-full border border-purple-500/15 pointer-events-none transition-all duration-700 animate-pulse"
            style={{
              transform: `scale(${1 + audioLevel * 0.25})`,
            }}
          />

          {/* Pure Hyper-Realistic Glass Crystal Orb */}
          <div
            onClick={() => executeScrying()}
            className="group relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 overflow-hidden"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 45%, rgba(0, 0, 0, 0.88) 100%)",
              boxShadow: isScrying
                ? "inset 0 0 40px rgba(56, 189, 248, 0.45), inset -10px -10px 25px rgba(0,0,0,0.95), 0 0 50px rgba(56, 189, 248, 0.4), 0 0 80px rgba(168, 85, 247, 0.25)"
                : "inset 0 0 30px rgba(255, 255, 255, 0.25), inset -10px -10px 25px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.25)",
              transform: `scale(${1 + audioLevel * 0.08})`,
            }}
          >
            {/* Swirling Stardust Particle Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-full pointer-events-none z-10"
            />

            {/* Top Specular Glare (Glass Surface Reflection) */}
            <div
              className="absolute top-3 left-6 sm:top-4 sm:left-8 w-20 sm:w-24 h-8 sm:h-10 rounded-full pointer-events-none z-30 -rotate-[28deg]"
              style={{
                background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.75) 0%, transparent 75%)",
              }}
            />

            {/* Internal Center Revelation Typography */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center pointer-events-none p-4 select-none">
              <AnimatePresence mode="wait">
                {isScrying ? (
                  <motion.div
                    key="scrying"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: [1, 1.05, 1] }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-xs sm:text-sm font-semibold tracking-widest text-cyan-300 animate-pulse">
                      영시 수렴 중...
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      마음의 파동을 읽고 있습니다
                    </span>
                  </motion.div>
                ) : scryingResult ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <span
                      style={{
                        color: scryingResult.color,
                        textShadow: `0 0 14px ${scryingResult.glow}`,
                      }}
                      className="text-sm sm:text-base font-bold tracking-wider"
                    >
                      {scryingResult.name.split("(")[0].trim()}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {scryingResult.arcana}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="flex flex-col items-center">
                    <span className="text-xs sm:text-sm font-medium tracking-wider text-slate-300/80">
                      수정구슬 터치
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">
                      질문을 떠올리며 터치하세요
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Glass Rim Light */}
            <div className="absolute inset-x-8 bottom-1.5 h-2.5 rounded-full bg-gradient-to-t from-cyan-400/25 to-transparent blur-[1px] pointer-events-none z-30" />
          </div>
        </div>

        {/* Revealed Oracle Card Card with TTS Player */}
        <AnimatePresence>
          {scryingResult && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full mt-4 p-5 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-3"
            >
              {/* Card Header & TTS Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 font-medium">
                      {scryingResult.arcana}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {scryingResult.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{scryingResult.subTitle}</p>
                </div>

                {/* TTS Voice Reading Button */}
                <button
                  type="button"
                  onClick={() => handleSpeakTTS(scryingResult, aiCustomText || scryingResult.oraclePoem)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    isTTSActive
                      ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
                  }`}
                  title={isTTSActive ? "낭독 중지" : "루시 음성으로 계시 낭독 듣기"}
                >
                  {isTTSActive ? (
                    <>
                      <Square size={12} className="fill-cyan-300 text-cyan-300" />
                      <span>낭독 중지</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} className="fill-slate-200 text-slate-200" />
                      <span>음성 낭독</span>
                    </>
                  )}
                </button>
              </div>

              {/* Poetic Oracle Inscription */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
                  "{aiCustomText || scryingResult.oraclePoem}"
                </p>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-1.5 text-[11px] text-cyan-200/90 leading-normal">
                  <span className="font-semibold shrink-0">마음 조언:</span>
                  <span>{scryingResult.guidance}</span>
                </div>
              </div>

              {/* Action Buttons: Pure Standalone Tools & Prism Sync Indicator */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                {/* Left: Auto-Sync Confirmation Badge */}
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <Check size={12} className="text-emerald-400" />
                  <span>프리즘 배경지식 연동 완료</span>
                </div>

                {/* Right: Copy & Ask Again */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyResult(scryingResult, aiCustomText || scryingResult.oraclePoem)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-all active:scale-95 border border-white/10"
                    title="계시 전문 복사"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-300">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>계시 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => executeScrying()}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/20 text-white transition-all active:scale-95 border border-white/15"
                  >
                    <RotateCcw size={12} />
                    <span>다시 묻기</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Divination Inquiry Console */}
      <footer className="relative z-40 w-full max-w-xl px-4 pb-5 sm:pb-7 flex flex-col items-center">
        {/* Question Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inquiry.trim()) executeScrying(inquiry);
          }}
          className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-2xl shadow-xl"
        >
          <input
            type="text"
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder="마음속 고민이나 질문을 건네보세요..."
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={isScrying}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black active:scale-95 transition-all disabled:opacity-50 shadow-md"
          >
            <span>영시 개화</span>
            <Send size={13} />
          </button>
        </form>
      </footer>
    </div>
  );
}
