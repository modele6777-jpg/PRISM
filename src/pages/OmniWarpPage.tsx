import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";

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

type ForceStage = "IDLE" | "WHITE" | "WORMHOLE" | "BLACK";

export default function OmniWarpPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const forceBtnRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Pressure & Interaction state refs
  const isPressedRef = useRef(false);
  const pressStartTimeRef = useRef(0);
  const initialTouchAreaRef = useRef(0);
  const rawForceRatioRef = useRef(0);
  const currentForceRef = useRef(0);
  const mouseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // React state for UI HUD
  const [statusBadge, setStatusBadge] = useState("대기 중 (IDLE)");
  const [statusColor, setStatusColor] = useState("#ffffff");
  const [statusBorder, setStatusBorder] = useState("rgba(255, 255, 255, 0.2)");
  const [cardTitle, setCardTitle] = useState("1순위: 즉시 실행");
  const [cardTitleColor, setCardTitleColor] = useState("#ffffff");
  const [cardDesc, setCardDesc] = useState(
    "손가락을 떼지 않고 누르는 힘(압력)만 조절하세요. 약한 압력은 화이트홀 요약, 강한 압력은 블랙홀 빅뱅으로 진입합니다."
  );
  const [cardBorder, setCardBorder] = useState("rgba(255, 255, 255, 0.12)");
  const [cardScale, setCardScale] = useState(1);
  const [pressureWidth, setPressureWidth] = useState(0);
  const [telemetry, setTelemetry] = useState("Touch Force: 0.0% | Stage: IDLE");
  const [coreStyle, setCoreStyle] = useState({
    background: "#ffffff",
    boxShadow: "0 0 16px #ffffff",
    transform: "scale(1)",
  });
  const [haloStyle, setHaloStyle] = useState({
    borderColor: "transparent",
    transform: "scale(1)",
  });

  const getTouchArea = (touch: React.Touch | Touch) => {
    if (!touch) return 1;
    const rx = (touch as any).radiusX || 12;
    const ry = (touch as any).radiusY || 12;
    return Math.PI * rx * ry;
  };

  const triggerBigBang = useCallback((x: number, y: number, stage: ForceStage) => {
    particlesRef.current = [];
    const count = 130;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = stage === "BLACK" ? Math.random() * 12 + 4 : Math.random() * 7 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.2 + 1.2,
        color:
          stage === "WHITE"
            ? `hsl(${Math.random() * 40 + 175}, 100%, 75%)`
            : stage === "WORMHOLE"
            ? `hsl(${Math.random() * 40 + 230}, 100%, 75%)`
            : `hsl(${Math.random() * 40 + 320}, 100%, 65%)`,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
      });
    }

    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        if (stage === "BLACK") navigator.vibrate?.([40, 30, 80, 40, 100]);
        else if (stage === "WORMHOLE") navigator.vibrate?.([30, 30, 60]);
        else navigator.vibrate?.(40);
      }
    } catch (_) {}
  }, []);

  const resetControls = useCallback(() => {
    currentForceRef.current = 0;
    rawForceRatioRef.current = 0;
    setPressureWidth(0);
    setCoreStyle({
      background: "#ffffff",
      boxShadow: "0 0 16px #ffffff",
      transform: "scale(1)",
    });
    setHaloStyle({
      borderColor: "transparent",
      transform: "scale(1)",
    });
    setCardScale(1);
    setTelemetry("Touch Force: 0.0% | Stage: IDLE");
  }, []);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    isPressedRef.current = true;
    pressStartTimeRef.current = performance.now();
    rawForceRatioRef.current = 0.1;

    const touch = "touches" in e && e.touches.length > 0 ? e.touches[0] : null;
    if (touch) {
      initialTouchAreaRef.current = getTouchArea(touch);
      if ((touch as any).force && (touch as any).force > 0) {
        rawForceRatioRef.current = (touch as any).force;
      }
    }
  };

  const handleMove = (e: TouchEvent) => {
    if (!isPressedRef.current) return;
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
    if (touch) {
      if ((touch as any).force && (touch as any).force > 0) {
        rawForceRatioRef.current = (touch as any).force;
      } else {
        const curArea = getTouchArea(touch);
        const deltaAreaRatio = Math.max(
          0,
          (curArea - initialTouchAreaRef.current) / (initialTouchAreaRef.current * 1.5)
        );
        rawForceRatioRef.current = Math.min(1.0, Math.max(0.1, deltaAreaRatio));
      }
    }
  };

  const handleEnd = useCallback(() => {
    if (!isPressedRef.current) return;
    isPressedRef.current = false;

    const duration = performance.now() - pressStartTimeRef.current;
    const rect = forceBtnRef.current?.getBoundingClientRect();
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight - 80;
    const force = currentForceRef.current;

    if (duration < 180 && force < 0.2) {
      setStatusBadge("1순위 즉시 실행 완료");
      setStatusColor("#ffffff");
      setCardScale(0.96);
      setTimeout(() => setCardScale(1), 140);
    } else if (force >= 0.2 && force < 0.45) {
      setStatusBadge("🌌 화이트홀 수렴 종결 (Release)");
      triggerBigBang(originX, originY, "WHITE");
      setCardTitle("차원 확정: 화이트홀 요약");
      setCardTitleColor("#00f0ff");
      setCardDesc("가벼운 압력으로 핵심 인텐트만 정밀 추출하여 단일 액션으로 종결되었습니다.");
    } else if (force >= 0.45 && force < 0.75) {
      setStatusBadge("🌀 웜홀 전이 종결 (Release)");
      triggerBigBang(originX, originY, "WORMHOLE");
      setCardTitle("차원 확정: 웜홀 멀티태스킹");
      setCardTitleColor("#92a4ff");
      setCardDesc("중간 압력 웜홀을 통해 연계 앱 및 관련 대시보드로 전환되었습니다.");
    } else if (force >= 0.75) {
      setStatusBadge("💥 블랙홀 빅뱅 폭발 (Release)");
      triggerBigBang(originX, originY, "BLACK");
      setCardTitle("차원 확정: 빅뱅 AI 생성 모드");
      setCardTitleColor("#ff0077");
      setCardDesc(
        "최대 압축을 거쳐 완전히 새로운 맥락의 AI 생성 워크스페이스가 폭발적으로 열렸습니다."
      );
    }

    resetControls();
  }, [triggerBigBang, resetControls]);

  // Window listeners for global touchmove & mouseup
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => handleMove(e);
    const onTouchEnd = () => handleEnd();
    const onMouseUp = () => {
      if (mouseIntervalRef.current) {
        clearInterval(mouseIntervalRef.current);
        mouseIntervalRef.current = null;
      }
      handleEnd();
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mouseup", onMouseUp);
      if (mouseIntervalRef.current) clearInterval(mouseIntervalRef.current);
    };
  }, [handleEnd]);

  // Canvas render loop
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

      if (isPressedRef.current) {
        currentForceRef.current += (rawForceRatioRef.current - currentForceRef.current) * 0.2;
        const cur = currentForceRef.current;
        const forcePercent = (cur * 100).toFixed(1);
        setPressureWidth(parseFloat(forcePercent));

        if (cur < 0.2) {
          setStatusBadge(`터치 감지 중 (${forcePercent}%)`);
          setStatusColor("#ffffff");
          setStatusBorder("rgba(255, 255, 255, 0.3)");
          setCoreStyle({
            background: "#ffffff",
            boxShadow: "0 0 16px #ffffff",
            transform: "scale(1)",
          });
          setHaloStyle({ borderColor: "transparent", transform: "scale(1)" });
        } else if (cur >= 0.2 && cur < 0.45) {
          setStatusBadge(`🌌 화이트홀 초수렴 (${forcePercent}%)`);
          setStatusColor("#00f0ff");
          setStatusBorder("rgba(0, 240, 255, 0.6)");

          setCoreStyle({
            background: "#00f0ff",
            boxShadow: "0 0 20px #00f0ff",
            transform: `scale(${1 - cur * 0.4})`,
          });
          setHaloStyle({
            borderColor: "rgba(0, 240, 255, 0.4)",
            transform: `scale(${1 + cur * 0.6})`,
          });

          setCardTitle("화이트홀 프리뷰: 1줄 초압축 요약");
          setCardTitleColor("#00f0ff");
          setCardDesc(
            "손끝에 가벼운 힘을 유지 중입니다. 손을 떼면 가장 핵심적인 요약 데이터만 즉시 종결 처리됩니다."
          );
          setCardBorder("rgba(0, 240, 255, 0.6)");
          setCardScale(1.0 - cur * 0.05);
        } else if (cur >= 0.45 && cur < 0.75) {
          setStatusBadge(`🌀 웜홀 시공간 터널링 (${forcePercent}%)`);
          setStatusColor("#92a4ff");
          setStatusBorder("rgba(146, 164, 255, 0.6)");

          setCoreStyle({
            background: "#92a4ff",
            boxShadow: "0 0 24px #92a4ff",
            transform: "scale(1.1)",
          });
          setHaloStyle({
            borderColor: "rgba(146, 164, 255, 0.5)",
            transform: "scale(1.4)",
          });

          setCardTitle("웜홀 프리뷰: 맥락 전환 대기");
          setCardTitleColor("#92a4ff");
          setCardDesc(
            "중간 강도의 힘을 유지하고 있습니다. 더 강하게 누르면 블랙홀로, 힘을 빼면 화이트홀로 이동합니다."
          );
          setCardBorder("rgba(146, 164, 255, 0.6)");
          setCardScale(1.0);
        } else {
          setStatusBadge(`💥 블랙홀 극한 압축 (${forcePercent}%)`);
          setStatusColor("#ff0077");
          setStatusBorder("rgba(255, 0, 119, 0.7)");

          setCoreStyle({
            background: "#ff0077",
            boxShadow: "0 0 35px #ff0077",
            transform: `scale(${1.0 + (cur - 0.75) * 2.5})`,
          });
          setHaloStyle({
            borderColor: "rgba(255, 0, 119, 0.8)",
            transform: "scale(1.8)",
          });

          setCardTitle("블랙홀 프리뷰: 빅뱅 AI 재창조");
          setCardTitleColor("#ff0077");
          setCardDesc(
            "손끝을 강하게 쥐어짜는 중입니다. 지금 손을 떼면 화면 전체가 폭발하며 AI 다차원 워크스페이스가 생성됩니다."
          );
          setCardBorder("rgba(255, 0, 119, 0.8)");
          setCardScale(1.0 + (cur - 0.75) * 0.15);
        }

        const stageName =
          cur < 0.2
            ? "IDLE"
            : cur < 0.45
            ? "WHITEHOLE"
            : cur < 0.75
            ? "WORMHOLE"
            : "BLACKHOLE";
        setTelemetry(`Touch Force: ${forcePercent}% | Stage: ${stageName}`);
      }

      // Particle physics update
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

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e);
    if (mouseIntervalRef.current) clearInterval(mouseIntervalRef.current);
    mouseIntervalRef.current = setInterval(() => {
      if (isPressedRef.current) {
        rawForceRatioRef.current = Math.min(1.0, rawForceRatioRef.current + 0.03);
      }
    }, 30);
  };

  return (
    <div className="relative w-full h-screen bg-[#040408] text-white flex flex-col items-center justify-between overflow-hidden select-none touch-none font-sans">
      {/* Space Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

      {/* Top Header & HUD */}
      <div className="relative z-20 mt-8 sm:mt-10 text-center flex flex-col items-center px-4">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white/80 transition-all border border-white/10"
          >
            <ArrowLeft size={14} />
            <span>프리즘 홈</span>
          </Link>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            OmniWarp Continuum
          </span>
        </div>

        <h1 className="text-lg sm:text-xl font-bold tracking-[3px] text-[#92a4ff] uppercase">
          Single-Point Force Warp
        </h1>

        <div
          className="inline-block mt-2.5 px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-150 backdrop-blur-md"
          style={{
            color: statusColor,
            borderColor: statusBorder,
            borderWidth: "1px",
            background: "rgba(255, 255, 255, 0.05)",
          }}
        >
          {statusBadge}
        </div>
      </div>

      {/* Middle Context Card */}
      <div className="relative z-20 w-[88%] max-w-[400px] h-[190px]">
        <div
          className="w-full h-full rounded-[24px] p-6 backdrop-blur-xl flex flex-col justify-center transition-all duration-150 shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: cardBorder,
            borderWidth: "1px",
            transform: `scale(${cardScale})`,
          }}
        >
          <h2
            className="text-base sm:text-lg font-bold mb-2 transition-colors duration-150"
            style={{ color: cardTitleColor }}
          >
            {cardTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#9aa0b8] leading-relaxed break-keep">{cardDesc}</p>
        </div>
      </div>

      {/* Bottom Force Interaction Control Area */}
      <div className="relative z-20 mb-10 sm:mb-12 flex flex-col items-center w-full px-4">
        {/* Pressure Stage Labels */}
        <div className="w-[260px] flex justify-between text-[11px] font-semibold mb-2">
          <span className="text-[#00f0ff]">화이트홀 (20~45%)</span>
          <span className="text-[#8fa0ff]">웜홀 (45~75%)</span>
          <span className="text-[#ff0077]">블랙홀 (75~100%)</span>
        </div>

        {/* Pressure Meter Bar */}
        <div className="w-[260px] h-2 bg-white/10 rounded-full mb-4 relative overflow-hidden">
          <div
            className="h-full transition-[width] duration-75 ease-linear rounded-full"
            style={{
              width: `${pressureWidth}%`,
              background: "linear-gradient(90deg, #00f0ff 0%, #7b8bff 45%, #ff0077 100%)",
            }}
          />
        </div>

        {/* Anchor Pressure Button */}
        <div
          ref={forceBtnRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleStart}
          className="relative w-[92px] h-[92px] rounded-full flex items-center justify-center cursor-pointer touch-none shadow-[0_0_35px_rgba(0,0,0,0.95)] border-2 border-white/20 active:scale-95 transition-transform"
          style={{
            background: "radial-gradient(circle, #202233 0%, #0d0e17 100%)",
          }}
        >
          {/* Outer Force Halo */}
          <div
            className="absolute inset-0 rounded-full border-2 pointer-events-none transition-all duration-100"
            style={haloStyle}
          />

          {/* Inner Singularity Core */}
          <div
            className="w-7 h-7 rounded-full pointer-events-none transition-all duration-75 flex items-center justify-center"
            style={coreStyle}
          />
        </div>

        {/* Telemetry Display */}
        <div className="font-mono text-[11px] text-[#555b72] mt-3.5 tracking-wider">
          {telemetry}
        </div>
      </div>
    </div>
  );
}
