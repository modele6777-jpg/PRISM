export interface AuraThemeCard {
  id: string;
  name: string;
  nameKo: string;
  emoji: string;
  keywords: string[];
  desc: string;
}

export const AURA_CARDS: AuraThemeCard[] = [
  {
    id: "white_purifier",
    name: "White Purifier",
    nameKo: "정화의 백색",
    emoji: "🤍",
    keywords: ["정화", "순수", "시작", "명료함"],
    desc: "모든 것을 비워내고 새롭게 시작할 수 있는 맑고 순수한 백색의 에너지입니다."
  },
  {
    id: "emerald_healer",
    name: "Emerald Healer",
    nameKo: "치유의 녹색",
    emoji: "💚",
    keywords: ["치유", "성장", "균형", "자연"],
    desc: "지친 마음과 몸을 어루만지고 생명력을 채워주는 싱그러운 녹색의 치유 파동입니다."
  },
  {
    id: "indigo_sage",
    name: "Indigo Sage",
    nameKo: "통찰의 남색",
    emoji: "💙",
    keywords: ["통찰", "지혜", "직관", "고요"],
    desc: "내면의 목소리에 귀 기울이며 본질을 꿰뚫어 보게 돕는 깊고 신비로운 남색 광채입니다."
  },
  {
    id: "golden_sun",
    name: "Golden Sun",
    nameKo: "풍요의 금색",
    emoji: "💛",
    keywords: ["풍요", "성공", "기쁨", "자신감"],
    desc: "태양처럼 따스하고 빛나며 내재된 가능성과 풍요를 일깨우는 황금빛 활력입니다."
  },
  {
    id: "crimson_fire",
    name: "Crimson Fire",
    nameKo: "열정의 적색",
    emoji: "❤️",
    keywords: ["열정", "행동", "활력", "용기"],
    desc: "망설임을 걷어내고 힘차게 도약할 수 있도록 용기와 생명력을 불어넣는 붉은 불꽃입니다."
  },
  {
    id: "solar_yellow",
    name: "Solar Yellow",
    nameKo: "활력의 황색",
    emoji: "☀️",
    keywords: ["소통", "밝음", "긍정", "창의성"],
    desc: "긍정적인 생각과 지치지 않는 호기심으로 매 순간에 미소를 선사하는 따사로운 노란빛입니다."
  },
  {
    id: "violet_mystic",
    name: "Violet Mystic",
    nameKo: "신비의 자색",
    emoji: "💜",
    keywords: ["신비", "직관", "고귀", "예술"],
    desc: "현실을 뛰어넘어 깊은 영적 조화와 예술적인 상상력을 깨워내는 자줏빛 신비의 에너지입니다."
  },
  {
    id: "pink_harmony",
    name: "Pink Harmony",
    nameKo: "조화의 분홍",
    emoji: "💖",
    keywords: ["사랑", "조화", "공감", "따뜻함"],
    desc: "타인과 나 자신을 향한 무조건적인 사랑과 연민으로 가득 찬 포근한 분홍빛 치유 에너지입니다."
  },
  {
    id: "turquoise_flow",
    name: "Turquoise Flow",
    nameKo: "흐름의 청록",
    emoji: "🩵",
    keywords: ["자유", "표현", "창조", "흐름"],
    desc: "막힘 없는 생각의 흐름과 진정한 나를 세상에 조화롭게 표현하게 돕는 맑은 청록색의 물결입니다."
  },
  {
    id: "silver_moon",
    name: "Silver Moon",
    nameKo: "직관의 은색",
    emoji: "🌙",
    keywords: ["민감", "수용", "치유", "은혜"],
    desc: "달빛처럼 부드럽고 섬세하게 감정을 수용하고 어루만지는 고요한 은빛 아우라입니다."
  },
  {
    id: "amber_earth",
    name: "Amber Earth",
    nameKo: "대지의 황토",
    emoji: "🤎",
    keywords: ["안정", "접지", "신뢰", "인내"],
    desc: "흔들리지 않는 대지처럼 단단하게 중심을 잡아주고 깊은 안정감을 주는 든든한 흙빛 에너지입니다."
  },
  {
    id: "coral_passion",
    name: "Coral Passion",
    nameKo: "열망의 산호",
    emoji: "🧡",
    keywords: ["창의", "사교", "기쁨", "친밀"],
    desc: "삶의 다채로운 순간들을 축제처럼 즐기며 소중한 이들과 따스하게 공명하게 해주는 산호빛 따스함입니다."
  },
  {
    id: "rainbow_light",
    name: "Rainbow Light",
    nameKo: "통합의 무지개",
    emoji: "🌈",
    keywords: ["통합", "다양성", "자유", "완성"],
    desc: "모든 아우라 주파수가 완벽한 어울림을 이루어 눈부신 생명을 그려내는 무지개 스펙트럼입니다."
  },
  {
    id: "obsidian_protection",
    name: "Obsidian Protection",
    nameKo: "보호의 흑색",
    emoji: "🖤",
    keywords: ["보호", "단단함", "정화", "독립"],
    desc: "불필요한 외부의 자극이나 부정적 에너지를 완벽히 차단하고 스스로를 온전히 지켜내는 강력한 아우라입니다."
  },
  {
    id: "sapphire_peace",
    name: "Sapphire Peace",
    nameKo: "평화의 사파이어",
    emoji: "🔷",
    keywords: ["평화", "신뢰", "차분", "충실"],
    desc: "고요하고 깊은 바다처럼 마음을 진정시키고 영원한 안식과 상호 간의 신뢰를 다져주는 사파이어의 파동입니다."
  },
  {
    id: "pearl_purity",
    name: "Pearl Purity",
    nameKo: "순수의 진주",
    emoji: "🦪",
    keywords: ["순결", "성찰", "내면의 미", "귀함"],
    desc: "인내와 아픔 속에서 빚어진 깊은 성찰을 거쳐 마침내 영롱하게 우러나온 조화로운 진주의 빛깔입니다."
  },
  {
    id: "copper_grounding",
    name: "Copper Grounding",
    nameKo: "접지의 구리",
    emoji: "🪙",
    keywords: ["연결", "정렬", "전도", "균형"],
    desc: "하늘과 땅의 활력을 막힘 없이 이어주고 신체의 에너지를 조화롭게 활성화하는 구리빛 주파수입니다."
  },
  {
    id: "platinum_evolution",
    name: "Platinum Evolution",
    nameKo: "진화의 백금",
    emoji: "🔘",
    keywords: ["변화", "초월", "영성", "도약"],
    desc: "더 높은 차원으로 한 걸음 나아갈 수 있도록 낡은 관념을 녹이고 변화와 정화를 가져오는 백금빛 에너지입니다."
  },
  {
    id: "bronze_strength",
    name: "Bronze Strength",
    nameKo: "강인함의 청동",
    emoji: "🛡️",
    keywords: ["강인함", "안정", "전통", "인내"],
    desc: "모진 풍파를 견디며 한결같은 가치로 자리하는 청동 거울처럼 깊고 진한 내면의 단단함을 선사합니다."
  },
  {
    id: "jade_balance",
    name: "Jade Balance",
    nameKo: "조화의 비취",
    emoji: "🔋",
    keywords: ["비취", "건강", "장수", "행운"],
    desc: "부귀와 안녕을 뜻하는 푸른 비취처럼 지혜를 돋우고 전신에 부드러운 안도감을 선사하는 조화로운 수호 아우라입니다."
  },
  {
    id: "crystal_clarity",
    name: "Crystal Clarity",
    nameKo: "선명함의 수정",
    emoji: "🔮",
    keywords: ["선명", "투명", "집중", "조율"],
    desc: "티 없이 깨끗한 수정처럼 잡념을 모두 지우고 나아갈 길과 목표를 흐트러짐 없이 드러내는 광채입니다."
  },
  {
    id: "cosmic_nebula",
    name: "Cosmic Nebula",
    nameKo: "우주의 성운",
    emoji: "🌌",
    keywords: ["무한", "우주", "창조", "동조"],
    desc: "끝없이 팽창하는 우주의 신비로운 성운처럼 모든 생명과 운명의 순환이 엮인 우주적 포용의 아우라입니다."
  }
];
