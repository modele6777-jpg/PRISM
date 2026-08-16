import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  RefreshCw,
  Sparkles,
  Pause,
  Play,
  RotateCcw,
  Palette,
  BookOpen,
  Music,
} from "lucide-react";
import { getTodayDateKey } from "@/lib/dailyCache";
import { playTTS, stopTTS, subscribeTTS } from "@/utils/tts";

type PlayerPhase = "idle" | "preparing" | "speaking" | "paused" | "done" | "error";

export interface MuseDocentArtwork {
  imageUrl: string;
  title: string;
  creator: string;
  artworkType: string;
  era: string;
  description: string;
  whyRecommended: string;
  aestheticTone?: string;
  quote?: string;
  famousPoem?: {
    title: string;
    titleOriginal?: string;
    poet: string;
    poetOriginal?: string;
    excerpt?: string;
    whyRecommended?: string;
  };
  famousSong?: {
    title: string;
    titleOriginal?: string;
    artist: string;
    artistOriginal?: string;
    listeningGuide?: string;
  };
}

interface MuseDocentAudioProps {
  artwork: MuseDocentArtwork;
}

function docentCacheKey(artwork: MuseDocentArtwork): string {
  const poem = artwork.famousPoem?.title || "poem";
  const song = artwork.famousSong?.title || "song";
  return `muse_docent_trio_v4_${getTodayDateKey()}_${artwork.title}_${poem}_${song}`;
}

function docentProgressKey(artwork: MuseDocentArtwork): string {
  return `${docentCacheKey(artwork)}_progress`;
}

function splitDocentScript(text: string): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  const sentences = text.match(/[^.!?。…]+[.!?。…]?/gu)?.map((part) => part.trim()).filter(Boolean);
  return sentences?.length ? sentences : [text.trim()];
}

async function readDocentResponse(response: Response): Promise<{ reply?: string; error?: string }> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(`도슨트 서버가 빈 응답을 반환했습니다. (${response.status})`);
  }

  try {
    return JSON.parse(raw) as { reply?: string; error?: string };
  } catch {
    const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(
      response.ok
        ? `도슨트 응답을 해석하지 못했습니다: ${snippet}`
        : `도슨트 서버 오류 (${response.status}): ${snippet}`,
    );
  }
}

