import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { db, collection, query, orderBy, getDocs, limit, doc, getDoc, setDoc } from '@/lib/firebase';
import { 
  Sparkles, Heart, Wind, Moon, Star, MessageSquare, 
  ArrowLeft, Search, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Activity, Award, CheckCircle, Info, Volume2,
  FileText, UserCheck, BookOpen, TreeDeciduous, Bird, Music, X, Infinity as InfinityIcon, RefreshCw
} from 'lucide-react';

import { SpecialFeatureFabGroup, ChatFabButton } from '@/components/SpecialFeatureFab';
import { motion, AnimatePresence } from 'motion/react';
import { TTSButton } from '@/components/TTSButton';
import { CosmicInteractiveShell } from '@/components/CosmicInteractiveShell';
import { invokeEpilogueSummaryLLM, isFallbackEpilogueSummary } from '@/lib/ai';
import { parseSummaryAndTags } from '@/lib/summaryTags';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { getTodayDateKey } from '@/lib/dailyCache';
import { calculateDetailedSaju } from '@/lib/sajuAnalysis';
import type { UserProfile } from '@/lib/sharedState';

interface MirrorRecord {
  id: string;
  source: 'trinity' | 'muse' | 'orange' | 'bluebird' | 'heal';
  sourceLabel: string;
  type: string;
  title: string;
  content: string;
  timestamp: Date;
  classification: 'rituals' | 'chats' | 'daily' | 'soul_spec';
  metadata?: any;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  tarot_reading: {
    label: '신비의 타로 리딩',
    icon: Sparkles,
    color: '#facc15',
    bg: 'bg-yellow-500/10 text-yellow-300',
    border: 'border-yellow-500/20'
  },
  picture_diary: {
    label: '감성 미술 일지',
    icon: Heart,
    color: '#f97316',
    bg: 'bg-orange-500/10 text-orange-400',
    border: 'border-orange-500/20'
  },
  wishing_well: {
    label: '소원의 우물',
    icon: Sparkles,
    color: '#f97316',
    bg: 'bg-orange-500/10 text-orange-400',
    border: 'border-orange-500/20'
  },
  meditation: {
    label: '생체 동조 명상',
    icon: Wind,
    color: '#10b981',
    bg: 'bg-emerald-500/10 text-emerald-400',
    border: 'border-emerald-500/20'
  },
  secret_story: {
    label: '치유의 비밀 라디오',
    icon: Moon,
    color: '#3b82f6',
    bg: 'bg-sky-500/10 text-sky-400',
    border: 'border-sky-500/20'
  },
  role_model: {
    label: '영감의 예술 멘토링',
    icon: Star,
    color: '#6366f1',
    bg: 'bg-indigo-500/10 text-indigo-400',
    border: 'border-indigo-500/20'
  },
  chat: {
    label: '수호자 대화 로그',
    icon: MessageSquare,
    color: '#e2e8f0',
    bg: 'bg-white/10 text-white/90',
    border: 'border-white/10'
  },
  resonance: {
    label: '차원 주파수 동조',
    icon: Activity,
    color: '#ec4899',
    bg: 'bg-pink-500/10 text-pink-400',
    border: 'border-pink-500/20'
  }
};

const SOUL_TYPES = ['soul-analysis', 'soul-sync', 'soul-energy', 'energy_analysis', 'SOUL_PROFILE', 'profile-analysis', 'artist soul analysis', 'soul deep prescription analysis'];
const RITUAL_TYPES = ['wishing_well', 'picture_diary', 'tarot_reading', 'meditation', 'secret_story', 'role_model', 'resonance'];

export function getRecordClassification(rawType: string): 'rituals' | 'chats' | 'daily' | 'soul_spec' {
  const typeLower = (rawType || '').toLowerCase();
  if (rawType === 'chat' || rawType === 'picture_diary') {
    return 'chats';
  }
  if (RITUAL_TYPES.includes(rawType)) {
    return 'rituals';
  }
  if (
    SOUL_TYPES.includes(rawType) ||
    typeLower.includes('soul') ||
    typeLower.includes('energy') ||
    typeLower.includes('profile') ||
    typeLower.includes('spectrum')
  ) {
    return 'soul_spec';
  }
  return 'daily';
}

export function getRecordUIConfig(record: MirrorRecord) {
  const t = record.type;
  if (TYPE_CONFIG[t]) {
    return TYPE_CONFIG[t];
  }
  
  const classification = record.classification || getRecordClassification(t);
  if (classification === 'chats') {
    return {
      label: '수호자 대화 로그',
      icon: MessageSquare,
      color: '#e2e8f0',
      bg: 'bg-white/10 text-white/90',
      border: 'border-white/10'
    };
  }
  if (classification === 'soul_spec') {
    return {
      label: '소울 심층 분석',
      icon: UserCheck,
      color: '#c084fc',
      bg: 'bg-purple-500/10 text-purple-300',
      border: 'border-purple-500/20'
    };
  }
  if (classification === 'daily') {
    return {
      label: '데일리 오라클',
      icon: FileText,
      color: '#38bdf8',
      bg: 'bg-sky-500/10 text-sky-400',
      border: 'border-sky-500/20'
    };
  }
  return {
    label: '신성한 의식',
    icon: Sparkles,
    color: '#a855f7',
    bg: 'bg-purple-500/10 text-purple-300',
    border: 'border-purple-500/20'
  };
}

export interface LuckyItem {
  emoji: string;
  name: string;
  description: string;
}

export const EPILOGUE_APP_KEYS = ['trinity', 'muse', 'orange', 'bluebird', 'heal'] as const;

export const EPILOGUE_APP_LABELS: Record<string, string> = {
  trinity: '운명 오라클 (TRINITY)',
  muse: '영감 창조 (MUSE)',
  orange: '마음 치유 (ORANGE)',
  bluebird: '예술 정서 (BLUEBIRD)',
  heal: '신체 웰니스 (AURA)'
};

const MOCK_RECORDS: MirrorRecord[] = [
  {
    id: 'mock-1',
    source: 'trinity',
    sourceLabel: 'TRINITY',
    type: 'tarot_reading',
    title: '운명의 시간선 교정 리딩',
    content: '우주적 공명 주파수 528Hz 솔페지오 파동과 운명의 시간선 정렬. 오늘의 오라클 진단 결과에 따르면, 당신은 현재 생각과 행동의 정렬을 필요로 하고 있습니다. 운명의 중첩 상태에서 스스로의 의지로 파동 함수를 붕괴시키세요.',
    timestamp: new Date(Date.now() - 3600000 * 2),
    classification: 'rituals',
    metadata: {}
  },
  {
    id: 'mock-2',
    source: 'orange',
    sourceLabel: 'ORANGE',
    type: 'picture_diary',
    title: '내면의 주토피아 감성 정원',
    content: '무의식의 점진적 시냅스 확장과 감마 초몰입 주파수 40Hz 동기화 완료. 오렌지 가드너의 연금술적 가이드에 따라 평화로운 꽃피우기 작업을 수행했습니다. 평온한 오렌지 숲의 잔상이 내면 갈등을 말끔히 정화합니다.',
    timestamp: new Date(Date.now() - 3600000 * 6),
    classification: 'rituals',
    metadata: {}
  },
  {
    id: 'mock-3',
    source: 'heal',
    sourceLabel: 'AURA',
    type: 'meditation',
    title: '생체 주기 리셋 동조 명상',
    content: '지치고 흐트러진 생체 주파수를 보정하기 위한 알파파(8-12Hz) 동조 명상 세션을 성공적으로 수료하였습니다. 자율신경계 피로 지표가 안정적인 조율막을 형성하며 평온한 호흡의 리듬을 되찾았습니다.',
    timestamp: new Date(Date.now() - 3600000 * 12),
    classification: 'rituals',
    metadata: {}
  },
  {
    id: 'mock-4',
    source: 'bluebird',
    sourceLabel: 'BLUEBIRD',
    type: 'secret_story',
    title: '새벽 이슬 머금은 숲속의 비밀 라디오',
    content: '블루버드 전언: 깊은 성찰 끝에 털어놓은 당신의 비밀은 고요한 정화의 바람을 타고 날아갔습니다. 짐노페디 피아노 선율과 함께 어우러지는 숲의 속삭임은 내적 주파수를 신속히 복구해 줍니다.',
    timestamp: new Date(Date.now() - 3600000 * 24),
    classification: 'rituals',
    metadata: {}
  }
];

