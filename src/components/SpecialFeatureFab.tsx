import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, BookMarked, Zap } from "lucide-react";
import { safeSessionStorage } from "@/utils/safeStorage";
import { getTossRule, executeSmartToss, type ChannelTossRule } from "@/lib/prismTossRegistry";

interface SpecialFeatureFabGroupProps {
  children: React.ReactNode;
}

export function SpecialFeatureFabGroup({ children }: SpecialFeatureFabGroupProps) {
  return (
    <div className="prism-xs-fab-group fixed bottom-safe-fab right-4 sm:right-6 z-[300] flex flex-col items-end gap-2.5 sm:gap-3 pointer-events-auto">
      {children}
    </div>
  );
}

const THEME_ACTIVE_STYLES: Record<string, string> = {
  epilogue: "ring-2 ring-purple-400/90 shadow-[0_0_16px_rgba(192,132,252,0.6)]",
  prologue: "ring-2 ring-red-400/90 shadow-[0_0_16px_rgba(239,68,68,0.6)]",
  trinity: "ring-2 ring-yellow-300/90 shadow-[0_0_16px_rgba(234,179,8,0.6)]",
  orange: "ring-2 ring-orange-300/90 shadow-[0_0_16px_rgba(249,115,22,0.6)]",
  muse: "ring-2 ring-blue-300/90 shadow-[0_0_16px_rgba(59,130,246,0.6)]",
  heal: "ring-2 ring-emerald-300/90 shadow-[0_0_16px_rgba(16,185,129,0.6)]",
  aura: "ring-2 ring-emerald-300/90 shadow-[0_0_16px_rgba(16,185,129,0.6)]",
  bluebird: "ring-2 ring-sky-300/90 shadow-[0_0_16px_rgba(14,165,233,0.6)]",
};

interface SpecialFeatureButtonProps {
  theme: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isActive: boolean;
  title: string;
  tooltipLabel: string;
  iconClassName?: string;
  onClick: () => void;
}

