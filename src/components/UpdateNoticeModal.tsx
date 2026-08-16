import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import type { ChangelogEntry } from '@/lib/updateNotice';
import type { UpdateNoticeMode } from '@/hooks/useUpdateNotice';
import { APP_VERSION } from '@/lib/appVersion';

interface UpdateNoticeModalProps {
  isOpen: boolean;
  entries: ChangelogEntry[];
  mode?: UpdateNoticeMode;
  onClose: () => void;
}

export function UpdateNoticeModal({ isOpen, entries, mode = 'auto', onClose }: UpdateNoticeModalProps) {
  if (!isOpen || entries.length === 0) return null;

  const latestVersion = (
    mode === 'manual' ? entries[0]?.version : entries[entries.length - 1]?.version
  ) || APP_VERSION;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-safe bg-black/70 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="w-full max-w-md max-h-[92vh] overflow-y-auto glass border border-yellow-500/20 rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 shadow-[0_0_50px_rgba(234,179,8,0.12)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
              aria-label="닫기"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center text-yellow-400 shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400/80 font-mono">
                  PRISM Update
                </p>
                <h3 className="text-lg font-bold text-white font-sans truncate">
                  {mode === 'manual' ? '최신 업데이트 변경점' : '새 버전이 적용되었습니다'}
                </h3>
                <p className="text-[11px] text-white/45 font-mono mt-0.5">
                  현재 v{latestVersion}
                </p>
              </div>
            </div>

            <div className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain space-y-3 mb-6 text-left pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.version}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-[11px] font-bold text-yellow-300/90 font-mono mb-1.5">
                    v{entry.version}
                  </p>
                  <p className="text-sm text-white/85 leading-relaxed break-keep font-sans font-semibold">
                    {entry.summary}
                  </p>
                  {entry.items && entry.items.length > 0 ? (
                    <ul className="mt-2.5 space-y-1.5">
                      {entry.items.map((item, idx) => (
                        <li
                          key={`${entry.version}-item-${idx}`}
                          className="text-[13px] text-white/70 leading-relaxed break-keep font-sans flex gap-2"
                        >
                          <span className="text-yellow-500/70 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    entry.summary === '자동 업데이트' ||
                    /^자동 업데이트\s+\d{4}/.test(entry.summary) ? (
                      <p className="mt-2 text-xs text-white/45 font-sans">
                        상세 변경 내역이 아직 기록되지 않은 버전입니다.
                      </p>
                    ) : null
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-yellow-500/90 hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
            >
              확인
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}