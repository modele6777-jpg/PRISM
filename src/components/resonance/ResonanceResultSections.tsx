import React from "react";
import type { LucideIcon } from "lucide-react";

export function ResonanceStatBarGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">{children}</div>;
}

export type ResonancePill = {
  label: string;
  value: string;
  valueClassName: string;
};

export function ResonancePillGrid({ pills }: { pills: ResonancePill[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center justify-center text-center min-w-0"
        >
          <span className="text-[8px] text-white/30 uppercase tracking-wider mb-1 font-mono">{pill.label}</span>
          <span className={`text-xs font-bold select-all break-words leading-snug w-full ${pill.valueClassName}`}>
            {pill.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ResonanceShieldCard({
  badge,
  token,
  gradientClass,
  borderClass,
  accentBarClass,
  badgeClass,
  iconClass,
  Icon,
}: {
  badge: string;
  token: string;
  gradientClass: string;
  borderClass: string;
  accentBarClass: string;
  badgeClass: string;
  iconClass: string;
  Icon: LucideIcon;
}) {
  return (
    <div
      className={`p-4 rounded-2xl bg-gradient-to-r ${gradientClass} border ${borderClass} flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between shadow-inner relative group/shield`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${accentBarClass}`} />
      <div className="pl-2 min-w-0 flex-1 text-left">
        <span className={`text-[9px] font-bold uppercase tracking-widest block font-mono ${badgeClass}`}>{badge}</span>
        <span className="text-sm sm:text-[15px] font-bold text-white break-words leading-snug block font-sans mt-0.5">
          {token}
        </span>
      </div>
      <Icon size={28} className={`${iconClass} opacity-60 shrink-0 group-hover/shield:scale-125 transition-transform duration-500`} />
    </div>
  );
}

export function ResonanceNoteCard({
  label,
  labelClassName,
  children,
}: {
  label: string;
  labelClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1 min-w-0">
      <span className={`text-[8px] font-bold uppercase tracking-wider font-mono ${labelClassName}`}>{label}</span>
      <p className="text-xs text-white/80 leading-relaxed font-sans break-words">{children}</p>
    </div>
  );
}

export const resonanceModalOverlayClass =
  "fixed inset-0 z-[200] bg-black/95 sm:bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain no-scrollbar pointer-events-auto";

export const resonanceModalPanelClass =
  "relative z-10 w-full max-w-2xl max-h-[min(100dvh-1rem,900px)] sm:max-h-[min(100dvh-2rem,900px)] p-5 sm:p-8 md:p-12 text-center flex flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[28px] sm:rounded-[42px] shadow-2xl no-scrollbar select-none text-white font-sans pointer-events-auto min-h-0";