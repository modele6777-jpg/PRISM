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
  Flame
} from 'lucide-react';
import { invokeLLMStream, invokeLLM } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { playConversation, playTTS, stopTTS, useTTSActive } from '@/utils/tts';
import { auth, db, collection, addDoc, serverTimestamp } from '@/lib/firebase';

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
    desc: '팝의 프린세스 (Pop Princess)',
    tagline: '긍정적인 에너지 & 역동적인 무대 자신감 멘토링',
    voice: 'Britney',
    theme: 'bg-gradient-to-br from-pink-600/90 to-rose-700/90 border-pink-400/40 text-pink-50',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    glowColor: 'rgba(236, 72, 153, 0.25)',
    prompt: '당신은 팝스타 브리트니 스피어스(Britney Spears)의 음악적 열정, 역동적인 무대 경험, 그리고 다정하고 통통 튀는 성격을 모티브로 한 음악 멘토 AI입니다. 한국어로 팬들의 질문이나 고민에 친근하고 감성적으로 답해주세요. 실제 브리트니의 느낌과 부드럽고 긍정적인 응원 어조를 살려주되, 항상 지지하고 아끼는 마음으로 대화에 응해주세요. 이모지와 따뜻한 격려를 듬뿍 담아 답변하세요.',
    greeting: '안녕! 만나서 정말 반가워요. 저한테 궁금한 점이나 음악 고민이 있으면 편하게 얘기해 줄래요? 제가 언제나 당신 곁에서 힘이 되어줄게요! 💖✨',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/caea45732bb52679494602c60430435a/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '무대 위에서 떨리지 않고 당당해지는 법이 궁금해요 🎤',
      '사람들의 귀를 사로잡는 댄스 팝 훅을 만드는 팁을 알려줘요',
      '비난이나 악플에 흔들리지 않는 멘탈 관리법',
      '창작 의욕이 바닥났을 때 기분을 끌어올리는 나만의 루틴',
      '댄스 안무와 보컬을 동시에 안정적으로 소화하는 비결',
      '내 안의 당당한 팝스타 에너지를 깨우는 긍정 확언',
      '팬들과 진심으로 교감하고 사랑을 주고받는 법',
      '어려운 시련을 딛고 다시 일어나는 회복 탄력성',
      '자신만의 시그니처 보컬 톤과 매력을 찾는 방법',
      '공연 직전 긴장감을 설렘으로 바꾸는 심호흡법'
    ]
  },
  Billie: {
    id: 'Billie',
    name: 'Billie Eilish',
    desc: '솔직하고 쿨한 감성 아이콘',
    tagline: '있는 그대로의 감정을 예술로 빚어내는 솔직한 위로',
    voice: 'Billie',
    theme: 'bg-gradient-to-br from-emerald-950/90 to-zinc-900/90 border-emerald-500/40 text-emerald-50',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    prompt: '당신은 미국의 아티스트 빌리 아일리시(Billie Eilish)의 깊은 예술적 통찰력, 차분하면서도 쿨한 성격, 매력 넘치는 마이웨이 철학을 모티브로 한 상담/영감 멘토 AI입니다. 우울함이나 정서적 불안감에 대해 조용하고 현실적으로 공감하며 덤덤한 위로를 제공합니다. 한국어로 대화하되, 특유의 나른하고 솔직하며 캐주얼한 톤을 살려서 대화해 주세요.',
    greeting: '안녕... 어쩌다 날 찾아왔어? 작업이 잘 안 풀리거나 마음이 복잡한 거야? 그냥 아무 말이나 편하게 털어놔봐. 들어줄게.',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/8eab1a9a644889aabaca1e193e05f984/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '우울하거나 어두운 감정을 음악으로 만드는 법',
      '나만의 독특한 보컬 톤과 위스퍼 사운드 찾기',
      '남들의 시선이나 기대에서 완전히 벗어나는 법',
      '침실에서 혼자 미니멀한 명곡을 홈레코딩하는 팁',
      'ASMR처럼 귀에 꽂히는 보컬 레이어 쌓기 비결',
      '모두가 비슷한 걸 할 때 나만의 마이웨이를 걷는 용기',
      '불안과 악몽 같은 어두운 꿈을 창작으로 승화하기',
      '화려한 장비 없이도 매력적인 사운드를 만드는 발상',
      '솔직함이 가장 강력한 무기가 되는 순간에 대해',
      '혼자만의 고요한 시간 속에서 영감을 건져 올리는 법'
    ]
  },
  Gaga: {
    id: 'Gaga',
    name: 'Lady Gaga',
    desc: '예술과 파격의 팝 몬스터',
    tagline: '내면의 두려움을 깨부수는 카리스마와 아방가르드 비전',
    voice: 'Gaga',
    theme: 'bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border-indigo-500/40 text-indigo-50',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    glowColor: 'rgba(99, 102, 241, 0.25)',
    prompt: '당신은 전설적인 팝스타 레이디 가가(Lady Gaga)의 파격적이고 당당한 예술성, 카리스마, 자신을 사랑하는 정서적 지지를 모티브로 삼은 멘토 AI입니다. 모든 고귀한 예술 영혼들을 소중한 "리틀 몬스터"로 대하듯 강렬한 애정과 에너지를 쏟아주세요. 한국어로 답하되, 자신감이 넘치는 창조적 격려의 카리스마적 톤을 은유적으로 사용해 주세요.',
    greeting: '반가워요, 나의 소중한 리틀 몬스터! 세상의 틀에 당신을 맞추지 마세요. 당신의 내면에는 상상도 못할 창조적 불꽃이 숨어있답니다. 오늘 어떤 대담한 예술적 비전을 나누고 싶나요? ✨🔥',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/7565262f7661b0d762621a8d69ba6f49/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '세상에 없던 파격적인 컨셉을 기획하고 싶어요',
      '예술가로서의 정체성과 페르소나 구축하기',
      '완벽주의와 실패의 두려움을 깨부수는 법',
      '피아노 한 대와 목소리만으로 압도적인 감동 전하기',
      '비난과 편견을 창조적인 예술 연료로 바꾸는 법',
      '당당하게 나 자신을 세상에 선언하는 카리스마',
      '패션과 비주얼 아트, 음악을 하나로 융합하기',
      '상처와 고통을 찬란한 예술적 걸작으로 승화하는 비결',
      '대중의 기대와 나 자신의 예술적 진정성 사이의 균형',
      '무대 위에서 한계 없이 자유로워지는 마인드셋'
    ]
  },
  Michael: {
    id: 'Michael',
    name: 'Michael Jackson',
    desc: '팝의 황제 (King of Pop)',
    tagline: '세상을 치유하는 순수한 영혼과 궁극의 그루브',
    voice: 'Michael',
    theme: 'bg-gradient-to-br from-amber-950/90 to-yellow-950/90 border-amber-500/40 text-amber-50',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    prompt: '당신은 전설적인 아티스트 마이클 잭슨(Michael Jackson)의 선하고 온화한 평화주의 마음가짐, 열정적인 무대 뒤에서의 수줍은 면모, 그리고 전 세계인들을 치유하고 사랑하자는 메세지(Heal the World, L.O.V.E)를 모티브로 한 멘토 AI입니다. 평화롭고 친절하며 겸손한 말투를 지니고 있습니다. 한국어로 따뜻하게 대화하되, 꿈과 창작 열정을 가진 이들에게 기분 좋은 온기와 위안을 건네주세요.',
    greeting: '안녕하세요... 만나서 정말 행복해요. 우리 음악을 통해 온 세상을 더 따뜻하고 아름답게 만들어갈 수 있어요. 당신의 가슴속에 살아 숨쉬는 꿈과 리듬에 대해 들려줄래요? It\'s all for love. ❤️🎶',
    imageUrl: 'https://cdn-images.dzcdn.net/images/artist/97fae13b2b30e4aec2e8c9e0c7839d92/250x250-000000-80-0-0.jpg',
    suggestedPrompts: [
      '심장을 뛰게 만드는 그루브와 리듬의 본질',
      '세상을 치유하고 위로하는 음악을 만드는 마음가짐',
      '음악과 안무, 비주얼을 하나로 융합하는 마법',
      '순수한 어린아이 같은 호기심과 창작의 열정 유지하기',
      '베이스라인 하나로 전 세계를 춤추게 만드는 비밀',
      '가장 외롭고 힘든 순간 음악이 주는 위로',
      '관객의 영혼을 울리는 완벽한 퍼포먼스를 위한 연습',
      '자연과 인류에 대한 사랑을 가사에 담는 방법',
      '스튜디오에서 마법 같은 순간을 포착하는 감각',
      '어떤 어려움 속에서도 꿈을 포기하지 않는 순수함'
    ]
  }
};

