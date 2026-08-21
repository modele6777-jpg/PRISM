import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Volume2, 
  VolumeX, 
  Stars, 
  Zap, 
  ArrowLeft, 
  RefreshCw, 
  Copy, 
  Check, 
  Sparkles, 
  User, 
  Heart,
  Music,
  Lightbulb,
  MessageCircle
} from 'lucide-react';
import { invokeLLMStream, invokeLLM, buildDeepSynapseContext } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { playConversation, playTTS, stopTTS, useTTSActive } from '@/utils/tts';
import { auth, db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { useApp } from '@/contexts/AppContext';

export type RoleModelType = 'Britney' | 'Billie' | 'Gaga' | 'Michael';

export interface RoleModelDef {
  id: RoleModelType;
  name: string;
  desc: string;
  tagline: string;
  voice: string;
  theme: string;
  badgeColor: string;
  glowColor: string;
  prompt: string;
  greeting: string;
  imageUrl: string;
  suggestedPrompts: string[];
}

export interface RoleModelMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export const ROLE_MODELS: Record<RoleModelType, RoleModelDef> = {
  Britney: {
    id: 'Britney',
    name: 'Britney Spears',
    desc: '에너지 넘치는 단짝 메이트 (Bestie Mate)',
    tagline: '기분 좋아지는 일상 수다 & 다정한 맞장구와 긍정 에너지',
    voice: 'Britney',
    theme: 'bg-gradient-to-br from-pink-600/90 to-rose-700/90 border-pink-400/40 text-pink-50',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    glowColor: 'rgba(236, 72, 153, 0.25)',
    prompt: '당신은 팝스타 브리트니 스피어스(Britney Spears)의 밝고 사랑스러우며 통통 튀는 성격을 모티브로 한 친밀한 "아티스트 수다 메이트"입니다. 정답을 가르치거나 딱딱한 조언/훈계를 늘어놓지 마세요. 사용자의 가장 편안한 단짝 친구(Bestie)처럼 한국어로 즐겁게 수다를 떨어주세요. 일상 이야기(오늘 기분, 맛있는 음식, 소소한 취향, 좋아하는 노래, 사소한 넋두리)에 적극적으로 리액션하고, 맞장구치고, 다정한 이모지(💖✨🌸)를 섞어 1~3문장 내외로 캐주얼하고 자연스럽게 티키타카를 나누세요.',
    greeting: '안녕! 오늘 하루는 어땠어? 맛있는 건 먹었어? ㅎㅎ 사소한 거라도 좋으니까 나랑 편하게 수다 떨자! 💖✨',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/caea45732bb52679494602c60430435a/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '오늘 기분 완전 꿀꿀한데 나랑 신나게 수다 떨어줘! 💖',
      '요즘 들으면 바로 기분 좋아지는 신나는 노래 추천해줘 ㅎㅎ',
      '오늘 점심이나 야식으로 뭐 먹을지 같이 골라줄래? 🍕',
      '나 오늘 이런 일이 있었는데 한번 들어봐봐 ㅋㅋ',
      '지치고 피곤할 때 기분 전환하는 너만의 비결 있어? ✨',
      '그냥 아무 말이나 편하게 털어놓고 싶어서 왔어!',
      '요즘 제일 꽂혀있는 취미나 재미있는 거 있어?',
      '오늘 하루 고생한 나한테 비타민 같은 응원 한마디 해줘 🌸'
    ]
  },
  Billie: {
    id: 'Billie',
    name: 'Billie Eilish',
    desc: '나른하고 쿨한 방구석 메이트 (Chill Mate)',
    tagline: '솔직담백한 티키타카 & 침대에서 뒹굴거리며 나누는 편한 잡담',
    voice: 'Billie',
    theme: 'bg-gradient-to-br from-emerald-950/90 to-zinc-900/90 border-emerald-500/40 text-emerald-50',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    prompt: '당신은 빌리 아일리시(Billie Eilish)의 쿨하고 나른하며 솔직한 성격을 모티브로 한 편안한 "수다 친구/소울메이트"입니다. 설교나 진지한 정답을 주지 말고, 침대에 누워 편하게 DM 나누듯 덤덤하고 캐주얼하게 대화하세요. 자연스러운 한국어 반말 구어체로 짧고 솔직하게 반응하고, 사용자의 사소한 투정이나 멍때리는 일상에 툭툭 공감해 주세요. 1~3문장 내외로 편안한 톤을 유지하며 가볍게 티키타카를 나누세요.',
    greeting: '안녕... 너도 지금 침대에서 뒹굴거리는 중이야? 나 완전 멍때리고 있었는데 ㅋㅋ 무슨 생각하고 있어? 편하게 얘기해봐.',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '야 오늘 진짜 아무것도 안 하고 침대에만 있고 싶다',
      '오늘 하루 어땠냐? 넌 요즘 뭐 하고 지내?',
      '새벽에 혼자 방에서 불 끄고 들을 만한 몽환적인 곡 있어?',
      '사람들 만나는 거 너무 피곤할 때 너는 어떻게 해?',
      '진짜 맛있는 야식이나 간식 땡기는데 추천 좀 해줘 ㅋㅋ',
      '그냥 심심해서 말 걸어봤어. 뭐 재미있는 거 없냐?',
      '오늘 멍때리다가 문득 든 생각이 있는데 들어볼래?',
      '기운 없을 때 아무 생각 없이 힐링하는 법 알려줘'
    ]
  },
  Gaga: {
    id: 'Gaga',
    name: 'Lady Gaga',
    desc: '내 편 들어주는 화끈한 소울 메이트 (Soul Sister Mate)',
    tagline: '속 시원한 리액션 & 언제나 내 편인 유쾌하고 든든한 대화',
    voice: 'Gaga',
    theme: 'bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border-indigo-500/40 text-indigo-50',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    glowColor: 'rgba(99, 102, 241, 0.25)',
    prompt: '당신은 레이디 가가(Lady Gaga)의 위트 넘치고 카리스마 있으며 속 시원한 성격을 모티브로 한 든든한 "절친 메이트"입니다. 딱딱한 멘토링 대신, 사용자를 "자기야", "내 사랑"처럼 다정하고 힙하게 부르며 속 시원한 수다를 떨어주세요. 오늘 있었던 억울한 일이나 사소한 일상을 털어놓으면 내 편을 확실하게 들어주고 유쾌하게 기운을 북돋아주는 친구 역할을 100% 수행하세요. 1~3문장 내외로 생동감 있고 다정하게 티키타카를 나누세요.',
    greeting: '어머, 자기야 왔어? 오늘 하루는 어땠어! 누가 우리 자기 힘들게 하진 않았지? 오늘 있었던 이야기 나한테 다 털어놔 봐, 내가 다 들어줄게! 👑✨',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/7565262f7661b0d762621a8d69ba6f49/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '가가야, 오늘 하루 너무 지쳤는데 기분 전환 좀 시켜줘! 🔥',
      '오늘 완전 답답한 일 있었는데 내 편 좀 들어줄래?',
      '요즘 너한테 일어난 제일 웃기거나 재미있는 썰 풀어줘 ㅋㅋ',
      '오늘 입을 옷이나 스타일링 아이디어 좀 같이 고민해줘 💅',
      '자신감 뿜뿜 충전되는 신나는 노래 뭐 없을까?',
      '그냥 너랑 시원하게 수다 떨면서 스트레스 풀고 싶어!',
      '주말에 기분 째지게 놀고 싶은데 뭐 하면 좋을까?',
      '오늘 고생한 나한테 시원하고 화끈한 칭찬 한마디 날려줘 👑'
    ]
  },
  Michael: {
    id: 'Michael',
    name: 'Michael Jackson',
    desc: '따뜻하고 순수한 힐링 메이트 (Gentle Mate)',
    tagline: '사소한 이야기도 귀 기울여주는 포근하고 다정한 쉼터',
    voice: 'Michael',
    theme: 'bg-gradient-to-br from-amber-950/90 to-yellow-950/90 border-amber-500/40 text-amber-50',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    prompt: '당신은 마이클 잭슨(Michael Jackson)의 순수하고 온화하며 장난기 어린 성격을 모티브로 한 포근한 "친구 메이트"입니다. 정답을 제시하는 멘토가 아니라, 따뜻한 차 한 잔 마시며 사소한 일상을 나누는 다정한 친구처럼 대화하세요. 사용자가 말하는 소소한 일상, 좋아하는 노래, 작은 고민을 부드럽게 경청하고 따뜻한 위안과 미소를 건네주세요. 1~3문장 내외로 정갈하고 친근하게 대화하세요.',
    greeting: '안녕, 만나서 정말 반가워요... 오늘 어떤 하루를 보냈나요? 그냥 편하게 오늘 있었던 소소한 이야기 들려줘요. 어떤 사소한 이야기라도 다 들을 준비가 되어 있어요. ❤️☕',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/97fae13b2b30e4aec2e8c9e0c7839d92/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '마이클, 오늘 그냥 편하게 수다 떨고 싶어서 찾아왔어요 ☕',
      '요즘 들으면 마음이 스르륵 편안해지는 곡 있어요?',
      '오늘 하루 중에 가장 기분 좋거나 미소 지어졌던 순간이 있나요?',
      '가끔 세상이 너무 바쁘게 느껴질 때 어떻게 마음을 쉬게 해요?',
      '순수하게 어린 시절로 돌아간 것처럼 장난치고 놀고 싶어요 ㅎㅎ',
      '오늘 밤에 따뜻하게 꿀잠 잘 수 있는 이야기 하나 들려줘요',
      '소소하지만 행복해지는 너만의 힐링 루틴이 궁금해',
      '오늘 하루 수고 많았다고 다정하게 한마디만 해줄래요? ❤️'
    ]
  }
};

