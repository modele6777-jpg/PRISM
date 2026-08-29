import React, { useState } from 'react';
import { 
  BookMarked, 
  Star, 
  Volume2, 
  VolumeX, 
  Copy, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Check, 
  History,
  MessageSquarePlus,
  Compass
} from 'lucide-react';
import { ReBibleVerse, ReBibleAnnotation } from '../../types/rebible';
import { playTTS, stopTTS } from '../../utils/tts';

interface ReBibleVerseCardProps {
  verse: ReBibleVerse;
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
}

export const ReBibleVerseCard: React.FC<ReBibleVerseCardProps> = ({
  verse,
  onToggleFavorite,
  onAddAnnotation,
  onDeleteVerse,
  onDeleteAnnotation
}) => {
  const [isAnnotationsOpen, setIsAnnotationsOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(verse.recordedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleToggleRecitation = async () => {
    if (isPlayingAudio) {
      stopTTS();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const recitationScript = `${verse.reference}. ${verse.title}. 기록된 여정. ${verse.fact}. 지혜의 구절. ${verse.insight}.`;
    
    try {
      await playTTS(recitationScript, 'Kore', true);
    } catch (e) {
      console.warn('TTS recitation finished or interrupted:', e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleCopyQuote = () => {
    const quoteText = `📖 [Re:Bible] ${verse.reference} 《${verse.title}》\n\n[기록된 여정]\n${verse.fact}\n\n[지혜의 구절]\n${verse.insight}\n\n- ${formattedDate}`;
    navigator.clipboard.writeText(quoteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const annotationsCount = verse.annotations?.length || 0;

  return (
    <article className="rounded-2xl border border-[#E5DAC6] bg-[#FCFAF5] shadow-[0_2px_12px_rgba(74,50,31,0.06)] hover:shadow-[0_4px_20px_rgba(74,50,31,0.1)] transition-all duration-300 overflow-hidden">
      {/* Top Meta Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#E8DFC8] bg-[#F7F2E7]/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chapter & Verse Reference Badge */}
          <span className="px-2.5 py-0.5 rounded-full font-serif font-black tracking-wide flex items-center gap-1 bg-[#4A321F] text-[#FAF5EB] shadow-xs text-xs">
            <BookMarked size={12} className="stroke-[2.5]" />
            <span>{verse.reference}</span>
          </span>

          <span className="text-[11px] font-mono text-stone-600">
            {formattedDate}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Audio TTS Recitation */}
          <button
            onClick={handleToggleRecitation}
            className={`p-1.5 rounded-lg transition ${
              isPlayingAudio 
                ? 'bg-[#854D0E] text-white animate-pulse font-bold' 
                : 'text-stone-700 hover:bg-[#EFE6D4]'
            }`}
            title={isPlayingAudio ? "낭독 중단" : "구절 봉독 듣기 (TTS)"}
            aria-label="구절 낭독"
          >
            {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Sacred Favorite Star */}
          <button
            onClick={() => onToggleFavorite(verse.id)}
            className={`p-1.5 rounded-lg transition ${
              verse.isSacredFavorite 
                ? 'text-amber-600 font-bold' 
                : 'text-stone-400 hover:bg-[#EFE6D4]'
            }`}
            title="마음에 새긴 황금 구절 (즐겨찾기)"
            aria-label="즐겨찾기 토글"
          >
            <Star size={15} className={verse.isSacredFavorite ? "fill-amber-500 text-amber-600" : ""} />
          </button>

          {/* Copy Quote */}
          <button
            onClick={handleCopyQuote}
            className="p-1.5 rounded-lg transition text-stone-600 hover:bg-[#EFE6D4]"
            title="경전 구절 복사"
            aria-label="구절 복사"
          >
            {copied ? <Check size={15} className="text-emerald-700 font-bold" /> : <Copy size={15} />}
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (window.confirm('이 경전 기록을 영구히 삭제하시겠습니까?')) {
                onDeleteVerse(verse.id);
              }
            }}
            className="p-1.5 rounded-lg transition text-stone-400 hover:text-rose-700 hover:bg-rose-100/60"
            title="기록 삭제"
            aria-label="기록 삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Narrative Verse Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Title */}
        <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900 leading-snug">
          {verse.title}
        </h3>

        {/* Fact vs Insight Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Fact Block (기록된 여정 / 사건) */}
          <div className="p-4 rounded-xl border border-[#E5D7BF] bg-[#F5ECE0]/70">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#8C6D4F]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#63482F]">
                기록된 여정 (Fact)
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-stone-800">
              {verse.fact}
            </p>
          </div>

          {/* Insight Block (지혜의 구절) - Crystal Clear High-Contrast Typography */}
          <div className="p-4 rounded-xl border border-[#D8C29D] bg-[#F0E4CE] relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#854D0E] fill-[#854D0E]" />
                <span className="text-[11px] font-bold text-[#854D0E] uppercase tracking-wider">
                  지혜의 구절 (Insight)
                </span>
              </div>
            </div>
            {/* Ink-colored font for ultra readability on parchment */}
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif font-semibold text-[#291707]">
              "{verse.insight}"
            </p>
          </div>
        </div>

        {/* Emotions & Tags Badges & Annotation Trigger */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#EFE5D3]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {verse.emotions?.map((emotion, idx) => (
              <span
                key={`em-${idx}`}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#EFE6D4] text-[#4A3B2C] border border-[#DFCDB2]"
              >
                #{emotion}
              </span>
            ))}
            {verse.tags?.map((tag, idx) => (
              <span
                key={`tg-${idx}`}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EADDC6] text-[#3D2C1A] border border-[#D5C2A3]"
              >
                🏷️ {tag}
              </span>
            ))}
          </div>

          {/* Add Annotation / View Annotations */}
          <div className="flex items-center gap-2">
            {annotationsCount > 0 && (
              <button
                onClick={() => setIsAnnotationsOpen(!isAnnotationsOpen)}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-[#EFE6D4] transition"
              >
                <History size={13} className="text-amber-800" />
                <span>성찰 주석 {annotationsCount}개</span>
                {isAnnotationsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            <button
              onClick={() => onAddAnnotation(verse)}
              className="text-xs font-bold px-3 py-1 rounded-lg border border-[#CDB58E] bg-[#EFE4CE] text-[#3B250E] hover:bg-[#E6D8BE] transition flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <MessageSquarePlus size={13} />
              <span>성찰 더하기</span>
            </button>
          </div>
        </div>

        {/* Annotations Section (시간의 성찰) */}
        {isAnnotationsOpen && annotationsCount > 0 && (
          <div className="mt-3 pt-3 border-t border-[#E8DFC8] space-y-2.5">
            <h4 className="text-xs font-serif font-bold text-stone-800 flex items-center gap-1.5">
              <History size={13} className="text-[#854D0E]" />
              <span>시간을 건너온 성찰 주석 ({annotationsCount})</span>
            </h4>

            <div className="space-y-2">
              {verse.annotations.map((annot) => (
                <div
                  key={annot.id}
                  className="p-3 rounded-xl border border-[#E2D4BC] bg-[#F7F1E5] text-xs space-y-1 relative group"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-600">
                    <span className="font-bold text-[#854D0E] bg-[#EBE0CD] px-1.5 py-0.5 rounded">
                      {annot.timeHorizon}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {new Date(annot.writtenAt).toLocaleDateString('ko-KR')}
                      </span>
                      <button
                        onClick={() => onDeleteAnnotation(verse.id, annot.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition"
                        title="주석 삭제"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <p className="leading-relaxed font-sans text-stone-800">
                    {annot.content}
                  </p>

                  {annot.shiftSummary && (
                    <p className="text-[10px] font-semibold text-[#854D0E] italic pt-0.5">
                      ↳ {annot.shiftSummary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
