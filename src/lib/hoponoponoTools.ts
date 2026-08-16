import { z } from 'zod';
import { invokeLLMStructured } from '@/lib/ai';
import { PRISM_VOICE_RULES } from '@/lib/copyTone';

export const HOPONOPONO_LAST_TOOL_KEY = 'hoponopono_last_tool';

export type HoponoponoToolId =
  | 'blue_solar_water'
  | 'ceeport'
  | 'ha'
  | 'eraser'
  | 'salt_water'
  | 'auto';

export type HoponoponoToolRecipe = z.infer<typeof HoponoponoToolRecipeSchema>;

export const HoponoponoToolRecipeSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  toolSubtitle: z.string(),
  whyThisTool: z.string(),
  materials: z.array(z.string()).min(2).max(6),
  steps: z.array(z.string()).min(3).max(6),
  usageMantra: z.string(),
  dailyPractice: z.string(),
});

export type HoponoponoToolCatalogItem = {
  id: HoponoponoToolId;
  name: string;
  nameEn: string;
  emoji: string;
  summary: string;
};

export const HOPONOPONO_TOOL_CATALOG: HoponoponoToolCatalogItem[] = [
  {
    id: 'blue_solar_water',
    name: '블루솔라워터',
    nameEn: 'Blue Solar Water',
    emoji: '💧',
    summary: '파란 유리병에 담은 햇빛 물. 마음을 씻는 데 씁니다.',
  },
  {
    id: 'ceeport',
    name: '치포트키',
    nameEn: 'Ceeport',
    emoji: '🔑',
    summary: '잠재의식의 문을 여는 정화 열쇠. 시각화하며 씁니다.',
  },
  {
    id: 'ha',
    name: '하 (Ha)',
    nameEn: 'Ha',
    emoji: '🌬️',
    summary: '숨을 내뱉으며 기억을 지우는 호흡 정화법.',
  },
  {
    id: 'eraser',
    name: '지우개',
    nameEn: 'Eraser',
    emoji: '🧽',
    summary: '마음속 지우개로 판단과 기억을 지웁니다.',
  },
  {
    id: 'salt_water',
    name: '하와이안 소금물',
    nameEn: 'Hawaiian Salt Water',
    emoji: '🧂',
    summary: '소금물로 공간과 마음을 정화합니다.',
  },
  {
    id: 'auto',
    name: 'AI 추천',
    nameEn: 'AI Pick',
    emoji: '✨',
    summary: '지금 상태에 맞는 정화 도구를 골라 줍니다.',
  },
];

export type SavedHoponoponoTool = HoponoponoToolRecipe & {
  id: string;
  createdAt: string;
  cleansingSubject: string;
  imageUrl: string | null;
};

export const HOPONOPONO_TOOLS_STORAGE_KEY = 'hoponopono_saved_tools';

