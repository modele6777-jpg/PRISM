import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Feather, Sparkles, Send, Lock, Play, Music, ArrowLeft } from 'lucide-react';
import { auth, db, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from '@/lib/firebase';
import { useApp } from '@/contexts/AppContext';
import { invokeLLMStructured } from '@/lib/ai';
import { z } from 'zod';

interface BlueRadioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOISE_TRACKS: Record<string, { url: string, desc: string }> = {
  rain: { url: "synth-rain", desc: "차분하게 내리는 봄비 같은 힐링 로파이 비트" },
  forest: { url: "synth-wind", desc: "새벽 이슬 머금은 숲속의 짐노페디 피아노 선율" },
  star: { url: "synth-space", desc: "영혼을 감싸안는 밤하늘의 바흐 골드베르크 아리아" },
  ocean: { url: "synth-ocean", desc: "마음을 잔잔하게 쓰다듬어주는 클로드 드뷔시 달빛" }
};

const SecretResponseSchema = z.object({
  title: z.string().describe("파랑새가 비밀을 다듬어 지어준 서정적인 제목"),
  message: z.string().describe("파랑새가 비밀을 듣고 건네는 따뜻하고 비밀스러운 위로의 속삭임 (약 3문장)"),
  track: z.object({
    name: z.string().describe("이 비밀을 포근하게 감싸줄 음악의 이름"),
    noiseType: z.enum(['rain', 'forest', 'star', 'ocean']).describe("비밀의 분위기에 가장 어울리는 배경음악 테마")
  }).describe("비밀을 안전하게 간직할 때 재생되는 파랑새의 힐링 ASMR/배경음악")
});

interface SecretData {
  id?: string;
  originalSecret: string;
  title: string;
  message: string;
  createdAt?: any;
  track: { 
    name: string; 
    noiseType: 'rain' | 'forest' | 'star' | 'ocean';
  };
}

export function BlueRadioModal({ isOpen, onClose }: BlueRadioModalProps) {
  const { firebaseUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [secrets, setSecrets] = useState<SecretData[]>([]);
  const [secretInput, setSecretInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultError, setVaultError] = useState(false);
  const VAULT_CODE = '0328';

  const appendVaultDigit = (digit: string) => {
    if (vaultPassword.length >= 4) return;
    const next = `${vaultPassword}${digit}`;
    setVaultPassword(next);
    setVaultError(false);
    if (next.length === 4) {
      if (next === VAULT_CODE) {
        setVaultUnlocked(true);
        void loadSecrets();
      } else {
        setVaultError(true);
        window.setTimeout(() => {
          setVaultPassword('');
          setVaultError(false);
        }, 450);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setVaultUnlocked(false);
      setVaultPassword('');
      setVaultError(false);
      setSecrets([]);
      setLoading(false);
    }
  }, [isOpen, firebaseUser]);

  const loadSecrets = async () => {
    const user = auth.currentUser || firebaseUser;
    if (!user) {
      // Guest local storage fallback
      try {
        const saved = localStorage.getItem('lucy_bluebird_guest_secrets');
        if (saved) {
          setSecrets(JSON.parse(saved));
        } else {
          setSecrets([]);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // Query entries subcollection which is valid in rules
      const entriesRef = collection(db, 'bluebird_history', user.uid, 'entries');
      const q = query(entriesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const fetched: SecretData[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.type === 'secret') {
          fetched.push({
            id: doc.id,
            originalSecret: data.originalSecret || '',
            title: data.title || '',
            message: data.message || '',
            createdAt: data.createdAt,
            track: {
              name: data.track?.name || '고요한 선율',
              noiseType: (data.track?.noiseType as any) || 'star'
            }
          });
        }
      }

      setSecrets(fetched);
    } catch (err: any) {
      console.error("Secrets load error:", err);
      // Fallback load from local storage
      try {
        const saved = localStorage.getItem(`lucy_bluebird_secrets_${user.uid}`);
        if (saved) {
          setSecrets(JSON.parse(saved));
        }
      } catch (_) {}
      setErrorMsg("비밀 보관함을 불러오지 못했습니다. (로컬 데이터로 대체됨)");
    } finally {
      setLoading(false);
    }
  };

  const playAsBgm = (name: string, noiseType: string) => {
    const trackInfo = NOISE_TRACKS[noiseType] || NOISE_TRACKS.star;
    window.dispatchEvent(
      new CustomEvent('play-custom-bgm', {
        detail: { name: `Bluebird: ${name}`, url: trackInfo.url }
      })
    );
  };

  const handleTellSecret = async () => {
    const user = auth.currentUser || firebaseUser;
    if (!secretInput.trim()) return;
    window.dispatchEvent(new Event('unlock-bgm-audio'));
    setGenerating(true);
    setErrorMsg(null);
    try {
      const response = await invokeLLMStructured({
        messages: [
          { 
            role: 'system', 
            content: '당신은 아무에게도 말하지 못한 비밀을 들어주는 파랑새입니다. 사용자의 비밀을 안전하게 간직한다는 의미에서, 따뜻하고 비밀스러운 위로의 메시지와 그 비밀을 마음속 깊이 감싸안아줄 힐링 배경음악(rain/forest/star/ocean 중 선택)을 선물합니다.'
          },
          { 
            role: 'user', 
            content: `나의 비밀 이야기:\n${secretInput}` 
          }
        ],
        schema: SecretResponseSchema
      });

      const newSecretObj: SecretData = {
        originalSecret: secretInput,
        title: response.title,
        message: response.message,
        track: {
          name: response.track.name || '고요한 선율',
          noiseType: (response.track.noiseType as any) || 'star'
        },
        createdAt: Date.now()
      };

      if (user) {
        try {
          // Write directly to entries collection to satisfy Firestore rules
          const docRef = await addDoc(collection(db, 'bluebird_history', user.uid, 'entries'), {
            type: 'secret',
            originalSecret: secretInput,
            title: response.title,
            message: response.message,
            track: response.track,
            createdAt: serverTimestamp()
          });
          newSecretObj.id = docRef.id;

          // Also save to standard entries library for Epilogue visibility
          await addDoc(collection(db, 'bluebird_history', user.uid, 'entries'), {
            type: 'secret_story',
            title: `비밀 라디오: ${response.title}`,
            content: `나의 고민 비밀 이야기:\n"${secretInput}"\n\n블루버드 전언:\n"${response.message}"\n\n동조 주파수 소리: ${response.track?.name || '고요한 침묵'}`,
            createdAt: serverTimestamp(),
            metadata: {
              originalSecret: secretInput,
              title: response.title,
              message: response.message,
              track: response.track
            }
          });
        } catch (dbErr) {
          console.error("Firestore write permission error:", dbErr);
        }

        // Save local backup as well
        try {
          const key = `lucy_bluebird_secrets_${user.uid}`;
          const currentLocal = JSON.parse(localStorage.getItem(key) || '[]');
          localStorage.setItem(key, JSON.stringify([newSecretObj, ...currentLocal]));
        } catch (_) {}
      } else {
        // Guest localStorage save
        try {
          const key = 'lucy_bluebird_guest_secrets';
          const currentLocal = JSON.parse(localStorage.getItem(key) || '[]');
          const guestSecret = { ...newSecretObj, id: `guest-${Date.now()}` };
          localStorage.setItem(key, JSON.stringify([guestSecret, ...currentLocal]));
          setSecrets(prev => [guestSecret, ...prev]);
        } catch (e) {
          console.error(e);
        }
      }

      if (user) {
        setSecrets(prev => [newSecretObj, ...prev]);
      }
      setSecretInput('');
      
      // Auto play immediately as BGM!
      playAsBgm(response.track.name, response.track.noiseType);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("비밀을 간직하는 중 문제가 발생했습니다. " + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] bg-[#06070a] overflow-y-auto w-full h-full flex flex-col font-sans p-6 md:p-12 scrollbar-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          style={{ contentVisibility: 'auto' }}
          className="relative w-full max-w-5xl mx-auto flex-1 flex flex-col gap-6 bg-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle top-right sky glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />

          {/* Premium Header */}
          <div className="flex items-center justify-between relative z-10 border-b border-white/5 pb-4 shrink-0">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <Lock size={18} className="animate-pulse" />
                   </div>
                   <div>
                      <span className="text-[9px] font-black text-sky-500/55 uppercase tracking-[0.3em] block leading-none mb-1 font-mono">SECRET STORY</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">파랑새의 비밀이야기 보관함 (Bluebird Secret)</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-8 relative z-10 w-full overflow-y-auto no-scrollbar pr-1">
            <div className="text-center space-y-4 mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-sky-950/40 border border-sky-500/30 text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                <Feather size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-xl tracking-wide">비밀을 속삭여주세요</h3>
                <p className="text-white/50 text-xs font-sans leading-relaxed">
                  아무에게도 하지 못한 이야기를 파랑새에게 들려주세요. <br />파랑새가 비밀을 품고 완벽한 힐링 주파수 음악과 따뜻한 위로를 속삭여줍니다.
                </p>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={secretInput}
                onChange={e => setSecretInput(e.target.value)}
                disabled={generating}
                placeholder="오늘 하루 겪었던 남들에게 말 못한 감정이나 비밀을 주저 없이 적어보세요..."
                className="w-full bg-[#07070a] border border-sky-500/20 rounded-[20px] p-6 text-white placeholder-white/25 font-sans resize-none h-40 focus:outline-none focus:border-sky-500/40 transition-colors text-sm leading-relaxed"
              />
              <button
                onClick={handleTellSecret}
                disabled={generating || !secretInput.trim()}
                className="absolute bottom-4 right-4 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-30 rounded-xl text-white shadow-xl transition-all flex items-center gap-2 font-bold text-xs tracking-wider cursor-pointer"
              >
                {generating ? <Sparkles size={14} className="animate-spin" /> : <Send size={14} />}
                {generating ? '파랑새가 속삭이는 중...' : '속삭이기'}
              </button>
              {errorMsg && <p className="text-red-400 text-xs mt-2 absolute -bottom-6 left-0">{errorMsg}</p>}
            </div>

            {!vaultUnlocked ? (
              <div className="mt-8 rounded-[24px] border border-sky-500/20 bg-sky-950/10 p-6 sm:p-8 flex flex-col items-center gap-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-[0_0_24px_rgba(14,165,233,0.12)]">
                  <Lock size={24} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white">비밀 보관함 잠금</h4>
                  <p className="text-[11px] text-white/40 leading-relaxed">저장된 비밀 내용을 보려면 비밀번호를 입력하세요.</p>
                </div>
                <div className="w-full max-w-xs space-y-4">
                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                          vaultPassword.length > index
                            ? 'bg-sky-400 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]'
                            : 'border-white/20 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '←'].map((key, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (key === '←') {
                            setVaultPassword((prev) => prev.slice(0, -1));
                            setVaultError(false);
                          } else if (key !== '') {
                            appendVaultDigit(String(key));
                          }
                        }}
                        className={`h-14 rounded-2xl text-lg font-semibold transition-all active:scale-95 ${
                          key === ''
                            ? 'pointer-events-none opacity-0'
                            : key === '←'
                              ? 'bg-white/5 text-white/70 hover:bg-white/10'
                              : `bg-white/5 text-white hover:bg-sky-500/20 border border-white/5 ${
                                  vaultError ? 'text-red-400' : ''
                                }`
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  {vaultError && (
                    <p className="text-[10px] text-red-400 animate-pulse">비밀번호가 올바르지 않습니다.</p>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-sky-400">
                <Sparkles size={24} className="animate-spin opacity-50" />
                <p className="text-xs tracking-widest uppercase font-mono">비밀 보관함 여는 중...</p>
              </div>
            ) : secrets.length > 0 ? (
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Lock size={12} className="text-sky-400/50" />
                  <h4 className="text-sky-400/80 text-[10px] font-bold tracking-widest uppercase font-mono">비밀 보관함</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {secrets.map((secret, idx) => (
                    <div key={secret.id || idx} className="bg-white/5 border border-sky-500/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sky-300 font-bold text-sm tracking-wide">{secret.title}</h4>
                      </div>
                      
                      <div className="rounded-xl bg-black/50 border border-white/5 p-4">
                        <div className="text-white/70 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                          {secret.originalSecret}
                        </div>
                      </div>

                      <div className="bg-sky-500/5 rounded-xl p-4 border border-sky-500/10">
                        <p className="text-sky-200/90 text-xs leading-relaxed font-sans flex gap-2">
                          <Feather size={14} className="text-sky-400 shrink-0 mt-0.5"/>
                          <span>{secret.message}</span>
                        </p>
                      </div>

                      {secret.track && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-black/40 p-3 rounded-xl border border-sky-500/10">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-sky-950 text-sky-400 border border-sky-500/20">
                            <Music size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-sky-300 truncate">{secret.track?.name || '고요한 선율'}</p>
                            <p className="text-[10px] text-sky-400/60 mt-0.5 truncate">
                              {NOISE_TRACKS[secret.track?.noiseType || 'star']?.desc || "고요하게 마음을 다스려주는 소리"}
                            </p>
                          </div>
                          <button
                            onClick={() => playAsBgm(secret.track?.name || '고요한 선율', secret.track?.noiseType || 'star')}
                            className="w-full sm:w-auto px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/20 text-sky-300 text-[10px] rounded-lg font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Play size={10} className="ml-0.5" /> 배경음에 믹싱하기
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
