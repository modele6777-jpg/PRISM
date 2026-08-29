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
  Clock, 
  Flame,
  MessageSquare,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { ReBibleVerse } from '../../types/rebible';
import { playTTS, stopTTS } from '../../utils/tts';
import { exportVerseAsCardImage } from '../../utils/rebibleExporter';
import { useLocation } from 'wouter';

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
  const [, navigate] = useLocation();
  const [isAnnotationsOpen, setIsAnnotationsOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFactExpanded, setIsFactExpanded] = useState(false);
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);

  const [isExportingImage, setIsExportingImage] = useState(false);

  const handleExportImage = async () => {
    try {
      setIsExportingImage(true);
      await exportVerseAsCardImage(verse);
    } catch (e) {
      console.warn('Export image error:', e);
    } finally {
      setIsExportingImage(false);
    }
  };

  const formattedDate = new Date(verse.recordedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Check if fact or insight is long enough to warrant expand/collapse
  const isFactLong = verse.fact && (verse.fact.length > 130 || verse.fact.includes('\n'));
  const isInsightLong = verse.insight && (verse.insight.length > 130 || verse.insight.includes('\n'));

  const handleTalkWithLucy = () => {
    try {
      const topicText = `루시야, 내 인생 경전 [${verse.reference} ${verse.title}]에 대해 대화하고 싶어.\n- 성령의 지혜 구절: "${verse.insight}"\n- 삶의 여정: "${verse.fact}"\n이 깨달음을 내 삶에 더 깊이 적용하고 확장할 수 있는 조언을 해줘.`;
      sessionStorage.setItem('lucy_injected_input_draft', topicText);
    } catch (_) {}
    navigate('/lucy');
  };

  const handleToggleRecitation = async () => {
    if (isPlayingAudio) {
      stopTTS();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const recitationScript = `${verse.reference}. ${verse.title}. 기록된 여정. ${verse.fact}. 성령의 관점, 지혜의 구절. ${verse.insight}.`;
    
    try {
      await playTTS(recitationScript, 'Kore', true);
    } catch (e) {
      console.warn('TTS recitation finished or interrupted:', e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleCopyQuote = () => {
    const quoteText = `📖 [Re:Bible] ${verse.reference} 《${verse.title}》\n\n[기록된 여정]\n${verse.fact}\n\n[성령의 관점 · 지혜의 구절]\n${verse.insight}\n\n- ${formattedDate}`;
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

          {/* Export Card Image (PNG) */}
          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="p-1.5 rounded-lg transition text-stone-600 hover:bg-[#EFE6D4] hover:text-amber-900 disabled:opacity-50"
            title="아름다운 경전 엽서 이미지(PNG)로 저장 / 공유"
            aria-label="엽서 이미지 다운로드"
          >
            {isExportingImage ? <Loader2 size={15} className="animate-spin text-amber-700" /> : <ImageIcon size={15} />}
          </button>

          {/* Talk with Lucy on this verse */}
          <button
            onClick={handleTalkWithLucy}
            className="p-1.5 rounded-lg transition text-amber-800 hover:bg-[#EFE6D4] hover:text-amber-950 flex items-center gap-1"
            title="이 경전 구절을 바탕으로 루시와 대화하기"
            aria-label="루시와 대화"
          >
            <MessageSquare size={15} />
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

        {/* Fact vs Holy Spirit Insight Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-start">
          {/* Fact Block (기록된 여정 / 사건) */}
          <div className="p-4 rounded-xl border border-[#E5D7BF] bg-[#F5ECE0]/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#8C6D4F]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#63482F]">
                    기록된 여정 (Fact)
                  </span>
                </div>
                {isFactLong && (
                  <button
                    type="button"
                    onClick={() => setIsFactExpanded(!isFactExpanded)}
                    className="text-[11px] font-bold text-[#63482F] hover:text-stone-950 px-2 py-0.5 rounded-md hover:bg-black/5 transition flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{isFactExpanded ? '접기' : '더보기'}</span>
                    {isFactExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              <div className={`relative ${!isFactExpanded && isFactLong ? 'line-clamp-3 overflow-hidden' : ''}`}>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-stone-800">
                  {verse.fact}
                </p>
              </div>
            </div>
          </div>

          {/* Insight Block (성령의 관점 / 지혜의 구절) */}
          <div className="p-4 rounded-xl border border-[#D8C29D] bg-gradient-to-b from-[#F3E7D2] to-[#EFE1C8] relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🕊️</span>
                  <span className="text-[11px] font-bold text-[#854D0E] uppercase tracking-wider flex items-center gap-1">
                    <span>성령의 관점 · 지혜의 구절</span>
                    <Sparkles size={11} className="text-[#854D0E] fill-[#854D0E]" />
                  </span>
                </div>
                {isInsightLong && (
                  <button
                    type="button"
                    onClick={() => setIsInsightExpanded(!isInsightExpanded)}
                    className="text-[11px] font-bold text-[#854D0E] hover:text-[#4A2800] px-2 py-0.5 rounded-md hover:bg-black/5 transition flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{isInsightExpanded ? '접기' : '더보기'}</span>
                    {isInsightExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              <div className={`relative ${!isInsightExpanded && isInsightLong ? 'line-clamp-3 overflow-hidden' : ''}`}>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif font-semibold text-[#291707]">
                  "{verse.insight}"
                </p>
              </div>
            </div>
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
                <span>시간의 성찰 {annotationsCount}개</span>
                {isAnnotationsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            <button
              onClick={() => onAddAnnotation(verse)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#CDB58E] bg-[#EFE4CE] text-[#3B250E] hover:bg-[#E6D8BE] transition flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <Clock size={13} className="text-[#854D0E]" />
              <span>Q&A 성찰 더하기 (3년 기록)</span>
            </button>
          </div>
        </div>

        {/* Annotations Section (Q&A 다이어리 형태의 1~3년 시간의 성찰) */}
        {isAnnotationsOpen && annotationsCount > 0 && (
          <div className="mt-3 pt-3 border-t border-[#E8DFC8] space-y-2.5">
            <h4 className="text-xs font-serif font-bold text-stone-800 flex items-center gap-1.5">
              <History size={13} className="text-[#854D0E]" />
              <span>시간을 건너온 성찰 다이어리 (누적 {annotationsCount}편)</span>
            </h4>

            <div className="space-y-2">
              {verse.annotations.map((annot) => (
                <div
                  key={annot.id}
                  className="p-3.5 rounded-xl border border-[#E2D4BC] bg-[#F7F1E5] text-xs space-y-1.5 relative group"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-600">
                    <span className="font-bold text-[#854D0E] bg-[#EBE0CD] px-2 py-0.5 rounded-md border border-[#DFCDB2]">
                      ⏳ {annot.timeHorizon}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-500">
                        기록일: {new Date(annot.writtenAt).toLocaleDateString('ko-KR')}
                      </span>
                      <button
                        onClick={() => onDeleteAnnotation(verse.id, annot.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition"
                        title="주석 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <p className="leading-relaxed font-sans text-stone-800 text-xs sm:text-[13px]">
                    {annot.content}
                  </p>

                  {annot.shiftSummary && (
                    <p className="text-[11px] font-semibold text-[#854D0E] italic pt-1 border-t border-[#EBE0CD]">
                      ↳ [인식의 도약] {annot.shiftSummary}
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
