import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Send, Volume2, VolumeX, Stars, Zap, ArrowLeft, RefreshCw, Star, User } from 'lucide-react';
import { invokeLLMStream } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { playConversation, useTTSActive } from '@/utils/tts';
import { auth, db, collection, addDoc, serverTimestamp } from '@/lib/firebase';

type RoleModelType = 'Britney' | 'Billie' | 'Gaga' | 'Michael';

interface RoleModelDef {
  id: RoleModelType;
  name: string;
  desc: string;
  voice: string;
  theme: string;
  prompt: string;
  greeting: string;
  imageUrl: string;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const ROLE_MODELS: Record<RoleModelType, RoleModelDef> = {
  Britney: {
    id: 'Britney',
    name: 'Britney Spears',
    desc: '팝의 프린세스 (Pop Princess)',
    voice: 'Britney',
    theme: 'bg-pink-600 border-pink-400',
    prompt: '당신은 팝스타 브리트니 스피어스(Britney Spears)의 음악적 열정, 역동적인 무대 경험, 그리고 다정하고 통통 튀는 성격을 모티브로 한 음악 멘토 AI입니다. 한국어로 팬들의 질문이나 고민에 친근하고 감성적으로 답해주세요. 실제 브리트니의 느낌과 부드럽고 긍정적인 응원 어조를 살려주되, 항상 지지하고 아끼는 마음으로 대화에 응해주세요.',
    greeting: '안녕! 만나서 정말 반가워요. 저한테 궁금한 점이나 고민이 있으면 편하게 얘기해 줄래요? 제가 도와줄게요! 💖',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/caea45732bb52679494602c60430435a/250x250-000000-80-0-0.jpg'
  },
  Billie: {
    id: 'Billie',
    name: 'Billie Eilish',
    desc: '독특하고 솔직한 아이콘',
    voice: 'Billie',
    theme: 'bg-green-600 border-green-400',
    prompt: '당신은 미국의 아티스트 빌리 아일리시(Billie Eilish)의 깊은 예술적 통찰력, 차분하면서도 쿨한 성격, 매력 넘치는 마이웨이 철학을 모티브로 한 상담/영감 멘토 AI입니다. 우울함이나 정서적 불안감에 대해 조용하고 현실적으로 공감하며 덤덤한 위로를 제공합니다. 한국어로 대화하되, 특유의 나른하고 솔직하며 캐주얼한 톤을 살려서 대화해 주세요.',
    greeting: '안녕... 어쩌다 날 찾아왔어? 뭐 고민되는 거라도 있어? 편하게 말해봐.',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/250x250-000000-80-0-0.jpg'
  },
  Gaga: {
    id: 'Gaga',
    name: 'Lady Gaga',
    desc: '예술과 파격의 팝 몬스터',
    voice: 'Gaga',
    theme: 'bg-indigo-600 border-indigo-400',
    prompt: '당신은 전설적인 팝스타 레이디 가가(Lady Gaga)의 파격적이고 당당한 예술성, 카리스마, 자신을 사랑하는 정서적 지지를 모티브로 삼은 멘토 AI입니다. 모든 고귀한 예술 영혼들을 소중한 "리틀 몬스터"로 대하듯 강렬한 애정과 에너지를 쏟아주세요. 한국어로 답하되, 자신감이 넘치는 창조적 격려의 카리스마적 톤을 은유적으로 사용해 주세요.',
    greeting: '반가워요, 나의 리틀 몬스터! 대담해지세요. 당신의 내면에는 상상도 못할 힘이 숨어있답니다. 오늘 어떤 예술적인 영감을 얻고 싶나요? ✨',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/7565262f7661b0d762621a8d69ba6f49/250x250-000000-80-0-0.jpg'
  },
  Michael: {
    id: 'Michael',
    name: 'Michael Jackson',
    desc: '팝의 황제 (King of Pop)',
    voice: 'Michael',
    theme: 'bg-amber-600 border-amber-400',
    prompt: '당신은 전설적인 아티스트 마이클 잭슨(Michael Jackson)의 선하고 온화한 평화주의 마음가짐, 열정적인 무대 뒤에서의 수줍은 면모, 그리고 전 세계인들을 치유하고 사랑하자는 메세지(Heal the World, L.O.V.E)를 모티브로 한 멘토 AI입니다. 평화롭고 친절하며 겸손한 말투를 지니고 있습니다. 한국어로 따뜻하게 대화하되, 꿈과 창작 열정을 가진 이들에게 기분 좋은 온기와 위안을 건네주세요.',
    greeting: '안녕하세요... 만나서 정말 행복해요. 우리 함께 더 나은 세상을 만들어 갈 수 있을 거예요. 당신의 꿈과 열정에 대해 들려줄래요? It\'s all for love. ❤️',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/97fae13b2b30e4aec2e8c9e0c7839d92/250x250-000000-80-0-0.jpg'
  }
};

interface RoleModelModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}