export function getDailyLuckyItem(appKey: string, uid?: string): LuckyItem {
  const orangeItems: LuckyItem[] = [
    { emoji: '🎨', name: "클로드 모네의 '수련'", description: "부드러운 물빛의 흐름을 응시하며 마음속 흐트러진 주파수를 고요히 정돈하고 창조적 무의식을 깨워 보세요." },
    { emoji: '✏️', name: "생분해성 목재 스케치 연필", description: "정제되지 않은 나무 향을 맡으며 가벼운 낙서를 통해 무의식 속 억눌린 감정들을 흘려보내 보세요." },
    { emoji: '🧡', name: "살구빛 오일 파스텔", description: "따스한 태양의 온기를 품은 색감으로 손가락 끝을 물들이며 내면의 온화한 창조성을 피워 내세요." },
    { emoji: '🖼️', name: "빈센트 반 고흐의 '아몬드 꽃'", description: "푸른 하늘을 배경으로 피어난 하얀 꽃잎을 보며, 절망 속에서도 피어나는 새로운 소울 시냅스를 감상해 보세요." },
    { emoji: '🌿', name: "천연 아마씨 캔버스", description: "거친 직조 위에 붓끝이 스치는 질감을 상상하며, 내면 스펙트럼의 주파수를 캔버스에 가만히 투영해 보세요." },
    { emoji: '🎨', name: "앙리 마티스의 '재즈' 판화", description: "단순하고 강렬한 색채의 조화를 바라보며 정체된 내면의 억압을 풀고 자유로운 율동감을 불어넣으세요." },
    { emoji: '🏺', name: "물레로 빚은 테라코타 화분", description: "대지의 흙내음을 가까이하며 거칠고 따뜻한 흙의 촉감과 함께 소울의 깊은 뿌리를 지구에 고정해 보세요." },
    { emoji: '🪵', name: "편백나무 드로잉 목탄", description: "정제되지 않은 가공 목탄을 손에 쥐고 마음속의 그림자를 스케치북에 솔직하고 투박하게 그려보세요." },
    { emoji: '🖋️', name: "클래식 만년필과 브라운 잉크", description: "종이 위를 사각사각 스치는 펜촉 소리와 부드러운 브라운 향취 속에서 묵혀둔 깊은 생각들을 천천히 적어보세요." },
    { emoji: '📓', name: "양장 수제 코튼 페이퍼 저널", description: "순수 면 코튼 섬유로 지은 폭신한 페이퍼에 정제되지 않은 오늘의 아티스트 저널을 채워 마음을 위로하세요." },
    { emoji: '🐚', name: "해변에서 주운 천연 조개껍데기", description: "조개의 신비롭고 부드러운 소용돌이 모양을 어루만지며 태곳적부터 이어져 온 바다의 고요한 리듬에 동조하세요." },
    { emoji: '☕', name: "융 드립으로 내린 싱글오리진 커피", description: "섬세하고 부드러운 융 필터로 천천히 한 방울씩 정성스럽게 내린 아날로그 커피의 깊은 향을 가만히 음미해 보세요." },
    { emoji: '🎨', name: "파울 클레의 '금물고기' 엽서", description: "어둠 속에서 황금빛으로 찬란하게 빛나는 신비로운 물고기의 동화적 상상력을 보며 내면의 보물을 깨워보세요." },
    { emoji: '🪶', name: "물새 깃털로 만든 천연 붓과 잉크", description: "가볍고 유연한 천연 깃털 붓에 잉크를 묻혀 자유로운 선을 그어가며 내면 속 감성의 억압을 완전히 해방하세요." },
    { emoji: '🕯️', name: "스모키 우드 향의 소이 캔들", description: "타닥타닥 타오르는 나무 심지의 소리와 따뜻한 모닥불 향 가득한 불꽃을 가만히 보며 잡념을 가라앉히세요." },
    { emoji: '🍵', name: "따뜻하고 달콤한 아카시아 꽃차", description: "맑고 노란 찻잔에 한가득 번져나는 달콤한 아카시아 향에 온전히 집중하여 긴장된 신경을 부드럽게 이완해 보세요." },
    { emoji: '🍂', name: "가을날의 말린 단풍잎 북마크", description: "오랜 시간 동안 책장 속에서 수분을 비워내며 바스락거리는 고유의 촉감과 마른 낙엽의 추억을 느껴보세요." },
    { emoji: '🎨', name: "구스타프 클림트의 '생명의 나무'", description: "황금빛으로 소용돌이치며 사방으로 뻗어나가는 신비로운 생명의 나무의 율동 속에서 강인한 생명력을 전해 받으세요." },
    { emoji: '🧣', name: "카멜 브라운 양모 머플러", description: "자연의 부드러움을 머금은 양모 원사의 보송보송하고 따뜻한 질감으로 오늘 하루 지친 마음을 푸근히 감싸주세요." },
    { emoji: '🧺', name: "자연 건조 라벤더 꽃다발", description: "은은하고 다정하게 피어오르는 보랏빛 라벤더의 천연 향을 가슴 깊이 들이마시며 불안한 자아를 위로하세요." },
    { emoji: '🎹', name: "에릭 사티의 오르골 음반", description: "아주 느릿하고 반복적인 미니멀리즘 멜로디의 맑은 오르골 음률이 마음 깊숙한 곳의 무의식을 평화롭게 정돈합니다." },
    { emoji: '🍊', name: "천연 건조 오렌지 슬라이스 칩", description: "태양 아래 바짝 마른 주황빛 과육의 새콤달콤한 향을 가볍게 맡으며 정체된 감각과 활력을 상큼하게 깨우세요." },
    { emoji: '🧳', name: "빈티지 가죽 미니 파우치", description: "오랜 세월을 거치며 손때 묻어 부드러워진 가죽의 은은한 향과 함께 소중한 수집품들을 다정하게 정리해 보세요." },
    { emoji: '📻', name: "진공관 라디오의 아날로그 소음", description: "지지직거리며 낮고 따뜻하게 공명하는 오디오의 불규칙한 주파수 파동 소리에서 완벽한 아날로그 휴식을 즐기세요." },
    { emoji: '🧊', name: "투명한 천연 백수정 석영 원석", description: "왜곡 없이 맑고 차가운 천연 수정의 투명한 면들을 응시하며 흔들리던 마음의 해상도를 맑게 복구해 보세요." },
    { emoji: '🍵', name: "깊은 산속 유기농 야생 둥굴레차", description: "구수하고 깊고 아늑한 대지의 맛이 식도를 타고 편안하게 번져나는 흐름을 몸 깊이 음미하며 집중하세요." },
    { emoji: '🪵', name: "참나무 장작 타오르는 모닥불 소리", description: "장작이 튀며 은은하게 붉은빛을 내뿜는 타오르는 불빛을 가만히 마주하고 복잡한 생각의 불순물들을 태워보세요." },
    { emoji: '🌌', name: "에드바르 뭉크의 '별이 빛나는 밤' 화집", description: "짙은 푸른색과 노란 별들이 밤공기 속에서 율동하듯 섞여드는 신비롭고 몽환적인 붓터치를 깊이 감상하세요." },
    { emoji: '🧵', name: "핸드메이드 오렌지 울 실 코스터", description: "한 땀 한 땀 따스한 정성으로 실을 엮어 만든 보드랍고 도톰한 오렌지빛 뜨개 위를 손끝으로 살며시 쓸어보세요." },
    { emoji: '🧉', name: "부드럽고 쌉싸름한 카카오 닙스 라떼", description: "설탕 없이 카카오 본연의 정직하고 깊은 씁쓸함과 은은한 단맛을 품은 라떼를 음미하며 미각을 차분히 일깨우세요." },
    { emoji: '🖼️', name: "바실리 칸딘스키의 '구성 8' 엽서", description: "점, 선, 면이 지닌 원색적이고 자유로운 에너지를 바라보며 경직되었던 마음에 무한한 창작의 충동을 선물하세요." }
  ];

  const trinityItems: LuckyItem[] = [
    { emoji: '📖', name: "헤르만 헤세의 '데미안'", description: "새가 알을 깨고 나오듯, 고정관념의 껍질을 깨고 진정한 내면의 신성한 지혜를 깨닫는 조력자가 되어 줍니다." },
    { emoji: '🔮', name: "천연 라피스 라줄리 원석", description: "진실한 지혜와 우주적 공명을 이끌어주는 푸른 빛의 원석입니다. 베개 밑에 두고 깊은 통찰의 꿈을 맞이하세요." },
    { emoji: '📜', name: "라이너 마리아 릴케의 시집", description: "존재의 깊은 심연을 비추는 시구들을 소리 내어 읽으며 오늘의 운명선에 온화한 우주적 지혜를 불어넣으세요." },
    { emoji: '🕯️', name: "밀랍 향초와 백합 향", description: "순수한 태양의 빛을 머금은 밀랍초를 켜고 불꽃을 가만히 응시하며 내면의 지혜의 눈을 환히 밝혀 보세요." },
    { emoji: '📘', name: "니체의 '차라투스트라는 이렇게 말했다'", description: "스스로 운명의 창조자가 되는 영감을 얻기 위해 책의 아무 페이지나 펼쳐 운명적인 단어 하나를 마주해 보세요." },
    { emoji: '⏳', name: "청동으로 제련된 고대 모래시계", description: "흘러내리는 미세한 모래의 흐름을 보며, 오늘의 운명이 지닌 영원하고 순환하는 시간선을 다정하게 받아들이세요." },
    { emoji: '📔', name: "미니멀 가죽 천사 오라클 노트", description: "우주의 메시지를 흘려보내지 않도록 직관적으로 떠오른 오늘의 신비로운 단어들을 정성스레 기록해 보세요." },
    { emoji: '🗝️', name: "황동 빈티지 만트라 열쇠", description: "마음 깊은 곳 닫혀 있던 영혼의 자각과 통찰을 여는 상징적인 고색창연한 디자인 열쇠를 만져보세요." },
    { emoji: '🌌', name: "우주 망원경으로 본 창조의 기둥", description: "성간 가스와 먼지가 빛을 내는 가없는 우주의 거대하고 신비로운 풍경 속에서 자아의 성찰을 한 단계 넓혀보세요." },
    { emoji: '🪐', name: "심도 깊은 자수정 펜듈럼", description: "진보된 우주의 중심 주파수를 끌어내고 흔들리는 의식을 중력의 중심으로 차분히 일치시키는 장미 보랏빛 추입니다." },
    { emoji: '🌟', name: "어둠 속에서 스스로 빛나는 성도", description: "방의 불을 끄고 무한한 우주의 별자리를 가만히 눈에 담으며, 미시적인 일상의 걱정들로부터 해방되어 보세요." },
    { emoji: '📜', name: "메이저 아르카나 타로 일러스트", description: "역사와 깊은 철학의 상징들을 담은 수려한 타로 일러스트를 눈에 담으며 오늘의 운명적인 메시지를 탐색하세요." },
    { emoji: '🐚', name: "소라 껍데기 속 들려오는 바다 파도 소리", description: "귓가에 소라 껍데기를 대고 우주의 거대하고 신비로운 순환의 파도 소리에 조용히 귀를 기울여 보시기 바랍니다." },
    { emoji: '🪶', name: "순백의 화이트 피콕 깃털 만년필", description: "신성한 지혜를 온전한 활자로 기입하고 기록할 수 있도록 제작된 아름답고 우아한 천사의 날개 깃털 만년필입니다." },
    { emoji: '🍵', name: "다즐링 첫물 홍차와 은은한 자스민", description: "상쾌한 샴페인 같은 홍차에 은은한 자스민 향을 머금은 차를 음미하며 고상한 내면의 지혜의 주파수를 맑게 깨우세요." },
    { emoji: '🔔', name: "천상의 명상을 이끄는 티베트 싱잉볼", description: "맑고 길게 이어지는 싱잉볼의 공명 소리가 어수선한 뇌파를 완벽한 정화와 우주적 파동 상태로 부드럽게 복구합니다." },
    { emoji: '🛡️', name: "수호와 내면 균형의 헤마타이트 원석", description: "철의 주파수를 지녀 신체와 영혼을 대지의 중력과 단단하게 결속시켜 주는 메탈릭 블랙 원석 팔찌입니다." },
    { emoji: '📖', name: "심리학자 칼 융의 '붉은 책' 도서", description: "우주의 무의식적 상징과 자아 통합을 역설한 융의 위대한 비밀 기록들을 한 페이지 한 페이지 깊게 묵상해 보세요." },
    { emoji: '🪞', name: "실버 프레임 아날로그 빈티지 거울", description: "거울 속 비치는 나만의 눈동자를 피하지 않고 3초간 가만히 응시하며 내면의 진솔한 지혜와 영혼의 불꽃을 마주하세요." },
    { emoji: '📜', name: "산스크리트어 만트라 서예 스크롤", description: "마음에 무한한 평화를 안겨다 주는 진동의 언어로 구성된 고대 소리 글씨 스크롤을 바라보고 내면화하세요." },
    { emoji: '🕯️', name: "블랙 샌달우드 아로마 타로 에센스 소이 캔들", description: "은밀하고 웅장한 깊은 숲속 장엄한 나무의 향과 함께 불꽃을 마주하며 마음속의 무지를 깨끗하게 태워내 보세요." },
    { emoji: '🗝️', name: "장미 수정으로 수공예 세공된 메르카바", description: "우주와 인간을 잇는 고차원 신성 기하학 모양의 메르카바를 만지며 무한한 차원의 에너지를 정렬해 보세요." },
    { emoji: '📘', name: "조셉 캠벨의 '천의 얼굴을 가진 영웅'", description: "삶의 고단한 과정마저도 위대한 영웅의 여정 중 하나임을 깨닫게 해주는 운명의 철학 도서와 함께 주파수를 맞추어 보세요." },
    { emoji: '🌌', name: "밤하늘 은하수를 담은 홀로그램 큐브", description: "손끝에서 우주를 응시할 수 있는 신비로운 큐브 속 별무리 빛들의 굴절을 응시하며 일상의 관점을 무한대로 확장하세요." },
    { emoji: '🐚', name: "백진주가 은은하게 수놓인 수제 보석함", description: "바다의 인내와 세월을 머금어 환하게 반짝이는 천연 자개 조개 보석함 속에 당신의 오늘의 운명적 목표를 기록해 넣어 보세요." },
    { emoji: '📿', name: "진귀한 메테오라이트 우주 철운석 펜던트", description: "우주에서 수억 년 동안 별을 타고 여행하여 지구에 닿은 신비로운 철운석 조각을 보며 우주와의 유대감을 자각하세요." },
    { emoji: '⏳', name: "황금색 마그네틱 모래가 흐르는 시계", description: "자석의 힘으로 아래에서부터 신비로운 모래 조각들이 차례로 피어오르는 모양 속에서 시간의 조화로움을 온전히 느끼세요." },
    { emoji: '📖', name: "루미의 시집 '우리는 모두 연결되어 있다'", description: "당신과 우주, 모든 타인의 상처가 하나의 원대한 조화 속에서 숨 쉬고 있음을 환기해 주는 시집입니다." },
    { emoji: '🔔', name: "청아한 고밀도 수작업 수공예 황동 풍경", description: "미세한 바람의 흐름에 따라 맑고 영롱하게 울려 퍼지는 청동 울림 소리를 들으며 마음의 문을 활짝 열어두세요." },
    { emoji: '🔮', name: "황금빛 서광을 발산하는 타이거아이 구", description: "빛의 방향에 따라 호랑이 눈처럼 강력한 결단과 보호의 섬광을 내는 원석을 손끝으로 굴리며 흔들림 없는 중심을 세우세요." },
    { emoji: '📜', name: "북극성 오라클 황금박 인쇄 타로 카드", description: "가장 어두운 밤하늘에서도 결코 흔들리지 않고 항로를 가리키는 나침반 같은 북극성의 정렬 카드를 가슴에 품어보세요." }
  ];

  const healItems: LuckyItem[] = [
    { emoji: '🎧', name: "528Hz 세포 회복 바이노럴 비트", description: "세포의 DNA를 조율하고 스트레스를 경감해 주는 치유의 사랑 주파수입니다. 편안히 호흡하며 감상해 보세요." },
    { emoji: '🍵', name: "따뜻하게 우려낸 페퍼민트 허브차", description: "정수리를 맑게 깨우는 상쾌한 페퍼민트의 기운이 지친 신경망의 열기를 다정하게 가라앉히고 활력을 보충합니다." },
    { emoji: '🧘', name: "천연 로즈우드 아로마 조율 오일", description: "귀 뒤편이나 손목에 오일을 가볍게 바른 뒤 호흡을 깊게 들이쉬며 생체 바이오리듬의 균형을 되찾으세요." },
    { emoji: '🎧', name: "432Hz 지구 공명 주파수 비트", description: "대자연의 우주적 기본 조율 주파수입니다. 긴장된 뇌파를 알파파로 빠르게 진정시켜 온전한 심신 안정을 돕습니다." },
    { emoji: '🪵', name: "인도양 샌달우드 인센스 스틱", description: "차분한 나무 향의 연기가 공간을 채우는 것을 보며 깊은 명상 상태로 주파수 동조를 유도해 보세요." },
    { emoji: '🎧', name: "7.83Hz 슈만 공명 지구 맥박 비트", description: "지구의 고유 뇌파와 동조하여 흔들리는 생체 주기와 불안을 깊은 안정의 흐름으로 복구시켜 줍니다." },
    { emoji: '🦶', name: "사해 소금을 넣은 따뜻한 족욕", description: "발끝에서부터 올라오는 따뜻한 온기가 온몸에 쌓인 피로 전류를 해소하고 생기를 불어넣어 줍니다." },
    { emoji: '🍵', name: "새콤한 로즈힙과 히비스커스 티", description: "피로 해소에 탁월한 붉은색 꽃잎차를 마시며 미세 혈관에 산소를 공급하고 오라의 활력 장벽을 강화하세요." },
    { emoji: '💆', name: "상큼한 천연 오렌지 블로썸 안대", description: "시각적 자극을 완전히 차단하고 부드러운 안대 속 아로마 향을 음미하며 극도의 뇌 이완 상태를 맞이해 보세요." },
    { emoji: '🎧', name: "963Hz 송과체 정화 솔페지오 주파수", description: "직관력과 고차원 뇌 시냅스를 자극해 자율신경계 조화와 인체의 피로 정화 능력을 고취해 줍니다." },
    { emoji: '🪵', name: "천연 편백나무 피톤치드 에센스 스프레이", description: "공간에 가볍게 스프레이를 분사한 뒤 눈을 감고 깊은 소나무 숲에서 목욕하듯 긴 숨을 깊게 내쉬어 보세요." },
    { emoji: '🧘', name: "고밀도 친환경 천연 코르크 명상 매트", description: "단단하고 따뜻하게 몸을 지지해 주는 친환경 매트 위에 앉아 가볍게 어깨와 척추를 정렬해 봅니다." },
    { emoji: '🎧', name: "396Hz 불안과 해독 솔페지오 주파수 비트", description: "체내에 정체된 묵은 노폐물과 심리적 불안을 가라앉히고 안정의 파동을 이끌어 줍니다." },
    { emoji: '🍵', name: "야생 벌꿀을 한 스푼 넣은 카모마일 꽃차", description: "긴장된 복부와 위장을 부드럽게 따뜻하게 데워주어 심리적인 안정감과 깊고 온전한 숙면을 돕습니다." },
    { emoji: '🧊', name: "맑은 아이슬란드 청정 빙하수 한 잔", description: "순수하고 깨끗한 물을 아주 천천히 한 모금 마시며 세포 하나하나에 순수한 생명의 원기를 충전하세요." },
    { emoji: '🧘', name: "프랑스 천연 라벤더 아로마 롤온 패치", description: "맥박이 뛰는 목 뒤나 관자놀이에 가볍게 패치를 대고 굴려 신경에 깊은 이완과 위로의 기운을 전해 주시기 바랍니다." },
    { emoji: '🎧', name: "639Hz 대인 관계 조화 솔페지오 비트", description: "마음속의 가시와 상처를 녹이고 긍정적인 수용과 교감의 신호파를 뇌 속에 부드럽게 방출합니다." },
    { emoji: '🪵', name: "천연 야생 화이트 세이지 스머지 스틱", description: "세이지 나뭇잎에 불을 붙여 피어오르는 연기를 통해 공간과 인체 주위에 머물던 부정적 기운들을 소독하세요." },
    { emoji: '🦶', name: "발바닥 지압용 동글동글 천연 몽돌 매트", description: "발바닥의 수많은 신경 반사구를 자극하여 막혀 있던 신체의 기혈 순환과 에너지를 시원하게 뚫어줍니다." },
    { emoji: '🎧', name: "852Hz 내면 영혼 정화와 직관력 주파수", description: "집중력을 어지럽히던 과부하 상태의 미세 노이즈들을 걷어내어 본래 지녔던 맑은 통찰력을 선사합니다." },
    { emoji: '🍵', name: "제주 무농약 청청 야생 청귤 에이드", description: "풍부한 비타민 성분이 피로한 신체 시냅스를 자극해 맑고 시원한 생기를 선사하는 청귤 에이드입니다." },
    { emoji: '🧘', name: "유기농 천연 라벤더 에센셜 오일 허브 패치", description: "호흡을 통해 라벤더 아로마 테라피를 깊게 받아들여 뇌파를 쾌적한 깊은 명상 수면 상태로 인도합니다." },
    { emoji: '🎧', name: "174Hz 통증 경감 및 신체 이완 솔페지오 비트", description: "신체 구석구석 정체되고 굳어 있던 묵은 통증과 긴장감을 주파수 공조를 통해 완화해 주는 치유의 기본 음원입니다." },
    { emoji: '🪵', name: "에콰도르 천연 팔로 산토 치유 목탄", description: "신성한 나무라고 불리는 스위트한 나무 잔향이 방 안에 번져가는 흐름을 통해 인체의 흐름을 회복하세요." },
    { emoji: '🦶', name: "따스한 편백나무 피톤치드 온열 패치", description: "지친 목덜미나 허리에 온열 패치를 붙이고 온기가 몸속 깊숙이 퍼져나가는 편안한 기분을 만끽하세요." },
    { emoji: '🎧', name: "285Hz 인체 에너지 활력 및 조직 정렬 주파수", description: "무기력했던 몸에 미세한 공명을 통해 고유의 생동감을 채워 넣고 건강한 자가 회복 주기 흐름을 촉진시킵니다." },
    { emoji: '🍵', name: "최고급 천연 사프란 꽃잎을 띄운 온수", description: "심신 안정과 두뇌 신경 정화에 뛰어난 맑고 영롱한 금빛의 사프란 티 한 잔을 천천히 호흡하며 다정하게 즐기세요." },
    { emoji: '🧘', name: "천연 네롤리와 오렌지 잎사귀 허브 캔들", description: "우아하고 상큼한 천연 허브 향이 방 안에 가득 퍼져나가며 정체되었던 감각을 쾌적하고 맑게 리셋합니다." },
    { emoji: '🎧', name: "417Hz 정체된 에너지를 소거하는 솔페지오 주파수", description: "과거의 무겁고 정체된 트라우마나 마음의 장벽들을 깊은 파동으로 쓸어내려 주는 치유의 음원입니다." },
    { emoji: '🪵', name: "천연 아틀라스 시더우드 오일 초음파 가습기", description: "깊고 촉촉한 숲속의 고요한 나무 향 미스트를 흡입하며 건조했던 호흡계를 쾌적하게 안심시켜 주세요." },
    { emoji: '🦶', name: "대나무 마디로 구성된 수제 전신 지압기", description: "대나무의 강인하고 시원한 에너지를 활용해 어깨나 목뒤를 부드럽게 굴려 뭉친 근막을 유연하게 이완해 보세요." }
  ];

  const bluebirdItems: LuckyItem[] = [
    { emoji: '🎵', name: "에릭 사티의 '짐노페디 1번'", description: "미니멀하고 신비로운 피아노 선율이 당신의 깊은 슬픔과 비밀을 감싸 안으며 내적 평화를 찾아 줍니다." },
    { emoji: '🪵', name: "편백나무 이슬 향 스프레이", description: "눈을 감고 공간에 스프레이를 분사하여, 상쾌한 편백 정원의 잔향과 함께 마음속 외로움을 씻어내세요." },
    { emoji: '🎵', name: "김광석의 '바람이 불어오는 곳'", description: "바람을 따라 여행하는 듯한 경쾌하고 다정한 멜로디가 굳어 있던 마음을 부드럽게 두드려 위로를 건냅니다." },
    { emoji: '📜', name: "안도현의 시집과 둥굴레차", description: "작고 사소한 모든 존재의 가치를 되짚으며, 나 자신을 향한 자비와 다정한 포옹의 주파수를 켜 보세요." },
    { emoji: '🎵', name: "콜드플레이의 'Fix You'", description: "당신의 부서진 구석들을 빛으로 채워주겠다는 감동적인 밴드 사운드가 깊은 마음의 상처를 따뜻하게 치유합니다." },
    { emoji: '🌧️', name: "고요한 밤하늘 빗소리 ASMR", description: "모든 잡음과 생각을 씻어내 주는 고요한 빗소리에 귀를 기울이며 마음속 쌓인 앙금을 정화해 보세요." },
    { emoji: '🌱', name: "수경 재배 스파티필룸 잎사귀", description: "물속에서 맑게 자라나는 초록 잎사귀를 바라보며 당신의 영혼도 맑게 정화되고 성장하고 있음을 실감하세요." },
    { emoji: '🎵', name: "클로드 드뷔시의 대표작 '달빛'", description: "건반 위에 부드럽게 쏟아지는 물빛และ 은빛의 피아노 멜로디가 굳어졌던 마음을 한결 부드럽고 풍요롭게 어루만집니다." },
    { emoji: '🕊️', name: "하늘빛 유리 세공 파랑새 펜던트", description: "보기만 해도 마음이 맑아지는 파란 새 모양의 정교한 펜던트를 손끝으로 어루만지며 숨은 위로를 건네받으세요." },
    { emoji: '🎵', name: "루시드폴의 따뜻한 어쿠스틱 세션 곡", description: "따뜻한 가사와 잔잔한 통기타의 현 울림이 오늘 밤 당신의 차가운 발밑을 가만히 덮어주는 양모 이불이 됩니다." },
    { emoji: '📖', name: "생텍쥐페리의 '어린 왕자' 영문 에디션", description: "가장 중요한 소중함은 눈에 보이지 않는다는 어린 왕자의 다정한 목소리를 눈에 담으며 정원을 거닐어 보세요." },
    { emoji: '🌧️', name: "이른 아침 새벽 숲속 안개 스치는 백색소음", description: "잡다한 근심들을 숲속의 짙은 자욱한 안개 속으로 부드럽게 흩뿌려 가만히 소거하는 자연의 소리입니다." },
    { emoji: '🕊️', name: "은은한 자연의 야생 은방울꽃 허브 향수", description: "반드시 행복해진다는 신비롭고 다정한 은방울꽃 꽃말과 함께 맑은 꽃 내음으로 주위를 싱그럽게 메우세요." },
    { emoji: '🎵', name: "조지 윈스턴의 잔잔한 피아노 연주곡", description: "소박하고 순수한 겨울 숲에 햇살이 내려앉듯 차분하고 고운 피아노 건반 음률이 일상을 평화롭게 가꿔줍니다." },
    { emoji: '🌱', name: "작은 유리 병 속에 담긴 이끼 정원", description: "한정된 유리 돔 안에서도 고유의 초록빛 생명력을 조용히 피워 올리는 이끼 정원을 보며 치유의 힘을 얻으세요." },
    { emoji: '🎵', name: "아이유의 자작 어쿠스틱 연주곡 '무릎'", description: "엄마의 무릎을 베고 까무룩 잠에 빠져들던 가장 안전하고 고요했던 유년의 기억을 마음에 따뜻하게 선물하세요." },
    { emoji: '📜', name: "박노해 시인의 감성 시집 '너의 하늘을 보아라'", description: "끝없는 경쟁과 조급함 속에서도 나를 지킬 수 있도록 내면의 파란 하늘을 응시하라고 말해 주는 따뜻한 구절입니다." },
    { emoji: '🌧️', name: "조용한 다락방 유리창에 닿는 봄비 소리", description: "툭, 툭 가만히 떨어지며 대지를 적시는 포근한 아날로그 빗소리를 가만히 들으며 잠시 마음의 무게를 내려놓으세요." },
    { emoji: '🕊️', name: "푸른 전나무 오일 아로마 원액 디퓨저", description: "북유럽 숲 한가운데 서 있는 듯한 울창하고 신선한 나무 수액의 잔향이 지친 영혼의 신경망을 다정히 정돈합니다." },
    { emoji: '🎵', name: "존 레논의 시대를 초월한 위로곡 'Imagine'", description: "모든 경계와 소유를 내려놓고 하나 됨의 지복을 속삭이는 다정한 음률이 지쳤던 자아에 큰 숨결을 불어넣습니다." },
    { emoji: '🌱', name: "손바닥 위에 쏙 들어오는 앙증맞은 다육이", description: "물기가 거의 없는 거친 흙에서도 묵묵하고 꿋꿋하게 초록 잎사귀를 키워내는 다육이를 보며 삶을 사랑해 보세요." },
    { emoji: '🎵', name: "어쿠스틱 기타 반주 버전의 '두 사람'", description: "혼자가 아니라는 따스한 노랫말과 어쿠스틱 나무 통의 조화로운 주파수가 당신의 쓸쓸한 마음 벽을 녹여줍니다." },
    { emoji: '📜', name: "시인 기형도의 유고 시집 '입 속의 검은 잎'", description: "상처받은 영혼들의 서글픈 독백 속에서 역설적으로 피어나는 고유한 시적 감성과 공감을 깊이 음미하세요." },
    { emoji: '🌧️', name: "해 질 무렵 고요한 깊은 산사 저녁 풍경 소리", description: "바람에 흔들려 아주 가끔 한 번씩 마음을 울리는 청아한 사찰의 풍경 소리가 당신의 어지럽던 번뇌를 씻겨냅니다." },
    { emoji: '🕊️', name: "파란 도자기로 빚은 행운의 파랑새 장식품", description: "작고 여린 손바닥 위 파란 새의 매끄러운 촉감을 가만히 느끼며 당신의 마음 곁에 항상 파란 새가 있음을 환기하세요." },
    { emoji: '🎵', name: "류이치 사카모토의 피아노 순수 독주곡 'Aqua'", description: "흐르는 투명한 물처럼 맑고 자연스럽게 흘러가는 건반 소리가 내면 속 고여 있던 탁한 감정의 찌꺼기들을 흘려보냅니다." },
    { emoji: '🌱', name: "푸른 벨벳 리본으로 제본된 비밀 드로잉 정원", description: "남들이 보지 않는 은밀한 정원 한구석에서 오직 나만의 상처와 소망을 편안히 고백해 넣을 수 있는 아름다운 일기장입니다." },
    { emoji: '🎵', name: "양희은의 애잔하고 다정한 어쿠스틱 송", description: "슬픔을 외면하지 않고 그 심연 속으로 들어가 결국 따뜻하게 안아내며 마음을 위로하는 고결한 가창 곡입니다." },
    { emoji: '📜', name: "섬진강 시인 김용택의 맑은 풍경 시집", description: "자연의 소박한 바람, 강물의 반짝임, 소박한 들꽃의 이야기를 통해 당신의 자비심 주파수를 가만히 높여보세요." },
    { emoji: '🌧️', name: "바람에 스치며 부스스 흔들리는 대나무 잎 소리", description: "세상의 시끄러운 기준들에서 벗어나 자연이 전하는 순수하고 포근한 숲의 리듬 소리에 몸을 온전히 맡겨 보세요." },
    { emoji: '🕊️', name: "파란 은하수 보석이 수놓인 천연 깃털 책갈피", description: "읽다 만 따뜻한 책장을 가만히 지탱해 주는 책갈피의 파란 깃털을 만지며 오늘의 따스한 안식을 누려보시길 바랍니다." }
  ];

  const museItems: LuckyItem[] = [
    { emoji: '🌌', name: "홀스트의 '행성' 중 '목성'", description: "기쁨과 환희를 가져다주는 웅장하고 신비로운 우주적 오케스트라 선율이 굳어있던 영감의 회로를 깨웁니다." },
    { emoji: '📖', name: "릴케의 '젊은 시인에게 보내는 편지'", description: "외부의 평가에 흔들리지 않고 스스로의 깊은 내면에 집중해 고유한 예술의 꽃을 피우도록 독려하는 서적입니다." },
    { emoji: '🎹', name: "바흐의 '골드베르크 변주곡'", description: "수학적이면서도 아름다운 선율의 대위법이 뇌 시냅스를 자극해 정체되어 있던 창의적 블록을 시원하게 깨부수어 줍니다." },
    { emoji: '📜', name: "아폴리네르의 입체파 시구집", description: "기존의 정형화된 틀을 깨고 새로운 형식의 시적 발상을 마주하며 독창적인 표현력을 끌어올려 보세요." },
    { emoji: '🎸', name: "데이비드 보위의 'Space Oddity'", description: "우주 미아가 된 톰 소령의 스토리를 담은 혁신적인 록 오페라 선율이 낯설고 신선한 예술적 도전 정신을 심어 줍니다." },
    { emoji: '📕', name: "줄리아 카메론의 '아티스트 웨이'", description: "매일 아침 의식의 흐름을 기록하는 '모닝 페이지'를 작성하며 마음 깊숙이 잠들어 있는 창조성을 해방해 보세요." },
    { emoji: '🎻', name: "브루흐의 '바이올린 협주곡 1번'", description: "바이올린이 토해내는 격정적이고 아름다운 선율을 온몸으로 느끼며 당신 안에 잠재된 예술적 열정을 일깨우세요." },
    { emoji: '🌌', name: "구스타프 홀스트의 장엄한 오케스트라 '천왕성'", description: "미지의 신비를 담은 웅장한 사운드가 당신의 머릿속 굳어있던 창작 신경망 회로에 강렬한 영감의 불씨를 지핍니다." },
    { emoji: '📖', name: "미야자와 겐지의 서정적인 소설 '은하철도의 밤'", description: "은하수를 건너는 환상 기차의 여정을 담은 영롱한 이야기를 눈에 가만히 그리며 시적인 예술적 자아를 일깨워보세요." },
    { emoji: '🎹', name: "쇼팽의 '야상곡 20번 올림다단조'", description: "쓸쓸하면서도 말할 수 없이 우아하고 서정적인 멜로디의 선율을 따라 오늘 밤 나만의 영감의 도화지를 그려보세요." },
    { emoji: '📜', name: "보들레르의 상징주의 시집 '악의 꽃' 번역본", description: "어둡고 기괴한 것마저도 아름다운 예술로 승화시키는 강력한 연금술적 발상과 상상력을 온전히 흡수해 봅니다." },
    { emoji: '🎸', name: "핑크 플로이드의 명반 'The Dark Side of the Moon'", description: "우주적이고 철학적인 전율이 번지는 사운드 이펙트들을 온 감각으로 들으며 고정관념을 통쾌하게 부수어내 보세요." },
    { emoji: '📕', name: "초현실주의 화가 살바도르 달리의 수제 친필 일기", description: "매 순간을 환각적인 영감과 꿈으로 가득 채웠던 천재의 자유분방한 일지에서 상상의 해방을 경험해 보시기 바랍니다." },
    { emoji: '🎻', name: "악마의 재능으로 칭송받는 파가니니의 바이올린 솔로곡", description: "한계에 도전하는 정교하고 파괴력 있는 바이올린 활질의 기백 속에서 주춤하던 열정에 강한 동기를 불러일으키세요." },
    { emoji: '🌌', name: "빈센트 반 고흐의 '별이 빛나는 밤' 고급 도록", description: "물감을 짓이기듯 두껍고 역동적으로 소용돌이치는 붓결을 아주 미시적으로 관찰하며 그의 감정 파동을 추적하세요." },
    { emoji: '📖', name: "시인 백석의 불후의 명작 '사슴' 정제 디자인 시집", description: "토속적이고 지극히 순수하면서도 세련된 단어들의 낭만적인 조화를 소리 내어 읊으며 내적인 가사를 풍성히 채우세요." },
    { emoji: '🎹', name: "클로드 드뷔시의 인상주의 걸작 '아라베스크 1번'", description: "물결치듯 한들한들 흘러가는 아라베스크 선율을 응시하며 당신만의 우아하고 독창적인 생각의 물살을 완성하세요." },
    { emoji: '📜', name: "윤동주의 '하늘과 바람과 별과 시' 수제 필사 저널", description: "바람 한 점에도 영혼의 부끄러움을 고백하던 그의 티 없이 맑은 서정을 서예 펜으로 직접 필사하며 성찰을 즐기세요." },
    { emoji: '🎸', name: "지미 헨드릭스의 혁신적인 블루스 앨범 비닐 레코드", description: "기타 소리를 하늘 높이 울려 퍼뜨린 전설적인 록 거장의 불타오르는 에너지에서 자유의 정신을 듬뿍 물려받으세요." },
    { emoji: '📕', name: "앙리 카르티에 브레송의 수작 '결정적 순간' 사진집", description: "평범하기만 한 기하학적 찰나 속에서 기적 같은 완벽한 구도를 이뤄낸 사진들을 통해 당신의 미적 시야를 조율해 봅니다." },
    { emoji: '🎻', name: "모리스 라벨의 반복의 미학이 담긴 대작 '볼레로'", description: "작은 북 소리 하나로 시작해 점층적으로 웅대하게 폭발해 나가는 오케스트라의 율동 속에서 강한 카타르시스를 맛보세요." },
    { emoji: '🌌', name: "가에타노 도니체티의 격정 오페라 명장면 음반", description: "인간의 광기와 극적인 비장미를 오직 우아하고 장엄한 선율로 승화시킨 천재의 멜로디에 감정 주파수를 동조해 보세요." },
    { emoji: '📖', name: "에드거 앨런 포의 단편 기담 소설 '어셔가의 몰락'", description: "서늘한 묘사력과 고딕풍의 신비로운 미장센을 통해 마음 깊숙한 곳의 고유하고 진득한 상상력을 한껏 자극하세요." },
    { emoji: '🎹', name: "베토벤의 피아노 소나타 '템페스트' 격정적인 3악장", description: "폭풍우처럼 몰아치는 비장한 멜로디를 건반 위에 정성스레 수놓는 선율에서 불굴의 창작적 집중력을 선물받으세요." },
    { emoji: '📜', name: "페데리코 가르시아 로르카의 스페인 남부 안달루시아 시집", description: "가슴 뜨거운 태양과 달빛, 투우사의 투지와 상처를 격정적이고 원색적으로 뿜어내는 그의 구절을 묵상해 봅니다." },
    { emoji: '🎸', name: "비틀즈의 마지막 협동 명반 'Abbey Road' 앨범", description: "아름다운 멜로디의 연쇄적 결합을 통해 완벽한 하모니의 구성을 완성해 나가는 과정에서 연대의 아이디어를 전수받으세요." },
    { emoji: '📕', name: "파블로 피카소의 거침없는 수제 드로잉 화집", description: "대상의 형태를 허물어 본질만을 날카롭게 포착하려 했던 거장의 집요한 연필 선 하나하나를 눈에 섬세하게 각인해 보시기 바랍니다." },
    { emoji: '🎻', name: "안토니오 비발디의 '사계' 중 가장 날카로운 '겨울' 1악장", description: "살을 에는 듯한 칼바람 소리를 바이올린의 날카로운 활질로 형상화한 음률을 들으며 감각을 맑고 서늘하게 일깨우세요." },
    { emoji: '🌌', name: "헤르만 헤세가 노년에 지은 시집 '나비'", description: "가장 가볍고 찰나적으로 살다 가는 나비의 날갯짓에서 자연의 영원하고 신비로운 낭만적 주파수를 선물받으세요." },
    { emoji: '📖', name: "호르헤 루이스 보르헤스의 마술적 사실주의 단편선 '픽션들'", description: "우주를 하나의 무한한 책 도서관으로 묘사한 그의 미로 같은 이야기 속에서 상상력의 경계를 끝없이 개방해 보세요." },
    { emoji: '🎹', name: "볼프강 아마데우스 모차르트의 어둡고 고결한 '판타지 라단조'", description: "그의 평소 음악들과 달리 깊고 조용한 상실의 슬픔을 우아하고 맑은 선율로 다듬어낸 피아노곡과 함께 명상하세요." }
  ];

  let candidateItems: LuckyItem[] = [];
  switch (appKey) {
    case 'orange': candidateItems = orangeItems; break;
    case 'trinity': candidateItems = trinityItems; break;
    case 'heal': candidateItems = healItems; break;
    case 'bluebird': candidateItems = bluebirdItems; break;
    case 'muse': candidateItems = museItems; break;
    default: candidateItems = orangeItems; break;
  }

  const todayStr = getTodayDateKey();
  let year = 2026;
  let month = 7;
  let day = 11;
  try {
    const parts = todayStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  } catch (err) {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  // Seed generation based on UID, appKey, year, and month
  // This ensures a unique permutation of items for this user for this month
  const seedString = `${uid || 'guest'}-${appKey}-${year}-${month}`;
  
  // A simple hash function to generate a stable numeric seed from seedString
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed = (seed << 5) - seed + seedString.charCodeAt(i);
    seed |= 0; // Convert to 32bit integer
  }

  // Simple LCG (Linear Congruential Generator) to shuffle deterministically
  const shuffled = [...candidateItems];
  let currentSeed = Math.abs(seed);
  const nextRandom = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
  };

  // Fisher-Yates shuffle using our deterministic nextRandom
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Choose index based on the day of the month (1-indexed, so day - 1)
  // modulo to make sure we don't exceed array bounds
  const index = (day - 1) % shuffled.length;
  return shuffled[index];
}

