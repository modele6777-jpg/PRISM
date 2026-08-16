import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BibleToolSectionProps {
  title: string;
  subtitle: string;
  icon: any;
  principles: string[];
  steps: string[];
  color: string;
  textColor: string;
  bgColor: string;
  onSelectStep: (step: string) => void;
}

export const BibleToolSection: React.FC<BibleToolSectionProps> = ({ title, subtitle, icon: Icon, principles, steps, color, textColor, bgColor, onSelectStep }) => {
  return (
    <div className={cn("flex flex-col lg:flex-row gap-10 p-10 rounded-[48px] bg-white/5 border transition-all relative overflow-hidden group hover:shadow-2xl", color, `hover:bg-white/[0.02]`)}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none opacity-50" />
      
      <div className="lg:w-1/3 relative z-10 flex flex-col gap-6">
        <div className={cn("w-20 h-20 rounded-[32px] flex items-center justify-center bg-white/10 shadow-xl border border-white/10", textColor)}>
          <Icon className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-3xl font-display font-bold text-white tracking-tight">{title}</h3>
          <p className={cn("text-xs font-bold uppercase tracking-[0.3em] mt-3 opacity-80", textColor)}>{subtitle}</p>
        </div>
      </div>
      
      <div className="lg:w-2/3 flex flex-col gap-10 relative z-10 lg:pl-10 lg:border-l border-white/10">
        <div className="space-y-6">
          <h4 className={cn("text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3", textColor)}>
            <div className={cn("w-1 h-4 rounded-full", bgColor, "shadow-[0_0_10px_currentColor]")} /> Core Principles
          </h4>
          <div className="space-y-4">
            {principles.map((p, i) => (
              <div key={i} className="flex items-start gap-4 text-base md:text-lg text-white/90 leading-relaxed font-sans">
                <div className={cn("w-2 h-2 rounded-full mt-2.5 shrink-0 opacity-80", bgColor)} />
                {p}
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <h4 className={cn("text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3", textColor)}>
             <div className={cn("w-1 h-4 rounded-full", bgColor, "shadow-[0_0_10px_currentColor]")} /> Action Steps
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => onSelectStep(s)}
                className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-[24px] text-left hover:border-white/30 hover:bg-white/10 transition-all group/btn"
              >
                <span className="text-base text-white/90 font-medium">{s}</span>
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover/btn:bg-white/20 transition-all shrink-0", textColor)}>
                  <ChevronRight className="w-5 h-5 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
