import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, Volume2, Sparkles,
  Copy, Check, ArrowLeft,
  VolumeX
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { playTTS, stopTTS, useTTSActive } from '@/utils/tts';

const LUCY_SUGGESTION_CHIPS = [
  { label: '🌿 마음 힐링과 깊은 위로', prompt: '루시야, 오늘 하루 조금 지쳤는데 따뜻한 위로와 응원 한마디 해줘.' },
  { label: '✨ 사주와 오늘의 운명 통찰', prompt: '오늘 나의 운명적 흐름과 마음에 새기면 좋은 우주적 지혜를 들려줘.' },
  { label: '⚡ 기운 충전과 활력 루틴', prompt: '지금 바로 활력을 되찾을 수 있는 간단한 호흡법이나 스트레칭 추천해줘.' },
  { label: '🐦 시적 감성과 마음 처방', prompt: '지금 내 마음에 평화를 선물해 줄 아름다운 시 한 구절과 예술적 처방을 들려줘.' },
  { label: '🎨 창의적 영감과 아이디어', prompt: '새로운 영감이 필요한데, 생각을 전환할 수 있는 신선한 아이디어나 재미있는 질문 던져줘!' },
  { label: '💬 편안한 일상 수다', prompt: '루시야, 그냥 편하게 일상 수다 떨고 싶어! 요즘 재미있는 이야기 있어?' }
];

