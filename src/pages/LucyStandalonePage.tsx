import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Volume2, Sparkles, RefreshCw, 
  Copy, Check, ArrowLeft, Download,
  VolumeX, X, Smartphone, Globe
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
    isGenerating, 
    clearPersonaMessages 
  } = useApp();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isTTSActive = useTTSActive();

  const lucyMessages = personaMessages?.lucy || [];
  const isLucyGenerating = isGenerating?.lucy || false;

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

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
    <div className="h-screen w-full bg-[#FAFAF9] text-slate-800 font-sans flex flex-col overflow-hidden select-text">
      {/* 🌟 Top Header Bar (Ultra Clean Light Theme) */}
      <header className="px-3.5 sm:px-6 py-3 bg-white/95 border-b border-slate-200/80 shadow-xs flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
            title="PRISM 허브로 이동"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center text-white shadow-sm font-bold text-base shrink-0">
              🌟
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">LUCY AI PRO</h1>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-mono shadow-xs shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate">당신의 올인원 소울메이트 프로</p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Prominent 루시프로 설치 Button */}
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
            title="홈 화면에 루시프로 단독 앱으로 설치"
          >
            <Download size={13} className="text-white" strokeWidth={2.5} />
            <span>루시프로 설치</span>
          </button>

          {/* Google Account Status */}
          {firebaseUser ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-[120px]">{firebaseUser.displayName || 'Google 연동'}</span>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="hidden sm:flex px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Google 로그인
            </button>
          )}

          {/* Reset Chat */}
          <button
            onClick={() => clearPersonaMessages('lucy')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="대화 비우기"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* 💬 Chat Messages Stream */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-3xl w-full mx-auto select-text">
        {lucyMessages.length === 0 && (
          <div className="text-center py-10 sm:py-16 px-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-200 to-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-sm">
              🌟
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">안녕하세요! 루시 AI 프로예요.</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
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
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {!isUser && <span className="text-[11px] font-bold text-amber-700">루시 AI 프로</span>}
                {isUser && <span className="text-[11px] font-medium text-slate-400">나</span>}
              </div>

              <div className="relative group max-w-[88%] sm:max-w-[80%]">
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs font-sans'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-sm font-sans'
                }`}>
                  {textContent}
                </div>

                {!isUser && (
                  <div className="flex items-center gap-1 mt-1 pl-1">
                    <button
                      onClick={() => handleCopy(msgId, textContent)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="복사"
                    >
                      {copiedId === msgId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => handleVoicePlay(msgId, textContent)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        playingMsgId === msgId && isTTSActive
                          ? 'text-amber-600 bg-amber-50 animate-pulse'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                      }`}
                      title={playingMsgId === msgId && isTTSActive ? "음성 멈추기" : "음성으로 듣기"}
                    >
                      {playingMsgId === msgId && isTTSActive ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {isLucyGenerating && (
          <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce delay-100" />
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce delay-200" />
            <span className="text-xs text-slate-400 font-medium ml-1">루시가 생각하는 중...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* 💡 All-in-One Suggestion Chips */}
      <div className="px-3.5 sm:px-6 py-2 bg-white/70 border-t border-slate-200/60 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0 max-w-3xl w-full mx-auto">
        {LUCY_SUGGESTION_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.prompt)}
            disabled={isLucyGenerating}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-[11px] font-medium text-slate-600 hover:text-amber-900 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ✍️ Bottom Input Bar */}
      <footer className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-sm shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 focus-within:border-amber-400 focus-within:bg-white transition-all shadow-inner">
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
            className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-xs sm:text-sm resize-none outline-none leading-relaxed min-h-[38px] max-h-[100px]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLucyGenerating}
            className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white rounded-xl transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
          >
            <Send size={15} />
          </button>
        </div>
      </footer>

      {/* 📱 Install Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌟</span>
                  <h3 className="text-base font-bold text-slate-900">루시 AI 프로 앱 설치 안내</h3>
                </div>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <Smartphone size={14} /> 아이폰 (iOS Safari)
                  </p>
                  <p className="text-slate-600">
                    화면 하단의 <strong>공유 버튼(□↑)</strong>을 누르고 <strong>[홈 화면에 추가]</strong>를 누르시면 바탕화면에 단독 앱으로 설치됩니다.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Globe size={14} /> 안드로이드 & PC (Chrome)
                  </p>
                  <p className="text-slate-600">
                    우측 상단 메뉴(⋮)에서 <strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong>를 선택하시면 됩니다.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
