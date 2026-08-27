export type InsightCategory = 
  | 'all'
  | 'favorites'
  | 'stoic_fate'
  | 'zen_mind'
  | 'gnosis_jung'
  | 'acim_peace'
  | 'art_muse'
  | 'healing_love'
  | 'cosmos_truth';

export interface UniverseInsightItem {
  id: string;
  quote: string;
  author: string;
  source: string;
  category: InsightCategory;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  resonance: string;
  tags: string[];
}

export const INSIGHT_CATEGORIES: Array<{
  id: InsightCategory;
  label: string;
  icon: string;
  desc: string;
  color: string;
}> = [
  { id: 'all', label: '전체 지혜', icon: '🌌', desc: '모든 우주적 통찰과 클래식 명언', color: 'from-amber-400 to-indigo-500' },
  { id: 'stoic_fate', label: '운명 & 스토아', icon: '⚖️', desc: '운명을 사랑하고 내면의 통제력을 세우는 지혜', color: 'from-amber-400 to-orange-500' },
  { id: 'zen_mind', label: '선(禪) & 마음챙김', icon: '🧘', desc: '현재의 자각, 무집착과 있는 그대로의 평온', color: 'from-emerald-400 to-teal-500' },
  { id: 'gnosis_jung', label: '영지 & 심층심리', icon: '🔮', desc: '신성한 불꽃의 각성과 무의식의 자기실현', color: 'from-purple-400 to-indigo-500' },
  { id: 'acim_peace', label: '용서 & 순수평화', icon: '🕊️', desc: '두려움을 걷어내고 사랑과 평화를 선택하는 길', color: 'from-sky-400 to-blue-500' },
  { id: 'art_muse', label: '창조 & 예술혼', icon: '🎨', desc: '영감의 스파크와 불멸의 창작적 열정', color: 'from-pink-400 to-rose-500' },
  { id: 'healing_love', label: '치유 & 하트', icon: '🌿', desc: '내면아이의 위로, 수용과 무조건적 사랑', color: 'from-rose-400 to-amber-500' },
  { id: 'cosmos_truth', label: '우주 & 초월진리', icon: '✨', desc: '광대한 우주 질서와 존재의 원초적 신비', color: 'from-cyan-400 to-blue-600' },
];