export default function LucyStandalonePage() {
  const [, navigate] = useLocation();
  const { 
    firebaseUser, 
    signInWithGoogle, 
    sendUnifiedMessage, 
    personaMessages, 
    isGenerating 
  } = useApp();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTTSActive = useTTSActive();

  const lucyMessages = personaMessages?.lucy || [];
  const isLucyGenerating = isGenerating?.lucy || false;

  // 📲 Dynamic PWA Manifest & iOS Home-screen Metadata Switcher
  useEffect(() => {
    const prevTitle = document.title;
    document.title = '루시 AI 프로 - LUCY AI PRO';

    // 1. Dynamic Web App Manifest link
    let manifestTag = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifestHref = manifestTag ? manifestTag.getAttribute('href') : null;
    if (manifestTag) {
      manifestTag.setAttribute('href', '/manifest-lucy.webmanifest');
    } else {
      manifestTag = document.createElement('link');
      manifestTag.rel = 'manifest';
      manifestTag.href = '/manifest-lucy.webmanifest';
      document.head.appendChild(manifestTag);
    }

    // 2. Dynamic Apple Touch Icon for iOS Safari Homescreen
    const appleTouchIcons = document.querySelectorAll('link[rel^="apple-touch-icon"]') as NodeListOf<HTMLLinkElement>;
    const prevAppleIconHrefs: string[] = [];
    appleTouchIcons.forEach((iconTag) => {
      prevAppleIconHrefs.push(iconTag.href);
      iconTag.href = '/apple-touch-icon-lucy.png';
    });

    // 3. Dynamic Favicon / Shortcut Icon
    const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]') as NodeListOf<HTMLLinkElement>;
    const prevFaviconHrefs: string[] = [];
    favicons.forEach((favTag) => {
      prevFaviconHrefs.push(favTag.href);
      favTag.href = '/lucy-icon-192.png';
    });

    // 4. iOS Safari Add-to-Homescreen title
    let appleTitleTag = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    const prevAppleTitle = appleTitleTag ? appleTitleTag.getAttribute('content') : null;
    if (appleTitleTag) {
      appleTitleTag.setAttribute('content', '루시 AI 프로');
    }

    // 5. Theme color
    let themeColorTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const prevThemeColor = themeColorTag ? themeColorTag.getAttribute('content') : null;
    if (themeColorTag) {
      themeColorTag.setAttribute('content', '#FAFAF9');
    }

    return () => {
      document.title = prevTitle;
      if (manifestTag && prevManifestHref) {
        manifestTag.setAttribute('href', prevManifestHref);
      }
      appleTouchIcons.forEach((iconTag, idx) => {
        if (prevAppleIconHrefs[idx]) iconTag.href = prevAppleIconHrefs[idx];
      });
      favicons.forEach((favTag, idx) => {
        if (prevFaviconHrefs[idx]) favTag.href = prevFaviconHrefs[idx];
      });
      if (appleTitleTag && prevAppleTitle) {
        appleTitleTag.setAttribute('content', prevAppleTitle);
      }
      if (themeColorTag && prevThemeColor) {
        themeColorTag.setAttribute('content', prevThemeColor);
      }
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [lucyMessages, isLucyGenerating]);

  const handleSend = async (textToSend?: string) => {
    const msg = textToSend || input;
    if (!msg.trim() || isLucyGenerating) return;
    setInput('');
    await sendUnifiedMessage(msg, 'lucy');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleVoicePlay = (id: string, text: string) => {
    if (playingMsgId === id && isTTSActive) {
      stopTTS();
      setPlayingMsgId(null);
    } else {
      stopTTS();
      setPlayingMsgId(id);
      playTTS(text, 'Aoede');
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-[#FAFAF9] text-slate-800 font-sans flex flex-col overflow-hidden select-text">
      {/* 🌟 Top Header Bar (Full-Width Responsive Light Theme + iPhone Safe Area Inset) */}
      <header 
        style={{ paddingTop: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))' }}
        className="w-full px-4 sm:px-8 lg:px-12 pb-3.5 bg-white/95 border-b border-slate-200/80 shadow-xs flex items-center justify-between z-40 shrink-0 relative"
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button 
            type="button"
            onClick={() => navigate('/')} 
            className="p-2.5 -ml-1.5 rounded-2xl hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shrink-0 touch-manipulation z-50 flex items-center justify-center shadow-xs bg-slate-50 sm:bg-transparent border border-slate-200/60 sm:border-transparent"
            title="PRISM 허브로 이동"
          >
            <ArrowLeft size={20} className="text-slate-700" strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center text-white shadow-sm font-bold text-base sm:text-lg shrink-0">
              🌟
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight">LUCY AI PRO</h1>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-mono shadow-xs shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">당신의 올인원 소울메이트 프로</p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Google Account Status */}
          {firebaseUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] sm:text-xs font-medium text-emerald-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-[200px]">{firebaseUser.displayName || firebaseUser.email || 'Google 연동'}</span>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Google 로그인
            </button>
          )}
        </div>
      </header>

      {/* 💬 Chat Messages Stream (Spacious Full-Width PC Layout) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto select-text">
        {lucyMessages.length === 0 && (
          <div className="text-center py-12 sm:py-24 px-4 space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-200 to-amber-100 text-amber-600 flex items-center justify-center text-4xl mx-auto shadow-sm">
              🌟
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">안녕하세요! 루시 AI 프로예요.</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                마음 치유, 사주와 운명 이야기, 일상 활력 루틴, 예술 감성과 유쾌한 수다까지<br/>
                당신이 원하는 모든 이야기를 자유롭고 편안하게 나누어 보세요. ✨
              </p>
            </div>
          </div>
        )}

        {lucyMessages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const msgId = String(msg.id || index);
          const textContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

          return (
            <motion.div
              key={msgId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                {!isUser && <span className="text-xs font-bold text-amber-700">루시 AI 프로</span>}
                {isUser && <span className="text-xs font-medium text-slate-400">나</span>}
              </div>

              <div className="relative group max-w-[90%] sm:max-w-[85%] lg:max-w-[80%]">
                <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-sm sm:text-[15px] lg:text-base leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs font-sans'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-sm font-sans'
                }`}>
                  {textContent}
                </div>

                {!isUser && (
                  <div className="flex items-center gap-1.5 mt-1.5 pl-1">
                    <button
                      onClick={() => handleCopy(msgId, textContent)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="복사"
                    >
                      {copiedId === msgId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleVoicePlay(msgId, textContent)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        playingMsgId === msgId && isTTSActive
                          ? 'text-amber-600 bg-amber-50 animate-pulse'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                      }`}
                      title={playingMsgId === msgId && isTTSActive ? "음성 멈추기" : "음성으로 듣기"}
                    >
                      {playingMsgId === msgId && isTTSActive ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {isLucyGenerating && (
          <div className="flex items-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce delay-100" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce delay-200" />
            <span className="text-xs sm:text-sm text-slate-400 font-medium ml-1">루시가 생각하는 중...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* 💡 All-in-One Suggestion Chips */}
      <div className="w-full bg-white/70 border-t border-slate-200/60 shrink-0">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
          {LUCY_SUGGESTION_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.prompt)}
              disabled={isLucyGenerating}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-xs font-medium text-slate-600 hover:text-amber-900 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ✍️ Bottom Input Bar (Full Width Center Container + Safe Area) */}
      <footer 
        style={{ paddingBottom: 'max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))' }}
        className="w-full px-3.5 sm:px-5 pt-3.5 bg-white border-t border-slate-200 shadow-sm shrink-0"
      >
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-amber-400 focus-within:bg-white transition-all shadow-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="루시에게 편하게 이야기를 건네보세요..."
            rows={1}
            className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-sm sm:text-base resize-none outline-none leading-relaxed min-h-[42px] max-h-[120px]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLucyGenerating}
            className="p-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white rounded-xl transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
