import React, { useState } from 'react';
import { 
  BookMarked, 
  Star, 
  MessageSquarePlus, 
  Volume2, 
  VolumeX, 
  Share2, 
  Copy, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Clock, 
  Check, 
  Layers,
  History,
  Tag
} from 'lucide-react';
import { ReBibleVerse, ReBibleAnnotation, SacredAtmosphere } from '../../types/rebible';
import { playTTS, stopTTS } from '../../utils/tts';

interface ReBibleVerseCardProps {
  verse: ReBibleVerse;
  atmosphere: SacredAtmosphere;
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onEditVerse: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
}

export const ReBibleVerseCard: React.FC<ReBibleVerseCardProps> = ({
  verse,
  atmosphere,
  onToggleFavorite,
  onAddAnnotation,
  onEditVerse,
  onDeleteVerse,
  onDeleteAnnotation
}) => {
  const [isAnnotationsOpen, setIsAnnotationsOpen] = useState(true);
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
    const recitationScript = `${verse.reference}. ${verse.title}. 사건. ${verse.fact}. 깨달음. ${verse.insight}.`;
    
    try {
      await playTTS(recitationScript, 'Kore', true);
    } catch (e) {
      console.warn('TTS recitation finished or interrupted:', e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleCopyQuote = () => {
    const quoteText = `📖 [Re:Bible] ${verse.reference} 《${verse.title}》\n\n[사건]\n${verse.fact}\n\n[지혜의 구절]\n${verse.insight}\n\n- ${formattedDate}`;
    navigator.clipboard.writeText(quoteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Card theme styles
  const isParchment = atmosphere === 'parchment';
  const isCandlelight = atmosphere === 'candlelight';

  return (
    <article className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
      isParchment
        ? 'bg-amber-50/80 border-amber-900/15 text-stone-900'
        : isCandlelight
        ? 'bg-zinc-900/80 border-zinc-800 text-zinc-100'
        : 'bg-slate-900/70 border-slate-800/90 text-slate-100'
    }`}>
      {/* Top Meta Bar */}
      <div className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-2 text-xs ${
        isParchment ? 'border-amber-900/10 bg-amber-100/40' : 'border-slate-800/70 bg-slate-950/40'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chapter & Verse Reference Badge */}
          <span className={`px-2.5 py-0.5 rounded-full font-serif font-black tracking-wide flex items-center gap-1 ${
            isParchment
              ? 'bg-amber-900 text-amber-50'
              : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-xs'
          }`}>
            <BookMarked size={11} className="stroke-[2.5]" />
            <span>{verse.reference}</span>
          </span>

          <span className={`text-[11px] font-mono ${isParchment ? 'text-stone-500' : 'text-slate-400'}`}>
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
                ? 'bg-amber-500 text-slate-950 animate-pulse font-bold' 
                : isParchment 
                ? 'text-stone-600 hover:bg-amber-200/60' 
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
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
                ? 'text-amber-400 font-bold' 
                : isParchment 
                ? 'text-stone-400 hover:bg-amber-200/60' 
                : 'text-slate-500 hover:bg-white/10'
            }`}
            title="마음에 새긴 황금 구절 (즐겨찾기)"
            aria-label="즐겨찾기 토글"
          >
            <Star size={15} className={verse.isSacredFavorite ? "fill-amber-400" : ""} />
          </button>

          {/* Copy Quote */}
          <button
            onClick={handleCopyQuote}
            className={`p-1.5 rounded-lg transition ${
              copied
                ? 'text-emerald-500 font-bold'
                : isParchment
                ? 'text-stone-600 hover:bg-amber-200/60'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title="경전 구절 복사"
            aria-label="구절 복사"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEditVerse(verse)}
            className={`p-1.5 rounded-lg transition ${
              isParchment ? 'text-stone-600 hover:bg-amber-200/60' : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title="구절 수정"
            aria-label="구절 수정"
          >
            <Edit3 size={14} />
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (window.confirm('이 경전 구절을 영구히 삭제하시겠습니까?')) {
                onDeleteVerse(verse.id);
              }
            }}
            className={`p-1.5 rounded-lg transition hover:text-rose-500 ${
              isParchment ? 'text-stone-400 hover:bg-rose-100' : 'text-slate-500 hover:bg-rose-950/40'
            }`}
            title="구절 삭제"
            aria-label="구절 삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Narrative Verse Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Title / Theme */}
        <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight leading-snug">
          {verse.title}
        </h3>

        {/* Fact vs Insight Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Fact Block (사건) */}
          <div className={`p-4 rounded-xl border transition ${
            isParchment
              ? 'bg-amber-100/30 border-amber-900/10'
              : 'bg-slate-950/40 border-slate-800/60'
          }`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isParchment ? 'text-stone-600' : 'text-slate-400'
              }`}>
                사건 (Fact)
              </span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans ${
              isParchment ? 'text-stone-700' : 'text-slate-300'
            }`}>
              {verse.fact}
            </p>
          </div>

          {/* Insight Block (지혜의 구절) */}
          <div className={`p-4 rounded-xl border transition relative overflow-hidden ${
            isParchment
              ? 'bg-amber-100/70 border-amber-800/30 ring-1 ring-amber-800/10'
              : 'bg-amber-950/20 border-amber-500/30 ring-1 ring-amber-500/15'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                  지혜의 구절 (Insight)
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif font-medium text-amber-100 italic ${
              isParchment ? '!text-amber-950 not-italic font-semibold' : 'text-amber-100'
            }">
              "{verse.insight}"
            </p>
          </div>
        </div>

        {/* Emotions & Tags Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {verse.emotions?.map((emotion, idx) => (
              <span
                key={`em-${idx}`}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                  isParchment
                    ? 'bg-stone-200/70 text-stone-700'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                #{emotion}
              </span>
            ))}
            {verse.tags?.map((tag, idx) => (
              <span
                key={`tg-${idx}`}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  isParchment
                    ? 'bg-amber-200/50 text-amber-900'
                    : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                🏷️ {tag}
              </span>
            ))}
          </div>

          {/* Add Annotation Trigger */}
          <button
            onClick={() => onAddAnnotation(verse)}
            className={`text-xs font-bold px-3 py-1 rounded-lg border transition flex items-center gap-1.5 active:scale-95 ${
              isParchment
                ? 'bg-amber-200/60 border-amber-800/20 text-amber-900 hover:bg-amber-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <MessageSquarePlus size={13} />
            <span>오늘의 주석 달기</span>
          </button>
        </div>

        {/* Annotations Section (Rewriting / Narrative Evolution) */}
        {verse.annotations && verse.annotations.length > 0 && (
          <div className={`mt-4 pt-3 border-t ${isParchment ? 'border-amber-900/10' : 'border-slate-800/60'}`}>
            <button
              onClick={() => setIsAnnotationsOpen(!isAnnotationsOpen)}
              className={`w-full flex items-center justify-between text-xs font-semibold py-1 transition ${
                isParchment ? 'text-stone-700 hover:text-stone-900' : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <History size={13} className="text-amber-500" />
                <span>시간을 건너온 주석 ({verse.annotations.length})</span>
                <span className="text-[10px] opacity-60 font-normal">과거 서사의 재해석</span>
              </div>
              {isAnnotationsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isAnnotationsOpen && (
              <div className="mt-2.5 space-y-2.5 pl-2 sm:pl-3 border-l-2 border-amber-500/40">
                {verse.annotations.map((annot) => (
                  <div
                    key={annot.id}
                    className={`p-3 rounded-xl border text-xs relative group ${
                      isParchment
                        ? 'bg-amber-100/50 border-amber-900/15 text-stone-800'
                        : 'bg-slate-950/60 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          isParchment
                            ? 'bg-amber-900/10 text-amber-900 font-serif'
                            : 'bg-amber-500/20 text-amber-300 font-serif'
                        }`}>
                          {annot.timeHorizon || '주석'}
                        </span>
                        <span className={`text-[10px] ${isParchment ? 'text-stone-500' : 'text-slate-400'}`}>
                          {new Date(annot.writtenAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>

                      <button
                        onClick={() => onDeleteAnnotation(verse.id, annot.id)}
                        className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-rose-500"
                        title="주석 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <p className="font-serif leading-relaxed whitespace-pre-wrap">
                      {annot.content}
                    </p>

                    {annot.shiftSummary && (
                      <div className="mt-1.5 text-[10px] text-amber-500/90 font-medium">
                        ✦ 인식의 도약: {annot.shiftSummary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
