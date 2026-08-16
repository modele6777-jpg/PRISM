import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplets, Key, Wind, Eraser, Sparkles, RefreshCw, Trash2, Package } from 'lucide-react';
import { TTSButton } from '@/components/TTSButton';
import { ImageOutputActions } from '@/components/ImageOutputActions';
import {
  HOPONOPONO_TOOL_CATALOG,
  type HoponoponoToolId,
  type SavedHoponoponoTool,
} from '@/lib/hoponoponoTools';

const TOOL_ICONS: Record<HoponoponoToolId, React.ReactNode> = {
  blue_solar_water: <Droplets size={16} />,
  ceeport: <Key size={16} />,
  ha: <Wind size={16} />,
  eraser: <Eraser size={16} />,
  salt_water: <Package size={16} />,
  auto: <Sparkles size={16} />,
};

type HoponoponoToolPickerProps = {
  selectedToolId: HoponoponoToolId;
  onSelect: (toolId: HoponoponoToolId) => void;
};

export function HoponoponoToolPicker({ selectedToolId, onSelect }: HoponoponoToolPickerProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1 text-left">
        <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-sans">
          <Droplets size={14} /> 함께 받을 정화 도구
        </span>
        <p className="text-xs text-white/50 break-keep font-sans leading-relaxed">
          정화 개시와 함께 블루솔라워터, 치포트키 등 실제 정화 도구 처방도 받아요.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {HOPONOPONO_TOOL_CATALOG.map((tool) => {
          const isActive = selectedToolId === tool.id;
          return (
            <motion.button
              key={tool.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(tool.id)}
              className={`p-4 rounded-2xl text-left border transition-all ${
                isActive
                  ? 'bg-sky-500/15 border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-sky-500/20'
              }`}
            >
              <div className={`mb-2 ${isActive ? 'text-sky-300' : 'text-white/50'}`}>
                {TOOL_ICONS[tool.id]}
              </div>
              <p className="text-sm font-bold text-white font-sans">{tool.emoji} {tool.name}</p>
              <p className="text-[10px] text-white/40 mt-1 break-keep leading-tight font-sans">{tool.summary}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

type HoponoponoToolResultCardProps = {
  tool: SavedHoponoponoTool;
  imageLoading?: boolean;
  onImageLoad?: () => void;
  onDelete?: () => void;
  compact?: boolean;
};

export function HoponoponoToolResultCard({
  tool,
  imageLoading = false,
  onImageLoad,
  onDelete,
  compact = false,
}: HoponoponoToolResultCardProps) {
  return (
    <div
      className={`rounded-3xl bg-[#0d1512]/70 border border-sky-500/20 overflow-hidden ${
        compact ? 'p-4 space-y-4' : 'p-6 md:p-8 space-y-6'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1 text-left">
          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-sans">
            실제 정화 도구 처방
          </span>
          <h4 className="text-xl font-black text-white font-sans">{tool.toolName}</h4>
          <p className="text-xs text-white/50 font-sans">{tool.toolSubtitle}</p>
          <p className="text-xs text-white/50 break-keep font-sans mt-1">{tool.whyThisTool}</p>
        </div>
        {onDelete && !compact && (
          <button
            type="button"
            onClick={onDelete}
            className="self-start px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-white/40 hover:text-rose-300 text-xs flex items-center gap-1.5 transition-all"
          >
            <Trash2 size={12} />
            삭제
          </button>
        )}
      </div>

      {tool.imageUrl && !compact && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[4/3] w-full">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <RefreshCw size={20} className="animate-spin text-sky-400" />
            </div>
          )}
          <ImageOutputActions
            src={tool.imageUrl}
            alt={tool.toolName}
            filename={`hoponopono-${tool.toolId}`}
          />
          <img
            src={tool.imageUrl}
            alt={tool.toolName}
            referrerPolicy="no-referrer"
            onLoad={onImageLoad}
            onError={onImageLoad}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-2">
          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-sans">준비물</span>
          <ul className="space-y-1.5">
            {tool.materials.map((item) => (
              <li key={item} className="text-xs text-white/75 flex items-start gap-2 font-sans">
                <span className="text-sky-400 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-2">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-sans">만드는 순서</span>
          <ol className="space-y-1.5">
            {tool.steps.map((step, idx) => (
              <li key={step} className="text-xs text-white/75 flex items-start gap-2 font-sans">
                <span className="text-emerald-400/80 font-mono shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#09100e]/80 border border-sky-500/15 text-center space-y-3">
        <span className="text-[10px] font-black tracking-widest text-sky-300 uppercase font-mono block">
          사용할 때 읊을 주문
        </span>
        <p className="text-sm text-white/90 whitespace-pre-line italic leading-relaxed font-sans">
          {tool.usageMantra}
        </p>
        <TTSButton
          text={tool.usageMantra}
          voice="Kore"
          className="px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl text-xs text-sky-300"
        />
      </div>

      <p className="text-xs text-white/55 text-left break-keep font-sans border-t border-white/5 pt-4">
        <span className="text-sky-400 font-bold">오늘의 습관 · </span>
        {tool.dailyPractice}
      </p>
    </div>
  );
}