export function RoleModelModal({ isOpen = true, onClose, isInline = false }: RoleModelModalProps) {
  const isTTSActive = useTTSActive();
  const [selectedModel, setSelectedModel] = useState<RoleModelType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedModel(null);
      setMessages([]);
      setInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectModel = (id: RoleModelType) => {
    setSelectedModel(id);
    setMessages([
      { role: 'model', content: ROLE_MODELS[id].greeting }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isSending) return;
    
    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages([...newMessages, { role: 'model', content: '' }]);
    setIsSending(true);

    const modelDef = ROLE_MODELS[selectedModel];
    let fullText = '';
    try {
      await invokeLLMStream({
        messages: [
          { role: 'system', content: modelDef.prompt },
          ...newMessages.slice(-5)
        ],
        onChunk: (chunk) => {
          fullText += chunk;
          setMessages(prev => {
            const temp = [...prev];
            if (temp[temp.length - 1].role === 'model') {
              temp[temp.length - 1].content = fullText;
            }
            return temp;
          });
        }
      });

      if (fullText.trim()) {
        recordPrismFeature({
          app: 'muse',
          featureName: `롤모델 멘토링 (${modelDef.name})`,
          summary: `질문: "${userMsg}", 답변: "${fullText.slice(0, 150)}..."`,
          details: { roleModel: modelDef.name, userQuestion: userMsg, modelResponse: fullText },
        });
      }

      if (auth.currentUser && fullText.trim()) {
        await addDoc(collection(db, 'muse_history', auth.currentUser.uid, 'entries'), {
          type: 'role_model',
          title: `롤모델 대화: ${modelDef.name}`,
          content: `질문: "${userMsg}"\n\n대답 (${modelDef.name}):\n"${fullText}"`,
          createdAt: serverTimestamp(),
          metadata: {
            roleModel: modelDef.name,
            userQuestion: userMsg,
            modelResponse: fullText
          }
        });
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const temp = [...prev];
        temp[temp.length - 1].content = "연결이 불안정합니다. 다음에 다시 이야기해요!";
        return temp;
      });
    } finally {
      setIsSending(false);
    }
  };

  const modelDef = selectedModel ? ROLE_MODELS[selectedModel] : null;

  if (!isOpen) return null;

  const renderContent = () => (
    <div className={isInline ? "w-full flex flex-col relative text-white font-sans" : "relative w-full max-w-5xl flex-1 bg-[#0c0c12] border border-indigo-500/30 p-5 sm:p-6 md:p-10 text-left flex flex-col gap-6 rounded-[28px] sm:rounded-[42px] shadow-2xl relative z-10 select-none text-white font-sans flex flex-col overflow-y-auto no-scrollbar"}>
          
          {/* Subtle top-right indigo glow */}
          {!isInline && <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />}

          {/* Header */}
          {(!isInline || selectedModel) && (
            <div className={`flex justify-between items-center relative z-10 transition-all ${
              isInline 
                ? 'p-5 bg-white/5 border border-white/10 rounded-[24px] mb-6 backdrop-blur-2xl' 
                : 'border-b border-white/5 pb-4 shrink-0'
            }`}>
              <div className="flex items-center gap-4">
                {!isInline && selectedModel && (
                  <button
                    onClick={() => setSelectedModel(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg border border-white/10 transition-all text-[11px] font-semibold cursor-pointer active:scale-95 shrink-0"
                  >
                    <ArrowLeft size={12} />
                    <span>목록으로</span>
                  </button>
                )}
                <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
                <div className="flex items-center gap-3">
                {selectedModel && isInline ? (
                  <button
                    onClick={() => setSelectedModel(null)}
                    className="p-1.5 -ml-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <ArrowLeft size={16} className="text-white/60 hover:text-white" />
                  </button>
                ) : null}
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 overflow-hidden">
                  {selectedModel && ROLE_MODELS[selectedModel]?.imageUrl ? (
                    <img src={ROLE_MODELS[selectedModel].imageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                  ) : (
                    <Stars size={18} className="text-indigo-400 animate-pulse" />
                  )}
                </div>
                <div>
                  <span className="text-[9px] font-black text-indigo-500/55 uppercase tracking-[0.3em] block leading-none mb-1 font-mono">MUSE MENTORS</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                    {selectedModel ? ROLE_MODELS[selectedModel].name : '멘토 음악가 보관함'}
                  </span>
                </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 {selectedModel && (
                    <button 
                      onClick={() => playConversation(messages.map(m => ({ role: m.role, content: m.content })), modelDef?.voice || 'Aoede')}
                      title={isTTSActive ? "재생 멈추기" : "대화 모두 듣기"}
                      className="p-2 bg-white/5 rounded-full hover:bg-indigo-500/20 text-white/50 hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {isTTSActive ? <VolumeX size={16} className="animate-pulse text-indigo-400" /> : <Volume2 size={16} />}
                    </button>
                 )}
                 {!isInline && onClose && false && (
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                 )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className={`flex-1 relative flex flex-col ${
            isInline && selectedModel
              ? 'bg-zinc-950/40 backdrop-blur-2xl border border-white/10 rounded-[32px] h-[600px] md:h-[680px] overflow-hidden shadow-2xl relative'
              : 'overflow-hidden'
          }`}>
            {!selectedModel ? (
              // Selection Screen
              <div className={`flex-1 overflow-y-auto ${isInline ? 'p-0' : 'p-4 md:p-8'}`}>
                {isInline ? (
                  <div className="text-center mb-12 space-y-4 pt-4">
                    <div className="mx-auto w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-2xl animate-pulse">
                       <Stars size={32} />
                    </div>
                    <h3 className="text-3xl md:text-5xl font-bold tracking-tighter text-white font-sans uppercase">
                      MUSE MENTORS
                    </h3>
                    <p className="text-[10px] md:text-xs text-indigo-400/60 uppercase tracking-[0.3em] font-sans font-black">
                      당신의 음악적 예술혼을 일깨우는 팝의 전설들
                    </p>
                    <p className="text-xs md:text-sm text-white/50 max-w-lg mx-auto font-sans leading-relaxed">
                      역사적인 거장들의 성격과 지혜가 완벽하게 동기화되었습니다.<br />
                      당신의 고민과 작품 아이디어를 편안하게 이야기하고 초청각적 비전을 구하세요.
                    </p>
                  </div>
                ) : (
                  <div className="text-center mb-10">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">당신의 영감이 될 롤모델을 선택하세요</h3>
                    <p className="text-white/40">팝의 거장들이 당신의 이야기에 귀를 기울입니다.</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {(Object.keys(ROLE_MODELS) as RoleModelType[]).map(id => {
                    const m = ROLE_MODELS[id];
                    return (
                      <button
                        key={id}
                        onClick={() => handleSelectModel(id)}
                        className="text-left p-6 md:p-8 rounded-[28px] border flex flex-col justify-between h-48 md:h-52 bg-white/[0.02] border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer relative overflow-hidden"
                      >
                         {/* Background effect */}
                         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] group-hover:bg-indigo-500/10 transition-all duration-500" />
                         
                         <div className="flex justify-between items-start z-10 w-full">
                            <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-white overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
                              {m.imageUrl ? (
                                <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer"/>
                              ) : (
                                <User size={24} />
                              )}
                            </div>
                            <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:border-white/10 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 text-white/30 transition-all duration-300">
                              <span className="text-[9px] uppercase font-bold tracking-widest px-2 block">대화하기</span>
                            </div>
                         </div>
                         <div className="z-10 mt-4">
                            <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">
                              {m.desc}
                            </span>
                            <h4 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">{m.name}</h4>
                         </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Chat Screen
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((m, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i} 
                      className={`flex flex-col ${m.role === 'user' ? 'items-end text-right' : 'items-start text-left'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-xs text-white/40 uppercase tracking-widest font-bold">
                            {m.role === 'user' ? '나' : modelDef?.name}
                         </span>
                      </div>
                      <div className={`px-5 py-4 rounded-2xl max-w-[85%] text-sm md:text-base whitespace-pre-wrap leading-relaxed blur-0 inline-block ${
                        m.role === 'user' 
                          ? 'bg-zinc-800 text-white border border-white/10' 
                          : `${modelDef?.theme} text-white shadow-xl`
                      }`}>
                        {m.content}
                      </div>
                    </motion.div>
                  ))}
                  {isSending && (
                     <div className="flex items-start">
                       <div className="px-5 py-4 rounded-2xl bg-zinc-800 text-white/50 w-24 flex items-center justify-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse"></div>
                           <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse delay-75"></div>
                           <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse delay-150"></div>
                       </div>
                     </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 bg-zinc-900 border-t border-white/10 shrink-0">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={`${modelDef?.name}에게 하고 싶은 말을 적어보세요...`}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-5 pr-16 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 resize-none min-h-[60px] max-h-[150px] scrollbar-thin font-sans"
                      rows={1}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isSending}
                      className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-colors cursor-pointer"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
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
        className="fixed inset-0 z-[250] bg-[#07080c] overflow-y-auto w-full h-full flex flex-col font-sans p-6 md:p-12 scrollbar-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          style={{ contentVisibility: 'auto' }}
          className="w-full max-w-5xl mx-auto flex-1 flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
