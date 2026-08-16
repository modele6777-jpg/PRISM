export interface TarotCard {
  id: string;
  name: string;
  nameKo: string;
  type: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';
  keywords: string[];
  /** 정/역방향 — 카드 뽑기 시 할당 */
  reversed?: boolean;
}

/** 약 40% 확률로 역방향 (drawCards와 동일 비율) */
export function rollTarotReversed(): boolean {
  return Math.random() > 0.6;
}

export function formatTarotOrientation(card: TarotCard): string {
  return card.reversed ? '역방향' : '정방향';
}

export const TAROT_DECK: TarotCard[] = [
  { id: "major_0", name: "The Fool", nameKo: "광대", type: "major", keywords: ["시작", "순수", "자유", "모험"] },
  { id: "major_1", name: "The Magician", nameKo: "마법사", type: "major", keywords: ["창조", "의지", "능력", "집중"] },
  { id: "major_2", name: "The High Priestess", nameKo: "여사제", type: "major", keywords: ["직관", "비밀", "지혜", "무의식"] },
  { id: "major_3", name: "The Empress", nameKo: "여황제", type: "major", keywords: ["풍요", "모성", "자연", "아름다움"] },
  { id: "major_4", name: "The Emperor", nameKo: "황제", type: "major", keywords: ["권위", "구조", "통제", "안정"] },
  { id: "major_5", name: "The Hierophant", nameKo: "교황", type: "major", keywords: ["전통", "가르침", "신념", "규범"] },
  { id: "major_6", name: "The Lovers", nameKo: "연인", type: "major", keywords: ["사랑", "조화", "선택", "가치"] },
  { id: "major_7", name: "The Chariot", nameKo: "전차", type: "major", keywords: ["승리", "의지", "통제", "전진"] },
  { id: "major_8", name: "Strength", nameKo: "힘", type: "major", keywords: ["용기", "인내", "설득", "내면의 힘"] },
  { id: "major_9", name: "The Hermit", nameKo: "은둔자", type: "major", keywords: ["성찰", "탐구", "고독", "내면의 지혜"] },
  { id: "major_10", name: "Wheel of Fortune", nameKo: "운명의 수레바퀴", type: "major", keywords: ["순환", "운명", "변화", "전환점"] },
  { id: "major_11", name: "Justice", nameKo: "정의", type: "major", keywords: ["공정", "균형", "원인과 결과", "진실"] },
  { id: "major_12", name: "The Hanged Man", nameKo: "매달린 사람", type: "major", keywords: ["희생", "새로운 시각", "기다림", "내려놓음"] },
  { id: "major_13", name: "Death", nameKo: "죽음", type: "major", keywords: ["끝과 시작", "변형", "해빙", "정화"] },
  { id: "major_14", name: "Temperance", nameKo: "절제", type: "major", keywords: ["균형", "조절", "중용", "치유"] },
  { id: "major_15", name: "The Devil", nameKo: "악마", type: "major", keywords: ["집착", "구속", "그림자", "물질주의"] },
  { id: "major_16", name: "The Tower", nameKo: "탑", type: "major", keywords: ["갑작스러운 변화", "파괴", "깨달음", "해방"] },
  { id: "major_17", name: "The Star", nameKo: "별", type: "major", keywords: ["희망", "영감", "평안", "치유"] },
  { id: "major_18", name: "The Moon", nameKo: "달", type: "major", keywords: ["환상", "불안", "직관", "무의식"] },
  { id: "major_19", name: "The Sun", nameKo: "태양", type: "major", keywords: ["기쁨", "성공", "긍정", "활력"] },
  { id: "major_20", name: "Judgement", nameKo: "심판", type: "major", keywords: ["재탄생", "부름", "각성", "결단"] },
  { id: "major_21", name: "The World", nameKo: "세계", type: "major", keywords: ["완성", "통합", "성취", "순환의 끝"] },
  
  // Wands
  { id: "wands_1", name: "Ace of Wands", nameKo: "지팡이 에이스", type: "wands", keywords: ["도약", "열정", "창조력", "새로운 기회"] },
  { id: "wands_2", name: "Two of Wands", nameKo: "지팡이 2", type: "wands", keywords: ["선택", "확장", "계획", "준비"] },
  { id: "wands_3", name: "Three of Wands", nameKo: "지팡이 3", type: "wands", keywords: ["탐험", "선견지명", "리더십", "팀워크"] },
  { id: "wands_4", name: "Four of Wands", nameKo: "지팡이 4", type: "wands", keywords: ["축하", "안정", "성취", "가정"] },
  { id: "wands_5", name: "Five of Wands", nameKo: "지팡이 5", type: "wands", keywords: ["경쟁", "갈등", "협상", "의견 대립"] },
  { id: "wands_6", name: "Six of Wands", nameKo: "지팡이 6", type: "wands", keywords: ["승리", "인정", "성공", "자부심"] },
  { id: "wands_7", name: "Seven of Wands", nameKo: "지팡이 7", type: "wands", keywords: ["방어", "도전", "경쟁 속의 유지", "결단력"] },
  { id: "wands_8", name: "Eight of Wands", nameKo: "지팡이 8", type: "wands", keywords: ["빠른 전개", "행동", "소식", "민첩함"] },
  { id: "wands_9", name: "Nine of Wands", nameKo: "지팡이 9", type: "wands", keywords: ["회복력", "경계", "인내", "지속적인 노력"] },
  { id: "wands_10", name: "Ten of Wands", nameKo: "지팡이 10", type: "wands", keywords: ["책임감", "부담", "과로", "목표의 무게"] },
  { id: "wands_11", name: "Page of Wands", nameKo: "지팡이 시종", type: "wands", keywords: ["메신저", "호기심", "창조적 시작", "새로운 소식"] },
  { id: "wands_12", name: "Knight of Wands", nameKo: "지팡이 기사", type: "wands", keywords: ["열정적", "충동적", "행동 지향적", "모험을 즐기는"] },
  { id: "wands_13", name: "Queen of Wands", nameKo: "지팡이 여왕", type: "wands", keywords: ["자신감", "카리스마", "독립적", "매력적인"] },
  { id: "wands_14", name: "King of Wands", nameKo: "지팡이 왕", type: "wands", keywords: ["비전", "지도력", "영감", "야망"] },

  // Cups
  { id: "cups_1", name: "Ace of Cups", nameKo: "컵 에이스", type: "cups", keywords: ["사랑", "감정의 시작", "친밀감", "영감"] },
  { id: "cups_2", name: "Two of Cups", nameKo: "컵 2", type: "cups", keywords: ["결합", "파트너십", "로맨스", "상호 존중"] },
  { id: "cups_3", name: "Three of Cups", nameKo: "컵 3", type: "cups", keywords: ["축하", "우정", "협력", "즐거움"] },
  { id: "cups_4", name: "Four of Cups", nameKo: "컵 4", type: "cups", keywords: ["무관심", "명상", "새로운 제안 무시", "휴식"] },
  { id: "cups_5", name: "Five of Cups", nameKo: "컵 5", type: "cups", keywords: ["상실", "슬픔", "후회", "비관"] },
  { id: "cups_6", name: "Six of Cups", nameKo: "컵 6", type: "cups", keywords: ["추억", "향수", "어린 시절", "순수함"] },
  { id: "cups_7", name: "Seven of Cups", nameKo: "컵 7", type: "cups", keywords: ["선택", "환상", "유혹", "혼란"] },
  { id: "cups_8", name: "Eight of Cups", nameKo: "컵 8", type: "cups", keywords: ["떠남", "포기", "내면의 여정", "이동"] },
  { id: "cups_9", name: "Nine of Cups", nameKo: "컵 9", type: "cups", keywords: ["소원 성취", "만족", "감사", "자부심"] },
  { id: "cups_10", name: "Ten of Cups", nameKo: "컵 10", type: "cups", keywords: ["행복", "가족", "평화", "감정적 성취"] },
  { id: "cups_11", name: "Page of Cups", nameKo: "컵 시종", type: "cups", keywords: ["메신저", "상상력", "동정심", "새로운 관계"] },
  { id: "cups_12", name: "Knight of Cups", nameKo: "컵 기사", type: "cups", keywords: ["로맨틱", "이상주의", "매력적인", "제안"] },
  { id: "cups_13", name: "Queen of Cups", nameKo: "컵 여왕", type: "cups", keywords: ["위로", "직관적", "공감", "감정의 깊이"] },
  { id: "cups_14", name: "King of Cups", nameKo: "컵 왕", type: "cups", keywords: ["관대함", "감정적 조절", "조언자", "외교력"] },

  // Swords
  { id: "swords_1", name: "Ace of Swords", nameKo: "검 에이스", type: "swords", keywords: ["진실", "결단력", "명확성", "승리"] },
  { id: "swords_2", name: "Two of Swords", nameKo: "검 2", type: "swords", keywords: ["무승부", "회피", "타협", "균형 유지"] },
  { id: "swords_3", name: "Three of Swords", nameKo: "검 3", type: "swords", keywords: ["슬픔", "상처", "이별", "고통스러운 진실"] },
  { id: "swords_4", name: "Four of Swords", nameKo: "검 4", type: "swords", keywords: ["휴식", "회복", "명상", "정지"] },
  { id: "swords_5", name: "Five of Swords", nameKo: "검 5", type: "swords", keywords: ["패배", "갈등", "이기심", "불명예"] },
  { id: "swords_6", name: "Six of Swords", nameKo: "검 6", type: "swords", keywords: ["전환", "치유", "이동", "문제 해결"] },
  { id: "swords_7", name: "Seven of Swords", nameKo: "검 7", type: "swords", keywords: ["기만", "은밀함", "전략", "속임수"] },
  { id: "swords_8", name: "Eight of Swords", nameKo: "검 8", type: "swords", keywords: ["구속", "제한", "피해 의식", "무력감"] },
  { id: "swords_9", name: "Nine of Swords", nameKo: "검 9", type: "swords", keywords: ["불안", "걱정", "악몽", "죄책감"] },
  { id: "swords_10", name: "Ten of Swords", nameKo: "검 10", type: "swords", keywords: ["파멸", "최악의 상황", "종말", "배신"] },
  { id: "swords_11", name: "Page of Swords", nameKo: "검 시종", type: "swords", keywords: ["경계", "호기심", "분석적", "새로운 정보"] },
  { id: "swords_12", name: "Knight of Swords", nameKo: "검 기사", type: "swords", keywords: ["돌진", "논리적", "행동파", "성급함"] },
  { id: "swords_13", name: "Queen of Swords", nameKo: "검 여왕", type: "swords", keywords: ["명확성", "독립성", "냉정함", "분석력"] },
  { id: "swords_14", name: "King of Swords", nameKo: "검 왕", type: "swords", keywords: ["권위", "진실", "이성", "공정함"] },

  // Pentacles
  { id: "pent_1", name: "Ace of Pentacles", nameKo: "펜타클 에이스", type: "pentacles", keywords: ["번영", "물질적 여유", "새로운 기반", "실질적 기회"] },
  { id: "pent_2", name: "Two of Pentacles", nameKo: "펜타클 2", type: "pentacles", keywords: ["적응력", "유연성", "균형 조절", "우선순위 관리"] },
  { id: "pent_3", name: "Three of Pentacles", nameKo: "펜타클 3", type: "pentacles", keywords: ["협력", "기술", "계획", "팀워크"] },
  { id: "pent_4", name: "Four of Pentacles", nameKo: "펜타클 4", type: "pentacles", keywords: ["집착", "통제", "안전 추구", "보수적"] },
  { id: "pent_5", name: "Five of Pentacles", nameKo: "펜타클 5", type: "pentacles", keywords: ["결핍", "가난", "고립", "고난"] },
  { id: "pent_6", name: "Six of Pentacles", nameKo: "펜타클 6", type: "pentacles", keywords: ["자비", "나눔", "관대함", "재정적 균형"] },
  { id: "pent_7", name: "Seven of Pentacles", nameKo: "펜타클 7", type: "pentacles", keywords: ["인내", "수확", "기다림", "장기적 투자"] },
  { id: "pent_8", name: "Eight of Pentacles", nameKo: "펜타클 8", type: "pentacles", keywords: ["장인정신", "노력", "디테일", "집중"] },
  { id: "pent_9", name: "Nine of Pentacles", nameKo: "펜타클 9", type: "pentacles", keywords: ["풍요", "독립", "사치", "성취의 감상"] },
  { id: "pent_10", name: "Ten of Pentacles", nameKo: "펜타클 10", type: "pentacles", keywords: ["가족", "부", "유산", "장기적 성공"] },
  { id: "pent_11", name: "Page of Pentacles", nameKo: "펜타클 시종", type: "pentacles", keywords: ["근면", "실용적", "목표 지향적", "새 프로젝트"] },
  { id: "pent_12", name: "Knight of Pentacles", nameKo: "펜타클 기사", type: "pentacles", keywords: ["신뢰성", "성실함", "인내", "보수적 발전"] },
  { id: "pent_13", name: "Queen of Pentacles", nameKo: "펜타클 여왕", type: "pentacles", keywords: ["육성", "풍요", "실제적인", "현실적 애정"] },
  { id: "pent_14", name: "King of Pentacles", nameKo: "펜타클 왕", type: "pentacles", keywords: ["성공", "주도성", "비즈니스", "안전망"] }
];

export const getTarotCardImageUrl = (card: TarotCard | null | undefined): string => {
  if (!card || !card.id) return "";
  
  let suitLetter = "";
  let numStr = "";
  
  if (card.id.startsWith("major_")) {
    suitLetter = "m";
    numStr = card.id.split("_")[1].padStart(2, '0');
  } else if (card.id.startsWith("wands_")) {
    suitLetter = "w";
    numStr = card.id.split("_")[1].padStart(2, '0');
  } else if (card.id.startsWith("cups_")) {
    suitLetter = "c";
    numStr = card.id.split("_")[1].padStart(2, '0');
  } else if (card.id.startsWith("swords_")) {
    suitLetter = "s";
    numStr = card.id.split("_")[1].padStart(2, '0');
  } else if (card.id.startsWith("pent_")) {
    suitLetter = "p";
    numStr = card.id.split("_")[1].padStart(2, '0');
  } else {
    return "";
  }
  
  return `https://raw.githubusercontent.com/metabismuth/tarot-json/master/cards/${suitLetter}${numStr}.jpg`;
};

