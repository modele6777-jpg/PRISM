// ==========================================================
// TRINITY Utility Functions - Tarot, Saju, Astro calculations
// Ported directly from TRINITY repo
// ==========================================================

import { calculateDetailedSaju } from '@/lib/sajuAnalysis';
import type { UserProfile } from '@/lib/sharedState';

// ✨ Constants
export const HS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const EB = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const DM: Record<string, string> = {
  '甲':'갑목(甲木) – 큰 나무, 강인한 리더십',
  '乙':'을목(乙木) – 덩굴, 유연한 생명력',
  '丙':'병화(丙火) – 태양, 밝고 열정적인 에너지',
  '丁':'정화(丁火) – 촛불, 집중력과 예술적 감각',
  '戊':'무토(戊土) – 큰 산, 믿음직한 포용력',
  '己':'기토(己土) – 정원의 흙, 성실함과 배려력',
  '庚':'경금(庚金) – 강인한 쇠, 결단력과 원칙주의',
  '辛':'신금(辛金) – 보석, 예민하고 섬세한 완벽주의',
  '壬':'임수(壬水) – 큰 강, 지혜와 자유로운 흐름',
  '癸':'계수(癸水) – 빗물, 직관력과 깊은 감수성',
};
export const EL: Record<string, string> = {
  '甲':'목','乙':'목','丙':'화','丁':'화','戊':'토','己':'토','庚':'금','辛':'금','壬':'수','癸':'수',
  '子':'수','丑':'토','寅':'목','卯':'목','辰':'토','巳':'화','午':'화','未':'토','申':'금','酉':'금','戌':'토','亥':'수'
};
export const SIGNS = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
export const SEMOJI: Record<string, string> = {'양자리':'♈','황소자리':'♉','쌍둥이자리':'♊','게자리':'♋','사자자리':'♌','처녀자리':'♍','천칭자리':'♎','전갈자리':'♏','사수자리':'♐','염소자리':'♑','물병자리':'♒','물고기자리':'♓'};
export const CITIES: Record<string, [number, number, number]> = {
  '서울':[37.57,126.98,9],'부산':[35.18,129.08,9],'도쿄':[35.68,139.65,9],
  '뉴욕':[40.71,-74.01,-5],'런던':[51.51,-0.13,0],'파리':[48.86,2.35,1]
};
export const TKRMAP: Record<string, string> = {
  "The Fool":"바보","The Magician":"마법사","The High Priestess":"여사제","The Empress":"여황제",
  "The Emperor":"황제","The Hierophant":"교황","The Lovers":"연인","The Chariot":"전차",
  "Strength":"힘","The Hermit":"은둔자","Wheel of Fortune":"운명의 수레바퀴","Justice":"정의",
  "The Hanged Man":"매달린 남자","Death":"죽음","Temperance":"절제","The Devil":"악마",
  "The Tower":"탑","The Star":"별","The Moon":"달","The Sun":"태양","Judgement":"심판","The World":"세계"
};
export const T78: string[] = [
  "The Fool","The Magician","The High Priestess","The Empress","The Emperor","The Hierophant",
  "The Lovers","The Chariot","Strength","The Hermit","Wheel of Fortune","Justice",
  "The Hanged Man","Death","Temperance","The Devil","The Tower","The Star","The Moon",
  "The Sun","Judgement","The World",
  ...["Wands","Cups","Swords","Pentacles"].flatMap(s =>
    ["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"]
      .map(n => `${n} of ${s}`)
  )
];

export const VISION_DECKS = [
  { id:'CAT', name:'고양이 타로', emoji:'🐱', desc:'고양이의 직관으로 읽는 심리와 관계', detail:'고양이의 영험한 감각으로 인간관계의 미묘한 심리를 읽어냅니다.', best:'인간관계, 심리, 직관', examples:['지금 내 마음 상태는?','그 사람은 나를 어떻게 생각할까?','오늘 나에게 필요한 것'] },
  { id:'ANTIQUE', name:'앤티크 타로', emoji:'🏺', desc:'고전의 지혜로 중대한 결정을 돕는 덱', detail:'수백 년의 지혜가 담긴 고전 상징으로 삶의 중요한 갈림길을 안내합니다.', best:'중대한 결정, 장기적 전망', examples:['이직을 해야 할까요?','지금 이 관계를 유지해야 할까요?','올해 나의 핵심 과제는?'] },
  { id:'VISCONTI', name:'비스콘티 타로', emoji:'👑', desc:'황금빛 성공과 풍요를 위한 프리미엄 덱', detail:'르네상스의 귀족적 황금빛 에너지로 성공, 부, 명예의 길을 찾아냅니다.', best:'성공, 금전, 명예', examples:['투자 운은 어떨까?','금전운이 들어오는 시기','커리어의 다음 단계는?'] },
];

export const LUCKY_EXAMPLES = [
  "오늘 면접 잘 볼 수 있을까?", "인간관계 스트레스 해결책", "지금 이 투자해도 될까?", "시부야의 평화로운 오후", "단식의 시작에서 자유로워지기"
];
export const VISION_EXAMPLES = [
  "오늘 면접 결과는?", "우리의 만남은 우연일까?", "이직하는 게 좋을까?", "금전운이 들어오는 시기", "지금 나에게 필요한 조언"
];

// ✨ Tarot
export function tkr(n: string): string {
  return TKRMAP[n] || n.replace("Ace", "에이스").replace(" of Wands", "(지팡이)").replace(" of Cups", "(컵)").replace(" of Swords", "(소드)").replace(" of Pentacles", "(펜타클)");
}
export function drawCards(n: number = 3, exclude: string[] = []) {
  return [...T78].filter(c => !exclude.includes(c)).sort(() => Math.random() - .5).slice(0, n).map(name => ({ name, kr: tkr(name), rev: Math.random() > .6 }));
}