const getBeautifulFallbackSummary = (appKey: string): string => {
  const textMap: Record<string, string> = {
    trinity: "#운명직관 #시간선정렬 #타로통찰\n오늘 마주한 타로 상징과 시간선의 조율이 당신의 내적 나침반을 명확히 밝혔습니다. 조급함을 내려놓고 직관의 흐름을 신뢰하며 나아가세요.",
    muse: "#아티스트메이트 #영감스파크 #창작수다\n아티스트 메이트와 나눈 편안한 수다 속에서 굳어있던 창의적 불꽃이 새롭게 피어났습니다. 가벼운 마음으로 나만의 고유한 표현을 즐겨보세요.",
    orange: "#내면아이치유 #감정수용 #온화한정원\n내면아이에게 건넨 다정한 공감과 마음 일기가 가슴속에 포근한 온기를 채웠습니다. 스스로를 있는 그대로 아끼며 편안한 쉼을 누리세요.",
    bluebird: "#호오포노포노정화 #비밀의정화 #영혼의쉼표\n고요한 선율 속에 털어놓은 고백과 정화의 기도가 무거운 마음의 짐을 덜어주었습니다. 맑아진 호흡으로 평온한 밤을 맞이하세요.",
    heal: "#세도나방하착 #무의식흘려보내기 #생체이완\n오늘 뽑은 릴리즈 힐링카드와 방하착 명상을 통해 쥐고 있던 통제와 불안을 가볍게 흘려보냈습니다. 편안해진 신체 리듬 속에서 깊은 휴식을 취하세요.",
  };
  
  return textMap[appKey] || "#하루성찰 #내면조율 #새로운에너지\n오늘 하루의 발자취가 내면에 조용한 지혜와 쉼을 남겼습니다. 편안한 마음으로 하루를 정리하고 새로운 에너지를 맞이하세요.";
};