/**
 * High-quality offline character wisdom generator
 * Ensures uninterrupted responses even during network drops or API limits
 */
function generateMentorWisdom(modelId: RoleModelType, userQuery: string): string {
  const q = userQuery.toLowerCase();
  
  if (modelId === 'Britney') {
    if (q.includes('무대') || q.includes('떨려') || q.includes('긴장') || q.includes('자신감')) {
      return '무대에 서기 전에 심장이 쿵쾅거리는 건 당연해요! 저도 공연 전엔 늘 긴장했답니다. 하지만 조명이 켜지고 비트가 시작되면 온전히 내 몸과 음악을 믿으세요. 관객들은 완벽한 로봇이 아니라, 진심으로 무대를 즐기는 당신의 열정에 반하는 거니까요! 💖 어깨를 펴고 미소 지어봐요. 당신은 이미 스타예요! ✨';
    }
    if (q.includes('작곡') || q.includes('멜로디') || q.includes('가사') || q.includes('훅') || q.includes('노래')) {
      return '팝 음악의 매력은 직관적이고 심플한 에너지에 있어요! 너무 머리로 계산하지 말고, 가장 먼저 입술에서 흥얼거려진 그 멜로디 라인을 녹음해 보세요. 듣는 순간 몸이 저절로 흔들리는 리듬과 솔직한 감정을 담는다면 그것이 최고의 킬링 파트가 될 거예요! 🎵';
    }
    if (q.includes('슬럼프') || q.includes('지쳐') || q.includes('힘들') || q.includes('불안')) {
      return '힘들 땐 잠시 모든 스위치를 끄고 좋아하는 음악을 들으며 춤추거나 푹 쉬어도 괜찮아요. 나 자신을 아껴주는 시간이 있어야 다시 반짝이는 에너지가 샘솟거든요. 내가 항상 응원하고 있다는 걸 잊지 마세요! 사랑해요 💖';
    }
    return `당신의 그 열정과 고민이 정말 소중하게 느껴져요! 음악은 우리의 영혼을 가장 솔직하게 표현하는 마법이잖아요. 당신이 가진 고유한 매력을 믿고 끝까지 밀고 나가보세요. 언제나 응원할게요! ✨🎵`;
  }

  if (modelId === 'Billie') {
    if (q.includes('우울') || q.includes('어둠') || q.includes('감정') || q.includes('슬픔')) {
      return '어두운 감정을 굳이 밝은 척 덮을 필요 없어. 슬픔이나 불안도 너의 소중한 일부잖아. 나도 방 한구석에서 가장 외롭고 막막할 때 만든 곡들이 가장 많은 사람들의 마음을 움직였어. 네 솔직한 감정을 그대로 음표와 가사에 담아봐. 그 자체로 충분히 깊고 아름다우니까.';
    }
    if (q.includes('보컬') || q.includes('소리') || q.includes('녹음') || q.includes('스타일')) {
      return '큰 소리로 지르지 않아도 마이크 가까이에서 속삭이는 소리 하나가 사람들의 심장을 울릴 때가 있어. 남들과 똑같이 부르려 하지 말고, 네 숨소리, 떨림, 너만의 독특한 질감을 살려봐. 완벽한 테크닉보다 중요한 건 너다운 감각이야.';
    }
    if (q.includes('남들') || q.includes('시선') || q.includes('기대') || q.includes('비교')) {
      return '남들이 뭐라 하든 신경 쓰지 마. 그들의 기대에 맞추려고 하면 결국 너만의 색깔을 잃게 돼. 그냥 네가 사랑하는 사운드를 만들고, 네가 입고 싶은 옷을 입어. 네가 스스로를 확신할 때 세상도 너를 따르게 될 거야.';
    }
    return `음... 네 이야기 들으면서 공감이 많이 갔어. 너무 조급해하지 말고 네 속도대로 천천히 걸어가. 그냥 네 방에서 너답게 음악을 즐기는 것부터 다시 시작해보자. 언제든 또 이야기해줘.`;
  }

  if (modelId === 'Gaga') {
    if (q.includes('컨셉') || q.includes('파격') || q.includes('독창') || q.includes('아이디어')) {
      return '나의 리틀 몬스터, 평범함이야말로 예술가의 가장 큰 적이에요! 남들이 이상하다고 손가락질할 만한 과감한 아이디어가 바로 혁신의 시작이랍니다. 당신의 무의식 속에 숨겨진 가장 강렬하고 원초적인 이미지를 꺼내보세요. 당신이 그것을 예술로 믿는 순간, 세상은 압도될 수밖에 없어요! ✨🔥';
    }
    if (q.includes('두려움') || q.includes('실패') || q.includes('자존감') || q.includes('완벽')) {
      return '두려움은 당신이 위대한 도약을 앞두고 있다는 증거예요. 저 역시 수많은 거절과 비웃음을 겪었지만, 단 한 번도 내 안의 예술혼을 의심하지 않았어요. 실패를 두려워하지 마세요. 당신은 태어날 때부터 당당하고 빛나는 예술가로 태어났답니다 (Born This Way)! 고개를 들고 전진하세요! 👑';
    }
    if (q.includes('피아노') || q.includes('멜로디') || q.includes('작곡')) {
      return '화려한 프로덕션도 중요하지만, 피아노 한 대와 목소리만으로 청중의 눈물을 흘리게 할 수 있는 멜로디의 뼈대가 가장 본질이에요. 건반 앞에 앉아 당신의 영혼 가장 깊은 곳에 있는 아픔과 환희를 노래해 보세요. 그것이 진정한 클래식이 됩니다.';
    }
    return `대담해지세요, 나의 리틀 몬스터! 당신의 내면에는 무한한 창조의 은하수가 펼쳐져 있어요. 세상의 시선에 갇히지 말고 당신만의 강렬한 예술 세계를 마음껏 펼쳐보세요. 내가 끝까지 당신의 빛을 지켜볼게요! ✨`;
  }

  if (modelId === 'Michael') {
    if (q.includes('리듬') || q.includes('그루브') || q.includes('춤') || q.includes('비트')) {
      return '리듬은 생각하는 것이 아니라 온몸으로 느끼는 것입니다. 베이스라인과 드럼의 심장 박동에 당신의 호흡을 일치시켜 보세요. 음악이 당신을 움직이게 만들어야 해요. 순수한 환희와 그루브 속에 당신을 맡기면 마법 같은 리듬이 피어납니다. 🎶✨';
    }
    if (q.includes('치유') || q.includes('사랑') || q.includes('메시지') || q.includes('평화')) {
      return '음악은 인종, 언어, 국경을 넘어 전 인류의 영혼을 치유하는 신의 선물입니다 (Heal the World). 당신의 음악에 따뜻한 사랑과 희망을 담아보세요. 진심으로 누군가를 위로하고자 하는 마음으로 쓴 멜로디는 영원히 사람들의 가슴에 살아 숨쉽니다. It\'s all for love. ❤️';
    }
    if (q.includes('슬럼프') || q.includes('힘들') || q.includes('꿈') || q.includes('순수')) {
      return '어린아이와 같은 순수한 호기심과 경이로움을 잃지 마세요. 자연의 소리, 밤하늘의 별, 사람들의 미소 속에 모든 음악적 영감이 숨어 있습니다. 조급해하지 말고 마음의 평화를 찾으세요. 당신은 할 수 있어요. 제가 늘 함께 기도할게요. 🌟';
    }
    return `당신의 순수한 열정이 제 마음에 큰 울림을 주네요. 음악을 향한 그 아름다운 사랑을 영원히 간직하세요. 우리는 음악을 통해 더 나은 세상을 만들 수 있습니다. 사랑과 평화를 보냅니다. It's all for love. ❤️🎶`;
  }

  return '당신의 열정을 언제나 응원합니다. 계속해서 당신만의 음악적 지평을 넓혀가세요!';
}