// ✨ Saju
export function calcSaju(y: number, m: number, d: number, h: number, gender: string): string {
  const yi = (y - 4) % 60;
  const yp = { gan: HS[yi % 10], zhi: EB[yi % 12] };
  const mgi = ([2,4,6,8,0][Math.floor(((y-4)%60)%10/2)] * 2 + (m-1)) % 10;
  const mp = { gan: HS[mgi], zhi: EB[(m+1)%12] };
  const a = Math.floor((14-m)/12), yr = y-a, mo = m+12*a-2;
  const jd = d + Math.floor((153*mo+2)/5) + 365*yr + Math.floor(yr/4) - Math.floor(yr/100) + Math.floor(yr/400) - 32045;
  const di = (jd+49) % 60;
  const dp = { gan: HS[di%10], zhi: EB[di%12] };
  const hp = h >= 0 ? { gan: HS[(HS.indexOf(dp.gan)*2 + Math.floor((h+1)/2))%12%10], zhi: EB[Math.floor((h+1)/2)%12] } : null;
  const ec: Record<string, number> = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  [yp, mp, dp, hp].forEach(p => {
    if (p) {
      if (EL[p.gan]) {
        const el = EL[p.gan];
        if (el === '목') ec['木']++;
        else if (el === '화') ec['火']++;
        else if (el === '토') ec['土']++;
        else if (el === '금') ec['金']++;
        else if (el === '수') ec['水']++;
      }
      if (EL[p.zhi]) {
         const el = EL[p.zhi];
         if (el === '목') ec['木']++;
         else if (el === '화') ec['火']++;
         else if (el === '토') ec['土']++;
         else if (el === '금') ec['金']++;
         else if (el === '수') ec['水']++;
      }
    }
  });
  const sorted = Object.entries(ec).sort((a, b) => b[1] - a[1]);
  const isYang = HS.indexOf(yp.gan) % 2 === 0;
  const isFwd = (isYang && gender === '남성') || (!isYang && gender === '여성');
  const mgi2 = HS.indexOf(mp.gan), mzi = EB.indexOf(mp.zhi);
  const now = new Date().getFullYear();
  const daeuns = Array.from({length:8}, (_,i) => i+1).map(i => ({
    ganZhi: HS[((mgi2+(isFwd?i:-i))%10+10)%10] + EB[((mzi+(isFwd?i:-i))%12+12)%12],
    startAge: i*10-9, startYear: y+i*10-9,
  }));
  const curD = daeuns.find(d => d.startYear <= now && d.startYear+10 > now);
  const nextD = daeuns.find(d => d.startYear > now);
  const elNames: Record<string, string> = { '木':'목(나무)', '火':'화(불)', '土':'토(땅)', '金':'금(쇠)', '水':'수(물)' };
  const koreanAge = now - y + 1;
  return `[사주] 년:${yp.gan+yp.zhi} 월:${mp.gan+mp.zhi} 일:${dp.gan+dp.zhi}${hp?' 시:'+hp.gan+hp.zhi:''}
[일간] ${DM[dp.gan]||dp.gan} (현재 ${koreanAge}세)
[오행] 강함:${elNames[sorted[0][0]]}(${sorted[0][1]}개) 부족:${elNames[sorted[sorted.length-1][0]]}(${sorted[sorted.length-1][1]}개)
[대운] 현재:${curD?curD.ganZhi+'운 ('+curD.startAge+'세~'+(curD.startAge+9)+'세)':''} ${nextD?' → 다음:'+nextD.ganZhi+'운 ('+nextD.startAge+'세~)':''}`;
}

// ✨ Astro
function toSign(d: number): string { const n = ((d%360)+360)%360; return SIGNS[Math.floor(n/30)]; }
function toJD(y: number, m: number, d: number, h: number): number {
  const a = Math.floor((14-m)/12), yr = y+4800-a, mo = m+12*a-3;
  return d + Math.floor((153*mo+2)/5) + 365*yr + Math.floor(yr/4) - Math.floor(yr/100) + Math.floor(yr/400) - 32045 - 0.5 + h/24;
}
function sunL(jd: number): number {
  const T = (jd-2451545)/36525, L0 = 280.46646+36000.76983*T, M = (357.52911+35999.05029*T)*Math.PI/180;
  const C = (1.914602-0.004817*T)*Math.sin(M)+(0.019993-0.000101*T)*Math.sin(2*M);
  return ((L0+C)%360+360)%360;
}
function planL(jd: number, p: string): number {
  const T = (jd-2451545)/36525;
  const ps: Record<string,[number,number]> = { moon:[218.3165,481267.88], mercury:[252.25,149472.67], venus:[181.98,58517.82], mars:[355.43,19140.30], jupiter:[34.35,3034.91], saturn:[50.08,1222.11] };
  if (!ps[p]) return 0;
  return ((ps[p][0]+ps[p][1]*T)%360+360)%360;
}
export function calcAstro(y: number, m: number, d: number, h: number, city: string = '서울'): string {
  const [, lon, tz] = Object.entries(CITIES).find(([k]) => (city||'서울').includes(k))?.[1] || CITIES['서울'];
  const jd = toJD(y, m, d, Math.max(0, h >= 0 ? h-tz : 1));
  const fmt = (s: string) => `${SEMOJI[s]||''}${s}`;
  const now = new Date(); const jdN = toJD(now.getFullYear(), now.getMonth()+1, now.getDate(), 12);
  return `☀️태양:${fmt(toSign(sunL(jd)))} 🌙달:${fmt(toSign(planL(jd,'moon')))} ↗️상승:${h>=0?fmt(toSign(((280.46+360.985*(jd-2451545))%360+lon)%360)):'(시각필요)'}
♂️화성:${fmt(toSign(planL(jd,'mars')))} ♀️금성:${fmt(toSign(planL(jd,'venus')))} ♃목성:${fmt(toSign(planL(jd,'jupiter')))} ♄토성:${fmt(toSign(planL(jd,'saturn')))}
[트랜짓] 목성:${fmt(toSign(planL(jdN,'jupiter')))} 토성:${fmt(toSign(planL(jdN,'saturn')))}`;
}
export function parseAstro(astro: string) {
  const get = (re: RegExp) => astro.match(re)?.[1] || '';
  return {
    sun: get(/☀️태양:([\S]+)/), moon: get(/🌙달:([\S]+)/),
    asc: astro.includes('시각필요') ? '(시각 미입력)' : get(/↗️상승:([\S]+)/),
    mars: get(/♂️화성:([\S]+)/), venus: get(/♀️금성:([\S]+)/),
    jupiter: get(/♃목성:([\S]+)/), saturn: get(/♄토성:([\S]+)/),
    raw: astro
  };
}