export function SpecialFeatureButton({
  theme,
  icon: Icon,
  isActive,
  tooltipLabel,
  iconClassName = "",
  onClick,
}: SpecialFeatureButtonProps) {
  const activeStyles = THEME_ACTIVE_STYLES[theme] ?? THEME_ACTIVE_STYLES.bluebird;

  return (
    <div className="relative group flex items-center justify-end">
      <div className="absolute right-14 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/85 backdrop-blur-md border border-white/10 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50">
        {tooltipLabel}
      </div>

      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer relative overflow-hidden text-white backdrop-blur-xl border border-white/25 shadow-lg transition-all bg-gradient-to-tr from-slate-900/90 via-slate-800/80 to-slate-700/70 active:scale-95 ${
          isActive ? `scale-105 ${activeStyles}` : "hover:border-white/40"
        }`}
        aria-label={tooltipLabel}
      >
        {/* Specular Highlight */}
        <div className="absolute inset-x-2 top-0.5 h-2 rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
        <Icon size={18} className={`w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${iconClassName}`} />
      </motion.button>
    </div>
  );
}

interface ChatFabButtonProps {
  onClick: () => void;
}

/**
 * Lucy FAB Button
 * Exact size identical to BGM Button (w-11 h-11 / 44px)
 * Distinctive Cosmic Starlight & Celestial AI Muse aesthetic
 */
export function ChatFabButton({ onClick }: ChatFabButtonProps) {
  return (
    <div className="relative group flex items-center justify-end">
      <div className="absolute right-14 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/85 backdrop-blur-md border border-purple-500/20 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50">
        Lucy • 영혼의 AI 가이드
      </div>

      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.1, rotate: [0, -3, 3, 0] }}
        whileTap={{ scale: 0.92 }}
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none relative text-white border border-purple-300/40 ring-1 ring-purple-400/30 shadow-[0_0_16px_rgba(168,85,247,0.45),0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_24px_rgba(236,72,153,0.6),0_6px_16px_rgba(0,0,0,0.6)] active:scale-95 transition-all bg-gradient-to-tr from-[#1e1b4b] via-[#7c3aed] to-[#ec4899] overflow-hidden"
        aria-label="Lucy Chat"
      >
        {/* Crystal Glass Curved Highlight */}
        <div className="absolute inset-x-2 top-0.5 h-2 rounded-full bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

        {/* Starlight Sparkles Core Icon */}
        <div className="relative z-10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>
      </motion.button>
    </div>
  );
}

export interface PrismTossFabButtonProps {
  theme: string;
  isOpen?: boolean;
  tooltipLabel?: string;
  onClick?: () => void;
  contextData?: any;
}

/**
 * Prism Smart Toss FAB Button
 * Replaces Re:Bible with ultra-compact intelligent routing:
 * - 👆 Short Tap (<400ms): Warps directly to Primary Destination (e.g. Muse Art Prescription)
 * - ⏱️ Long Press (>=400ms): Haptic pulse & warps directly to Secondary Destination (e.g. Orange 5-min Routine)
 */
export function PrismTossFabButton({
  theme,
  isOpen = false,
  tooltipLabel,
  onClick,
  contextData,
}: PrismTossFabButtonProps) {
  const rule: ChannelTossRule = getTossRule(theme);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const [isPressing, setIsPressing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleStart = (e: React.SyntheticEvent) => {
    isLongPressRef.current = false;
    setIsPressing(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPressing(false);

      // Haptic feedback
      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([50, 40, 60]);
        }
      } catch (_) {}

      // Secondary Destination Toss
      showFeedbackToast(`⚡ [2순위 토스] ${rule.secondary.name}(으)로 직행합니다!`);
      setTimeout(() => {
        executeSmartToss(theme, rule.secondary, contextData);
      }, 350);
    }, 450);
  };

  const handleEnd = (e: React.SyntheticEvent) => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If released before long press threshold, trigger Primary Destination
    if (!isLongPressRef.current) {
      if (onClick) {
        onClick();
        return;
      }
      showFeedbackToast(`⚡ [1순위 토스] ${rule.primary.name}(으)로 직행합니다!`);
      setTimeout(() => {
        executeSmartToss(theme, rule.primary, contextData);
      }, 250);
    }
  };

  const handleCancel = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const activeStyles = THEME_ACTIVE_STYLES[theme] ?? THEME_ACTIVE_STYLES.trinity;

  return (
    <div className="relative group flex items-center justify-end">
      {/* Toast notification floating next to FAB */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="absolute right-14 z-[400] px-3.5 py-1.5 rounded-xl bg-purple-950/95 border border-purple-400/40 text-white text-xs font-bold shadow-2xl backdrop-blur-xl whitespace-nowrap flex items-center gap-1.5"
          >
            <Zap size={13} className="text-amber-300 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intelligent Gesture Tooltip */}
      <div className="absolute right-14 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/95 backdrop-blur-xl border border-purple-400/30 text-white text-[11px] p-2.5 rounded-xl shadow-2xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 font-bold text-amber-300 border-b border-white/10 pb-1 font-mono">
          <Zap size={13} className="text-amber-400" />
          <span>PRISM TOSS · 옴니 토스</span>
        </div>
        <div className="flex items-center gap-1 text-white/90">
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 font-mono font-bold">탭</span>
          <span>{rule.primary.icon} 1순위: <strong>{rule.primary.name}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-white/70">
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 font-mono font-bold">꾹 누름</span>
          <span>{rule.secondary.icon} 2순위: <strong>{rule.secondary.name}</strong></span>
        </div>
      </div>

      <motion.button
        type="button"
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleCancel}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleCancel}
        whileHover={{ scale: 1.1, rotate: [0, 4, -4, 0] }}
        whileTap={{ scale: 0.9 }}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none relative text-white border border-purple-300/50 ring-2 ring-purple-400/40 shadow-[0_0_18px_rgba(168,85,247,0.5),0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_26px_rgba(236,72,153,0.7),0_6px_16px_rgba(0,0,0,0.6)] active:scale-95 transition-all bg-gradient-to-tr from-[#1e1b4b] via-[#6b21a8] to-[#f59e0b] overflow-hidden select-none ${
          isPressing ? 'ring-4 ring-amber-400 scale-95 brightness-125' : ''
        } ${isOpen ? `scale-105 ${activeStyles}` : ""}`}
        aria-label={tooltipLabel || "Prism Smart Toss"}
      >
        {/* Specular Highlight */}
        <div className="absolute inset-x-2 top-0.5 h-2 rounded-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none z-10" />

        {/* Ambient Pulsing Core Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-400/20 to-purple-400/20 animate-pulse pointer-events-none" />

        {/* Lightning Toss Icon */}
        <div className="relative z-10 flex items-center justify-center">
          <Zap className={`w-5 h-5 text-amber-200 drop-shadow-[0_0_8px_rgba(254,240,138,0.9)] transition-transform ${isPressing ? 'scale-125 text-amber-300' : 'group-hover:scale-110'}`} />
        </div>
      </motion.button>
    </div>
  );
}

// 🌟 Full backward compatibility alias for seamless replacement across all apps
export { PrismTossFabButton as HandbookFabButton };
export type { PrismTossFabButtonProps as HandbookFabButtonProps };

