import type { TarotCard } from '@/data/tarotData';
import type { AuraThemeCard } from '@/lib/auraCards';

interface DailyOracleResult {
  diagnosis: string;
  luckyNumber: string;
  luckyColor: string;
  remedy: string;
  symbol: string;
  frequency: string;
  spiritualEnergy?: string;
  blessingMessage?: string;
  focusPlaylist?: string;
}

/**
 * 타로 카드별 세부 해설 데이터베이스
 */
const TAROT_DETAILS: Record<
  string,
  {
    element: string;
    archetype: string;
    uprightCore: string;
    reversedCore: string;
    shadowWarning: string;
    actionGuidance: string;
    luckyColor: string;
    luckyNum: string;
    symbolWord: string;
    frequency: string;
    playlist: string;
  }
> = {
  // Major Arcana
  major_0: {
    element: "공기 (Air)",
    archetype: "순수한 방랑자이자 새로운 가능성의 창시자",
    uprightCore: "어떠한 편견이나 두려움도 없이 새로운 여정의 첫 발을 떼는 자유로운 도약의 에너지",
    reversedCore: "계획 없는 무모함이나 현실 회피, 준비되지 않은 충동적 결정에 대한 경고",
    shadowWarning: "자유를 핑계로 마땅히 져야 할 책임을 회피하거나 안전장치 없이 뛰어내리는 것을 경계하십시오.",
    actionGuidance: "마음속에 품어왔던 새로운 시도에 망설임 없이 순수한 첫걸음을 내딛으세요.",
    luckyColor: "순백의 화이트 (Pure White)",
    luckyNum: "0",
    symbolWord: "새로운 시작과 순수한 도약",
    frequency: "963Hz 송과체 정화 주파수",
    playlist: "963Hz Pure Consciousness",
  },
  major_1: {
    element: "공기/에테르 (Ether)",
    archetype: "4대 원소를 다루는 현실 창조자",
    uprightCore: "내면의 아이디어와 영감을 현실의 탁월한 성취로 구체화하는 강력한 집중과 창조력",
    reversedCore: "자신의 재능을 과신하여 타인을 기만하거나 기회를 낭비하는 에너지 정체",
    shadowWarning: "말만 앞세우고 실행하지 않거나 표면적인 술수로 상황을 모면하려는 유혹을 차단하세요.",
    actionGuidance: "당신이 가진 도구와 자원을 총동원하여 오늘 당장 구체적인 결과물을 만드세요.",
    luckyColor: "진홍빛 루비 레드 (Ruby Red)",
    luckyNum: "1",
    symbolWord: "창조의 지팡이와 무한대(∞)",
    frequency: "528Hz 기적과 변형 주파수",
    playlist: "528Hz Transformation & Miracles",
  },
  major_2: {
    element: "물 (Water)",
    archetype: "지혜와 무의식의 신비를 수호하는 여사제",
    uprightCore: "외부의 소음을 끄고 내면의 직관과 침묵 속에서 진실을 꿰뚫어 보는 깊은 통찰력",
    reversedCore: "감정을 지나치게 억누르거나 차가운 비밀주의, 혹은 직관을 무시하는 혼란",
    shadowWarning: "타인과의 소통을 완전히 단절하고 지나친 냉소나 고립에 빠지지 않도록 유의하십시오.",
    actionGuidance: "말하기보다는 경청하고, 직관이 가리키는 고요한 신호에 귀를 기울이십시오.",
    luckyColor: "깊은 인디고 블루 (Midnight Indigo)",
    luckyNum: "2",
    symbolWord: "지혜의 석류와 보아스·야긴 기둥",
    frequency: "852Hz 직관 회복 주파수",
    playlist: "852Hz Intuition & Inner Vision",
  },
  major_3: {
    element: "대지 (Earth)",
    archetype: "만물을 품고 기르는 풍요의 대모신",
    uprightCore: "사랑과 창의성이 만개하며 삶의 모든 결실과 아름다움이 풍요롭게 무르익는 축복",
    reversedCore: "창작의 정체, 과도한 소유욕이나 집착, 감정적 과잉 반응",
    shadowWarning: "나태함에 빠지거나 타인을 지나치게 통제하려는 과잉보호를 경계하세요.",
    actionGuidance: "자연의 아름다움을 만끽하고 자신과 주변 사람들에게 따뜻한 영양을 채워주세요.",
    luckyColor: "에메랄드 그린 & 로즈 핑크",
    luckyNum: "3",
    symbolWord: "풍요의 밀이삭과 비너스의 별",
    frequency: "639Hz 조화와 연결 주파수",
    playlist: "639Hz Heart Harmony",
  },
  major_4: {
    element: "불 (Fire)",
    archetype: "질서와 안정을 확립하는 확고한 통치자",
    uprightCore: "명확한 규율과 리더십, 단단한 기반 위에 구축되는 현실적 성공과 권위",
    reversedCore: "완고한 고집, 융통성 결여, 독선적인 통제욕으로 인한 갈등",
    shadowWarning: "자신의 방식만을 강요하며 타인의 유연한 의견을 묵살하지 않도록 주의하세요.",
    actionGuidance: "원칙과 우선순위를 바로잡고 흔들림 없는 단호한 결단으로 상황을 리드하십시오.",
    luckyColor: "황실의 버건디 레드 (Royal Burgundy)",
    luckyNum: "4",
    symbolWord: "단단한 입방체 옥좌와 권장의 보주",
    frequency: "417Hz 변화 촉진과 질서 정립",
    playlist: "417Hz Grounding & Structure",
  },
  major_5: {
    element: "대지 (Earth)",
    archetype: "영적 지혜와 규범을 전수하는 스승",
    uprightCore: "검증된 전통과 신뢰할 수 있는 멘토링, 공동체 안에서 얻는 지혜로운 해답",
    reversedCore: "시대에 뒤떨어진 교조주의, 맹목적인 복종, 비합리적인 규범에 대한 반발",
    shadowWarning: "형식과 겉치레에 얽매여 내면의 진실된 목소리를 억압하지 마십시오.",
    actionGuidance: "신뢰할 수 있는 선배나 전문가의 조언을 구하고 기본에 충실한 방식을 택하세요.",
    luckyColor: "고결한 사프란 골드 (Saffron Gold)",
    luckyNum: "5",
    symbolWord: "삼중관과 천국의 열쇠",
    frequency: "741Hz 문제 해결과 명료한 표현",
    playlist: "741Hz Wisdom & Clarity",
  },
  major_6: {
    element: "공기 (Air)",
    archetype: "영혼의 결합과 중대한 가치관의 선택",
    uprightCore: "서로 다른 두 에너지가 완전한 조화를 이루며 가슴 뛰는 진정한 선택을 내리는 순간",
    reversedCore: "우유부단함, 관계의 불협화음, 도덕적 갈등이나 가치관의 충돌",
    shadowWarning: "단기적인 쾌락이나 타인의 눈치를 보느라 영혼이 진정 원하는 선택을 회피하지 마세요.",
    actionGuidance: "머리의 계산을 내려놓고 가슴이 진정으로 공명하는 사람과 방향을 선택하세요.",
    luckyColor: "파스텔 코랄 & 피치 핑크",
    luckyNum: "6",
    symbolWord: "대천사 라파엘의 축복과 생명나무",
    frequency: "639Hz 관계 치유와 사랑의 공명",
    playlist: "639Hz Deep Soul Connection",
  },
  major_7: {
    element: "물/불 (Water/Fire)",
    archetype: "흑백 스핑크스를 통어하는 불굴의 승리자",
    uprightCore: "상반된 감정과 상황을 강한 의지로 장악하고 목표를 향해 무섭게 돌진하는 승리의 파동",
    reversedCore: "통제력 상실, 폭주하는 분노나 조급함, 장애물 앞에서의 좌절",
    shadowWarning: "과속이나 감정적 격앙으로 인해 방향 감각을 잃지 않도록 브레이크를 점검하세요.",
    actionGuidance: "목표에 시선을 고정하고 어떤 방해에도 흔들리지 말고 끝까지 밀어붙이십시오.",
    luckyColor: "코발트 블루 & 실버 아머",
    luckyNum: "7",
    symbolWord: "별자리 차양막과 승리의 전차",
    frequency: "528Hz 의지력 극대화 주파수",
    playlist: "528Hz Unstoppable Drive",
  },
  major_8: {
    element: "불 (Fire)",
    archetype: "부드러움으로 맹수를 다스리는 내면의 거인",
    uprightCore: "거친 폭력이 아닌 온유함과 인내, 흔들리지 않는 내면의 자비로 승리하는 참된 힘",
    reversedCore: "자기 의심, 억누를 수 없는 분노의 폭발, 나약함에 대한 굴복",
    shadowWarning: "상황을 힘으로 억누르려 하거나 조급하게 성과를 재촉하지 마십시오.",
    actionGuidance: "부드러운 미소와 깊은 포용력으로 갈등을 어루만지고 차분히 설득하십시오.",
    luckyColor: "황금빛 엠버 옐로우 (Warm Amber)",
    luckyNum: "8",
    symbolWord: "장미 덩굴과 무한대(∞)의 면류관",
    frequency: "528Hz 마음의 평화와 내면 치유",
    playlist: "528Hz Inner Strength Flow",
  },
  major_9: {
    element: "대지 (Earth)",
    archetype: "육각별 등불을 비추는 침묵의 탐구자",
    uprightCore: "세속의 번잡함을 떠나 오직 영혼의 진실과 본질을 탐구하는 깊은 지혜와 자아 성찰",
    reversedCore: "지나친 고립감, 현실 부적응, 마음을 닫고 외로움에 빠지는 어두운 그림자",
    shadowWarning: "세상과 단절된 채 혼자만의 동굴에 갇혀 타인의 따뜻한 도움을 거부하지 마세요.",
    actionGuidance: "혼자만의 고요한 시간을 확보하여 지난 여정을 차분히 돌아보고 내면을 정리하세요.",
    luckyColor: "안개의 애쉬 그레이 & 등불의 웜골드",
    luckyNum: "9",
    symbolWord: "지혜의 지팡이와 진리의 육각별",
    frequency: "432Hz 우주 자연 동조 주파수",
    playlist: "432Hz Deep Meditation",
  },
  major_10: {
    element: "불/대지 (Fire/Earth)",
    archetype: "끝없이 회전하는 우주 카르마의 축",
    uprightCore: "피할 수 없는 운명의 상승 기류가 찾아오며 거대한 전환점과 행운이 시작되는 순간",
    reversedCore: "일시적인 불운의 주기, 변화에 대한 완강한 저항, 뜻밖의 지연",
    shadowWarning: "운명의 수레바퀴는 영원히 머물지 않으므로 자만하지 말고 기회의 파도를 포착하세요.",
    actionGuidance: "변화를 두려워하지 말고 우주가 마련해 준 새로운 흐름에 온전히 몸을 맡기세요.",
    luckyColor: "광채의 바이올렛 & 일렉트릭 골드",
    luckyNum: "10",
    symbolWord: "스핑크스와 아누비스의 수레바퀴",
    frequency: "528Hz 운명 개척과 파동 정렬",
    playlist: "528Hz Quantum Leap & Luck",
  },
  major_11: {
    element: "공기 (Air)",
    archetype: "천칭과 검을 든 공정한 우주의 재판관",
    uprightCore: "감정에 치우치지 않는 냉철한 객관성, 뿌린 대로 거두는 명확한 인과율과 진실",
    reversedCore: "편파적인 판단, 억울한 오해, 자신의 실수를 인정하지 않는 책임 회피",
    shadowWarning: "타인을 가혹하게 재단하거나 자신의 결점을 합리화하려는 유혹을 경계하십시오.",
    actionGuidance: "사리분별을 명확히 하고 공정하고 정직한 태도로 문제를 직시하십시오.",
    luckyColor: "청명한 로열 스카이 블루 (True Blue)",
    luckyNum: "11",
    symbolWord: "균형의 황금 천칭과 양날의 검",
    frequency: "741Hz 진실과 정의의 주파수",
    playlist: "741Hz Truth & Alignment",
  },
  major_12: {
    element: "물 (Water)",
    archetype: "세상을 거꾸로 보며 깨달음을 얻는 자발적 순교자",
    uprightCore: "집착을 내려놓고 관점을 180도 전환하여 낡은 자아를 희생하고 영적 각성을 얻는 지혜",
    reversedCore: "무의미한 헛수고, 피해의식, 변화 없는 정체 상태에서의 고통",
    shadowWarning: "행동하지 않고 불평만 늘어놓는 수동적인 태도에서 벗어나 발상의 전환을 꾀하세요.",
    actionGuidance: "조급한 행동을 멈추고 상황을 반대 입장에서 바라보며 유연하게 내려놓으세요.",
    luckyColor: "신비로운 아쿠아 마린 & 세룰리안",
    luckyNum: "12",
    symbolWord: "후광이 깃든 거꾸로 선 나무",
    frequency: "396Hz 죄책감과 두려움 해방",
    playlist: "396Hz Letting Go & Renewal",
  },
  major_13: {
    element: "물 (Water)",
    archetype: "낡은 것을 베어내고 새 생명을 여는 수확자",
    uprightCore: "유효기간이 지난 낡은 껍질의 완전한 종결과 함께 찾아오는 눈부신 새 출발과 변형",
    reversedCore: "끝난 인연이나 과거에 대한 미련, 변화에 대한 공포로 인한 불필요한 고통",
    shadowWarning: "죽어버린 것에 인공호흡기를 달지 마십시오. 깔끔하게 보내주어야 새싹이 돋습니다.",
    actionGuidance: "정리해야 할 물건, 관계, 습관을 오늘 단호하게 종결짓고 공간을 비워내세요.",
    luckyColor: "흑요석 블랙 & 새벽의 화이트 골드",
    luckyNum: "13",
    symbolWord: "신비의 백장미 깃발과 떠오르는 태양",
    frequency: "396Hz 정화와 근원적 탈피",
    playlist: "396Hz Liberation & Rebirth",
  },
  major_14: {
    element: "불/물 (Fire/Water)",
    archetype: "두 잔의 물을 황금비율로 섞는 대천사",
    uprightCore: "서로 다른 극단을 조화롭게 융합하여 마음의 평정과 신체적 웰빙을 복구하는 중용의 미학",
    reversedCore: "과음, 과식, 감정적 극단, 불균형으로 인한 에너지 누수",
    shadowWarning: "성급하게 결과를 내려고 무리수를 두거나 극단적인 선택을 하지 마십시오.",
    actionGuidance: "속도를 늦추고 일과 휴식, 이상과 현실의 황금비율을 찾아 부드럽게 조율하세요.",
    luckyColor: "청량한 오팔 민트 & 라벤더",
    luckyNum: "14",
    symbolWord: "두 개의 성배와 무지개 날개",
    frequency: "528Hz 완전한 심신 조화 주파수",
    playlist: "528Hz Harmony & Alchemy",
  },
  major_15: {
    element: "대지 (Earth)",
    archetype: "물질과 쾌락의 사슬을 쥐고 있는 그림자",
    uprightCore: "에고의 집착, 중독, 억압된 욕망의 적나라한 실체를 직시하고 환영의 사슬을 끊는 계기",
    reversedCore: "오랜 악습과 굴레로부터의 통쾌한 해방, 맹목적인 유혹의 타파",
    shadowWarning: "당신을 옭아맨 사슬은 사실 스스로 언제든 벗어던질 수 있는 느슨한 고리임을 기억하세요.",
    actionGuidance: "나를 갉아먹는 유혹이나 부정적 생각 패턴을 똑바로 응시하고 단호히 끊어내세요.",
    luckyColor: "딥 차콜 블랙 & 핏빛 스칼렛",
    luckyNum: "15",
    symbolWord: "뒤집힌 오망성과 느슨한 목사슬",
    frequency: "417Hz 부정적 카르마 정화",
    playlist: "417Hz Shadow Release",
  },
  major_16: {
    element: "불 (Fire)",
    archetype: "거짓된 바벨탑을 부수는 정화의 번개",
    uprightCore: "모래 위에 쌓은 허상의 구조물이 무너지며 찾아오는 충격과 그 뒤에 열리는 진정한 해방",
    reversedCore: "임박한 위기의 극적인 회피, 지연되는 변화로 인한 만성적 불안",
    shadowWarning: "무너지는 낡은 탑을 억지로 붙잡으려 하지 마십시오. 부서져야 진실한 터가 드러납니다.",
    actionGuidance: "예상치 못한 변화나 계획의 수정이 찾아오더라도 담담하게 받아들이고 새 판을 짜세요.",
    luckyColor: "번개의 일렉트릭 옐로우 & 번트 오렌지",
    luckyNum: "16",
    symbolWord: "떨어지는 왕관과 천상의 번개",
    frequency: "417Hz 구속 타파와 의식 각성",
    playlist: "417Hz Breaking Chains",
  },
  major_17: {
    element: "공기/물 (Air/Water)",
    archetype: "어둠 속에서 길을 비추는 영원한 희망의 별",
    uprightCore: "폭풍우가 지나간 뒤 대지에 부어지는 맑은 생명수처럼, 영혼을 어루만지는 치유와 영감",
    reversedCore: "비관주의, 희망의 상실, 현실과 동떨어진 비현실적 망상",
    shadowWarning: "비관적인 생각에 젖어 당신의 미래를 어둡게 점치지 마십시오. 새벽은 이미 밝아오고 있습니다.",
    actionGuidance: "당신의 꿈과 소망을 신뢰하고, 자신을 위한 따뜻한 치유와 휴식을 선물하세요.",
    luckyColor: "청아한 스타라이트 실버 & 시안 블루",
    luckyNum: "17",
    symbolWord: "여덟 갈래 북극성과 생명의 샘물",
    frequency: "528Hz 영혼 치유와 희망의 파동",
    playlist: "528Hz Starlight Healing",
  },
  major_18: {
    element: "물 (Water)",
    archetype: "안개 자욱한 무의식의 심연을 비추는 달",
    uprightCore: "감추어진 불안과 환영 속에서 꿈과 무의식의 기호들을 읽어내는 신비로운 직관의 밤",
    reversedCore: "모호한 안개가 걷히고 진실이 드러남, 오랜 의혹과 불안의 종식",
    shadowWarning: "확인되지 않은 소문이나 스스로 만들어낸 상상의 두려움에 사로잡히지 마십시오.",
    actionGuidance: "불확실한 상황에서 섣부른 판단을 유보하고 내면의 무의식 신호에 집중하세요.",
    luckyColor: "달빛의 펄 실버 & 미드나잇 블루",
    luckyNum: "18",
    symbolWord: "달을 향해 짖는 늑대와 가재",
    frequency: "852Hz 환상 타파와 직관 명료화",
    playlist: "852Hz Dreamscape & Intuition",
  },
  major_19: {
    element: "불 (Fire)",
    archetype: "어둠을 완전히 몰아내는 찬란한 태양",
    uprightCore: "압도적인 긍정 에너지, 건강한 생명력, 모든 일이 명쾌하게 풀려나가는 최고의 성공과 기쁨",
    reversedCore: "일시적인 구름에 가린 해, 과도한 열정으로 인한 탈진, 지나친 낙관주의",
    shadowWarning: "모든 것이 잘 풀릴 때 오만해지지 말고 주변 사람들에게 따뜻한 온기를 나누세요.",
    actionGuidance: "당신의 매력과 자신감을 마음껏 발휘하고 오늘 하루를 활짝 웃으며 즐기세요.",
    luckyColor: "눈부신 썬 플레임 옐로우 & 골드",
    luckyNum: "19",
    symbolWord: "백마를 탄 아이와 활짝 핀 해바라기",
    frequency: "528Hz 활력 충전과 극상의 행운",
    playlist: "528Hz Solar Radiance",
  },
  major_20: {
    element: "불/물 (Fire/Water)",
    archetype: "죽은 자를 깨우는 대천사의 최후 나팔",
    uprightCore: "과거의 모든 업보가 청산되고 영혼의 소명을 향해 다시 태어나는 결정적 각성과 결단의 순간",
    reversedCore: "스스로를 향한 가혹한 자책, 부름에 대한 외면, 결단을 미루는 망설임",
    shadowWarning: "과거의 실수에 발목 잡혀 새로운 부름을 거부하지 마십시오. 판결은 이미 끝났습니다.",
    actionGuidance: "망설여왔던 중대한 결단을 내리고 당신의 본래 소명을 향해 당당히 응답하십시오.",
    luckyColor: "천상의 에테르 화이트 & 골든 브라스",
    luckyNum: "20",
    symbolWord: "대천사 가브리엘의 황금 나팔",
    frequency: "963Hz 영적 부활과 주파수 도약",
    playlist: "963Hz Awakening & Rebirth",
  },
  major_21: {
    element: "대지/에테르 (Earth/Ether)",
    archetype: "우주와 하나 되어 춤추는 완성자",
    uprightCore: "오랜 여정의 완벽한 성취, 통합과 조화, 다음 차원으로 도약하기 전의 완전한 축복",
    reversedCore: "마지막 한 뼘의 미완성, 마무리 부족, 지연되는 마침표",
    shadowWarning: "거의 다 왔을 때 방심하여 마지막 마무리를 소홀히 하지 않도록 꼼꼼히 점검하세요.",
    actionGuidance: "지금까지 걸어온 길을 자축하고, 완성된 결실을 발판 삼아 더 넓은 세계로 나아가세요.",
    luckyColor: "우주의 코스믹 인디고 & 무지개 오팔",
    luckyNum: "21",
    symbolWord: "월계수 화환과 네 수호자의 합일",
    frequency: "528Hz 완전한 성취와 우주 공명",
    playlist: "528Hz Cosmic Wholeness",
  },
};

