import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  BookMarked,
  Layers,
  Heart,
  Tag,
  Flame,
  Feather
} from 'lucide-react';
import { SacredAtmosphere, ReBibleVerse } from '../../types/rebible';
import { SyncEchoDraft, buildTodaySyncEchoDraft } from '../../lib/rebibleSyncEcho';
import { playTTS, stopTTS } from '../../utils/tts';

interface ReBibleSyncEchoModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses: ReBibleVerse[];
  atmosphere: SacredAtmosphere;
  onSaveVerse: (verse: Partial<ReBibleVerse>) => void;
  onOpenVerseInDetail?: (verseId: string) => void;
}

export const ReBibleSyncEchoModal: React.FC<ReBibleSyncEchoModalProps> = ({
  isOpen,
  onClose,
  verses,
  atmosphere,
  onSaveVerse,
  onOpenVerseInDetail
}) => {
  const [draft, setDraft] = useState<SyncEchoDraft>(() => buildTodaySyncEchoDraft(verses));
  const [bookTitle, setBookTitle] = useState(draft.suggestedBook);
  const [title, setTitle] = useState(draft.suggestedTitle);
  const [fact, setFact] = useState(draft.context);
  const [insight, setInsight] = useState(draft.guidance);
  const [userReflection, setUserReflection] = useState(draft.reflection);
  const [emotions, setEmotions] = useState<string[]>(draft.suggestedEmotions);
  const [tags, setTags] = useState<string[]>(draft.suggestedTags);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPlayingGuidance, setIsPlayingGuidance] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Re-build draft whenever modal opens or verses update
  useEffect(() => {
    if (isOpen) {
      const freshDraft = buildTodaySyncEchoDraft(verses);
      setDraft(freshDraft);
      setBookTitle(freshDraft.suggestedBook);
      setTitle(freshDraft.suggestedTitle);
      setFact(freshDraft.context);
      setInsight(freshDraft.guidance);
      setUserReflection(freshDraft.reflection);
      setEmotions(freshDraft.suggestedEmotions);
      setTags(freshDraft.suggestedTags);
      setIsSavedSuccess(false);
      setIsPlayingGuidance(false);
    }
  }, [isOpen, verses]);

  if (!isOpen) return null;

  const isParchment = atmosphere === 'parchment';

  const handleRefreshDraft = () => {
    const freshDraft = buildTodaySyncEchoDraft(verses);
    setDraft(freshDraft);
    setFact(freshDraft.context);
    setInsight(freshDraft.guidance);
    setUserReflection(freshDraft.reflection);
  };

  const handleToggleGuidanceAudio = async () => {
    if (isPlayingGuidance) {
      stopTTS();
      setIsPlayingGuidance(false);
      return;
    }

    setIsPlayingGuidance(true);
    const script = `루시의 성스러운 조언. ${insight}. 오늘의 깨달음. ${userReflection}`;
    try {
      await playTTS(script, 'Kore', true);
    } catch (e) {
      console.warn('TTS playback completed or interrupted:', e);
    } finally {
      setIsPlayingGuidance(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleConsecrate = () => {
    // Combine Guidance + User Reflection into full Insight
    const combinedInsight = userReflection.trim() 
      ? `${insight.trim()}\n\n[오늘의 나의 각인]\n${userReflection.trim()}`
      : insight.trim();

    const bookVerses = verses.filter((v) => (v.bookTitle || '').trim() === bookTitle.trim());
    const verseNum = bookVerses.length + 1;
    const reference = `${bookTitle} 1:${verseNum}`;

    const newVersePayload: Partial<ReBibleVerse> = {
      bookTitle: bookTitle.trim() || '통합의 서',
      chapterNumber: 1,
      verseNumber: verseNum,
      reference,
      title: title.trim() || `${draft.dateDisplay}의 통합 기록`,
      fact: fact.trim(),
      insight: combinedInsight,
      emotions,
      tags: Array.from(new Set([...tags, 'Sync:Echo', `날짜:${draft.dateKey}`])),
      isSacredFavorite: true
    };

    onSaveVerse(newVersePayload);
    setIsSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleConsultLucy = () => {
    try {
      const prompt = `루시야, 오늘 리바이블에서 정리된 여정과 성령의 지혜에 대해 상담하고 싶어.\n\n📖 [기록된 오늘의 맥락/사건]\n${fact}\n\n🕊️ [성령의 관점 · 조언]\n${insight}${userReflection.trim() ? `\n\n💭 [나의 성찰]\n${userReflection}` : ''}\n\n오늘 하루를 통합적으로 돌아보고 내일을 위한 지혜와 구체적인 조언을 전해줘.`;
      sessionStorage.setItem('lucy_pro_pending_channel', 'master');
      sessionStorage.setItem('lucy_injected_auto_send', prompt);
      sessionStorage.setItem('lucy_injected_input_draft', prompt);
      window.dispatchEvent(new CustomEvent('lucy-inject-message', {
        detail: { prompt, channel: 'master' }
      }));
    } catch (_) {}
    onClose();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: '/chat' } }));
    }
  };

  const quickReflections = [
    '통제를 내려놓고 우주의 흐름을 신뢰할 때 평온이 깃든다.',
    '불안은 적이 아니라 정화되어야 할 오랜 기억일 뿐이다.',
    '오늘 하루도 나에게 일어난 모든 배움과 인연에 깊이 감사한다.'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-2xl flex flex-col max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden ${
        isParchment 
          ? 'bg-[#FAF6EE] border-amber-900/20 text-stone-900' 
          : 'bg-slate-950 border-amber-500/30 text-slate-100'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isParchment ? 'border-amber-900/10 bg-amber-100/50' : 'border-slate-800 bg-slate-900/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-bold shadow-md animate-pulse">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-serif text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                  Sync:Echo (싱크 에코)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  지혜의 자동 통합
                </span>
              </div>
              <p className={`text-[11px] ${isParchment ? 'text-stone-600' : 'text-slate-400'}`}>
                프리즘 활동과 루시의 조언을 한 편의 경전으로 엮어 오늘을 각인합니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefreshDraft}
              className={`p-1.5 rounded-lg transition ${
                isParchment ? 'hover:bg-amber-200/60 text-stone-600' : 'hover:bg-white/10 text-slate-400'
              }`}
              title="프리즘 최신 활동 다시 불러오기"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition ${
                isParchment ? 'hover:bg-amber-200/60 text-stone-600' : 'hover:bg-white/10 text-slate-400'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Indicator */}
          {draft.isAlreadyConsecrated && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span className="font-bold">오늘의 프리즘 지혜가 이미 경전에 봉헌되었습니다.</span>
              </div>
              {draft.consecratedVerseId && onOpenVerseInDetail && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVerseInDetail(draft.consecratedVerseId!);
                  }}
                  className="underline hover:text-amber-300 font-semibold text-[11px]"
                >
                  기록된 구절 보기
                </button>
              )}
            </div>
          )}

          {/* Activity Badges Strip */}
          {draft.activityLogs.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                <Layers size={13} />
                <span>오늘 감지된 프리즘 에코시스템 수행 ({draft.activityLogs.length}건)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {draft.activityLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 ${
                      isParchment
                        ? 'bg-amber-100/70 border-amber-900/15 text-stone-800'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{log.icon || '✨'}</span>
                    <span className="font-semibold">{log.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1. Context (상황 / 수행의 기록) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1 text-amber-500">
                <span>1. 수행의 기록 (Context / Fact)</span>
              </label>
              <span className={`text-[10px] ${isParchment ? 'text-stone-500' : 'text-slate-400'}`}>
                {draft.dateDisplay}
              </span>
            </div>
            <textarea
              rows={3}
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              placeholder="오늘 하루 수행한 활동과 상황을 객관적으로 기록합니다..."
              className={`w-full p-3 rounded-2xl text-xs sm:text-sm font-sans outline-none border transition leading-relaxed ${
                isParchment
                  ? 'bg-white border-amber-900/20 text-stone-900 focus:border-amber-700'
                  : 'bg-slate-900/80 border-slate-800 text-slate-100 focus:border-amber-500'
              }`}
            />
          </div>

          {/* 2. Guidance (지혜 / 루시의 성스러운 조언) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                <Sparkles size={13} />
                <span>2. 루시의 성스러운 조언 (Guidance / Wisdom)</span>
              </label>
              <button
                type="button"
                onClick={handleToggleGuidanceAudio}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                  isPlayingGuidance
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isParchment
                    ? 'bg-amber-200/60 text-stone-800 border-amber-900/20 hover:bg-amber-200'
                    : 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {isPlayingGuidance ? <VolumeX size={12} /> : <Volume2 size={12} />}
                <span>{isPlayingGuidance ? '낭독 중지' : '음성 봉독'}</span>
              </button>
            </div>
            <div className={`p-4 rounded-2xl border relative ${
              isParchment
                ? 'bg-amber-100/60 border-amber-800/20'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <textarea
                rows={3}
                value={insight}
                onChange={(e) => setInsight(e.target.value)}
                placeholder="활동에서 추출된 루시의 지혜와 정화 메시지..."
                className={`w-full bg-transparent font-serif italic text-xs sm:text-sm outline-none resize-none leading-relaxed ${
                  isParchment ? 'text-amber-950 font-medium' : 'text-amber-100 font-normal'
                }`}
              />
            </div>
          </div>

          {/* 3. Reflection (나의 깨달음 / 각인 빈칸) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                <Feather size={13} />
                <span>3. 나의 깨달음 각인 (Reflection / User's Inscription)</span>
              </label>
              <span className={`text-[10px] ${isParchment ? 'text-stone-500' : 'text-slate-400'}`}>
                당신의 언어로 덧붙이는 오늘의 성찰
              </span>
            </div>
            <textarea
              rows={2}
              value={userReflection}
              onChange={(e) => setUserReflection(e.target.value)}
              placeholder="루시의 조언 위에 당신만의 생각이나 결심을 한두 문장 얹어보세요..."
              className={`w-full p-3 rounded-2xl text-xs sm:text-sm font-sans outline-none border transition leading-relaxed ${
                isParchment
                  ? 'bg-white border-amber-900/30 text-stone-900 focus:border-amber-700'
                  : 'bg-slate-900/90 border-amber-500/40 text-slate-100 focus:border-amber-400'
              }`}
            />

            {/* Quick reflection prompt pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className={`text-[10px] font-bold ${isParchment ? 'text-stone-500' : 'text-slate-400'}`}>
                추천 문구:
              </span>
              {quickReflections.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUserReflection(q)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition text-left ${
                    isParchment
                      ? 'bg-amber-100/40 border-amber-900/10 text-stone-700 hover:bg-amber-200/60'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-amber-300'
                  }`}
                >
                  "{q.slice(0, 20)}..."
                </button>
              ))}
            </div>
          </div>

          {/* 4. Book & Reference Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-stone-500 mb-1 block">
                봉헌할 서 (Book Title)
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs outline-none border ${
                  isParchment ? 'bg-white border-amber-900/20' : 'bg-slate-900 border-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-500 mb-1 block">
                구절 제목 (Theme Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs outline-none border ${
                  isParchment ? 'bg-white border-amber-900/20' : 'bg-slate-900 border-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold opacity-80 flex items-center gap-1">
              <Tag size={12} className="text-amber-500" />
              <span>태그</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 border ${
                    isParchment 
                      ? 'bg-amber-100/70 text-stone-800 border-amber-900/20' 
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-60 hover:opacity-100 text-xs ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="태그 추가..."
                  className={`px-2 py-0.5 rounded-lg text-[10px] outline-none border ${
                    isParchment ? 'bg-white border-amber-900/20' : 'bg-slate-900 border-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-2.5 ${
          isParchment ? 'border-amber-900/10 bg-amber-100/30' : 'border-slate-800 bg-slate-900/60'
        }`}>
          <button
            type="button"
            onClick={handleConsultLucy}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold border border-amber-500/50 bg-amber-500/15 text-amber-950 hover:bg-amber-500/30 transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="이 여정 전체를 루시에게 전송하여 상담 시작"
          >
            <Sparkles size={14} className="fill-amber-400 text-amber-700 animate-pulse" />
            <span>루시와 상담하기</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition ${
                isParchment ? 'text-stone-600 hover:bg-amber-200/50' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleConsecrate}
              disabled={isSavedSuccess}
              className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-lg hover:brightness-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              {isSavedSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>경전에 각인 완료!</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>인생 경전에 각인하기 (봉헌)</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
