import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Copy, Check, ShieldCheck } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export function DevicePairingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { generateDevicePairingCode, importDevicePairingCode } = useApp();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="p-6 sm:p-8 max-w-md w-full rounded-[32px] bg-[#121324] border border-indigo-500/40 text-center space-y-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Sparkles className="text-indigo-400" size={28} />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-white tracking-tight">6자리 기기 즉시 연동</h3>
            <p className="text-xs text-indigo-200/70">PC와 모바일 간에 1초 만에 데이터를 그대로 복제합니다.</p>
          </div>

          {/* Step 1: Send / Generate */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-3">
            <span className="text-[11px] font-bold text-white/60 block uppercase tracking-wider">
              1. 데이터를 보낼 기기 (예: PC)
            </span>
            {generatedCode ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/50">
                <div>
                  <span className="text-[9px] text-indigo-300 block font-medium">다른 기기에 입력할 6자리 번호</span>
                  <span className="text-2xl font-mono font-black tracking-widest text-yellow-300">{generatedCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(generatedCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? '복사됨' : '복사'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const res = await generateDevicePairingCode();
                    if (res?.code) {
                      setGeneratedCode(res.code);
                    }
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isGenerating ? '번호 생성 중...' : '📤 이 기기의 데이터 번호 생성'}
              </button>
            )}
          </div>

          {/* Step 2: Receive / Import */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-3">
            <span className="text-[11px] font-bold text-white/60 block uppercase tracking-wider">
              2. 데이터를 받을 기기 (예: 모바일)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="6자리 번호 입력"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="flex-1 px-3 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white font-mono text-center font-bold text-sm focus:outline-none focus:border-indigo-400 placeholder-white/30"
              />
              <button
                type="button"
                disabled={inputCode.length !== 6 || isImporting}
                onClick={async () => {
                  if (inputCode.length !== 6 || isImporting) return;
                  setIsImporting(true);
                  setFeedback('데이터 복제 중...');
                  try {
                    const res = await importDevicePairingCode(inputCode);
                    setFeedback(res.message);
                    if (res.success) {
                      setInputCode('');
                    }
                  } finally {
                    setIsImporting(false);
                    setTimeout(() => setFeedback(null), 5000);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md active:scale-95"
              >
                {isImporting ? '복제 중...' : '📥 가져오기'}
              </button>
            </div>
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-center gap-2 font-bold animate-pulse"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{feedback}</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
