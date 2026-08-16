// ==========================================================
// TRINITY Utility Functions - Tarot, Saju, Astro calculations
// Ported directly from TRINITY repo
// ==========================================================

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

const CELTIC_CROSS_SPREAD: TarotSpreadRecommendation = {
  id: 'celtic_cross',
  name: '셀틱 크로스',
  cardCount: 10,
  reason: '복합적·심층 고민의 전체 맥락을 10장으로 입체 분석하는 고급 배열입니다.',
  positions: [
    '현재 상황', '도전/장애', '무의식 기반', '과거 영향', '최근 영향',
    '가까운 미래', '본인 태도', '외부 영향', '희망/두려움', '최종 결과',
  ],
  theme: 'general',
};

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
  if (shouldUseCelticCross(text, theme, kind)) {
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

/** 사주·천문·카드 키워드를 리딩 프롬프트에 주입 */
export function buildTarotContextPromptAddon(opts: {
  sajuData?: string;
  astroData?: string;
  cards?: TarotCardContext[];
}): string {
  const blocks: string[] = [];
  if (opts.sajuData?.trim()) {
    blocks.push(`[사주 컨텍스트]\n${opts.sajuData.trim()}`);
  }
  if (opts.astroData?.trim()) {
    blocks.push(`[천문 컨텍스트]\n${opts.astroData.trim()}`);
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
사주·천문·카드 키워드를 질문 맥락에 맞게 자연스럽게 융합하되, 단순 나열은 금지합니다. 리딩 결론에 반영하십시오.`;
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

  return `

[🎴 자동 적용 배열법: ${spread.name}]
- 추천 이유: ${spread.reason}
- 카드 수: ${spread.cardCount}장
- 위치 의미:
${cardLines}

[배열 해석 필수 규칙]
1. 각 카드는 반드시 해당 위치 의미(${spread.positions.join(' → ')})에 맞춰 해석하십시오.
2. 4단계(카드 해독)에서 카드마다 "위치명 + 카드명 + 핵심 팩트" 형식으로 서술하십시오.
3. 배열법의 목적(${spread.name})에 맞지 않는 일반론·뜬구름 해석은 금지합니다.`;
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

[⚖️ 양자택일 질문 자동 감지 — 최우선 적용]
질문자는 두 선택지 중 **반드시 한쪽**을 골라달라고 요청했습니다.
${options}

[양자택일 필수 규칙 — 위반 시 답변 실패]
1. 2단계(직관적 결론 판정)에서 YES/NO 형식을 쓰지 말고, 아래 형식만 사용하십시오.
2. 2단계 첫 줄에 반드시 선언: **최종 선택: [A 또는 B 중 정확히 하나의 이름/행동]**
3. "우회 및 보류", "상황을 더 지켜보세요", "둘 다 나쁘지 않다", "어느 쪽도 가능", "정답은 없다" 등 **회피·중립 답변 절대 금지**.
4. 선택하지 않은 쪽이 왜 불리한지 카드 근거와 함께 1~2문장으로 명시하십시오.
5. 3단계 성공 지수는 **선택한 쪽**을 실행했을 때의 실현 지수로 제시하십시오.`;
  }

  return `

[✅ 예/아니오 결정 질문 자동 감지 — 최우선 적용]
질문은 "~할까 / 말까" 형태의 이분법적 결정을 요구합니다.

[필수 규칙]
1. "우회 및 보류" 단독 선언 금지. **확실한 YES**, **조건부 YES**(조건 1줄 명시), **절대 NO** 중 하나만 선택.
2. 2단계 첫 줄: **최종 판정: [확실한 YES / 조건부 YES / 절대 NO]** 를 굵게 선언.
3. 막연한 "때를 기다리세요"만으로 끝내지 말고, 질문에 대한 행동 방향을 한 문장으로 못 박으십시오.`;
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
    return `역방향 — ${kws.slice(0, 2).join(', ')}의 지연·내면·주의 신호`;
  }
  return `정방향 — ${kws.slice(0, 3).join(', ')}`;
}

