import React from "react";
import { motion } from "motion/react";
import { MessageCircle, BookOpen, Sparkles } from "lucide-react";
import { safeSessionStorage } from "@/utils/safeStorage";

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
  epilogue: "ring-2 ring-purple-400/90 shadow-[0_8px_0_rgba(100,20,120,0.55),0_12px_24px_rgba(192,132,252,0.45)]",
  prologue: "ring-2 ring-red-400/90 shadow-[0_8px_0_rgba(120,30,20,0.55),0_12px_24px_rgba(239,68,68,0.45)]",
  trinity: "ring-2 ring-yellow-300/90 shadow-[0_8px_0_rgba(120,90,0,0.55),0_12px_24px_rgba(234,179,8,0.45)]",
  orange: "ring-2 ring-orange-300/90 shadow-[0_8px_0_rgba(120,50,0,0.55),0_12px_24px_rgba(249,115,22,0.45)]",
  muse: "ring-2 ring-blue-300/90 shadow-[0_8px_0_rgba(20,50,120,0.55),0_12px_24px_rgba(59,130,246,0.45)]",
  heal: "ring-2 ring-emerald-300/90 shadow-[0_8px_0_rgba(10,80,50,0.55),0_12px_24px_rgba(16,185,129,0.45)]",
  aura: "ring-2 ring-emerald-300/90 shadow-[0_8px_0_rgba(10,80,50,0.55),0_12px_24px_rgba(16,185,129,0.45)]",
  bluebird: "ring-2 ring-sky-300/90 shadow-[0_8px_0_rgba(10,60,100,0.55),0_12px_24px_rgba(14,165,233,0.45)]",
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
      <div className="absolute right-14 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/85 backdrop-blur-md border border-white/10 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap tracking-wide font-sans pointer-events-none">
        {tooltipLabel}
      </div>

      <motion.button
        onClick={onClick}
        className={`prism-xs-fab prism-fab-3d prism-fab-3d-rainbow relative p-3 sm:p-4 rounded-full flex items-center justify-center cursor-pointer text-white prism-rainbow-btn ${
          isActive ? `scale-105 ${activeStyles}` : ""
        }`}
      >
        <Icon size={22} className={`sm:w-6 sm:h-6 w-[22px] h-[22px] ${iconClassName}`} />
      </motion.button>
    </div>
  );
}

interface ChatFabButtonProps {
  onClick: () => void;
}

export function ChatFabButton({ onClick }: ChatFabButtonProps) {
  return (
    <div className="relative group flex items-center justify-end">
      <div className="absolute right-14 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/85 backdrop-blur-md border border-white/10 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50">
        루시 프로
      </div>

      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="prism-xs-fab prism-fab-3d prism-fab-3d-chat relative p-3 sm:p-4 rounded-full flex items-center justify-center cursor-pointer outline-none text-white celestial-tarot-btn shadow-2xl transition-all"
        aria-label="루시 프로"
      >
        <MessageCircle className="w-[22px] h-[22px] sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-pulse" />
        <Sparkles size={11} className="absolute -top-0.5 -right-0.5 text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)] animate-pulse" />
      </motion.button>
    </div>
  );
}

export interface HandbookFabButtonProps {
  theme: string;
  isOpen?: boolean;
  tooltipLabel?: string;
  onClick?: () => void;
}

export function HandbookFabButton({
  theme,
  isOpen = false,
  tooltipLabel = "핸드북 프로",
  onClick,
}: HandbookFabButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      safeSessionStorage.setItem('prism_pending_handbook_theme', theme);
      window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: `/handbook?channel=${theme}` } }));
    }
  };
  const activeStyles = THEME_ACTIVE_STYLES[theme] ?? THEME_ACTIVE_STYLES.bluebird;

  return (
    <div className="relative group flex items-center justify-end">
      <div className="absolute right-14 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/85 backdrop-blur-md border border-white/10 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50">
        {tooltipLabel}
      </div>

      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className={`prism-xs-fab prism-fab-3d prism-fab-3d-rainbow relative p-3 sm:p-4 rounded-full flex items-center justify-center cursor-pointer text-white prism-rainbow-btn shadow-2xl transition-all ${
          isOpen ? `scale-105 ${activeStyles}` : ""
        }`}
        aria-label={tooltipLabel}
      >
        <BookOpen className="w-[22px] h-[22px] sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-pulse" />
      </motion.button>
    </div>
  );
}