import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Sparkles,
  TreeDeciduous,
  Activity,
  Bird,
  Music,
  Moon,
  Clock,
  Compass,
  Zap,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { TTSButton } from '@/components/TTSButton';
import { RealBookModal, type BookChapterTab } from '@/components/RealBookModal';

export interface PrologueHandbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsult?: (text: string) => void;
}

const CHAPTER_TABS: BookChapterTab[] = [
  { id: 'lore', romanNumeral: 'Ⅰ', title: '샌추어리 로어 & 기원 (Sanctuary Lore)', shortLabel: '샌추어리 로어' },
  { id: 'sanctuaries', romanNumeral: 'Ⅱ', title: '7대 우주 샌추어리 안내 (7 Sanctuaries)', shortLabel: '7대 샌추어리' },
  { id: 'circadian', romanNumeral: 'Ⅲ', title: '24시 바이오리듬 & 시간 에너지 (Circadian Energy)', shortLabel: '시간 바이오리듬' },
  { id: 'bible', romanNumeral: 'Ⅳ', title: '루시 AI 코칭 & 질문 가이드 (AI Coaching & Ask)', shortLabel: '코칭 바이블' },
];

export const PROLOGUE_SANCTUARY_LORE = {
  title: 'PRISM Prologue Sanctuary Lore',
  motto: 'Traveler of Prologue · 모든 여정의 시작이자 조화로운 귀환지',
  description: 'PRISM 프롤로그는 일곱 개의 마음 공간으로 향하는 출발점입니다. 오늘의 기분과 에너지를 바탕으로 가장 필요한 여정을 안내하고, 대화·명상·창작·기록이 하나의 흐름으로 이어지도록 돕는 통합 홈 샌추어리입니다.',
  metrics: [
    { label: 'Cosmic Journey Alignment (우주 여정 정렬도)', val: 96, color: 'from-amber-400 to-orange-500' },
    { label: 'Multi-Sanctuary Resonance (7대 공간 공명 지수)', val: 93, color: 'from-orange-400 to-red-500' },
    { label: 'Soul Navigation Coherence (영혼 항법 일치율)', val: 95, color: 'from-red-400 to-amber-500' },
  ]
};

export const SEVEN_SANCTUARIES = [
  {
    id: 'prologue',
    name: '☀️ 프롤로그 (PROLOGUE)',
    role: '홈 허브 & 실시간 생체 조율',
    desc: '7대 샌추어리의 출발점이자 시간대별 생체 바이오리듬을 실시간으로 분석해 최적의 마음 공간을 연결합니다.',
    color: 'border-red-500/30 bg-red-500/10 text-red-300'
  },
  {
    id: 'orange',
    name: '🌲 오렌지 (ORANGE)',
    role: '1원칙 딥리즈닝 & 시크릿 소원 일기',
    desc: '1원칙 사고 기반 전략적 심층 분석과 론다 번의 3단계 끌어당김(Ask-Believe-Receive)으로 일상을 성찰합니다.',
    color: 'border-orange-500/30 bg-orange-500/10 text-orange-300'
  },
  {
    id: 'trinity',
    name: '✨ 트리니티 (TRINITY)',
    role: '천문 정밀 사주 & 운명 오라클',
    desc: '동양 천문 사주원국과 타로 주파수, 기적수업(ACIM) 원리를 통해 삶의 전환점과 개운법을 조망합니다.',
    color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
  },
  {
    id: 'aura',
    name: '⚡ 아우라 (AURA / HEAL)',
    role: '신체 웰니스 & 호흡 차크라',
    desc: '세도나 메서드와 호킨스 놓아버림 기법, 4-7-8 이완 호흡으로 누적된 피로를 풀고 신체 활력을 깨웁니다.',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  },
  {
    id: 'bluebird',
    name: '🐦 블루버드 (BLUEBIRD)',
    role: '소울 힐링 & 호오포노포노 정화',
    desc: '정본 호오포노포노 4대 정화 기도문과 18대 정화도구로 내면아이의 상처를 따뜻하게 보듬고 위로합니다.',
    color: 'border-sky-500/30 bg-sky-500/10 text-sky-300'
  },
  {
    id: 'muse',
    name: '🎶 뮤즈 (MUSE)',
    role: '창의 영감 & 아티스트 웨이',
    desc: '줄리아 카메론 모닝페이지, 감각적인 시와 카피라이팅, SCAMPER 발상법으로 창작의 장애물을 걷어냅니다.',
    color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
  },
  {
    id: 'epilogue',
    name: '🌙 에필로그 (EPILOGUE)',
    role: '통합 결산 & 5대 마스터 피날레',
    desc: '하루 동안 기록된 사주, 웰니스, 치유, 창작의 모든 발자취를 집대성하여 내일을 위한 에너지를 충전합니다.',
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-300'
  }
];

