import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { Triangle, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";
import { useSpecialFeatureChromeHidden, SPECIAL_FEATURE_CHROME_HIDDEN_CLASS } from "@/components/SpecialFeaturePanel";

interface PrismGatewayFabButtonProps {
  className?: string;
  position?: "left" | "right";
  onClick?: () => void;
}

export function PrismGatewayFabButton({
  className = "",
  position = "left",
  onClick,
}: PrismGatewayFabButtonProps) {
  const [, setLocation] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const isChromeHidden = useSpecialFeatureChromeHidden();

  const triggerWhiteHoleFeedback = () => {
    try {
      triggerHaptic("whitehole");
    } catch (_) {}
  };

  const handleClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    triggerWhiteHoleFeedback();

    if (onClick) {
      onClick();
      return;
    }

    // 1. If currently on standalone orb or gateway page, execute full navigation to Prism main home
    if (typeof window !== "undefined" && (window.location.pathname.includes("/orb") || window.location.pathname.includes("/crystal") || window.location.pathname.includes("/gateway"))) {
      window.location.href = "/";
      return;
    }

    // 2. Dispatch PRISM SPA navigation event for animated cosmic transition
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("prism-navigate", {
          detail: { path: "/" },
        })
      );
    }

    // 3. Immediate smooth SPA route transition without full page reload
    setLocation("/");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const isRight = position === "right";

  return (
    <div
      className={`fixed z-[350] flex items-center pointer-events-auto select-none transition-all duration-300 bottom-safe-fab ${
        isRight
          ? "right-4 sm:right-6 justify-end"
          : "left-4 sm:left-6 justify-start"
      } ${isChromeHidden ? SPECIAL_FEATURE_CHROME_HIDDEN_CLASS : "opacity-100"} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip popping up above button */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute bottom-14 ${
              isRight ? "right-0 sm:right-2 origin-bottom-right" : "left-0 sm:left-2 origin-bottom-left"
            } bg-zinc-950/95 backdrop-blur-md border border-cyan-400/40 text-white text-[10px] py-1.5 px-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.35)] whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-1.5`}
          >
            <Sparkles size={12} className="text-cyan-300 animate-spin" />
            <span className="font-bold text-cyan-200">프리즘 유니버스 (메인 홈으로 이동)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer ambient glow with spectral colors */}
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-500/30 via-indigo-500/25 to-pink-500/30 blur-md pointer-events-none animate-pulse" />

      {/* 3D Glass Prism Portal Button */}
      <motion.button
        type="button"
        onClick={handleClick}
        onPointerDown={triggerWhiteHoleFeedback}
        whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
        whileTap={{ scale: 0.92 }}
        className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none overflow-hidden transition-all duration-300 border border-cyan-300/50 hover:border-cyan-200/80 shadow-[0_0_18px_rgba(6,182,212,0.4),0_4px_14px_rgba(0,0,0,0.7)] hover:shadow-[0_0_28px_rgba(56,189,248,0.6),0_6px_18px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.35) 0%, rgba(56, 189, 248, 0.2) 40%, rgba(5, 5, 20, 0.96) 100%)",
        }}
        aria-label="프리즘 메인 홈으로 이동"
        title="프리즘 유니버스 (홈 이동)"
      >
        {/* Swirling Prism Dispersion Nebula Core */}
        <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.35)_0%,rgba(168,85,247,0.25)_50%,transparent_80%)] blur-[1px] pointer-events-none" />

        {/* Center Triangular Prism Icon with Rainbow Spectral Glow */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Triangle
            size={20}
            className="text-cyan-200 group-hover:text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.9)] transition-all group-hover:scale-110 -translate-y-[1px]"
            fill="rgba(56, 189, 248, 0.25)"
            strokeWidth={2.2}
          />
        </div>

        {/* Top Specular Glare (Glass Curved Reflection) */}
        <div
          className="absolute top-1 left-2 sm:top-1.5 sm:left-2.5 w-5 sm:w-6 h-2 sm:h-2.5 rounded-full pointer-events-none z-20 -rotate-[28deg]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, transparent 75%)",
          }}
        />

        {/* Bottom Rim Reflection */}
        <div className="absolute inset-x-2 bottom-0.5 h-1 rounded-full bg-gradient-to-t from-cyan-400/40 to-transparent blur-[0.5px] pointer-events-none z-20" />
      </motion.button>
    </div>
  );
}
