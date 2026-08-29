import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Sparkles, 
  BookMarked, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ArrowRight, 
  Star,
  Quote
} from 'lucide-react';
import { ReBibleVerse } from '@/types/rebible';
import { 
  loadLocalVerses, 
  subscribeToReBibleVerses, 
  getDailyMannaVerse,
  DEFAULT_SACRED_VERSES 
} from '@/lib/rebibleStorage';
import { playTTS, stopTTS, useTTSActive } from '@/utils/tts';
import { useApp } from '@/contexts/AppContext';

export const ReBibleDailyMannaCard: React.FC = () => {
  const [, navigate] = useLocation();
  const { firebaseUser } = useApp();
  const [verses, setVerses] = useState<ReBibleVerse[]>(() => {
    const local = loadLocalVerses();
    return local.length > 0 ? local : DEFAULT_SACRED_VERSES;
  });
  const [currentVerse, setCurrentVerse] = useState<ReBibleVerse | null>(() => getDailyMannaVerse(verses));
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isTTSActive = useTTSActive();

  useEffect(() => {
    const unsub = subscribeToReBibleVerses(firebaseUser?.uid, (fetched) => {
      if (fetched && fetched.length > 0) {
        setVerses(fetched);
      }
    });

    const handleVersesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.newVerse) {
        setVerses(loadLocalVerses());
      }
    };
    window.addEventListener('rebible-verses-updated', handleVersesUpdated);

    return () => {
      unsub();
      window.removeEventListener('rebible-verses-updated', handleVersesUpdated);
    };
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (!currentVerse && verses.length > 0) {
      setCurrentVerse(getDailyMannaVerse(verses));
    }
  }, [verses, currentVerse]);

  useEffect(() => {
    if (!isTTSActive && isPlayingAudio) {
      setIsPlayingAudio(false);
    }
  }, [isTTSActive, isPlayingAudio]);

  const handleShuffleAnother = useCallback(() => {
    if (verses.length <= 1) return;
    let nextIndex = Math.floor(Math.random() * verses.length);
    if (currentVerse && verses[nextIndex].id === currentVerse.id) {
      nextIndex = (nextIndex + 1) % verses.length;
    }
    setCurrentVerse(verses[nextIndex]);
  }, [verses, currentVerse]);

  const handleToggleRecitation = async () => {
    if (!currentVerse) return;
    if (isPlayingAudio) {
      stopTTS();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const recitationScript = `${currentVerse.reference}. ${currentVerse.title}. 성령의 말씀. ${currentVerse.insight}.`;
    
    try {
      await playTTS(recitationScript, 'Kore', true);
    } catch (e) {
      console.warn('TTS Recitation finished:', e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  if (!currentVerse) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 bg-gradient-to-br from-[#1E150F]/95 via-[#18110D]/90 to-[#120D09]/95 text-stone-100 p-5 sm:p-7 backdrop-blur-xl group"
    >
      {/* Background Sacred Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none -mr-16 -mt-16 group-hover:bg-amber-500/15 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-yellow-600/10 blur-[80px] pointer-events-none -ml-16 -mb-16" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-amber-400">
                  DAILY MANNA · 오늘의 묵상
                </span>
                {currentVerse.isSacredFavorite && (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    황금 구절
                  </span>
                )}
              </div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-amber-100/90 tracking-tight">
                오늘 나에게 주는 성령의 한 말씀
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pick another verse */}
            <button
              onClick={handleShuffleAnother}
              disabled={verses.length <= 1}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 text-xs font-medium cursor-pointer active:scale-95 disabled:opacity-40"
              title="다른 묵상 말씀 소환"
            >
              <RefreshCw size={13} className="text-amber-400" />
              <span className="hidden sm:inline text-[11px]">다른 말씀</span>
            </button>

            {/* Audio Recitation (TTS with Ducking) */}
            <button
              onClick={handleToggleRecitation}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer active:scale-95 shadow-sm ${
                isPlayingAudio
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 animate-pulse font-black'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
              title={isPlayingAudio ? "낭독 중지" : "성령의 낭독 듣기 (BGM 자동 덕킹)"}
            >
              {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span className="hidden sm:inline text-[11px]">{isPlayingAudio ? '낭독 중' : '말씀 듣기'}</span>
            </button>
          </div>
        </div>

        {/* Verse Body */}
        <div className="space-y-3">
          {/* Reference & Title */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full font-serif font-black text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 tracking-wide flex items-center gap-1">
              <BookMarked size={12} className="text-amber-400" />
              <span>{currentVerse.reference}</span>
            </span>
            <span className="text-sm sm:text-base font-serif font-bold text-stone-100 truncate">
              {currentVerse.title}
            </span>
          </div>

          {/* Holy Spirit Insight Quote Box */}
          <div className="relative p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-500/25 shadow-inner">
            <Quote className="absolute top-3 right-3 text-amber-500/20 pointer-events-none" size={32} />
            <p className="font-serif text-sm sm:text-base md:text-lg font-medium leading-relaxed italic text-amber-100 drop-shadow-sm break-keep">
              "{currentVerse.insight}"
            </p>
          </div>

          {/* Fact Context Snippet */}
          {currentVerse.fact && (
            <p className="text-xs text-stone-400/90 font-sans leading-relaxed line-clamp-2 px-1">
              <strong className="text-stone-300 font-semibold">여정의 배경: </strong>
              {currentVerse.fact}
            </p>
          )}
        </div>

        {/* Bottom Navigation Link */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[11px] font-mono text-stone-500">
            기록일: {new Date(currentVerse.recordedAt).toLocaleDateString('ko-KR')}
          </span>

          <button
            onClick={() => navigate('/rebible')}
            className="text-xs font-serif font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer group-hover:translate-x-0.5 duration-300"
          >
            <span>인생 경전 Re:Bible 서재 전체 열기</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
