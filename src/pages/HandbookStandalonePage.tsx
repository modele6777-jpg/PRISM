import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  TreeDeciduous,
  Activity,
  Bird,
  Music,
  Moon,
  Sun,
  ChevronRight,
  Search,
  CheckCircle,
  Lightbulb,
  KeyRound,
  Gift,
  Feather,
  Heart,
  Zap,
  Award,
  Star,
  Check,
  Radio,
  Compass,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { playTTS, stopTTS, subscribeTTS } from '@/utils/tts';
import { safeSessionStorage } from '@/utils/safeStorage';
import { useNarrowPhone } from '@/hooks/useNarrowPhone';
import { isLegacyMobile } from '@/lib/perfMode';

// 🌈 7 PRISM Channels
export type HandbookChannel = 'prologue' | 'orange' | 'trinity' | 'aura' | 'bluebird' | 'muse' | 'epilogue';

const ALL_CHANNELS: {
  id: HandbookChannel;
  name: string;
  badge: string;
  icon: any;
  borderActive: string;
  bgActive: string;
  textActive: string;
  dotColor: string;
}[] = [
  {
    id: 'prologue',
    name: '프롤로그',
    badge: '전체 가이드',
    icon: Sun,
    borderActive: 'border-red-500',
    bgActive: 'bg-red-500/20 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.35)]',
    textActive: 'text-red-300',
    dotColor: 'bg-red-500',
  },
  {
    id: 'orange',
    name: '오렌지',
    badge: '시크릿 딥리즈닝',
    icon: TreeDeciduous,
    borderActive: 'border-orange-500',
    bgActive: 'bg-orange-500/20 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.35)]',
    textActive: 'text-orange-300',
    dotColor: 'bg-orange-500',
  },
  {
    id: 'trinity',
    name: '트리니티',
    badge: '사주·기적수업',
    icon: Sparkles,
    borderActive: 'border-amber-400',
    bgActive: 'bg-amber-400/20 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.35)]',
    textActive: 'text-amber-300',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'aura',
    name: '아우라',
    badge: '세도나 웰니스',
    icon: Activity,
    borderActive: 'border-emerald-500',
    bgActive: 'bg-emerald-500/20 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    textActive: 'text-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'bluebird',
    name: '블루버드',
    badge: '호오포노포노 힐링',
    icon: Bird,
    borderActive: 'border-blue-500',
    bgActive: 'bg-blue-500/20 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.35)]',
    textActive: 'text-blue-300',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'muse',
    name: '뮤즈',
    badge: '아티스트 창작',
    icon: Music,
    borderActive: 'border-indigo-500',
    bgActive: 'bg-indigo-500/20 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.35)]',
    textActive: 'text-indigo-300',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'epilogue',
    name: '에필로그',
    badge: '소울 결산 피날레',
    icon: Moon,
    borderActive: 'border-purple-500',
    bgActive: 'bg-purple-500/20 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    textActive: 'text-purple-300',
    dotColor: 'bg-purple-500',
  },
];

interface ChapterData {
  id: string;
  roman: string;
  title: string;
  shortLabel: string;
  description: string;
  narration: string;
  sections: {
    title: string;
    subtitle?: string;
    icon?: any;
    principles?: string[];
    steps?: string[];
    details?: string;
  }[];
  coachingQuestions?: {
    category: string;
    question: string;
    personaTarget: string;
  }[];
}

interface HandbookUniverse {
  title: string;
  subtitle: string;
  author: string;
  epigraph: string;
  source: string;
  accentGlow: string;
  chapters: ChapterData[];
}