/**
 * 수트(마이너 아르카나) 기본 템플릿
 */
function getSuitDetails(card: TarotCard) {
  const isRev = !!card.reversed;
  const name = card.nameKo;
  const kws = card.keywords.join(", ");

  if (card.type === "wands") {
    return {
      element: "불 (Fire - 열정, 행동, 사업, 영감)",
      archetype: `지팡이의 불꽃을 품은 ${name}`,
      uprightCore: `[${name}] 카드는 불꽃 같은 열정과 도전 정신, 그리고 새로운 기회를 향해 과감하게 뻗어나가는 역동적인 추진력을 상징합니다.`,
      reversedCore: `[${name}] 역방향은 에너지가 과도하게 분산되거나 조급함으로 인해 탈진(Burnout)이 일어날 수 있음을 경고합니다.`,
      shadowWarning: "의욕만 앞서 디테일을 놓치거나 성급하게 결론을 내리지 않도록 호흡을 가다듬으세요.",
      actionGuidance: `키워드 '${kws}'를 가슴에 품고, 오늘 하루 미뤄왔던 행동 과제를 과감하게 실행에 옮기십시오.`,
      luckyColor: "타오르는 스칼렛 오렌지",
      luckyNum: "3",
      symbolWord: "싹이 돋아난 생명의 지팡이",
      frequency: "528Hz 활력과 열정의 파동",
      playlist: "528Hz Passion & Vitality",
    };
  }
  if (card.type === "cups") {
    return {
      element: "물 (Water - 감정, 사랑, 관계, 직관)",
      archetype: `성배의 생명수를 품은 ${name}`,
      uprightCore: `[${name}] 카드는 풍성하게 넘쳐흐르는 감정의 교감, 따뜻한 사랑과 치유, 그리고 영혼을 채우는 직관적 감수성을 상징합니다.`,
      reversedCore: `[${name}] 역방향은 감정의 기복이나 과거의 상처에 집착하여 현실적인 관계의 균형을 잃을 수 있음을 시사합니다.`,
      shadowWarning: "감정에 휘둘려 이성적인 판단을 그르치거나 타인의 감정 쓰레기통이 되지 않도록 경계를 지키세요.",
      actionGuidance: `키워드 '${kws}'를 되새기며, 나 자신과 소중한 사람에게 따뜻한 진심과 위로의 말을 전하세요.`,
      luckyColor: "투명한 아쿠아 마린 블루",
      luckyNum: "2",
      symbolWord: "넘쳐흐르는 황금 성배",
      frequency: "639Hz 사랑과 마음의 치유",
      playlist: "639Hz Heart Resonance",
    };
  }
  if (card.type === "swords") {
    return {
      element: "공기 (Air - 이성, 결단, 진실, 명석함)",
      archetype: `진실의 검을 벼리는 ${name}`,
      uprightCore: `[${name}] 카드는 냉철한 이성과 예리한 통찰력, 복잡한 혼란을 단칼에 베어내는 명쾌한 진실과 결단력을 상징합니다.`,
      reversedCore: `[${name}] 역방향은 지나친 비판의식, 과도한 걱정과 뇌내 망상, 혹은 칼날에 스스로가 다치는 상처를 경고합니다.`,
      shadowWarning: "말과 생각의 칼날로 타인이나 자신에게 상처를 주지 않도록 자비로운 분별력을 유지하세요.",
      actionGuidance: `키워드 '${kws}'를 바탕으로, 불필요한 생각의 군더더기를 쳐내고 핵심 사실에만 집중하십시오.`,
      luckyColor: "차가운 다이아몬드 실버",
      luckyNum: "1",
      symbolWord: "구름을 뚫고 솟은 지혜의 검",
      frequency: "741Hz 직관과 명료한 사고",
      playlist: "741Hz Pure Intellect",
    };
  }
  if (card.type === "pentacles") {
    return {
      element: "대지 (Earth - 물질, 재정, 안정, 실질적 성취)",
      archetype: `황금 펜타클의 결실을 가꾸는 ${name}`,
      uprightCore: `[${name}] 카드는 단단한 현실적 기반, 성실한 노력의 결실, 그리고 손에 잡히는 구체적인 풍요와 안정을 상징합니다.`,
      reversedCore: `[${name}] 역방향은 물질적 불안감, 인색함, 혹은 단기적인 이익에 눈이 멀어 장기적인 신뢰를 잃는 것을 경계합니다.`,
      shadowWarning: "돈이나 소유물에 지나치게 집착하여 삶의 진정한 기쁨과 온기를 잊지 않도록 하세요.",
      actionGuidance: `키워드 '${kws}'를 실천 지표로 삼아, 오늘 하루 현실의 작은 디테일을 정성껏 다듬고 관리하십시오.`,
      luckyColor: "풍요로운 에메랄드 골드",
      luckyNum: "8",
      symbolWord: "대지의 결실을 맺는 황금 코인",
      frequency: "432Hz 현실 접지와 풍요 주파수",
      playlist: "432Hz Earth Abundance",
    };
  }

  return {
    element: "에테르 (Ether)",
    archetype: `신비의 상징 ${name}`,
    uprightCore: `[${name}] 카드는 삶의 균형과 영적 성장을 가리키는 우주의 신비로운 이정표입니다.`,
    reversedCore: `[${name}] 역방향은 내면의 신호를 놓치지 말고 천천히 중심을 되찾을 것을 권고합니다.`,
    shadowWarning: "조급한 마음에 휩쓸리지 않도록 마음의 영점을 지키세요.",
    actionGuidance: `키워드 '${kws}'의 의미를 깊이 음미하며 오늘 하루를 온전히 정렬하세요.`,
    luckyColor: "황금빛 골드",
    luckyNum: "7",
    symbolWord: "우주의 조화",
    frequency: "528Hz",
    playlist: "528Hz Solfeggio Resonance",
  };
}