export function loadSavedHoponoponoTools(): SavedHoponoponoTool[] {
  try {
    const raw = localStorage.getItem(HOPONOPONO_TOOLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHoponoponoTool(tool: SavedHoponoponoTool): SavedHoponoponoTool[] {
  const existing = loadSavedHoponoponoTools();
  const next = [tool, ...existing.filter((t) => t.id !== tool.id)].slice(0, 12);
  localStorage.setItem(HOPONOPONO_TOOLS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteHoponoponoTool(toolId: string): SavedHoponoponoTool[] {
  const next = loadSavedHoponoponoTools().filter((t) => t.id !== toolId);
  localStorage.setItem(HOPONOPONO_TOOLS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getHoponoponoToolById(id: HoponoponoToolId): HoponoponoToolCatalogItem | undefined {
  return HOPONOPONO_TOOL_CATALOG.find((t) => t.id === id);
}

export function buildHoponoponoToolPrompt(
  toolId: HoponoponoToolId,
  cleansingSubject: string,
  userContext: string,
): string {
  const selected = getHoponoponoToolById(toolId);
  const toolLine =
    toolId === 'auto'
      ? '지금 정화 주제에 가장 잘 맞는 호오포노포노 정화 도구 하나를 골라 주세요. (블루솔라워터, 치포트키, 하, 지우개, 하와이안 소금물 중에서)'
      : `선택된 도구: ${selected?.name} (${selected?.nameEn}) — ${selected?.summary}`;

  return `당신은 호오포노포노(Zero Limits) 실천을 돕는 정화 도구 가이드입니다.
사용자가 집에서 바로 만들고 쓸 수 있는 '실제 정화 도구' 처방을 JSON으로 만들어 주세요.

정화 주제: "${cleansingSubject}"
${toolLine}
추가 맥락: ${userContext || '없음'}

[도구별 참고]
- 블루솔라워터: 파란 유리병 + 물 + 햇빛(또는 실내 조명). 마시거나 피부에 바르거나 공간에 뿌림.
- 치포트키: 정화 열쇠를 눈에 보이거나 마음속으로 그리며, 잠재의식의 문을 연다고 상상.
- 하(Ha): 입 깊게 벌리고 "하——" 하고 길게 내쉬며 기억을보냄.
- 지우개: 손에 지우개를 쥐거나 상상하며 네 구절로 판단·기억을 지움.
- 하와이안 소금물: 천연 소금 + 물. 공간 정화, 목욕, 손 씻기에 활용.

[출력 규칙]
- toolId: 최종 선택 도구 id (blue_solar_water | ceeport | ha | eraser | salt_water)
- toolName: 한국어 도구 이름
- toolSubtitle: 한 줄 설명 (20자 내외)
- whyThisTool: 이 주제에 이 도구가 맞는 이유 1~2문장
- materials: 준비물 2~6개 (집에서 구할 수 있는 것)
- steps: 만들기·준비·사용 순서 3~6단계 (짧고 실천 가능하게)
- usageMantra: 사용할 때 읊을 네 구절 맞춤 주문 (미안합니다, 용서하세요, 감사합니다, 사랑합니다)
- dailyPractice: 일상에서 반복할 간단한 습관 1~2문장

[문체]
- 짧고 명확하게. 일상어 사용.
- 과학·우주·에너지 파동 같은 말로 포장하지 마.
- "~합니다", "~개시" 같은 딱딱한 문어체 금지.`;
}

const TOOL_IMAGE_BASE: Record<Exclude<HoponoponoToolId, 'auto'>, string> = {
  blue_solar_water:
    'A beautiful cobalt blue glass water bottle filled with clear sparkling water, sun rays passing through, tropical Hawaiian peaceful atmosphere, product photography style, soft golden light',
  ceeport:
    'An ornate golden spiritual purification key (Ceeport) with Hawaiian tribal engravings, glowing softly on dark wood, mystical but calm, high detail product render',
  ha:
    'Peaceful person exhaling a long breath "Ha" visualization, soft turquoise and emerald mist flowing outward, meditative Hawaiian nature background, gentle illustration',
  eraser:
    'A clean white eraser on a serene desk with four Hawaiian words written faintly, soft emerald light, minimalist spiritual cleansing concept art',
  salt_water:
    'A glass bowl of Hawaiian salt water with natural sea salt crystals, tropical flowers nearby, calm ocean blue tones, ritual cleansing still life photography',
};

export function buildHoponoponoToolImagePrompt(
  toolId: string,
  toolName: string,
  cleansingSubject: string,
): string {
  const base =
    toolId in TOOL_IMAGE_BASE
      ? TOOL_IMAGE_BASE[toolId as Exclude<HoponoponoToolId, 'auto'>]
      : 'A serene Ho\'oponopono purification tool on a Hawaiian meditation altar, soft emerald and sky blue tones';

  return `${base}. Tool: "${toolName}". Cleansing theme: "${cleansingSubject}". Meditative digital painting, NanoBanana style, high resolution, no text, no watermark.`;
}

export function buildHoponoponoToolImageUrl(prompt: string): string {
  const seed = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&seed=${seed}&nologo=true`;
}

export const HOPONOPONO_TOOL_FALLBACKS: Record<
  Exclude<HoponoponoToolId, 'auto'>,
  HoponoponoToolRecipe
> = {
  blue_solar_water: {
    toolId: 'blue_solar_water',
    toolName: '블루솔라워터',
    toolSubtitle: '햇빛 담은 파란 물',
    whyThisTool: '마음의 탁함을 물처럼 씻어내기 좋아요. 집에서 바로 만들 수 있어요.',
    materials: ['파란 유리병', '깨끗한 물', '햇빛이 드는 창가'],
    steps: [
      '파란 유리병을 깨끗이 씻어요.',
      '병의 3분의 2까지 물을 담아요.',
      '창가에 20분~1시간 햇빛을 쬐어요.',
      '한 모금 마시거나 손에 조금 바른 뒤 네 구절을 읊어요.',
    ],
    usageMantra:
      '이 물이 담은 맑음으로\n미안합니다, 용서하세요\n감사합니다, 사랑합니다',
    dailyPractice: '아침에 한 모금 마시며 오늘 씻고 싶은 생각 하나를 떠올려 보세요.',
  },
  ceeport: {
    toolId: 'ceeport',
    toolName: '치포트키',
    toolSubtitle: '정화 열쇠',
    whyThisTool: '막힌 마음의 문을 연다고 상상하면, 반복되는 생각을 내려놓기 쉬워요.',
    materials: ['조용한 자리', '작은 열쇠(있으면)', '편한 호흡'],
    steps: [
      '눈을 감고 가슴에 손을 얹어요.',
      '마음속에 빛나는 열쇠(치포트키)를 그려요.',
      '지금 씻고 싶은 생각 앞에서 열쇠로 문을 연다고 상상해요.',
      '문이 열리면 네 구절을 천천히 읊어요.',
    ],
    usageMantra:
      '이 열쇠로 열린 문 너머로\n미안합니다, 용서하세요\n감사합니다, 사랑합니다',
    dailyPractice: '하루 한 번, 걱정이 올라올 때 열쇠로 문을 여는 상상을 30초만 해 보세요.',
  },
  ha: {
    toolId: 'ha',
    toolName: '하 (Ha)',
    toolSubtitle: '숨으로 지우기',
    whyThisTool: '몸으로 바로 쓸 수 있어요. 숨을 길게 내뱉으며 긴장을보내기 좋아요.',
    materials: ['편한 자세', '조용한 공간'],
    steps: [
      '어깨를 내리고 편하게 앉아요.',
      '코로 깊게 들이마셔요.',
      '입을 크게 벌리고 "하——" 하고 길게 내쉬어요.',
      '내쉬는 동안 씻고 싶은 생각을 연기처럼보낸다고 상상해요.',
      '네 구절을 속삭이며 마무리해요.',
    ],
    usageMantra:
      '하—— 하고내며\n미안합니다, 용서하세요\n감사합니다, 사랑합니다',
    dailyPractice: '스트레스가 올라올 때마다 "하" 한 번으로 시작해 보세요.',
  },
  eraser: {
    toolId: 'eraser',
    toolName: '지우개',
    toolSubtitle: '마음속 지우개',
    whyThisTool: '판단과 집착을 지운다는 이미지가 직관적이에요. 네 구절과 잘 맞아요.',
    materials: ['작은 지우개(있으면)', '조용한 자리'],
    steps: [
      '손에 지우개를 쥐거나, 마음속 지우개를 상상해요.',
      '씻고 싶은 생각을 종이에 쓴 것처럼 떠올려요.',
      '지우개로 천천히 문지르며 네 구절을 읊어요.',
      '지워진 빈 공간에 평온이 남는다고 상상해요.',
    ],
    usageMantra:
      '지우개로 비워 가며\n미안합니다, 용서하세요\n감사합니다, 사랑합니다',
    dailyPractice: '자책이 올라올 때 지우개를 한 번 문지르는 동작으로 시작해 보세요.',
  },
  salt_water: {
    toolId: 'salt_water',
    toolName: '하와이안 소금물',
    toolSubtitle: '소금물 정화',
    whyThisTool: '공간과 몸을 함께 정리하기 좋아요. 집에서 간단히 만들 수 있어요.',
    materials: ['천연 소금 1스푼', '물 1컵', '작은 그릇 또는 분무기'],
    steps: [
      '물에 소금을 녹여요.',
      '손을 씻거나 공간 모서리에 조금 뿌려요.',
      '뿌리거나 바르는 동안 네 구절을 읊어요.',
      '마무리로 창문을 잠깐 열어 공기를 순환시켜요.',
    ],
    usageMantra:
      '소금물이 씻어 주는 맑음으로\n미안합니다, 용서하세요\n감사합니다, 사랑합니다',
    dailyPractice: '저녁에 손을 소금물로 씻으며 하루의 무거운 생각을 내려놓아 보세요.',
  },
};

export function getHoponoponoToolFallback(toolId: HoponoponoToolId): HoponoponoToolRecipe {
  if (toolId === 'auto') return HOPONOPONO_TOOL_FALLBACKS.blue_solar_water;
  return HOPONOPONO_TOOL_FALLBACKS[toolId];
}

export function loadLastHoponoponoTool(): SavedHoponoponoTool | null {
  try {
    const raw = localStorage.getItem(HOPONOPONO_LAST_TOOL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function generateHoponoponoTool(
  toolId: HoponoponoToolId,
  subject: string,
  userContext = '',
): Promise<SavedHoponoponoTool> {
  const buildSaved = (recipe: HoponoponoToolRecipe): SavedHoponoponoTool => {
    const imagePrompt = buildHoponoponoToolImagePrompt(recipe.toolId, recipe.toolName, subject);
    return {
      ...recipe,
      id: `tool_${Date.now()}`,
      createdAt: new Date().toISOString(),
      cleansingSubject: subject,
      imageUrl: buildHoponoponoToolImageUrl(imagePrompt),
    };
  };

  try {
    const prompt = `${buildHoponoponoToolPrompt(toolId, subject, userContext)}\n${PRISM_VOICE_RULES}`;
    const recipe = await invokeLLMStructured({
      messages: [{ role: 'user', content: prompt }],
      schema: HoponoponoToolRecipeSchema,
    });
    return buildSaved(recipe);
  } catch (err) {
    console.warn('Hoponopono tool generation failed, using fallback.', err);
    const fallbackId = toolId === 'auto' ? 'blue_solar_water' : toolId;
    return buildSaved(getHoponoponoToolFallback(fallbackId));
  }
}

export function persistHoponoponoTool(tool: SavedHoponoponoTool): void {
  localStorage.setItem(HOPONOPONO_LAST_TOOL_KEY, JSON.stringify(tool));
  saveHoponoponoTool(tool);
}