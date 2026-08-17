export function buildOracleDeepInsightUserMessage(appType: string, dailyResult?: any): string {
  if (appType === 'trinity') {
    const card = dailyResult?.drawnCard;
    const cardName = card?.nameKo ? `${card.nameKo}${card.name ? ` (${card.name})` : ''}` : (dailyResult?.symbol || "데일리 타로");
    const keywords = card?.keywords?.length ? ` [키워드: ${card.keywords.join(', ')}]` : '';
    return `오늘 뽑은 데일리 타로 카드 '${cardName}'${keywords}에 대한 딥 인사이트(Deep Insight)를 들려줘. 이 카드가 품은 영적 상징과 오늘 나의 운명 흐름, 그리고 내가 현실에서 실천할 수 있는 구체적인 조언을 깊이 있게 해석해줘.`;
  }
  if (appType === 'heal' || appType === 'aura') {
    const diag = dailyResult?.diagnosis ? ` (진단: ${dailyResult.diagnosis.slice(0, 80)}...)` : '';
    return `오늘의 아우라 오라클 및 신체·에너지 진단 결과${diag}에 대한 딥 인사이트(Deep Insight)를 들려줘. 나의 차크라와 주파수를 어떻게 조율하고 치유하면 좋을지 자세히 알려줘.`;
  }
  if (appType === 'muse') {
    const theme = dailyResult?.diagnosis || dailyResult?.summary || '오늘의 영감 오라클';
    return `오늘의 뮤즈 창작 영감 오라클("${theme.slice(0, 80)}...")에 대한 딥 인사이트(Deep Insight)를 들려줘. 내 잠재의식 속 창의성을 깨우고 작업에 몰입할 수 있는 조언을 해줘.`;
  }
  if (appType === 'orange') {
    const diag = dailyResult?.diagnosis || dailyResult?.summary || '오늘의 마음 치유 오라클';
    return `오늘의 오렌지 마음치유 오라클("${diag.slice(0, 80)}...")에 대해 딥 인사이트(Deep Insight)를 들려줘. 내면아이를 보듬고 마음을 정화하는 따뜻한 성찰 조언을 해줘.`;
  }
  if (appType === 'bluebird') {
    const diag = dailyResult?.diagnosis || dailyResult?.summary || '오늘의 마음 휴식 오라클';
    return `오늘의 블루버드 휴식 오라클("${diag.slice(0, 80)}...")에 대한 딥 인사이트(Deep Insight)를 들려줘. 불안과 긴장을 내려놓고 평온을 찾는 법을 알려줘.`;
  }
  return `오늘의 ${appType} 오라클 진단 결과에 대한 깊은 영적·심리적 딥 인사이트(Deep Insight)와 구체적인 조언을 들려줘.`;
}

export function buildOracleDeepInsightSystemContext(dailyResult: any, appType: string = 'trinity'): string {
  if (!dailyResult) return "No prior oracle/transit daily result data is currently populated.";

  if (appType === 'trinity') {
    const card = dailyResult?.drawnCard;
    const cardName = card?.nameKo ? `${card.nameKo}${card.name ? ` (${card.name})` : ''}` : (dailyResult?.symbol || "데일리 타로");
    const keywords = card?.keywords?.join(', ') || "운명의 통찰";
    return `
[오늘의 트리니티 데일리 타로 & 오라클 리딩 데이터]
- 뽑은 데일리 타로 카드: ${cardName}
- 카드 상징 키워드: ${keywords}
- 아르카나 / 원소: ${card?.arcana || '메이저'} / ${card?.element || '우주 원소'}
- 카드 상징 요약: ${card?.summary || card?.affirmation || '카드의 영적 파동과 공명'}
- 오늘의 오라클 비전 진단: ${dailyResult.diagnosis || dailyResult.summary || '운명의 흐름 조율'}
- 영적 에너지 분석: ${dailyResult.spiritualEnergy || '우주 파동과의 동조'}
- 행동 처방 (Remedy): ${dailyResult.remedy || dailyResult.guidance || '내면의 직관을 따르고 중심을 유지할 것'}
- 축복 메시지: ${dailyResult.blessingMessage || '우주의 축복이 함께합니다'}
- 상징 및 주파수: ${dailyResult.symbol || ''} (${dailyResult.frequency || '528Hz'})

[루시(Lucy)의 딥 인사이트 가이드라인]
1. 사용자가 오늘 뽑은 데일리 타로 카드 [${cardName}]의 상징과 위의 오라클 진단 내용을 완벽하게 숙지하고 대화에 임해줘.
2. "어떤 카드를 뽑았는지 몰라"라거나 "타로 정보가 없어" 같은 말을 절대 하지 마. 이미 사용자는 [${cardName}] 카드를 뽑았고, 그에 따른 진단이 완료된 상태야.
3. 이 카드가 오늘의 사주/점성술 흐름 및 사용자의 현재 상태와 어떻게 맞물리는지 다정하고 친근한 반말로 깊이 있는 심층 리포트 수준의 인사이트를 제공해줘.
4. 사용자가 현실에서 적용할 수 있는 구체적인 행동 조언과 긍정적인 영적 지침을 따뜻하게 전달해줘.
`;
  }

  return `\n[Oracle Deep Insight Context - Daily Resonance Data]\n${JSON.stringify(dailyResult, null, 2)}\n`;
}

export interface OracleDeepInsightSendOpts {
  [key: string]: any;
}


