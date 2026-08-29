import React, { useState } from 'react';
import { X, History, MessageSquarePlus } from 'lucide-react';
import { ReBibleVerse } from '../../types/rebible';

interface ReBibleAnnotationModalProps {
  verse: ReBibleVerse | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAnnotation: (verseId: string, annotationData: { timeHorizon: string; content: string; shiftSummary?: string }) => void;
}

const TIME_HORIZON_PRESETS = [
  '오늘의 시선 (Now)',
  '1개월 후의 성찰',
  '3개월 후의 통찰',
  '1년 후의 깨달음',
  '시간을 건너온 나'
];

export const ReBibleAnnotationModal: React.FC<ReBibleAnnotationModalProps> = ({
  verse,
  isOpen,
  onClose,
  onSaveAnnotation
}) => {
  const [timeHorizon, setTimeHorizon] = useState('오늘의 시선 (Now)');
  const [content, setContent] = useState('');
  const [shiftSummary, setShiftSummary] = useState('');

  if (!isOpen || !verse) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('성찰 내용을 입력해 주세요.');
      return;
    }

    onSaveAnnotation(verse.id, {
      timeHorizon: timeHorizon.trim() || '오늘의 주석',
      content: content.trim(),
      shiftSummary: shiftSummary.trim() || undefined
    });

    setContent('');
    setShiftSummary('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl flex flex-col rounded-3xl border border-[#D8C6A5] bg-[#FAF6EE] text-stone-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E8DFC8] bg-[#F4EDE0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4A321F] text-[#FAF5EB] flex items-center justify-center font-bold">
              <History size={16} />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-tight text-stone-900">
                시간의 성찰 주석 달기
              </h2>
              <p className="text-[11px] text-stone-600">
                과거의 기록에 오늘의 새로운 시선과 깨달음을 덧붙입니다
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition hover:bg-[#EAE0CD] text-stone-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target Verse Summary */}
          <div className="p-3.5 rounded-2xl border border-[#E3D6BE] bg-[#F5EDE0]/80">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-[#854D0E] font-serif">{verse.reference} 《{verse.title}》</span>
              <span className="text-[10px] text-stone-500 font-mono">
                {new Date(verse.recordedAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <p className="text-xs text-stone-800 line-clamp-2 italic font-serif">
              "{verse.insight}"
            </p>
          </div>

          {/* Time Horizon Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800">
              성찰 시점
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_HORIZON_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTimeHorizon(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border transition ${
                    timeHorizon === preset
                      ? 'bg-[#4A321F] text-[#FAF5EB] border-[#4A321F] font-bold shadow-xs'
                      : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-700 hover:bg-[#EFE6D4]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800">
              시간을 건너온 오늘의 새로운 깨달음
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="그때의 사건을 시간이 흐른 지금 다시 바라보았을 때 느껴지는 새로운 의미나 감사의 마음을 적어보세요..."
              className="w-full p-3 rounded-2xl border border-[#DFCDB2] bg-[#FCFAF5] text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#854D0E] leading-relaxed transition resize-none"
            />
          </div>

          {/* Optional Shift Summary */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
              <span>서사 전환 한 줄 요약 (선택)</span>
              <span className="text-[10px] text-stone-500 font-normal">예: 절망이 가장 큰 은총으로 승화됨</span>
            </label>
            <input
              type="text"
              value={shiftSummary}
              onChange={(e) => setShiftSummary(e.target.value)}
              placeholder="인식의 변화를 한 줄로 요약해 보세요"
              className="w-full px-3 py-2 rounded-xl border border-[#DFCDB2] bg-[#FCFAF5] text-stone-900 placeholder:text-stone-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#854D0E] transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFC8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-[#EAE0CD] transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4A321F] text-[#FAF5EB] hover:bg-[#382515] transition shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <MessageSquarePlus size={14} />
              <span>성찰 주석 봉헌</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
