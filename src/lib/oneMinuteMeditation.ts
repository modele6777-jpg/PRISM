import { z } from 'zod';
import { invokeLLMStructured } from '@/lib/ai';
import { auth, db, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, setDoc } from '@/lib/firebase';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { getTodayDateKey } from '@/lib/dailyCache';

export interface MeditationTheme {
  id: 'stress_relief' | 'mind_reset' | 'self_compassion' | 'energy_boost' | 'deep_sleep';
  nameKo: string;
  nameEn: string;
  emoji: string;
  frequency: number;
  freqLabel: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  gradient: string;
  description: string;
  breathingPattern: {
    inhale: number;
    hold: number;
    exhale: number;
    cycles: number; // typically 4-5 cycles in 60s
  };
  affirmation: string;
  guideSteps: string[];
}

export const MEDITATION_THEMES: MeditationTheme[] = [
  {
    id: 'stress_relief',
    nameKo: '스트레스 해소 & 전신 이완',
    nameEn: 'Stress Relief & Full Relaxation',
    emoji: '🌿',
    frequency: 432,
    freqLabel: '432Hz 자연 치유 주파수',
    color: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
    borderColor: 'border-emerald-500/30',
    gradient: 'from-emerald-900/40 via-teal-900/30 to-zinc-950/20',
    description: '굳은 어깨와 목, 긴장된 교감신경을 부드럽게 이완시키고 전신의 혈류를 안정시킵니다.',
    breathingPattern: { inhale: 4, hold: 2, exhale: 6, cycles: 5 },
    affirmation: '내 안의 모든 긴장이 숨과 함께 부드럽게 흘러나갑니다.',
    guideSteps: [
      '어깨를 가볍게 털어내고 턱과 미간의 힘을 부드럽게 뺍니다.',
      '코로 맑은 생기를 깊이 들이마시며 흉곽을 넓힙니다 (4초).',
      '잠시 고요 속에 머물며 가슴 속 평온을 느낍니다 (2초).',
      '입으로 가늘고 길게 숨을 내쉬며 하루의 무게를 비웁니다 (6초).'
    ]
  },
  {
    id: 'mind_reset',
    nameKo: '마인드 리셋 & 잡념 비우기',
    nameEn: 'Mind Reset & Thought Release',
    emoji: '🌊',
    frequency: 528,
    freqLabel: '528Hz 변형 & 기적의 주파수',
    color: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
    borderColor: 'border-cyan-500/30',
    gradient: 'from-cyan-900/40 via-blue-900/30 to-zinc-950/20',
    description: '과열된 뇌파를 식히고 꼬리를 물던 생각들을 강물에 띄우듯 맑게 정화합니다.',
    breathingPattern: { inhale: 4, hold: 4, exhale: 4, cycles: 5 }, // Box breathing
    affirmation: '나는 지나가는 생각들이 아니라, 이를 바라보는 맑은 하늘입니다.',
    guideSteps: [
      '눈을 감고 머릿속 스크린에 떠오르는 잔상들을 한 걸음 떨어져 관찰합니다.',
      '신선한 공기가 뇌 깊숙한 곳까지 닿도록 숨을 들이쉽니다 (4초).',
      '생각이 멈춘 순수한 틈새의 고요 속에 머뭅니다 (4초).',
      '남은 잡념과 어지러운 정보들을 남김없이 불어냅니다 (4초).'
    ]
  },
  {
    id: 'self_compassion',
    nameKo: '자기 자비 & 자존감 회복',
    nameEn: 'Self-Compassion & Heart Healing',
    emoji: '💖',
    frequency: 639,
    freqLabel: '639Hz 심장 차크라 & 연결 주파수',
    color: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-500/30',
    borderColor: 'border-rose-500/30',
    gradient: 'from-rose-900/40 via-pink-900/30 to-zinc-950/20',
    description: '자책감과 완벽주의를 내려놓고, 수고한 내면의 나에게 따스한 온기와 지지를 건넵니다.',
    breathingPattern: { inhale: 4, hold: 2, exhale: 6, cycles: 5 },
    affirmation: '지금 모습 그대로의 나를 따뜻하게 긍정하고 사랑합니다.',
    guideSteps: [
      '한 손을 가슴 중앙 심장 부위에 포근히 얹고 체온을 느낍니다.',
      '다정한 분홍빛 사랑의 에너지를 심장으로 들이마십니다 (4초).',
      '가슴이 은은한 온기로 가득 차오르는 것을 느낍니다 (2초).',
      '나를 짓누르던 자책과 비교의 시선을 따뜻하게 날려보냅니다 (6초).'
    ]
  },
  {
    id: 'energy_boost',
    nameKo: '생체 에너지 & 맑은 집중',
    nameEn: 'Pranic Energy & Clear Focus',
    emoji: '✨',
    frequency: 741,
    freqLabel: '741Hz 직관 & 에너지 각성 주파수',
    color: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-900/40 via-orange-900/30 to-emerald-950/20',
    description: '흐트러진 오라 파장을 정렬하고 단전에서부터 맑고 생생한 프라나 활력을 채웁니다.',
    breathingPattern: { inhale: 4, hold: 4, exhale: 4, cycles: 5 },
    affirmation: '나의 온몸 구석구석에 맑고 생생한 생명력이 가득 차오릅니다.',
    guideSteps: [
      '척추를 곧게 펴고 정수리가 하늘로 가볍게 뻗어 오르는 감각을 엽니다.',
      '황금빛 활력 에너지가 아랫배 단전까지 채워지도록 호흡합니다 (4초).',
      '온몸의 세포가 빛으로 충전되는 에너지를 간직합니다 (4초).',
      '탁한 기운을 밖으로 시원하게 배출하며 집중력을 회복합니다 (4초).'
    ]
  },
  {
    id: 'deep_sleep',
    nameKo: '수면 유도 & 깊은 쉼',
    nameEn: 'Deep Sleep & Peaceful Surrender',
    emoji: '🌙',
    frequency: 396,
    freqLabel: '396Hz 무의식 안정 & 방하착 주파수',
    color: 'text-indigo-300',
    badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30',
    borderColor: 'border-indigo-500/30',
    gradient: 'from-indigo-900/40 via-purple-900/30 to-zinc-950/20',
    description: '오늘 하루의 모든 수고와 생각의 스위치를 끄고, 밤의 평온한 심연으로 방하착합니다.',
    breathingPattern: { inhale: 4, hold: 4, exhale: 7, cycles: 4 },
    affirmation: '오늘 하루는 온전히 충분했습니다. 이제 편안히 쉽니다.',
    guideSteps: [
      '누운 자세나 편안한 등받이에 기대어 눈꺼풀을 무겁게 내려놓습니다.',
      '어스름한 밤하늘의 고요함을 흉곽 가득 들이마십니다 (4초).',
      '숨을 멈추고 온몸의 근육이 침대로 스며들듯 무게를 놓습니다 (4초).',
      '모든 생각의 끈을 풀고 깊은 안식 속으로 완전히 내쉽니다 (7초).'
    ]
  }
];