export const CIRCADIAN_ENERGY_GUIDE = [
  {
    slot: '아침 (06:00 ~ 12:00)',
    app: '✨ TRINITY (운명 오라클)',
    icon: Sun,
    action: '오늘의 사주 기운 확인 & 소울 주파수 세팅',
    desc: '맑은 아침에는 오늘의 에너지 흐름을 읽고 나에게 유리한 방향성과 태도를 설정하기에 가장 좋습니다.'
  },
  {
    slot: '오후 (12:00 ~ 18:00)',
    app: '🎶 MUSE (창작 영감) & 🌲 ORANGE (전략)',
    icon: Zap,
    action: '업무 집중, 1원칙 전략 수립 & 창의적 발상',
    desc: '두뇌 활동이 가장 활발한 시간대에는 막힌 프로젝트를 해결하고 신선한 아이디어를 도출합니다.'
  },
  {
    slot: '저녁 (18:00 ~ 22:00)',
    app: '🌲 ORANGE (성찰 일기) & ⚡ AURA (스트레칭)',
    icon: Clock,
    action: '오늘 하루 감사 일기 & 가벼운 그라운딩',
    desc: '일과를 마무리하며 시크릿 감사 노트를 적고 목과 어깨의 긴장을 풀어 신체를 안정시킵니다.'
  },
  {
    slot: '밤 (22:00 ~ 06:00)',
    app: '🐦 BLUEBIRD (내면아이 치유) & 🌙 EPILOGUE (결산)',
    icon: Moon,
    action: '호오포노포노 4문장 정화 & 숙면 이완 명상',
    desc: '하루의 피로와 복잡한 상념을 털어내고 "미안합니다, 용서하세요, 고맙습니다, 사랑합니다"로 영혼을 정화합니다.'
  }
];

export const PROLOGUE_COACHING_QUESTIONS = [
  {
    category: '오늘의 최적 여정 추천',
    question: '루시야, 지금 내 컨디션과 시간대에 가장 알맞은 샌추어리와 실천 루틴을 추천해줘.'
  },
  {
    category: '7대 우주 지능 시너지 코칭',
    question: '내 사주 운명과 현재 겪고 있는 스트레스를 융합해서 종합적인 해결 로드맵을 알려줘.'
  },
  {
    category: '바이오리듬 리셋',
    question: '머리가 무겁고 피로한데, 3분 만에 뇌를 리셋하고 활력을 되찾는 호흡법 가이드해줘.'
  },
  {
    category: '프롤로그의 영적 기원',
    question: '기적수업의 용서와 호오포노포노의 정화, 그리고 그노시스의 통찰을 하나로 엮어 설명해줘.'
  }
];

