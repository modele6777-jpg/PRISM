import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { sacredAudio } from "@/lib/omniWarp/sacredAudio";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";
import { sendPrismToss } from "@/lib/prismToss";

interface ScryingCard {
  id: string;
  latinName: string;
  name: string;
  subTitle: string;
  arcana: string;
  color: string;
  glow: string;
  oraclePoem: string;
  guidance: string;
  targetApp: "muse" | "trinity" | "bluebird" | "heal" | "orange" | "epilogue";
  actionLabel: string;
}

const ORACLE_ARCHETYPES: ScryingCard[] = [
  {
    id: "the_star",
    latinName: "STELLA",
    name: "The Star · 희망의 북극성",
    subTitle: "어둠 속에서 길을 비추는 영혼의 정화",
    arcana: "Major Arcana XVII",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.8)",
    oraclePoem: "가장 깊은 어둠이 지나야 비로소 은하의 나침반이 드러납니다. 쥐고 있던 두려움을 밤하늘의 강물에 놓아주세요.",
    guidance: "지금 겪고 있는 혼란은 새로운 빛이 스며들기 위한 균열입니다. 오늘은 비판을 멈추고 온전히 자신을 위로하세요.",
    targetApp: "heal",
    actionLabel: "호오포노포노로 정화 도약",
  },
  {
    id: "the_magician",
    latinName: "MAGUS",
    name: "The Magician · 창조의 연금술",
    subTitle: "상상을 물질로 빚어내는 즉각적 실행",
    arcana: "Major Arcana I",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.8)",
    oraclePoem: "테이블 위의 네 가지 원소가 이미 당신의 손끝에서 춤추고 있습니다. 생각을 줄이고 손을 먼저 움직이세요.",
    guidance: "완벽한 준비란 없습니다. 첫 5분의 움직임이 우주의 모든 바퀴를 회전시킬 불씨가 됩니다.",
    targetApp: "orange",
    actionLabel: "오렌지 5분 루틴 도약",
  },
  {
    id: "the_high_priestess",
    latinName: "SACERDOS",
    name: "High Priestess · 심연의 베일",
    subTitle: "침묵 속에서만 들려오는 무의식의 신탁",
    arcana: "Major Arcana II",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.8)",
    oraclePoem: "세상의 소음이 잦아든 수면 아래, 당신의 영혼이 오래전 묻어둔 직관의 열쇠가 반짝이고 있습니다.",
    guidance: "타인의 시선이나 논리로 설득되지 않는 직관을 믿으세요. 내면아이가 속삭이는 말에 귀를 기울일 시간입니다.",
    targetApp: "trinity",
    actionLabel: "오라클 타로 심층 리딩",
  },
  {
    id: "the_empress",
    latinName: "IMPERATRIX",
    name: "The Empress · 생명의 개화",
    subTitle: "감성과 심미적 감각이 빚어내는 풍요",
    arcana: "Major Arcana III",
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.8)",
    oraclePoem: "꽃은 서두르지 않아도 제 계절을 알아차립니다. 눈과 귀를 열어 세상의 아름다운 선율을 가슴에 채우세요.",
    guidance: "지금 당신에게 필요한 것은 투쟁이 아니라 감각의 충전입니다. 명화와 명시 속에서 위대한 카타르시스를 만나보세요.",
    targetApp: "muse",
    actionLabel: "뮤즈 3위일체 예술처방",
  },
  {
    id: "the_sun",
    latinName: "SOLIS",
    name: "The Sun · 파랑새의 환희",
    subTitle: "소박한 일상 속에 깃든 무한한 축복",
    arcana: "Major Arcana XIX",
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.8)",
    oraclePoem: "행복은 저 먼 지평선 너머가 아닌, 오늘 당신의 창가에 앉아 노래하는 파랑새의 날개짓에 있습니다.",
    guidance: "따뜻한 차 한 잔, 다정한 안부 한마디의 힘을 과소평가하지 마세요. 소소한 감사가 삶의 기적을 불러옵니다.",
    targetApp: "bluebird",
    actionLabel: "파랑새의 성소로 도약",
  },
  {
    id: "the_hermit",
    latinName: "EREMITA",
    name: "The Hermit · 밤 서재의 등불",
    subTitle: "하루를 마감하며 내면을 비추는 지혜",
    arcana: "Major Arcana IX",
    color: "#818cf8",
    glow: "rgba(129, 140, 248, 0.8)",
    oraclePoem: "높은 산봉우리에서 높이 든 작은 등불이 세상 모든 방황하는 밤을 고요히 품어 안습니다.",
    guidance: "오늘 하루 겪은 모든 수고와 눈물은 당신 영혼의 거름이 되었습니다. 서재의 온기 속에서 하루를 품위 있게 마감하세요.",
    targetApp: "epilogue",
    actionLabel: "에필로그 밤 서재로 도약",
  },
];

