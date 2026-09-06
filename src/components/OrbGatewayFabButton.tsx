import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";
import { CrystalOrbIcon } from "@/components/icons/CrystalOrbIcon";
import { useSpecialFeatureChromeHidden, SPECIAL_FEATURE_CHROME_HIDDEN_CLASS } from "@/components/SpecialFeaturePanel";

interface OrbGatewayFabButtonProps {
  className?: string;
}

export function OrbGatewayFabButton({ className = "" }: OrbGatewayFabButtonProps) {
  const [location, setLocation] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const isChromeHidden = useSpecialFeatureChromeHidden();

  // Check if currently on Lucy chatroom view
  const isChatView = location === "/chat" || location === "/lucy";

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

    // 1. Dispatch PRISM SPA navigation event for animated cosmic transition
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("prism-navigate", {
          detail: { path: "/orb" },
        })
      );
    }

    // 2. Immediate smooth SPA route transition without full page reload
    setLocation("/orb");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  return (
    <div
      className={`fixed z-[350] flex items-center justify-start pointer-events-auto select-none transition-all duration-300 ${
        isChatView
          ? "bottom-[68px] sm:bottom-[76px] left-4 sm:left-6"
          : "bottom-safe-fab left-4 sm:left-6"
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
            className="absolute bottom-14 left-0 sm:left-2 bg-zinc-950/95 backdrop-blur-md border border-cyan-400/40 text-white text-[10px] py-1.5 px-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.3)] whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-1.5"
          >
            <CrystalOrbIcon size={14} className="animate-spin" />
            <span className="font-bold text-cyan-200">크리스탈 오브 (독립 직관 도구)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer ambient glow */}
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-500/25 via-purple-500/20 to-blue-500/25 blur-md pointer-events-none animate-pulse" />

      {/* 3D Glass Crystal Orb Button */}
      <motion.button
        type="button"
        onClick={handleClick}
        onPointerDown={triggerWhiteHoleFeedback}
        whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
        whileTap={{ scale: 0.92 }}
        className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none overflow-hidden transition-all duration-300 border border-cyan-300/50 hover:border-cyan-200/80 shadow-[0_0_18px_rgba(56,189,248,0.4),0_4px_14px_rgba(0,0,0,0.7)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5),0_6px_18px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.32) 0%, rgba(56, 189, 248, 0.18) 40%, rgba(6, 4, 20, 0.94) 100%)",
        }}
        aria-label="외부 크리스탈 오브 사이트 열기"
        title="크리스탈 오브 (독립 직관 도구)"
      >
        {/* Swirling Stardust Nebula Core */}
        <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.45)_0%,rgba(168,85,247,0.3)_50%,transparent_80%)] blur-[1px] pointer-events-none" />

        {/* Center Authentic Crystal Orb Shape Icon */}
        <div className="relative z-10 flex flex-col items-center justify-center transition-transform group-hover:scale-110 duration-200">
          <CrystalOrbIcon size={22} className="drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
        </div>

        {/* Top Specular Glare (Realistic Glass Lens Reflection) */}
        <div
          className="absolute top-1 left-2 sm:top-1.5 sm:left-2.5 w-5 sm:w-6 h-2 sm:h-2.5 rounded-full pointer-events-none z-20 -rotate-[28deg]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, transparent 75%)",
          }}
        />

        {/* Bottom Rim Reflection */}
        <div className="absolute inset-x-2 bottom-0.5 h-1 rounded-full bg-gradient-to-t from-cyan-400/35 to-transparent blur-[0.5px] pointer-events-none z-20" />
      </motion.button>
    </div>
  );
}