/**
 * 타로 카드에 기반한 완전 맞춤형 데일리 오라클 결과 생성 엔진
 */
export function buildSpecificTarotDailyOracle(card: TarotCard, mode: string = "oracle"): DailyOracleResult {
  const cardName = card.nameKo;
  const cardEn = card.name;
  const isReversed = !!card.reversed;
  const orientation = isReversed ? "역방향 (Reversed)" : "정방향 (Upright)";
  const keywords = (card.keywords || []).join(", ");
  const cardTypeStr = card.type === "major" ? "메이저 아르카나 (Major Arcana)" : `${card.type.toUpperCase()} 수트 (Minor Arcana)`;

  const details = TAROT_DETAILS[card.id] || getSuitDetails(card);

  const diagnosis = `### 🌟 [${cardName}${cardEn ? ` (${cardEn})` : ''}] 카드의 고유한 상징과 비전
오늘 당신의 의식 표면으로 드로우된 카드는 **[${cardName}]**이며, **${orientation}**의 위상으로 당신을 마주하고 있습니다. 
이 카드는 **${cardTypeStr}**에 속하며, **${details.element}**의 본원적 에너지를 담고 있습니다. 핵심 키워드인 **'${keywords}'**는 현재 질문자의 시점에 우주가 던지는 가장 명료하고 강력한 신호입니다.
- **카드의 본질**: ${isReversed ? details.reversedCore : details.uprightCore}
- **원형의 가르침**: 이 카드는 '${details.archetype}'으로서, 질문자가 오늘 직면한 상황의 이면을 꿰뚫어 볼 수 있는 눈을 밝혀줍니다.

### 🔮 오늘의 운명 흐름과 심층 파동
오늘은 **[${cardName}]** 카드의 파동이 당신의 일상과 선택의 기로에 강력한 인과율을 형성합니다.
${isReversed 
  ? `카드가 역방향으로 드러난 것은 결코 불운이 아니며, **내면을 먼저 정돈하고 서두르지 말라는 지혜로운 브레이크**입니다. 외부의 자극에 즉각 반응하기보다 한 박자 늦추어 마음의 동요를 관찰하십시오.`
  : `카드가 정방향으로 힘차게 서 있는 만큼, **[${cardName}]**의 상승 기류가 당신의 결단과 추진력에 힘을 보태고 있습니다. 가슴속에 품었던 직관을 믿고 명확하게 앞으로 나아가기에 최적의 날입니다.`}

### ⚖️ 현실에서의 실천과 주의점 (Shadow & Light)
- **에고의 주의점(Shadow)**: ${details.shadowWarning}
- **빛의 방향성(Light)**: **[${cardName}]**의 정수처럼 자신의 중심을 확고히 지키며, 주변의 사소한 혼란에 에너지를 낭비하지 마십시오.

### 🧭 오늘의 오라클 핵심 지침
${details.actionGuidance}
**[${cardName}]** 카드의 신성한 상징을 마음에 품고, 오늘 하루 당신이 딛는 모든 순간에 당당한 확신과 고요한 평온을 불어넣으십시오.`;

  return {
    diagnosis,
    luckyNumber: details.luckyNum,
    luckyColor: details.luckyColor,
    remedy: `[${cardName}] 카드의 상징(${keywords})을 떠올리며, ${details.actionGuidance.slice(0, 45)}...`,
    symbol: details.symbolWord,
    frequency: details.frequency,
    spiritualEnergy: `[${cardName}] 카드의 ${details.element} 파동이 당신의 가슴과 차크라에 조화롭게 감응하여 깊은 내면의 힘과 통찰을 일깨웁니다.`,
    blessingMessage: `오늘 하루 당신의 모든 발걸음 위에 [${cardName}] 카드의 찬란한 가호와 빛나는 승리가 함께하기를 축복합니다.`,
    focusPlaylist: details.playlist,
  };
}