const PRESET_INQUIRIES = [
  "오늘 나의 무의식이 건네는 신탁은?",
  "지금 마음속 응어리를 정화하려면?",
  "망설이고 있는 일의 운명적 나침반은?",
  "내 영혼을 일깨울 예술과 시는?",
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
  }, []);

  // Swirling Particle Smoke Inside Orb Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = 360);
    const height = (canvas.height = 360);

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

    const colors = ["#818cf8", "#38bdf8", "#fbbf24", "#c084fc", "#ffffff"];

    for (let i = 0; i < 85; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        radius: Math.random() * 2.2 + 0.6,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.012 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
        dist: Math.random() * 125 + 8,
        alpha: Math.random() * 0.65 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep glowing cosmic core
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        width / 2
      );
      grad.addColorStop(0, "rgba(56, 189, 248, 0.2)");
      grad.addColorStop(0.5, "rgba(129, 140, 248, 0.12)");
      grad.addColorStop(1, "rgba(2, 0, 8, 0.9)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      // Swirling Stardust Particles
      particles.forEach((p) => {
        p.angle += p.speed * (1 + audioLevel * 3 + (isScrying ? 4.5 : 0));
        const px = width / 2 + Math.cos(p.angle) * p.dist;
        const py = height / 2 + Math.sin(p.angle) * p.dist;

        ctx.beginPath();
        ctx.arc(px, py, p.radius * (1 + audioLevel * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (isScrying ? 0.95 : 0.65);
        ctx.shadowBlur = 10;
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
        setAudioLevel(Math.min(1.0, avg / 75));
        requestAnimationFrame(poll);
      };
      poll();
    } catch {
      setIsMicActive(true);
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.35 + 0.1);
      }, 250);
      setTimeout(() => clearInterval(interval), 15000);
    }
  };

  // Execute True Scrying Divination
  const executeScrying = async (questionText?: string) => {
    const query = questionText || inquiry.trim() || "내 영혼이 오늘 마주해야 할 운명적 나침반";
    setIsScrying(true);
    setScryingResult(null);
    setAiCustomText(null);

    sacredAudio.playSingingBowl(528);
    triggerHaptic("blackhole");

    // Random Archetype seed based on query
    const hash = query.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const chosen = ORACLE_ARCHETYPES[hash % ORACLE_ARCHETYPES.length];

    // Call API for real-time poetic oracle revelation
    try {
      const resp = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `질문: "${query}"\n뽑힌 상징: "${chosen.name}" (${chosen.subTitle})\n역할: 신비로운 고대 오라클(Scrying Oracle). 닥터 스트레인지나 운명의 신전 같은 몽환적이고 깊이 있는 어조로 2~3문장의 영적 계시 시(Poem)와 마음을 꿰뚫는 실천적 조언을 한국어로 답해줘. (이모티콘 사용 금지)`,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const generated = data?.text || data?.response || data?.content;
        if (generated && typeof generated === "string") {
          setAiCustomText(generated.trim());
        }
      }
    } catch (e) {
      console.warn("AI generation fallback to primal oracle:", e);
    }

    setTimeout(() => {
      setIsScrying(false);
      setScryingResult(chosen);
      sacredAudio.playSingingBowl(639);
    }, 2000);
  };

  // Manifestation Toss to Prism
  const handleManifestToPrism = (card: ScryingCard) => {
    sendPrismToss({
      sourceApp: "oracle",
      targetApp: card.targetApp,
      actionType: "smart_toss",
      contextMessage: `🔮 크리스탈 오라클 계시: ${card.name} - ${aiCustomText || card.oraclePoem}`,
      tossedAt: Date.now(),
    });

    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("prism-cross-app");
        bc.postMessage({
          type: "PRISM_ORB_LEAP",
          target: card.targetApp,
          path: `/${card.targetApp}`,
          timestamp: Date.now(),
        });
        bc.close();
      }
    } catch (_) {}

    window.location.href = `/${card.targetApp}?from=orb&archetype=${encodeURIComponent(card.id)}`;
  };

  return (
    <div
      className="relative w-full h-screen text-amber-50 flex flex-col items-center justify-between overflow-hidden select-none font-sans"
      style={{
        background: "radial-gradient(circle at 50% 35%, #0f0a1c 0%, #05020c 60%, #010004 100%)",
      }}
    >
      {/* Background Subtle Constellation Stars */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Top Header */}
      <header className="relative z-40 w-full max-w-4xl px-4 pt-5 sm:pt-7 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-200 border border-amber-500/30 backdrop-blur-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          title="프리즘 본체 허브로 귀환"
        >
          <ArrowLeft size={14} className="text-amber-300" />
          <span style={{ fontFamily: "Cinzel, serif" }} className="tracking-wider">PRISM REALM</span>
        </a>

        {/* Center Title */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 backdrop-blur-xl shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          <Sparkles size={14} className="text-purple-300 animate-pulse" />
          <span
            style={{ fontFamily: "Cinzel, serif" }}
            className="text-xs sm:text-sm font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-cyan-200 uppercase"
          >
            {prismUserName ? `${prismUserName}의 오라클 성소` : "CRYSTAL SCRYING ORACLE"}
          </span>
        </div>

        {/* Audio & Mic Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDrone}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all active:scale-95 ${
              isDroneOn
                ? "bg-amber-500/25 text-amber-200 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-white/5 text-white/50 border-white/10 hover:text-white"
            }`}
            title="528Hz 솔페지오 치유 하모닉스 토글"
          >
            {isDroneOn ? <Volume2 size={13} className="text-amber-300 animate-pulse" /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">528Hz</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all active:scale-95 ${
              isMicActive
                ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-white/5 text-white/50 border-white/10 hover:text-white"
            }`}
            title="마이크 음성 공명 토글"
          >
            {isMicActive ? <Mic size={13} className="text-cyan-300 animate-bounce" /> : <MicOff size={13} />}
            <span className="hidden sm:inline">{isMicActive ? "공명 중" : "음성"}</span>
          </button>
        </div>
      </header>

      {/* Main Pure 3D Crystal Orb Stage */}
      <main className="relative z-30 flex-1 flex flex-col items-center justify-center w-full max-w-lg px-4 my-auto">
        <div className="relative flex items-center justify-center w-72 h-72 sm:w-84 sm:h-84">
          {/* Outer Rotating Runic Circle (Clockwise) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: isScrying ? 8 : 45,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 pointer-events-none transition-all duration-500 opacity-70"
            style={{
              filter: `drop-shadow(0 0 ${isScrying ? "18px" : "8px"} rgba(245, 158, 11, 0.6))`,
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <circle cx="200" cy="200" r="185" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.6" />
              <circle cx="200" cy="200" r="172" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.75" />
              <polygon points="200,32 240,160 368,200 240,240 200,368 160,240 32,200 160,160" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" />
              <polygon points="80,80 200,140 320,80 260,200 320,320 200,260 80,320 140,200" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.35" />
              {/* Ancient Runic Glyphs */}
              {["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ"].map((rune, idx) => {
                const angle = (idx / 16) * Math.PI * 2;
                const rx = 200 + Math.cos(angle) * 178;
                const ry = 200 + Math.sin(angle) * 178;
                return (
                  <text
                    key={idx}
                    x={rx}
                    y={ry}
                    fill="#fef08a"
                    fontSize="13"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-mono font-bold select-none opacity-80"
                  >
                    {rune}
                  </text>
                );
              })}
            </svg>
          </motion.div>

          {/* Inner Counter-Rotating Ring (Counter-Clockwise) */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{
              duration: isScrying ? 6 : 35,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-4 sm:inset-5 pointer-events-none opacity-60"
            style={{
              filter: `drop-shadow(0 0 ${isScrying ? "14px" : "6px"} rgba(168, 85, 247, 0.5))`,
            }}
          >
            <svg viewBox="0 0 350 350" className="w-full h-full">
              <circle cx="175" cy="175" r="148" fill="none" stroke="#c084fc" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="175" cy="175" r="138" fill="none" stroke="#818cf8" strokeWidth="1.2" />
              {/* Astrological Zodiac Symbols */}
              {["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].map((zodiac, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const zx = 175 + Math.cos(angle) * 143;
                const zy = 175 + Math.sin(angle) * 143;
                return (
                  <text
                    key={i}
                    x={zx}
                    y={zy}
                    fill="#e9d5ff"
                    fontSize="11"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none"
                  >
                    {zodiac}
                  </text>
                );
              })}
            </svg>
          </motion.div>

          {/* The Pure 3D Glass Crystal Orb (Zero Emojis Inside) */}
          <div
            onClick={() => executeScrying()}
            className="group relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-500 active:scale-95"
            style={{
              boxShadow: isScrying
                ? "inset 0 0 45px rgba(245, 158, 11, 0.6), inset -10px -10px 25px rgba(0,0,0,0.9), 0 0 65px rgba(168, 85, 247, 0.8), 0 0 100px rgba(245, 158, 11, 0.4)"
                : "inset 0 0 35px rgba(255, 255, 255, 0.35), inset -10px -10px 25px rgba(0, 0, 0, 0.85), 0 0 40px rgba(168, 85, 247, 0.45)",
              transform: `scale(${1 + audioLevel * 0.12})`,
            }}
          >
            {/* Swirling Smoke Stardust Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-full pointer-events-none z-10"
            />

            {/* Top Curved Specular Glare (Realistic Glass Light Reflection) */}
            <div
              className="absolute top-3 left-5 sm:top-4 sm:left-7 w-20 sm:w-24 h-9 sm:h-11 rounded-full pointer-events-none z-30 -rotate-[28deg]"
              style={{
                background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, transparent 75%)",
              }}
            />

            {/* Internal Center Revelation Typography (Clean & Mystical, No Emojis) */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center pointer-events-none p-3 select-none">
              <AnimatePresence mode="wait">
                {isScrying ? (
                  <motion.div
                    key="scrying"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: [1, 1.08, 1] }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="flex flex-col items-center"
                  >
                    <span
                      style={{ fontFamily: "Cinzel, serif" }}
                      className="text-xs sm:text-sm font-extrabold tracking-[0.3em] text-amber-200 uppercase animate-pulse"
                    >
                      DIVINATIO
                    </span>
                    <span className="text-[9px] tracking-widest text-amber-100/70 mt-1 uppercase">
                      영시 수렴 중...
                    </span>
                  </motion.div>
                ) : scryingResult ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <span
                      style={{
                        fontFamily: "Cinzel, serif",
                        color: scryingResult.color,
                        textShadow: `0 0 16px ${scryingResult.glow}`,
                      }}
                      className="text-base sm:text-lg font-black tracking-[0.2em] uppercase"
                    >
                      {scryingResult.latinName}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-semibold tracking-wide text-white/95 mt-0.5"
                    >
                      {scryingResult.name.split("·")[1]?.trim() || scryingResult.name}
                    </span>
                    <span className="text-[9px] text-amber-200/70 font-mono tracking-wider mt-1">
                      {scryingResult.arcana}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="flex flex-col items-center">
                    <span
                      style={{ fontFamily: "Cinzel, serif" }}
                      className="text-xs sm:text-sm font-bold tracking-[0.25em] text-purple-200/80 uppercase"
                    >
                      ORACULUM
                    </span>
                    <span className="text-[8.5px] text-white/50 tracking-wider mt-1">
                      터치하여 영시 개화
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Rim Light */}
            <div className="absolute inset-x-8 bottom-1.5 h-3 rounded-full bg-gradient-to-t from-amber-400/30 to-transparent blur-[1px] pointer-events-none z-30" />
          </div>
        </div>

        {/* Revealed Oracle Card Card & Wisdom Modal (Clean, No Emojis) */}
        <AnimatePresence>
          {scryingResult && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full mt-3 p-4 rounded-2xl bg-black/85 border border-amber-500/40 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.2)] flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <h4
                    style={{ fontFamily: "Cinzel, serif" }}
                    className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide"
                  >
                    {scryingResult.name}
                  </h4>
                  <p className="text-[10px] text-white/50">{scryingResult.subTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScryingResult(null)}
                  className="text-white/40 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {/* Poetic Oracle Inscription */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
                <p
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                  className="text-sm sm:text-base italic text-purple-200/95 leading-relaxed"
                >
                  "{aiCustomText || scryingResult.oraclePoem}"
                </p>
                <p className="text-[11px] text-amber-100/80 mt-1.5 font-sans leading-normal">
                  <strong>영혼의 조언:</strong> {scryingResult.guidance}
                </p>
              </div>

              {/* Action Button: Manifest in PRISM Ecosystem */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => executeScrying()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/80 transition-all active:scale-95"
                >
                  <RotateCcw size={12} />
                  <span>다시 묻기</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleManifestToPrism(scryingResult)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-500 text-black hover:opacity-90 transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                >
                  <span>{scryingResult.actionLabel}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Divination Inquiry Console */}
      <footer className="relative z-40 w-full max-w-xl px-4 pb-5 sm:pb-7 flex flex-col items-center gap-2.5">
        {/* Clean Preset Inquiry Pills */}
        <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 justify-start sm:justify-center">
          {PRESET_INQUIRIES.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInquiry(text);
                executeScrying(text);
              }}
              className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/15 text-white/70 hover:text-amber-200 border border-white/10 hover:border-amber-400/40 backdrop-blur-md transition-all active:scale-95"
            >
              {text}
            </button>
          ))}
        </div>

        {/* Question Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inquiry.trim()) executeScrying(inquiry);
          }}
          className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 border border-amber-500/30 backdrop-blur-2xl shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          <input
            type="text"
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder="마음속 고민이나 질문을 수정구슬에 건네보세요..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none"
          />
          <button
            type="submit"
            disabled={isScrying}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
          >
            <span>영시 개화</span>
            <Send size={13} />
          </button>
        </form>
      </footer>
    </div>
  );
}
