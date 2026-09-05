import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  Compass,
  Zap,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Eye,
} from "lucide-react";
import { omniWarpAudio } from "@/lib/omniWarp/omniWarpAudio";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";
import { sendPrismToss } from "@/lib/prismToss";

interface DimensionChannel {
  id: string;
  name: string;
  subName: string;
  icon: string;
  path: string;
  angleDeg: number;
  themeColor: string;
  glowColor: string;
  tagline: string;
  desc: string;
}

const DIMENSIONS: DimensionChannel[] = [
  {
    id: "lucy",
    name: "루시 심층 교신",
    subName: "영혼의 AI 가이드",
    icon: "💬",
    path: "/lucy",
    angleDeg: 270, // 12 o'clock
    themeColor: "#c084fc",
    glowColor: "rgba(192, 132, 252, 0.7)",
    tagline: "내면의 가장 깊은 고백과 지혜로운 공명",
    desc: "판단 없이 온전히 경청하는 루시와 1:1 심층 대화를 시작합니다.",
  },
  {
    id: "oracle",
    name: "오라클 타로",
    subName: "내면아이 무의식 탐색",
    icon: "🔮",
    path: "/trinity",
    angleDeg: 315, // 1:30 o'clock
    themeColor: "#818cf8",
    glowColor: "rgba(129, 140, 248, 0.7)",
    tagline: "무의식이 건네는 3장의 타로 카드 상징",
    desc: "직관을 일깨우고 운명의 나침반을 비추는 타로 리딩을 펼칩니다.",
  },
  {
    id: "orange",
    name: "오렌지 5분 루틴",
    subName: "즉시 착수 포커스",
    icon: "🍊",
    path: "/orange",
    angleDeg: 0, // 3 o'clock
    themeColor: "#fb923c",
    glowColor: "rgba(251, 146, 60, 0.7)",
    tagline: "망설임을 멈추고 5분 안에 즉시 실행",
    desc: "생각의 과부하를 끄고 몸을 먼저 움직이는 미니멀 타이머입니다.",
  },
  {
    id: "heal",
    name: "호오포노포노 치유",
    subName: "감정 상처 소멸 의식",
    icon: "🌊",
    path: "/heal",
    angleDeg: 45, // 4:30 o'clock
    themeColor: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.7)",
    tagline: "미안·용서·감사·사랑 4마디 정화 파동",
    desc: "가슴에 맺힌 응어리를 맑은 푸른 파도로 씻어내는 정화 의식입니다.",
  },
  {
    id: "bluebird",
    name: "파랑새의 성소",
    subName: "소소한 일상 행복",
    icon: "🕊️",
    path: "/bluebird",
    angleDeg: 90, // 6 o'clock
    themeColor: "#38bdf8",
    glowColor: "rgba(14, 165, 233, 0.7)",
    tagline: "일상의 온기와 따뜻한 감사의 기록",
    desc: "바쁜 하루 속에서 놓친 소중한 감사와 평온을 되찾아드립니다.",
  },
  {
    id: "muse",
    name: "뮤즈 예술처방",
    subName: "명화·명시·명곡 3위일체",
    icon: "🎨",
    path: "/muse",
    angleDeg: 135, // 7:30 o'clock
    themeColor: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.7)",
    tagline: "감성과 심미적 카타르시스의 공명",
    desc: "지금 마주한 감정에 딱 맞는 세계적 명화와 시, 음악을 엮어 선물합니다.",
  },
  {
    id: "epilogue",
    name: "에필로그 밤 서재",
    subName: "하루 마감 회고 수필",
    icon: "📖",
    path: "/epilogue",
    angleDeg: 180, // 9 o'clock
    themeColor: "#34d399",
    glowColor: "rgba(52, 211, 153, 0.7)",
    tagline: "오늘의 영감과 감정을 한 편의 수필로",
    desc: "밤 서재의 온기 속에서 하루를 품위 있게 마감하고 내일을 맞이합니다.",
  },
  {
    id: "hub",
    name: "프롤로그 허브",
    subName: "우주적 교차로",
    icon: "⚡",
    path: "/",
    angleDeg: 225, // 10:30 o'clock
    themeColor: "#f43f5e",
    glowColor: "rgba(244, 63, 94, 0.7)",
    tagline: "모든 차원의 영감이 교차하는 중심축",
    desc: "프리즘 전역의 채널과 상태를 조망하는 메인 허브로 복귀합니다.",
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export default function OrbGatewayPage() {
  const [, setLocation] = useLocation();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeDim = DIMENSIONS[selectedIdx];

  const [isPressing, setIsPressing] = useState(false);
  const [gauge, setGauge] = useState(0);
  const [activePhase, setActivePhase] = useState<"idle" | "whitehole" | "event_horizon" | "blackhole">("idle");
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 to 1.0 for vocal resonance
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [prismSynced, setPrismSynced] = useState(false);
  const [prismUserName, setPrismUserName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const uid = localStorage.getItem("prism_auth_uid") || sessionStorage.getItem("prism_auth_uid");
      const profileRaw = localStorage.getItem("prism_user_profile");
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile?.displayName) setPrismUserName(profile.displayName);
      }
      if (uid) setPrismSynced(true);
    } catch (_) {}
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPhaseRef = useRef<string>("idle");

  // Web Audio Context for microphone
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Trigger particle explosion
  const triggerBigBang = useCallback((x: number, y: number, isDeep: boolean) => {
    particlesRef.current = [];
    const count = 140;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isDeep ? Math.random() * 14 + 4 : Math.random() * 8 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.8 + 1,
        color: isDeep
          ? `hsl(${Math.random() * 40 + 300}, 100%, 70%)`
          : `hsl(${Math.random() * 40 + 180}, 100%, 75%)`,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
      });
    }
  }, []);

  // Continuous Canvas Particle Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Toggle Microphone for live vocal resonance
  const toggleMic = async () => {
    if (isMicActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setIsMicActive(false);
      setAudioLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setIsMicActive(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current || !mediaStreamRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(1, avg / 100));
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.warn("Microphone access not granted, using simulated resonance:", err);
      setIsMicActive(true);
      // Fallback simulated acoustic breathing
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.4 + 0.1);
      }, 300);
      return () => clearInterval(interval);
    }
  };

  // Pressure & Gazing handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setIsPressing(true);
    touchStartRef.current = {
      time: performance.now(),
      x: e.clientX,
      y: e.clientY,
    };
    lastPhaseRef.current = "idle";
    omniWarpAudio.playWhiteHole();
    triggerHaptic("whitehole");

    if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    let curForce = 0;
    pressTimerRef.current = setInterval(() => {
      curForce = Math.min(1.0, curForce + 0.025);
      setGauge(curForce);

      let phase: "idle" | "whitehole" | "event_horizon" | "blackhole" = "idle";
      if (curForce < 0.3) phase = "whitehole";
      else if (curForce < 0.7) phase = "event_horizon";
      else phase = "blackhole";

      setActivePhase(phase);

      if (phase !== lastPhaseRef.current) {
        if (phase === "whitehole") {
          omniWarpAudio.playWhiteHole();
          triggerHaptic("whitehole");
        } else if (phase === "event_horizon") {
          omniWarpAudio.playEventHorizon();
          triggerHaptic("event_horizon");
        } else if (phase === "blackhole") {
          omniWarpAudio.playBlackHole();
          triggerHaptic("blackhole");
        }
        lastPhaseRef.current = phase;
      }
    }, 28);
  };

  const handlePointerUp = () => {
    if (!isPressing) return;
    setIsPressing(false);
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    const rect = orbRef.current?.getBoundingClientRect();
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const isDeep = gauge >= 0.7;

    triggerBigBang(originX, originY, isDeep);
    if (activePhase === "blackhole") {
      omniWarpAudio.playBigBang();
      triggerHaptic("blackhole");
    } else {
      omniWarpAudio.playWhiteHole();
      triggerHaptic("whitehole");
    }

    // Execute dimensional manifestation after flash
    setTimeout(() => {
      sendPrismToss({
        sourceApp: "hub",
        targetApp: activeDim.id as any,
        actionType: "smart_toss",
        contextMessage: `🔮 크리스탈 오라클 게이트웨이 전이: ${activeDim.name}`,
        tossedAt: Date.now(),
      });

      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("prism-cross-app");
          bc.postMessage({
            type: "PRISM_ORB_LEAP",
            target: activeDim.id,
            path: activeDim.path,
            timestamp: Date.now(),
          });
          bc.close();
        }
      } catch (_) {}

      const targetUrl = `${activeDim.path}?from=orb&theme=${encodeURIComponent(activeDim.name)}`;
      if (openInNewTab) {
        window.open(targetUrl, "_blank");
      } else {
        window.location.href = targetUrl;
      }
    }, 450);

    setGauge(0);
    setActivePhase("idle");
  };

  const handlePointerCancel = () => {
    setIsPressing(false);
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setGauge(0);
    setActivePhase("idle");
  };

  return (
    <div
      className="relative w-full h-screen text-white flex flex-col items-center justify-between overflow-hidden select-none touch-none font-sans"
      style={{
        background: "radial-gradient(circle at center, #0f1026 0%, #030308 100%)",
      }}
    >
      {/* Background Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

      {/* Top Header & Navigation Bar */}
      <header className="relative z-30 w-full max-w-lg px-4 pt-6 sm:pt-8 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white/90 backdrop-blur-md border border-white/15 transition-all active:scale-95"
          title="프리즘 본체 허브로 이동"
        >
          <ArrowLeft size={14} />
          <span>프리즘 본체</span>
        </a>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 backdrop-blur-md">
          <Sparkles size={13} className="text-purple-300 animate-pulse" />
          <span className="text-[11px] font-bold tracking-widest text-purple-200 uppercase">
            {prismSynced ? (prismUserName ? `PRISM · ${prismUserName}` : "PRISM CONNECTED") : "PRISM ORB"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenInNewTab(!openInNewTab)}
            className={`p-1.5 rounded-full text-xs font-medium backdrop-blur-md border transition-all active:scale-95 ${
              openInNewTab ? "bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-white/10 text-white/60 border-white/15 hover:text-white"
            }`}
            title={openInNewTab ? "도약 시 새 창으로 열기 (활성)" : "도약 시 현재 창에서 전환"}
          >
            <ExternalLink size={13} />
          </button>
          <button
            type="button"
            onClick={toggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all active:scale-95 ${
              isMicActive
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-white/10 text-white/70 border-white/15 hover:text-white"
            }`}
            title="음성 공명 모드 토글"
          >
            {isMicActive ? <Mic size={13} className="animate-bounce text-cyan-300" /> : <MicOff size={13} />}
            <span className="hidden xs:inline">{isMicActive ? "공명 중" : "음성"}</span>
          </button>
        </div>
      </header>

      {/* Hero 3D Crystal Orb Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center w-full max-w-md px-4">
        {/* Dynamic Dimensional Radial Aura */}
        <div
          className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-60"
          style={{
            background: `radial-gradient(circle, ${activeDim.glowColor} 0%, transparent 70%)`,
            transform: `scale(${1 + audioLevel * 0.4 + (isPressing ? gauge * 0.5 : 0)})`,
          }}
        />

        {/* The Giant Crystal Ball (수정구슬) */}
        <div
          ref={orbRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center cursor-pointer border border-white/35 active:scale-95 transition-all duration-200"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.06) 50%, rgba(0, 0, 0, 0.8) 100%)",
            boxShadow: isPressing
              ? gauge < 0.3
                ? "inset 0 0 35px rgba(255, 255, 255, 0.45), inset -8px -8px 20px rgba(0, 0, 0, 0.9), 0 0 45px rgba(255, 255, 255, 0.6)"
                : gauge < 0.7
                ? `inset 0 0 40px rgba(255, 255, 255, 0.5), inset -8px -8px 20px rgba(0, 0, 0, 0.9), 0 0 65px ${activeDim.glowColor}`
                : "inset 0 0 50px rgba(255, 255, 255, 0.6), inset -8px -8px 25px rgba(0, 0, 0, 0.95), 0 0 90px rgba(255, 0, 153, 0.9)"
              : `inset 0 0 30px rgba(255, 255, 255, 0.35), inset -8px -8px 20px rgba(0, 0, 0, 0.85), 0 0 40px ${activeDim.glowColor}`,
            transform: `scale(${1 + audioLevel * 0.1})`,
          }}
          aria-label={`Crystal Orb · ${activeDim.name}`}
        >
          {/* Top Specular Curved Glass Glare (상단 타원형 반사광) */}
          <div
            className="absolute top-3.5 left-6 sm:top-5 sm:left-8 w-20 sm:w-24 h-10 sm:h-12 rounded-full pointer-events-none z-30 -rotate-[25deg]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.7) 0%, transparent 80%)",
            }}
          />

          {/* Internal Swirling Starlight Nebula */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: isPressing ? 2.5 : 12,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-4 rounded-full pointer-events-none opacity-40 mix-blend-screen blur-[2px]"
            style={{
              background: `conic-gradient(from 0deg, ${activeDim.themeColor}, #ffffff, ${activeDim.themeColor})`,
            }}
          />

          {/* Peeking Vision Hologram (구슬 내부 영시 홀로그램) */}
          <div className="relative z-20 w-[80%] h-[80%] rounded-full flex flex-col items-center justify-center text-center p-3 pointer-events-none select-none">
            <motion.div
              animate={{
                y: isPressing ? [0, -2, 0] : [0, -4, 0],
                scale: isPressing ? (gauge < 0.3 ? 1.05 : gauge < 0.7 ? 1.15 : 1.25) : 1,
              }}
              transition={{
                duration: isPressing ? 0.8 : 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex flex-col items-center justify-center"
            >
              {/* Glowing Archetype Icon */}
              <div
                className="text-4xl sm:text-5xl mb-1 filter transition-all duration-300"
                style={{
                  textShadow: `0 0 20px ${isPressing && gauge >= 0.7 ? "#ff0099" : activeDim.themeColor}`,
                }}
              >
                {isPressing
                  ? gauge < 0.3
                    ? "⚡"
                    : gauge < 0.7
                    ? activeDim.icon
                    : "🌌"
                  : activeDim.icon}
              </div>

              {/* Archetype Title */}
              <div
                className="text-xs sm:text-sm font-black tracking-wider leading-tight text-white transition-colors duration-200"
                style={{
                  color: isPressing && gauge >= 0.7 ? "#ff0099" : activeDim.themeColor,
                  textShadow: `0 0 10px ${activeDim.glowColor}`,
                }}
              >
                {isPressing
                  ? gauge < 0.3
                    ? "즉시 탭 (QUICK)"
                    : gauge < 0.7
                    ? `화이트홀: ${activeDim.name.split(" ")[0]}`
                    : "블랙홀 빅뱅 (MATRIX)"
                  : activeDim.name}
              </div>

              {/* Sub-label inside orb */}
              <div className="text-[9px] sm:text-[10px] text-white/70 tracking-tight mt-1 max-w-[140px] truncate">
                {isPressing
                  ? gauge < 0.3
                    ? "손을 떼면 즉시 실행됩니다"
                    : gauge < 0.7
                    ? "차원 게이트웨이 수렴 중"
                    : "초지능 AI 심층 폭발 준비"
                  : activeDim.subName}
              </div>
            </motion.div>
          </div>

          {/* Lower Rim Fresnel Bounce Light (하단 반사광) */}
          <div className="absolute inset-x-8 bottom-2 h-4 rounded-full bg-gradient-to-t from-cyan-400/30 to-transparent blur-[1px] pointer-events-none z-30" />
        </div>

        {/* Real-time Telemetry & Pressure Meter */}
        <div className="mt-4 flex flex-col items-center w-full max-w-[260px]">
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${Math.max(6, gauge * 100)}%`,
                background:
                  gauge < 0.3
                    ? "#ffffff"
                    : gauge < 0.7
                    ? "linear-gradient(90deg, #00f0ff 0%, #818cf8 100%)"
                    : "linear-gradient(90deg, #818cf8 0%, #ff0099 100%)",
              }}
            />
          </div>

          <div className="text-[10px] font-mono text-white/60 tracking-wider">
            {!isPressing
              ? isMicActive
                ? `VOICE RESONANCE: ${(audioLevel * 100).toFixed(0)}%`
                : "Orb State: SLEEPING (Hold to Gazing)"
              : gauge < 0.3
              ? `CLEAR FOCUS: ${(gauge * 100).toFixed(0)}%`
              : gauge < 0.7
              ? `WHITEHOLE PEEK: ${(gauge * 100).toFixed(0)}%`
              : `BIGBANG MATRIX: ${(gauge * 100).toFixed(0)}%`}
          </div>
        </div>
      </main>

      {/* Bottom 8-Dimensional Orbit Navigation Bar */}
      <footer className="relative z-30 w-full max-w-lg px-4 pb-6 sm:pb-8 flex flex-col items-center">
        {/* Dimension Selector Tabs (8 Channels) */}
        <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-2 px-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-3">
          {DIMENSIONS.map((dim, idx) => {
            const isActive = idx === selectedIdx;
            return (
              <button
                key={dim.id}
                type="button"
                onClick={() => {
                  setSelectedIdx(idx);
                  triggerHaptic("whitehole");
                  omniWarpAudio.playWhiteHole();
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 text-white border border-white/30 shadow-lg scale-105"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{dim.icon}</span>
                <span className="text-[11px]">{dim.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Active Dimension Manifesto Banner & Quick Jump */}
        <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{activeDim.icon}</span>
              <span>{activeDim.name}</span>
              <span className="text-[10px] text-white/50 font-normal">({activeDim.subName})</span>
            </span>
            <span className="text-[10.5px] text-white/70 truncate mt-0.5">{activeDim.tagline}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerBigBang(window.innerWidth / 2, window.innerHeight / 2, false);
              setLocation(activeDim.path);
            }}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          >
            <span>도약</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}
