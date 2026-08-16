import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Activity, Sparkles, Play, RotateCcw } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { useApp } from '@/contexts/AppContext';
import { playBinauralBeat, stopBinauralBeat, type BinauralBeatConfig } from '@/lib/binaural';
import { DEFAULT_BINAURAL_GAIN } from '@/lib/audio';

const MEDITATION_BINAURAL_VOLUME = DEFAULT_BINAURAL_GAIN * 0.92;

function playSolfeggioTone(freq: number, duration: number = 2.0) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback context restricted or failed:", e);
  }
}

interface MeditationType {
  id: string;
  title: string;
  sub: string;
  emoji: string;
  color: 'emerald' | 'purple' | 'pink' | 'amber';
  freq: number;
  beat: number;
  beatLabel: string;
  affirmations: string[];
  description: string;
  firebaseTitle: string;
  firebaseContent: string;
}

function getMeditationBinauralConfig(type: MeditationType): BinauralBeatConfig {
  return {
    id: `meditation_${type.id}`,
    name: `${type.title} (${type.freq}Hz + ${type.beat}Hz)`,
    carrier: type.freq,
    beat: type.beat,
    desc: type.beatLabel,
    category: 'heal',
    timestamp: Date.now(),
  };
}

const MEDITATION_TYPES: MeditationType[] = [
  {
    id: "light",
    title: "빛의 의식 호흡",
    sub: "Conscious Light Shift",
    emoji: "✨",
    color: "emerald",
    freq: 528,
    beat: 10,
    beatLabel: '10Hz 알파파 — 생체 회복·빛의 정렬',
    affirmations: [
      "고단했던 온몸의 에너지를 생생하게 풀어놓습니다.",
      "숨을 들이마시며 맑고 따뜻한 참나의 생체 빛을 충전합니다.",
      "숨을 내쉬며 세포에 응어리진 무거운 탁기를 은은히 방하착합니다.",
      "온 우주의 포근한 은총과 정렬 속에 완벽하게 정돈됩니다."
    ],
    description: "528Hz 기적·DNA 회복 솔페지오 주파수로 생체 전압을 다듬고 무한 우주광을 호흡합니다.",
    firebaseTitle: "아우라 일일 1분 빛의 호흡 완료",
    firebaseContent: '수행 기법: 1분 의식적 박스 호흡법 & 528Hz 솔페지오 주명\n\n[수행 결과]\n"1분간의 깊고 고요한 호흡 조율을 통해 누적된 생체 피로 전압이 신속히 접지되었습니다. 가쁜 호흡을 고르는 동안 온전한 안식과 회복 탄력성을 되찾습니다."'
  },
  {
    id: "release",
    title: "세도나 방하착 호흡",
    sub: "Sedona Letting-Go",
    emoji: "🍃",
    color: "purple",
    freq: 639,
    beat: 8,
    beatLabel: '8Hz 알파파 — 감정 방하착·조화',
    affirmations: [
      "지금 이 순간 머무는 어떤 피로와 감정이든 고요히 환영합니다.",
      "그 감정을 있는 그대로 기꺼이 흘려보낼 수 있습니까? (허용합니다)",
      "언제 그렇게 하겠습니까? (지금 이 순간, 툭 놓아줍니다)",
      "비워진 허공 속에서 본래부터 완전히 완벽하고 자유롭게 머눕니다."
    ],
    description: "639Hz 조화·소통 솔페지오 주파수와 결합하여 통제/인정/안전 등의 에고 강박을 즉각 흘려보냅니다.",
    firebaseTitle: "아우라 일일 1분 세도나 방하착 완료",
    firebaseContent: '수행 기법: 1분 세도나 정화 호흡법 & 639Hz 솔페지오 주명\n\n[수행 결과]\n"에고의 완고한 마음 저항과 결핍 갈망을 놓아주는 4단계 정화 질문에 동조하여, 가슴 깊이 차오르는 가벼움과 본래적 평안을 실현합니다."'
  },
  {
    id: "compassion",
    title: "자비 연민 호흡",
    sub: "Loving-Kindness Flow",
    emoji: "💖",
    color: "pink",
    freq: 852,
    beat: 6,
    beatLabel: '6Hz 세타파 — 자비·직관 심화',
    affirmations: [
      "애쓰고 수고한 온전한 참나에게 한없는 너그러움을 선물합니다.",
      "내가 깊은 고요 속에서 진정으로 평온하고 안전하기를 염원합니다.",
      "나의 세포 하나하나가 사랑과 축복으로 따뜻하게 차오릅니다.",
      "나를 구속하던 모든 긴장의 사슬이 다정하게 풀어집니다."
    ],
    description: "852Hz 직관·영적 귀환 솔페지오 주파수와 머물며 스스로를 치유하는 은총의 따뜻한 온기 파동을 채웁니다.",
    firebaseTitle: "아우라 일일 1분 자비 연민 호흡 완료",
    firebaseContent: '수행 기법: 1분 메타(Metta) 지관 호흡 & 852Hz 솔페지오 주명\n\n[수행 결과]\n"가장 자비롭고 자애로운 시선으로 에고를 안아주는 자비 연민 호흡을 정립하여, 억압되었던 메마른 내면에 따스한 자존적 위로와 생기를 복구합니다."'
  },
  {
    id: "grounding",
    title: "대지 그라운딩 호흡",
    sub: "Earth Earthing Anchor",
    emoji: "🌍",
    color: "amber",
    freq: 396,
    beat: 4,
    beatLabel: '4Hz 델타파 — 대지 접지·해방',
    affirmations: [
      "머리로 치솟던 복잡한 생각의 과전압을 대지 깊은 곳으로 가라앉힙니다.",
      "흔들림 없이 완고한 지구의 고요한 상생력을 발걸음으로 끌어당깁니다.",
      "언제 얻지 못할까 가슴 졸이던 불안과 두려움을 대지 속으로 툭 방하착합니다.",
      "나는 지금 이 자리에서 완벽하게 환영받으며 대지처럼 우뚝 섭니다."
    ],
    description: "396Hz 근원·해방 주파수와 어우러져 공중으로 흩어진 정신 파동을 대지 중심부로 단단히 접지시킵니다.",
    firebaseTitle: "아우라 일일 1분 대지 그라운딩 완료",
    firebaseContent: '수행 기법: 1분 어싱(Earthing) 심호흡 & 396Hz 솔페지오 주명\n\n[수행 결과]\n"불안해하는 생체 리듬과 날선 감정 과부하를 지구 대지의 중심 중력 속으로 안전하게 안착시킴으로써 실존적인 단단함과 편안한 무게 중심을 복각합니다."'
  }
];

