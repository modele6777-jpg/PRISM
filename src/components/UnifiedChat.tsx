import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  X, Send, Sparkles, TreeDeciduous, Moon, Activity, Bird, Music, Trash2, ChevronRight, ChevronLeft, HelpCircle, AlertCircle,
  Volume2, VolumeX, Loader2, RotateCw, Sun, Camera, Paperclip, Copy, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp, PersonaType } from "../contexts/AppContext";
import { Streamdown } from "./Streamdown";
import { TTSButton } from "./TTSButton";
import { stopTTS, playConversation, subscribeTTS } from "../utils/tts";

const PERSONA_CONFIG: Record<PersonaType, { 
  name: string; 
  title: string; 
  color: string; 
  hoverColor: string; 
  activeColor: string; 
  bgGlow: string; 
  shadow: string; 
  tag: string; 
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'; 
  icon: any; 
  placeholder: string; 
  prompts: string[] 
}> = {
  lucy: {
    name: "루시 AI (Lucy AI)",
    title: "우주적인 모든 가호가 싱크된 멀티버스 마스터 가이드",
    color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    hoverColor: "hover:text-purple-300 hover:bg-purple-500/10",
    activeColor: "bg-purple-600/20 text-purple-200 border-purple-500/50",
    bgGlow: "from-purple-950/20 to-transparent",
    shadow: "shadow-[0_0_30px_rgba(168,85,247,0.25)] border-purple-500/30",
    tag: "COSMOS CORE",
    voice: "Kore",
    icon: Sun,
    placeholder: "오늘은 어떤 이야기를 나누고 싶으신가요?",
    prompts: [
      "나의 오늘 전반적인 주파수 상태는 어때?",
      "잠시 마음을 안정시킬 수 있는 질문을 해줘",
      "오늘 내가 품어야 할 우주의 메시지는?",
      "이번 주 나의 운명적 기조와 흐름은?",
      "나의 태생적 잠재력과 영적 과제 검토해줘",
      "최근 느끼는 피로감을 우주적 관점으로 해석한다면?",
      "오늘 나의 핵심 싱크로니시티(동시성) 키워드는?",
      "지금 이 순간 나에게 가장 필요한 차크라 조율법은?",
      "영적 성장을 위해 오늘 실천할 수 있는 작은 의식"
    ]
  },
  orange: {
    name: "루시 AI (Lucy AI)",
    title: "루시의 마음치유 채널 (내면아이 보듬기 & 성찰)",
    color: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    hoverColor: "hover:text-orange-300 hover:bg-orange-500/10",
    activeColor: "bg-orange-600/20 text-orange-200 border-orange-500/50",
    bgGlow: "from-orange-950/20 to-transparent",
    shadow: "shadow-[0_0_30px_rgba(249,115,22,0.25)] border-orange-500/30",
    tag: "MIND SANCTUARY",
    voice: "Kore",
    icon: TreeDeciduous,
    placeholder: "가슴 한구석 시린 그늘을 따스하게 보듬어 줄게. 편하게 털어놓아 봐.",
    prompts: [
      "지금 약간 무기력한데 위로의 말을 해줘",
      "내 내면의 소외된 아이를 다독여줄 수 있을까?",
      "오늘 하루를 정밀하고 포근하게 성찰 명상하는 질문",
      "끝없는 불안감이 엄습할 때 마음을 잡는 법",
      "누군가에게 서운했던 감정이 지워지지 않아",
      "스스로를 자책하고 비난하는 마음을 멈추고 싶어",
      "과거의 상처로부터 안전하게 나를 지키는 위로",
      "오늘 나의 가슴을 가장 따뜻하게 채워줄 칭찬 한마디",
      "외로움이 깊어질 때 나 자신과 대화하는 방법"
    ]
  },
  trinity: {
    name: "루시 AI (Lucy AI)",
    title: "루시의 트리니티 오라클 (사주·점성술·타로 데이터 분석)",
    color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    hoverColor: "hover:text-yellow-300 hover:bg-yellow-500/10",
    activeColor: "bg-yellow-600/20 text-yellow-200 border-yellow-500/50",
    bgGlow: "from-yellow-950/20 to-transparent",
    shadow: "shadow-[0_0_30px_rgba(234,179,8,0.25)] border-yellow-500/30",
    tag: "TRINITY FATE",
    voice: "Charon",
    icon: Sparkles,
    placeholder: "우주의 수많은 별길이 교차하고 있어. 해결하고 싶은 운명선이 있니?",
    prompts: [
      "오늘 내 기운의 흐름에 어울리는 우주의 처방 한 줄은?",
      "내 타고난 본질의 기운을 차분하고 건조 명확하게 리딩해줘",
      "사주와 점성술을 엮어서 전해주는 강력 조언",
      "재물운과 일적인 기운의 궤도가 지금 어떤가요?",
      "인간관계에서 갈등을 풀 수 있는 우주적 해법",
      "내 사주에서 가장 강한 기운과 보완해야 할 오행",
      "앞으로 겪을 큰 변화와 이에 대처하는 현명한 자세",
      "이직이나 새로운 도전을 하기에 좋은 시기일까?",
      "나의 현재 수호 행성과 그 행성이 전하는 경고"
    ]
  },
  aura: {
    name: "루시 AI (Lucy AI)",
    title: "루시의 아우라 바디웰니스 (신체 활력 & 차크라 호흡)",
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    hoverColor: "hover:text-emerald-300 hover:bg-emerald-500/10",
    activeColor: "bg-emerald-600/20 text-emerald-200 border-emerald-500/50",
    bgGlow: "from-emerald-950/20 to-transparent",
    shadow: "shadow-[0_0_30px_rgba(16,185,129,0.25)] border-emerald-500/30",
    tag: "AURA WELLNESS",
    voice: "Zephyr",
    icon: Activity,
    placeholder: "네 몸의 주파수 안정과 활력을 정밀하게 건강 가이드할게.",
    prompts: [
      "폰과 노트북을 너무 봐서 가슴과 목이 뻐근한데, 1분 스트레칭 알려줘",
      "불면을 예방할 수 있는 정화 심호흡 루틴은?",
      "나를 가뿐하게 정화하고 활력 기운을 주는 차 처방은?",
      "가슴 차크라(아나하타)가 막힌 것 같은데 열어주는 호흡법",
      "머리가 복잡하고 무거울 때 하는 그라운딩 명상법",
      "피로 예방과 신체 에너지 방어를 위한 솔트 웰니스 처방",
      "아침에 눈떠서 기운을 급속 충전하는 활력 포즈",
      "스트레스로 소화가 안 될 때 손쉽게 자극하는 혈자리",
      "온몸의 독소를 배출해주는 따뜻한 아우라 샤워 명상법"
    ]
  },
  bluebird: {
    name: "루시 AI (Lucy AI)",
    title: "루시의 블루버드 예술정서 (예술 소리치유 & 시적 교감)",
    color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    hoverColor: "hover:text-cyan-300 hover:bg-cyan-500/10",
    activeColor: "bg-cyan-600/20 text-cyan-200 border-cyan-500/50",
    bgGlow: "from-cyan-950/20 to-transparent",
    shadow: "shadow-[0_0_30px_rgba(6,182,212,0.25)] border-cyan-500/30",
    tag: "BLUEBIRD ART",
    voice: "Puck",
    icon: Bird,
    placeholder: "맑고 우아한 문장의 울림과 예술 치유의 바이노럴 주파수를 보낼게.",
    prompts: [
      "지금 마음에 짐이 무인 내게, 마법 같은 시와 음악을 어루만져줘",
      "오늘 내가 즉각 시도할 예술 표현 연습 처방 해줘",
      "호오포노포노 치유 기운을 실천에 담는 생각법",
      "슬픔이 밀려올 때 영혼을 맑게 씻어줄 음악 주파수",
      "한 구절의 시로 내 마음을 보듬고 정화하기",
      "내면의 상실감을 예술적 시각으로 승화시키는 질문",
      "메마른 감성을 투명하고 촉촉하게 채워줄 시 한 구절",
      "오늘 내가 영혼의 색채로 그린다면 어떤 색깔일까?",
      "정서적 찌꺼기를 바람 속에 모두 날려 보내는 상상법"
    ]
  },
  muse: {
    name: "루시 AI (Lucy AI)",
    title: "루시의 뮤즈 창조성 (영감 자극 & 창작 장애물 구출)",
    color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    hoverColor: "hover:text-blue-300 hover:bg-blue-500/10",
    activeColor: "bg-blue-600/20 text-blue-200 border-blue-500/50",
    bgGlow: "from-blue-950/20 to-transparent",
    shadow: "shadow-[0_0_30px_rgba(59,130,246,0.25)] border-blue-500/30",
    tag: "MUSE SPARKS",
    voice: "Kore",
    icon: Music,
    placeholder: "갇혀있던 너의 고유한 영감을 더 넓은 세상으로 데려다줄게.",
    prompts: [
      "창의적인 첫 시작을 두려워하는 나를 위한 예술가 영각 축제",
      "내 내면의 복잡한 감정의 소음을 음악적 모티브로 바꾸는 법",
      "고정관념을 부수는 오늘의 수수께끼 질문",
      "아이디어가 완전히 고갈됐을 때 뇌를 깨우는 처방",
      "나만의 독창적인 서사를 풀어내는 데 필요한 단서",
      "내면의 비판가('검열관')를 잠재우고 자유롭게 창작하기",
      "오늘 나의 시각적 상상력을 자극하는 세 가지 단어",
      "지루한 일상을 초현실적인 이야기로 뒤트는 발상법",
      "새로운 도전을 꿈꾸지만 시작이 두려울 때 얻는 영감"
    ]
  }
};

