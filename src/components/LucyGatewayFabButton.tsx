import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, MessageCircle } from "lucide-react";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";

interface LucyGatewayFabButtonProps {
  className?: string;
  position?: "left" | "right";
}

export function LucyGatewayFabButton({
  className = "",
  position = "right",
}: LucyGatewayFabButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    try {
      triggerHaptic("whitehole");
    } catch (_) {}

    // Dispatch PRISM SPA navigation event first
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("prism-navigate", {
          detail: { path: "/chat" },
        })
      );
      // Seamless direct transition to /chat
      window.location.href = "/chat";
    }
  };

  const isRight = position === "right";

  return (
    <div
      className={`fixed bottom-safe-fab z-[300] flex items-center pointer-events-auto select-none ${
        isRight ? "right-4 sm:right-6 justify-end" : "left-4 sm:left-6 justify-start"
      } ${className}`}
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
            } bg-zinc-950/95 backdrop-blur-md border border-purple-400/40 text-white text-[10px] py-1.5 px-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.35)] whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-1.5`}
          >
            <Sparkles size={12} className="text-amber-300 animate-spin" />
            <span className="font-bold text-purple-200">루시 AI 프로 (채팅방으로 이동)</span>
            <MessageCircle size={10} className="text-pink-300 ml-0.5" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer ambient glow */}
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-purple-500/30 via-pink-500/25 to-indigo-500/30 blur-md pointer-events-none animate-pulse" />

      {/* 3D Celestial Lucy Glass Button */}
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
        whileTap={{ scale: 0.92 }}
        className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none overflow-hidden transition-all duration-300 border border-purple-300/50 hover:border-pink-300/80 shadow-[0_0_18px_rgba(168,85,247,0.4),0_4px_14px_rgba(0,0,0,0.7)] hover:shadow-[0_0_28px_rgba(236,72,153,0.6),0_6px_18px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(244, 114, 182, 0.4) 0%, rgba(124, 58, 237, 0.25) 45%, rgba(15, 10, 35, 0.95) 100%)",
        }}
        aria-label="루시 AI 채팅방 열기"
        title="루시 AI 프로 (채팅방 이동)"
      >
        {/* Swirling Stardust Nebula Core */}
        <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.4)_0%,rgba(147,51,234,0.3)_50%,transparent_80%)] blur-[1px] pointer-events-none" />

        {/* Center Starlight Sparkles Icon */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-200 group-hover:text-white drop-shadow-[0_0_8px_rgba(244,114,182,0.9)] transition-colors" />
        </div>

        {/* Top Specular Glare (Glass Curved Reflection) */}
        <div
          className="absolute top-1 left-2 sm:top-1.5 sm:left-2.5 w-5 sm:w-6 h-2 sm:h-2.5 rounded-full pointer-events-none z-20 -rotate-[28deg]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, transparent 75%)",
          }}
        />

        {/* Bottom Rim Reflection */}
        <div className="absolute inset-x-2 bottom-0.5 h-1 rounded-full bg-gradient-to-t from-pink-400/40 to-transparent blur-[0.5px] pointer-events-none z-20" />
      </motion.button>
    </div>
  );
}