export function PrologueHandbookModal({
  isOpen,
  onClose,
  onConsult,
}: PrologueHandbookModalProps) {
  const [activeTabId, setActiveTabId] = useState<string>('lore');
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);

  const audiobookNarrations: Record<string, string> = {
    lore: `PRISM 프롤로그 샌추어리 로어. 프롤로그는 7대 마음 공간으로 향하는 성스러운 관문입니다. 오늘의 기분과 생체 바이오리듬을 바탕으로 가장 필요한 여정을 안내하고 영혼의 완전한 평화를 돕습니다.`,
    sanctuaries: `7대 우주 샌추어리 안내. 프롤로그의 관문, 오렌지의 1원칙 심층 사유, 트리니티의 운명 오라클, 아우라의 신체 웰니스, 블루버드의 소울 힐링, 뮤즈의 예술 창작, 에필로그의 종합 결산으로 완성됩니다.`,
    circadian: `24시간 생체 바이오리듬 가이드. 아침의 운명 세팅, 오후의 창작과 전략, 저녁의 성찰 일기, 밤의 정화와 숙면 명상으로 하루를 조화롭게 살아갑니다.`,
    bible: `루시 AI 코칭 바이블. 프롤로그의 지혜를 루시 프로와 함께 나누며 당신만의 맞춤형 성찰과 통찰을 경험하세요.`,
  };

  const handleAskQuestion = (questionText: string) => {
    if (onConsult) {
      onConsult(questionText);
      onClose();
    }
  };

  return (
    <RealBookModal
      isOpen={isOpen}
      onClose={onClose}
      theme="prologue"
      bookTitle="Prologue Codex"
      bookSubtitle="7대 우주 샌추어리 총람 & 24시 바이오리듬 가이드"
      bookAuthor="PRISM Prologue Lore Master"
      epigraphQuote="모든 위대한 여정은 내면을 향한 고요한 첫걸음에서 시작된다."
      epigraphSource="PRISM Sanctuary Charter"
      chapterTabs={CHAPTER_TABS}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      audiobookNarrations={audiobookNarrations}
      defaultVoice="Kore"
    >
      {/* Chapter Ⅰ: 샌추어리 로어 */}
      {activeTabId === 'lore' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-red-500/10 via-amber-500/5 to-transparent border border-red-500/20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.3)]">
              <Sun className="text-red-500 animate-pulse" size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-sans text-white tracking-tight">
                {PROLOGUE_SANCTUARY_LORE.title}
              </h3>
              <p className="text-[11px] text-amber-300 font-bold uppercase tracking-widest">
                {PROLOGUE_SANCTUARY_LORE.motto}
              </p>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-sans text-left break-keep bg-black/30 p-4 rounded-2xl border border-white/5">
              {PROLOGUE_SANCTUARY_LORE.description}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>우주 정렬 및 조화 지표 (Sanctuary Alignment)</span>
            </h4>
            <div className="space-y-3">
              {PROLOGUE_SANCTUARY_LORE.metrics.map((m) => (
                <div key={m.label} className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-sans">
                    <span className="text-white/70">{m.label}</span>
                    <span className="text-amber-400 font-mono font-bold">{m.val}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full bg-gradient-to-r ${m.color}`} style={{ width: `${m.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chapter Ⅱ: 7대 우주 샌추어리 */}
      {activeTabId === 'sanctuaries' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="text-xs text-white/60 mb-2">
            프리즘의 각 채널은 서로 유기적으로 연결되어 당신의 영혼과 일상을 입체적으로 지원합니다.
          </div>
          <div className="grid grid-cols-1 gap-3">
            {SEVEN_SANCTUARIES.map((s) => (
              <div key={s.id} className={`p-4 rounded-2xl border ${s.color} space-y-1.5 transition-all hover:scale-[1.01]`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-sans text-white">{s.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/90">
                    {s.role}
                  </span>
                </div>
                <p className="text-[11px] text-white/75 leading-relaxed font-sans break-keep">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter Ⅲ: 시간 바이오리듬 */}
      {activeTabId === 'circadian' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="text-xs text-white/60 mb-2">
            하루 24시간의 에너지 리듬에 맞춰 가장 효과적인 샌추어리 여정을 선택하세요.
          </div>
          <div className="space-y-3">
            {CIRCADIAN_ENERGY_GUIDE.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.slot} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Icon size={15} className="text-red-400" />
                    <span>{g.slot}</span>
                    <span className="text-[10px] text-white/40 ml-auto font-mono">{g.app}</span>
                  </div>
                  <div className="text-xs text-white font-semibold flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-400" />
                    <span>{g.action}</span>
                  </div>
                  <p className="text-[11px] text-white/65 leading-relaxed font-sans break-keep pl-5">
                    {g.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapter Ⅳ: 코칭 바이블 & 질문 가이드 */}
      {activeTabId === 'bible' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-amber-200/90 leading-relaxed font-sans">
            💡 아래 질문을 클릭하시면 **루시 AI 프로**로 즉시 연결되어 맞춤형 심층 가이드를 받을 수 있습니다.
          </div>
          <div className="space-y-2.5">
            {PROLOGUE_COACHING_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q.question)}
                className="w-full text-left p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/40 transition-all group flex items-start gap-3 cursor-pointer shadow-xs active:scale-98"
              >
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                    {q.category}
                  </div>
                  <div className="text-xs text-white group-hover:text-amber-200 font-sans leading-relaxed break-keep">
                    "{q.question}"
                  </div>
                </div>
                <ChevronRight size={15} className="text-white/30 group-hover:text-amber-400 transition-colors shrink-0 mt-2" />
              </button>
            ))}
          </div>
        </div>
      )}
    </RealBookModal>
  );
}