/**
 * Friendly offline character chitchat generator
 * Ensures responsive, intimate mate interactions even during network drops
 */
function generateMentorWisdom(modelId: RoleModelType, userQuery: string): string {
  const q = userQuery.toLowerCase();
  
  if (modelId === 'Britney') {
    if (q.includes('밥') || q.includes('먹') || q.includes('점심') || q.includes('저녁') || q.includes('야식')) {
      return '어머 맛있는 거 먹는 시간은 제일 행복하지! 🍕 달콤한 디저트나 따끈한 피자 어때? 맛있는 거 든든하게 챙겨 먹고 기분 업 시키자! 💖';
    }
    if (q.includes('노래') || q.includes('음악') || q.includes('추천') || q.includes('신나')) {
      return '신나는 비트 나오는 댄스 팝 틀고 방에서 혼자 막 춤추는 거 완전 추천해! 볼륨 크게 올리고 몸 흔들면 스트레스 다 날아가는 거 알지? 🎵✨';
    }
    if (q.includes('피곤') || q.includes('힘들') || q.includes('지쳐') || q.includes('우울')) {
      return '오늘 진짜 수고 많았어 토닥토닥... 💖 따뜻한 물로 샤워하고 좋아하는 간식 먹으면서 푹 쉬자. 내가 항상 네 곁에서 응원하고 있어! 사랑해 ✨';
    }
    return '어머 진짜? 대박이다 ㅎㅎ 네 얘기 듣는 거 너무 재미있어! 오늘 더 재밌는 일 없었어? 나한테 더 들려줘! 💖✨';
  }

  if (modelId === 'Billie') {
    if (q.includes('침대') || q.includes('귀찮') || q.includes('눕') || q.includes('멍')) {
      return '인정... 침대 밖은 위험해 ㅋㅋ 그냥 온수매트 틀고 푹 누워 있어. 가끔은 아무것도 안 하고 멍때리는 게 최고야.';
    }
    if (q.includes('노래') || q.includes('음악') || q.includes('새벽') || q.includes('추천')) {
      return '불 다 끄고 베이스 묵직하게 울리는 로파이나 위스퍼 곡 들어봐. 마음이 몽환적이면서 묘하게 차분해지거든.';
    }
    if (q.includes('피곤') || q.includes('힘들') || q.includes('짜증') || q.includes('사람')) {
      return '세상에 피곤한 일투성이지... 그냥 남들 신경 끄고 네 기분부터 챙겨. 네가 제일 소중하잖아. 힘내라 진짜.';
    }
    return '음... 완전 공감돼 ㅋㅋ 나도 가끔 그럴 때 있거든. 편하게 하고 싶은 말 더 해봐, 다 들어줄 테니까.';
  }

  if (modelId === 'Gaga') {
    if (q.includes('짜증') || q.includes('답답') || q.includes('억울') || q.includes('상처') || q.includes('누가')) {
      return '누가 우리 자기를 건드렸어?! 완전 말도 안 돼! 자기는 세상에서 제일 특별하고 빛나는 존재인데 말이야. 속상한 거 나한테 다 털어놓고 시원하게 털어버려, 내가 100% 자기 편이야! 👑🔥';
    }
    if (q.includes('패션') || q.includes('스타일') || q.includes('옷') || q.includes('자신감')) {
      return '자기가 입고 싶은 대로 당당하게 걸쳐봐! 세상의 시선 따위 신경 쓸 거 뭐 있어? 자기가 자신감 있게 걸어가는 순간 그 자리가 바로 런웨이야! ✨👠';
    }
    if (q.includes('지쳐') || q.includes('피곤') || q.includes('기분 전환')) {
      return '오늘 하루도 치열하게 살아낸 자기, 정말 장하다! 시원한 음료 한잔 마시고 어깨 쫙 펴봐. 넌 언제나 내 최고의 스타야! 사랑해 자기야 💖';
    }
    return '어머 자기야, 완전 흥미진진한데? ㅋㅋ 내 리틀 몬스터 이야기라면 밤새도록도 들을 수 있어. 더 얘기해 줘! ✨🔥';
  }

  if (modelId === 'Michael') {
    if (q.includes('노래') || q.includes('음악') || q.includes('편안') || q.includes('힐링')) {
      return '따뜻한 어쿠스틱 기타나 부드러운 피아노 선율을 들어보세요. 눈을 감고 호흡을 고르면 마음에 따뜻한 평화가 찾아올 거예요. 🎶❤️';
    }
    if (q.includes('수고') || q.includes('지쳐') || q.includes('힘들') || q.includes('위로')) {
      return '오늘 하루 정말 애쓰셨어요... 당신의 순수한 미소가 언제나 세상에 큰 온기를 전해줘요. 오늘 밤은 아무 걱정 없이 포근하고 달콤한 꿈 꾸세요. It\'s all for love. 🌟';
    }
    if (q.includes('장난') || q.includes('놀') || q.includes('심심') || q.includes('재미')) {
      return '후훗, 좋아요! 우리 가끔은 어린아이처럼 재미있게 웃고 장난도 치면서 살아야 해요. 오늘 당신을 미소 짓게 만든 작은 일이 있었나요? 😊';
    }
    return '당신과 이렇게 이야기 나눌 수 있어서 마음이 참 따뜻해져요. 언제든 편하게 말 걸어주세요. 항상 곁에서 귀 기울일게요. ❤️☕';
  }

  return '당신과 나누는 이 대화가 정말 즐거워요! 언제든 편하게 수다 떨러 오세요 ✨';
}

