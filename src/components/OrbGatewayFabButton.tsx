import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ExternalLink } from "lucide-react";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";

export function OrbGatewayFabButton() {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    try {
      triggerHaptic("whitehole");
    } catch (_) {}
    window.open("/orb", "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="relative flex items-center justify-start pointer-events-auto select-none"
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
            className="absolute bottom-14 left-0 sm:left-2 bg-zinc-950/90 backdrop-blur-md border border-cyan-400/30 text-white text-[10px] py-1.5 px-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.25)] whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-1.5"
          >
            <Sparkles size={12} className="text-cyan-400 animate-pulse" />
            <span className="font-semibold text-cyan-200">크리스탈 오브 (외부 독립 직관 도구)</span>
            <ExternalLink size={10} className="text-slate-400 ml-0.5" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer ambient glow */}
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-blue-500/20 blur-md pointer-events-none animate-pulse" />

      {/* 3D Glass Crystal Orb Button */}
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
        whileTap={{ scale: 0.92 }}
        className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none overflow-hidden transition-all duration-300 border border-white/30 hover:border-cyan-300/60 shadow-[0_0_18px_rgba(56,189,248,0.35),0_4px_14px_rgba(0,0,0,0.7)] hover:shadow-[0_0_26px_rgba(168,85,247,0.5),0_6px_18px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.28) 0%, rgba(56, 189, 248, 0.12) 40%, rgba(6, 4, 18, 0.92) 100%)",
        }}
        aria-label="외부 크리스탈 오브 사이트 열기"
        title="크리스탈 오브 (외독립 직관 도구)"
      >
        {/* Swirling Stardust Nebula Core */}
        <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.4)_0%,rgba(168,85,247,0.25)_50%,transparent_80%)] blur-[1px] pointer-events-none" />

        {/* Center Starlight Core Icon */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Sparkles className="w-5 h-5 text-cyan-200 group-hover:text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.9)] transition-colors" />
        </div>

        {/* Top Specular Glare (Realistic Glass Lens Reflection) */}
        <div
          className="absolute top-1 left-2 sm:top-1.5 sm:left-2.5 w-5 sm:w-6 h-2 sm:h-2.5 rounded-full pointer-events-none z-20 -rotate-[28deg]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.8) 0%, transparent 75%)",
          }}
        />

        {/* Bottom Rim Reflection */}
        <div className="absolute inset-x-2 bottom-0.5 h-1 rounded-full bg-gradient-to-t from-cyan-400/30 to-transparent blur-[0.5px] pointer-events-none z-20" />
      </motion.button>
    </div>
  );
}