export const UNIVERSE_INSIGHTS: UniverseInsightItem[] = [
  // 1. 운명 & 스토아 (stoic_fate)
  {
    id: 'stoic-01',
    quote: "진정한 발견의 여정은 새로운 풍경을 찾는 것이 아니라, 새로운 눈을 가지는 데 있다.",
    author: "마르셀 프루스트",
    source: "잃어버린 시간을 찾아서",
    category: 'stoic_fate',
    categoryName: '운명 & 스토아',
    categoryColor: 'text-amber-400',
    categoryIcon: '⚖️',
    resonance: "외부 환경을 바꾸려 애쓰기보다 세상을 바라보는 나의 내적 시선(Perspective)을 전환할 때 새로운 세상이 열립니다.",
    tags: ['시선', '발견', '의식의 전환', '통찰']
  },
  {
    id: 'stoic-02',
    quote: "너에게 일어나는 모든 일을 사랑하라(Amor Fati). 그것이야말로 너의 운명이자 가장 위대한 성장의 질료이다.",
    author: "프리드리히 니체",
    source: "이 사람을 보라 (Ecce Homo)",
    category: 'stoic_fate',
    categoryName: '운명 & 스토아',
    categoryColor: 'text-amber-400',
    categoryIcon: '⚖️',
    resonance: "피할 수 없는 삶의 파도를 거부하지 않고 온전히 끌어안을 때, 운명은 나를 짓누르는 짐이 아니라 나를 비상하게 하는 날개가 됩니다.",
    tags: ['아모르파티', '운명애', '수용', '내적용기']
  },
  {
    id: 'stoic-03',
    quote: "우리를 괴롭히는 것은 사물 자체가 아니라, 사물에 대해 우리가 품는 판단과 생각이다.",
    author: "에픽테토스",
    source: "담화록 (Enchiridion)",
    category: 'stoic_fate',
    categoryName: '운명 & 스토아',
    categoryColor: 'text-amber-400',
    categoryIcon: '⚖️',
    resonance: "어떤 사건도 나를 불행하게 만들 수 없습니다. 오직 그 사건에 내가 부여한 해석만이 나의 고통을 결정합니다.",
    tags: ['통제력', '자유', '인지적 거리두기', '스토아']
  },
  {
    id: 'stoic-04',
    quote: "새는 알에서 나오려고 투쟁한다. 알은 세계이다. 태어나려는 자는 하나의 세계를 깨뜨려야만 한다.",
    author: "헤르만 헤세",
    source: "데미안 (Demian)",
    category: 'stoic_fate',
    categoryName: '운명 & 스토아',
    categoryColor: 'text-amber-400',
    categoryIcon: '⚖️',
    resonance: "과거의 안전한 껍질을 깨뜨리는 고통 없이는 진정한 영혼의 탄생과 자기 자신이 되는 길을 걸을 수 없습니다.",
    tags: ['데미안', '탈피', '진정한 자아', '성장']
  },
  {
    id: 'stoic-05',
    quote: "너 자신 안으로 물러서라. 인간의 영혼만큼 평화롭고 번잡함 없는 안식처는 그 어디에도 없다.",
    author: "마르쿠스 아우렐리우스",
    source: "명상록 (Meditations)",
    category: 'stoic_fate',
    categoryName: '운명 & 스토아',
    categoryColor: 'text-amber-400',
    categoryIcon: '⚖️',
    resonance: "세상의 소음이 거세질수록 밖으로 달려가지 말고 고요한 내면의 성채(Inner Citadel)로 돌아와 숨을 고르세요.",
    tags: ['내면의 안식', '명상록', '평온', '마인드셋']
  },
  {
    id: 'stoic-06',
    quote: "시련은 사람을 만드는 것이 아니라, 그가 어떤 사람인지를 그 자신에게 드러내 보여줄 뿐이다.",
    author: "에픽테토스",
    source: "스토아 어록집",
    category: 'stoic_fate',
    categoryName: '운명 & 스토아',
    categoryColor: 'text-amber-400',
    categoryIcon: '⚖️',
    resonance: "지금 마주한 도전은 나를 무너뜨리기 위함이 아니라 내 안에 숨겨진 무한한 잠재력과 회복탄력성을 일깨우는 거울입니다.",
    tags: ['시련', '성장', '자아발견', '회복탄력성']
  },

  // 2. 선(禪) & 마음챙김 (zen_mind)
  {
    id: 'zen-01',
    quote: "마음이 모든 것에 앞서가고, 마음이 으뜸이며, 모든 것은 마음으로 지어진다.",
    author: "석가모니 부처",
    source: "법구경 (Dhammapada)",
    category: 'zen_mind',
    categoryName: '선(禪) & 마음챙김',
    categoryColor: 'text-emerald-400',
    categoryIcon: '🧘',
    resonance: "맑고 평화로운 마음으로 생각하고 행동할 때, 행복은 그림자가 형상을 따르듯 당신의 곁을 결코 떠나지 않습니다.",
    tags: ['법구경', '일체유심조', '마음의 힘', '행복']
  },
  {
    id: 'zen-02',
    quote: "그물에 걸리지 않는 바람처럼, 소리에 놀라지 않는 사자처럼, 흙탕물에 물들지 않는 연꽃처럼 가라.",
    author: "초기불전 수타니파타",
    source: "수타니파타 (Sutta Nipata)",
    category: 'zen_mind',
    categoryName: '선(禪) & 마음챙김',
    categoryColor: 'text-emerald-400',
    categoryIcon: '🧘',
    resonance: "세상의 시선과 칭찬, 비난의 바람에 휘둘리지 않고 내면의 순수한 진실을 따라 당당하고 담담하게 걸어가세요.",
    tags: ['초연함', '독존', '순수성', '수타니파타']
  },
  {
    id: 'zen-03',
    quote: "과거를 뒤쫓지 말고, 미래를 바라지도 말라. 오직 현재의 현상을 있는 그대로 깊이 통찰하라.",
    author: "석가모니 부처",
    source: "맛지마 니까야 (Bhaddekaratta Sutta)",
    category: 'zen_mind',
    categoryName: '선(禪) & 마음챙김',
    categoryColor: 'text-emerald-400',
    categoryIcon: '🧘',
    resonance: "지나간 일에 대한 후회와 오지 않은 미래에 대한 불안을 내려놓을 때 오직 지금 이 순간(Here and Now)에만 온전한 생명이 머뭅니다.",
    tags: ['현재존재', '지금여기', '마음챙김', '자각']
  },
  {
    id: 'zen-04',
    quote: "강물은 결코 서두르지 않지만, 결국 바다에 닿는다. 만물은 제자리에 흐르고 있다.",
    author: "노자 (Laozi)",
    source: "도덕경 (Tao Te Ching)",
    category: 'zen_mind',
    categoryName: '선(禪) & 마음챙김',
    categoryColor: 'text-emerald-400',
    categoryIcon: '🧘',
    resonance: "억지로 밀어붙이거나 통제하려 하지 않는 무위자연(無爲自然)의 태도가 가장 자연스럽고 완전한 결실을 맺게 합니다.",
    tags: ['무위자연', '도덕경', '흐름', '순리']
  },
  {
    id: 'zen-05',
    quote: "자신을 등불로 삼고, 진리를 등불로 삼으라. 결코 밖의 것에 맹목적으로 의지하지 말라.",
    author: "석가모니 부처",
    source: "대반열반경 (Maha-parinibbana Sutta)",
    category: 'zen_mind',
    categoryName: '선(禪) & 마음챙김',
    categoryColor: 'text-emerald-400',
    categoryIcon: '🧘',
    resonance: "자등명 법등명(自燈明 法燈明) — 인생의 가장 어두운 순간에도 당신의 내면에 이미 꺼지지 않는 지혜의 등불이 밝혀져 있습니다.",
    tags: ['자등명', '내적빛', '주체성', '깨달음']
  },

  // 3. 영지 & 심층심리 (gnosis_jung)
  {
    id: 'gnosis-01',
    quote: "너 자신을 아는 자는 우주의 근원을 알게 되며, 빛의 세계로 즉시 귀환하리라.",
    author: "도마 복음서",
    source: "낙함마디 문서 (Nag Hammadi)",
    category: 'gnosis_jung',
    categoryName: '영지 & 심층심리',
    categoryColor: 'text-purple-400',
    categoryIcon: '🔮',
    resonance: "외부의 교리와 형식에 매이지 않고 당신의 본래 신성(Divine Spark)을 직관적으로 자각할 때 본향의 충만(Pleroma)이 열립니다.",
    tags: ['그노시스', '신성한불꽃', '낙함마디', '영지']
  },
  {
    id: 'gnosis-02',
    quote: "무의식을 의식화하지 않으면, 무의식이 삶의 방향을 결정하게 되고 우리는 그것을 '운명'이라 부른다.",
    author: "칼 구스타프 융",
    source: "원형과 무의식 (Archetypes and the Collective Unconscious)",
    category: 'gnosis_jung',
    categoryName: '영지 & 심층심리',
    categoryColor: 'text-purple-400',
    categoryIcon: '🔮',
    resonance: "그림자와 억압된 내면의 목소리를 회피하지 않고 다정하게 대면하여 의식의 빛으로 비출 때 진정한 개성화(Individuation)가 시작됩니다.",
    tags: ['칼융', '무의식', '개성화', '그림자작업']
  },
  {
    id: 'gnosis-03',
    quote: "밖을 보는 자는 꿈을 꾸지만, 안을 들여다보는 자는 깨어난다.",
    author: "칼 구스타프 융",
    source: "융 서간집",
    category: 'gnosis_jung',
    categoryName: '영지 & 심층심리',
    categoryColor: 'text-purple-400',
    categoryIcon: '🔮',
    resonance: "타인과의 비교와 외부 세상의 인정을 좇는 잠에서 깨어나, 내면의 깊은 심연과 만나는 자만이 진정한 깨어남을 경험합니다.",
    tags: ['자각', '내면탐구', '심층심리', '각성']
  },
  {
    id: 'gnosis-04',
    quote: "신(God)이 내 안에 있고 내가 신 안에 있음을 아는 눈은, 내가 신을 보는 바로 그 눈이다.",
    author: "마이스터 에크하르트",
    source: "독일어 설교집 (Sermons)",
    category: 'gnosis_jung',
    categoryName: '영지 & 심층심리',
    categoryColor: 'text-purple-400',
    categoryIcon: '🔮',
    resonance: "보는 나와 보여지는 대상의 분리가 사라질 때, 당신의 영혼은 우주의 무한한 지성과 완전히 하나로 호흡합니다.",
    tags: ['합일', '에크하르트', '비이원', '신비주의']
  },
  {
    id: 'gnosis-05',
    quote: "너의 내면에 있는 것을 밖으로 드러내면 그것이 너를 구원할 것이요, 드러내지 않으면 너를 파괴하리라.",
    author: "도마 복음서",
    source: "낙함마디 도마복음 70절",
    category: 'gnosis_jung',
    categoryName: '영지 & 심층심리',
    categoryColor: 'text-purple-400',
    categoryIcon: '🔮',
    resonance: "내면에 잠든 창의성, 고유한 진실, 진정한 열정을 억누르지 말고 세상에 표현하세요. 그것이 영혼의 궁극적 치유입니다.",
    tags: ['표현', '영혼의진실', '잠재력', '창조']
  },

  // 4. 용서 & 순수평화 (acim_peace)
  {
    id: 'acim-01',
    quote: "실재하는 것은 위협받을 수 없으며, 실재하지 않는 것은 존재하지 않는다. 여기에 하나님의 평화가 있다.",
    author: "기적수업 (ACIM)",
    source: "A Course in Miracles 서문",
    category: 'acim_peace',
    categoryName: '용서 & 순수평화',
    categoryColor: 'text-sky-400',
    categoryIcon: '🕊️',
    resonance: "세상의 어떤 풍파도 당신의 참된 본질인 영원한 사랑과 평화를 털끝만큼도 해칠 수 없습니다.",
    tags: ['기적수업', '불변의평화', '진실', 'ACIM']
  },
  {
    id: 'acim-02',
    quote: "나는 이것 대신 언제나 평화를 보기를 선택할 수 있다.",
    author: "기적수업 (ACIM)",
    source: "워크북 레슨 34",
    category: 'acim_peace',
    categoryName: '용서 & 순수평화',
    categoryColor: 'text-sky-400',
    categoryIcon: '🕊️',
    resonance: "분노와 갈등의 상황 속에서도 한 걸음 물러서서 평화를 선택할 수 있는 주권은 오직 나 자신에게 있습니다.",
    tags: ['선택의힘', '평화', '마음의결단', '용서']
  },
  {
    id: 'acim-03',
    quote: "놓아버림(Letting Go)이란 붙잡고 있던 감정적 에너지를 저항 없이 인정하고 떠나보내는 지극히 자연스러운 해방이다.",
    author: "데이비드 호킨스",
    source: "놓아버림 (Letting Go)",
    category: 'acim_peace',
    categoryName: '용서 & 순수평화',
    categoryColor: 'text-sky-400',
    categoryIcon: '🕊️',
    resonance: "감정을 억누르거나 표출하지 않고, 그저 가슴 속에 일어나는 에너지의 느낌을 온전히 허용할 때 감정은 저절로 녹아내립니다.",
    tags: ['놓아버림', '데이비드호킨스', '정화', '해방']
  },
  {
    id: 'acim-04',
    quote: "용서는 다른 사람을 위한 호의가 아니라, 나 자신을 원한의 감옥에서 해방시키는 가장 완벽한 열쇠이다.",
    author: "레스터 레븐슨",
    source: "세도나 메서드 (Sedona Method)",
    category: 'acim_peace',
    categoryName: '용서 & 순수평화',
    categoryColor: 'text-sky-400',
    categoryIcon: '🕊️',
    resonance: "원망을 쥐고 있는 손은 가장 먼저 나를 태웁니다. 손을 펴고 놓아줄 때 나의 가슴에 다시 따스한 자유가 깃듭니다.",
    tags: ['용서', '세도나메서드', '자유', '해방']
  },

  // 5. 창조 & 예술혼 (art_muse)
  {
    id: 'art-01',
    quote: "예술은 영혼에 묻은 일상의 먼지를 털어내 준다.",
    author: "파블로 피카소",
    source: "피카소의 예술론",
    category: 'art_muse',
    categoryName: '창조 & 예술혼',
    categoryColor: 'text-pink-400',
    categoryIcon: '🎨',
    resonance: "단조로운 일상과 반복되는 피로 속에서도 한 편의 시, 한 줄의 음악, 한 폭의 그림은 우리 영혼을 단숨에 정화합니다.",
    tags: ['예술', '영혼의정화', '창작', '피카소']
  },
  {
    id: 'art-02',
    quote: "너의 내면에 있는 고독을 사랑하라. 위대한 작품과 비범한 생각은 오직 고독의 성소에서만 잉태된다.",
    author: "라이너 마리아 릴케",
    source: "젊은 시인에게 주는 편지",
    category: 'art_muse',
    categoryName: '창조 & 예술혼',
    categoryColor: 'text-pink-400',
    categoryIcon: '🎨',
    resonance: "외로움을 두려워하지 마세요. 고독은 영혼이 자신의 깊은 샘에서 가장 순수한 영감의 물을 길어 올리는 시간입니다.",
    tags: ['릴케', '고독', '창조성', '영감']
  },
  {
    id: 'art-03',
    quote: "네가 영혼으로 하는 모든 일은 결국 세상 사람들의 가슴에 가닿을 것이다.",
    author: "빈센트 반 고흐",
    source: "테오에게 보낸 편지",
    category: 'art_muse',
    categoryName: '창조 & 예술혼',
    categoryColor: 'text-pink-400',
    categoryIcon: '🎨',
    resonance: "완벽함이나 세상의 평가에 연연하지 않고 온 정성을 다해 쏟아부은 진심은 시공간을 초월하여 공명합니다.",
    tags: ['반고흐', '진심', '울림', '열정']
  },
  {
    id: 'art-04',
    quote: "창조는 지성이 유희하는 법을 배울 때 일어난다.",
    author: "알베르트 아인슈타인",
    source: "사유와 상상력",
    category: 'art_muse',
    categoryName: '창조 & 예술혼',
    categoryColor: 'text-pink-400',
    categoryIcon: '🎨',
    resonance: "엄격한 틀과 강박을 내려놓고 어린아이처럼 호기심을 갖고 상상의 날개를 펼칠 때 독창적인 영감이 번뜩입니다.",
    tags: ['상상력', '유희', '창의성', '아인슈타인']
  },

  // 6. 치유 & 하트 (healing_love)
  {
    id: 'heal-01',
    quote: "미안합니다, 용서하세요, 고맙습니다, 사랑합니다. 이 네 마디는 기억의 정화를 통해 신성의 빛을 맞이하는 길이다.",
    author: "모르나 시메오나 & 이하레아칼라 휴 렌",
    source: "호오포노포노의 비밀 (Zero Limits)",
    category: 'healing_love',
    categoryName: '치유 & 하트',
    categoryColor: 'text-rose-400',
    categoryIcon: '🌿',
    resonance: "내 앞에 펼쳐진 현실에 대해 100% 책임을 지고 잠재의식 속 아픈 기억을 정화할 때 무한한 영점(Zero)의 평온이 깃듭니다.",
    tags: ['호오포노포노', '정화', '사랑합니다', '치유']
  },
  {
    id: 'heal-02',
    quote: "상처는 빛이 당신 안으로 들어오는 바로 그 문이다.",
    author: "잘랄 앗딘 루미 (Rumi)",
    source: "마스나비 (Masnavi)",
    category: 'healing_love',
    categoryName: '치유 & 하트',
    categoryColor: 'text-rose-400',
    categoryIcon: '🌿',
    resonance: "가장 아프고 깨어진 그 자리가 바로 우주의 무한한 자비와 깊은 치유의 빛이 스며드는 성스러운 통로입니다.",
    tags: ['루미', '상처와빛', '가슴치유', '희망']
  },
  {
    id: 'heal-03',
    quote: "평화는 나로부터 시작된다. 내 마음이 고요할 때 세상도 나와 함께 고요해진다.",
    author: "틱낫한 (Thich Nhat Hanh)",
    source: "평화로움에 안주하기 (Peace Is Every Step)",
    category: 'healing_love',
    categoryName: '치유 & 하트',
    categoryColor: 'text-rose-400',
    categoryIcon: '🌿',
    resonance: "세상을 바꾸려 분주하기보다 나의 호흡과 발걸음에 먼저 따스한 미소를 머금으세요. 평화는 이미 당신의 한 걸음에 있습니다.",
    tags: ['틱낫한', '평화', '자비', '마음의고요']
  },
  {
    id: 'heal-04',
    quote: "우리가 서로에게 줄 수 있는 가장 큰 선물은 판단 없는 온전한 현존과 경청이다.",
    author: "칼릴 지브란",
    source: "예언자 (The Prophet)",
    category: 'healing_love',
    categoryName: '치유 & 하트',
    categoryColor: 'text-rose-400',
    categoryIcon: '🌿',
    resonance: "상대를 평가하거나 바꾸려 하지 않고 있는 그대로의 존재를 가슴으로 품어주는 것, 그것이 가장 위대한 치유입니다.",
    tags: ['칼릴지브란', '경청', '존중', '사랑']
  },

  // 7. 우주 & 초월진리 (cosmos_truth)
  {
    id: 'cosmos-01',
    quote: "우리는 별들의 먼지(Stardust)로 만들어진 존재이며, 우주가 스스로를 인식하기 위한 생각하는 창이다.",
    author: "칼 세이건 (Carl Sagan)",
    source: "코스모스 (Cosmos)",
    category: 'cosmos_truth',
    categoryName: '우주 & 초월진리',
    categoryColor: 'text-cyan-400',
    categoryIcon: '✨',
    resonance: "당신은 광막한 우주에 던져진 보잘것없는 티끌이 아니라, 우주 138억 년의 역사가 빚어낸 찬란한 지성이자 기적입니다.",
    tags: ['코스모스', '칼세이건', '스타더스트', '우주']
  },
  {
    id: 'cosmos-02',
    quote: "천지만물은 나와 한 몸이며, 도와 나는 결코 둘로 나뉠 수 없다.",
    author: "장자 (Zhuangzi)",
    source: "장자 제물론 (齊物論)",
    category: 'cosmos_truth',
    categoryName: '우주 & 초월진리',
    categoryColor: 'text-cyan-400',
    categoryIcon: '✨',
    resonance: "시비분별과 나/남의 경계를 지우고 우주 만물과 하나로 춤추는 대자유(逍遙遊)를 누리세요.",
    tags: ['장자', '제물론', '만물일체', '자유']
  },
  {
    id: 'cosmos-03',
    quote: "인생에서 가장 아름다운 경험은 '신비로움'을 마주하는 것이다. 그것이야말로 모든 참된 예술과 과학의 원천이다.",
    author: "알베르트 아인슈타인",
    source: "나의 세계관 (The World As I See It)",
    category: 'cosmos_truth',
    categoryName: '우주 & 초월진리',
    categoryColor: 'text-cyan-400',
    categoryIcon: '✨',
    resonance: "알 수 없는 우주의 신비 앞에 겸허히 감탄할 수 있는 가슴이야말로 진정 살아 숨 쉬는 지혜로운 자의 특권입니다.",
    tags: ['신비', '경외감', '아인슈타인', '우주의식']
  },
  {
    id: 'cosmos-04',
    quote: "신은 곧 자연이자 우주 전체이며(Deus sive Natura), 모든 것은 무한한 신성한 본질의 필연적 발현이다.",
    author: "바뤼흐 스피노자",
    source: "에티카 (Ethica)",
    category: 'cosmos_truth',
    categoryName: '우주 & 초월진리',
    categoryColor: 'text-cyan-400',
    categoryIcon: '✨',
    resonance: "두려움과 맹신을 넘어 우주 전체를 살아 숨 쉬는 신성으로 바라볼 때, 우리는 영원의 관점(Sub specie aeternitatis)에서 지극한 지복을 얻습니다.",
    tags: ['스피노자', '에티카', '범신론', '지복']
  },
];

export function getDailyInsight(category: InsightCategory = 'all', seedOffset: number = 0): UniverseInsightItem {
  const filtered = category === 'all' 
    ? UNIVERSE_INSIGHTS 
    : UNIVERSE_INSIGHTS.filter(item => item.category === category);
  
  if (filtered.length === 0) return UNIVERSE_INSIGHTS[0];

  // Daily deterministic index based on YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Deterministic hash to evenly distribute across days
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash = Math.abs(hash + seedOffset);

  const index = hash % filtered.length;
  return filtered[index];
}

export function getRandomInsight(category: InsightCategory = 'all', excludeId?: string): UniverseInsightItem {
  const filtered = category === 'all'
    ? UNIVERSE_INSIGHTS
    : UNIVERSE_INSIGHTS.filter(item => item.category === category);
  
  const pool = excludeId ? filtered.filter(item => item.id !== excludeId) : filtered;
  const targetPool = pool.length > 0 ? pool : filtered;
  const randomIndex = Math.floor(Math.random() * targetPool.length);
  return targetPool[randomIndex];
}