export type MeditationThemeId = MeditationTheme['id'];

export interface OneMinuteMeditationRecord {
  id: string;
  themeId: MeditationThemeId;
  themeTitle: string;
  completedAt: number;
  dateKey: string;
  durationSeconds: number;
  frequency: number;
  affirmation: string;
  note?: string;
  userCondition?: string;
  aiPrescribedGuide?: string;
}

export const OneMinuteMeditationSchema = z.object({
  recommendedThemeId: z.enum(['stress_relief', 'mind_reset', 'self_compassion', 'energy_boost', 'deep_sleep']).describe("사용자의 고민/상태를 분석하여 가장 최적의 치유 효과를 내는 명상 테마 ID (stress_relief: 긴장/불안/압박, mind_reset: 잡념/머리과부하, self_compassion: 자책/우울/위로, energy_boost: 무기력/피로/집중, deep_sleep: 수면/불면/밤)"),
  themeRecommendationReason: z.string().describe("AI가 이 테마를 추천한 핵심 심리/에너지 분석 이유 (1문장)"),
  meditationTitle: z.string().describe("1분 명상의 핵심 맞춤 제목 (예: '숨결로 채우는 60초 긴장 이완', '과부하된 뇌를 식히는 60초 마인드 리셋')"),
  themeSummary: z.string().describe("오늘 사용자 상태에 맞춘 1분 명상 핵심 치유 포인트 (1~2문장)"),
  emoji: z.string().describe("명상을 상징하는 이모지 (예: 🌿, 🌊, 💖, ✨, 🌙)"),
  frequencySuggestion: z.string().describe("추천 주파수 및 이유 (예: '528Hz — 복잡한 마음을 즉각 정화하고 뇌파를 안정시킵니다')"),
  mindfulBreathingTip: z.string().describe("호흡 중 마음에 새길 60초 집중 포인트 (1문장)"),
  guidedVoiceScript: z.string().describe("60초 동안 음성 또는 마음속으로 낭독할 차분하고 다정한 명상 스크립트 (약 120~180자)"),
  completionAffirmation: z.string().describe("명상 종료 후 스스로에게 선물할 따뜻한 확언 문장 (1문장)"),
});

