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
import { playTTS, stopTTS, useTTSActive } from "@/utils/tts";
import { BigBangButton } from "@/components/omniwarp/BigBangButton";
import { LucyGatewayFabButton } from "@/components/LucyGatewayFabButton";
import { PrismGatewayFabButton } from "@/components/PrismGatewayFabButton";
import { BgMusicPlayer } from "@/components/trinity/BgMusicPlayer";
import { CrystalOrbIcon } from "@/components/icons/CrystalOrbIcon";

interface ScryingResult {
  query: string;
  keyTheme: string;
  directAnswer: string;
  actionSolution: string;
  color?: string;
  glow?: string;
  timestamp: number;
}

const DEFAULT_ORACLE_SOLUTIONS: Array<{
  keyTheme: string;
  directAnswer: string;
  actionSolution: string;
  color: string;
  glow: string;
}> = [
  {
    keyTheme: "명료한 결단",
    directAnswer: "망설임이 길어질수록 생각의 무게만 늘어납니다. 이미 마음 깊은 곳에서 당신이 느끼고 있는 그 첫 번째 선택을 신뢰하고 방향을 확정하세요.",
    actionSolution: "불필요한 비교를 멈추고, 선택한 방향에 오늘 바로 첫 걸음을 떼어보세요.",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.6)",
  },
  {
    keyTheme: "과감한 실행",
    directAnswer: "완벽한 타이밍을 기다리지 마세요. 작은 움직임이 거대한 생각의 정체를 깨뜨리고 새로운 돌파구를 열어줍니다.",
    actionSolution: "5분 안에 끝낼 수 있는 가장 쉬운 행동 하나를 지금 즉시 실행하세요.",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.6)",
  },
  {
    keyTheme: "순리적 흐름",
    directAnswer: "지금은 억지로 힘을 주어 상황을 통제하려 하기보다, 흐름을 한 박자 관망하며 주변의 신호를 지켜보는 편이 훨씬 유리합니다.",
    actionSolution: "조급한 마음에 즉각적인 답을 요구하지 말고 하루만 여유를 두어보세요.",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.6)",
  },
  {
    keyTheme: "내면의 정돈",
    directAnswer: "외부의 소음과 타인의 기준에서 한 걸음 물러설 때, 진짜 당신이 원하고 집중해야 할 본질이 뚜렷해집니다.",
    actionSolution: "머릿속을 어지럽히는 복잡한 생각들을 종이에 적어보고 불필요한 것을 지워보세요.",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.6)",
  },
  {
    keyTheme: "시야의 전환",
    directAnswer: "지금 부딪힌 문제는 막다른 길이 아니라, 지금까지와는 다른 시각으로 접근하라는 기회의 신호입니다.",
    actionSolution: "문제를 정반대 입장에서 생각해보거나 다른 분야의 방식을 대입해보세요.",
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.6)",
  },
  {
    keyTheme: "자기 신뢰",
    directAnswer: "당신은 이미 이 상황을 지혜롭게 풀어갈 충분한 내적 역량을 갖추고 있습니다. 의심의 안개를 걷어내세요.",
    actionSolution: "과거에 어려움을 지혜롭게 극복했던 경험을 떠올리며 스스로를 격려하세요.",
    color: "#6366f1",
    glow: "rgba(99, 102, 241, 0.6)",
  },
];

