import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Volume2, Sparkles, Copy, Check, VolumeX, Loader2,
  Mic, MicOff, Camera, Search, Download, Trash2,
  User, X, Brain, Compass, Heart, Feather, Activity
} from 'lucide-react';
import { useApp, PersonaType } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { playTTS, stopTTS, useTTSActive, playConversation, subscribeTTS } from '@/utils/tts';
import { calculateDetailedSaju } from '@/lib/sajuAnalysis';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 🌟 PRO Engine Mode Definitions
export type ProMode = 'master' | 'deepthink' | 'oracle' | 'healing' | 'vitality' | 'creative';

interface ProModeConfig {
  id: ProMode;
  name: string;
  shortName: string;
  tagline: string;
  icon: any;
  persona: PersonaType;
  badgeColor: string;
  glowColor: string;
  systemHint?: string;
  prompts: string[];
}

const PRO_MODES: Record<ProMode, ProModeConfig> = {
  master: {
    id: 'master',
    name: '올인원 PRO 마스터',
    shortName: 'PRO 마스터',
    tagline: '사주·타로·힐링·창의성이 통합된 최고 지능',
    icon: Sparkles,
    persona: 'lucy',
    badgeColor: 'bg-amber-500 text-white',
    glowColor: 'border-amber-400/50 bg-amber-50 text-amber-950',
    prompts: [
      '나의 오늘 전반적인 우주적 주파수와 운의 흐름은 어때?',
      '지금 상황에서 내가 가장 먼저 집중해야 할 핵심 우선순위는?',
      '오늘 하루 나를 든든하게 지켜줄 소울 메이트의 조언을 들려줘.',
      '최근 느끼는 복잡한 생각들을 명쾌하게 정리해 줘.'
    ]
  },
  deepthink: {
    id: 'deepthink',
    name: '초심층 사유 (Deep Think)',
    shortName: '딥 리즈닝',
    tagline: '다각도 논리와 본질을 꿰뚫는 전략적 심층 분석',
    icon: Brain,
    persona: 'lucy',
    badgeColor: 'bg-indigo-600 text-white',
    glowColor: 'border-indigo-400/50 bg-indigo-50 text-indigo-950',
    systemHint: '[초심층 사유 모드] 본질을 꿰뚫는 다각도 논리적 분석과 심층적 해결 방안을 체계적으로 도출해 줘.',
    prompts: [
      '내가 직면한 복잡한 문제를 1원칙 사고로 분해해서 분석해 줘.',
      '중요한 결정을 앞두고 고려해야 할 숨겨진 변수들과 리스크는?',
      '장기적인 성장을 위한 나만의 고유한 전략적 로드맵을 설계해 줘.',
      '직관과 논리가 충돌할 때 최선의 선택을 내리는 사고 프레임워크는?'
    ]
  },
  oracle: {
    id: 'oracle',
    name: '사주 & 오라클 (Oracle)',
    shortName: '사주·오라클',
    tagline: '태어난 천문 사주원국과 타로 주파수 통찰',
    icon: Compass,
    persona: 'trinity',
    badgeColor: 'bg-purple-600 text-white',
    glowColor: 'border-purple-400/50 bg-purple-50 text-purple-950',
    prompts: [
      '나의 사주 본원과 올해 병오년의 에너지적 조화는 어때?',
      '현재 나의 운의 계절에서 지금은 씨앗을 뿌릴 때일까, 수확할 때일까?',
      '나의 천을귀인 기운을 활성화할 수 있는 실천 팁을 알려줘.',
      '오늘 나의 소울 주파수를 상승시키는 타로적 메시지를 들려줘.'
    ]
  },
  healing: {
    id: 'healing',
    name: '소울 힐링 (Soul Care)',
    shortName: '소울 힐링',
    tagline: '내면아이 보듬기 & 가슴을 어루만지는 따뜻한 위로',
    icon: Heart,
    persona: 'orange',
    badgeColor: 'bg-rose-500 text-white',
    glowColor: 'border-rose-400/50 bg-rose-50 text-rose-950',
    prompts: [
      '루시야, 오늘 마음이 조금 지치고 버거운데 따뜻하게 안아줘.',
      '남들과 비교하며 작아지는 내 마음을 편안하게 달래줘.',
      '불안과 걱정이 올라올 때 내 마음을 지켜주는 세도나 4문답 해줘.',
      '오늘 하루 수고한 나 자신에게 건네는 포근한 손편지 써줘.'
    ]
  },
  vitality: {
    id: 'vitality',
    name: '웰니스 & 활력 (Vitality)',
    shortName: '웰니스·활력',
    tagline: '신체 컨디션, 호흡법, 활력 루틴 & 주파수 조율',
    icon: Activity,
    persona: 'aura',
    badgeColor: 'bg-emerald-600 text-white',
    glowColor: 'border-emerald-400/50 bg-emerald-50 text-emerald-950',
    prompts: [
      '지금 바로 몸의 긴장을 풀고 피로를 날리는 3분 호흡법 알려줘.',
      '오늘 나의 신체 에너지와 바이오리듬을 끌어올리는 루틴 추천해줘.',
      '숙면을 취하고 아침을 상쾌하게 깨우는 나이트 케어 가이드줘.',
      '무기력할 때 뇌를 깨우는 간단한 스트레칭과 수분 루틴은?'
    ]
  },
  creative: {
    id: 'creative',
    name: '뮤즈 크리에이티브 (Creative)',
    shortName: '뮤즈 창작',
    tagline: '신선한 영감, 카피라이팅, 예술적 감성 & 창작 아이디어',
    icon: Feather,
    persona: 'muse',
    badgeColor: 'bg-sky-600 text-white',
    glowColor: 'border-sky-400/50 bg-sky-50 text-sky-950',
    prompts: [
      '새로운 아이디어가 필요한데, 생각을 뒤흔드는 신선한 질문을 던져줘!',
      '지금 내 감정을 은유적으로 담아낸 아름다운 시 한 편 지어줘.',
      '사람들의 마음을 사로잡는 감각적인 문장과 스토리텔링 아이디어 줘.',
      '창작의 벽에 부딪혔을 때 영감의 물꼬를 트는 방법은?'
    ]
  }
};