export type OneMinuteMeditationPrescription = z.infer<typeof OneMinuteMeditationSchema>;

/**
 * Instant heuristic classifier that diagnoses concern text to find the most resonant meditation theme
 */
export function inferThemeFromConcern(concern: string): { themeId: MeditationThemeId; reason: string } {
  const text = concern.toLowerCase();
  if (/잠|수면|불면|밤|야간|피곤해서\s*자|자고\s*싶|악몽|뒤척|새벽/.test(text)) {
    return {
      themeId: 'deep_sleep',
      reason: '수면 유도 및 생각의 스위치를 끄는 396Hz 방하착 테마가 적합합니다.',
    };
  }
  if (/자책|자존감|우울|비교|외로|상처|속상|눈물|죄책|미안|자신감|위로|따뜻/.test(text)) {
    return {
      themeId: 'self_compassion',
      reason: '내면을 따뜻하게 감싸 안는 639Hz 심장 차크라 자기 자비 테마가 적합합니다.',
    };
  }
  if (/무기력|피로|멍|졸려|나태|지침|에너지|활력|의욕|집중|아침|기운/.test(text)) {
    return {
      themeId: 'energy_boost',
      reason: '단전의 생체 에너지를 깨우는 741Hz 프라나 집중 테마가 적합합니다.',
    };
  }
  if (/잡념|머리|복잡|생각|뇌|과부하|정리|번아웃|과열|쉴\s*새|멍때/.test(text)) {
    return {
      themeId: 'mind_reset',
      reason: '과열된 뇌파를 식히고 잡념을 맑게 비워내는 528Hz 마인드 리셋 테마가 적합합니다.',
    };
  }
  return {
    themeId: 'stress_relief',
    reason: '굳은 긴장과 교감신경을 부드럽게 이완시키는 432Hz 자연 치유 테마가 적합합니다.',
  };
}

/**
 * Web Audio Solfeggio Tone synthesizer for 1-minute meditation
 */
class MeditationSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscNode: OscillatorNode | null = null;
  private isRunning: boolean = false;

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTone(freq: number) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      this.stopTone();

      const osc = this.ctx.createOscillator();
      const toneGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Smooth fade-in
      toneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      toneGain.gain.exponentialRampToValueAtTime(0.08, this.ctx.currentTime + 1.2);

      osc.connect(toneGain);
      toneGain.connect(this.masterGain);

      osc.start();
      this.oscNode = osc;
      this.isRunning = true;
    } catch (e) {
      console.warn('[MeditationSound] Tone error:', e);
    }
  }

  public stopTone() {
    if (this.oscNode) {
      try {
        this.oscNode.stop();
        this.oscNode.disconnect();
      } catch (_) {}
      this.oscNode = null;
    }
    this.isRunning = false;
  }

  public playSingingBowlBell() {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      // Singing bowl harmonic chime (fundamental + overtone)
      const now = this.ctx.currentTime;
      const baseFreq = 432;
      const overtoneFreq = baseFreq * 2.76;

      [baseFreq, overtoneFreq].forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        const volume = idx === 0 ? 0.22 : 0.1;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx === 0 ? 4.5 : 3.0));

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 5.0);
      });
    } catch (e) {
      console.warn('[MeditationSound] Bell error:', e);
    }
  }
}

export const meditationSound = new MeditationSoundEngine();

/**
 * Generate AI-enhanced 1-minute personalized meditation guide with automatic theme diagnosis
 */