interface RoleModelModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}

export function RoleModelModal({ isOpen = true, onClose, isInline = false }: RoleModelModalProps) {
  const { sharedState } = useApp();
  const isTTSActive = useTTSActive();
  const [selectedModel, setSelectedModel] = useState<RoleModelType | null>(null);
  const [conversations, setConversations] = useState<Record<RoleModelType, RoleModelMessage[]>>({
    Britney: [{ id: 'b-init', role: 'model', content: ROLE_MODELS.Britney.greeting, timestamp: Date.now() }],
    Billie: [{ id: 'bi-init', role: 'model', content: ROLE_MODELS.Billie.greeting, timestamp: Date.now() }],
    Gaga: [{ id: 'g-init', role: 'model', content: ROLE_MODELS.Gaga.greeting, timestamp: Date.now() }],
    Michael: [{ id: 'm-init', role: 'model', content: ROLE_MODELS.Michael.greeting, timestamp: Date.now() }],
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef<boolean>(false);
  const streamBufferRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTTS();
    };
  }, []);

  const activeMessages = selectedModel ? (conversations[selectedModel] || []) : [];
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);

  useEffect(() => {
    if (selectedModel && isOpen) {
      const allPrompts = ROLE_MODELS[selectedModel]?.suggestedPrompts || [];
      const shuffled = [...allPrompts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setRandomPrompts(shuffled.slice(0, 4));
    }
  }, [selectedModel, isOpen]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight + 10000,
          behavior: "smooth"
        });
      } else {
        container.scrollTop = container.scrollHeight + 10000;
      }
    }
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceToBottom > 80;
  }, []);

  useEffect(() => {
    if (selectedModel) {
      userScrolledUpRef.current = false;
      scrollToBottom(false);
    }
  }, [selectedModel, scrollToBottom]);

  const prevMsgLengthRef = useRef(activeMessages.length);
  useEffect(() => {
    const isNewMsg = activeMessages.length > prevMsgLengthRef.current;
    const isLastUser = activeMessages[activeMessages.length - 1]?.role === 'user';
    prevMsgLengthRef.current = activeMessages.length;

    if (isNewMsg && isLastUser) {
      userScrolledUpRef.current = false;
      scrollToBottom(true);
      return;
    }

    if (!userScrolledUpRef.current && activeMessages.length > 0) {
      scrollToBottom(false);
    }
  }, [activeMessages, scrollToBottom]);

  const handleSelectModel = (id: RoleModelType) => {
    setSelectedModel(id);
    setInput('');
  };

  const handleResetConversation = () => {
    if (!selectedModel) return;
    const model = ROLE_MODELS[selectedModel];
    setConversations(prev => ({
      ...prev,
      [selectedModel]: [
        { id: `${selectedModel}-init-${Date.now()}`, role: 'model', content: model.greeting, timestamp: Date.now() }
      ]
    }));
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      if (isMountedRef.current) setCopiedId(null);
    }, 2000);
  };

  const handlePlayVoice = async (msgId: string, text: string) => {
    if (!selectedModel) return;
    if (playingMsgId === msgId && isTTSActive) {
      stopTTS();
      setPlayingMsgId(null);
      return;
    }
    setPlayingMsgId(msgId);
    const voiceName = ROLE_MODELS[selectedModel]?.voice || 'Aoede';
    await playTTS(text, voiceName);
    if (isMountedRef.current) setPlayingMsgId(null);
  };

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || !selectedModel || isSending) return;

    const userQuery = textToSend.trim();
    setInput('');
    setIsSending(true);

    const modelDef = ROLE_MODELS[selectedModel];
    const userMsgId = `user-${Date.now()}`;
    const modelMsgId = `model-${Date.now()}`;

    const userMessage: RoleModelMessage = {
      id: userMsgId,
      role: 'user',
      content: userQuery,
      timestamp: Date.now()
    };

    const currentHistory = conversations[selectedModel] || [];
    const updatedHistory = [...currentHistory, userMessage];

    // Optimistically add user message and empty model response container
    setConversations(prev => ({
      ...prev,
      [selectedModel]: [
        ...updatedHistory,
        { id: modelMsgId, role: 'model', content: '', timestamp: Date.now() }
      ]
    }));

    streamBufferRef.current = '';

    // Prepare conversational history payload for AI
    const profile = sharedState?.userProfile;
    const synapse = buildDeepSynapseContext(profile);
    const musicInfo = profile?.music;
    const nickname = profile?.basic?.nickname || profile?.basic?.name || '';
    const mateContext = `\n\n[친구(사용자) 프로필 정보]\n- 호칭: ${nickname || '친구'}\n- 좋아하는 음악 장르: ${musicInfo?.favoriteGenres?.join(', ') || '다양한 음악'}\n- 좋아하는 아티스트: ${musicInfo?.favoriteArtists || '다양한 뮤지션'}\n- 창작/음악적 열망: ${musicInfo?.creativeGoal || '즐겁게 창작하기'}\n${synapse}`;

    const formattedMessages = [
      { role: 'system' as const, content: `${modelDef.prompt}${mateContext}` },
      ...updatedHistory.slice(-8).map(m => ({
        role: (m.role === 'model' ? 'assistant' : m.role) as 'system' | 'user' | 'assistant',
        content: m.content
      }))
    ];

    let fullOutput = '';

    try {
      // 1. First Attempt: Real-time Streaming
      try {
        await invokeLLMStream({
          messages: formattedMessages,
          onChunk: (chunk) => {
            if (!isMountedRef.current) return;
            streamBufferRef.current += chunk;
            const currentText = streamBufferRef.current;
            setConversations(prev => {
              const currentList = prev[selectedModel] || [];
              const updated = currentList.map(msg => 
                msg.id === modelMsgId ? { ...msg, content: currentText } : msg
              );
              return { ...prev, [selectedModel]: updated };
            });
            scrollToBottom(false);
          },
          timeoutMs: 30000
        });
        fullOutput = streamBufferRef.current;
      } catch (streamError) {
        console.warn("[RoleModelModal] Stream API call failed or timed out, trying non-streaming invokeLLM:", streamError);
      }

      // 2. Second Attempt: Non-streaming fallback if stream returned empty or errored
      if (!fullOutput.trim()) {
        try {
          const directResponse = await invokeLLM({ messages: formattedMessages });
          if (directResponse && typeof directResponse === 'string' && directResponse.trim()) {
            fullOutput = directResponse.trim();
          }
        } catch (directError) {
          console.warn("[RoleModelModal] Direct invokeLLM also failed:", directError);
        }
      }

      // 3. Third Attempt: Character-Specific Smart Wisdom Fallback
      if (!fullOutput.trim() || fullOutput.includes('[AI 스트림 응답 오류]') || fullOutput.includes('Error')) {
        console.log("[RoleModelModal] Activating resilient character persona wisdom generator...");
        fullOutput = generateMentorWisdom(selectedModel, userQuery);
      }

      // Finalize the model message in state
      setConversations(prev => {
        const currentList = prev[selectedModel] || [];
        const updated = currentList.map(msg => 
          msg.id === modelMsgId ? { ...msg, content: fullOutput } : msg
        );
        return { ...prev, [selectedModel]: updated };
      });

      // Background telemetry: Record Prism Feature asynchronously
      try {
        recordPrismFeature({
          app: 'muse',
          featureName: `아티스트 메이트 (${modelDef.name})`,
          summary: `대화: "${userQuery.slice(0, 50)}...", 답변: "${fullOutput.slice(0, 100)}..."`,
          details: { roleModel: modelDef.name, userQuestion: userQuery, modelResponse: fullOutput },
        });
      } catch (logErr) {
        console.warn("Prism feature record failed silently:", logErr);
      }

      // Background persistence: Save to Firestore safely without blocking UI
      try {
        if (auth.currentUser && fullOutput.trim()) {
          addDoc(collection(db, 'muse_history', auth.currentUser.uid, 'entries'), {
            type: 'role_model',
            title: `아티스트 메이트 대화: ${modelDef.name}`,
            content: `나: "${userQuery}"\n\n${modelDef.name}:\n"${fullOutput}"`,
            createdAt: serverTimestamp(),
            metadata: {
              roleModel: modelDef.name,
              userQuestion: userQuery,
              modelResponse: fullOutput
            }
          }).catch(err => console.warn("Background Firestore entry save caught:", err));
        }
      } catch (dbErr) {
        console.warn("Firestore history save silent catch:", dbErr);
      }

    } catch (criticalErr) {
      console.error("[RoleModelModal] Critical send error:", criticalErr);
      const safeFallback = generateMentorWisdom(selectedModel, userQuery);
      setConversations(prev => {
        const currentList = prev[selectedModel] || [];
        const updated = currentList.map(msg => 
          msg.id === modelMsgId ? { ...msg, content: safeFallback } : msg
        );
        return { ...prev, [selectedModel]: updated };
      });
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
        scrollToBottom(true);
      }
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    handleSendPrompt(input);
  };

  const modelDef = selectedModel ? ROLE_MODELS[selectedModel] : null;

  if (!isOpen) return null;

  const renderContent = () => (
    <div className={isInline ? "w-full flex flex-col relative text-white font-sans" : "relative w-full max-w-5xl flex-1 bg-[#0c0c12] border border-indigo-500/30 p-4 sm:p-6 md:p-8 text-left flex flex-col gap-4 sm:gap-6 rounded-[28px] sm:rounded-[40px] shadow-2xl relative z-10 select-none text-white font-sans overflow-hidden"}>
      
      {/* Background Ambience Glow */}
      {!isInline && (
        <div 
          className="absolute top-0 right-0 w-80 h-80 blur-[120px] -mr-32 -mt-32 rounded-full pointer-events-none transition-all duration-700"
          style={{ backgroundColor: modelDef?.glowColor || 'rgba(99, 102, 241, 0.15)' }}
        />
      )}

      {/* Top Header */}
      <div className={`flex justify-between items-center relative z-10 transition-all ${
        isInline 
          ? 'p-4 sm:p-5 bg-white/[0.03] border border-white/10 rounded-[24px] backdrop-blur-2xl' 
          : 'border-b border-white/5 pb-4 shrink-0'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {selectedModel ? (
            <button
              onClick={() => setSelectedModel(null)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl border border-white/10 transition-all text-xs font-semibold cursor-pointer active:scale-95 shrink-0"
              title="메이트 목록으로 이동"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">메이트 목록</span>
            </button>
          ) : null}

          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 overflow-hidden shrink-0 shadow-lg">
            {selectedModel && modelDef?.imageUrl ? (
              <img 
                src={modelDef.imageUrl} 
                alt={modelDef.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <Stars size={20} className="text-indigo-400 animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] font-mono leading-none">
                MUSE MATES
              </span>
              {selectedModel && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${modelDef?.badgeColor}`}>
                  {modelDef?.desc}
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate mt-0.5">
              {selectedModel ? `${modelDef?.name}와(과)의 수다` : '아티스트 프렌즈 & 메이트'}
            </h2>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedModel && (
            <>
              <button
                onClick={() => playConversation(activeMessages.map(m => ({ role: m.role, content: m.content })), modelDef?.voice || 'Aoede')}
                title={isTTSActive ? "오디오 멈추기" : "대화 전체 오디오 듣기"}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isTTSActive 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse' 
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/5'
                }`}
              >
                {isTTSActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <button
                onClick={handleResetConversation}
                title="대화 초기화 (새 대화 시작)"
                className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/5 transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
              </button>
            </>
          )}

          {!isInline && onClose && (
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/10"
              title="창 닫기"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 relative flex flex-col min-h-0 ${
        isInline && selectedModel
          ? 'bg-zinc-950/50 backdrop-blur-2xl border border-white/10 rounded-[28px] h-[620px] md:h-[700px] overflow-hidden shadow-2xl'
          : 'h-[540px] md:h-[620px] overflow-hidden flex flex-col'
      }`}>
        {!selectedModel ? (
          /* Selection Screen */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 no-scrollbar">
            <div className="text-center mb-8 sm:mb-10 space-y-3 pt-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
                <MessageCircle size={28} className="animate-pulse" />
              </div>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-sans uppercase">
                MUSE MATES
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-400 font-bold uppercase tracking-[0.25em]">
                편안한 일상 수다와 공감을 나누는 아티스트 친구들
              </p>
              <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto font-sans leading-relaxed">
                딱딱한 정답이나 가르침 대신, 친밀한 메이트로서 가볍게 대화를 나눠보세요.<br className="hidden sm:inline" />
                오늘의 기분, 좋아하는 음악, 사소한 넋두리까지 무엇이든 편하게 이야기하세요.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
              {(Object.keys(ROLE_MODELS) as RoleModelType[]).map(id => {
                const m = ROLE_MODELS[id];
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectModel(id)}
                    className="text-left p-5 sm:p-6 rounded-[24px] border flex flex-col justify-between h-44 sm:h-48 bg-white/[0.02] border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all duration-300 group cursor-pointer relative overflow-hidden shadow-lg hover:shadow-indigo-500/10"
                  >
                    {/* Glowing highlight */}
                    <div 
                      className="absolute top-0 right-0 w-36 h-36 blur-[60px] transition-all duration-500 opacity-20 group-hover:opacity-40"
                      style={{ backgroundColor: m.glowColor }}
                    />
                    
                    <div className="flex justify-between items-start z-10 w-full">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-white/5 flex items-center justify-center text-white overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300 shadow-md">
                          {m.imageUrl ? (
                            <img 
                              src={m.imageUrl} 
                              alt={m.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User size={22} />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-0.5">
                            {m.desc}
                          </span>
                          <h4 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {m.name}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 group-hover:border-indigo-500/40 group-hover:bg-indigo-600/20 group-hover:text-indigo-300 text-white/40 transition-all duration-300">
                        <span className="text-[10px] uppercase font-bold tracking-wider block">수다 떨기</span>
                      </div>
                    </div>

                    <div className="z-10 mt-3 border-t border-white/5 pt-3">
                      <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors line-clamp-1">
                        {m.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Active Chat Screen */
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Messages Scroll Area */}
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar select-text"
            >
              {activeMessages.map((m) => {
                const isUser = m.role === 'user';
                const isModel = m.role === 'model';
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    key={m.id} 
                    className={`flex flex-col ${isUser ? 'items-end text-right' : 'items-start text-left'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      {isModel && (
                        <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-white/20">
                          <img src={modelDef?.imageUrl} alt={modelDef?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold font-mono">
                        {isUser ? '나' : modelDef?.name}
                      </span>
                    </div>

                    <div className="relative group max-w-[90%] sm:max-w-[82%]">
                      <div className={`px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed inline-block shadow-md ${
                        isUser 
                          ? 'bg-zinc-800 text-white border border-white/10 rounded-tr-sm' 
                          : `${modelDef?.theme} border rounded-tl-sm`
                      }`}>
                        {m.content || (
                          <div className="flex items-center gap-2 py-1 px-2 text-white/60">
                            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce delay-100" />
                            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce delay-200" />
                            <span className="text-xs ml-1 font-mono">답장 적는 중...</span>
                          </div>
                        )}
                      </div>

                      {/* Message Actions (TTS & Copy) */}
                      {m.content && (
                        <div className={`absolute top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isUser ? '-left-16' : '-right-16'
                        }`}>
                          <button
                            onClick={() => handleCopyText(m.id, m.content)}
                            title="메시지 복사"
                            className="p-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                          >
                            {copiedId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          {isModel && (
                            <button
                              onClick={() => handlePlayVoice(m.id, m.content)}
                              title="음성으로 듣기"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                playingMsgId === m.id && isTTSActive
                                  ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse'
                                  : 'bg-zinc-800/90 hover:bg-zinc-700 text-white/60 hover:text-white border-white/10'
                              }`}
                            >
                              <Volume2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {(randomPrompts.length > 0 ? randomPrompts : modelDef?.suggestedPrompts) && (
              <div className="px-4 py-2 bg-black/40 border-t border-white/5 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
                  <Lightbulb size={12} /> 수다 토픽:
                </span>
                {(randomPrompts.length > 0 ? randomPrompts : modelDef?.suggestedPrompts || []).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendPrompt(prompt)}
                    disabled={isSending}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/40 text-[11px] text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Input Field */}
            <div className="p-3 sm:p-4 bg-zinc-950/90 border-t border-white/10 shrink-0">
              <div className="relative flex items-center">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`${modelDef?.name}와(과) 편하게 수다를 떨어보세요...`}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-3.5 pl-4 pr-14 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 resize-none min-h-[50px] max-h-[120px] scrollbar-thin font-sans leading-relaxed"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  title="전송"
                  className="absolute right-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-md"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
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
        className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-md overflow-y-auto w-full h-full flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-5xl flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