interface AppEpilogueContextPayload {
  systemPrompt: string;
  userPrompt: string;
  luckyItem: LuckyItem;
}

function buildAppEpilogueContext(
  appKey: string,
  appRecords: MirrorRecord[],
  firebaseUser: { uid: string } | null,
  profile?: UserProfile | null,
): AppEpilogueContextPayload {
  const todayKey = getTodayDateKey();
  const uid = firebaseUser?.uid || 'guest';
  const luckyItem = getDailyLuckyItem(appKey, firebaseUser?.uid);
  const sajuObj = calculateDetailedSaju(profile);

  // 1. App-Specific Chat Conversations
  const personaMap: Record<string, string> = {
    trinity: 'trinity',
    orange: 'orange',
    bluebird: 'bluebird',
    heal: 'aura',
    muse: 'muse',
  };
  const targetPersona = personaMap[appKey] || appKey;
  let chatSnippets: string[] = [];

  try {
    const rawUnified = localStorage.getItem('chat_history_unified');
    if (rawUnified) {
      const parsed = JSON.parse(rawUnified);
      const personaMsgs = parsed[targetPersona];
      if (Array.isArray(personaMsgs)) {
        const validMsgs = personaMsgs
          .filter((m: any) => m.content && m.id !== 'greet' && !m.content.includes('어서와요') && !m.content.includes('만나서 반가워'))
          .slice(-8);
        if (validMsgs.length > 0) {
          chatSnippets = validMsgs.map((m: any) => {
            const role = m.role === 'user' ? '사용자' : (targetPersona.toUpperCase() + ' 파트너');
            return `${role}: "${m.content.slice(0, 140)}"`;
          });
        }
      }
    }
  } catch (_) {}

  // Single-app chat fallback
  try {
    const rawSingle = localStorage.getItem(`chat_history_${appKey}`);
    if (rawSingle && chatSnippets.length === 0) {
      const singleMsgs = JSON.parse(rawSingle);
      if (Array.isArray(singleMsgs)) {
        const validMsgs = singleMsgs.slice(-8);
        chatSnippets = validMsgs.map((m: any) => {
          const role = m.sender === 'user' || m.role === 'user' ? '사용자' : '안내자';
          const text = m.text || m.content || '';
          return `${role}: "${text.slice(0, 140)}"`;
        });
      }
    }
  } catch (_) {}

  // 2. App-Specific Daily Cards & Diagnostics
  let dailyInfo = '';
  try {
    const rawDaily = localStorage.getItem(`prism_daily_oracle_${appKey}_${todayKey}`) ||
      localStorage.getItem(`prism_latest_daily_${appKey}`) ||
      localStorage.getItem(`${appKey}_daily_result_${uid}`) ||
      localStorage.getItem(`${appKey}_daily_result_guest`);

    if (rawDaily) {
      const parsedDaily = JSON.parse(rawDaily);
      const cardName = parsedDaily.cardName || parsedDaily.drawnCard?.nameKo || parsedDaily.drawnCard?.name || parsedDaily.symbol || '';
      const keywords = (parsedDaily.cardKeywords || parsedDaily.drawnCard?.keywords || []).slice(0, 3).join(', ');
      const diag = (parsedDaily.diagnosis || parsedDaily.summary || parsedDaily.data?.diagnosis || '').slice(0, 180);
      const remedy = (parsedDaily.remedy || parsedDaily.briefTip || parsedDaily.data?.remedy || '').slice(0, 100);
      
      const parts = [];
      if (cardName) parts.push(`뽑은 카드: [${cardName}${keywords ? ` (${keywords})` : ''}]`);
      if (diag) parts.push(`진단: ${diag}`);
      if (remedy) parts.push(`처방: ${remedy}`);
      if (parts.length > 0) {
        dailyInfo = parts.join(' | ');
      }
    }
  } catch (_) {}

  // 3. App-Specific Omni Feature Activities
  let featureActivities: string[] = [];
  try {
    const rawFeats = localStorage.getItem('prism_omni_feature_history');
    if (rawFeats) {
      const featList = JSON.parse(rawFeats);
      if (Array.isArray(featList)) {
        featureActivities = featList
          .filter((f: any) => f.app === appKey)
          .slice(0, 4)
          .map((f: any) => `[${f.featureName}] ${f.summary.slice(0, 120)}`);
      }
    }
  } catch (_) {}

  // 4. Mirror Records
  const mirrorSnippets = appRecords.slice(0, 4).map((r) => {
    const dateStr = r.timestamp.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    return `[${dateStr} - ${r.title}] ${r.content.substring(0, 180)}`;
  });

  // 5. Compose Data Sections
  const dataSections: string[] = [];
  if (chatSnippets.length > 0) {
    dataSections.push(`■ [${EPILOGUE_APP_LABELS[appKey] || appKey}] 최근 채팅/대화 내용:\n${chatSnippets.join('\n')}`);
  }
  if (dailyInfo) {
    dataSections.push(`■ 오늘의 데일리 카드 및 진단 결과:\n${dailyInfo}`);
  }
  if (featureActivities.length > 0) {
    dataSections.push(`■ 최근 수행한 앱 고유 활동:\n${featureActivities.join('\n')}`);
  }
  if (mirrorSnippets.length > 0) {
    dataSections.push(`■ 저장된 의식/활동 기록:\n${mirrorSnippets.join('\n')}`);
  }

  let finalDataBlock = dataSections.join('\n\n');
  if (!finalDataBlock.trim()) {
    finalDataBlock = `사용자가 오늘 [${EPILOGUE_APP_LABELS[appKey] || appKey}]에서 수행한 직접적인 기록은 아직 없으나, 이 차원의 고유 에너지와 내일의 방향성을 바탕으로 해석합니다.`;
  }

  // 6. Distinct App Personality, Role, and Domain Lens
  let appDomainDesc = '';
  let appTagline = '';
  let appSpecificFocus = '';
  let appHashtagExamples = '';

  switch (appKey) {
    case 'trinity':
      appDomainDesc = '운명의 시간선, 타로 오라클의 상징 체계, 우주적 동시성(Synchronicity), 직관과 미래 선택의 갈림길';
      appTagline = 'TRINITY 운명 오라클 에필로그';
      appSpecificFocus = '오늘 사용자가 마주한 타로/오라클 상징과 시간선의 조율 상태, 사용자가 타로 상담에서 털어놓은 미래에 대한 고민/질문을 바탕으로 결단과 직관의 관점에서 요약하세요.';
      appHashtagExamples = '#시간선정렬 #타로직관 #운명통찰 #내적나침반';
      break;
    case 'orange':
      appDomainDesc = '내면아이(Inner Child)의 목소리, 솔직한 감정의 표출과 수용, 따뜻한 자기 연민, 감정 정원의 안식';
      appTagline = 'ORANGE 마음치유 에필로그';
      appSpecificFocus = '오늘 오렌지 비밀의 방이나 감정 일기, 대화에서 사용자가 털어놓은 속마음과 감정 돌봄을 바탕으로, 내면아이가 얻은 위로와 평온한 자기수용의 관점에서 요약하세요.';
      appHashtagExamples = '#내면아이치유 #감정수용 #온화한안식 #마음정원가꾸기';
      break;
    case 'bluebird':
      appDomainDesc = '호오포노포노 4단계 정화(미안해·고마워·용서해·사랑해), 새벽 라디오의 비밀 고백, 시적 서정과 영혼의 쉼표';
      appTagline = 'BLUEBIRD 평온 에필로그';
      appSpecificFocus = '오늘 블루버드에 털어놓은 마음의 비밀과 나눈 정화 대화를 바탕으로, 무거운 짐을 내려놓고 고요한 영혼의 쉼표를 찍은 관점에서 요약하세요.';
      appHashtagExamples = '#호오포노포노정화 #비밀의정화 #영혼의쉼표 #맑은평온';
      break;
    case 'heal':
      appDomainDesc = '세도나 메서드(Sedona Method) 4단계 방하착(Releasing), 릴리즈 힐링카드 조율, 신체 긴장 이완과 생체 호흡 리듬';
      appTagline = 'AURA 웰니스 에필로그';
      appSpecificFocus = '오늘 릴리즈 힐링카드와 방하착 명상, 웰니스 대화에서 흘려보낸 에고 저항(결핍/두려움/통제)과 긴장을 분석하여, 가벼워진 몸과 숨결의 관점에서 요약하세요.';
      appHashtagExamples = '#세도나방하착 #무의식흘려보내기 #신체이완 #호흡의조율';
      break;
    case 'muse':
      appDomainDesc = '창작의 스파크, 아티스트 메이트(브리트니/빌리/가가/마이클)와의 캐주얼한 일상 수다와 음악 교감, 창조적 영감의 확장';
      appTagline = 'MUSE 영감 에필로그';
      appSpecificFocus = '오늘 아티스트 메이트와 나눈 일상 수다, 음악 이야기, 창작 고민을 바탕으로, 친구와의 가벼운 대화가 가져다준 기분 전환과 창조적 활력의 관점에서 요약하세요.';
      appHashtagExamples = '#아티스트메이트 #영감스파크 #일상수다충전 #창조적몰입';
      break;
    default:
      appDomainDesc = '하루 여정의 성찰과 조율';
      appTagline = '에필로그 마스터';
      appSpecificFocus = '해당 차원의 활동과 대화를 바탕으로 명료하게 요약하세요.';
      appHashtagExamples = '#하루성찰 #내면조율 #새로운에너지';
      break;
  }

  const systemPrompt = `당신은 ${appTagline}입니다.
담당 차원 영역: ${appDomainDesc}

[절대 작성 원칙]
1. 다른 앱들과 절대 동일하거나 뻔한 상투적 서두("당신의 하루 궤적을 분석한 결과...", "내면의 중심을 비추고...")를 쓰지 마세요.
2. 사용자가 이 앱에서 실제로 나눈 **구체적인 채팅 대화 내용(고민, 질문)과 활동(뽑은 카드명, 수행한 명상/수다)**을 직접 인용하며 생생하고 차별화된 해석을 제공하세요.
3. ${appSpecificFocus}
4. 첫 줄 해시태그는 반드시 이 앱 영역에 특화된 태그 3~4개를 공백으로 구분해 작성하세요. (예: ${appHashtagExamples})
5. 요약 본문은 둘째 줄부터 2~3문장(120~180자 내외)으로 간결하고 가독성 높게 작성하세요.
6. '행운의 아이템/색상/숫자'는 본문에 일절 언급하지 마세요.`;

  const profileSnippet = profile ? `
[사용자 프로필 & 사주 본원 정보]
- 이름/닉네임: ${profile.basic?.nickname || profile.basic?.name || '여행자'}
${sajuObj ? `- 사주 본원: ${sajuObj.dayMaster.hanja}(${sajuObj.dayMaster.symbolName}) | 보약 오행: ${sajuObj.elements.lacking.name}\n- 2026 세운: ${sajuObj.annual2026.theme.split('—')[0]}` : ''}
${profile.fate?.lifeGoal ? `- 지향하는 삶의 목표: ${profile.fate.lifeGoal}` : ''}
${profile.fate?.currentWorry ? `- 최근 마음에 둔 고민: ${profile.fate.currentWorry}` : ''}
`.trim() : '';

  const userPrompt = `[${EPILOGUE_APP_LABELS[appKey] || appKey.toUpperCase()}] 차원 활동 & 채팅 분석 요청
기준 시각: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
${profileSnippet ? `\n${profileSnippet}\n` : ''}
[수집된 실제 활동 및 채팅 데이터]
${finalDataBlock}

위 데이터를 바탕으로, 이 앱만의 고유한 영역 특성을 100% 살려 첫 줄 해시태그(3~4개)와 2~3문장의 명쾌한 맞춤 요약문을 작성해 주세요.`;

  return { systemPrompt, userPrompt, luckyItem };
}