export async function generatePersonalizedMeditationGuide(
  uid: string,
  preferredThemeId?: MeditationThemeId | 'ai_auto',
  userCondition?: string
): Promise<OneMinuteMeditationPrescription> {
  const isAutoMode = !preferredThemeId || preferredThemeId === 'ai_auto';
  const inferred = userCondition
    ? inferThemeFromConcern(userCondition)
    : { themeId: (isAutoMode ? 'stress_relief' : preferredThemeId) as MeditationThemeId, reason: '기본 이완 테마' };

  const effectiveThemeId: MeditationThemeId = (!isAutoMode && preferredThemeId)
    ? preferredThemeId
    : inferred.themeId;

  const theme = MEDITATION_THEMES.find(t => t.id === effectiveThemeId) || MEDITATION_THEMES[0];

  const prompt = isAutoMode
    ? `
당신은 AURA의 마인드풀니스 웰니스 코치이자 명상 가이드입니다.
사용자를 위해 60초(1분) 동안 온전히 집중하고 심신을 치유할 수 있는 '1분 명상 가이드'를 설계해 주세요.

[모드: AI 추천 테마 자동 분석 모드]
- 사용자 상태 / 고민: "${userCondition || '일상적인 피로와 긴장 완화'}"
- 초기 분석 테마 후보: ${theme.nameKo} (${theme.nameEn})

[요청 사항]
1. 사용자의 고민/상태를 바탕으로 5대 명상 테마 중 가장 적합한 recommendedThemeId ('stress_relief' | 'mind_reset' | 'self_compassion' | 'energy_boost' | 'deep_sleep')와 이유(themeRecommendationReason)를 정하세요.
2. 사용자가 60초 동안 눈을 감거나 부드럽게 호흡하며 따라갈 수 있는 따뜻하고 다정한 명상 스크립트를 작성하세요.
3. 불필요한 사설 없이 즉시 심장과 뇌파를 이완시키는 고효율 마이크로 명상 지침을 담으세요.
4. 명상이 끝났을 때 마음에 스며들 다정한 1문장 확언을 포함하세요.
`
    : `
당신은 AURA의 마인드풀니스 웰니스 코치이자 명상 가이드입니다.
사용자가 베이스 테마로 '${theme.nameKo}'(${theme.nameEn}, ${theme.frequency}Hz)를 직접 선택하였습니다.
선택된 테마의 주파수와 호흡 리듬에 완벽하게 일치하는 60초(1분) 맞춤 명상 가이드를 설계해 주세요.

[모드: 사용자 지정 베이스 테마 모드]
- 선택된 베이스 테마: ${theme.nameKo} (${theme.nameEn}) - 반드시 recommendedThemeId를 "${effectiveThemeId}"(으)로 고정하세요!
- 사용자 상태 / 고민: "${userCondition || `${theme.nameKo} 테마 중심 즉시 이완`}"

[요청 사항]
1. recommendedThemeId는 반드시 사용자가 선택한 "${effectiveThemeId}"(으)로 출력해야 합니다.
2. themeRecommendationReason에는 선택된 "${theme.nameKo}" 테마가 사용자의 상태를 어떻게 이완시키는지 1~2문장으로 따뜻하게 서술하세요.
3. 사용자가 60초 동안 눈을 감거나 부드럽게 호흡하며 따라갈 수 있는 따뜻하고 다정한 명상 스크립트를 작성하세요.
4. 불필요한 사설 없이 즉시 심장과 뇌파를 이완시키는 고효율 마이크로 명상 지침을 담으세요.
5. 명상이 끝났을 때 마음에 스며들 다정한 1문장 확언을 포함하세요.
`;

  try {
    const result = await invokeLLMStructured({
      messages: [
        { role: 'system', content: '당신은 AURA의 웰니스 명상 마스터입니다. 사용자의 선택과 고민을 정확히 반영하여 명료하고 자애로운 어조로 60초 1분 명상 가이드를 작성하세요.' },
        { role: 'user', content: prompt }
      ],
      schema: OneMinuteMeditationSchema,
    });

    if (!isAutoMode && preferredThemeId) {
      result.recommendedThemeId = preferredThemeId;
    }

    recordPrismFeature({
      app: 'heal',
      featureName: '1분 명상 처방',
      summary: result.meditationTitle || '1분 맞춤 명상'
    });
    return result;
  } catch (err) {
    console.warn('[OneMinuteMeditation] AI invoke error, using fallback:', err);
    return getFallbackPrescription(effectiveThemeId, userCondition);
  }
}