const HANDBOOK_DATA: Record<HandbookChannel, HandbookUniverse> = {
  prologue: {
    title: 'PRISM Prologue Guidebook',
    subtitle: 'PRISM 7대 우주 공간 완전 가이드 & 사용법 총람',
    author: 'PRISM Master Guide',
    epigraph: '모든 위대한 여정은 내면을 향한 고요한 첫걸음에서 시작된다.',
    source: 'PRISM Universal Charter',
    accentGlow: 'rgba(239, 68, 68, 0.25)',
    chapters: [
      {
        id: 'usage',
        roman: 'Ⅰ',
        title: '사용법 & 시작하기 (Usage & Guide)',
        shortLabel: '사용법 안내',
        description: 'PRISM의 시작부터 7대 공간 이동, 프로필 설정 및 안전한 멀티 디바이스 동기화 안내입니다.',
        narration: 'PRISM 가이드북. 대화, 상징, 사주 리딩, 웰니스, 호흡, 창작, 기록이 하나의 유기적인 흐름으로 이어지는 옴니버스 영혼 탐색 앱입니다.',
        sections: [
          {
            title: '1단계: 시작하기 & 프로필 설정',
            details: 'Google 로그인 후 4자리 PIN으로 안전하게 접속합니다. 에필로그(프로필) 탭에서 이름, 생년월일, 관심사를 입력하면 사주·타로·음악·대화가 당신에게 100% 맞춤화됩니다.',
          },
          {
            title: '2단계: 화면 구조 & 일곱 공간',
            details: '☀️ PROLOGUE(통합 허브), 🌲 ORANGE(1원칙·시크릿 일기), ✨ TRINITY(사주·타로), ⚡ AURA(웰니스·호흡), 🐦 BLUEBIRD(호오포노포노 치유), 🎶 MUSE(창작 영감), 🌙 EPILOGUE(프로필·결산).',
          },
          {
            title: '3단계: 루시 AI 프로 교감',
            details: '각 화면 우측 하단 💬 버튼을 누르면 5대 영역 멀티버스 지능을 탑재한 루시 AI 프로와 실시간으로 깊이 있는 대화를 나눌 수 있습니다.',
          },
          {
            title: '4단계: 영구 보존 & 멀티 디바이스 동기화',
            details: '작성하신 모든 프로필과 대화는 10중 Profile Vault 및 클라우드에 영구 보존되며 PC와 모바일 어디서나 실시간으로 동기화됩니다.',
          },
        ],
      },
      {
        id: 'sanctuaries',
        roman: 'Ⅱ',
        title: '7대 우주 공간별 안내 (7 Sanctuaries)',
        shortLabel: '7대 공간 안내',
        description: '프리즘의 7개 공간이 지닌 고유한 목적과 시너지 효과를 소개합니다.',
        narration: '7대 우주 공간별 완전 안내. 프롤로그의 관문부터 오렌지, 트리니티, 아우라, 블루버드, 뮤즈, 에필로그까지 당신의 삶을 입체적으로 가이드합니다.',
        sections: [
          {
            title: '☀️ PROLOGUE (프롤로그)',
            subtitle: '통합 홈 허브 & 바이오리듬 조율',
            details: '오늘의 기분과 생체 에너지를 분석하여 가장 알맞은 샌추어리를 추천하고, 전체 우주 여정의 중심을 잡아줍니다.',
          },
          {
            title: '🌲 ORANGE (오렌지)',
            subtitle: '1원칙 딥리즈닝 & 론다 번 시크릿 소원 일기',
            details: '끌어당김의 법칙 3단계(Ask·Believe·Receive)와 소원의 우물, 감성 일지를 통해 현실을 주도적으로 창조합니다.',
          },
          {
            title: '✨ TRINITY (트리니티)',
            subtitle: '천문 정밀 사주 & 운명 오라클 & 기적수업',
            details: '정밀 만세력 사주원국, 타로 주파수 리딩, 기적수업(ACIM) 용서의 원리로 삶의 전환점과 개운법을 밝힙니다.',
          },
          {
            title: '⚡ AURA (아우라 / HEAL)',
            subtitle: '신체 웰니스 & 세도나 방하착 & 4-7-8 이완',
            details: '누적된 신체 피로를 풀고, 세도나 메서드 4문답과 데이비드 호킨스 놓아버림 기법으로 가슴의 저항을 녹여냅니다.',
          },
          {
            title: '🐦 BLUEBIRD (블루버드)',
            subtitle: '소울 힐링 & 호오포노포노 4대 정화',
            details: '하와이 전통 정화법과 18대 정화도구로 내면아이(우니히피리)의 상처를 따뜻하게 보듬고 제로 상태로 돌아갑니다.',
          },
          {
            title: '🎶 MUSE (뮤즈)',
            subtitle: '창작 영감 & 줄리아 카메론 아티스트 웨이',
            details: '모닝페이지, 시적 감성 카피라이팅, SCAMPER 발상법, 음악·미술 추천으로 창작의 벽을 허뭅니다.',
          },
          {
            title: '🌙 EPILOGUE (에필로그)',
            subtitle: '소울 프로필 관리 & 하루의 종합 결산',
            details: '기본 정보부터 운명·음악·심리·예술 취향을 총망라하여 관리하며, 하루의 모든 발자취를 집대성합니다.',
          },
        ],
      },
      {
        id: 'routes',
        roman: 'Ⅲ',
        title: '상황별 추천 루트 (Recommended Routes)',
        shortLabel: '추천 루트',
        description: '당신의 오늘 컨디션과 필요에 맞춘 최적의 여정 가이드입니다.',
        narration: '상황별 추천 루트. 마음이 복잡할 때, 결정이 필요할 때, 신체가 피로할 때, 창작이 필요할 때 최적의 여정을 안내합니다.',
        sections: [
          {
            title: '마음이 복잡하고 불안할 때',
            subtitle: 'PROLOGUE ➔ BLUEBIRD ➔ AURA',
            details: '호오포노포노 4대 문장으로 무의식을 정화하고, 4-7-8 이완 호흡으로 교감신경을 안정시키세요.',
          },
          {
            title: '중요한 결정이나 방향이 필요할 때',
            subtitle: 'TRINITY ➔ ORANGE ➔ 실천 계획',
            details: '사주 대운과 타로 직관 메시지를 융합한 뒤, 1원칙 사고로 본질적인 리스크와 지렛대를 파악하세요.',
          },
          {
            title: '몸이 피로하고 에너지가 방전되었을 때',
            subtitle: 'AURA ➔ 힐링 음악 ➔ EPILOGUE',
            details: '신체 긴장을 풀고 온몸을 이완하는 수면 명상과 함께 하루를 평온하게 매듭지으세요.',
          },
          {
            title: '창작 아이디어가 막혔을 때',
            subtitle: 'MUSE ➔ ORANGE 비전보드',
            details: '검열관을 끄고 모닝페이지를 자유롭게 작성한 뒤, 시각적 자극으로 잠재의식을 깨우세요.',
          },
        ],
      },
      {
        id: 'prologue_coach',
        roman: 'Ⅳ',
        title: '루시 AI 프로 코칭 (AI Coaching & Ask)',
        shortLabel: 'AI 코칭 질문',
        description: '원터치로 루시 AI 프로와 즉시 1:1 대화를 나눌 수 있는 핵심 질문 모음입니다.',
        narration: '루시 AI 프로 코칭 가이드. 루시 프로와 함께 질문을 던지며 당신만의 통찰을 경험하세요.',
        sections: [],
        coachingQuestions: [
          {
            category: '초보자를 위한 맞춤 안내',
            question: '루시야, PRISM을 처음 쓰는데 오늘 내 상황에 맞게 10분 추천 코스를 안내해줘.',
            personaTarget: 'lucy',
          },
          {
            category: '7대 우주 지능 시너지 코칭',
            question: '내 사주와 현재 고민을 결합해서 오늘 꼭 실천해야 할 한 가지 핵심 행동을 알려줘.',
            personaTarget: 'lucy',
          },
          {
            category: '멘탈 & 감정 릴리즈',
            question: '답답하고 복잡한 마음을 3단계로 빠르게 정화하고 평온을 되찾는 법 알려줘.',
            personaTarget: 'bluebird',
          },
          {
            category: '창작 & 영감 발현',
            question: '지금 막힌 프로젝트나 고민을 1원칙 사고와 아티스트 웨이 관점으로 풀어줘.',
            personaTarget: 'muse',
          },
        ],
      },
    ],
  },
  orange: {
    title: 'The Secret Golden Manuscript',
    subtitle: '론다 번의 시크릿 3단계 창조 & 1원칙 딥리즈닝 바이블',
    author: 'Rhonda Byrne & First Principles Master',
    epigraph: '내면이 그러하듯 외부도 그러하며, 생각과 감정이 현실을 창조한다.',
    source: 'The Secret & Hermes Trismegistus',
    accentGlow: 'rgba(249, 115, 22, 0.25)',
    chapters: [
      {
        id: 'creation',
        roman: 'Ⅰ',
        title: '3단계 창조 공식 (Ask · Believe · Receive)',
        shortLabel: '창조 공식',
        description: '소원을 우주에 요청하고, 확신으로 믿으며, 기쁨으로 수신하는 3단계 절대 공식입니다.',
        narration: '3단계 창조 공식. 요청하고, 믿고, 받으라. 우주는 당신이 진정으로 느끼는 주파수에 완벽히 응답합니다.',
        sections: [
          {
            title: '1. Ask (명확한 요청)',
            principles: [
              '우주는 모호한 생각에는 응답하지 않습니다. 원하는 것을 구체적인 문장으로 적으세요.',
              '원하지 않는 결핍이 아니라, 오직 원하는 풍요에만 주의를 집중하세요.',
              '이미 이루어진 것처럼 현재완료형으로 감사를 표하세요.',
            ],
            steps: ['소원을 종이에 적기', '부정어 배제하기', '현재 시제로 선언하기'],
          },
          {
            title: '2. Believe (흔들림 없는 믿음)',
            principles: [
              '물리적 눈앞에 보이기 전에 영적 차원에서 이미 완성되었음을 아는 것입니다.',
              '‘어떻게(How)’ 이루어질지는 우주의 몫이므로 당신이 통제하려 하지 마세요.',
              '의심과 불안이 올라올 때는 즉시 감사의 마음으로 주파수를 전환하세요.',
            ],
            steps: ['보이지 않아도 확신하기', '통제 내려놓기', '의심을 감사로 바꾸기'],
          },
          {
            title: '3. Receive (감사의 수신)',
            principles: [
              '소원이 실제로 이루어졌을 때 느낄 벅찬 감격과 환희를 지금 미리 느끼세요.',
              '감사는 받는 주파수에 접속하는 가장 빠르고 강력한 열쇠입니다.',
              '내면의 영감이 떠오를 때 가벼운 마음으로 기쁘게 즉각 행동하세요.',
            ],
            steps: ['벅찬 감정 미리 느끼기', '매일 밤 감사 돌 쥐기', '영감에 즉각 행동하기'],
          },
        ],
      },
      {
        id: 'tools',
        roman: 'Ⅱ',
        title: '10가지 시크릿 실천 도구 (Secret Tools)',
        shortLabel: '실천 도구',
        description: '일상에서 잠재의식을 프로그래밍하고 주파수를 급상승시키는 10대 도구입니다.',
        narration: '시크릿 10대 실천 도구. 비전보드, 감사의 돌, 시크릿 시프터, 수표 명상으로 주파수를 고정하세요.',
        sections: [
          {
            title: '1. 비전보드 (Vision Board)',
            details: '원하는 집, 꿈, 여행지 사진을 매일 눈에 띄는 곳에 배치하여 시각적 자극으로 잠재의식을 각인합니다.',
          },
          {
            title: '2. 감사의 돌 (Magic Rock)',
            details: '침대 머리맡에 작은 조약돌을 두고, 매일 밤 잠들기 전 돌을 쥐며 하루 중 가장 감사했던 일 3가지를 되뇝니다.',
          },
          {
            title: '3. 시크릿 시프터 (Secret Shifters)',
            details: '기분이 다운될 때 좋아하는 음악, 반려동물 생각, 아름다운 추억을 떠올려 1분 만에 주파수를 전환합니다.',
          },
          {
            title: '4. 우주 은행 풍요 수표 (Magic Check)',
            details: '원하는 금액을 수표에 적어 지갑에 넣고, 이미 그 돈을 풍요롭게 소유하고 기쁘게 쓰는 상상을 합니다.',
          },
        ],
      },
      {
        id: 'laws',
        roman: 'Ⅲ',
        title: '우주 4대 절대 법칙 (Universal Laws)',
        shortLabel: '우주 법칙',
        description: '끌어당김의 법칙, 상응의 법칙, 진동의 법칙, 극성의 법칙에 대한 심층 해설입니다.',
        narration: '우주 4대 절대 법칙. 내면의 진동수가 곧 현실의 물질을 구성하는 양자역학적 원리입니다.',
        sections: [
          {
            title: '1. 진동의 법칙 (Law of Vibration)',
            details: '우주의 모든 것은 에너지이며 일정한 주파수로 진동합니다. 비슷한 진동수를 가진 것끼리 서로 끌어당깁니다.',
          },
          {
            title: '2. 상응의 법칙 (Law of Correspondence)',
            details: '내면이 그러하듯 외부도 그러합니다. 현실을 바꾸려면 외부를 탓하지 말고 내면의 의식을 먼저 전환해야 합니다.',
          },
        ],
      },
      {
        id: 'orange_coach',
        roman: 'Ⅳ',
        title: '시크릿 AI 코칭 바이블 (Secret Bible)',
        shortLabel: 'AI 코칭 질문',
        description: '루시 AI 프로(오렌지 딥리즈닝 모드)와 함께 1:1로 끌어당김을 코칭받으세요.',
        narration: '시크릿 코칭 바이블. 루시 프로와 질문을 나누며 풍요의 주파수를 즉시 동조하세요.',
        sections: [],
        coachingQuestions: [
          {
            category: '끌어당김 문장 최적화',
            question: '루시야, 내 소원을 우주가 가장 강력하게 응답하는 현재완료형 시크릿 문장으로 정제해줘.',
            personaTarget: 'orange',
          },
          {
            category: '의심과 저항 해소',
            question: '소원을 바랄 때 마음 한구석에서 불안과 의심이 올라오는데, 이를 녹여내는 팁을 줘.',
            personaTarget: 'orange',
          },
          {
            category: '1원칙 딥리즈닝 분해',
            question: '내가 겪고 있는 비즈니스/커리어 병목 현상을 1원칙 사고로 근본부터 분석해줘.',
            personaTarget: 'orange',
          },
        ],
      },
    ],
  },
  trinity: {
    title: 'A Course in Miracles & Celestial Oracle Codex',
    subtitle: '기적수업(ACIM) 3대 원리 & 천문 정밀 사주원국 바이블',
    author: 'Helen Schucman & Celestial Oracle Master',
    epigraph: '실재하는 것은 위협받을 수 없으며, 실재하지 않는 것은 존재하지 않는다.',
    source: 'A Course in Miracles (ACIM)',
    accentGlow: 'rgba(234, 179, 8, 0.25)',
    chapters: [
      {
        id: 'acim',
        roman: 'Ⅰ',
        title: '기적수업(ACIM) 3대 원리 (Miracles Principles)',
        shortLabel: '기적수업 원리',
        description: '에고의 분리 환상을 꿰뚫고 참된 용서와 거룩한 마음의 평화를 되찾는 가르침입니다.',
        narration: '기적수업 3대 원리. 모든 판단을 내려놓고 참된 용서를 베풀 때, 어둠 속에서 신성의 빛이 찬란히 드러납니다.',
        sections: [
          {
            title: '1. 참된 용서 (True Forgiveness)',
            principles: [
              '상대방이 나에게 죄를 지었다고 믿는 에고의 착각을 내려놓습니다.',
              '모든 공격은 공격이 아니라 오직 사랑을 청하는 외침(Call for Love)임을 봅니다.',
              '용서는 타인을 위한 시혜가 아니라, 내 마음의 구속을 푸는 유일한 열쇠입니다.',
            ],
            steps: ['판단 멈추기', '사랑을 청하는 외침 보기', '마음의 짐 내려놓기'],
          },
          {
            title: '2. 거룩한 관계 (Holy Relationship)',
            principles: [
              '조건부 거래와 결핍을 채우려는 특별한 관계(Special Relationship)를 내려놓습니다.',
              '성령께 관계를 헌정하여 서로의 신성을 일깨우는 거룩한 통로로 전환합니다.',
            ],
            steps: ['기대와 집착 내려놓기', '관계 성별하기', '서로의 빛 축복하기'],
          },
        ],
      },
      {
        id: 'saju',
        roman: 'Ⅱ',
        title: '천문 정밀 사주 & 10대 명리 비결',
        shortLabel: '사주 비결',
        description: '동양 천문 사주원국, 십신, 용신 및 대운의 흐름을 읽는 지혜입니다.',
        narration: '사주 명리 비결. 타고난 그릇과 계절을 알고 물 흐르듯 순응하며 운의 흐름을 주도하세요.',
        sections: [
          {
            title: '1. 일간(日干) 본원의 기운',
            details: '갑·을·병·정·무·기·경·신·임·계 10간의 본질과 나에게 필요한 오행의 조후를 맞춥니다.',
          },
          {
            title: '2. 용신과 개운법',
            details: '사주의 치우친 에너지를 중화하는 용신(用神)을 일상 색상, 음식, 장소, 마음가짐으로 보완합니다.',
          },
        ],
      },
      {
        id: 'tarot_gnosis',
        roman: 'Ⅲ',
        title: '타로 주파수 & 영지주의 그노시스',
        shortLabel: '타로·그노시스',
        description: '메이저 아르카나 22장의 상징성과 내면의 신성한 불꽃을 깨우는 영적 통찰입니다.',
        narration: '타로와 그노시스. 물질계의 착각을 꿰뚫고 참된 지혜의 빛으로 영혼을 각성하세요.',
        sections: [
          {
            title: '1. 0번 바보(The Fool)부터 21번 세계(The World)',
            details: '영혼이 무한한 잠재력으로 여정을 시작하여 완전한 통합에 이르는 22단계의 영웅 서사입니다.',
          },
          {
            title: '2. 그노시스(Gnosis)의 앎',
            details: '외부의 교리나 맹신이 아닌, 내면에서 직접 체험되는 직접적이고 신성한 통찰입니다.',
          },
        ],
      },
      {
        id: 'trinity_coach',
        roman: 'Ⅳ',
        title: '트리니티 AI 코칭 바이블 (Oracle Bible)',
        shortLabel: 'AI 코칭 질문',
        description: '루시 AI 프로(트리니티 오라클 모드)와 함께 사주와 영적 해답을 구하세요.',
        narration: '트리니티 오라클 코칭. 운명의 전환점과 오늘 나를 지켜주는 우주적 조언을 들으세요.',
        sections: [],
        coachingQuestions: [
          {
            category: '사주 운세 & 타이밍',
            question: '루시야, 내 사주 원국을 바탕으로 현재 시기에 가장 유리한 개운 행동과 방향을 알려줘.',
            personaTarget: 'trinity',
          },
          {
            category: '기적수업 참된 용서',
            question: '특정 사람 때문에 가슴이 답답하고 화가 나는데, 기적수업의 용서 관점으로 치유해줘.',
            personaTarget: 'trinity',
          },
        ],
      },
    ],
  },
  aura: {
    title: 'Sedona & Letting Go Grimoire',
    subtitle: '레스터 레븐슨 세도나 메서드 & 데이비드 호킨스 놓아버림 바이블',
    author: 'Lester Levenson & David R. Hawkins',
    epigraph: '집착과 저항을 놓아버릴 때, 본래 완전한 자유와 평화가 드러난다.',
    source: 'The Sedona Method & Letting Go',
    accentGlow: 'rgba(16, 185, 129, 0.25)',
    chapters: [
      {
        id: 'sedona',
        roman: 'Ⅰ',
        title: '세도나 메서드 4문답 방하착 (Sedona 4 Questions)',
        shortLabel: '세도나 4문답',
        description: '내면의 부정적 감정을 있는 그대로 인정하고 순식간에 흘려보내는 4대 질문입니다.',
        narration: '세도나 메서드 4문답. 지금 이 느낌을 환영할 수 있는가? 놓아버릴 수 있는가? 놓아버리겠는가? 언제? 지금!',
        sections: [
          {
            title: '세도나 4문답 실천 공식',
            principles: [
              '1. 지금 이 느낌(불안, 분노, 슬픔)을 있는 그대로 알아차리고 느낄 수 있는가? (Could I welcome it?)',
              '2. 이 느낌을 그냥 흘려보낼 수 있는가? (Could I let it go?)',
              '3. 이 느낌을 흘려보내겠는가? (Would I let it go?)',
              '4. 언제? (When?) ➔ 지금 당장! (Now!)',
            ],
            steps: ['감정 알아차리기', '저항 없이 환영하기', '흘려보내기', '지금 당장 결단하기'],
          },
        ],
      },
      {
        id: 'hawkins',
        roman: 'Ⅱ',
        title: '데이비드 호킨스 의식 레벨 & 놓아버림',
        shortLabel: '호킨스 놓아버림',
        description: '수치심, 죄책감, 무기력의 낮은 주파수에서 용기와 사랑, 평화의 높은 의식으로 도약하는 비결입니다.',
        narration: '호킨스 놓아버림. 감정에 이름을 붙이거나 스토리를 만들지 말고, 신체적 에너지 전압만 고요히 지켜보세요.',
        sections: [
          {
            title: '생각을 끄고 물리적 감각만 바라보기',
            details: '감정에 꼬리를 무는 생각(왜 나한테 이런 일이...)을 완전히 멈추고, 가슴이나 목구멍에 느껴지는 물리적 압박감만 저항 없이 지켜보면 수분 내에 에너지가 소진됩니다.',
          },
        ],
      },
      {
        id: 'vitality',
        roman: 'Ⅲ',
        title: '4-7-8 이완 호흡 & 신체 웰니스',
        shortLabel: '호흡·웰니스',
        description: '미주신경을 자극하여 3분 만에 부교감신경을 활성화하는 과학적 이완 루틴입니다.',
        narration: '4-7-8 호흡법. 4초 들이쉬고, 7초 멈추고, 8초 천천히 내쉬며 온몸의 긴장을 날려버리세요.',
        sections: [
          {
            title: '4-7-8 호흡 사이클',
            details: '코로 4초간 숨을 들이쉬고 ➔ 7초간 숨을 멈춘 뒤 ➔ 입으로 8초간 길게 후- 내쉽니다. 4회 반복하면 뇌파가 안정됩니다.',
          },
        ],
      },
      {
        id: 'aura_coach',
        roman: 'Ⅳ',
        title: '세도나 AI 코칭 바이블 (Sedona Bible)',
        shortLabel: 'AI 코칭 질문',
        description: '루시 AI 프로(아우라 웰니스 모드)와 함께 신체 긴장과 감정 저항을 푸세요.',
        narration: '아우라 웰니스 코칭. 지금 몸에 쌓인 스트레스를 실시간으로 방하착하세요.',
        sections: [],
        coachingQuestions: [
          {
            category: '감정 즉각 릴리즈',
            question: '루시야, 미래에 대한 생존 불안과 통제 욕구를 세도나 4문답으로 즉시 릴리즈하는 가이드해줘.',
            personaTarget: 'aura',
          },
          {
            category: '숙면 이완 호흡',
            question: '오늘 밤 잡념을 끄고 깊은 숙면에 빠져들 수 있는 5분 바디스캔 명상 가이드해줘.',
            personaTarget: 'aura',
          },
        ],
      },
    ],
  },
  bluebird: {
    title: 'Hoʻoponopono Sacred Codex',
    subtitle: '정본 하와이 전통 호오포노포노 & 18대 정화도구 바이블',
    author: 'Morrnah Simeona & Dr. Ihaleakala Hew Len',
    epigraph: '모든 평화는 나로부터 시작된다. 내 기억을 100% 책임지고 정화할 때 세상이 치유된다.',
    source: 'Hoʻoponopono & Zero Limits',
    accentGlow: 'rgba(59, 130, 246, 0.25)',
    chapters: [
      {
        id: 'four_phrases',
        roman: 'Ⅰ',
        title: '4대 신성 정화 기도문 (4 Sacred Phrases)',
        shortLabel: '4대 정화 기도문',
        description: '잠재의식(우니히피리)에 재생되는 해묵은 고통의 기억을 신성에 맡겨 영점으로 되돌리는 기도입니다.',
        narration: '호오포노포노 4대 기도문. 미안합니다, 용서하세요, 고맙습니다, 사랑합니다. 끊임없이 되뇌어 제로로 돌아가세요.',
        sections: [
          {
            title: '4대 정화의 핵심 진실',
            principles: [
              '1. 미안합니다 (I am sorry): 내 무의식의 어떤 기억이 이 문제를 일으켰는지 알아차리지 못해 미안합니다.',
              '2. 용서하세요 (Please forgive me): 이 무의식의 기억을 신성에 맡기지 않고 붙잡고 있었음을 용서하세요.',
              '3. 고맙습니다 (Thank you): 이 기억을 드러내어 정화할 기회를 주셔서 진심으로 감사합니다.',
              '4. 사랑합니다 (I love you): 기억이 지워진 자리에 신성의 무조건적인 사랑을 채웁니다.',
            ],
            steps: ['100% 내 책임 인정하기', '4문장 속으로 반복하기', '결과를 신성에 맡기기'],
          },
        ],
      },
      {
        id: 'tools_18',
        roman: 'Ⅱ',
        title: '18가지 신성 정화 도구 (18 Cleaning Tools)',
        shortLabel: '18대 정화 도구',
        description: '일상에서 손쉽게 활용할 수 있는 정본 호오포노포노 정화 도구들입니다.',
        narration: '호오포노포노 18대 정화 도구. 파란 유리병의 블루 솔라 워터, 지우개 달린 연필, 이슬방울, 아이스블루.',
        sections: [
          {
            title: '1. 블루 솔라 워터 (Blue Solar Water)',
            details: '파란 유리병에 물을 담아 햇빛에 1시간 이상 둔 뒤 마시면 세포 단위의 무의식 기억이 정화됩니다.',
          },
          {
            title: '2. 지우개 달린 연필 (Eraser Pencil)',
            details: '연필 끝의 지우개로 고민이 적힌 종이나 물건을 톡톡 두드리며 "드롭포인트(Drop Point)"를 되뇝니다.',
          },
          {
            title: '3. 아이스블루 (Ice Blue)',
            details: '육체적 통증이나 영적 고통이 느껴질 때 녹색 식물을 어루만지며 "아이스블루"를 속삭입니다.',
          },
        ],
      },
      {
        id: 'unihipili',
        roman: 'Ⅲ',
        title: '내면아이(우니히피리) 소통 & 모르나의 기도',
        shortLabel: '내면아이 치유',
        description: '태초부터 지금까지 모든 기억을 간직해온 내 안의 소중한 아이를 사랑으로 보듬는 법입니다.',
        narration: '내면아이 우니히피리와의 소통. 아이를 다정하게 안아주고 함께 정화할 때 진정한 기적이 시작됩니다.',
        sections: [
          {
            title: '모르나 날라마쿠 시메오나의 개벽 기도문',
            details: '창조주여, 아버지와 어머니와 자식이 하나인 신성이시여... 나와 내 가족, 조상들이 지은 모든 부정적 기억을 지우시고 순수한 빛으로 채워주소서.',
          },
        ],
      },
      {
        id: 'bluebird_coach',
        roman: 'Ⅳ',
        title: '호오포노포노 AI 코칭 바이블',
        shortLabel: 'AI 코칭 질문',
        description: '루시 AI 프로(블루버드 소울 힐링 모드)와 함께 따뜻한 치유 대화를 나누세요.',
        narration: '블루버드 힐링 코칭. 내면아이를 토닥이고 가슴속 상처를 온전히 정화하세요.',
        sections: [],
        coachingQuestions: [
          {
            category: '내면아이 안아주기',
            question: '루시야, 내 안의 작은 아이(우니히피리)를 안아주며 정화하는 5분 손편지 써줘.',
            personaTarget: 'bluebird',
          },
          {
            category: '인간관계 트라우마 정화',
            question: '특정 사람 때문에 억울하고 원망스러운 마음이 드는데, 100% 정화하는 법 가이드해줘.',
            personaTarget: 'bluebird',
          },
        ],
      },
    ],
  },
  muse: {
    title: 'The Artist’s Way Grimoire',
    subtitle: '줄리아 카메론 아티스트 웨이 12주 창조성 회복 바이블',
    author: 'Julia Cameron & Muse Master',
    epigraph: '창조성은 우주가 우리에게 준 선물이며, 우리의 창조는 우주에 보내는 답례이다.',
    source: 'The Artist’s Way',
    accentGlow: 'rgba(99, 102, 241, 0.25)',
    chapters: [
      {
        id: 'artist_tools',
        roman: 'Ⅰ',
        title: '3대 기본 도구 (Morning Pages & Artist Date)',
        shortLabel: '3대 기본 도구',
        description: '창작의 검열관을 무력화하고 영혼의 우물에 물을 긷는 3대 핵심 실천 도구입니다.',
        narration: '아티스트 웨이 3대 도구. 매일 아침의 모닝페이지, 주 1회의 아티스트 데이트, 20분의 걷기.',
        sections: [
          {
            title: '1. 모닝페이지 (Morning Pages)',
            principles: [
              '매일 아침 눈뜨자마자 의식의 흐름대로 3쪽을 쉬지 않고 적습니다.',
              '잘 쓸 필요도 없고, 누구에게 보여줄 글도 아닙니다. 뇌의 찌꺼기를 배출하는 정신의 와이퍼입니다.',
            ],
            steps: ['아침에 침대 맡에서 쓰기', '검열 없이 쏟아내기', '다시 읽지 않기'],
          },
          {
            title: '2. 아티스트 데이트 (Artist Date)',
            principles: [
              '주 1회, 혼자서 오롯이 내면의 아티스트 아이와 함께 2시간을 보냅니다.',
              '미술관 가기, 문구점 탐방, 오래된 서점 산책 등 순수한 기쁨과 놀이를 선물합니다.',
            ],
            steps: ['혼자서만 가기', '소소한 놀이 찾기', '영혼의 우물 채우기'],
          },
        ],
      },
      {
        id: 'recovery',
        roman: 'Ⅱ',
        title: '12단계 창조성 회복 여정',
        shortLabel: '12주 여정',
        description: '안전감, 정체성, 힘, 청렴성, 가능성, 풍요로움을 되찾는 단계별 회복 로드맵입니다.',
        narration: '창조성 회복 여정. 그림자 아티스트의 굴레를 벗고 내면의 독창성을 당당하게 세상에 드러내세요.',
        sections: [
          {
            title: '검열관(Censor)을 침묵시키는 법',
            details: '내 안에서 "네가 무슨 예술가야", "이런 건 유치해"라고 속삭이는 비판자를 "괴물 알약"으로 규정하고 무시하세요.',
          },
        ],
      },
      {
        id: 'scamper',
        roman: 'Ⅲ',
        title: 'SCAMPER 발상법 & 시적 카피라이팅',
        shortLabel: '발상 매트릭스',
        description: '아이디어를 대체하고, 결합하고, 변형하는 현대적 창의 발상 프레임워크입니다.',
        narration: 'SCAMPER 발상법. 대체하고 결합하고 뒤집어라. 새로운 아이디어는 익숙한 것들의 낯선 결합입니다.',
        sections: [
          {
            title: 'Substitute / Combine / Adapt / Modify / Put / Eliminate / Reverse',
            details: '기존의 통념을 하나씩 비틀어 세상에 없던 새로운 시각과 매혹적인 카피를 창조합니다.',
          },
        ],
      },
      {
        id: 'muse_coach',
        roman: 'Ⅳ',
        title: '아티스트 웨이 AI 코칭 바이블',
        shortLabel: 'AI 코칭 질문',
        description: '루시 AI 프로(뮤즈 창작 모드)와 함께 아이디어와 글감을 즉시 발굴하세요.',
        narration: '뮤즈 창작 코칭. 막힌 글을 뚫고 감각적인 시와 매혹적인 콘셉트를 도출하세요.',
        sections: [],
        coachingQuestions: [
          {
            category: '창작 블록 돌파',
            question: '루시야, 창작이 막히고 완벽주의 때문에 시작조차 못 하겠는데 모닝페이지 프롬프트 3개 줘.',
            personaTarget: 'muse',
          },
          {
            category: '감성 카피라이팅',
            question: '지금 내 아이디어를 사람들의 심금을 울리는 시적 카피라이팅 5가지 버전으로 만들어줘.',
            personaTarget: 'muse',
          },
        ],
      },
    ],
  },
  epilogue: {
    title: 'Epilogue Master Codex',
    subtitle: '5대 우주 여정 결산 & 하루의 성찰 피날레 바이블',
    author: 'PRISM Epilogue Master',
    epigraph: '하루의 온전한 마무리가 내일의 새로운 새벽을 밝힌다.',
    source: 'PRISM Epilogue Charter',
    accentGlow: 'rgba(168, 85, 247, 0.25)',
    chapters: [
      {
        id: 'daily_reflection',
        roman: 'Ⅰ',
        title: '5대 우주 여정 결산 (Daily Reflection)',
        shortLabel: '여정 결산',
        description: '오늘 하루 동안 7대 샌추어리에서 쌓인 모든 생각, 감정, 사주, 창작의 기록을 매듭짓습니다.',
        narration: '에필로그 여정 결산. 하루를 온전히 돌아보고 내일을 위한 평화로운 에너지를 충전하세요.',
        sections: [
          {
            title: '5대 영역 통합 조화 지표',
            details: '사주·운명 조화(95%), 심리·내면 평화(92%), 신체·활력 컨디션(89%), 창작·영감 활동(94%)을 확인하고 결산합니다.',
          },
        ],
      },
      {
        id: 'mirror_timeline',
        roman: 'Ⅱ',
        title: '발자취 미러 & 영구 보존',
        shortLabel: '발자취 미러',
        description: '오늘 기록된 타로 리딩, 소원의 우물, 생체 명상, 비밀 라디오 기록을 안전하게 보관합니다.',
        narration: '발자취 미러. 당신이 걸어온 모든 순간은 영혼의 성장을 증명하는 귀중한 역사입니다.',
        sections: [
          {
            title: '10중 Profile Vault 동기화',
            details: '작성하신 모든 프로필과 대화 로그는 삭제되지 않으며, 안전하게 클라우드에 영구 백업됩니다.',
          },
        ],
      },
      {
        id: 'soul_charter',
        roman: 'Ⅲ',
        title: '소울 심층 스펙트럼 헌장',
        shortLabel: '소울 헌장',
        description: '사주, 심리, 음악, 예술이 하나로 조화되는 영혼의 완전성을 선언합니다.',
        narration: '소울 심층 스펙트럼. 당신이 본래 가지고 태어난 가장 아름다운 신성을 온전히 회복하세요.',
        sections: [
          {
            title: 'PRISM 3대 불변의 법칙',
            details: '1. 나는 본래 온전하고 평화롭다. 2. 모든 경험은 나의 확장을 돕는다. 3. 내일은 더 맑고 찬란하다.',
          },
        ],
      },
      {
        id: 'epilogue_coach',
        roman: 'Ⅳ',
        title: '에필로그 피날레 코칭 바이블',
        shortLabel: 'AI 코칭 질문',
        description: '루시 AI 프로(5대 우주 마스터 풀가동 모드)와 함께 나누는 밤의 대화입니다.',
        narration: '에필로그 피날레 코칭. 하루를 닫으며 루시 마스터와 함께하는 1:1 심층 피날레 대화입니다.',
        sections: [],
        coachingQuestions: [
          {
            category: '하루 종합 결산',
            question: '루시야, 오늘 내가 나눈 모든 대화와 기록들을 바탕으로 따뜻한 하루 결산과 내일의 희망 메시지를 들려줘.',
            personaTarget: 'lucy',
          },
          {
            category: '올인원 마스터 처방',
            question: '오늘 나의 사주 기운, 감정 상태, 신체 피로도, 창작 영감을 총망라해서 올인원 마스터 처방을 내려줘.',
            personaTarget: 'lucy',
          },
        ],
      },
    ],
  },
};