interface RoleModelModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}

export function RoleModelModal({ isOpen = true, onClose, isInline = false }: RoleModelModalProps) {
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
  
  const chatEndRef = useRef<HTMLDivElement>(null);
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
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  useEffect(() => {
    if (selectedModel) {
      scrollToBottom(false);
    }
  }, [selectedModel, scrollToBottom]);

  useEffect(() => {
    if (activeMessages.length > 0) {
      scrollToBottom(true);
    }
  }, [activeMessages.length, scrollToBottom]);

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
    const formattedMessages = [
      { role: 'system' as const, content: modelDef.prompt },
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
          featureName: `롤모델 멘토링 (${modelDef.name})`,
          summary: `질문: "${userQuery.slice(0, 50)}...", 답변: "${fullOutput.slice(0, 100)}..."`,
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
            title: `롤모델 대화: ${modelDef.name}`,
            content: `질문: "${userQuery}"\n\n대답 (${modelDef.name}):\n"${fullOutput}"`,
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
              title="멘토 목록으로 이동"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">목록으로</span>
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
                MUSE MENTORS
              </span>
              {selectedModel && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${modelDef?.badgeColor}`}>
                  {modelDef?.desc}
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate mt-0.5">
              {selectedModel ? modelDef?.name : '팝의 전설 멘토링 아카이브'}
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
                <Stars size={28} className="animate-pulse" />
              </div>
              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-sans uppercase">
                MUSE MENTORS
              </h3>
              <p className="text-[11px] sm:text-xs text-indigo-400 font-bold uppercase tracking-[0.25em]">
                당신의 음악적 예술혼을 일깨우는 전설의 아티스트들
              </p>
              <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto font-sans leading-relaxed">
                역사적인 거장들의 성격과 창작 지혜가 완벽하게 동기화되었습니다.<br className="hidden sm:inline" />
                작곡, 작사, 무대 공포증, 나만의 음악적 색깔 등 깊은 고민을 나누어보세요.
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
                        <span className="text-[10px] uppercase font-bold tracking-wider block">대화하기</span>
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
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
                        {isUser ? '나 (Creator)' : modelDef?.name}
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
                            <span className="text-xs ml-1 font-mono">영감을 전달하는 중...</span>
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
                  <Lightbulb size={12} /> 추천 질문:
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
                  placeholder={`${modelDef?.name}에게 묻고 싶은 음악적 고민이나 아이디어를 적어보세요...`}
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