export function UnifiedChat() {
  const [location] = useLocation();
  const { 
    isChatOpen, setIsChatOpen, 
    activePersona, setActivePersona, 
    personaMessages, isGenerating, 
    sendUnifiedMessage, chatSuggestions, clearPersonaMessages 
  } = useApp();

  const [input, setInput] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    dataUrl?: string;
    textContent?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    const fileName = file.name;

    if (fileType.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          name: fileName,
          type: fileType,
          dataUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          name: fileName,
          type: fileType,
          textContent: reader.result as string
        });
      };
      reader.readAsText(file);
    }

    // Reset input
    e.target.value = "";
  };
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [isReadingAllLoading, setIsReadingAllLoading] = useState(false);
  const [shuffledPrompts, setShuffledPrompts] = useState<string[]>([]);

  // Shuffle logic for persona prompts
  const shufflePromptsForPersona = (persona: PersonaType) => {
    const pool = PERSONA_CONFIG[persona]?.prompts || [];
    if (pool.length === 0) return [];
    return [...pool];
  };

  // Subscribe to global TTS state to determine if conversation mode is active
  useEffect(() => {
    const unsubscribe = subscribeTTS((state) => {
      setIsReadingAll(state.isSpeaking && state.activeText === '__CONVERSATION__');
      setIsReadingAllLoading(state.isLoading && state.activeText === '__CONVERSATION__');
    });
    return unsubscribe;
  }, []);

  // Sync activePersona to current page/route dynamically when first opened, or on location change
  useEffect(() => {
    if (isChatOpen) {
      if (location === "/orange") setActivePersona("orange");
      else if (location === "/trinity") setActivePersona("trinity");
      else if (location === "/heal") setActivePersona("aura");
      else if (location === "/bluebird") setActivePersona("bluebird");
      else if (location === "/muse") setActivePersona("muse");
      else setActivePersona("lucy");
    }
  }, [location, isChatOpen]);

  // Update shuffled prompts whenever persona changes or chat is opened
  useEffect(() => {
    if (isChatOpen) {
      setShuffledPrompts(shufflePromptsForPersona(activePersona));
    }
  }, [activePersona, isChatOpen]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [personaMessages, activePersona, isChatOpen]);

  const currentMessages = personaMessages.lucy || [];
  const currentGenerating = isGenerating.lucy || false;
  const config = PERSONA_CONFIG[activePersona] || PERSONA_CONFIG.lucy;
  const aiSuggestions = chatSuggestions[activePersona] || [];
  const displayPrompts = aiSuggestions.length > 0
    ? Array.from(new Set([...aiSuggestions, ...shuffledPrompts]))
    : shuffledPrompts;
  const ActiveIcon = (activePersona === 'lucy' && location === "/epilogue") ? Moon : config.icon;

  // Horizontal scroll state & controls for PC / Desktop
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);

  const handleCopyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 2000);
    }
  };

  const updateScrollButtons = useCallback(() => {
    const el = suggestionsRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    if (!isChatOpen) return;
    const el = suggestionsRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        e.stopPropagation();
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        el.scrollLeft += delta * 1.5;
        updateScrollButtons();
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    // Multiple raf/timeouts to ensure proper calculation after DOM render/animation
    updateScrollButtons();
    const t1 = setTimeout(updateScrollButtons, 50);
    const t2 = setTimeout(updateScrollButtons, 200);
    const t3 = setTimeout(updateScrollButtons, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      el.removeEventListener('wheel', handleWheelNative);
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [isChatOpen, displayPrompts, updateScrollButtons]);

  const handleScrollLeft = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (suggestionsRef.current) {
      suggestionsRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (suggestionsRef.current) {
      suggestionsRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  // PC Mouse Click & Drag to scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = suggestionsRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = suggestionsRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
    updateScrollButtons();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 50);
  };

  const handleSend = async (textToSend: string) => {
    if ((!textToSend.trim() && !attachedFile) || currentGenerating) return;
    
    let textMsg = textToSend.trim();
    let imgToSend: string | undefined = undefined;

    if (attachedFile) {
      if (attachedFile.dataUrl) {
        imgToSend = attachedFile.dataUrl;
        if (!textMsg) {
          textMsg = "이 이미지 분석하고 해설해줘!";
        }
      } else if (attachedFile.textContent) {
        textMsg = `[첨부 파일: ${attachedFile.name}]\n${attachedFile.textContent}\n\n${textMsg || "이 파일의 내용을 요약하거나 이에 대해 설명해줘."}`;
      }
    }

    setInput("");
    setAttachedFile(null);

    // Build extra context automatically for deep rich spiritual dialogue
    const depthContext = "\n\n[대화 깊이 규칙: 깊은 교감 모드]\n- 너는 사용자와 깊고 따뜻한 교감을 나누기 위해 답변을 매우 정성스럽고 분량 있는 여러 단락(Paragraphs)의 글(최소 10문장 이상)로 풍부하게 풀어 써줘야 해.\n- 단편적이고 짧은 2~3줄짜리 짧은 대답은 전면 지양하며, 너만의 신비롭고 사랑스러운 은유와 비유, 그리고 감수성을 가득 실어 손편지처럼 충만한 답변으로 영적인 공감을 나누어줘.";
    
    await sendUnifiedMessage(textMsg, activePersona, imgToSend, {
      extraSystemContext: depthContext
    });
    // Reshuffle prompts after sending to keep examples always fresh/different!
    setShuffledPrompts(shufflePromptsForPersona(activePersona));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <AnimatePresence>
      {isChatOpen && (
        <div id="unified-chat-portal" className="fixed inset-0 z-[2000] flex items-center justify-end font-sans overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => { setIsChatOpen(false); stopTTS(); }}
          />

          {/* Floating panel (drawer style) */}
          <motion.div 
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 30, stiffness: 220 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-[#07080f]/95 border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col z-[2100] overflow-hidden"
            style={{ height: "100dvh" }}
          >
            {/* Accent top colored line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-purple-500 via-sky-500 to-indigo-500 shrink-0" />

            {/* Persona background glow */}
            <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-b ${config.bgGlow} rounded-full blur-[100px] opacity-60 pointer-events-none transition-all duration-700`} />
            <div className="absolute bottom-20 left-10 w-60 h-60 bg-white/[0.01] rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 px-6 pt-safe-4 pb-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-3.5 text-left">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  activePersona === 'lucy' && location === '/'
                    ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                    : `${config.hoverColor} ${config.activeColor} ${config.shadow}`
                } border`}>
                  <ActiveIcon 
                    size={20} 
                    className={`animate-pulse ${
                      activePersona === 'lucy' && location === '/' 
                        ? "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" 
                        : ""
                    }`}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-wider">LUCY</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentMessages.length > 0 && (
                  <button
                    onClick={() => {
                      if (isReadingAll || isReadingAllLoading) {
                        stopTTS();
                      } else {
                        const talkMessages = currentMessages
                          .filter(m => typeof m.content === "string")
                          .map(m => ({ role: m.role, content: m.content as string }));
                        playConversation(talkMessages, config.voice);
                      }
                    }}
                    className={`p-2 rounded-xl bg-white/5 border border-white/10 transition-all active:scale-95 flex items-center justify-center ${
                      isReadingAll || isReadingAllLoading
                        ? "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                    title={isReadingAll || isReadingAllLoading ? "음성 재생 중지" : "모든 대화 TTS 음성으로 듣기"}
                  >
                    {isReadingAllLoading ? (
                      <Loader2 size={15} className="animate-spin text-blue-400" />
                    ) : isReadingAll ? (
                      <VolumeX size={15} className="text-blue-400" />
                    ) : (
                      <Volume2 size={15} />
                    )}
                  </button>
                )}
                <button 
                  onClick={() => { setIsChatOpen(false); stopTTS(); }}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center tool-button"
                  title="닫기"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 flex flex-col relative z-10 no-scrollbar select-text premium-scroll">
              {currentMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30 my-auto">
                  <ActiveIcon size={44} className="text-white animate-pulse" />
                  <p className="text-xs text-white/60 font-sans leading-relaxed">
                    "{config.name} 차원의 고유 주파수가 무결히 싱크되었습니다. 당신의 심해 속 이야기를 편안히 나누어보세요."
                  </p>
                </div>
              )}

              {currentMessages.map((m, i) => {
                const isUser = m.role === "user";
                if (!isUser && !m.content) return null;
                const align = isUser ? "justify-end" : "justify-start";
                const wrapBorder = isUser 
                  ? "bg-gradient-to-tr from-[#3b82f6]/95 to-[#2563eb]/95 text-white rounded-br-none shadow-[0_8px_25px_-5px_rgba(59,130,246,0.5)] border-transparent" 
                  : "bg-white/[0.03] border border-white/10 text-white/95 rounded-bl-none shadow-md";

                return (
                  <div key={(m as any).id || i} className={`flex ${align} items-end gap-2`}>
                    <div className={`max-w-[85%] rounded-3xl px-5 py-3.5 transition-all duration-300 hover:border-white/20 ${wrapBorder}`}>
                      {isUser ? (
                        Array.isArray(m.content) ? (
                          <div className="space-y-2">
                            {m.content.map((p, idx) => {
                              if (p.type === 'text') {
                                return (
                                  <p key={idx} className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed break-words">
                                    {p.text}
                                  </p>
                                );
                              }
                              if (p.type === 'image_url' && p.image_url?.url) {
                                return (
                                  <img 
                                    key={idx} 
                                    src={p.image_url.url} 
                                    alt="첨부 이미지" 
                                    className="max-w-full rounded-2xl border border-white/10 max-h-48 object-cover mt-1" 
                                    referrerPolicy="no-referrer"
                                  />
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed break-words">{m.content as string}</p>
                        )
                      ) : (
                        <div className="font-sans text-[13.5px] leading-relaxed break-words markdown-body select-text text-left">
                          <Streamdown>{m.content as string}</Streamdown>
                        </div>
                      )}
                    </div>
                    {!isUser && (
                      <div className="flex items-center gap-1 shrink-0 mb-0.5 opacity-70 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(typeof m.content === 'string' ? m.content : '', i)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-all active:scale-90 cursor-pointer"
                          title={copiedIndex === i ? "복사 완료!" : "답변 복사하기"}
                        >
                          {copiedIndex === i ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <TTSButton text={typeof m.content === 'string' ? m.content : ''} voice={config.voice} className="shrink-0" />
                      </div>
                    )}
                  </div>
                );
              })}

              {currentGenerating && (
                <div className="flex justify-start items-center gap-2.5">
                  <div className="bg-white/[0.02] border border-white/5 text-white/40 text-[11px] px-4 py-2.5 rounded-3xl rounded-bl-none flex items-center gap-2">
                    <div className="flex gap-1 items-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px] font-semibold text-white/50 tracking-wider">LUCY가 생각하고 있어...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-2" />
            </div>

            {/* Quick recommendations action prompt buttons */}
            {displayPrompts.length > 0 && !currentGenerating && (
              <div 
                id="unified-chat-suggestions-wrapper"
                className="relative w-full bg-[#08090d]/90 border-t border-white/[0.08] z-10 shrink-0 group select-none"
              >
                {/* Left scroll arrow button for PC */}
                {showLeftArrow && (
                  <button
                    type="button"
                    onClick={handleScrollLeft}
                    aria-label="이전 예시 보기"
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-neutral-900/95 hover:bg-neutral-800 border border-white/20 hover:border-blue-400/60 text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-md active:scale-90"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                {/* Left gradient fade indicator */}
                {showLeftArrow && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#08090d] to-transparent pointer-events-none z-10" />
                )}

                {/* Scrollable Track */}
                <div 
                  ref={suggestionsRef}
                  id="unified-chat-suggestions-bar"
                  onWheel={(e) => {
                    if (e.currentTarget) {
                      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                      e.currentTarget.scrollLeft += delta * 1.5;
                      updateScrollButtons();
                    }
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  className="w-full px-4 py-3 overflow-x-auto scroll-smooth touch-pan-x flex items-center gap-2 cursor-grab active:cursor-grabbing select-none [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_rgba(0,0,0,0.3)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-black/30 [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/40"
                >
                  <div className="flex items-center gap-2 pr-10 pl-1 w-max">
                    {displayPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        id={`chat-prompt-example-${idx}`}
                        type="button"
                        onClick={() => {
                          if (hasMovedRef.current) return;
                          handleSend(p);
                        }}
                        className="px-3.5 py-2 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.18] hover:border-blue-400/70 text-[12px] font-medium text-white/90 hover:text-white transition-all text-left whitespace-nowrap shrink-0 cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5 backdrop-blur-md"
                        title={p}
                      >
                        <Sparkles size={12} className="text-blue-400 shrink-0 opacity-90" />
                        <span>{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right gradient fade indicator */}
                {showRightArrow && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#08090d] to-transparent pointer-events-none z-10" />
                )}

                {/* Right scroll arrow button for PC */}
                {showRightArrow && (
                  <button
                    type="button"
                    onClick={handleScrollRight}
                    aria-label="다음 예시 보기"
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-neutral-900/95 hover:bg-neutral-800 border border-white/20 hover:border-blue-400/60 text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-md active:scale-90"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Bottom input section */}
            <div className="px-4 pt-4 pb-safe-4 border-t border-white/10 shrink-0 bg-[#06070a] z-50 flex flex-col gap-2 relative">
              {attachedFile && (
                <div className="relative self-start mt-1 mb-1 bg-white/[0.03] border border-white/10 p-1.5 rounded-xl flex items-center gap-2 pr-8">
                  {attachedFile.dataUrl ? (
                    <img src={attachedFile.dataUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-white/10 text-xs shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center p-1 shrink-0">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-tight truncate w-full text-center">
                        {attachedFile.name.split('.').pop() || 'FILE'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col text-left max-w-[150px] justify-center overflow-hidden">
                    <span className="text-[10px] font-semibold text-white/80 truncate">{attachedFile.name}</span>
                    <span className="text-[8px] text-white/40 uppercase tracking-wider">
                      {attachedFile.dataUrl ? "이미지 파일" : "문서/텍스트 파일"}
                    </span>
                  </div>
                  <button 
                    onClick={() => setAttachedFile(null)}
                    type="button"
                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full text-white bg-red-500/80 hover:bg-red-500 transition"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              <div className="flex gap-2.5 relative items-center">
                <input 
                  type="file" 
                  accept="*/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={currentGenerating}
                  className="p-3 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white/60 hover:text-white rounded-2xl transition-all disabled:opacity-30"
                  title="파일/사진 첨부"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={config.placeholder}
                  disabled={currentGenerating}
                  className="flex-1 h-12 bg-white/[0.03] border border-white/10 rounded-2xl px-4.5 pr-14 text-white/90 placeholder-white/20 text-[16px] md:text-sm font-medium focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all disabled:opacity-40"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={currentGenerating || (!input.trim() && !attachedFile)}
                  className="absolute right-2.5 p-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 active:scale-95 text-white transition-all disabled:opacity-30 disabled:bg-white/10 disabled:text-white/40 shadow-lg shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