export type TarotConcernKind = 'binary_choice' | 'yes_no' | 'open';

export type TarotConcernTheme =
  | 'binary_choice'
  | 'yes_no'
  | 'daily'
  | 'new_year'
  | 'saju'
  | 'fortune_boost'
  | 'love'
  | 'career'
  | 'money'
  | 'timing'
  | 'obstacle'
  | 'general';

export type TarotSpreadRecommendation = {
  id: string;
  name: string;
  cardCount: number;
  reason: string;
  positions: string[];
  theme: TarotConcernTheme;
};

export type TarotConcernAnalysis = {
  kind: TarotConcernKind;
  theme: TarotConcernTheme;
  optionA?: string;
  optionB?: string;
  spread: TarotSpreadRecommendation;
};

export function isDailyTarotConcern(text: string): boolean {
  const t = text.trim().replace(/\s+/g, ' ');
  return /(?:오늘의?\s*타로|오늘의?\s*운세|오늘의?\s*카드|오늘\s*타로|오늘\s*운세|데일리\s*타로|데일리\s*오라클|일일\s*타로|daily\s*tarot|daily\s*oracle|^오늘$|^daily$)/i.test(t);
}

function cleanTarotOption(raw: string): string {
  return raw
    .replace(/^[「『"'\s]+/, '')
    .replace(/[」』"'\s]+$/, '')
    .replace(/[?？!！.。,，:：]+$/g, '')
    .trim();
}

function hasMeaningfulOptions(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  if (a.length < 2 || b.length < 2) return false;
  if (a.length > 48 || b.length > 48) return false;
  return true;
}

function detectTarotTheme(
  text: string,
  kind: TarotConcernKind,
): Exclude<TarotConcernTheme, 'binary_choice' | 'yes_no'> {
  if (isDailyTarotConcern(text)) {
    return 'daily';
  }
  if (/(?:운\s*좋아지는|운이\s*좋아지는|운\s*올리|운을\s*올리|개운|행운\s*부르는|행운\s*끌어당김|대길|운세\s*좋아지는|복\s*부르는|기운\s*바꾸|운\s*트이|운의\s*흐름\s*바꾸|행운\s*타로|개운\s*타로|운세\s*상승|재수\s*좋|행운\s*극대화|기적\s*끌어당김)/.test(text)) {
    return 'fortune_boost';
  }
  if (/(?:신년|새해|올해\s*운세|올해\s*운|연간\s*운세|202[4-9]년|올해\s*한\s*해|한\s*해\s*운세|상반기|하반기|1년\s*흐름|신년\s*계획|신년\s*대운)/.test(text)) {
    return 'new_year';
  }
  if (/(?:사주|사주팔자|선천\s*운|명리|오행|사주\s*기운|타고난\s*운|내\s*운명|팔자|대운|세운|용신|사주\s*타로|년주|월주|일주|시주)/.test(text)) {
    return 'saju';
  }
  if (/(?:사랑|연애|썸|고백|헤어|이별|재회|남친|여친|남자친구|여자친구|짝사랑|결혼|인연|상대|그\s*사람|애인|배우자)/.test(text)) {
    return 'love';
  }
  if (/(?:이직|퇴사|취업|진로|승진|사업|창업|직장|회사|커리어|면접|프로젝트|팀장|부장)/.test(text)) {
    return 'career';
  }
  if (/(?:돈|재물|금전|투자|수입|빚|로또|재정|월급|적자|흑자|대출)/.test(text)) {
    return 'money';
  }
  if (/(?:언제|시기|타이밍|때가|며칠|몇\s*월|몇\s*주|기간|곧|얼마나\s*걸릴)/.test(text)) {
    return 'timing';
  }
  if (/(?:막힌|장애|왜\s*안|해결|돌파|극복|막혀|정체|꼬여|안\s*풀리)/.test(text)) {
    return 'obstacle';
  }
  if (kind === 'yes_no') return 'obstacle';
  return 'general';
}

function buildSpreadForTheme(
  theme: TarotConcernTheme,
  analysis: Pick<TarotConcernAnalysis, 'kind' | 'optionA' | 'optionB'>,
): TarotSpreadRecommendation {
  const optionA = analysis.optionA || 'A';
  const optionB = analysis.optionB || 'B';

  const spreads: Record<TarotConcernTheme, TarotSpreadRecommendation> = {
    daily: {
      id: 'daily_oracle_single',
      name: '오늘의 타로 (원카드 오라클)',
      cardCount: 1,
      reason: '78장의 천상 타로 휠에서 오늘 당신의 하루와 우주적 파동을 대변하는 단 1장의 카드를 뽑습니다.',
      positions: ['오늘의 우주 기운과 계시'],
      theme: 'daily',
    },
    fortune_boost: {
      id: 'fortune_awakening',
      name: '운이 좋아지는 4대 개운 배열',
      cardCount: 4,
      reason: '침체된 운의 탁기를 걷어내고, 잠재된 대길(大吉) 행운의 문을 활짝 열어 즉각적인 기적과 번영을 끌어당기는 개운 특화 4단 배열입니다.',
      positions: [
        '1. 현재 막힌 탁기 & 운의 정체 지점 (탁기 정화)',
        '2. 잠재된 대길 행운의 문 & 숨은 기회 (행운의 문)',
        '3. 지금 즉시 실행할 1일 1실천 개운 행동 (개운 비법)',
        '4. 최종적으로 열릴 번영과 기적의 결실 (대길 결실)',
      ],
      theme: 'fortune_boost',
    },
    new_year: {
      id: 'new_year_wheel',
      name: '신년 4계절 대운 배열',
      cardCount: 5,
      reason: '새해 한 해의 사계절(분기별) 흐름과 주요 기회, 그리고 1년 전체를 관통하는 대운의 핵심 조언을 읽는 신년 특화 배열입니다.',
      positions: [
        '1분기(봄/시작과 기회)',
        '2분기(여름/성장과 도전)',
        '3분기(가을/결실과 수확)',
        '4분기(겨울/정리와 안정)',
        '올해의 핵심 조언 및 대운',
      ],
      theme: 'new_year',
    },
    saju: {
      id: 'saju_four_pillars',
      name: '사주 4주 융합 배열',
      cardCount: 4,
      reason: '사주명리의 4기둥(년·월·일·시) 구조에 타로 상징을 투영하여, 선천적 기운과 사회적 성취, 본질적 정체성, 미래 결실을 종합 해독하는 명리 융합 배열입니다.',
      positions: [
        '년주(근본과 조상 기운)',
        '월주(사회적 환경과 직업 성취)',
        '일주(본인 정체성과 내면)',
        '시주(미래 흐름과 최종 결실)',
      ],
      theme: 'saju',
    },
    binary_choice: {
      id: 'binary_fork',
      name: '양자택일 배열',
      cardCount: 4,
      reason: '두 선택지의 결과를 나란히 비교해 한쪽을 명확히 가리키기 위한 배열입니다.',
      positions: ['현재 상황', `${optionA} 선택 시`, `${optionB} 선택 시`, '최종 조언'],
      theme: 'binary_choice',
    },
    yes_no: {
      id: 'yes_no_gate',
      name: '예·아니오 결정 배열',
      cardCount: 3,
      reason: '지금 실행해도 되는지, 무엇이 변수인지, 최종 판정을 빠르게 확인하는 배열입니다.',
      positions: ['현재 에너지', '숨은 변수', '최종 판정'],
      theme: 'yes_no',
    },
    love: {
      id: 'love_mirror',
      name: '관계 거울 배열',
      cardCount: 5,
      reason: '두 사람의 마음과 관계의 현실, 장애물을 입체적으로 읽는 배열입니다.',
      positions: ['나의 마음', '상대의 마음', '관계 현실', '장애물', '관계 조언'],
      theme: 'love',
    },
    career: {
      id: 'career_ladder',
      name: '성공의 계단 배열',
      cardCount: 5,
      reason: '목표 달성을 위한 현재 위치, 단계, 장애물, 조력을 단계별로 보는 배열입니다.',
      positions: ['현재 위치', '첫 번째 단계', '장애물', '조력자/자원', '최종 성취'],
      theme: 'career',
    },
    money: {
      id: 'wealth_flow',
      name: '재물 흐름 배열',
      cardCount: 4,
      reason: '돈의 흐름, 막힘, 기회, 실천 조언을 재정 고민에 맞춰 읽는 배열입니다.',
      positions: ['현재 재정 상태', '돈이 막히는 지점', '들어올 기회', '실천 조언'],
      theme: 'money',
    },
    timing: {
      id: 'time_gate',
      name: '시기 점검 배열',
      cardCount: 3,
      reason: '과거 영향, 현재 타이밍, 예상 시기를 짚어 언제 움직일지 보는 배열입니다.',
      positions: ['과거 영향', '현재 타이밍', '예상 시기/결과'],
      theme: 'timing',
    },
    obstacle: {
      id: 'block_breaker',
      name: '장애물 돌파 배열',
      cardCount: 3,
      reason: '상황, 핵심 장애물, 돌파 방법을 집중적으로 보는 배열입니다.',
      positions: ['현재 상황', '핵심 장애물', '돌파 조언'],
      theme: 'obstacle',
    },
    general: {
      id: 'past_present_future',
      name: '3카드 시간 배열',
      cardCount: 3,
      reason: '고민의 원인, 현재, 앞으로의 흐름을 가장 명확하게 보여주는 기본 배열입니다.',
      positions: ['과거/원인', '현재/상황', '미래/결과'],
      theme: 'general',
    },
  };

  return spreads[theme];
}

/** 퀵 프리셋용 인기 타로 배열법 목록 */
export const POPULAR_TAROT_SPREAD_PRESETS = [
  {
    theme: 'fortune_boost' as const,
    name: '🍀 운이 좋아지는 4대 개운 배열',
    cardCount: 4,
    desc: '탁기 정화 & 대길 행운의 문을 여는 실천 개운 처방',
    defaultPrompt: '오늘 내 운을 최고조로 끌어올리고 막힌 기운을 뚫는 개운 비법을 알려줘',
  },
  {
    theme: 'daily' as const,
    name: '🌟 오늘의 타로 (원카드)',
    cardCount: 1,
    desc: '오늘 하루의 우주적 기운과 일일 오라클 계시',
    defaultPrompt: '오늘의 타로',
  },
  {
    theme: 'saju' as const,
    name: '🔮 사주 4주 융합 배열',
    cardCount: 4,
    desc: '사주 4기둥(년·월·일·시)에 타로를 투영한 종합 운명 해독',
    defaultPrompt: '나의 사주 4기둥과 타고난 운명의 흐름을 타로로 해독해줘',
  },
  {
    theme: 'new_year' as const,
    name: '🌸 신년 4계절 대운 배열',
    cardCount: 5,
    desc: '한 해의 사계절 분기별 흐름과 대운의 핵심 조언',
    defaultPrompt: '올해 4계절 분기별 운의 흐름과 대운의 조언을 알려줘',
  },
  {
    theme: 'binary_choice' as const,
    name: '⚖️ 양자택일 비교 배열',
    cardCount: 4,
    desc: 'A와 B 선택지 결과를 나란히 비교해 한쪽을 명확히 판정',
    defaultPrompt: 'A를 선택할까 vs B를 선택할까?',
  },
];

export const CELTIC_CROSS_SPREAD: TarotSpreadRecommendation = {
  id: 'celtic_cross',
  name: '셀틱 크로스 (심층 10장 배열)',
  cardCount: 10,
  reason: '복합적·심층 고민의 전체 맥락과 무의식, 외부 요인을 10장으로 입체 분석하는 정통 고급 배열입니다.',
  positions: [
    '현재 상황', '도전/장애', '무의식 기반', '과거 영향', '최근 영향',
    '가까운 미래', '본인 태도', '외부 영향', '희망/두려움', '최종 결과',
  ],
  theme: 'general',
};

/** 전체 타로 배열법 목록 반환 */
export function getAllTarotSpreads(optionA = 'A', optionB = 'B'): TarotSpreadRecommendation[] {
  const allThemes: TarotConcernTheme[] = [
    'fortune_boost',
    'daily',
    'saju',
    'new_year',
    'binary_choice',
    'love',
    'career',
    'money',
    'timing',
    'obstacle',
    'yes_no',
    'general',
  ];

  const list = allThemes.map((theme) => buildSpreadForTheme(theme, { kind: 'open', optionA, optionB }));
  list.push(CELTIC_CROSS_SPREAD);
  return list;
}

function shouldUseCelticCross(
  text: string,
  theme: TarotConcernTheme,
  kind: TarotConcernKind,
): boolean {
  if (kind !== 'open' || theme !== 'general') return false;
  return (
    text.length >= 45 ||
    /(?:종합|심층|전체|깊이|셀틱|상세|자세히|복합|다각도)/.test(text)
  );
}

/** 고민 문장을 분석해 주제·배열법을 함께 반환 */
export function recommendTarotSpread(concern: string): TarotSpreadRecommendation {
  return analyzeTarotConcern(concern).spread;
}

/** 타로 고민 자동 분석 (주제 + 배열법 포함) */
export function analyzeTarotConcern(concern: string): TarotConcernAnalysis {
  const text = concern.trim().replace(/\s+/g, ' ');
  if (!text) {
    const spread = buildSpreadForTheme('general', { kind: 'open' });
    return { kind: 'open', theme: 'general', spread };
  }

  if (isDailyTarotConcern(text)) {
    const spread = buildSpreadForTheme('daily', { kind: 'open' });
    return { kind: 'open', theme: 'daily', spread };
  }

  let kind: TarotConcernKind = 'open';
  let optionA: string | undefined;
  let optionB: string | undefined;

  const vsMatch = text.match(/^(.{2,48}?)\s*(?:vs\.?|VS|대)\s*(.{2,48}?)$/i);
  if (vsMatch) {
    const a = cleanTarotOption(vsMatch[1]);
    const b = cleanTarotOption(vsMatch[2]);
    if (hasMeaningfulOptions(a, b)) {
      kind = 'binary_choice';
      optionA = a;
      optionB = b;
    }
  }

  if (kind === 'open') {
    const betweenMatch = text.match(/(.{2,40}?)\s*(?:와|과)\s*(.{2,40}?)\s*(?:중|사이|둘\s*중)/);
    if (betweenMatch) {
      const a = cleanTarotOption(betweenMatch[1]);
      const b = cleanTarotOption(betweenMatch[2]);
      if (hasMeaningfulOptions(a, b)) {
        kind = 'binary_choice';
        optionA = a;
        optionB = b;
      }
    }
  }

  if (kind === 'open') {
    const orMatch = text.match(
      /(.{2,40}?)\s*(?:\/|,|또는|아니면|or)\s*(.{2,40}?)(?:\s*(?:중|사이|둘|어느|선택|고민|할까|해야|갈까|될까)|[?？]|$)/i,
    );
    if (orMatch) {
      const a = cleanTarotOption(orMatch[1]);
      const b = cleanTarotOption(orMatch[2]);
      if (hasMeaningfulOptions(a, b)) {
        kind = 'binary_choice';
        optionA = a;
        optionB = b;
      }
    }
  }

  if (kind === 'open') {
    const doubleKkaMatch = text.match(/(.+?할까요?)\s*(?:,|\.|\/|아니면|vs|또는)\s*(.+?할까요?)/);
    if (doubleKkaMatch) {
      const a = cleanTarotOption(doubleKkaMatch[1]);
      const b = cleanTarotOption(doubleKkaMatch[2]);
      if (hasMeaningfulOptions(a, b)) {
        kind = 'binary_choice';
        optionA = a;
        optionB = b;
      }
    }
  }

  if (kind === 'open') {
    const twinKkaMatch = text.match(/(.+?할까요?)\s+(.+?할까요?)\s*[?？]?$/);
    if (twinKkaMatch) {
      const a = cleanTarotOption(twinKkaMatch[1]);
      const b = cleanTarotOption(twinKkaMatch[2]);
      if (hasMeaningfulOptions(a, b)) {
        kind = 'binary_choice';
        optionA = a;
        optionB = b;
      }
    }
  }

  if (kind === 'open') {
    const naulMatch = text.match(/(.+?나을까요?)\s*(?:,|\.|\/|아니면|vs|또는)\s*(.+?나을까요?)/);
    if (naulMatch) {
      const a = cleanTarotOption(naulMatch[1]);
      const b = cleanTarotOption(naulMatch[2]);
      if (hasMeaningfulOptions(a, b)) {
        kind = 'binary_choice';
        optionA = a;
        optionB = b;
      }
    }
  }

  if (kind === 'open') {
    const pickMatch = text.match(/(.{2,24}?)\s*(?:쪽|안|편)\s*(?:이|가)\s*나을까요?\s*(.+?)(?:[?？]|$)/);
    if (pickMatch) {
      const a = cleanTarotOption(pickMatch[1]);
      const b = cleanTarotOption(pickMatch[2]);
      if (hasMeaningfulOptions(a, b)) {
        kind = 'binary_choice';
        optionA = a;
        optionB = b;
      }
    }
  }

  if (kind === 'open' && /(?:둘\s*중|양자택일|어느\s*쪽|선택지\s*중)/.test(text) && /[?？]/.test(text)) {
    kind = 'binary_choice';
  }

  if (
    kind === 'open' &&
    /(?:할까\s*말까|해야\s*할까|하지\s*말까|가야\s*할까|갈까\s*말까|받아들일까|포기할까|계속할까|시작할까|그만둘까|이직할까|헤어질까|사귈까|고백할까|살까|바꿀까|될까\s*말까)/.test(
      text,
    )
  ) {
    kind = 'yes_no';
  }

  const theme: TarotConcernTheme =
    kind === 'binary_choice' ? 'binary_choice' : kind === 'yes_no' ? 'yes_no' : detectTarotTheme(text, kind);
  let spread = buildSpreadForTheme(theme, { kind, optionA, optionB });
  if (theme !== 'daily' && shouldUseCelticCross(text, theme, kind)) {
    spread = CELTIC_CROSS_SPREAD;
  }

  return { kind, theme, optionA, optionB, spread };
}

type TarotCardContext = {
  nameKo?: string;
  name?: string;
  keywords?: string[];
  reversed?: boolean;
};

/** 사주·천문·프로필·오늘의 지배 카드·뽑힌 카드 키워드를 리딩 프롬프트에 주입 */
export function buildTarotContextPromptAddon(opts: {
  profile?: UserProfile | null;
  sajuData?: string;
  astroData?: string;
  cards?: TarotCardContext[];
  dailyCard?: (TarotCardContext & { diagnosis?: string; summary?: string }) | null;
}): string {
  const blocks: string[] = [];

  // 1. 프로필 & 사주명리 정밀 배경지식 주입
  const profile = opts.profile;
  const basic = profile?.basic;
  const saju = profile ? calculateDetailedSaju(profile) : null;

  if (basic?.name || basic?.birthdate || saju || opts.sajuData?.trim()) {
    const profileLines: string[] = [];
    if (basic?.name || basic?.nickname) {
      profileLines.push(`· 질문자: ${basic.name || basic.nickname}${basic.nickname && basic.name && basic.nickname !== basic.name ? ` (닉네임: ${basic.nickname})` : ''}`);
    }
    if (basic?.birthdate) {
      profileLines.push(`· 생년월일: ${basic.birthdate} (${basic.lunarSolar === 'lunar' ? '음력' : '양력'})${basic.birthtime ? ` ${basic.birthtime}` : ''}${basic.birthCity ? ` / 출생지: ${basic.birthCity}` : ''}`);
    }
    if (basic?.gender) {
      profileLines.push(`· 성별: ${basic.gender === 'male' ? '남성' : (basic.gender === 'female' ? '여성' : '기타')}`);
    }
    if (profile?.psych?.mbti) {
      profileLines.push(`· MBTI/기질: ${profile.psych.mbti}`);
    }
    if (profile?.fate?.lifeGoal) {
      profileLines.push(`· 인생 핵심 목표: ${profile.fate.lifeGoal}`);
    }
    if (profile?.fate?.currentWorry) {
      profileLines.push(`· 최근 주요 고민: ${profile.fate.currentWorry}`);
    }

    if (saju) {
      profileLines.push(`· 사주 일간(Day Master) 본원: ${saju.dayMaster.hanja}(${saju.dayMaster.korean}) — ${saju.dayMaster.symbolName} [${saju.dayMaster.archetypeTitle}]`);
      profileLines.push(`· 사주 4기둥: 년주(${saju.pillars.year.full}) · 월주(${saju.pillars.month.full}) · 일주(${saju.pillars.day.full})${saju.pillars.hour ? ` · 시주(${saju.pillars.hour.full})` : ''}`);
      profileLines.push(`· 오행 에너지 밸런스: 최강 오행(${saju.elements.dominant.name} - ${saju.elements.percentages[saju.elements.dominant.element]}%) / 결핍 및 용신 오행(${saju.elements.lacking.name} - ${saju.elements.percentages[saju.elements.lacking.element]}%)`);
      profileLines.push(`· 2026 병오년(丙午年) 세운 테마: ${saju.annual2026.theme}`);
    } else if (opts.sajuData?.trim()) {
      profileLines.push(`· 사주 요약: ${opts.sajuData.trim()}`);
    }

    blocks.push(
      `[👤 질문자 프로필 & 사주 명리학 배경지식 (Personal Identity & Saju Context)]\n` +
      profileLines.join('\n') +
      `\n[프로필 & 사주 배경지식 융합 필수 지침]\n` +
      `1. 질문자의 이름/호칭과 생년월일, 성향, 그리고 타고난 사주 본원(${saju ? saju.dayMaster.symbolName : '기운'})과 오행 균형을 타로 리딩의 깊은 내면 배경지식(Context)으로 삼으십시오.\n` +
      `2. 단순히 프로필을 읊는 데 그치지 않고, 뽑힌 카드가 질문자의 타고난 기운(${saju ? `${saju.dayMaster.symbolName}, ${saju.elements.lacking.name} 보완` : '기질'})과 어떻게 공명하고 상호작용하는지 1단계(상황 진단)부터 5단계(행동 계획), 6단계(결단)까지 질문자 한 사람만을 위한 맞춤형 조언으로 자연스럽게 녹여내십시오.`
    );
  }

  if (opts.astroData?.trim()) {
    blocks.push(`[천문 컨텍스트]\n${opts.astroData.trim()}`);
  }
  if (opts.dailyCard) {
    const dCard = opts.dailyCard;
    const dLabel = dCard.nameKo || dCard.name || '오늘의 카드';
    const dOrient = dCard.reversed ? '역방향' : '정방향';
    const dKw = dCard.keywords?.length ? dCard.keywords.join(', ') : '';
    const dDiag = dCard.diagnosis || dCard.summary || '';
    blocks.push(
      `[🌟 오늘의 지배 오라클 카드 (Daily Cosmic Anchor)]\n` +
      `· 카드: ${dLabel} (${dOrient})${dKw ? ` — 핵심 키워드: ${dKw}` : ''}\n` +
      `${dDiag ? `· 오늘 하루의 운명적 기조: ${dDiag.slice(0, 140)}...\n` : ''}` +
      `[오늘의 지배 카드 연계 필수 지침]\n` +
      `질문자의 이번 고민은 오늘 하루를 관통하는 [${dLabel}]의 에너지 장(Field) 안에서 전개되고 있습니다. 1단계(상황 진단), 4단계(카드 해독), 5단계(행동 계획), 6단계(결단)에서 오늘의 지배 카드의 기운이 이번 고민에 미치는 영향과 인과적 연결고리를 자연스럽고 깊이 있게 융합하여 서술하십시오.`
    );
  }
  if (opts.cards?.length) {
    const lines = opts.cards
      .map((card, i) => {
        const label = card.nameKo || card.name || `카드 ${i + 1}`;
        const orient = card.reversed ? '역방향' : '정방향';
        const kw = card.keywords?.length ? card.keywords.join(', ') : '';
        return `· ${label} (${orient})${kw ? ` — 키워드: ${kw}` : ''}`;
      })
      .join('\n');
    blocks.push(
      `[카드 키워드·방향 참고]\n${lines}\n역방향 카드는 키워드의 지연·내면·그림자 의미로 해석하십시오.`,
    );
  }
  if (!blocks.length) return '';
  return `

${blocks.join('\n\n')}

[개인화 규칙]
질문자의 프로필, 사주명리 본원, 오늘의 지배 카드, 뽑힌 카드의 키워드를 질문 맥락에 맞게 유기적으로 융합하여 서술하십시오.`;
}

export function formatVisionTarotResult(
  result: { cards?: Array<{ name: string; position?: string }>; guidance?: string; vibe?: string },
  concern: string,
  deckName?: string,
): string {
  const cardLines =
    result.cards?.map((c) => `· **${c.name}** (${c.position || '정방향'})`).join('\n') ||
    '· (카드 인식 정보 없음)';
  return `### 🔮 비전 포털 리딩${deckName ? ` · ${deckName}` : ''}
**고민:** "${concern}"

**인식된 카드:**
${cardLines}

**해석:**
${result.guidance || '가이던스를 수신하지 못했습니다. 잠시 후 다시 시도해 주세요.'}

${result.vibe ? `**에너지 분위기:** ${result.vibe}` : ''}`;
}

/** 리딩 프롬프트에 붙이는 배열법 지침 */
export function buildTarotSpreadPromptAddon(
  spread: TarotSpreadRecommendation,
  cards?: TarotCardContext[],
): string {
  const cardLines = cards?.length
    ? cards
        .map(
          (card, i) => {
            const orient = card.reversed ? ' [역방향]' : '';
            const kw = card.keywords?.length ? ` (${card.keywords.slice(0, 3).join(', ')})` : '';
            return `· ${spread.positions[i] || `${i + 1}번`}: **${card.nameKo || card.name || `카드 ${i + 1}`}**${orient}${kw}`;
          },
        )
        .join('\n')
    : spread.positions.map((pos, i) => `· ${i + 1}번(${pos})`).join('\n');

  const fortuneBoostDirective =
    spread.id === 'fortune_awakening' || spread.theme === 'fortune_boost'
      ? `\n\n[🍀 '운이 좋아지는 타로' 특별 개운(開運) 마스터 리딩 지침]\n1. 이 배열은 단순한 점단이 아닌, 내담자의 막힌 기운을 뚫고 운을 극대화하는 신비로운 개운 처방전입니다.\n2. 1번(탁기 정화)에서는 내담자의 마음과 일상에서 당장 비워내야 할 무거운 에너지를 다정하면서도 꿰뚫어 보듯 짚어주십시오.\n3. 2번(행운의 문)에서는 오늘부터 활짝 열리는 대길 행운의 기회를 환한 빛의 언어로 축복해 주십시오.\n4. 3번(개운 비법)에서는 오늘 당장 실천할 수 있는 1~3분 초구체적 일상 루틴(색상, 말 한마디, 행동, 공간 정돈 등) 1가지를 명확히 처방하십시오.\n5. 4번(대길 결실)에서는 이 실천을 통해 내담자에게 펼쳐질 최고의 번영과 기적의 미래를 확신에 찬 어조로 선포하십시오.`
      : '';

  return `

[🎴 적용 배열법: ${spread.name}]
- 배열의 영적 목적: ${spread.reason}
- 카드 수: ${spread.cardCount}장
- 위치별 상징 의미:
${cardLines}

[마스터 리딩 필수 규칙]
1. 각 카드는 해당 위치의 의미(${spread.positions.join(' → ')})에 맞추어, 실제 타로 상담실에서 1:1로 카드를 짚어가며 들려주듯 생생한 대화체로 풀이하십시오.
2. 딱딱한 나열식이 아니라, 카드들의 상징과 위치가 서로 말을 건네며 엮이는 하나의 생생한 운명 스토리로 해독하십시오.${fortuneBoostDirective}`;
}

/** 양자택일/결정형 질문일 때 타로 시스템 프롬프트에 붙이는 추가 지침 */
export function buildTarotBinaryChoicePromptAddon(analysis: TarotConcernAnalysis): string {
  if (analysis.kind === 'open') return '';

  if (analysis.kind === 'binary_choice') {
    const options =
      analysis.optionA && analysis.optionB
        ? `- 선택지 A: **${analysis.optionA}**\n- 선택지 B: **${analysis.optionB}**`
        : '- 질문에 드러난 두 갈래 선택지(문맥에서 A/B를 명확히 구분)';

    return `

[⚖️ 양자택일 질문 상담 지침]
내담자는 두 선택지 사이에서 깊은 갈등을 겪고 있습니다.
${options}

[양자택일 마스터 결단 규칙]
1. '3. 트리니티 마스터의 직관적 결단 & 방향성' 섹션에서 **최종 선택: [A 또는 B 중 정확히 하나의 이름]**을 굵게 선언하십시오.
2. 애매하게 양다리를 걸치거나 회피하지 말고, 카드가 가리키는 쪽을 마스터의 확신 있는 어조로 단호하게 추천하십시오.
3. 선택하지 않은 쪽이 왜 지금 시기에 불리한지 카드의 상징적 근거와 함께 명쾌하게 설명해 주십시오.`;
  }

  return `

[✅ 예/아니오 결정 질문 상담 지침]
내담자는 실행 여부(~할까/말까)에 대해 명쾌한 결단을 원하고 있습니다.

[결정 마스터 규칙]
1. '3. 트리니티 마스터의 직관적 결단 & 방향성' 섹션 첫 줄에 **최종 판정: [확실한 YES / 결단이 필요한 YES / 단호한 NO / 신중한 타이밍 조율]** 중 하나를 굵게 선언하십시오.
2. 막연히 '때를 기다리라'는 식의 무책임한 회피를 금하며, 질문에 대한 카드의 목소리를 명확하게 들려주십시오.`;
}

export function isTarotStreamFailure(response: string | null | undefined): boolean {
  if (!response) return true;
  const lower = response.toLowerCase();
  return (
    lower.includes("error") ||
    lower.includes("failed") ||
    lower.includes("connection and call error") ||
    lower.includes("invalid api key") ||
    lower.trim().length < 10
  );
}

function pickBinaryChoiceSide(
  analysis: TarotConcernAnalysis,
  concern: string,
  cards: Array<{ id?: string; nameKo?: string; name?: string }>,
): { chosen: string; rejected: string } | null {
  if (analysis.kind !== 'binary_choice' || !analysis.optionA || !analysis.optionB) {
    return null;
  }

  const seed = `${concern}:${cards.map((c) => c.id || c.nameKo || c.name).join('|')}`;
  const pickA = seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 2 === 0;
  return pickA
    ? { chosen: analysis.optionA, rejected: analysis.optionB }
    : { chosen: analysis.optionB, rejected: analysis.optionA };
}

function localKeywordHint(card: TarotCardContext): string {
  const kws = card.keywords || [];
  if (!kws.length) return '';
  if (card.reversed) {
    return `역방향 — ${kws.slice(0, 2).join(', ')}의 내면적 갈등 및 속도 조절 신호`;
  }
  return `정방향 — ${kws.slice(0, 3).join(', ')}`;
}

export function buildLocalTarotReading(concern: string, cards: any[], photoMode?: boolean): string {
  if (!Array.isArray(cards) || cards.length === 0) {
    return "펼쳐진 카드가 없어 리딩을 시작할 수 없습니다. 마음을 가다듬고 다시 한 번 카드를 뽑아주세요.";
  }

  const analysis = analyzeTarotConcern(concern);
  const { spread } = analysis;
  const leadCard = cards[0];
  const leadName = leadCard?.nameKo || leadCard?.kr || '첫 번째 카드';
  const binaryPick = pickBinaryChoiceSide(analysis, concern, cards);

  const cardStories = cards
    .map((c, i) => {
      const pos = spread.positions[i] || `${i + 1}번 자리`;
      const name = c?.nameKo || c?.kr || `카드 ${i + 1}`;
      const orient = c?.reversed ? ' (역방향)' : '';
      const hint = localKeywordHint(c);
      return `· **${pos} — [${name}${orient}]**\n  ${hint ? `_${hint}_\n  ` : ''}이 카드는 당신이 마주한 상황에서 중요한 전환점을 암시하며, 조급함을 내려놓고 진실된 내면의 소리에 귀 기울이라고 속삭입니다.`;
    })
    .join('\n\n');

  let decisionText = '';
  if (analysis.kind === 'binary_choice' && binaryPick) {
    decisionText = `### 🔮 3. 트리니티 마스터의 직관적 결단 & 방향성\n**최종 선택: [${binaryPick.chosen}]**\n\n카드의 에너지 흐름은 명확하게 **${binaryPick.chosen}** 쪽을 비추고 있습니다. 지금 **${binaryPick.rejected}** 쪽은 에너지가 분산되고 정체될 우려가 크니, 확신을 갖고 **${binaryPick.chosen}**을 선택하여 나아가세요.`;
  } else if (analysis.kind === 'yes_no') {
    decisionText = `### 🔮 3. 트리니티 마스터의 직관적 결단 & 방향성\n**최종 판정: [결단이 필요한 YES]**\n\n카드는 당신에게 긍정의 문을 열어두고 있습니다. 주저하거나 스스로를 의심하지 말고, 차분히 준비해 온 마음을 믿고 한 걸음 내딛으셔도 좋습니다.`;
  } else {
    decisionText = `### 🔮 3. 트리니티 마스터의 직관적 결단 & 방향성\n**마스터의 핵심 선언: [도약과 확신의 타이밍]**\n\n지금 당신을 둘러싼 흐름은 정체를 지나 변화의 물꼬를 트고 있습니다. 두려움에 머무르지 말고 직관을 믿고 나아가세요.`;
  }

  return `### 🕯️ 1. 카드가 비추는 당신의 마음과 현재 에너지
어서 오세요. 카드를 조용히 마주하니, 당신께서 가슴속에 품고 계신 **"${concern}"**에 대한 깊은 고민과 복잡한 마음결이 그대로 느껴집니다.

현재 당신의 에너지는 중요한 갈림길 위에 서 있으며, 가장 먼저 모습을 드러낸 **[${leadName}]** 카드는 당신이 더 이상 혼자서 불안해하지 않아도 된다는 다정한 위로와 함께 변화의 신호를 건네고 있습니다.

### 🎴 2. 펼쳐진 카드들이 들려주는 이야기
_${spread.name} (${spread.cardCount}장 배열)_

${cardStories}

${decisionText}

### 🌿 4. 운의 흐름을 바꿀 마스터의 실천 처방
- **마음의 정돈**: 오늘 하루만큼은 타인의 시선이나 과거의 후회에 얽매이지 말고, 당신 자신의 직관에 집중해 보세요.
- **실천 한 걸음**: 가슴속으로만 맴돌던 생각을 밖으로 꺼내어 작은 실천(메모, 가벼운 대화, 정리 정돈)으로 연결해 보세요. 작은 파동이 큰 대운을 불러옵니다.

### ✨ 5. 당신의 길을 축복하는 영혼의 한마디
_"카드는 정해진 운명을 가두는 틀이 아니라, 당신 안의 빛을 깨우는 거울입니다. 당신은 이미 답을 알고 있으며, 길은 당신이 딛는 발걸음마다 환하게 열릴 것입니다."_${photoMode ? '\n\n*(비전 포털 — 인식된 카드의 신비로운 에너지가 함께 투영되었습니다)*' : ''}`;
}

