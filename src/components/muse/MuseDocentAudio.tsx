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
  FileText,
  Subtitles,
} from "lucide-react";
import { getTodayDateKey } from "@/lib/dailyCache";
import { playTTS, stopTTS, pauseTTS, subscribeTTS, prefetchTTS } from "@/utils/tts";

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

function splitDocentScript(text: string): string[] {
  if (!text) return [];
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
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [showFullScript, setShowFullScript] = useState(false);
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

  const hasTrioContent = !!(
    artwork.famousPoem?.title
    && artwork.famousSong?.title
  );

  useEffect(() => {
    return subscribeTTS((state) => {
      setIsSpeaking(state.isSpeaking);
      setIsLoadingTts(state.isLoading);
      if (!state.isSpeaking && !state.isLoading && phase === "speaking" && !pausedRef.current) {
        // Handled inside speakFromChunk loop
      }
    });
  }, [phase]);

  useEffect(() => {
    abortRef.current = false;
    pausedRef.current = false;
    setExpanded(false);
    setPhase("idle");
    setScript("");
    setError(null);
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    setCurrentChunkIndex(0);
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
    setCurrentChunkIndex(safeStart);
    pausedRef.current = false;
    const generation = ++playbackGenRef.current;
    setPhase("speaking");

    for (let i = safeStart; i < chunks.length; i += 1) {
      if (playbackGenRef.current !== generation || pausedRef.current || abortRef.current) {
        return;
      }

      chunkIndexRef.current = i;
      setCurrentChunkIndex(i);

      // ⚡ Pre-fetch next 2 upcoming sections in background while current is speaking
      if (i + 1 < chunks.length) prefetchTTS(chunks[i + 1], "Charon", "차분");
      if (i + 2 < chunks.length) prefetchTTS(chunks[i + 2], "Charon", "차분");

      try {
        await playTTS(chunks[i], "Charon", true, "차분");
      } catch (err) {
        console.warn("[MuseDocentAudio] chunk failed:", err);
      }

      if (playbackGenRef.current !== generation || pausedRef.current || abortRef.current) {
        return;
      }
    }

    if (playbackGenRef.current === generation && !pausedRef.current && !abortRef.current) {
      chunkIndexRef.current = chunks.length - 1;
      setCurrentChunkIndex(chunks.length - 1);
      setPhase("done");
    }
  }, []);

  const prepareScript = useCallback(
    (narration: string) => {
      setScript(narration);
      chunksRef.current = splitDocentScript(narration);
      persistScript(narration);

      // Pre-warm first 2 chunks immediately
      if (chunksRef.current[0]) prefetchTTS(chunksRef.current[0], "Charon", "차분");
      if (chunksRef.current[1]) prefetchTTS(chunksRef.current[1], "Charon", "차분");
    },
    [persistScript],
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
      setPhase("speaking");
      void speakFromChunk(0);
      return;
    }

    setPhase("preparing");

    try {
      const narration = await fetchScript();
      if (abortRef.current) return;

      prepareScript(narration);
      void speakFromChunk(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "음성 가이드 오류";
      setError(message);
      setPhase("error");
    }
  }, [artwork, fetchScript, hasTrioContent, prepareScript, speakFromChunk]);

  const handlePauseResume = () => {
    if (phase === "speaking" || isSpeaking || isLoadingTts) {
      pausedRef.current = true;
      playbackGenRef.current += 1;
      pauseTTS();
      stopTTS();
      setPhase("paused");
      return;
    }

    if (phase === "paused" || phase === "idle" || phase === "done") {
      pausedRef.current = false;
      const resumeIndex = phase === "done" ? 0 : chunkIndexRef.current;
      void speakFromChunk(resumeIndex);
    }
  };

  const handleReplay = () => {
    if (!chunksRef.current.length) return;
    pausedRef.current = false;
    playbackGenRef.current += 1;
    stopTTS();
    chunkIndexRef.current = 0;
    setCurrentChunkIndex(0);
    void speakFromChunk(0);
  };

  const handleJumpToSection = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= chunksRef.current.length) return;
    pausedRef.current = false;
    playbackGenRef.current += 1;
    stopTTS();
    chunkIndexRef.current = targetIndex;
    setCurrentChunkIndex(targetIndex);
    void speakFromChunk(targetIndex);
  };

  const handleClose = () => {
    pausedRef.current = true;
    playbackGenRef.current += 1;
    stopTTS();

    if (script.trim()) {
      persistScript(script);
    }

    setExpanded(false);
    setPhase("idle");
  };

  const isActive = isSpeaking || isLoadingTts || phase === "preparing" || phase === "speaking";

  return (
    <div className="space-y-3">
      {!expanded && (
        <button
          onClick={() => void startGuide()}
          disabled={!hasTrioContent}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600/90 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Volume2 size={15} />
          명화·명시·명곡 음성 도슨트 (실시간 자막 & 일시정지 지원)
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
                    <p className="text-xs font-bold text-white">오디오 도슨트 & 실시간 자막</p>
                    <p className="text-[10px] text-blue-300/60 truncate">국립박물관 수석 큐레이터 해설</p>
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

              {/* Sound Wave Animation Visualizer */}
              <div className="relative flex flex-col items-center py-4">
                <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
                  {phase === "speaking" && (
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
                    className={`relative w-18 h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                      phase === "speaking"
                        ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 shadow-[0_0_40px_rgba(59,130,246,0.35)]"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    {phase === "preparing" || isLoadingTts ? (
                      <RefreshCw size={24} className="text-blue-300 animate-spin" />
                    ) : phase === "speaking" ? (
                      <div className="flex items-end gap-1 h-7">
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
                      <Volume2 size={24} className="text-blue-300/80" />
                    )}
                  </div>
                </div>

                <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.25em] text-blue-300/70 text-center">
                  {phase === "preparing" && "도슨트 음성 안내 준비 중..."}
                  {phase === "speaking" && "🎙️ 실시간 도슨트 해설 낭독 중"}
                  {phase === "paused" && "일시 정지됨"}
                  {phase === "done" && "안내 완료"}
                  {phase === "error" && "오류 발생"}
                  {phase === "idle" && expanded && "도슨트 준비 완료"}
                </p>
              </div>

              {/* 💬 Live Subtitle & Script Reader Box */}
              {script && (
                <div className="w-full rounded-2xl bg-black/70 border border-blue-400/25 p-4 sm:p-5 space-y-3 backdrop-blur-xl transition-all shadow-xl">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        {phase === "speaking" ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                          </>
                        ) : (
                          <span className="inline-flex rounded-full h-2 w-2 bg-white/30" />
                        )}
                      </span>
                      <span className="text-[11px] font-black text-blue-300 font-sans tracking-wider flex items-center gap-1.5">
                        <Subtitles size={13} className="text-blue-400" />
                        {showFullScript ? "전체 해설 대본" : "실시간 자막"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullScript(!showFullScript)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-400/30 transition-all font-sans font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showFullScript ? <Subtitles size={11} /> : <FileText size={11} />}
                      <span>{showFullScript ? "실시간 자막 모드" : "전체 대본 보기"}</span>
                    </button>
                  </div>

                  {showFullScript ? (
                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-2 scrollbar-thin scrollbar-thumb-blue-500/30 text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
                      {chunksRef.current.map((chunk, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleJumpToSection(idx)}
                          className={`p-3 rounded-xl transition-all cursor-pointer border ${
                            idx === currentChunkIndex
                              ? "bg-blue-500/25 border-blue-400/50 text-white font-bold shadow-lg shadow-blue-950/40"
                              : "bg-white/[0.02] border-white/5 hover:bg-white/10 text-white/70"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9px] font-mono text-blue-300/60 mb-1">
                            <span>SECTION {idx + 1}</span>
                            {idx === currentChunkIndex && phase === "speaking" && (
                              <span className="text-blue-300 animate-pulse font-bold flex items-center gap-1">
                                ● 낭독 중
                              </span>
                            )}
                          </div>
                          <p>{chunk}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2.5 px-2 text-center min-h-[75px] flex flex-col items-center justify-center space-y-1">
                      <motion.p
                        key={currentChunkIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="text-sm sm:text-base font-semibold text-white leading-relaxed tracking-wide font-sans break-keep select-text"
                      >
                        "{chunksRef.current[currentChunkIndex] || script.slice(0, 150) + "..."}"
                      </motion.p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 font-mono border-t border-white/5">
                    <span>
                      {chunksRef.current.length > 0
                        ? `${currentChunkIndex + 1} / ${chunksRef.current.length} 문단`
                        : "해설 준비 완료"}
                    </span>
                    <span>문단을 탭하여 즉시 해당 위치부터 청취</span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-300 text-center">{error}</p>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={handlePauseResume}
                  disabled={!script && phase !== "preparing"}
                  className="px-4 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-500/90 border border-blue-400/30 text-[11px] font-bold text-white flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md"
                >
                  {phase === "speaking" ? <Pause size={13} /> : <Play size={13} />}
                  {phase === "speaking"
                    ? "일시정지"
                    : phase === "paused"
                      ? "이어 듣기"
                      : "재생"}
                </button>
                <button
                  onClick={handleReplay}
                  disabled={!script}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-bold text-white/80 flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  처음부터
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