interface OneMinMeditationProps {
  onClose: () => void;
}

export function OneMinMeditation({ onClose }: OneMinMeditationProps) {
  const { firebaseUser } = useApp();
  const [selectedType, setSelectedType] = useState<MeditationType>(MEDITATION_TYPES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  
  // Breath cycle state: inhale (4s), hold (4s), exhale (4s)
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [phaseTimer, setPhaseTimer] = useState(4);
  const [currentAffirmationIdx, setCurrentAffirmationIdx] = useState(0);

  // Binaural beat — carrier matches solfeggio freq, beat matches brainwave target
  useEffect(() => {
    if (!isPlaying || isFinished) {
      stopBinauralBeat();
      return;
    }

    playBinauralBeat(getMeditationBinauralConfig(selectedType), MEDITATION_BINAURAL_VOLUME);
    return () => stopBinauralBeat();
  }, [isPlaying, isFinished, selectedType]);

  useEffect(() => () => stopBinauralBeat(), []);

  // Main countdown & breath alignment ticker
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsFinished(true);
          setIsPlaying(false);
          return 0;
        }
        return prev - 1;
      });

      // Handle custom breath phase timings (4s Inhale, 4s Hold, 4s Exhale)
      setPhaseTimer(prev => {
        if (prev <= 1) {
          setBreathPhase(curr => {
            if (curr === "inhale") return "hold";
            if (curr === "hold") return "exhale";
            return "inhale";
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isFinished]);

  // Rotate affirmations dynamically every 15 seconds
  useEffect(() => {
    if (!isPlaying || isFinished) return;
    const phaseIndex = Math.min(3, Math.floor((60 - timeLeft) / 15));
    setCurrentAffirmationIdx(phaseIndex);
  }, [timeLeft, isPlaying, isFinished]);

  // Handle Firebase historical logging on completion
  useEffect(() => {
    if (isFinished) {
      playSolfeggioTone(963, 4.0); // Completion crown sound
      const user = firebaseUser || auth.currentUser;
      if (user) {
        addDoc(collection(db, 'heal_history', user.uid, 'entries'), {
          type: 'meditation',
          title: selectedType.firebaseTitle,
          content: `${selectedType.firebaseContent}\n\n[선택 호흡 모드: ${selectedType.title} (${selectedType.freq}Hz)]`,
          createdAt: serverTimestamp(),
          metadata: {
            pattern: '1-Min Specialized Align',
            meditationId: selectedType.id,
            durationSeconds: 60,
            solfeggioFreq: selectedType.freq,
            binauralBeat: selectedType.beat
          }
        }).catch(err => console.error("Firebase 1-min meditation logging failed:", err));
      }
    }
  }, [isFinished, firebaseUser, selectedType]);

  const handleClose = useCallback(() => {
    stopBinauralBeat();
    onClose();
  }, [onClose]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    stopBinauralBeat();
    setIsPlaying(false);
    setTimeLeft(60);
    setIsFinished(false);
    setBreathPhase("inhale");
    setPhaseTimer(4);
    setCurrentAffirmationIdx(0);
  };

  const selectMeditationMode = (type: MeditationType) => {
    if (isPlaying) return;
    setSelectedType(type);
    playSolfeggioTone(type.freq, 1.2); // Pre-warm frequency acoustic sound
  };

  const getBreathInstruction = () => {
    if (breathPhase === "inhale") return "숨을 고요히 들이마십니다 (Inhale)";
    if (breathPhase === "hold") return "맑은 에너지를 머금습니다 (Hold)";
    return "생체 전압과 집착을 내쉽니다 (Exhale)";
  };

  // Color mapping utilities
  const getColorClasses = (colorName: string) => {
    switch (colorName) {
      case 'purple':
        return {
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          activeBg: 'bg-purple-500/20',
          ring: 'ring-purple-400',
          glow: 'shadow-[0_0_50px_rgba(162,28,175,0.15)]',
          visualGlow: '0 0 35px rgba(162,28,175,0.5)',
          desc: 'border-purple-500/10 hover:border-purple-500/30 bg-purple-500/5'
        };
      case 'pink':
        return {
          border: 'border-pink-500/30',
          text: 'text-pink-400',
          activeBg: 'bg-pink-500/20',
          ring: 'ring-pink-400',
          glow: 'shadow-[0_0_50px_rgba(244,63,94,0.15)]',
          visualGlow: '0 0 35px rgba(244,63,94,0.5)',
          desc: 'border-pink-500/10 hover:border-pink-500/30 bg-pink-500/5'
        };
      case 'amber':
        return {
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          activeBg: 'bg-amber-500/20',
          ring: 'ring-amber-400',
          glow: 'shadow-[0_0_50px_rgba(245,158,11,0.15)]',
          visualGlow: '0 0 35px rgba(245,158,11,0.5)',
          desc: 'border-amber-500/10 hover:border-amber-500/30 bg-amber-500/5'
        };
      case 'emerald':
      default:
        return {
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          activeBg: 'bg-emerald-500/20',
          ring: 'ring-emerald-400',
          glow: 'shadow-[0_0_50px_rgba(16,185,129,0.15)]',
          visualGlow: '0 0 35px rgba(16,185,129,0.5)',
          desc: 'border-emerald-500/10 hover:border-emerald-500/30 bg-emerald-500/5'
        };
    }
  };

  const scheme = getColorClasses(selectedType.color);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 95, damping: 20 }}
        className={`glass p-6 md:p-8 max-w-lg w-full rounded-[40px] border text-center space-y-5 md:space-y-6 relative overflow-hidden transition-all duration-500 ${scheme.border} ${scheme.glow}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle stellar visual accents */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-[65px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/5 rounded-full blur-[65px] translate-y-1/2 -translate-x-1/4" />

        <div className="text-center space-y-1 relative z-10">
          <h3 className="text-xl md:text-2xl font-bold font-sans text-white flex items-center justify-center gap-2">
            <Timer className={`${scheme.text} animate-pulse`} size={24} />
            AURA 1분 호흡조율
          </h3>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">1-Minute Conscious Alignment</p>
        </div>

        {/* Specialized Multi-Mode Selecting Tabs (Disabled during active playback) */}
        {!isFinished && !isPlaying && (
          <div className="grid grid-cols-2 gap-2 relative z-10 py-1">
            {MEDITATION_TYPES.map((type) => {
              const isSelected = selectedType.id === type.id;
              const typeScheme = getColorClasses(type.color);
              return (
                <button
                  key={type.id}
                  onClick={() => selectMeditationMode(type)}
                  className={`p-3 rounded-2xl border text-left flex flex-col space-y-1 transition-all active:scale-95 text-xs font-sans cursor-pointer ${
                    isSelected
                      ? `bg-white/10 ${typeScheme.border} shadow-[0_0_15px_rgba(255,255,255,0.05)]`
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/50 hover:text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{type.emoji}</span>
                    <span className="truncate">{type.title}</span>
                  </div>
                  <div className="text-[10px] text-white/40 font-mono tracking-tight shrink-0">
                    {type.freq}Hz + {type.beat}Hz Binaural
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div
              key="breath-interface"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 md:space-y-6 py-1 relative z-10"
            >
              {/* Dynamic Breathing Visual Spheric Circle */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                {/* Solfeggio soundwaves ripple circle background */}
                <motion.div
                  className={`absolute inset-0 rounded-full border ${scheme.border}`}
                  animate={{
                    scale: isPlaying ? [1, 1.4, 1] : 1,
                    opacity: isPlaying ? [0.4, 0.1, 0.4] : 0.3
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                <motion.div
                  className="rounded-full flex items-center justify-center font-sans font-black text-2xl md:text-3xl shadow-inner border border-white/10"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                    width: '110px',
                    height: '110px'
                  }}
                  animate={isPlaying ? {
                    scale: breathPhase === "inhale" ? 1.25 : breathPhase === "hold" ? 1.25 : 0.85,
                    boxShadow: breathPhase === "hold"
                      ? scheme.visualGlow
                      : breathPhase === "inhale"
                      ? "0 0 20px rgba(255,255,255,0.2)"
                      : "0 0 10px rgba(0,0,0,0.5)"
                  } : { scale: 1 }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                >
                  <span className="text-white drop-shadow-md">
                    {timeLeft}
                  </span>
                </motion.div>
              </div>

              {/* Action/Breath prompts */}
              <div className="space-y-2 min-h-[85px] flex flex-col justify-center">
                {isPlaying ? (
                  <>
                    <motion.p
                      key={breathPhase}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-sm md:text-base font-bold ${scheme.text} tracking-wide`}
                    >
                      {getBreathInstruction()}
                    </motion.p>
                    <p className="text-[10px] text-white/30 font-mono">
                      다음 호흡 조율까지: {phaseTimer}초 · {selectedType.freq}Hz + {selectedType.beat}Hz 바이노럴 동조 중
                    </p>
                    <motion.blockquote
                      key={currentAffirmationIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-white/70 italic max-w-sm mx-auto pt-1 leading-relaxed break-keep font-sans"
                    >
                      "{selectedType.affirmations[currentAffirmationIdx]}"
                    </motion.blockquote>
                  </>
                ) : (
                  <div className="space-y-1.5 px-2">
                    <p className={`text-xs font-semibold ${scheme.text} font-black uppercase tracking-wider`}>
                      {selectedType.emoji} {selectedType.title} ({selectedType.freq}Hz + {selectedType.beat}Hz)
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto break-keep">
                      {selectedType.description} 준비가 되셨다면 아래 수련 시작 버튼을 지그시 눌러 고단함을 비우십시오.
                    </p>
                  </div>
                )}
              </div>

              {/* Flow controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer"
                  title="다시 시작 (Reset)"
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all text-white flex items-center gap-2 border cursor-pointer ${
                    isPlaying 
                      ? "bg-white/10 border-white/20 hover:bg-white/15" 
                      : `bg-${selectedType.color}-600/90 border-${selectedType.color}-500 hover:bg-${selectedType.color}-500`
                  }`}
                  style={{
                    backgroundColor: isPlaying ? undefined : (selectedType.color === 'emerald' ? '#10b981' : selectedType.color === 'purple' ? '#a855f7' : selectedType.color === 'pink' ? '#ec4899' : '#f59e0b'),
                    borderColor: isPlaying ? undefined : (selectedType.color === 'emerald' ? '#34d399' : selectedType.color === 'purple' ? '#c084fc' : selectedType.color === 'pink' ? '#f472b6' : '#fbbf24')
                  }}
                >
                  {isPlaying ? (
                    <>
                      <Activity size={14} className="animate-pulse" />
                      <span>일시 정지</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>수련 시작</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="breath-completion"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="space-y-6 py-3 relative z-10"
            >
              <div className={`w-14 h-14 rounded-full bg-${selectedType.color}-500/10 border border-${selectedType.color}-500/30 flex items-center justify-center ${scheme.text} mx-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse`}
                   style={{
                     backgroundColor: selectedType.color === 'emerald' ? 'rgba(16,185,129,0.1)' : selectedType.color === 'purple' ? 'rgba(168,85,247,0.1)' : selectedType.color === 'pink' ? 'rgba(236,72,153,0.1)' : 'rgba(245,158,11,0.1)',
                     borderColor: selectedType.color === 'emerald' ? 'rgba(16,185,129,0.3)' : selectedType.color === 'purple' ? 'rgba(168,85,247,0.3)' : selectedType.color === 'pink' ? 'rgba(236,72,153,0.3)' : 'rgba(245,158,11,0.3)'
                   }}>
                <Sparkles size={24} />
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-100">{selectedType.title} 인가 완료</h4>
                <p className="text-xs text-white/50 leading-relaxed max-w-sm mx-auto break-keep">
                  수고하셨습니다. 단 1분간의 축적된 조율만으로도 에고의 완고한 저항 상태가 자연정화되었습니다. 고요히 깨어있는 이 마음으로 흐름을 이어가십시오.
                </p>
              </div>

              <button
                onClick={handleClose}
                className={`w-full max-w-xs mx-auto py-3 bg-${selectedType.color}-600 hover:bg-${selectedType.color}-500 rounded-[20px] font-bold text-white text-xs tracking-wider uppercase active:scale-95 transition-all shadow-md cursor-pointer`}
                style={{
                  backgroundColor: selectedType.color === 'emerald' ? '#10b981' : selectedType.color === 'purple' ? '#a855f7' : selectedType.color === 'pink' ? '#ec4899' : '#f59e0b'
                }}
              >
                가뿐하게 일상 동조
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
