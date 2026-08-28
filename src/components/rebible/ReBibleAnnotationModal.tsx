import React, { useState } from 'react';
import { X, Sparkles, History, MessageSquarePlus, Clock } from 'lucide-react';
import { ReBibleVerse, SacredAtmosphere } from '../../types/rebible';

interface ReBibleAnnotationModalProps {
  verse: ReBibleVerse | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAnnotation: (verseId: string, annotationData: { timeHorizon: string; content: string; shiftSummary?: string }) => void;
  atmosphere: SacredAtmosphere;
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
  onSaveAnnotation,
  atmosphere
}) => {
  const [timeHorizon, setTimeHorizon] = useState('오늘의 시선 (Now)');
  const [content, setContent] = useState('');
  const [shiftSummary, setShiftSummary] = useState('');

  if (!isOpen || !verse) return null;

  const isParchment = atmosphere === 'parchment';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('주석 내용을 입력해 주세요.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-xl flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
        isParchment 
          ? 'bg-[#FAF6EE] border-amber-900/20 text-stone-900' 
          : 'bg-slate-950 border-amber-500/30 text-slate-100'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isParchment ? 'border-amber-900/10 bg-amber-100/50' : 'border-slate-800 bg-slate-900/70'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <History size={16} />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-black tracking-tight">
                서사 재해석 주석 달기 (Annotating)
              </h2>
              <p className={`text-[11px] ${isParchment ? 'text-stone-500' : 'text-slate-400'}`}>
                과거의 기록에 오늘의 내가 새로운 해석을 덧붙여 서사를 진화시킵니다
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isParchment ? 'hover:bg-amber-200/60 text-stone-600' : 'hover:bg-white/10 text-slate-400'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target Verse Summary */}
          <div className={`p-3.5 rounded-2xl border ${
            isParchment ? 'bg-amber-100/40 border-amber-900/10' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-amber-500 font-serif">{verse.reference} 《{verse.title}》</span>
              <span className="text-[10px] opacity-60 font-mono">
                {new Date(verse.recordedAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="text-xs font-serif italic text-amber-300/90 line-clamp-2">
              "{verse.insight}"
            </div>
          </div>

          {/* Time Horizon Selection */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
              isParchment ? 'text-stone-700' : 'text-slate-300'
            }`}>
              <Clock size={12} className="text-amber-500" />
              <span>주석을 다는 나의 시점 (Time Horizon)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TIME_HORIZON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTimeHorizon(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    timeHorizon === preset
                      ? isParchment
                        ? 'bg-amber-900 text-white font-bold border-amber-900'
                        : 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : isParchment
                      ? 'bg-stone-200/60 border-stone-300 text-stone-700'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              placeholder="직접 입력 (예: 6개월 후 파리에서, 30대의 내가)"
              className={`w-full px-3 py-1.5 rounded-xl text-xs outline-none border ${
                isParchment ? 'bg-white border-amber-900/20' : 'bg-slate-900 border-slate-800'
              }`}
            />
          </div>

          {/* Annotation Content */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${
              isParchment ? 'text-stone-700' : 'text-slate-300'
            }`}>
              <span className="flex items-center gap-1 text-amber-500">
                <Sparkles size={12} />
                오늘의 재해석 및 확장된 주석 (Rewrite Reflection)
              </span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="시간이 지난 지금, 그때의 사건과 지혜를 돌아보니 어떤 새로운 진실이 보이나요? 서사의 결말이 어떻게 확장되었는지 덧붙여보세요..."
              className={`w-full p-3 rounded-xl text-sm outline-none border font-serif leading-relaxed transition resize-none ${
                isParchment
                  ? 'bg-white border-amber-900/20 text-stone-900 focus:border-amber-700'
                  : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Shift Summary */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${
              isParchment ? 'text-stone-700' : 'text-slate-300'
            }`}>
              한 줄 인식의 도약 (Shift Summary - 선택사항)
            </label>
            <input
              type="text"
              value={shiftSummary}
              onChange={(e) => setShiftSummary(e.target.value)}
              placeholder="예: 상처에서 사명으로의 전환, 결핍이 풍요의 씨앗이었음을 발견"
              className={`w-full px-3 py-2 rounded-xl text-xs outline-none border ${
                isParchment ? 'bg-white border-amber-900/20' : 'bg-slate-900 border-slate-800'
              }`}
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                isParchment ? 'text-stone-600 hover:bg-stone-200' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 disabled:opacity-40 shadow-md hover:brightness-105 transition flex items-center gap-1.5"
            >
              <MessageSquarePlus size={14} />
              <span>주석 저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