export function MuseDocentAudio({ artwork }: MuseDocentAudioProps) {
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState<PlayerPhase>("idle");
  const [script, setScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTts, setIsLoadingTts] = useState(false);
  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const playbackGenRef = useRef(0);

  const persistScript = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      localStorage.setItem(docentCacheKey(artwork), text);
    },
    [artwork],
  );

  const saveProgress = useCallback(() => {
    localStorage.setItem(docentProgressKey(artwork), String(chunkIndexRef.current));
  }, [artwork]);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(docentProgressKey(artwork));
  }, [artwork]);

  const hasTrioContent = !!(
    artwork.famousPoem?.title
    && artwork.famousSong?.title
  );

  useEffect(() => {
    return subscribeTTS((state) => {
      setIsSpeaking(state.isSpeaking);
      setIsLoadingTts(state.isLoading);
      if (!state.isSpeaking && !state.isLoading && phase === "speaking" && !pausedRef.current) {
        setPhase("done");
      }
    });
  }, [phase]);

  useEffect(() => {
    abortRef.current = false;
    setExpanded(false);
    setPhase("idle");
    setScript("");
    setError(null);
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    playbackGenRef.current += 1;
    stopTTS();
  }, [artwork.imageUrl, artwork.title, artwork.famousPoem?.title, artwork.famousSong?.title]);

  const fetchScript = useCallback(async () => {
    const response = await fetch("/api/muse/docent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: artwork.imageUrl,
        title: artwork.title,
        creator: artwork.creator,
        artworkType: artwork.artworkType,
        era: artwork.era,
        description: artwork.description,
        whyRecommended: artwork.whyRecommended,
        aestheticTone: artwork.aestheticTone,
        quote: artwork.quote,
        famousPoem: artwork.famousPoem,
        famousSong: artwork.famousSong,
        messages: [],
        isFirstMessage: true,
        mode: "audio",
      }),
    });

    const data = await readDocentResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "도슨트 음성 스크립트를 받지 못했습니다.");
    }
    if (!data.reply?.trim()) {
      throw new Error("도슨트 음성 스크립트가 비어 있습니다.");
    }

    return data.reply as string;
  }, [artwork]);

  const speakFromChunk = useCallback(async (startIndex: number) => {
    const chunks = chunksRef.current;
    if (!chunks.length) return;

    const safeStart = Math.max(0, Math.min(startIndex, chunks.length - 1));
    chunkIndexRef.current = safeStart;
    pausedRef.current = false;
    const generation = ++playbackGenRef.current;
    setPhase("speaking");

    for (let i = safeStart; i < chunks.length; i += 1) {
      if (playbackGenRef.current !== generation || pausedRef.current || abortRef.current) {
        return;
      }

      chunkIndexRef.current = i;
      await playTTS(chunks[i], "Charon", true, "차분");

      if (playbackGenRef.current !== generation || pausedRef.current || abortRef.current) {
        return;
      }

      chunkIndexRef.current = i + 1;
    }

    if (playbackGenRef.current === generation && !pausedRef.current && !abortRef.current) {
      chunkIndexRef.current = chunks.length;
      clearProgress();
      setPhase("done");
    }
  }, [clearProgress]);

  const prepareScript = useCallback(
    (narration: string, options?: { resetProgress?: boolean }) => {
      setScript(narration);
      chunksRef.current = splitDocentScript(narration);

      if (options?.resetProgress) {
        chunkIndexRef.current = 0;
        clearProgress();
      } else {
        const saved = Number.parseInt(localStorage.getItem(docentProgressKey(artwork)) || "0", 10);
        chunkIndexRef.current = Number.isFinite(saved)
          ? Math.max(0, Math.min(saved, chunksRef.current.length))
          : 0;
      }

      persistScript(narration);
    },
    [artwork, clearProgress, persistScript],
  );

  const startGuide = useCallback(async () => {
    if (!hasTrioContent) {
      setError("오늘의 명시·명곡 정보가 준비되면 도슨트를 들을 수 있습니다.");
      setPhase("error");
      return;
    }

    abortRef.current = false;
    pausedRef.current = false;
    setExpanded(true);
    setError(null);
    stopTTS();
    playbackGenRef.current += 1;

    const cacheKey = docentCacheKey(artwork);
    const cached = localStorage.getItem(cacheKey);

    if (cached?.trim()) {
      prepareScript(cached);
      if (chunkIndexRef.current >= chunksRef.current.length) {
        setPhase("done");
      } else if (chunkIndexRef.current > 0) {
        setPhase("paused");
      } else {
        setPhase("idle");
      }
      return;
    }

    setPhase("preparing");

    try {
      const narration = await fetchScript();
      if (abortRef.current) return;

      prepareScript(narration, { resetProgress: true });
      await speakFromChunk(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "음성 가이드 오류";
      setError(message);
      setPhase("error");
    }
  }, [artwork, fetchScript, hasTrioContent, prepareScript, speakFromChunk]);

  const handlePauseResume = () => {
    if (isSpeaking || isLoadingTts) {
      pausedRef.current = true;
      playbackGenRef.current += 1;
      stopTTS();
      saveProgress();
      setPhase("paused");
      return;
    }

    if (!chunksRef.current.length) return;

    const resumeIndex = phase === "done" ? 0 : chunkIndexRef.current;
    void speakFromChunk(resumeIndex);
  };

  const handleReplay = () => {
    if (!chunksRef.current.length) return;
    playbackGenRef.current += 1;
    stopTTS();
    chunkIndexRef.current = 0;
    clearProgress();
    void speakFromChunk(0);
  };

  const handleClose = () => {
    pausedRef.current = true;
    playbackGenRef.current += 1;
    stopTTS();
    saveProgress();

    if (script.trim()) {
      persistScript(script);
    }

    setExpanded(false);
    setPhase("idle");
  };

  const isActive = isSpeaking || isLoadingTts || phase === "preparing";

  return (
    <div className="space-y-3">
      {!expanded && (
        <button
          onClick={() => void startGuide()}
          disabled={!hasTrioContent}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600/90 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Volume2 size={15} />
          명화·명시·명곡 음성 도슨트
        </button>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-[24px] border border-blue-500/20 bg-gradient-to-b from-blue-950/40 to-[#060a14]/90 p-5 md:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">오디오 도슨트</p>
                    <p className="text-[10px] text-blue-300/60 truncate">명화 · 명시 · 명곡 음성 안내</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-[10px] text-white/40 hover:text-white/70 uppercase tracking-widest font-bold cursor-pointer"
                >
                  닫기
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/15 px-3 py-2.5 text-center min-w-0">
                  <Palette size={12} className="mx-auto text-blue-300 mb-1" />
                  <p className="text-[9px] font-bold text-blue-200/90 break-words leading-snug">{artwork.title}</p>
                </div>
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/15 px-3 py-2.5 text-center min-w-0">
                  <BookOpen size={12} className="mx-auto text-indigo-300 mb-1" />
                  <p className="text-[9px] font-bold text-indigo-200/90 break-words leading-snug">{artwork.famousPoem?.title}</p>
                </div>
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/15 px-3 py-2.5 text-center min-w-0">
                  <Music size={12} className="mx-auto text-rose-300 mb-1" />
                  <p className="text-[9px] font-bold text-rose-200/90 break-words leading-snug">{artwork.famousSong?.title}</p>
                </div>
              </div>

              <div className="relative flex flex-col items-center py-6">
                <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                  {isActive && (
                    <>
                      <motion.span
                        className="absolute inset-0 rounded-full border border-blue-400/30"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.span
                        className="absolute inset-2 rounded-full border border-indigo-400/25"
                        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                      />
                    </>
                  )}
                  <div
                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive
                        ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 shadow-[0_0_40px_rgba(59,130,246,0.35)]"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    {phase === "preparing" || isLoadingTts ? (
                      <RefreshCw size={28} className="text-blue-300 animate-spin" />
                    ) : isSpeaking ? (
                      <div className="flex items-end gap-1 h-8">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1 rounded-full bg-blue-300"
                            animate={{ height: ["20%", "100%", "30%"] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.12,
                              ease: "easeInOut",
                            }}
                            style={{ height: "40%" }}
                          />
                        ))}
                      </div>
                    ) : (
                      <Volume2 size={28} className="text-blue-300/80" />
                    )}
                  </div>
                </div>

                <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.25em] text-blue-300/70 text-center">
                  {phase === "preparing" && "도슨트 음성 안내 준비 중"}
                  {phase === "speaking" && "음성 안내 재생 중 · 자막 없음"}
                  {phase === "paused" && "일시 정지"}
                  {phase === "done" && "안내 종료"}
                  {phase === "error" && "오류 발생"}
                  {phase === "idle" && expanded && "준비됨"}
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-300 text-center">{error}</p>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={handlePauseResume}
                  disabled={!script && phase !== "preparing"}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-white flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {isSpeaking || isLoadingTts ? <Pause size={12} /> : <Play size={12} />}
                  {isSpeaking || isLoadingTts
                    ? "일시정지"
                    : phase === "paused"
                      ? "이어 듣기"
                      : "재생"}
                </button>
                <button
                  onClick={handleReplay}
                  disabled={!script}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/80 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  다시 듣기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}