export default function LucyStandalonePage() {
  const [, navigate] = useLocation();
  const { 
    firebaseUser, 
    signInWithGoogle, 
    sendUnifiedMessage, 
    personaMessages, 
    isGenerating,
    sharedState,
    clearPersonaMessages
  } = useApp();

  const [activeMode, setActiveMode] = useState<ProMode>('master');
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ttsInfo, setTtsInfo] = useState({ isSpeaking: false, isLoading: false, activeText: null as string | null });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isTTSActive = useTTSActive();

  // Determine User Nickname ('쭈' prioritized)
  const rawNickname = sharedState?.userProfile?.basic?.nickname?.trim();
  const rawDisplayName = firebaseUser?.displayName?.trim();
  const userDisplayName = (rawNickname && rawNickname !== '여행자' && rawNickname !== '사용자')
    ? rawNickname
    : (rawDisplayName === '박주형' ? '쭈' : (rawDisplayName || '쭈'));

  // Detailed Saju Info for Soul Profile View
  const sajuInfo = useMemo(() => calculateDetailedSaju(sharedState?.userProfile), [sharedState?.userProfile]);

  const lucyMessages = personaMessages?.lucy || [];
  const isLucyGenerating = isGenerating?.lucy || false;

  // Filter messages by search query if search is active
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return lucyMessages;
    const q = searchQuery.toLowerCase();
    return lucyMessages.filter(m => {
      const txt = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return txt.toLowerCase().includes(q);
    });
  }, [lucyMessages, searchQuery]);

  // Subscribe to TTS state changes
  useEffect(() => {
    return subscribeTTS((state) => {
      setTtsInfo({ isSpeaking: state.isSpeaking, isLoading: state.isLoading, activeText: state.activeText });
    });
  }, []);

  const isReadingAll = ttsInfo.isSpeaking && ttsInfo.activeText === '__CONVERSATION__';
  const isReadingAllLoading = ttsInfo.isLoading && ttsInfo.activeText === '__CONVERSATION__';

  // 📲 Dynamic PWA Manifest & iOS Home-screen Metadata Switcher
  useEffect(() => {
    const prevTitle = document.title;
    document.title = '루시 AI 프로 - LUCY AI PRO';

    let manifestTag = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifestHref = manifestTag ? manifestTag.getAttribute('href') : null;
    if (manifestTag) {
      manifestTag.setAttribute('href', '/manifest-lucy.webmanifest');
    }

    const appleTouchIcons = document.querySelectorAll('link[rel^="apple-touch-icon"]') as NodeListOf<HTMLLinkElement>;
    const prevAppleIconHrefs: string[] = [];
    appleTouchIcons.forEach((iconTag) => {
      prevAppleIconHrefs.push(iconTag.href);
      iconTag.href = '/apple-touch-icon-lucy.png';
    });

    const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]') as NodeListOf<HTMLLinkElement>;
    const prevFaviconHrefs: string[] = [];
    favicons.forEach((favTag) => {
      prevFaviconHrefs.push(favTag.href);
      favTag.href = '/lucy-icon-192.png';
    });

    let appleTitleTag = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    const prevAppleTitle = appleTitleTag ? appleTitleTag.getAttribute('content') : null;
    if (appleTitleTag) {
      appleTitleTag.setAttribute('content', '루시 AI 프로');
    }

    let themeColorTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const prevThemeColor = themeColorTag ? themeColorTag.getAttribute('content') : null;
    if (themeColorTag) {
      themeColorTag.setAttribute('content', '#FAFAF9');
    }

    return () => {
      document.title = prevTitle;
      if (manifestTag && prevManifestHref) manifestTag.setAttribute('href', prevManifestHref);
      appleTouchIcons.forEach((iconTag, idx) => {
        if (prevAppleIconHrefs[idx]) iconTag.href = prevAppleIconHrefs[idx];
      });
      favicons.forEach((favTag, idx) => {
        if (prevFaviconHrefs[idx]) favTag.href = prevFaviconHrefs[idx];
      });
      if (appleTitleTag && prevAppleTitle) appleTitleTag.setAttribute('content', prevAppleTitle);
      if (themeColorTag && prevThemeColor) themeColorTag.setAttribute('content', prevThemeColor);
    };
  }, []);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [lucyMessages, isLucyGenerating]);

  // Handle Speech-to-Text (STT) Mic input
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('현재 브라우저에서 마이크 음성 인식이 지원되지 않습니다. Chrome이나 Safari 최신 버전을 권장합니다.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[STT] Speech recognition error:', e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('[STT] Failed to initialize recognition:', e);
      setIsRecording(false);
    }
  };

  // Handle image attachment
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('이미지 크기는 최대 8MB까지 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setAttachedImage(loadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send message with selected mode context & image
  const handleSend = async (textToSend?: string) => {
    const rawMsg = textToSend || input;
    if ((!rawMsg.trim() && !attachedImage) || isLucyGenerating) return;

    const currentModeConfig = PRO_MODES[activeMode];
    let finalPrompt = rawMsg.trim();

    setInput('');
    const imgToSend = attachedImage || undefined;
    setAttachedImage(null);
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    await sendUnifiedMessage(finalPrompt, currentModeConfig.persona, imgToSend);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleVoicePlay = (id: string, text: string, voice: string = 'Aoede') => {
    if (playingMsgId === id && isTTSActive) {
      stopTTS();
      setPlayingMsgId(null);
    } else {
      stopTTS();
      setPlayingMsgId(id);
      playTTS(text, voice);
    }
  };

  const handlePlayAll = () => {
    if (isReadingAll || isReadingAllLoading) {
      stopTTS();
    } else {
      const talkMessages = lucyMessages
        .filter(m => typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content as string }));
      if (talkMessages.length > 0) {
        // 루시 AI(타자) = 'Aoede' (맑고 감미로운 여성 음성), 사용자 쭈(화자) = 'Puck' (차분하고 또렷한 남성 음성)
        playConversation(talkMessages, 'Aoede', 'Puck');
      }
    }
  };

  // Export full conversation as Markdown
  const handleExportChat = () => {
    if (lucyMessages.length === 0) {
      alert('내보낼 대화 내역이 없습니다.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('ko-KR');
    let md = '# 🌟 LUCY AI PRO 대화 기록\n- **대화 일시**: ' + todayStr + '\n- **사용자**: ' + userDisplayName + '\n\n---\n\n';

    lucyMessages.forEach((msg) => {
      const speaker = msg.role === 'user' ? userDisplayName : '루시 AI 프로';
      const timeStr = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const txt = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      md += '### [' + speaker + '] (' + timeStr + ')\n' + txt + '\n\n---\n\n';
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '루시AI프로_대화기록_' + new Date().toISOString().slice(0, 10) + '.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmClear = () => {
    clearPersonaMessages();
    setIsClearModalOpen(false);
    stopTTS();
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-[#FAFAF9] text-slate-800 font-sans flex flex-col overflow-hidden select-text">
      {/* 🌟 PRO Top Header Bar */}
      <header 
        style={{ paddingTop: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))' }}
        className="w-full px-3.5 sm:px-8 lg:px-12 pb-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs flex flex-col gap-2.5 z-40 shrink-0 relative"
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="relative group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-white shadow-sm font-bold text-base sm:text-lg shrink-0 ring-2 ring-amber-400/30 group-hover:scale-105 transition-transform">
                🌟
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300 animate-pulse" title="루시 AI 프로 엔진 실시간 온라인" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  LUCY AI PRO
                </h1>
                <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-mono shadow-xs shrink-0 tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {PRO_MODES[activeMode].tagline}
              </p>
            </div>
          </div>

          {/* Right Action Tools: Search, Play All TTS, Export, Reset, Soul Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 🔍 Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSearchOpen ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="대화 내역 검색"
            >
              <Search size={15} />
            </button>

            {/* 🎙️ Play All Conversation TTS */}
            {lucyMessages.length > 0 && (
              <button
                onClick={handlePlayAll}
                disabled={isReadingAllLoading}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                  isReadingAll
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400/30 animate-pulse'
                    : 'bg-gradient-to-r from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/70 text-amber-950 border border-amber-200/80 hover:border-amber-300'
                }`}
                title={isReadingAll ? '전체 대화 음성 읽기 중지' : '루시(여성)와 쭈(남성) 목소리를 구분하여 대화 전체 연속 듣기'}
              >
                {isReadingAllLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-amber-600" />
                    <span className="hidden xs:inline">준비 중</span>
                  </>
                ) : isReadingAll ? (
                  <>
                    <VolumeX size={14} className="text-amber-700" />
                    <span className="truncate max-w-[80px] sm:max-w-none">중지</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={14} className="text-amber-700" />
                    <span className="truncate max-w-[80px] sm:max-w-none">전체 듣기</span>
                  </>
                )}
              </button>
            )}

            {/* 📥 Export Chat */}
            {lucyMessages.length > 0 && (
              <button
                onClick={handleExportChat}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer hidden xs:flex items-center justify-center"
                title="대화 내역 Markdown으로 내보내기"
              >
                <Download size={15} />
              </button>
            )}

            {/* 🗑️ Clear / New Chat */}
            {lucyMessages.length > 0 && (
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
                title="새로운 대화 세션 시작 (대화 비우기)"
              >
                <Trash2 size={15} />
              </button>
            )}

            {/* 👤 쭈 님의 소울 프로필 퀵버튼 */}
            {firebaseUser ? (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-[11px] sm:text-xs font-bold text-emerald-800 shadow-xs transition-all cursor-pointer active:scale-95"
                title="쭈 님의 소울 프로필 & 사주 오라클 카드 보기"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate max-w-[65px] sm:max-w-[120px]">{userDisplayName}</span>
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 🔍 Search Input Dropdown */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-300/80 rounded-xl px-3 py-1.5 focus-within:border-amber-400 focus-within:bg-white transition-all">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="대화 내용 검색 (키워드 입력)..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    {filteredMessages.length}개 발견
                  </span>
                )}
                <button 
                  onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎛️ PRO Engine Mode Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 -mb-1">
          {(Object.keys(PRO_MODES) as ProMode[]).map((modeKey) => {
            const config = PRO_MODES[modeKey];
            const Icon = config.icon;
            const isSelected = activeMode === modeKey;

            return (
              <button
                key={modeKey}
                onClick={() => setActiveMode(modeKey)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                  isSelected
                    ? `${config.glowColor} border ring-1 ring-amber-400/40 shadow-sm font-black`
                    : 'bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 text-slate-600'
                }`}
              >
                <Icon size={13} className={isSelected ? 'text-amber-600' : 'text-slate-500'} />
                <span>{config.shortName}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 💬 Chat Messages Stream */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto select-text">
        {filteredMessages.length === 0 && (
          <div className="text-center py-12 sm:py-20 px-4 space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-200 to-amber-100 text-amber-600 flex items-center justify-center text-4xl mx-auto shadow-sm ring-4 ring-amber-100">
              🌟
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                안녕하세요, {userDisplayName} 님! 루시 AI 프로예요.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                현재 <span className="font-bold text-amber-700">{PRO_MODES[activeMode].name}</span> 모드로 활성화되어 있습니다.<br/>
                사주, 운명 오라클, 딥 리즈닝, 마음치유, 웰니스, 창작 아이디어까지 원하는 모든 대화를 시작해 보세요. ✨
              </p>
            </div>
          </div>
        )}

        {filteredMessages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const msgId = String(msg.id || index);
          const rawContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
          const hasImage = Array.isArray(msg.content) && msg.content.some((item: any) => item.type === 'image_url');
          const imageUrl = hasImage ? (msg.content as any[]).find((item: any) => item.type === 'image_url')?.image_url?.url : null;
          const textContent = Array.isArray(msg.content) ? (msg.content as any[]).find((item: any) => item.type === 'text')?.text || '' : rawContent;

          return (
            <motion.div
              key={msgId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Speaker Label & Timestamp */}
              <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px]">
                {!isUser ? (
                  <span className="font-bold text-amber-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    루시 AI 프로
                  </span>
                ) : (
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <User size={12} className="text-slate-400" />
                    {userDisplayName}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">{timeStr}</span>
              </div>

              <div className="relative group max-w-[92%] sm:max-w-[85%] lg:max-w-[80%]">
                {/* Attached Image Preview in User Message */}
                {imageUrl && (
                  <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 shadow-sm max-w-xs">
                    <img src={imageUrl} alt="첨부 이미지" className="w-full h-auto object-cover max-h-64" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-sm sm:text-[15px] lg:text-base leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs font-sans'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-sm font-sans'
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{textContent}</div>
                  ) : (
                    <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed [&_h1]:text-slate-900 [&_h1]:font-bold [&_h1]:text-lg [&_h2]:text-slate-900 [&_h2]:font-bold [&_h2]:text-base [&_h3]:text-slate-900 [&_h3]:font-semibold [&_h3]:text-sm [&_strong]:text-amber-900 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-amber-50 [&_code]:text-amber-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3.5 [&_pre]:rounded-xl">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {textContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Action buttons: Copy & TTS with distinct voice */}
                <div className={`flex items-center gap-1.5 mt-1.5 ${isUser ? 'justify-end pr-1' : 'pl-1'}`}>
                  <button
                    onClick={() => handleCopy(msgId, textContent)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="복사"
                  >
                    {copiedId === msgId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => handleVoicePlay(msgId, textContent, isUser ? 'Puck' : 'Aoede')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      playingMsgId === msgId && isTTSActive
                        ? 'text-amber-600 bg-amber-50 animate-pulse'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                    }`}
                    title={playingMsgId === msgId && isTTSActive ? "음성 멈추기" : `${isUser ? '나(남성)의' : '루시(여성)의'} 음성으로 듣기`}
                  >
                    {playingMsgId === msgId && isTTSActive ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {isLucyGenerating && (
          <div className="flex items-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce delay-100" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce delay-200" />
            <span className="text-xs sm:text-sm text-amber-900 font-bold ml-1">
              루시 AI 프로가 답변을 작성하고 있습니다...
            </span>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* 💡 Dynamic Context Suggestion Chips (Changes with Active Pro Mode) */}
      <div className="w-full bg-white/80 backdrop-blur-xs border-t border-slate-200/70 shrink-0">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-3.5 sm:px-8 lg:px-12 py-2 overflow-x-auto no-scrollbar flex items-center gap-2">
          {PRO_MODES[activeMode].prompts.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(promptText)}
              disabled={isLucyGenerating}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-xs font-medium text-slate-700 hover:text-amber-950 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* ✍️ Bottom Input Bar: Image Preview + STT Mic + Multi-Modal Vision + Send */}
      <footer 
        style={{ paddingBottom: 'max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))' }}
        className="w-full px-3 sm:px-5 pt-3 bg-white border-t border-slate-200 shadow-sm shrink-0"
      >
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col gap-2">
          {/* Image Attachment Preview */}
          {attachedImage && (
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl w-fit border border-slate-200">
              <img src={attachedImage} alt="첨부 미리보기" className="w-12 h-12 object-cover rounded-lg" />
              <div className="text-xs text-slate-600 font-medium pr-2">이미지 비전 분석 준비됨</div>
              <button 
                onClick={() => setAttachedImage(null)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className={`flex items-center gap-2 sm:gap-3 bg-slate-50 border rounded-2xl px-3 sm:px-4 py-2 transition-all shadow-inner ${
            isRecording 
              ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-200' 
              : 'border-slate-200 focus-within:border-amber-400 focus-within:bg-white'
          }`}>
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {/* 📷 Image / Camera Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
              title="사진/이미지 첨부 (멀티모달 비전 분석)"
            >
              <Camera size={18} />
            </button>

            {/* 🎙️ STT Mic Voice Input Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isRecording 
                  ? 'bg-rose-500 text-white animate-pulse shadow-sm' 
                  : 'text-slate-400 hover:text-amber-700 hover:bg-slate-200/70'
              }`}
              title={isRecording ? '음성 녹음 중지' : '마이크로 음성 말하기 (Speech to Text)'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isRecording 
                  ? '마이크로 말씀하시는 중입니다...' 
                  : `${PRO_MODES[activeMode].shortName}에게 무엇이든 질문해 보세요... (Enter 전송)`
              }
              rows={1}
              className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-sm sm:text-base resize-none outline-none leading-relaxed min-h-[40px] max-h-[120px]"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachedImage) || isLucyGenerating}
              className="p-2.5 sm:p-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-30 text-slate-950 font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
              title="메시지 전송"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </footer>

      {/* 📊 쭈 님의 소울 프로필 퀵뷰 모달 */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative space-y-4"
            >
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                  🌟
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{userDisplayName} 님의 소울 프로필</h3>
                  <p className="text-xs text-slate-500">Google 계정 연동 및 사주·에너지 요약</p>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-slate-500 font-medium">소울 닉네임</span>
                  <span className="font-bold text-amber-900">{userDisplayName}</span>
                </div>
                <div className="flex justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-slate-500 font-medium">연동 이메일</span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]">{firebaseUser?.email || '미연동'}</span>
                </div>
                <div className="flex justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-slate-500 font-medium">사주 본원 (일주)</span>
                  <span className="font-bold text-amber-900">{sajuInfo ? sajuInfo.shortDigest : '기본 분석 진행 중'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">상담 선호 스타일</span>
                  <span className="font-bold text-emerald-800">{sharedState?.userProfile?.psych?.counselingStyle || '따뜻하고 직관적인 공감'}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🗑️ 새 대화 시작 (초기화) 확인 모달 */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">새로운 대화를 시작할까요?</h3>
                <p className="text-xs text-slate-500">현재 대화 내역이 비워지고 루시와 새로운 세션이 열립니다.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmClear}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  새 대화 시작
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
