import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, BookOpen, PenTool, Maximize2, Download } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { getTodayDateKey } from '@/lib/dailyCache';
import { ImageOutputActions, downloadImage } from '@/components/ImageOutputActions';
import {
  loadTodayPictureDiaryState,
  generatePictureDiary,
  autoGeneratePictureDiaryIfNeeded,
} from '@/lib/pictureDiary';

interface PictureDiaryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}

export function PictureDiaryModal({ isOpen, onClose, isInline }: PictureDiaryModalProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [diary, setDiary] = useState<{ text: string; imageUrl: string } | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [chats, setChats] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const lastAutoChatCountRef = useRef(0);
  const diaryImageFilename = `orange-picture-diary-${getTodayDateKey()}`;

  const checkTodayDiary = useCallback(async () => {
    setLoading(true);
    setDiary(null);
    setErrorMsg(null);
    setChats([]);
    setCanGenerate(false);

    if (!auth.currentUser) {
      setErrorMsg("로그인이 필요합니다. 로그인 후 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    try {
      const state = await loadTodayPictureDiaryState(auth.currentUser.uid);
      setChats(state.chats);
      setCanGenerate(state.canGenerate);
      if (state.diary) {
        setDiary(state.diary);
      }
      if (!state.canGenerate) {
        lastAutoChatCountRef.current = state.chats.length;
      }
    } catch (err: any) {
      console.error("Diary load error:", err);
      setErrorMsg("일기 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen || isInline) {
      checkTodayDiary();
    }
  }, [isOpen, isInline, checkTodayDiary]);

  const handleGenerate = useCallback(async () => {
    if (!auth.currentUser || chats.length === 0) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const result = await generatePictureDiary(auth.currentUser.uid, chats);
      setDiary(result);
      setCanGenerate(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("일기 생성에 실패했습니다. " + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  }, [chats]);

  useEffect(() => {
    if (!isOpen && !isInline) {
      lastAutoChatCountRef.current = 0;
      setIsImageOpen(false);
    }
  }, [isOpen, isInline]);

  useEffect(() => {
    setIsImageOpen(false);
  }, [diary?.imageUrl]);

  useEffect(() => {
    if (
      loading ||
      !canGenerate ||
      generating ||
      !(isOpen || isInline) ||
      chats.length <= lastAutoChatCountRef.current
    ) {
      return;
    }

    const targetChatCount = chats.length;
    lastAutoChatCountRef.current = targetChatCount;

    void (async () => {
      setGenerating(true);
      setErrorMsg(null);
      try {
        const result = await autoGeneratePictureDiaryIfNeeded(auth.currentUser?.uid);
        if (result) {
          setDiary(result);
          setCanGenerate(false);
        } else if (targetChatCount > 0) {
          await handleGenerate();
        }
      } catch (err: any) {
        console.error(err);
        lastAutoChatCountRef.current = Math.max(0, targetChatCount - 1);
        setErrorMsg("일기 생성에 실패했습니다. " + (err?.message || ''));
      } finally {
        setGenerating(false);
      }
    })();
  }, [loading, canGenerate, generating, isOpen, isInline, chats.length, handleGenerate]);

  useEffect(() => {
    if (!isOpen && !isInline) return;
    const onSaved = () => {
      void checkTodayDiary();
    };
    window.addEventListener('orange-chat-saved', onSaved);
    return () => window.removeEventListener('orange-chat-saved', onSaved);
  }, [isOpen, isInline, checkTodayDiary]);

  if (!isInline && !isOpen) return null;

  const renderContent = () => (
    <div
      className={`bg-white/5 backdrop-blur-3xl border border-white/10 w-full rounded-3xl overflow-hidden flex flex-col relative ${isInline ? 'min-h-[500px]' : 'flex-1 md:min-h-[600px] shadow-[0_0_80px_rgba(0,0,0,0.5)]'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-5 flex justify-between items-center border-b border-orange-500/10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-left">
            <h2 className="text-orange-400 uppercase tracking-[0.3em] text-xs font-bold font-sans animate-pulse">
              Emotion & Picture Diary
            </h2>
            <p className="text-white/40 text-[10px] mt-0.5 font-sans">오늘의 마음과 일상 · 대화마다 자동 갱신</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-orange-400">
            <Sparkles size={32} className="animate-spin-slow opacity-50" />
            <p className="text-xs tracking-widest uppercase">일기를 찾는 중...</p>
          </div>
        ) : generating ? (
          <div className="py-20 flex flex-col items-center justify-center gap-8 text-orange-400">
            <div className="relative">
              <Heart size={48} className="animate-pulse" />
              <PenTool size={24} className="absolute -bottom-2 -right-2 text-orange-300 animate-bounce" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold tracking-widest uppercase">오늘의 감정을 물들입니다...</p>
              <p className="text-xs text-white/40 font-serif">
                오렌지가 오늘의 대화 {chats.length}개를 바탕으로 그림일기를 자동으로 그리고 있어요
              </p>
            </div>
          </div>
        ) : diary ? (
          <div className="flex flex-col gap-6 items-center">
            <div className="w-full relative aspect-square rounded-2xl overflow-hidden border-2 border-orange-500/20 shadow-2xl">
              {diary.imageUrl ? (
                <>
                  <ImageOutputActions
                    src={diary.imageUrl}
                    alt="오늘의 그림일기"
                    filename={diaryImageFilename}
                    isOpen={isImageOpen}
                    onOpenChange={setIsImageOpen}
                  />
                  <img
                    src={diary.imageUrl}
                    alt="오늘의 그림일기"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setIsImageOpen(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full bg-orange-900/20 flex flex-col items-center justify-center text-orange-500/40">
                  <Heart size={48} className="mb-4 opacity-50" />
                  <p className="text-xs tracking-widest">(이미지가 없습니다)</p>
                </div>
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl pointer-events-none"></div>
            </div>

            {diary.imageUrl && (
              <>
                <p className="text-[10px] text-white/40 text-center -mt-2">
                  그림을 탭하거나 버튼으로 크게 보기 · 다운로드
                </p>
                <div className="flex items-center justify-center gap-2 -mt-3">
                  <button
                    type="button"
                    onClick={() => setIsImageOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    크게 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadImage(diary.imageUrl, diaryImageFilename)}
                    className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={12} />
                    다운로드
                  </button>
                </div>
              </>
            )}

            <div className="w-full relative">
              <div className="absolute -left-2 -top-2 text-orange-500/10"><BookOpen size={48} /></div>
              <p className="relative z-10 text-white/80 leading-relaxed font-sans text-sm md:text-base text-center break-keep">
                "{diary.text}"
              </p>
            </div>
          </div>
        ) : canGenerate ? (
          <div className="py-16 flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_30px_rgba(234,88,12,0.2)]">
              <BookOpen size={32} className="animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-white font-bold text-lg">그림일기를 자동으로 준비하고 있어요</h3>
              <p className="text-white/40 text-sm font-sans mx-auto max-w-[280px]">
                오늘 오렌지와의 대화 {chats.length}개를 바탕으로 감정 그림일기가 곧 완성됩니다.
              </p>
            </div>
            {errorMsg && (
              <p className="text-red-400 text-xs text-center">{errorMsg}</p>
            )}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center gap-6 text-center">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-2">
               <Heart size={28} />
             </div>
             <p className="text-white/60 font-medium font-sans max-w-[260px]">
                오늘 오렌지와의 대화 내용이 없어서 그림일기를 만들 수 없어요.<br />
                먼저 채팅으로 이야기를 나누면 자동으로 그려집니다!
             </p>
             {errorMsg && (
               <p className="text-red-400 text-xs text-center mt-2">{errorMsg}</p>
             )}
          </div>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return renderContent();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-xl overflow-y-auto w-full h-full flex flex-col font-sans p-6 md:p-12 scrollbar-none cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-3xl mx-auto flex flex-col flex-1 relative bg-transparent cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}