export default function OrbGatewayPage() {
  const [inquiry, setInquiry] = useState("");
  const [isScrying, setIsScrying] = useState(false);
  const [scryingResult, setScryingResult] = useState<ScryingResult | null>(null);

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

    const handlePrismNavigate = (e: any) => {
      const targetPath = e?.detail?.path;
      if (targetPath && typeof targetPath === "string") {
        window.location.href = targetPath;
      }
    };
    window.addEventListener("prism-navigate", handlePrismNavigate);

    return () => {
      stopTTS();
      window.removeEventListener("prism-navigate", handlePrismNavigate);
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
  const handleSpeakTTS = (result: ScryingResult) => {
    if (isTTSActive) {
      stopTTS();
      return;
    }

    const speechScript = `${result.keyTheme}. ${result.directAnswer} 실천 가이드입니다. ${result.actionSolution}`;
    playTTS(speechScript, "lucy");
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyResult = (result: ScryingResult) => {
    try {
      navigator.clipboard.writeText(`[직관의 해답 - ${result.keyTheme}]\n질문: "${result.query}"\n해답: ${result.directAnswer}\n실천 가이드: ${result.actionSolution}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  // Execute Direct Question-Answering & Insight Scrying
  const executeScrying = async (questionText?: string) => {
    const query = questionText || inquiry.trim() || "지금 나에게 가장 필요한 명료한 방향과 선택";
    stopTTS();
    setIsScrying(true);
    setScryingResult(null);

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

    // Pick fallback solution based on query hash
    const hash = query.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const fallback = DEFAULT_ORACLE_SOLUTIONS[Math.abs(hash) % DEFAULT_ORACLE_SOLUTIONS.length];

    let finalResult: ScryingResult = {
      query,
      keyTheme: fallback.keyTheme,
      directAnswer: fallback.directAnswer,
      actionSolution: fallback.actionSolution,
      color: fallback.color,
      glow: fallback.glow,
      timestamp: Date.now(),
    };

    // Call API for real-time direct answer & practical action guide (strictly NO Tarot)
    try {
      const resp = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[질문자 정보: ${prismContextBriefing || "자유 탐색자"}]\n사용자의 질문/고민: "${query}"\n\n지침:\n1. 타로, 아르카나, 별자리, 운명론적 카드 상징은 일절 언급하지 마세요.\n2. 사용자의 질문이나 고민에 대해 본질을 꿰뚫는 명쾌하고 따뜻하며 직관적인 해답을 직접 답변하세요.\n3. 오늘 당장 실천할 수 있는 구체적인 가이드를 함께 제공하세요.\n4. 반드시 다음 순수 JSON 포맷으로만 응답하세요:\n{\n  "keyTheme": "2~4글자의 핵심 키워드 (예: 명료한 결단, 과감한 전환 등)",\n  "directAnswer": "고민에 대한 2~3문장의 명쾌하고 직관적인 직접 해답",\n  "actionSolution": "1문장의 구체적이고 현실적인 실천 가이드"\n}`,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const rawContent = data?.text || data?.response || data?.content || "";
        if (typeof rawContent === "string" && rawContent.trim().length > 0) {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.keyTheme && parsed.directAnswer) {
                finalResult = {
                  query,
                  keyTheme: String(parsed.keyTheme).trim(),
                  directAnswer: String(parsed.directAnswer).trim(),
                  actionSolution: String(parsed.actionSolution || fallback.actionSolution).trim(),
                  color: fallback.color,
                  glow: fallback.glow,
                  timestamp: Date.now(),
                };
              }
            } catch (_) {}
          } else if (rawContent.trim().length > 10) {
            finalResult = {
              query,
              keyTheme: "직관의 답",
              directAnswer: rawContent.trim(),
              actionSolution: fallback.actionSolution,
              color: fallback.color,
              glow: fallback.glow,
              timestamp: Date.now(),
            };
          }
        }
      }
    } catch (e) {
      console.warn("AI generation fallback:", e);
    }

    setTimeout(() => {
      setIsScrying(false);
      setScryingResult(finalResult);
      sacredAudio.playSingingBowl(639);

      // Auto play TTS voice reading
      const speechScript = `${finalResult.keyTheme}. ${finalResult.directAnswer} 실천 가이드입니다. ${finalResult.actionSolution}`;
      playTTS(speechScript, "lucy");

      // Bidirectional Synchronization: Save Insight into Prism Background Knowledge
      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const orbPayload = {
          query: finalResult.query,
          keyTheme: finalResult.keyTheme,
          directAnswer: finalResult.directAnswer,
          actionSolution: finalResult.actionSolution,
          timestamp: finalResult.timestamp,
          dateKey: todayKey,
        };

        // 1. Dedicated Prism background storage slots
        localStorage.setItem("prism_orb_latest_scrying", JSON.stringify(orbPayload));
        localStorage.setItem(`prism_daily_oracle_orb_${todayKey}`, JSON.stringify(orbPayload));
        localStorage.setItem("prism_latest_daily_orb", JSON.stringify(orbPayload));

        // 2. Register to general Prism feature history directly
        try {
          const entry = {
            id: `feat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            app: "hub",
            appName: "크리스탈 오라클",
            featureName: "직관의 해답",
            summary: `[${finalResult.keyTheme}] ${finalResult.directAnswer.slice(0, 80)}`,
            details: orbPayload,
            timestamp: Date.now(),
            dateKey: todayKey,
          };
          const rawHist = localStorage.getItem("prism_omni_feature_history");
          let hist = rawHist ? JSON.parse(rawHist) : [];
          if (!Array.isArray(hist)) hist = [];
          hist.unshift(entry);
          if (hist.length > 60) hist = hist.slice(0, 60);
          localStorage.setItem("prism_omni_feature_history", JSON.stringify(hist));
        } catch (_) {}

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
    }, 1200);
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

      {/* Top-Right Background Music Player (Same position as Prism Main & Expands Leftwards) */}
      <div className="fixed top-safe-2 right-4 sm:right-6 md:top-safe-4 z-[300]">
        <BgMusicPlayer />
      </div>

      {/* Top Header */}
      <header className="relative z-40 w-full max-w-4xl px-4 sm:px-6 pt-5 sm:pt-7 pr-16 sm:pr-24 flex items-center justify-between">
        {/* Left: Real-time Prism Sync Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-slate-300 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">프리즘 실시간 연동</span>
          <span className="sm:hidden">연동됨</span>
        </div>

        {/* Center Title */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg">
          <CrystalOrbIcon size={16} />
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200">
            {prismUserName ? `${prismUserName}의 직관 오브` : "크리스탈 오브"}
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
          {/* Subtle Outer Energy Rings */}
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
                      답변 숙고 중...
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      마음의 파동과 연결 중입니다
                    </span>
                  </motion.div>
                ) : scryingResult ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center px-3"
                  >
                    <span
                      style={{
                        color: scryingResult.color || "#38bdf8",
                        textShadow: `0 0 14px ${scryingResult.glow || "rgba(56, 189, 248, 0.6)"}`,
                      }}
                      className="text-base sm:text-lg font-extrabold tracking-wider"
                    >
                      {scryingResult.keyTheme}
                    </span>
                    <span className="text-[10px] text-slate-300 mt-1">
                      직관의 해답
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="flex flex-col items-center">
                    <span className="text-xs sm:text-sm font-medium tracking-wider text-slate-300/80">
                      오브 터치
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">
                      고민을 떠올리며 터치하세요
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Glass Rim Light */}
            <div className="absolute inset-x-8 bottom-1.5 h-2.5 rounded-full bg-gradient-to-t from-cyan-400/25 to-transparent blur-[1px] pointer-events-none z-30" />
          </div>
        </div>

        {/* Revealed Direct Solution Card with TTS Player */}
        <AnimatePresence>
          {scryingResult && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full mt-4 p-5 rounded-3xl bg-zinc-900/85 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-3"
            >
              {/* Card Header & TTS Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30">
                      직관의 해답
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {scryingResult.keyTheme}
                    </h4>
                  </div>
                  {scryingResult.query && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">
                      Q. "{scryingResult.query}"
                    </p>
                  )}
                </div>

                {/* TTS Voice Reading Button */}
                <button
                  type="button"
                  onClick={() => handleSpeakTTS(scryingResult)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 shrink-0 ${
                    isTTSActive
                      ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
                  }`}
                  title={isTTSActive ? "낭독 중지" : "루시 음성으로 답변 듣기"}
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

              {/* Direct Answer & Practical Solution */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-2.5">
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
                  {scryingResult.directAnswer}
                </p>
                <div className="pt-2 border-t border-white/5 flex items-start gap-1.5 text-[11px] text-cyan-200/90 leading-normal">
                  <span className="font-semibold text-cyan-300 shrink-0">실천 가이드:</span>
                  <span>{scryingResult.actionSolution}</span>
                </div>
              </div>

              {/* Action Buttons: Standalone Tools & Prism Sync Indicator */}
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
                    onClick={() => handleCopyResult(scryingResult)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-all active:scale-95 border border-white/10"
                    title="해답 및 실천 가이드 복사"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-300">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>답변 복사</span>
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
      <footer className="relative z-40 w-full max-w-xl px-4 pb-20 sm:pb-24 flex flex-col items-center">
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
            <span>답변받기</span>
            <Send size={13} />
          </button>
        </form>
      </footer>

      {/* 🚀 Persistent Cosmic Portals: Prism Home (Bottom-Left), Wormhole (Center), Lucy Chat (Bottom-Right) */}
      <PrismGatewayFabButton />
      <BigBangButton />
      <LucyGatewayFabButton position="right" />
    </div>
  );
}
