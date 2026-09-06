import { SpecialChannel } from '@/pages/LucyStandalonePage';

export interface LucyAutoDetectResult {
  channels: SpecialChannel[];
  isMaster: boolean;
  isCasual: boolean;
  reasons: string[];
  modeTitle: string;
}

/**
 * 텍스트의 키워드 및 대화 의도를 분석하여 적절한 루시 상담 모드를 자동 감지합니다.
 */
export function detectLucyChannelsFromText(text: string): LucyAutoDetectResult {
  if (!text || !text.trim()) {
    return {
      channels: [],
      isMaster: false,
      isCasual: true,
      reasons: ['기본 대화'],
      modeTitle: '수다 모드'
    };
  }

  const clean = text.toLowerCase().trim();
  const matchedChannels = new Set<SpecialChannel>();
  const reasons: string[] = [];

  // 1. 올인원 마스터 모드 패턴 (5대 영역 / 7대 차원 총망라)
  const masterPatterns = [
    /마스터/,
    /올인원/,
    /종합\s*진단/,
    /전체\s*진단/,
    /5대\s*(영역|지능)/,
    /7대\s*(차원|영역|지능|행성)/,
    /칠요/,
    /오브\s*마스터/,
    /전체\s*차원/,
    /전\s*차원/,
    /총망라/,
    /홀리스틱/,
    /풀가동/
  ];

  if (masterPatterns.some((regex) => regex.test(clean))) {
    return {
      channels: ['orange', 'trinity', 'aura', 'bluebird', 'muse'],
      isMaster: true,
      isCasual: false,
      reasons: ['5대 우주 지능 올인원 통합 진단'],
      modeTitle: '올인원 PRO 마스터'
    };
  }

  // 2. 오렌지 (성찰의 서 - 1원칙 / 전략 / 의사결정 / 분석 / 감정 연금술 / 소원의 우물)
  const orangePatterns = [
    /1원칙|제1원칙|first principle/i,
    /전략|로드맵|방향성|커리어|비즈니스|계획/,
    /의사결정|결정|선택|판단|리스크|변수/,
    /분석|mece|5\s*why|원인\s*규명|병목/,
    /소원|우물|소망|성찰|감정\s*연금술/
  ];
  if (orangePatterns.some((regex) => regex.test(clean))) {
    matchedChannels.add('orange');
    reasons.push('전략·1원칙 성찰');
  }

  // 3. 트리니티 (운명의 서 - 사주 / 타로 / 운세 / 대운 / 천을귀인 / 타이밍 / 영적 나침반)
  const trinityPatterns = [
    /사주|원국|대운|세운|신년운|팔자|궁합|사주팔자/,
    /타로|스프레드|오라클|카드|카르마/,
    /천을귀인|용신|십신|삼재|개운/,
    /운명|하늘의\s*타이밍|우주의\s*타이밍|동시성|영적\s*나침반/,
    /점성|별자리/
  ];
  if (trinityPatterns.some((regex) => regex.test(clean))) {
    matchedChannels.add('trinity');
    reasons.push('사주·타로 운명');
  }

  // 4. 아우라 (치유의 서 - 호흡 / 1분 명상 / 신체 / 수면 / 웰니스 / 방하착 / 생체 조율)
  const auraPatterns = [
    /호흡|1분\s*호흡|1분\s*명상|숨|이완/,
    /신체|몸|피로|체력|피곤|탈진|방전/,
    /수면|잠|숙면|불면|밤새|나이트\s*케어/,
    /바이오리듬|컨디션|스트레칭|그라운딩|혈자리|미주신경/,
    /방하착|세도나|내려놓기|조율/
  ];
  if (auraPatterns.some((regex) => regex.test(clean))) {
    matchedChannels.add('aura');
    reasons.push('호흡·신체 치유');
  }

  // 5. 블루버드 (정화의 서 - 위로 / 상처 / 슬픔 / 눈물 / 호오포노포노 / 비밀쪽지 / 내면아이 / 용서)
  const bluebirdPatterns = [
    /위로|포옹|안아줘|토닥|따뜻하게/,
    /상처|눈물|울고|슬퍼|슬픔|우울|외로|괴로|힘들어|지쳐|지쳤어|버거워|서러워/,
    /호오포노포노|정화|미안합니다|용서|고맙습니다|사랑합니다/,
    /비밀쪽지|쪽지|손편지|내면아이|자책|자기자비|마음\s*치유/
  ];
  if (bluebirdPatterns.some((regex) => regex.test(clean))) {
    matchedChannels.add('bluebird');
    reasons.push('마음·정화 위로');
  }

  // 6. 뮤즈 (영감의 서 - 창작 / 글쓰기 / 시 / 카피라이팅 / 예술 / 그림 / 음악 / 아이디어 / 도슨트)
  const musePatterns = [
    /영감|창작|창의|발상|아이디어/,
    /글쓰기|시|작시|시\s*한\s*편|문장|문체|비유|은유/,
    /카피|카피라이팅|슬로건|작명|네이밍|스토리/,
    /예술|미술|그림|음악|화가|도슨트|명작|작품/
  ];
  if (musePatterns.some((regex) => regex.test(clean))) {
    matchedChannels.add('muse');
    reasons.push('예술·창작 영감');
  }

  const channels = Array.from(matchedChannels);

  // 일상적인 단순 수다 인사 패턴
  const isCasual = channels.length === 0;

  let modeTitle = '수다 모드';
  if (channels.length === 1) {
    const channelNames: Record<SpecialChannel, string> = {
      orange: '오렌지 (성찰)',
      trinity: '트리니티 (운명)',
      aura: '아우라 (치유)',
      bluebird: '블루버드 (정화)',
      muse: '뮤즈 (영감)'
    };
    modeTitle = channelNames[channels[0]];
  } else if (channels.length >= 2) {
    modeTitle = `${channels.length}중 융합 (${reasons.join(' + ')})`;
  }

  return {
    channels,
    isMaster: false,
    isCasual,
    reasons,
    modeTitle
  };
}