export default function HandbookStandalonePage() {
  const narrow = useNarrowPhone();
  const legacy = isLegacyMobile();
  const [, navigate] = useLocation();
  const { openLucyChat, sendUnifiedMessage } = useApp();

  // Selected Channel State (supports URL query ?channel=orange etc.)
  const [activeChannel, setActiveChannel] = useState<HandbookChannel>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('channel') as HandbookChannel;
      if (q && HANDBOOK_DATA[q]) return q;
      const pending = safeSessionStorage.getItem('prism_pending_handbook_theme') as HandbookChannel;
      if (pending && HANDBOOK_DATA[pending]) return pending;
    }
    return 'prologue';
  });

  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [ttsProgress, setTtsProgress] = useState<number>(0);

  const currentUniverse = HANDBOOK_DATA[activeChannel] || HANDBOOK_DATA.prologue;
  const currentChapter = currentUniverse.chapters[activeChapterIndex] || currentUniverse.chapters[0];

  // Subscribe to TTS active states
  useEffect(() => {
    const unsub = subscribeTTS((state) => {
      setIsPlayingTTS(state.isSpeaking || state.isLoading);
    });
    return () => {
      unsub();
      stopTTS();
    };
  }, []);

  // When changing channel, reset chapter index to 0
  const handleSelectChannel = (ch: HandbookChannel) => {
    stopTTS();
    setActiveChannel(ch);
    setActiveChapterIndex(0);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('channel', ch);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Toggle Audiobook TTS
  const handleToggleTTS = () => {
    if (isPlayingTTS) {
      stopTTS();
      setIsPlayingTTS(false);
    } else {
      const textToRead = `${currentChapter.title}. ${currentChapter.description}. ${currentChapter.narration}`;
      playTTS(textToRead, 'Kore');
      setIsPlayingTTS(true);
    }
  };

  // Direct ask to Lucy Pro
  const handleConsultLucy = (question: string, personaTarget: string) => {
    stopTTS();
    openLucyChat(personaTarget);
    sendUnifiedMessage(question, personaTarget as any);
  };

  const currentChannelMeta = ALL_CHANNELS.find((c) => c.id === activeChannel) || ALL_CHANNELS[0];

  return (
    <div className="h-app-full w-full flex flex-col bg-[#05010a] text-white select-text overflow-hidden font-sans relative">
      {/* Background Ambience & Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-700"
          style={{ background: currentUniverse.accentGlow }}
        />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-600/10 blur-[140px] pointer-events-none" />
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 py-3.5 backdrop-blur-2xl border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer text-xs font-bold font-sans active:scale-95 shadow-xs"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">PRISM 홈으로</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <BookOpen size={16} className="text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                <span>PRISM HANDBOOK</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/10 text-white/70 font-bold">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] text-white/40 font-sans truncate max-w-[180px] sm:max-w-none">
                {currentUniverse.title}
              </p>
            </div>
          </div>
        </div>

        {/* TTS Audio Player Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleTTS}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-md active:scale-95 ${
              isPlayingTTS
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white border border-red-300/40 shadow-red-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white/90 border border-white/10'
            }`}
          >
            {isPlayingTTS ? (
              <>
                <Pause size={14} className="animate-pulse" />
                <span className="hidden sm:inline">낭독 일시중지</span>
                <div className="flex items-center gap-0.5 ml-1">
                  <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            ) : (
              <>
                <Volume2 size={14} />
                <span>오디오북 낭독</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 7 Rainbow Channel Switcher Bar */}
      <div className="sticky top-[57px] z-40 px-3 sm:px-6 py-2.5 bg-black/50 backdrop-blur-xl border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:gap-2">
        {ALL_CHANNELS.map((ch) => {
          const isActive = activeChannel === ch.id;
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChannel(ch.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs font-bold font-sans transition-all shrink-0 cursor-pointer ${
                isActive
                  ? `${ch.bgActive} border ${ch.borderActive} font-black scale-105`
                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/50 border border-white/5'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${ch.dotColor} ${isActive ? 'animate-ping' : 'opacity-40'}`} />
              <Icon size={14} className={isActive ? ch.textActive : 'text-white/40'} />
              <span>{ch.name}</span>
            </button>
          );
        })}
      </div>

      {/* Body Area: Dual-pane on desktop, fluid on mobile */}
      <div className="flex-1 w-full flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Left Sidebar: Chapter Selection */}
        <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.01] backdrop-blur-md overflow-x-auto md:overflow-y-auto no-scrollbar p-3 sm:p-5 flex md:flex-col gap-2 shrink-0">
          <div className="hidden md:block pb-3 border-b border-white/10 mb-2">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest font-mono">
              TABLE OF CONTENTS
            </span>
          </div>

          {currentUniverse.chapters.map((chap, idx) => {
            const isChapActive = activeChapterIndex === idx;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => {
                  stopTTS();
                  setActiveChapterIndex(idx);
                }}
                className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl text-left transition-all shrink-0 md:shrink md:w-full cursor-pointer ${
                  isChapActive
                    ? 'bg-white/15 border border-white/20 text-white shadow-lg shadow-black/40'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] text-white/50 border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isChapActive ? 'bg-white text-black font-black shadow-md' : 'bg-white/5 text-white/40'
                  }`}
                >
                  {chap.roman}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{chap.title}</div>
                  <div className="text-[10px] text-white/40 truncate mt-0.5 hidden md:block">
                    {chap.shortLabel}
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className={`hidden md:block transition-transform shrink-0 ${
                    isChapActive ? 'text-white translate-x-1' : 'text-white/20'
                  }`}
                />
              </button>
            );
          })}
        </aside>

        {/* Right Main Reading Pane */}
        <main
          data-app-scroll-root
          className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 no-scrollbar space-y-6 max-w-4xl mx-auto w-full pb-28"
        >
          {/* Epigraph Quote Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>{currentUniverse.title}</span>
            </div>
            <p className="text-sm sm:text-base font-serif italic text-white/90 leading-relaxed">
              "{currentUniverse.epigraph}"
            </p>
            <p className="text-[10px] text-white/40 font-mono text-right">
              — {currentUniverse.source} · {currentUniverse.author}
            </p>
          </div>

          {/* Chapter Header */}
          <div className="space-y-1.5 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-mono font-bold text-white/70">
                Chapter {currentChapter.roman}
              </span>
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                {currentChapter.shortLabel}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-tight">
              {currentChapter.title}
            </h2>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans pt-1">
              {currentChapter.description}
            </p>
          </div>

          {/* Chapter Sections List */}
          <div className="space-y-4">
            {currentChapter.sections.map((sec, sIdx) => (
              <motion.div
                key={sIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: sIdx * 0.05 }}
                className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all space-y-3 shadow-lg group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                      {sec.title}
                    </h3>
                    {sec.subtitle && (
                      <p className="text-xs font-mono text-white/40 mt-0.5">{sec.subtitle}</p>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white/40 shrink-0">
                    {sIdx + 1}
                  </div>
                </div>

                {sec.details && (
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans break-keep">
                    {sec.details}
                  </p>
                )}

                {sec.principles && sec.principles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider font-mono">
                      핵심 원리 &amp; 통찰 (Principles)
                    </div>
                    <div className="space-y-1.5">
                      {sec.principles.map((pr, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/85 leading-relaxed"
                        >
                          <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{pr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sec.steps && sec.steps.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {sec.steps.map((st, stIdx) => (
                      <span
                        key={stIdx}
                        className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white/90 border border-white/10"
                      >
                        ✓ {st}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Interactive Coaching Questions (Direct Ask to Lucy Pro) */}
          {currentChapter.coachingQuestions && currentChapter.coachingQuestions.length > 0 && (
            <div className="space-y-3 pt-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 border border-purple-500/30 text-xs text-purple-200 leading-relaxed flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                  <span>
                    아래 질문을 클릭하시면 <strong>루시 AI 프로</strong>와 즉시 1:1 심층 대화가 시작됩니다.
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentChapter.coachingQuestions.map((cq, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handleConsultLucy(cq.question, cq.personaTarget)}
                    className="w-full text-left p-4 rounded-3xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-purple-400/50 transition-all duration-200 group flex items-start gap-3.5 cursor-pointer shadow-md active:scale-[0.99]"
                  >
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono border border-purple-500/30">
                      {qIdx + 1}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                        {cq.category}
                      </div>
                      <div className="text-xs sm:text-sm text-white group-hover:text-purple-200 font-sans leading-relaxed break-keep font-medium">
                        "{cq.question}"
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1.5">
                      <span>질문하기</span>
                      <ChevronRight size={15} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