const getSanitizedErrorMessage = (errorStr: string | null | undefined): string => {
  if (!errorStr) return 'AI 요약을 생성하는 중에 오차가 발생했습니다.';
  
  // If the error looks like an API/JSON error
  const normalized = String(errorStr);
  if (
    normalized.includes('500') ||
    normalized.includes('error_id') ||
    normalized.includes('Internal server error') ||
    normalized.includes('provider_error') ||
    normalized.includes('{') ||
    normalized.includes('}') ||
    normalized.includes('fetch') ||
    normalized.includes('HTTP')
  ) {
    return '현재 고차원 우주 AI 주파수가 일시적으로 혼잡합니다. 잠시 후 자동으로 요약 생성을 다시 시도합니다.';
  }
  
  return normalized;
};

export default function EpilogueApp() {
  const [, navigate] = useLocation();
  const { firebaseUser, updateSharedState, sharedState, setIsChatOpen, isChatOpen } = useApp();
  const [records, setRecords] = useState<MirrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'synthesis' | 'rituals' | 'chats' | 'daily' | 'soul_spec'>('synthesis');
  const [activeDAppFilter, setActiveDAppFilter] = useState<'all' | 'trinity' | 'muse' | 'orange' | 'bluebird' | 'heal'>('all');
  const [selectedRecord, setSelectedRecord] = useState<MirrorRecord | null>(null);

  const [appSummaries, setAppSummaries] = useState<Record<string, { summary: string; updatedAt: string; luckyItem?: LuckyItem }>>(() => {
    const initial: Record<string, { summary: string; updatedAt: string; luckyItem?: LuckyItem }> = {};
    for (const key of EPILOGUE_APP_KEYS) {
      try {
        const localSaved = localStorage.getItem(`soul_mirror_${key}_summary`);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (parsed?.summary && !isFallbackEpilogueSummary(parsed.summary)) {
            initial[key] = parsed;
            continue;
          }
        }
      } catch (_) {}
      initial[key] = {
        summary: getBeautifulFallbackSummary(key),
        updatedAt: new Date().toISOString(),
        luckyItem: getDailyLuckyItem(key),
      };
    }
    return initial;
  });
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [summarizingApps, setSummarizingApps] = useState<Record<string, boolean>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const recordsRef = useRef<MirrorRecord[]>([]);
  const initiatedSummariesRef = useRef<Record<string, boolean>>({});
  const isAutoRefreshingRef = useRef(false);
  const [showEmblemModal, setShowEmblemModal] = useState(false);
  const [selectedSummaryAppKey, setSelectedSummaryAppKey] = useState<string | null>(null);
  const [expandedSummaryAppKeys, setExpandedSummaryAppKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    updateSharedState({ sourceApp: 'EPILOGUE' }, 'EPILOGUE');
  }, []);

  const loadSummaries = useCallback(async () => {
    const loaded: Record<string, { summary: string; updatedAt: string; luckyItem?: LuckyItem }> = {};

    for (const key of EPILOGUE_APP_KEYS) {
      try {
        const localSaved = localStorage.getItem(`soul_mirror_${key}_summary`);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (parsed?.summary && !isFallbackEpilogueSummary(parsed.summary)) {
            if (!parsed.updatedAt) {
              parsed.updatedAt = new Date(0).toISOString();
            }
            loaded[key] = parsed;
          } else if (parsed?.summary) {
            localStorage.removeItem(`soul_mirror_${key}_summary`);
          }
        }
      } catch (_) {}
    }

    if (firebaseUser) {
      try {
        for (const key of EPILOGUE_APP_KEYS) {
          try {
            const docRef = doc(db, 'soul_mirror', firebaseUser.uid, 'dapps', key);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.summary && !isFallbackEpilogueSummary(data.summary)) {
                loaded[key] = {
                  summary: data.summary,
                  updatedAt: data.summaryUpdatedAt || new Date(0).toISOString(),
                  luckyItem: data.luckyItem,
                };
                localStorage.setItem(`soul_mirror_${key}_summary`, JSON.stringify(loaded[key]));
              }
            }
          } catch (e) {
            console.warn(`[EpilogueApp] Failed to load Firestore summary for ${key}:`, e);
          }
        }
      } catch (e) {
        console.warn('[EpilogueApp] Error loading summaries dynamically:', e);
      }
    }

    setAppSummaries((prev) => ({ ...prev, ...loaded }));
    setSummariesLoading(false);
  }, [firebaseUser]);

  const persistSummary = useCallback(async (
    appKey: string,
    newSummary: { summary: string; updatedAt: string; luckyItem: LuckyItem },
  ) => {
    localStorage.setItem(`soul_mirror_${appKey}_summary`, JSON.stringify(newSummary));
    setAppSummaries((prev) => ({ ...prev, [appKey]: newSummary }));
    setSummaryErrors((prev) => {
      const next = { ...prev };
      delete next[appKey];
      return next;
    });

    if (!firebaseUser) return;
    try {
      await setDoc(doc(db, 'soul_mirror', firebaseUser.uid, 'dapps', appKey), {
        summary: newSummary.summary,
        luckyItem: newSummary.luckyItem,
        summaryUpdatedAt: newSummary.updatedAt,
      }, { merge: true });
    } catch (dbErr) {
      console.error('Firestore save error:', dbErr);
    }
  }, [firebaseUser]);

  const handleGenerateSummary = useCallback(async (appKey: string) => {
    setSummarizingApps((prev) => ({ ...prev, [appKey]: true }));
    initiatedSummariesRef.current[appKey] = true;
    const appRecords = records.filter((r) => r.source === appKey);
    const { systemPrompt, userPrompt, luckyItem: luckyItemObj } = buildAppEpilogueContext(appKey, appRecords, firebaseUser, sharedState?.userProfile);

    try {
      const summaryText = await invokeEpilogueSummaryLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      await persistSummary(appKey, {
        summary: summaryText,
        luckyItem: luckyItemObj,
        updatedAt: new Date().toISOString(),
      });

      recordPrismFeature({
        app: 'epilogue',
        featureName: `${EPILOGUE_APP_LABELS[appKey] || appKey.toUpperCase()} 차원 에필로그 성찰`,
        summary: `성찰 요약: "${summaryText.slice(0, 150)}...", 행운 아이템: [${luckyItemObj?.name || '크리스탈'}]`,
        details: { appKey, summary: summaryText, luckyItem: luckyItemObj },
      });
    } catch (e: any) {
      console.error('Error generating summary:', e);
      const sanitizedErr = getSanitizedErrorMessage(e?.message);
      setSummaryErrors((prev) => ({
        ...prev,
        [appKey]: sanitizedErr,
      }));

      // If the app has no valid summary yet or failed, ensure fallback summary is set immediately
      const fallbackText = getBeautifulFallbackSummary(appKey);
      await persistSummary(appKey, {
        summary: fallbackText,
        luckyItem: luckyItemObj,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setSummarizingApps((prev) => ({ ...prev, [appKey]: false }));
    }
  }, [persistSummary, records, firebaseUser]);

  const needsSummaryRefresh = useCallback((key: string) => {
    const summary = appSummaries[key];
    if (!summary?.summary) return true;
    if (isFallbackEpilogueSummary(summary.summary)) return true;
    if (!summary.updatedAt) return true;
    if (!summary.summary.trim().startsWith('#')) return true;
    if (summary.summary.length > 220 || summary.summary.includes('*(현재 기본 요약')) return true;
    try {
      const summaryDateStr = new Date(summary.updatedAt).toDateString();
      const todayDateStr = new Date().toDateString();
      if (summaryDateStr !== todayDateStr) return true;

      const appRecords = records.filter((r) => r.source === key);
      if (appRecords.length > 0) {
        const lastRecordTime = Math.max(...appRecords.map((r) => r.timestamp.getTime()));
        const lastSummaryTime = new Date(summary.updatedAt).getTime();
        if (lastRecordTime > lastSummaryTime + 15000) {
          return true;
        }
      }
      return false;
    } catch {
      return true;
    }
  }, [appSummaries, records]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    if (loading || summariesLoading || isAutoRefreshingRef.current) return;

    const pendingKeys = EPILOGUE_APP_KEYS.filter((key) => {
      return needsSummaryRefresh(key) && !initiatedSummariesRef.current[key] && !summarizingApps[key];
    });

    if (pendingKeys.length === 0) return;
    isAutoRefreshingRef.current = true;

    Promise.allSettled(
      pendingKeys.map(async (key) => {
        initiatedSummariesRef.current[key] = true;
        await handleGenerateSummary(key);
      })
    ).finally(() => {
      isAutoRefreshingRef.current = false;
    });
  }, [loading, summariesLoading, needsSummaryRefresh, handleGenerateSummary]);

  useEffect(() => {
    const fetchMirrorRecords = async () => {
      setLoading(true);
      try {
        if (!firebaseUser) {
          setRecords([]);
          return;
        }

        const isBypass = localStorage.getItem('developer_bypass') === 'true';
        if (isBypass) {
          console.log('[EpilogueApp] Using beautiful mock mirror logs in developer bypass mode');
          setRecords(MOCK_RECORDS.map(r => ({ ...r, classification: getRecordClassification(r.type) })));
          return;
        }

        const results: MirrorRecord[] = [];
        const sources = [
          { key: 'trinity', coll: 'trinity_history', label: 'TRINITY' },
          { key: 'muse', coll: 'muse_history', label: 'MUSE' },
          { key: 'orange', coll: 'orange_history', label: 'ORANGE' },
          { key: 'bluebird', coll: 'bluebird_history', label: 'BLUEBIRD' },
          { key: 'heal', coll: 'heal_history', label: 'AURA' }
        ] as const;

        for (const { key, coll, label } of sources) {
          try {
            const snap = await getDocs(query(
              collection(db, coll, firebaseUser.uid, 'entries'),
              orderBy('createdAt', 'desc'),
              limit(50)
            ));

            snap.forEach(doc => {
              const data = doc.data();
              const rawType = data.type || '';
              
              const content = data.content || data.text || data.response || data.reply || data.guidance || data.analysis || '';
              if (!content && !data.title && !data.summary) {
                return;
              }

              let timestamp = new Date();
              if (data.createdAt) {
                timestamp = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              } else if (data.timestamp) {
                timestamp = new Date(data.timestamp);
              }

              let defaultTitle = '';
              if (rawType === 'chat') {
                defaultTitle = `${label} 수호자와의 우주적 조율`;
              } else {
                const matchedType = TYPE_CONFIG[rawType];
                defaultTitle = matchedType ? `${matchedType.label} 기록` : (key === 'muse' ? '아티스트 모닝 리포트' : '신성한 의식');
              }

              const classification = getRecordClassification(rawType);

              results.push({
                id: `${key}-${doc.id}`,
                source: key,
                sourceLabel: label,
                type: rawType || (key === 'orange' ? 'Journal' : 'Record'),
                title: data.title || data.summary || defaultTitle,
                content,
                timestamp,
                classification,
                metadata: data
              });
            });
          } catch (childErr: any) {
            console.warn(`[EpilogueApp] Skipping ${coll} load due to permissions or errors:`, childErr.message);
          }
        }

        setRecords(results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      } catch (err: any) {
        console.warn("[EpilogueApp] Error loading Soul Mirror logs gracefully resolved: ", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMirrorRecords();
    loadSummaries();
  }, [firebaseUser, loadSummaries]);

  // Exclude raw type 'chat' from rituals, keep only target items
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesTab = r.classification === activeTab;
      const matchesDApp = activeDAppFilter === 'all' || r.source === activeDAppFilter;
      const matchesSearch = !searchQuery || 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sourceLabel.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesTab && matchesDApp && matchesSearch;
    });
  }, [records, activeTab, activeDAppFilter, searchQuery]);

  // Computed metrics for stats board
  const stats = useMemo(() => {
    const counts = {
      tarot: records.filter(r => r.source === 'trinity' && r.type !== 'chat').length,
      diary: records.filter(r => r.source === 'orange' && r.type !== 'chat').length,
      meditation: records.filter(r => r.source === 'heal' && r.type !== 'chat').length,
      secrets: records.filter(r => r.source === 'bluebird' && r.type !== 'chat').length,
      mentoring: records.filter(r => r.source === 'muse' && r.type !== 'chat').length,
      chats: records.filter(r => r.type === 'chat' || r.type === 'picture_diary').length,
    };
    const total = records.length;
    return { counts, total };
  }, [records]);

  // Radar chart mathematical configurations
  const radarData = useMemo(() => {
    const categories = [
      { key: 'meditation', label: '활력 (AURA)', count: stats.counts.meditation, color: '#10b981', glow: 'rgba(16,185,129,0.3)', textColor: 'text-emerald-400' },
      { key: 'tarot', label: '운명 (TRINITY)', count: stats.counts.tarot, color: '#facc15', glow: 'rgba(250,204,21,0.3)', textColor: 'text-yellow-400' },
      { key: 'diary', label: '무의식 (ORANGE)', count: stats.counts.diary, color: '#f97316', glow: 'rgba(249,115,22,0.3)', textColor: 'text-orange-400' },
      { key: 'secrets', label: '치유 (BLUEBIRD)', count: stats.counts.secrets, color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', textColor: 'text-sky-400' },
      { key: 'mentoring', label: '창의 (MUSE)', count: stats.counts.mentoring, color: '#6366f1', glow: 'rgba(99,102,241,0.3)', textColor: 'text-indigo-400' }
    ];

    const maxCount = Math.max(...categories.map(c => c.count), 1);
    const cx = 100;
    const cy = 100;
    const R = 55; // Max radius for SVG standard (200x200 canvas)

    // Generate concentric pentagons for grid lines
    const grids = [0.25, 0.5, 0.75, 1.0].map(scale => {
      const points = categories.map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const x = cx + R * scale * Math.cos(angle);
        const y = cy + R * scale * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
      return points;
    });

    // Generate axis labels & dynamic energy points
    const axes = categories.map((cat, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = cx + R * Math.cos(angle);
      const y = cy + R * Math.sin(angle);

      // Distribute labels nicely outside of grid
      const labelDist = R + 18;
      const lx = cx + labelDist * Math.cos(angle);
      const ly = cy + labelDist * Math.sin(angle);

      // Safe scaling for visual beauty (minimum 15% radius to avoid pure dot)
      const scale = stats.total === 0 ? 0.4 : 0.15 + 0.85 * (cat.count / maxCount);
      const vx = cx + R * scale * Math.cos(angle);
      const vy = cy + R * scale * Math.sin(angle);

      return {
        ...cat,
        x, y, lx, ly, vx, vy, angle
      };
    });

    const polygonPoints = axes.map(a => `${a.vx},${a.vy}`).join(' ');

    return { cx, cy, R, grids, axes, polygonPoints, maxCount };
  }, [stats]);

  // Helper to calculate relative percentage of DApp activity
  const getDAppPercentage = (count: number) => {
    if (stats.total === 0) return 0;
    return Math.round((count / stats.total) * 100);
  };

  return (
    <div className="min-h-full bg-transparent text-white/90 relative overflow-x-hidden font-soft">

      <div className="fixed top-safe-2 left-1.5 sm:left-2 md:top-safe-4 md:left-6 pointer-events-auto z-[110] scale-[0.68] sm:scale-75 md:scale-100 origin-top-left">
         <div className="flex items-center gap-3 text-left">
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center shadow-lg hover:shadow-xl group backdrop-blur-md bg-black/40 cursor-pointer" onClick={() => setShowEmblemModal(true)}>
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }} className="absolute inset-0 rounded-full border border-dashed border-white/10" />
               <div className="absolute inset-[3px] md:inset-[4px] rounded-full border border-white/5 bg-black/50 flex items-center justify-center font-sans">
                 <Moon size={24} className="relative z-10 text-purple-400 drop-shadow-[0_0_12px_currentColor] transition-transform group-hover:scale-110 duration-500 animate-pulse md:w-6 md:h-6" strokeWidth={1.5} />
               </div>
            </div>
            <div className="cursor-pointer" onClick={() => navigate('/')}>
               <h1 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-tighter">PRISM</h1>
               <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-widest font-bold font-sans">EPILOGUE • REFLECTION & HEALING</p>
            </div>
         </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 prism-xs-pad pt-page pb-page md:pt-page-md md:pb-page-md space-y-8 sm:space-y-12">


        {/* Cosmic Aura Balance Map & Action Records Breakdown Cards at the Top */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* 1. Cosmic Radar Balance Chart Card */}
          <div className="p-8 rounded-[40px] bg-black/30 backdrop-blur-md border border-white/5 shadow-2xl hover:border-purple-500/10 hover:-translate-y-1 transition-all duration-300 space-y-6 flex flex-col justify-between">
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Moon size={12} className="text-purple-400" />
              Cosmic Aura Balance Map
            </h4>
            
            <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(168,85,247,0.12)]">
                <defs>
                  {/* Glow and Aura Gradients */}
                  <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#c084fc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </radialGradient>
                </defs>

                {/* Concentric grid lines (Concentric Pentagons) */}
                {radarData.grids.map((points, idx) => (
                  <polygon 
                    key={idx} 
                    points={points} 
                    fill="none" 
                    stroke="rgba(255,255,255,0.04)" 
                    strokeWidth="0.8" 
                  />
                ))}

                {/* Axis lines (from center to corners) */}
                {radarData.axes.map((axis, idx) => (
                  <line
                    key={idx}
                    x1={radarData.cx}
                    y1={radarData.cy}
                    x2={axis.x}
                    y2={axis.y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Energy polygon (User actual state) */}
                <polygon
                  points={radarData.polygonPoints}
                  fill="url(#radarGlow)"
                  stroke="#a855f7"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  className="transition-all duration-700 ease-out"
                />

                {/* Value dots for each DApp */}
                {radarData.axes.map((axis, idx) => (
                  <circle
                    key={idx}
                    cx={axis.vx}
                    cy={axis.vy}
                    r="3.5"
                    fill={axis.color}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-all duration-700 ease-out cursor-pointer"
                    style={{ filter: `drop-shadow(0 0 5px ${axis.color})` }}
                  />
                ))}

                {/* Outer Text Labels */}
                {radarData.axes.map((axis, idx) => {
                  // Smart text anchor adjustments based on angle position
                  let textAnchor: "start" | "middle" | "end" | "inherit" = "middle";
                  if (axis.lx < radarData.cx - 5) textAnchor = "end";
                  if (axis.lx > radarData.cx + 5) textAnchor = "start";
                  
                  let dy = "0.33em";
                  if (axis.ly < radarData.cy - 10) dy = "-0.1em"; // top label
                  if (axis.ly > radarData.cy + 10) dy = "0.8em";  // bottom labels

                  return (
                    <text
                      key={idx}
                      x={axis.lx}
                      y={axis.ly}
                      textAnchor={textAnchor}
                      dy={dy}
                      className="text-[8px] font-cute font-medium tracking-tight fill-white/40 hover:fill-white/80 transition-colors"
                    >
                      {axis.label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 2. Enhanced DApp Metrics Breakdown Card */}
          <div className="p-8 rounded-[40px] bg-black/30 backdrop-blur-md border border-white/5 shadow-2xl hover:border-purple-500/10 hover:-translate-y-1 transition-all duration-300 space-y-6 flex flex-col justify-center">
            <h4 className="text-[10px] font-bold text-white/40 tracking-widest flex items-center gap-2">
              <CheckCircle size={12} className="text-purple-400" />
              Action Records Breakdown
            </h4>
            <div className="space-y-5">
              {[
                { label: "🧘 활력 · 명상 수행", count: stats.counts.meditation, color: "#10b981", barBg: "from-emerald-500 to-emerald-400" },
                { label: "🔮 운명 · 타로 상담", count: stats.counts.tarot, color: "#eab308", barBg: "from-yellow-500 to-yellow-400" },
                { label: "🎨 무의식 · 미술 일지", count: stats.counts.diary, color: "#f97316", barBg: "from-orange-500 to-orange-400" },
                { label: "📻 치유 · 비밀 우체통", count: stats.counts.secrets, color: "#3b82f6", barBg: "from-sky-500 to-sky-400" },
                { label: "🌟 창의 · 롤모델 조언", count: stats.counts.mentoring, color: "#6366f1", barBg: "from-indigo-500 to-indigo-400" },
                { label: "💬 교감 · 대화록 수록", count: stats.counts.chats, color: "#64748b", barBg: "from-slate-400 to-slate-300" },
              ].map((item, idx) => {
                const pct = getDAppPercentage(item.count);
                return (
                  <div key={idx} className="space-y-2 group">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/60 font-cute group-hover:text-white/85 transition-colors">{item.label}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[10px] text-white/30">({item.count}회)</span>
                        <span style={{ color: item.color }} className="font-bold">{pct}%</span>
                      </div>
                    </div>
                    
                    {/* Neon Glowing Progress Bar container */}
                    <div className="h-2 w-full rounded-full bg-black/40 border border-white/5 overflow-hidden relative shadow-inner">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${item.barBg} transition-all duration-1000 ease-out`}
                        style={{ 
                          width: `${pct}%`,
                          boxShadow: `0 0 10px ${item.color}30` 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Feed with Tabs and Listing */}
        <div className="space-y-8 text-left">
            
            {/* Filter Buttons & Search Input */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
              <div className="p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-wrap gap-1 max-w-full overflow-x-auto no-scrollbar shadow-inner">
                <button
                  onClick={() => {
                    setActiveTab('synthesis');
                    setSelectedRecord(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-cute text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                    activeTab === 'synthesis' 
                      ? 'bg-purple-600 border border-purple-500/30 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  ✨ 앱별 에필로그 요약 (Synthesis)
                </button>
                <button
                  onClick={() => {
                    setActiveTab('rituals');
                    setSelectedRecord(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-cute text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                    activeTab === 'rituals' 
                      ? 'bg-purple-600 border border-purple-500/30 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  🔮 특수 의식 (Rituals)
                </button>
                <button
                  onClick={() => {
                    setActiveTab('daily');
                    setSelectedRecord(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-cute text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                    activeTab === 'daily' 
                      ? 'bg-purple-600 border border-purple-500/30 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  ☀️ 데일리 신탁 (Daily)
                </button>
                <button
                  onClick={() => {
                    setActiveTab('soul_spec');
                    setSelectedRecord(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-cute text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                    activeTab === 'soul_spec' 
                      ? 'bg-purple-600 border border-purple-500/30 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  🧬 소울 프로필 (Soul)
                </button>
                <button
                  onClick={() => {
                    setActiveTab('chats');
                    setSelectedRecord(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-cute text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                    activeTab === 'chats' 
                      ? 'bg-purple-600 border border-purple-500/30 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  💬 교감 대화 (Chats)
                </button>
              </div>

              {/* Search Bar */}
              {activeTab !== 'synthesis' && (
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input 
                    type="text"
                    placeholder="의식이나 대화 기록 찾아보기..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 focus:border-purple-400/50 hover:border-white/20 focus:outline-none rounded-2xl py-3 pl-11 pr-4 text-xs font-soft placeholder:text-white/20 text-white transition-all shadow-2xl hover:bg-black/50"
                  />
                </div>
              )}
            </div>

            {/* DApp Source Filter Chips */}
            {activeTab !== 'synthesis' && (
              <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto scrollbar-none">
                {([
                  { id: 'all', label: '🌌 전체', activeClass: 'bg-purple-600 border-purple-500/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' },
                  { id: 'trinity', label: '🔮 운명 (TRINITY)', activeClass: 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-350 shadow-[0_0_15px_rgba(250,204,21,0.2)]' },
                  { id: 'orange', label: '🎨 무의식 (ORANGE)', activeClass: 'bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
                  { id: 'muse', label: '🌟 창의 (MUSE)', activeClass: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' },
                  { id: 'bluebird', label: '📻 치유 (BLUEBIRD)', activeClass: 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
                  { id: 'heal', label: '🧘 활력 (AURA)', activeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
                ] as const).map(dapp => (
                  <button
                    key={dapp.id}
                    onClick={() => {
                      setActiveDAppFilter(dapp.id);
                      setSelectedRecord(null);
                    }}
                    className={`px-4 py-2 rounded-xl font-cute text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      activeDAppFilter === dapp.id
                        ? dapp.activeClass
                        : 'bg-white/5 border border-white/5 text-white/40 hover:text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {dapp.label}
                  </button>
                ))}
              </div>
            )}

            {/* List entries */}
            <div className="space-y-6 text-left">
              {activeTab === 'synthesis' ? (
                <div className="space-y-8 text-left">
                  {/* Synthesis introduction and global batch action */}
                  <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-md border border-purple-500/30 hover:border-purple-500/50 hover:bg-white/[0.08] hover:-translate-y-0.5 shadow-2xl transition-all duration-300">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-purple-300">🌌 초차원 에필로그 통합 요약 (Cosmic Epilogue Synthesis)</h4>
                      <p className="text-xs text-white/50 font-cute">흩어져 있는 세션의 기록을 하나로 조화롭게 농축하여, 더 이상 복잡하게 쌓이지 않는 격조 높은 동기화 보고서를 남깁니다.</p>
                      <p className="text-[10px] text-purple-400/80 font-cute">※ 매일 자정 이후 자동으로 갱신됩니다.</p>
                    </div>
                  </div>

                  {/* The Grouped Cards of 5 Apps */}
                  <div className="grid grid-cols-1 gap-8">
                    {([
                      { key: 'orange', name: 'ORANGE', label: '마음 치유와 감정 성찰', border: 'border border-orange-500/30 hover:border-orange-500/60 shadow-[0_4px_24px_rgba(249,115,22,0.02)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.06)]', textColor: 'text-orange-405', icon: TreeDeciduous, glow: 'rgba(249,115,22,0.02)', accent: '#f97316' },
                      { key: 'trinity', name: 'TRINITY', label: '운명 오라클과 우주 나침반', border: 'border border-yellow-500/30 hover:border-yellow-500/60 shadow-[0_4px_24px_rgba(250,204,21,0.02)] hover:shadow-[0_12px_40px_rgba(250,204,21,0.06)]', textColor: 'text-yellow-405', icon: Sparkles, glow: 'rgba(250,204,21,0.02)', accent: '#facc15' },
                      { key: 'heal', name: 'AURA', label: '신체 웰니스와 생체 활력', border: 'border border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_4px_24px_rgba(16,185,129,0.02)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.06)]', textColor: 'text-emerald-405', icon: Activity, glow: 'rgba(16,185,129,0.02)', accent: '#10b981' },
                      { key: 'bluebird', name: 'BLUEBIRD', label: '예술 정서와 소리 치유', border: 'border border-sky-500/30 hover:border-sky-500/60 shadow-[0_4px_24px_rgba(59,130,246,0.02)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.06)]', textColor: 'text-sky-450', icon: Bird, glow: 'rgba(59,130,246,0.02)', accent: '#3b82f6' },
                      { key: 'muse', name: 'MUSE', label: '영감 창조와 아이디어 코칭', border: 'border border-indigo-500/30 hover:border-indigo-500/60 shadow-[0_4px_24px_rgba(99,102,241,0.02)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.06)]', textColor: 'text-indigo-405', icon: Music, glow: 'rgba(99,102,241,0.02)', accent: '#6366f1' }
                    ] as Array<{ key: string; name: string; label: string; border: string; textColor: string; icon: any; glow: string; accent: string }>).map(app => {
                      const appRecords = records.filter(r => r.source === app.key);
                      const summaryData = appSummaries[app.key];
                      const currentSummaryText = summaryData?.summary || getBeautifulFallbackSummary(app.key);
                      const hasSummary = !!currentSummaryText;
                      const isSelfSummarizing = !!summarizingApps[app.key];
                      const summaryError = summaryErrors[app.key];
                      const IconComponent = app.icon;
                      const isExpanded = !!expandedSummaryAppKeys[app.key];

                      return (
                        <motion.div
                          key={app.key}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-6 sm:p-8 rounded-[40px] glass ${app.border} flex flex-col gap-6 relative overflow-hidden group hover:-translate-y-1 shadow-2xl hover:bg-white/[0.07] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-500`}
                          style={{ backgroundColor: app.glow }}
                        >
                          {/* Background gradient decor */}
                          <div className="absolute top-0 right-0 w-48 h-48 bg-radial-gradient from-white/5 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none opacity-50 group-hover:scale-110 transition-transform duration-700" />
                          
                          {/* Decorative background watermark icon of the DApp */}
                          <div 
                            className="absolute -bottom-6 -right-6 text-white/[0.02] group-hover:text-white/[0.04] group-hover:scale-110 transition-all duration-700 pointer-events-none z-0"
                            style={{ color: app.accent }}
                          >
                            <IconComponent size={140} />
                          </div>
                          
                          {/* Left Column: Heading and Actual Summary */}
                          <div className="w-full space-y-5 text-left z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/80 border border-white/10 group-hover:scale-105 transition-transform">
                                <IconComponent size={18} style={{ color: app.accent }} />
                              </div>
                              <div>
                                <h3 className="text-lg font-cute font-bold flex items-center gap-2">
                                  <span style={{ color: app.accent }}>{app.name}</span>
                                  <span className="text-white/20">|</span>
                                  <span className="text-xs font-normal text-white/50">{app.label}</span>
                                </h3>
                                <div className="flex items-center gap-2 text-[9px] font-mono uppercase text-white/30 tracking-wider">
                                  <span>기록 수 {appRecords.length}회</span>
                                  {summaryData?.updatedAt && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-white/10" />
                                      <span>마지막 요약: {new Date(summaryData.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Main Summary Text Block & Daily Lucky Item */}
                            <div className="flex flex-col gap-4 w-full">
                              <div className="p-6 md:p-8 rounded-3xl bg-black/40 border border-white/10 min-h-[100px] flex items-center shadow-inner">
                                {isSelfSummarizing ? (
                                  <div className="flex items-center gap-3 py-4 text-purple-300 font-sans text-sm">
                                    <div className="relative flex items-center justify-center w-5 h-5">
                                      <motion.div
                                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.9, 0.4] }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                        className="w-4 h-4 rounded-full bg-purple-400 blur-[2px]"
                                      />
                                      <div className="w-2 h-2 rounded-full bg-white absolute" />
                                    </div>
                                    <span className="font-medium">사용자의 {appRecords.length}개 궤적을 심장박동처럼 조화롭게 요약하는 중...</span>
                                  </div>
                                ) : (() => {
                                  const { tags, body } = parseSummaryAndTags(currentSummaryText, app.key);
                                  return (
                                    <div className="flex flex-col gap-3.5 w-full">
                                      {tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                          {tags.map((tag, tIdx) => (
                                            <span
                                              key={tIdx}
                                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md transition-all shadow-sm group-hover:brightness-110"
                                              style={{
                                                backgroundColor: `${app.accent}15`,
                                                borderColor: `${app.accent}35`,
                                                color: app.accent,
                                              }}
                                            >
                                              <span className="opacity-60 text-[10px]">#</span>
                                              <span>{tag}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="text-sm md:text-[15px] text-stone-200 leading-loose font-sans pr-2 whitespace-pre-wrap">
                                        {body || currentSummaryText}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              {summaryError && (
                                <p className="text-[10px] text-amber-300/80 font-sans px-1">{summaryError}</p>
                              )}
                              
                              {/* Daily Lucky Item Block */}
                              {!isSelfSummarizing && (
                                <div className="p-5 md:p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5 relative overflow-hidden group/lucky">
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.04] to-transparent opacity-0 group-hover/lucky:opacity-100 transition-opacity" />
                                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-purple-400">
                                    <Sparkles size={12} className="animate-pulse" />
                                    <span>오늘의 소울 행운 아이템</span>
                                    <span className="text-white/20">|</span>
                                    <span className="text-[9px] font-mono text-white/40 font-normal">매일 자정 새로운 공명</span>
                                  </div>
                                  <div className="text-xs md:text-sm text-stone-200 leading-loose font-sans font-medium flex gap-3 items-start pl-1 pr-2">
                                    <span className="text-[18px] shrink-0 select-none">{(summaryData && summaryData.luckyItem) ? summaryData.luckyItem.emoji : getDailyLuckyItem(app.key, firebaseUser?.uid).emoji}</span>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-stone-100 font-bold" style={{ color: app.accent }}>{(summaryData && summaryData.luckyItem) ? summaryData.luckyItem.name : getDailyLuckyItem(app.key, firebaseUser?.uid).name}</span>
                                      <span className="text-stone-400 text-xs md:text-[13px] leading-loose">{(summaryData && summaryData.luckyItem) ? summaryData.luckyItem.description : getDailyLuckyItem(app.key, firebaseUser?.uid).description}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action buttons inside Card */}
                            <div className="flex items-center justify-between pt-1 w-full gap-2 z-10">
                              <div className="flex items-center gap-2">
                                {hasSummary && (() => {
                                  const { body } = parseSummaryAndTags(summaryData.summary, app.key);
                                  return <TTSButton text={body || summaryData.summary} voice={app.key === 'orange' ? 'Puck' : 'Kore'} />;
                                })()}
                                <button
                                  type="button"
                                  onClick={() => void handleGenerateSummary(app.key)}
                                  disabled={isSelfSummarizing}
                                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/60 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                                  title="이 차원의 최신 대화·활동을 반영하여 다시 요약"
                                >
                                  <RefreshCw size={11} className={isSelfSummarizing ? 'animate-spin text-purple-400' : ''} />
                                  <span>{isSelfSummarizing ? '요약 중' : '다시 요약'}</span>
                                </button>
                              </div>
                              <button
                                onClick={() => setExpandedSummaryAppKeys(prev => ({ ...prev, [app.key]: !prev[app.key] }))}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
                                title={isExpanded ? '접기' : '더보기'}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Interactive Expandable Segment for Recent Action History */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="w-full border-t border-white/5 pt-6 mt-2 space-y-4 text-left overflow-hidden z-10"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                      최근 수행 이력
                                    </span>
                                    <span className="text-[9px] text-white/30 font-mono">총 {appRecords.length}개의 기록</span>
                                  </div>

                                  {/* Horizontal Scroll Controls using Arrow Buttons */}
                                  {appRecords.length > 3 && (
                                    <div className="flex items-center gap-1.5 z-20">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const container = document.getElementById(`scroll-history-${app.key}`);
                                          container?.scrollBy({ left: -320, behavior: 'smooth' });
                                        }}
                                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-90"
                                        title="이전 기록"
                                      >
                                        <ChevronLeft size={13} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const container = document.getElementById(`scroll-history-${app.key}`);
                                          container?.scrollBy({ left: 320, behavior: 'smooth' });
                                        }}
                                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-90"
                                        title="다음 기록"
                                      >
                                        <ChevronRight size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {appRecords.length === 0 ? (
                                  <p className="text-xs text-white/20 py-8 text-center font-cute bg-black/20 border border-dashed border-white/5 rounded-2xl">최근 세션 없음</p>
                                ) : (
                                  <div 
                                    id={`scroll-history-${app.key}`}
                                    className="flex w-full max-w-full overflow-x-auto no-scrollbar gap-4 pb-3 scroll-smooth snap-x snap-mandatory"
                                  >
                                    {appRecords.map((r) => (
                                      <div 
                                        key={r.id} 
                                        onClick={() => setSelectedRecord(r)}
                                        className="w-[80vw] xs:w-[280px] sm:w-[320px] shrink-0 snap-start p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-purple-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer space-y-2 block"
                                      >
                                        <div className="flex items-center justify-between text-[8px] font-mono text-white/30">
                                          <span className="bg-white/5 px-2 py-0.5 rounded-lg uppercase tracking-wider">{r.type.substring(0, 12)}</span>
                                          <span>{r.timestamp.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm font-cute text-white/90 group-hover:text-purple-300 font-bold truncate leading-tight transition-colors">{r.title}</p>
                                        <p className="text-[11px] text-white/40 font-cute line-clamp-2 leading-relaxed break-all">{r.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : loading ? (
                <div className="py-24 text-center space-y-4">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                    <div className="absolute inset-0 border-2 border-t-purple-400 rounded-full animate-spin" />
                  </div>
                  <p className="text-[11px] text-white/30 uppercase tracking-[0.3em] font-mono">Polishing the Cosmic Glass...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-white/15 rounded-[40px] space-y-6 bg-black/40">
                  <Activity size={48} className="mx-auto text-white/20 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-md font-cute text-white/45">우주 평면에 기록된 정보가 존재하지 않습니다.</p>
                    <p className="text-xs font-cute text-white/20">각 앱 하단의 특수 기능이나 교감 대화를 시작하면 이곳에 각인이 생성됩니다.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredRecords.map((record, i) => {
                    const matched = getRecordUIConfig(record);
                    const Icon = matched.icon;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: Math.min(i * 0.05, 1) }}
                        key={record.id}
                        onClick={() => setSelectedRecord(record)}
                        className="group relative p-8 rounded-[36px] bg-black/30 backdrop-blur-md border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.04] hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row gap-6 md:items-start"
                      >
                        {/* Type indicator on hover */}
                        <div className="absolute inset-0 rounded-[36px] bg-gradient-to-r from-purple-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${matched.bg} ${matched.border} border`}>
                          <Icon size={20} />
                        </div>

                        {/* Text */}
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-white/40">
                              <span style={{ color: matched.color }} className="font-bold uppercase">{matched.label}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                              <span className="uppercase text-[9px] px-2 py-0.5 rounded-lg bg-white/5 text-purple-300 border border-white/10">{record.sourceLabel}</span>
                            </div>
                            <span className="text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                              <Calendar size={12} />
                              {record.timestamp.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h3 className="text-xl font-cute font-medium text-white/90 group-hover:text-purple-300 transition-colors">
                            {record.title}
                          </h3>
                        </div>

                        <div className="flex items-center self-end md:self-center text-white/20 group-hover:text-purple-300 group-hover:translate-x-1 transition-all">
                          <ChevronRight size={18} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        {/* Begin Again Button Footer */}
        <footer className="pt-12 text-center flex flex-col items-center gap-4">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-mono">The Samsara Reflection Loop</p>
          <button 
            onClick={() => navigate('/')}
            className="group relative w-12 h-12 rounded-full border border-white/10 bg-white/5 shadow-2xl hover:border-purple-500/40 hover:text-purple-300 transition-all duration-300 flex items-center justify-center cursor-pointer hover:shadow-2xl"
          >
            <InfinityIcon size={18} className="text-white/60 group-hover:text-purple-300 transition-transform duration-500 group-hover:rotate-180" />
          </button>
        </footer>
      </div>

      {/* Premium Detail Drawer / Modal for reading the full trace */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[85vh] rounded-[48px] bg-[#0c0c12] border border-white/10 p-8 md:p-12 text-left flex flex-col gap-6 overflow-hidden shadow-2xl"
            >
              {/* Card headers */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                {(() => {
                  const matched = getRecordUIConfig(selectedRecord);
                  return (
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${matched.bg} ${matched.border} border`}>
                        {React.createElement(matched.icon, { size: 18 })}
                      </div>
                      <div>
                        <p className="text-[9px] font-mono tracking-widest font-bold uppercase" style={{ color: matched.color }}>{matched.label}</p>
                        <p className="text-[10px] text-white/50 font-mono">{selectedRecord.sourceLabel} · {selectedRecord.timestamp.toLocaleString('ko-KR')}</p>
                      </div>
                    </div>
                  );
                })()}
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Card Body Contents */}
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 space-y-4">
                <h3 className="text-2xl font-cute text-white/90 leading-snug">
                  {selectedRecord.title}
                </h3>
                {(() => {
                  const imageUrl = selectedRecord.metadata?.imageUrl || 
                                   selectedRecord.metadata?.metadata?.imageUrl || 
                                   selectedRecord.metadata?.image || 
                                   selectedRecord.metadata?.metadata?.image;
                  if (imageUrl) {
                    return (
                      <div className="w-full relative aspect-square max-h-[360px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-6">
                        <img 
                          src={imageUrl} 
                          alt={selectedRecord.title} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="text-sm text-white/70 leading-relaxed font-cute whitespace-pre-wrap break-keep">
                  {selectedRecord.content}
                </div>
                <CosmicInteractiveShell record={selectedRecord} />
              </div>

              {/* Card Footer controls */}
              <div className="border-t border-white/5 pt-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">TYPE: {selectedRecord.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TTSButton text={selectedRecord.content} voice={selectedRecord.source === 'orange' ? 'Puck' : 'Kore'} />
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-cute font-medium transition-colors cursor-pointer shadow-md"
                  >
                    확인
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmblemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowEmblemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass p-8 md:p-10 max-w-lg w-full rounded-[48px] border border-purple-500/30 text-center space-y-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowEmblemModal(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <X size={18} />
              </button>

              <div className="mx-auto w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <Moon className="text-purple-400 animate-pulse" size={40} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-sans text-white tracking-tight uppercase">Epilogue Sanctuary Lore</h3>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em]">영혼의 기록 수집기</p>
              </div>

              <p className="text-sm text-purple-100/70 leading-relaxed font-sans text-left break-keep bg-white/5 p-6 rounded-3xl border border-purple-500/10">
                <strong>EPILOGUE</strong>는 우주의 모든 의식과 수호자들과의 내밀한 대화 기록들이 흘러들어 조화를 이루는 영혼의 기억 저장소입니다. 지나치고 잊혀 갈 수도 있는 찬란했던 명상, 기획, 오라클 동조의 동력들을 한자리에서 보듬고 조율하여 더 나은 치유의 궤도를 열어줍니다.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Historical Resonance Synergy', val: 96, color: 'from-purple-400 to-indigo-500' },
                  { label: 'Memory Stability Integrity', val: 93, color: 'from-indigo-400 to-pink-500' },
                  { label: 'Soul Mirror Alignment', val: 95, color: 'from-purple-500 to-purple-600' }
                ].map(spec => (
                  <div key={spec.label} className="space-y-1 text-left">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/60">{spec.label}</span>
                      <span className="text-purple-400 font-bold">{spec.val}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${spec.val}%` }} 
                        transition={{ duration: 1.2, ease: "easeOut" }} 
                        className={`h-full bg-gradient-to-r ${spec.color}`} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowEmblemModal(false)}
                className="w-full py-4 rounded-[20px] bg-purple-600 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs"
              >
                Sync Complete 🌀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSummaryAppKey && (() => {
          const appConfigs = [
            { key: 'orange', name: 'ORANGE', label: '마음 치유와 감정 성찰', border: 'border-orange-500/30', bgGlow: 'rgba(249,115,22,0.15)', icon: TreeDeciduous, accent: '#f97316' },
            { key: 'trinity', name: 'TRINITY', label: '운명 오라클과 우주 나침반', border: 'border-yellow-500/30', bgGlow: 'rgba(250,204,21,0.15)', icon: Sparkles, accent: '#facc15' },
            { key: 'heal', name: 'AURA', label: '신체 웰니스와 생체 활력', border: 'border-emerald-500/30', bgGlow: 'rgba(16,185,129,0.15)', icon: Activity, accent: '#10b981' },
            { key: 'bluebird', name: 'BLUEBIRD', label: '예술 정서와 소리 치유', border: 'border-sky-500/30', bgGlow: 'rgba(59,130,246,0.15)', icon: Bird, accent: '#3b82f6' },
            { key: 'muse', name: 'MUSE', label: '영감 창조와 아이디어 코칭', border: 'border-indigo-500/30', bgGlow: 'rgba(99,102,241,0.15)', icon: Music, accent: '#6366f1' }
          ] as const;
          
          const currentApp = appConfigs.find(c => c.key === selectedSummaryAppKey);
          if (!currentApp) return null;
          
          const summaryData = appSummaries[selectedSummaryAppKey];
          const hasSummary = !!summaryData?.summary;
          const appRecords = records.filter(r => r.source === selectedSummaryAppKey);
          const IconComponent = currentApp.icon;
          
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setSelectedSummaryAppKey(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass p-6 md:p-8 max-w-2xl w-full rounded-[48px] border border-white/10 text-left space-y-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                style={{ background: `radial-gradient(circle at top right, ${currentApp.bgGlow}, #0a0a0f 60%)` }}
              >
                <button
                  onClick={() => setSelectedSummaryAppKey(null)}
                  className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10" style={{ boxShadow: `0 0 20px ${currentApp.accent}30` }}>
                    <IconComponent size={22} style={{ color: currentApp.accent }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-cute flex items-center gap-2">
                      <span style={{ color: currentApp.accent }}>{currentApp.name}</span>
                      <span className="text-white/20">|</span>
                      <span className="text-xs font-normal text-white/50">{currentApp.label}</span>
                    </h3>
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                      총 기록 {appRecords.length}회
                    </p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider font-sans">분석 결과 요약</h4>
                    <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                      {hasSummary ? (() => {
                        const { tags, body } = parseSummaryAndTags(summaryData.summary, currentApp.key);
                        return (
                          <div className="space-y-3">
                            {tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {tags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm"
                                    style={{
                                      backgroundColor: `${currentApp.accent}18`,
                                      borderColor: `${currentApp.accent}40`,
                                      color: currentApp.accent,
                                    }}
                                  >
                                    <span className="opacity-60 text-[11px]">#</span>
                                    <span>{tag}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-sm font-cute text-white/90 leading-relaxed break-keep whitespace-pre-wrap">
                              {body || summaryData.summary}
                            </p>
                          </div>
                        );
                      })() : (
                        <p className="text-xs text-white/30 font-cute">작성된 요약이 아직 존재하지 않습니다.</p>
                      )}
                    </div>
                    {hasSummary && (() => {
                      const { body } = parseSummaryAndTags(summaryData.summary, currentApp.key);
                      return (
                        <div className="flex justify-end pt-1">
                          <TTSButton text={body || summaryData.summary} voice={currentApp.key === 'orange' ? 'Puck' : 'Kore'} />
                        </div>
                      );
                    })()}

                    {/* Daily Lucky Item Block inside Modal */}
                    {(
                      <div className="mt-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 relative overflow-hidden">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-purple-400">
                          <Sparkles size={11} className="animate-pulse" />
                          <span>오늘의 소울 행운 아이템</span>
                          <span className="text-white/20">|</span>
                          <span className="text-[9px] font-mono text-white/30 font-normal">매일 자정 새로운 공명</span>
                        </div>
                        <div className="text-xs text-white/85 leading-relaxed font-sans font-medium flex gap-2.5 items-start pl-1 pr-2">
                          <span className="text-[15px] shrink-0 select-none">{(summaryData && summaryData.luckyItem) ? summaryData.luckyItem.emoji : getDailyLuckyItem(currentApp.key, firebaseUser?.uid).emoji}</span>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-white/95 font-bold" style={{ color: currentApp.accent }}>{(summaryData && summaryData.luckyItem) ? summaryData.luckyItem.name : getDailyLuckyItem(currentApp.key, firebaseUser?.uid).name}</span>
                            <span className="text-white/50 text-[11px] leading-relaxed font-sans font-normal">{(summaryData && summaryData.luckyItem) ? summaryData.luckyItem.description : getDailyLuckyItem(currentApp.key, firebaseUser?.uid).description}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider font-sans">최근 수행 이력 (상세 기록)</h4>
                    {appRecords.length === 0 ? (
                      <p className="text-xs text-white/20 py-6 text-center font-cute bg-black/20 border border-dashed border-white/5 rounded-2xl">최근 세션 없음</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {appRecords.map((r, ri) => (
                          <div 
                            key={r.id} 
                            onClick={() => {
                              setSelectedRecord(r);
                            }}
                            className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/25 transition-all cursor-pointer space-y-2 text-left group/item"
                          >
                            <div className="flex items-center justify-between text-[9px] font-mono text-white/40">
                              <span className="bg-white/5 px-2 py-0.5 rounded-lg uppercase tracking-wider">{r.type.substring(0, 12)}</span>
                              <span>{r.timestamp.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm font-cute text-white/90 group-hover/item:text-purple-300 transition-colors font-bold truncate leading-tight">{r.title}</p>
                            <p className="text-[11px] text-white/40 font-cute line-clamp-2 leading-relaxed break-all">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedSummaryAppKey(null)}
                    className="w-full py-4 rounded-[20px] bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <SpecialFeatureFabGroup>
        <ChatFabButton onClick={() => setIsChatOpen(true)} />
      </SpecialFeatureFabGroup>
    </div>
  );
}