export function buildLocalTarotReading(concern: string, cards: any[], photoMode?: boolean): string {
  if (!Array.isArray(cards) || cards.length === 0) {
    return "뽑힌 카드가 없어서 타로 리딩을 진행할 수 없습니다. 다시 시도해 주세요.";
  }

  const analysis = analyzeTarotConcern(concern);
  const { spread } = analysis;
  const cardLabel = (c: any, i: number) => {
    const ko = c?.nameKo || c?.kr || `카드 ${i + 1}`;
    const en = c?.name || '';
    const pos = spread.positions[i] || `${i + 1}번`;
    const orient = c?.reversed ? ' ↺역' : '';
    const hint = localKeywordHint(c);
    return `**${pos}** — ${ko}${orient}${en ? ` (${en})` : ''}${hint ? ` · ${hint}` : ''}`;
  };

  const cardListStr = cards.map((c, i) => cardLabel(c, i)).join('\n');
  const perCardAnalysis = cards
    .map((c, i) => {
      const pos = spread.positions[i] || `${i + 1}번`;
      const name = c?.nameKo || c?.kr || `카드 ${i + 1}`;
      const hint = localKeywordHint(c);
      return `- **${pos} · ${name}**: ${hint || '질문 맥락에 맞춰 행동 타이밍을 조율하세요.'}`;
    })
    .join('\n');
  const leadCard = cards[0];
  const leadName = leadCard?.nameKo || leadCard?.kr || '첫 번째 카드';
  const binaryPick = pickBinaryChoiceSide(analysis, concern, cards);

  const decisionBlock =
    analysis.kind === 'binary_choice' && binaryPick
      ? `### 🔮 2단계: 직관적 결론 판정
**최종 선택: ${binaryPick.chosen}**

카드 흐름은 **${binaryPick.chosen}** 쪽으로 기울어 있습니다. **${binaryPick.rejected}** 는 지금 타이밍에 에너지 소모와 후회 가능성이 더 큽니다.

### 📊 3단계: 성공 지수
- **${binaryPick.chosen}** 실행 시 실현 지수: **68%**
- **${binaryPick.rejected}** 유지/선택 시 실현 지수: **32%**`
      : analysis.kind === 'yes_no'
        ? `### 🔮 2단계: 직관적 결론 판정
**최종 판정: 조건부 YES**

지금 바로 실행하기보다 72시간 안에 준비를 마친 뒤 움직이면 성공 확률이 올라갑니다. 무작정 미루는 것은 NO에 가깝습니다.

### 📊 3단계: 성공 지수
- 실행 시 실현 지수: **62%**
- 보류·회피 시 실현 지수: **28%**`
        : '';

  return `### 🔮 트리니티 로컬 타로 리딩 리포트
**고민 내용:** "${concern}"
**적용 배열법:** ${spread.name} (${spread.cardCount}장)
_${spread.reason}_

**선택한 카드:**
${cardListStr}

${decisionBlock ? `${decisionBlock}\n\n` : ''}**타로 리딩 분석:**
1. **핵심 진단:**
   - **${leadName}**${leadCard?.reversed ? ' (역방향)' : ''} 카드는 "${concern}"에 대해 망설임을 줄이고 한쪽으로 못 박을 시기임을 보여줍니다.

### 🎴 위치별 카드 해독
${perCardAnalysis}

**실천 처방:**
- 24시간 내: 선택한 방향의 첫 한 걸음(메시지 1통, 일정 1개 확정, 지원 1건 등)을 실행하세요.
- 72시간 내: 결과를 보고 유지·수정 여부를 재판단하세요.${photoMode ? '\n\n(사진 리딩 모드 — 카드 이미지 기반 보조 해석)' : ''}`;
}