/**
 * 세도나 방하착 카드에 기반한 완전 맞춤형 릴리즈 오라클 생성 엔진
 */
export function buildSpecificSedonaDailyOracle(
  card: AuraThemeCard,
  theme?: string,
  mode: string = "sedona"
): DailyOracleResult {
  const cardName = card.nameKo;
  const cardEn = card.name;
  const keywords = (card.keywords || []).join(", ");
  const cardDesc = card.desc;
  const themeName = theme || "일상 정서 방하착";

  const diagnosis = `### 🌿 [${cardName} (${cardEn})] 카드의 에고 정화 테마와 의식 정렬
오늘 당신의 무의식 정화 세션에 도출된 방하착 치유 카드는 **[${cardName}]**입니다.
- **카드의 고유 파동**: ${cardDesc}
- **핵심 정화 키워드**: **${keywords}**
- **정렬 테마**: **${themeName}**

현재 당신의 내면 깊은 곳에서 저항과 피로를 유발하던 무의식적 전압은 **[${cardName}]**의 청정한 주파수와 마주하며 부드럽게 녹아내리기 시작했습니다. 에고가 쥐고 있던 4대 결핍 갈망(통제욕, 인정욕, 안전욕, 분리욕) 중 특히 **[${cardName}]** 카드가 비추는 집착의 실체를 자각할 때, 진정한 자유가 회복됩니다.

### 🌊 세도나 4단계 맞춤 방하착 (Releasing Process)
1. **허용하기 (Could I allow it?)**: 지금 가슴 속에 일어나는 [${cardName}] 카드의 감정과 묵직한 에고의 저항을 있는 그대로 허용할 수 있습니까? 
   👉 *“네, 어떠한 판단이나 억압 없이 온전히 허용합니다.”*
2. **흘려보내기 (Could I let it go?)**: 이 쥐고 있던 생각과 통제 욕구를 강물에 띄우듯 흘려보낼 수 있습니까? 
   👉 *“네, 힘을 빼고 자연스럽게 흘려보낼 수 있습니다.”*
3. **기꺼이 놓아버리기 (Would I let it go?)**: 내면의 절대적 자유와 영원한 평화를 위해 지금 기꺼이 놓아버리겠습니까? 
   👉 *“네, 망설임 없이 기꺼이 내려놓겠습니다.”*
4. **지금 이 순간 (When?)**: **지금 당장 (NOW)**, 가슴의 빗장을 열고 깊은 날숨과 함께 온전히 항복(Surrender)하십시오.

### ✨ 에고 해방과 영혼의 항복 확언 (Hawkins Letting Go)
> **“나는 [${cardName}] 카드가 비추는 에고의 저항과 두려움을 있는 그대로 자각하며, 이 감정을 통제하려 했던 오랜 집착을 평화롭게 흘려보냅니다. 나는 이미 한없이 자유롭고 고요한 순수 의식 그 자체입니다.”**

### 🧭 오늘의 방하착 실천 지침 (Daily Releasing Practice)
오늘 하루 중 긴장이나 답답함이 느껴질 때마다, **[${cardName}]**의 빛을 가슴에 품고 10초간 깊게 숨을 내쉬며 "놓아버린다"를 마음속으로 읊조리세요. 저항을 멈추는 순간 기적 같은 평온이 찾아옵니다.`;

  return {
    diagnosis,
    luckyNumber: "7",
    luckyColor: `${cardName}의 고유 오라 빛깔`,
    remedy: `[${cardName}] 카드의 테마(${keywords})를 상기하며, 호흡을 내쉴 때마다 가슴 속 긴장과 저항을 10초간 온전히 흘려보내기`,
    symbol: `${cardName}의 정화 크리스탈`,
    frequency: "528Hz 솔페지오 사랑과 치유의 주파수",
    spiritualEnergy: `[${cardName}] 카드의 치유 파동이 가슴 차크라와 공명하여 에고의 저항을 녹여내고 본연의 평온을 회복시킵니다.`,
    blessingMessage: `모든 집착이 스러진 고요한 자리에서 [${cardName}]의 청정한 빛이 당신의 하루를 온전히 축복합니다.`,
    focusPlaylist: "528Hz Cellular Healing & Release",
  };
}