export function getFallbackPrescription(themeId: MeditationThemeId, userCondition?: string): OneMinuteMeditationPrescription {
  const inferred = userCondition ? inferThemeFromConcern(userCondition) : { themeId, reason: '선택하신 테마에 맞춘 이완 가이드입니다.' };
  const targetId = userCondition ? inferred.themeId : themeId;
  const theme = MEDITATION_THEMES.find(t => t.id === targetId) || MEDITATION_THEMES[0];
  return {
    recommendedThemeId: targetId,
    themeRecommendationReason: inferred.reason,
    meditationTitle: `${theme.emoji} ${theme.nameKo} 60초 명상`,
    themeSummary: userCondition
      ? `'${userCondition}' 상태를 부드럽게 감싸 안고 60초 동안 신경계를 안정화합니다.`
      : theme.description,
    emoji: theme.emoji,
    frequencySuggestion: theme.freqLabel,
    mindfulBreathingTip: `들숨 ${theme.breathingPattern.inhale}초, 멈춤 ${theme.breathingPattern.hold}초, 날숨 ${theme.breathingPattern.exhale}초의 리듬으로 긴장을 흘려보내세요.`,
    guidedVoiceScript: `편안하게 자리에 앉아 어깨의 힘을 뺍니다. 코로 들어오는 시원한 공기와 함께 내면의 중심을 찾습니다. 잠시 숨을 머금고, 길게 내쉬며 오늘 쌓인 모든 피로와 잔상을 우주로 흘려보냅니다. 지금 이 순간, 당신은 온전히 안전하고 평온합니다.`,
    completionAffirmation: theme.affirmation,
  };
}

const LOCAL_STORAGE_KEY_PREFIX = 'aura_one_minute_meditation_history_';
const LOCAL_STORAGE_STATS_KEY = 'aura_meditation_stats_';

export interface MeditationStats {
  totalSessions: number;
  totalSeconds: number;
  todayCount: number;
  lastDateKey: string;
}

export function getMeditationStats(uid: string): MeditationStats {
  const today = getTodayDateKey();
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_STATS_KEY}${uid}`);
    if (raw) {
      const stats: MeditationStats = JSON.parse(raw);
      if (stats.lastDateKey !== today) {
        stats.todayCount = 0;
        stats.lastDateKey = today;
      }
      return stats;
    }
  } catch (_) {}
  return { totalSessions: 0, totalSeconds: 0, todayCount: 0, lastDateKey: today };
}

export async function saveMeditationCompletion(
  uid: string,
  themeId: MeditationThemeId,
  affirmation: string,
  userCondition?: string,
  guideScript?: string
): Promise<OneMinuteMeditationRecord> {
  const theme = MEDITATION_THEMES.find(t => t.id === themeId) || MEDITATION_THEMES[0];
  const today = getTodayDateKey();
  const now = Date.now();
  const id = `med_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const newRecord: OneMinuteMeditationRecord = {
    id,
    themeId,
    themeTitle: theme.nameKo,
    completedAt: now,
    dateKey: today,
    durationSeconds: 60,
    frequency: theme.frequency,
    affirmation,
    userCondition,
    aiPrescribedGuide: guideScript,
  };

  // Update local history
  try {
    const existingRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`);
    const existingList: OneMinuteMeditationRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updatedList = [newRecord, ...existingList].slice(0, 50);
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(updatedList));

    // Update stats
    const stats = getMeditationStats(uid);
    stats.totalSessions += 1;
    stats.totalSeconds += 60;
    stats.todayCount += 1;
    stats.lastDateKey = today;
    localStorage.setItem(`${LOCAL_STORAGE_STATS_KEY}${uid}`, JSON.stringify(stats));
  } catch (e) {
    console.warn('[Meditation] Local storage save error:', e);
  }

  // Sync to Firestore if authenticated
  if (auth.currentUser?.uid && localStorage.getItem('developer_bypass') !== 'true') {
    try {
      const colRef = collection(db, 'userProfiles', auth.currentUser.uid, 'meditationHistory');
      await addDoc(colRef, {
        ...newRecord,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Meditation] Firestore sync notice (saved locally):', err);
    }
  }

  recordPrismFeature({
    app: 'heal',
    featureName: '1분 명상 완료',
    summary: `${theme.nameKo} 60초 명상 완료`
  });
  return newRecord;
}

export async function loadMeditationHistory(uid: string): Promise<OneMinuteMeditationRecord[]> {
  let localList: OneMinuteMeditationRecord[] = [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`);
    if (raw) {
      localList = JSON.parse(raw);
    }
  } catch (_) {}

  if (auth.currentUser?.uid && localStorage.getItem('developer_bypass') !== 'true') {
    try {
      const colRef = collection(db, 'userProfiles', auth.currentUser.uid, 'meditationHistory');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const firestoreList = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as OneMinuteMeditationRecord[];

      if (firestoreList.length > 0) {
        const mergedMap = new Map<string, OneMinuteMeditationRecord>();
        localList.forEach(item => mergedMap.set(item.id, item));
        firestoreList.forEach(item => mergedMap.set(item.id, item));
        const merged = Array.from(mergedMap.values()).sort((a, b) => b.completedAt - a.completedAt);
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('[Meditation] Remote load notice (using local):', e);
    }
  }

  return localList;
}
