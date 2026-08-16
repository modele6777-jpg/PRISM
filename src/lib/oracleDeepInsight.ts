export function buildOracleDeepInsightUserMessage(appType: string): string {
  return `[System Command] This is a request for a deep spiritual oracle and psychological integration analysis customized for the '${appType}' universe app. Provide an intensive cosmic, numerological, and intuitive reading.`;
}

export function buildOracleDeepInsightSystemContext(dailyResult: any): string {
  if (!dailyResult) return "No prior oracle/transit daily result data is currently populated.";
  return `\n[Oracle Deep Insight Context - Daily Resonance Data]\n${JSON.stringify(dailyResult, null, 2)}\n`;
}

export interface OracleDeepInsightSendOpts {
  [key: string]: any;
}

