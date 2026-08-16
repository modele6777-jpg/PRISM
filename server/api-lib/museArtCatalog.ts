export type MuseArtMoodId = "quiet" | "passion" | "refresh" | "planning" | "resurrection";

export const DAILY_ART_MAGAZINE_HOME = "https://www.dailyartmagazine.com/";
export const SIYOIL_LIB_HOME = "https://www.siyoillib.com/";
export const SIYOIL_POEM_SOURCE_NAME = "시요일 라이브러리";
export const APPLE_MUSIC_CLASSICAL_HOME = "https://classical.music.apple.com/kr/";
export const APPLE_MUSIC_CLASSICAL_SOURCE_NAME = "Apple Music Classical";

export interface VerifiedPoem {
  title: string;
  titleOriginal: string;
  poet: string;
  poetOriginal: string;
  excerpt: string;
  whyRecommended: string;
  siyoilUrl: string;
  poemSourceName: string;
}

export function buildSiyoilPoemUrl(contentid: number, subcontentid: number): string {
  return `${SIYOIL_LIB_HOME}PoemViewer?contentid=${contentid}&subcontentid=${subcontentid}`;
}

export interface VerifiedSong {
  title: string;
  titleOriginal: string;
  artist: string;
  artistOriginal: string;
  listeningGuide: string;
  youtubeVideoId: string;
  appleMusicClassicalUrl: string;
  songSourceName: string;
}

export interface VerifiedArtEntry {
  id: string;
  moods: MuseArtMoodId[];
  dailyArtUrl: string;
  imageUrl: string;
  title: string;
  titleOriginal: string;
  creator: string;
  creatorOriginal: string;
  artworkType: string;
  era: string;
  description: string;
  quote: string;
  aestheticTone: string;
  famousPoem: VerifiedPoem;
  famousSong: VerifiedSong;
  defaultWhyRecommended: string;
  defaultChallenges: [string, string];
}

export interface ArtRecommendationPayload {
  catalogId: string;
  title: string;
  titleOriginal: string;
  creator: string;
  creatorOriginal: string;
  artworkType: string;
  era: string;
  description: string;
  whyRecommended: string;
  challenges: string[];
  aestheticTone: string;
  quote: string;
  famousPoem: VerifiedPoem;
  famousSong: VerifiedSong;
  dailyArtUrl: string;
  imageUrl: string;
  sourceName: string;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Curated from DailyArt Magazine, 시요일 라이브러리, Apple Music Classical (YouTube 재생) */
export const MUSE_ART_CATALOG: VerifiedArtEntry[] = [
  {
    id: "chagall_paris_through_window",
    moods: ["planning", "passion"],
    dailyArtUrl: "https://www.dailyartmagazine.com/paris-through-the-window-by-marc-chagall/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2025/08/chagall_paris_window-1024x983.jpg",
    title: "창 너머의 파리 (Paris Through the Window, 1913)",
    titleOriginal: "Paris Through the Window",
    creator: "마르크 샤갈 (Marc Chagall, 벨라루스·프랑스)",
    creatorOriginal: "Marc Chagall",
    artworkType: "미술 (유화)",
    era: "초기 모더니즘 · 1913년",
    description:
      "샤갈이 파리에서 그린 작품으로, 창밖 에펠탑·역동적인 하늘·비현실적 인물이 한 화면에 겹쳐집니다. 고국과 파리, 사랑과 도시의 경험이 꿈처럼 뒤섞인 초현실적 풍경입니다.",
    quote: "나는 그들이 내 그림을 사랑하기를 바란다. 그것이 내가 그리는 이유다.",
    aestheticTone: "코발트 블루, 산화적 노랑, 에펠탑의 붉은 기둥",
    famousPoem: {
      title: "몰라서 좋아요",
      titleOriginal: "몰라서 좋아요",
      poet: "오은 (대한민국)",
      poetOriginal: "오은",
      excerpt: "모르는 감정이 싹텄다 / 몰라서 설레고",
      whyRecommended: "꿈처럼 뒤섞인 감정과 창 너머의 비현실적 풍경이 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(2355, 63217),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "달빛 (Clair de Lune)",
      titleOriginal: "Clair de Lune",
      artist: "클로드 드뷔시 (Claude Debussy, 프랑스)",
      artistOriginal: "Claude Debussy",
      listeningGuide: "몽환적인 화성 변화 속에서 창밖 풍경을 떠올려 보세요.",
      youtubeVideoId: "WNcsUNKlAKw",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1358340973`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "새로운 영감과 상상의 전환을 원할 때, 샤갈의 파리는 현실과 꿈이 겹치는 창의적 시야를 열어 줍니다.",
    defaultChallenges: [
      "창밖 풍경을 1분간 바라보며 오늘의 색 세 가지를 적어 보세요.",
      "하늘과 건물을 겹쳐 그리는 30초 스케치를 해 보세요.",
    ],
  },
  {
    id: "rosa_bonheur_horse_fair",
    moods: ["passion", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/painting-of-the-week-the-horse-fair-by-rosa-bonheur/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2022/08/Rosa_Bonheur_The_Horse_Fair_1852–55-768x364.jpeg",
    title: "말 시장 (The Horse Fair, 1852–1855)",
    titleOriginal: "The Horse Fair",
    creator: "로자 보뉴르 (Rosa Bonheur, 프랑스)",
    creatorOriginal: "Rosa Bonheur",
    artworkType: "미술 (유화)",
    era: "사실주의 · 19세기 중반",
    description:
      "로자 보뉴르가 파리 말 시장을 1년 반 넘게 관찰하며 완성한 대작입니다. 거대한 캔버스 위 말과 사람의 역동이 1853년 파리 살롱에서 큰 찬사를 받았습니다.",
    quote: "예술은 자연의 가장 충실한 번역이다.",
    aestheticTone: "흙빛 갈색, 말의 근육이 드러난 따뜻한 톤",
    famousPoem: {
      title: "조용하게, 강으로, 그러다 흐르라",
      titleOriginal: "조용하게, 강으로, 그러다 흐르라",
      poet: "김용택 (대한민국)",
      poetOriginal: "김용택",
      excerpt: "사람들 속에서 조용하게, 강으로, 그러다 흐르라.",
      whyRecommended: "흔들림 속에서도 중심을 지키는 의지와 작품의 역동이 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(2515, 69084),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "교향곡 5번 다단조, Op.67 — 1악장",
      titleOriginal: "Symphony No. 5 in C minor, Op.67: I. Allegro con brio",
      artist: "루트비히 판 베토벤 (Ludwig van Beethoven, 독일)",
      artistOriginal: "Ludwig van Beethoven",
      listeningGuide: "운명 동기의 반복 속에서 앞으로 나아가는 리듬을 느껴 보세요.",
      youtubeVideoId: "_4IRnGS1l48",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1499288492`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "막힌 에너지를 밖으로 쏟아내고 싶을 때, 보뉴르의 말 시장은 생동감 넘치는 추진력을 떠올리게 합니다.",
    defaultChallenges: [
      "손가락으로 책상을 두드리며 오늘의 목표 한 가지를 큰 소리로 말해 보세요.",
      "강한 선으로 움직이는 형태를 30초간 스케치해 보세요.",
    ],
  },
  {
    id: "kroyer_summer_evening_skagen",
    moods: ["quiet", "refresh"],
    dailyArtUrl: "https://www.dailyartmagazine.com/summer-evening-on-skagen-sonderstrand-kroyer/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2023/04/01-Peder-Severin-Kroyer-Summer-Evening-on-Skagen-Sonderstrand-1893-Skagens-Museum-Skagen-Denmark-264x177.jpg",
    title: "스카겐 해변의 여름 저녁 (Summer Evening on Skagen Sønderstrand, 1893)",
    titleOriginal: "Summer Evening on Skagen Sønderstrand",
    creator: "페데르 세베린 크뢰어 (Peder Severin Krøyer, 덴마크)",
    creatorOriginal: "Peder Severin Krøyer",
    artworkType: "미술 (유화)",
    era: "스칸디나비아 인상주의 · 1893년",
    description:
      "크뢰어가 덴마크 스카겐 해변의 여름 저녁을 그린 작품입니다. 은은한 빛과 넓은 해변, 산책하는 인물이 북유럽 여름의 고요한 아름다움을 담습니다.",
    quote: "빛이 모든 것을 말해 준다.",
    aestheticTone: "연한 금빛, 바다의 청록, 저녁 하늘의 은빛",
    famousPoem: {
      title: "호수 1",
      titleOriginal: "호수 1",
      poet: "정지용 (대한민국)",
      poetOriginal: "정지용",
      excerpt: "얼굴 하나야 / 손바닥 둘로 폭 가리지만",
      whyRecommended: "잔잔한 수면과 저녁 바다의 고요함이 같은 결을 이룹니다.",
      siyoilUrl: buildSiyoilPoemUrl(396, 24605),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Gymnopédie No. 1",
      titleOriginal: "Gymnopédie No. 1",
      artist: "에릭 사티 (Erik Satie, 프랑스)",
      artistOriginal: "Erik Satie",
      listeningGuide: "느린 피아노 선율에 맞춰 저녁 공기를 상상해 보세요.",
      youtubeVideoId: "S-Xm7s9e96Y",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1886443937`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "마음을 식히고 싶을 때, 크뢰어의 여름 저녁 해변은 숨 고를 여백을 선사합니다.",
    defaultChallenges: [
      "창밖 하늘을 1분간 바라보며 호흡을 고르게 맞춰 보세요.",
      "연한 파란색과 금색으로 수평선 하나를 그려 보세요.",
    ],
  },
  {
    id: "rosa_bonheur_sheep_by_sea",
    moods: ["quiet", "refresh"],
    dailyArtUrl: "https://www.dailyartmagazine.com/rosa-bonheur-sheep-by-the-sea/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/12/1-Rosa-Bonheur-Sheep-by-the-Sea-1865-National-Museum-of-Women-in-the-Arts-264x177.jpg",
    title: "바다의 양 (Sheep by the Sea, 1865)",
    titleOriginal: "Sheep by the Sea",
    creator: "로자 보뉴르 (Rosa Bonheur, 프랑스)",
    creatorOriginal: "Rosa Bonheur",
    artworkType: "미술 (유화)",
    era: "사실주의 · 1865년",
    description:
      "로자 보뉴르가 바닷가의 양 떼를 그린 작품입니다. 19세기 유럽에서 가장 유명한 여성 화가 중 한 명이 동물의 생동감과 자연의 평온을 함께 담아냈습니다.",
    quote: "자연은 가장 위대한 스승이다.",
    aestheticTone: "회청색 바다, 양털의 크림빛, 해안의 연한 녹색",
    famousPoem: {
      title: "귀가",
      titleOriginal: "귀가",
      poet: "양애경 (대한민국)",
      poetOriginal: "양애경",
      excerpt: "부모의 집도 내 집 아니네 / 형제의 집도 내 집 아니네",
      whyRecommended: "자연을 있는 그대로 바라보는 시선과 바닷가의 평온이 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(72, 4575),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "아베 마리아 (Ave Maria), D.839",
      titleOriginal: "Ave Maria, D.839",
      artist: "프란츠 슈베르트 (Franz Schubert, 오스트리아)",
      artistOriginal: "Franz Schubert",
      listeningGuide: "넓게 펼쳐지는 선율에 맡겨 마음을 천천히 풀어 보세요.",
      youtubeVideoId: "WI4nFfWvEtg",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}work/franz-schubert-1797-pp1000`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "고요한 치유가 필요할 때, 보뉴르의 바다와 양은 자연 속 안식을 떠올리게 합니다.",
    defaultChallenges: [
      "창밖의 하늘이나 구름을 30초간 바라보세요.",
      "크림색과 연한 파란색으로 작은 언덕 하나를 그려 보세요.",
    ],
  },
  {
    id: "jan_van_os_carnations_fruit",
    moods: ["refresh", "planning"],
    dailyArtUrl: "https://www.dailyartmagazine.com/masterpiece-story-still-life-with-carnations-and-exotic-fruit-by-jan-van-os/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2026/06/01-Jan-van-Os-Still-Life-with-Carnations-and-Exotic-Fruit-ca.-1770s-Virginia-Museum-of-Fine-Arts-Richmond-VA-USA-264x177.jpg",
    title: "카네이션과 이국적인 과일 정물 (Still Life with Carnations and Exotic Fruit, 1770s)",
    titleOriginal: "Still Life with Carnations and Exotic Fruit",
    creator: "얀 판 오스 (Jan van Os, 네덜란드)",
    creatorOriginal: "Jan van Os",
    artworkType: "미술 (유화)",
    era: "네덜란드 황금시대 후기 · 18세기",
    description:
      "얀 판 오스의 정물화로, 카네이션과 열대 과일이 정교하게 배열되어 있습니다. 여름의 풍요와 세밀한 관찰이 돋보이는 네덜란드 정물화의 대표적 작품입니다.",
    quote: "정물은 작은 우주를 담는다.",
    aestheticTone: "진분홍 카네이션, 황금빛 과일, 어두운 배경의 대비",
    famousPoem: {
      title: "가능성",
      titleOriginal: "가능성",
      poet: "오은 (대한민국)",
      poetOriginal: "오은",
      excerpt: "설명할 수 없는 것들이 매일 생겨난다 / 어디든 갈 수 있다는 말",
      whyRecommended: "작은 선택과 세밀한 관찰이 오늘의 창작 태도와 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(2355, 63205),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "무반주 첼로 모음곡 1번 프렐류드",
      titleOriginal: "Cello Suite No. 1 in G major, BWV 1007: I. Prélude",
      artist: "요한 제바스티안 바흐 (Johann Sebastian Bach, 독일)",
      artistOriginal: "Johann Sebastian Bach",
      listeningGuide: "한 줄의 선율이 이어지는 흐름에 집중해 보세요.",
      youtubeVideoId: "1prwe0WcGY8",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1398580507`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "감각을 새롭게 정돈하고 싶을 때, 판 오스의 정물은 세밀한 관찰의 기쁨을 일깨웁니다.",
    defaultChallenges: [
      "오늘 식탁 위 과일이나 꽃 하나를 1분간 세밀하게 관찰해 보세요.",
      "좋아하는 색 세 가지로 작은 정물 스케치를 해 보세요.",
    ],
  },
  {
    id: "grace_hartigan_summer_street",
    moods: ["passion", "planning"],
    dailyArtUrl: "https://www.dailyartmagazine.com/masterpiece-story-summer-street-grace-hartigan/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2025/11/Grace-Hartigan-Summer-Street-1-e1763114391166-264x177.jpeg",
    title: "여름 거리 (Summer Street, 1956)",
    titleOriginal: "Summer Street",
    creator: "그레이스 하티건 (Grace Hartigan, 미국)",
    creatorOriginal: "Grace Hartigan",
    artworkType: "미술 (유화)",
    era: "추상표현주의 · 1956년",
    description:
      "그레이스 하티건의 추상화로, 도시의 빛과 소음이 굵은 붓질과 선명한 색으로 쏟아집니다. 1950년대 뉴욕의 여름 거리 에너지를 추상적으로 포착한 작품입니다.",
    quote: "나는 느낀 것을 그린다.",
    aestheticTone: "선명한 원색, 겹쳐진 붓질, 도시의 열기",
    famousPoem: {
      title: "진달래꽃",
      titleOriginal: "진달래꽃",
      poet: "김소월 (대한민국)",
      poetOriginal: "김소월",
      excerpt: "나 보기가 역겨워 가실 때에는 / 말없이 고이 보내 드리오리다",
      whyRecommended: "겹겹이 쌓인 감정을 색으로 풀어내는 태도가 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(390, 24292),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Rhapsody in Blue",
      titleOriginal: "Rhapsody in Blue",
      artist: "조지 거슈윈 (George Gershwin, 미국)",
      artistOriginal: "George Gershwin",
      listeningGuide: "도시의 리듬이 피어나는 구간에 집중해 보세요.",
      youtubeVideoId: "IIc7xuiVqVI",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/594512997`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "도시의 열기와 창조적 자극이 필요할 때, 하티건의 여름 거리는 에너지를 되살립니다.",
    defaultChallenges: [
      "오늘 본 거리 풍경의 색 세 가지를 적어 보세요.",
      "굵은 선으로 30초간 추상 스케치를 해 보세요.",
    ],
  },
  {
    id: "kitty_kielland_summer_night",
    moods: ["quiet", "planning"],
    dailyArtUrl: "https://www.dailyartmagazine.com/kitty-kielland/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2022/03/01-Kitty-Kielland-Summer-Night-1886-Nasjonalgalleriet-Oslo-Norway-264x177.jpg",
    title: "여름의 밤 (Summer Night, 1886)",
    titleOriginal: "Summer Night",
    creator: "키티 키엘란 (Kitty Kielland, 노르웨이)",
    creatorOriginal: "Kitty Kielland",
    artworkType: "미술 (유화)",
    era: "스칸디나비아 인상주의 · 1886년",
    description:
      "키티 키엘란의 풍경화로, 노르웨이 여름밤의 잔잔한 호수와 하늘을 담았습니다. 19세기 북유럽 여성 화가의 대표 작품 가운데 하나입니다.",
    quote: "풍경은 마음의 거울이다.",
    aestheticTone: "밤하늘의 남색, 수면의 은빛, 여름 풀의 어두운 녹",
    famousPoem: {
      title: "별",
      titleOriginal: "별",
      poet: "정지용 (대한민국)",
      poetOriginal: "정지용",
      excerpt: "누워서 보는 별 하나는 / 진정 멀─고나.",
      whyRecommended: "밤하늘을 바라보는 고요한 시선이 작품과 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(396, 24647),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "달빛 (Clair de Lune)",
      titleOriginal: "Clair de Lune",
      artist: "클로드 드뷔시 (Claude Debussy, 프랑스)",
      artistOriginal: "Claude Debussy",
      listeningGuide: "피아노의 긴 여백 속에서 밤 공기를 느껴 보세요.",
      youtubeVideoId: "CvFH_6DNFCY",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1245076800`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "밤의 고요함 속에서 생각을 정리하고 싶을 때, 키엘란의 여름밤은 맑은 시야를 돕습니다.",
    defaultChallenges: [
      "불을 끄고 창밖을 1분간 바라보세요.",
      "남색 종이 위에 은색 점 몇 개를 찍어 보세요.",
    ],
  },
  {
    id: "winslow_homer_summer_squall",
    moods: ["passion", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/painting-of-the-week-winslow-homer-summer-squall/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2020/10/1955.8-e1652795177598-264x177.jpg",
    title: "여름 폭풍 (Summer Squall)",
    titleOriginal: "Summer Squall",
    creator: "윈슬로 호머 (Winslow Homer, 미국)",
    creatorOriginal: "Winslow Homer",
    artworkType: "미술 (수채)",
    era: "미국 사실주의 · 19세기 후반",
    description:
      "윈슬로 호머가 여름 바다의 갑작스러운 폭풍을 그린 수채 작품입니다. 파도와 하늘의 격렬한 움직임이 자연의 힘을 생생하게 전합니다.",
    quote: "자연은 가장 위대한 스승이다.",
    aestheticTone: "짙은 회색 구름, 흰 파도, 바다의 청록",
    famousPoem: {
      title: "바람의 행방",
      titleOriginal: "바람의 행방",
      poet: "김용택 (대한민국)",
      poetOriginal: "김용택",
      excerpt: "바람은 남쪽으로 불었다 / 나뭇가지가 소리를 낸다",
      whyRecommended: "폭풍 속에서도 중심을 지키는 의지와 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(2515, 69065),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "피아노 협주곡 2번 다단조, Op.18 — 2악장",
      titleOriginal: "Piano Concerto No. 2 in C minor, Op.18: II. Adagio sostenuto",
      artist: "세르게이 라흐마니노프 (Sergei Rachmaninoff, 러시아)",
      artistOriginal: "Sergei Rachmaninoff",
      listeningGuide: "서정적 선율 속에서 파도가 잦아드는 순간을 상상해 보세요.",
      youtubeVideoId: "rEGOihjqO9w",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}work/sergey-rachmaninov-1873-pp24`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "격렬한 감정 뒤 고요를 찾고 싶을 때, 호머의 여름 폭풍은 흐름의 전환을 보여 줍니다.",
    defaultChallenges: [
      "깊게 숨 들이쉬고 내쉬며 파도처럼 호흡 10회를 맞춰 보세요.",
      "물결 모양 선을 종이에 자유롭게 그려 보세요.",
    ],
  },
  {
    id: "remedios_varo_sympathy",
    moods: ["planning", "quiet"],
    dailyArtUrl: "https://www.dailyartmagazine.com/simpatia-la-rabia-del-gato-remedios-varo/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/10/60566459_971953536339999_3456758244402266112_n-e1653318794714-264x177.jpg",
    title: "공감 (Sympathy / Simpatía)",
    titleOriginal: "Sympathy",
    creator: "레메디오스 바로 (Remedios Varo, 멕시코·스페인)",
    creatorOriginal: "Remedios Varo",
    artworkType: "미술 (유화)",
    era: "초현실주의 · 20세기",
    description:
      "레메디오스 바로의 초현실주의 작품으로, 고양이와 인물이 어우러진 신비로운 장면을 담습니다. 무의식과 상징이 겹쳐진 바로 특유의 환상적 세계입니다.",
    quote: "상상력은 현실을 넘어선다.",
    aestheticTone: "황금빛 조명, 신비로운 인물, 부드러운 그림자",
    famousPoem: {
      title: "몽상적 인간",
      titleOriginal: "몽상적 인간",
      poet: "양애경 (대한민국)",
      poetOriginal: "양애경",
      excerpt: "몽상적인 인간도 살아 남을 수 있음을 보이기 위해서",
      whyRecommended: "내면의 상징을 따라가는 상상력과 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(72, 4585),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Gymnopédie No. 1",
      titleOriginal: "Gymnopédie No. 1",
      artist: "에릭 사티 (Erik Satie, 프랑스)",
      artistOriginal: "Erik Satie",
      listeningGuide: "몽환적인 템포 속에서 그림 속 장면을 떠올려 보세요.",
      youtubeVideoId: "S-Xm7s9e96Y",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/6775807750`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "내면의 상징과 직관을 탐색하고 싶을 때, 바로의 공감은 꿈결 같은 시야를 열어 줍니다.",
    defaultChallenges: [
      "오늘 떠오른 꿈이나 이미지 하나를 한 줄로 적어 보세요.",
      "좋아하는 동물이나 상징을 30초 스케치해 보세요.",
    ],
  },
  {
    id: "fede_galizia_still_life",
    moods: ["quiet", "planning"],
    dailyArtUrl: "https://www.dailyartmagazine.com/fede-galizia-still-life/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/10/Fede-Galizia-Still-Life-cover-1-e1644587786451-264x177.jpg",
    title: "복숭아·자스민·퀸스·메뚜기 정물 (A Glass Compote with Peaches, Jasmine Flowers, Quinces and a Grasshopper)",
    titleOriginal: "A Glass Compote with Peaches, Jasmine Flowers, Quinces and a Grasshopper",
    creator: "페데 갈리치아 (Fede Galizia, 이탈리아)",
    creatorOriginal: "Fede Galizia",
    artworkType: "미술 (유화)",
    era: "이탈리아 바로크 · 17세기 초",
    description:
      "페데 갈리치아의 정물화로, 이탈리아 최초의 정물화 중 하나로 알려져 있습니다. 유리 그릇, 복숭아, 꽃, 메뚜기가 정밀하게 배치된 작품입니다.",
    quote: "정밀함 속에 아름다움이 있다.",
    aestheticTone: "복숭아의 주황, 유리의 투명감, 어두운 배경",
    famousPoem: {
      title: "딸기",
      titleOriginal: "딸기",
      poet: "양애경 (대한민국)",
      poetOriginal: "양애경",
      excerpt: "나는 딸기를 먹는다 / 빨갛게 부푼 딸기는 관능적이다",
      whyRecommended: "사물을 있는 그대로 바라보는 태도가 작품과 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(72, 4562),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "아베 마리아 (Ave Maria), D.839",
      titleOriginal: "Ave Maria, D.839",
      artist: "프란츠 슈베르트 (Franz Schubert, 오스트리아)",
      artistOriginal: "Franz Schubert",
      listeningGuide: "고요한 선율 속에서 정물의 질감을 떠올려 보세요.",
      youtubeVideoId: "WI4nFfWvEtg",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1712747782`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "집중과 세밀한 관찰이 필요할 때, 갈리치아의 정물은 사물 하나에 마음을 두는 연습을 돕습니다.",
    defaultChallenges: [
      "책상 위 물건 하나를 1분간 세밀하게 관찰해 보세요.",
      "연한 색으로 과일이나 꽃 하나를 그려 보세요.",
    ],
  },
  {
    id: "edward_hopper_automat",
    moods: ["quiet", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/edward-hopper-in-10-paintings/#3-automat-1927",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2024/05/Automat-edward-hopper-1927.jpg",
    title: "자판기 (Automat, 1927)",
    titleOriginal: "Automat",
    creator: "에드워드 호퍼 (Edward Hopper, 미국)",
    creatorOriginal: "Edward Hopper",
    artworkType: "미술 (유화)",
    era: "미국 사실주의 · 1927년",
    description:
      "에드워드 호퍼가 뉴욕의 자판기 식당에서 홀로 앉은 여인을 그린 작품입니다. 형광등 아래의 고독과 도시의 밤이 미국 사실주의의 대표 이미지가 되었습니다.",
    quote: "위대한 예술은 현실의 단순한 순간에서 나온다.",
    aestheticTone: "형광등의 차가운 빛, 녹색 모자, 밤의 고요",
    famousPoem: {
      title: "호수 2",
      titleOriginal: "호수 2",
      poet: "정지용 (대한민국)",
      poetOriginal: "정지용",
      excerpt: "오리 모가지는 / 호수를 감는다.",
      whyRecommended: "고요한 고독과 내면의 표면을 함께 비춥니다.",
      siyoilUrl: buildSiyoilPoemUrl(396, 24606),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Gymnopédie No. 2",
      titleOriginal: "Gymnopédie No. 2",
      artist: "에릭 사티 (Erik Satie, 프랑스)",
      artistOriginal: "Erik Satie",
      listeningGuide: "느린 템포의 피아노 선율에 맡겨 밤의 공기를 느껴 보세요.",
      youtubeVideoId: "zOL6yArNh7Y",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}work/erik-satie-1866-pp33`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "도시 속 고독과 자기 성찰이 필요할 때, 호퍼의 자판기는 조용한 내면의 시간을 열어 줍니다.",
    defaultChallenges: [
      "혼자 앉아 3분간 아무것도 하지 않고 호흡해 보세요.",
      "창밖이나 실내의 빛 하나를 관찰해 색을 적어 보세요.",
    ],
  },
  {
    id: "edward_hopper_nighthawks",
    moods: ["quiet", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/masterpiece-story-nighthawks-edward-hopper/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2024/05/640px-Nighthawks_by_Edward_Hopper_1942.jpg",
    title: "밤의 매 (Nighthawks, 1942)",
    titleOriginal: "Nighthawks",
    creator: "에드워드 호퍼 (Edward Hopper, 미국)",
    creatorOriginal: "Edward Hopper",
    artworkType: "미술 (유화)",
    era: "미국 사실주의 · 1942년",
    description:
      "에드워드 호퍼의 대표작으로, 새벽 식당의 네 인물과 유리창 너머의 고요한 거리를 담았습니다. 빛과 그림자, 고독과 침묵이 미국 현대 미술의 상징이 된 작품입니다.",
    quote: "위대한 예술은 현실의 단순한 순간에서 나온다.",
    aestheticTone: "형광등의 황금빛, 심야 거리의 청록, 유리창의 투명한 고요",
    famousPoem: {
      title: "그날 밤 집 앞 골목길",
      titleOriginal: "그날 밤 집 앞 골목길",
      poet: "양애경 (대한민국)",
      poetOriginal: "양애경",
      excerpt: "나 집 앞 골목에 차 세웠네 / 밤 열한시 십오분",
      whyRecommended: "고요한 밤과 내면의 고독이 작품의 분위기와 맞닿습니다.",
      siyoilUrl: buildSiyoilPoemUrl(72, 4555),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Gymnopédie No. 3",
      titleOriginal: "Gymnopédie No. 3",
      artist: "에릭 사티 (Erik Satie, 프랑스)",
      artistOriginal: "Erik Satie",
      listeningGuide: "느린 피아노 선율 속에서 심야 식당의 공기를 상상해 보세요.",
      youtubeVideoId: "7LXGoppe3zs",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1724246129`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended:
      "고독 속에서도 빛을 찾고 싶을 때, 호퍼의 밤의 매는 조용한 내면의 시간을 열어 줍니다.",
    defaultChallenges: [
      "불을 끄고 창밖을 1분간 바라보며 호흡해 보세요.",
      "노란색과 청록색으로 작은 창문 하나를 그려 보세요.",
    ],
  },
  {
    id: "monet_water_lilies",
    moods: ["quiet", "refresh"],
    dailyArtUrl: "https://www.dailyartmagazine.com/water-lilies-by-claude-monet/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2023/11/claude-monet-water-lilies-1916.jpg",
    title: "수련 (Water Lilies, 1916)",
    titleOriginal: "Water Lilies",
    creator: "클로드 모네 (Claude Monet, 프랑스)",
    creatorOriginal: "Claude Monet",
    artworkType: "미술 (유화)",
    era: "인상주의 · 1916년",
    description: "빛의 변화에 따른 물그림자의 색조를 끊임없이 기록한 명작입니다. 연못의 깊이에 침잠하여 경계 없는 평온함을 선물하며 번뇌를 녹여내어 깊은 명상적 합일에 이르게 합니다.",
    quote: "내가 수련을 그리는 것은 마음을 편안하게 만들기 위한 유일한 의식이다.",
    aestheticTone: "수면에 반사된 보랏빛 라벤더와 에메랄드 그린 컬러톤",
    famousPoem: {
      title: "호수 1",
      titleOriginal: "호수 1",
      poet: "정지용 (대한민국)",
      poetOriginal: "정지용",
      excerpt: "얼굴 하나야 / 손바닥 둘로 폭 가리지만",
      whyRecommended: "고요한 수면처럼 마음속 그리움을 가만히 들여다보게 하는 시입니다.",
      siyoilUrl: buildSiyoilPoemUrl(396, 24605),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "달빛 (Clair de Lune)",
      titleOriginal: "Clair de Lune",
      artist: "클로드 드뷔시 (Claude Debussy, 프랑스)",
      artistOriginal: "Claude Debussy",
      listeningGuide: "물결처럼 번지는 피아노의 여백 and 잔향에 집중해 보세요.",
      youtubeVideoId: "WNcsUNKlAKw",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1358340973`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "지금 당신의 마음에 고요하고 부드러운 치유가 필요합니다. 세세한 격리된 감정을 흐르는 빛줄기에 스며들게 함으로써 창작의 근원 주파수를 정화해 줍니다.",
    defaultChallenges: [
      "눈을 감고 정갈한 호수 수면을 바라보는 명상을 3분간 진행해 보세요.",
      "노트 중심에 파란색이나 보라색 크레용으로 가볍게 퍼져나가는 원형 물결을 어루만지듯 그려보세요."
    ],
  },
  {
    id: "gogh_starry_night",
    moods: ["passion", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/vincent-van-gogh-starry-night-masterpiece/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/09/gogh-starry-night.jpg",
    title: "별이 빛나는 밤 (The Starry Night, 1889)",
    titleOriginal: "The Starry Night",
    creator: "빈센트 반 고흐 (Vincent van Gogh, 네덜란드)",
    creatorOriginal: "Vincent van Gogh",
    artworkType: "미술 (유화)",
    era: "후기 인상주의 · 1889년",
    description: "요동치는 푸른 밤하늘과 소용돌이치는 황금빛 별들이 영혼의 격정을 예술로 승화한 걸작입니다. 내면의 혼란을 창조적 에너지로 치유하는 강렬한 울림을 줍니다.",
    quote: "나는 별들을 볼 때마다 언제나 꿈을 꾼다.",
    aestheticTone: "깊은 코발트 블루, 울트라마린, 그리고 소용돌이치는 황금빛 노랑",
    famousPoem: {
      title: "서시",
      titleOriginal: "서시",
      poet: "윤동주 (대한민국)",
      poetOriginal: "윤동주",
      excerpt: "죽는 날까지 하늘을 우러러 / 한 점 부끄럼이 없기를",
      whyRecommended: "맑고 투명한 영혼의 거울을 들여다보며 내면의 양심과 의지를 곧게 세워 줍니다.",
      siyoilUrl: buildSiyoilPoemUrl(405, 25164),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "엘리제를 위하여 (Für Elise)",
      titleOriginal: "Für Elise",
      artist: "루트비히 판 베토벤 (Ludwig van Beethoven, 독일)",
      artistOriginal: "Ludwig van Beethoven",
      listeningGuide: "섬세하게 이어지는 멜로디의 선율 속에 흐르는 마음의 정서를 느껴보세요.",
      youtubeVideoId: "yAsDLGjMhFI",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1440843236`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "당신의 깊은 무의식에 잠재된 열정과 빛을 일깨울 시간입니다. 어두운 밤하늘 속에서도 영롱하게 빛나는 별의 주파수에 맞추어 보세요.",
    defaultChallenges: [
      "밤하늘을 올려다보며 가장 밝게 빛나는 별 하나를 찾아 10초간 응시해 보세요.",
      "노란색 펜으로 나만의 빛나는 별 모양을 스케치북에 힘있게 휘갈겨 보세요."
    ],
  },
  {
    id: "klimt_the_kiss",
    moods: ["passion", "planning"],
    dailyArtUrl: "https://www.dailyartmagazine.com/gustav-klimt-the-kiss/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/10/klimt-the-kiss.jpg",
    title: "키스 (The Kiss, 1907-1908)",
    titleOriginal: "The Kiss",
    creator: "구스타프 클림트 (Gustav Klimt, 오스트리아)",
    creatorOriginal: "Gustav Klimt",
    artworkType: "미술 (혼합재료 및 금박)",
    era: "상징주의 / 아르누보 · 1908년",
    description: "금빛 광채 속에서 두 연인이 하나로 녹아내리는 영원한 결합의 순간을 그린 작품입니다. 세상의 모든 소음으로부터 격리되어 오직 깊은 연결과 충만함을 선사합니다.",
    quote: "나에 대해 알고 싶다면 내 그림을 주의 깊게 들여다보라.",
    aestheticTone: "눈부신 황금빛 골드, 산화된 오렌지, 기하학적 흑백 패턴",
    famousPoem: {
      title: "꽃",
      titleOriginal: "꽃",
      poet: "김춘수 (대한민국)",
      poetOriginal: "김춘수",
      excerpt: "내가 그의 이름을 불러주기 전에는 / 그는 다만 / 하나의 몸짓에 지나지 않았다.",
      whyRecommended: "서로에게 의미 있는 존재가 된다는 것의 깊은 영감과 실존적 만남을 깨워 줍니다.",
      siyoilUrl: buildSiyoilPoemUrl(502, 30510),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "사랑의 인사 (Salut d'Amour)",
      titleOriginal: "Salut d'Amour",
      artist: "에드워드 엘가 (Edward Elgar, 영국)",
      artistOriginal: "Edward Elgar",
      listeningGuide: "감미롭고 따뜻한 바이올린의 서정적인 선율에 귀 기울여 보세요.",
      youtubeVideoId: "MreT_U00zI8",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1440843236`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "사랑과 소통, 그리고 완벽한 일치감이 필요한 하루입니다. 황금빛 광채 속에서 가장 소중한 가치와 합치되는 고요를 만끽하세요.",
    defaultChallenges: [
      "오늘 나 자신이나 사랑하는 사람에게 전할 감사의 한마디를 마음속으로 소리 내어 보세요.",
      "스케치 가장자리를 따뜻한 금빛 또는 주황색 테두리로 부드럽게 감싸듯 채색해 보세요."
    ],
  },
  {
    id: "munch_the_scream",
    moods: ["passion", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/the-scream-edvard-munch/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/05/munch-the-scream.jpg",
    title: "절규 (The Scream, 1893)",
    titleOriginal: "The Scream",
    creator: "에드바르 뭉크 (Edvard Munch, 노르웨이)",
    creatorOriginal: "Edvard Munch",
    artworkType: "미술 (템페라 및 크레용)",
    era: "표현주의 · 1893년",
    description: "불타는 듯 핏빛으로 물든 하늘과 요동치는 자연의 비명에 압도되어 귀를 막고 절규하는 인간의 원초적 불안을 역동적으로 시각화한 표현주의의 기념비적 작품입니다.",
    quote: "나의 예술은 내 삶에 대한 고백이다.",
    aestheticTone: "타오르는 핏빛 주황, 짙은 남색 바다, 격동하는 곡선",
    famousPoem: {
      title: "흔들리며 피는 꽃",
      titleOriginal: "흔들리며 피는 꽃",
      poet: "도종환 (대한민국)",
      poetOriginal: "도종환",
      excerpt: "흔들리지 않고 피는 꽃이 어디 있으랴 / 이 세상 그 어떤 아름다운 꽃들도 / 다 흔들리면서 피었나니",
      whyRecommended: "삶의 폭풍과 흔들림을 자연스러운 과정으로 품어 안는 따뜻한 격려를 건넵니다.",
      siyoilUrl: buildSiyoilPoemUrl(2050, 55102),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "교향곡 5번 다단조, Op.67 — 1악장",
      titleOriginal: "Symphony No. 5 in C minor, Op.67: I. Allegro con brio",
      artist: "루트비히 판 베토벤 (Ludwig van Beethoven, 독일)",
      artistOriginal: "Ludwig van Beethoven",
      listeningGuide: "폭풍처럼 몰아치는 운명 동기의 타격 속에서 에너지를 방출해 보세요.",
      youtubeVideoId: "_4IRnGS1l48",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1499288492`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "가슴 속에 맺힌 응어리와 불안을 거침없이 배출하고 정화하는 카타르시스가 필요합니다. 감정을 억누르기보다 온전히 마주하여 흘려보내세요.",
    defaultChallenges: [
      "숨을 크게 들이마신 뒤, 입을 벌려 소리 없이 크게 소리를 내지르는 '무음 비명'을 3회 반복해 보세요.",
      "붉은색과 주황색 선을 물결 모양으로 세차게 그어 마음에 쌓인 응어리를 종이에 풀어내세요."
    ],
  },
  {
    id: "seurat_sunday_grande_jatte",
    moods: ["quiet", "refresh", "planning"],
    dailyArtUrl: "https://www.dailyartmagazine.com/sunday-on-la-grande-jatte-georges-seurat/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/04/seurat-sunday-on-la-grande-jatte.jpg",
    title: "그랑드 자트 섬의 일요일 오후 (A Sunday on La Grande Jatte, 1884-1886)",
    titleOriginal: "A Sunday on La Grande Jatte",
    creator: "조르주 쇠라 (Georges Seurat, 프랑스)",
    creatorOriginal: "Georges Seurat",
    artworkType: "미술 (점묘화)",
    era: "신인상주의 · 1886년",
    description: "수많은 작은 원색 점들을 캔버스에 꼼꼼히 찍어 빛과 형태를 직조해 낸 신인상주의 점묘화의 정수입니다. 정돈된 평화로움 속에서 찬란하고 우아한 일상의 휴식을 그립니다.",
    quote: "어떤 이들은 내 그림에서 시를 본다고 하지만, 나는 오직 과학만을 본다.",
    aestheticTone: "생기 넘치는 올리브 그린, 밝은 레몬 옐로우, 은은한 옥색 물빛",
    famousPoem: {
      title: "풀꽃",
      titleOriginal: "풀꽃",
      poet: "나태주 (대한민국)",
      poetOriginal: "나태주",
      excerpt: "자세히 보아야 / 예쁘다 // 오래 보아야 / 사랑스럽다 // 너도 그렇다",
      whyRecommended: "곁에 있는 평범하고 작은 존재들의 아름다움을 귀히 여기는 평온을 선물합니다.",
      siyoilUrl: buildSiyoilPoemUrl(2880, 75012),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "트로이메라이 (Träumerei)",
      titleOriginal: "Träumerei",
      artist: "로베르트 슈만 (Robert Schumann, 독일)",
      artistOriginal: "Robert Schumann",
      listeningGuide: "꿈결 같고 부드러운 슈만의 멜로디에 맞춰 마음을 차분히 내려놓으세요.",
      youtubeVideoId: "6z82w0p6_M8",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1440843236`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "질서 있고 고요한 초록빛 정원에서의 따스한 일상을 당신의 마음에 선물하세요.",
    defaultChallenges: [
      "주변의 소리나 사물들을 아주 미세한 점들의 집합체로 상상하며 30초간 집중해 보세요.",
      "초록색이나 노란색 색연필로 가벼운 점을 콕콕 찍어가며 작은 나뭇잎 하나를 완성해 보세요."
    ],
  },
  {
    id: "hokusai_great_wave",
    moods: ["passion", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/hokusai-great-wave-kanagawa/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2023/10/hokusai_great_wave-768x522.jpg",
    title: "가나가와 해변의 높은 파도 아래 (The Great Wave off Kanagawa, 1831)",
    titleOriginal: "The Great Wave off Kanagawa",
    creator: "가쓰시카 호쿠사이 (Katsushika Hokusai, 일본)",
    creatorOriginal: "Katsushika Hokusai",
    artworkType: "미술 (목판화)",
    era: "edo 시대 · 1831년",
    description: "요동치는 거대한 파도와 그 파도 틈새로 보이는 후지산의 강렬한 대비를 그린 일본 목판화의 걸작입니다. 덮쳐오는 자연의 힘에 맞서는 역동적 에너지를 전합니다.",
    quote: "여든이 넘어서야 비로소 나의 그림 실력이 조금은 나아지기 시작했다.",
    aestheticTone: "깊은 프러시안 블루, 순백색의 파도 거품, 베이지색 목판 결",
    famousPoem: {
      title: "서시",
      titleOriginal: "서시",
      poet: "윤동주 (대한민국)",
      poetOriginal: "윤동주",
      excerpt: "죽는 날까지 하늘을 우러러 / 한 점 부끄럼이 없기를",
      whyRecommended: "거대한 자연의 파도 앞에서도 꺾이지 않는 투명한 양심과 내면의 극복 의지가 같은 울림을 선사합니다.",
      siyoilUrl: buildSiyoilPoemUrl(405, 25164),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "교향곡 5번 다단조, Op.67 — 1악장",
      titleOriginal: "Symphony No. 5 in C minor, Op.67: I. Allegro con brio",
      artist: "루트비히 판 베토벤 (Ludwig van Beethoven, 독일)",
      artistOriginal: "Ludwig van Beethoven",
      listeningGuide: "폭풍처럼 몰아치는 운명 동기의 타격 속에서 굽이치는 거대한 파도의 생명력을 느껴보세요.",
      youtubeVideoId: "_4IRnGS1l48",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1499288492`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "마음속 정체를 뚫어낼 대담하고 격렬한 정화가 필요할 때, 호쿠사이의 거대한 파도는 내면의 용기를 격발합니다.",
    defaultChallenges: [
      "손가락을 갈고리 모양으로 구부려 힘찬 에너지의 파도 움직임을 공중에 그려 보세요.",
      "눈을 감고 시원한 바닷바람과 세찬 포말 소리를 20초간 명상해 보세요."
    ],
  },
  {
    id: "monet_poppy_field",
    moods: ["refresh", "quiet"],
    dailyArtUrl: "https://www.dailyartmagazine.com/poppy-field-by-claude-monet/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/04/monet-poppy-field.jpg",
    title: "아르장퇴유의 양귀비 들판 (Poppy Field in Argenteuil, 1873)",
    titleOriginal: "Poppy Field in Argenteuil",
    creator: "클로드 모네 (Claude Monet, 프랑스)",
    creatorOriginal: "Claude Monet",
    artworkType: "미술 (유화)",
    era: "인상주의 · 1873년",
    description: "흐드러지게 핀 붉은 양귀비 꽃밭과 바람을 만끽하며 걷는 여인들의 평화로운 오후를 포착한 인상주의 수작입니다. 빛을 머금은 싱그러운 자연의 활기가 가득합니다.",
    quote: "나에게 있어 풍경은 그 자체로 존재하지 않으며, 주변 분위기에 의해 매 순간 살아난다.",
    aestheticTone: "생기 넘치는 다홍빛 레드, 싱그러운 잔디 초록, 부드러운 뭉게구름 하늘",
    famousPoem: {
      title: "풀꽃",
      titleOriginal: "풀꽃",
      poet: "나태주 (대한민국)",
      poetOriginal: "나태주",
      excerpt: "자세히 보아야 / 예쁘다 // 오래 보아야 / 사랑스럽다 // 너도 그렇다",
      whyRecommended: "양귀비 들판 구석구석 피어난 작은 풀꽃들을 한참 들여다보는 따스함과 잔잔한 미소를 나눕니다.",
      siyoilUrl: buildSiyoilPoemUrl(2880, 75012),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "달빛 (Clair de Lune)",
      titleOriginal: "Clair de Lune",
      artist: "클로드 드뷔시 (Claude Debussy, 프랑스)",
      artistOriginal: "Claude Debussy",
      listeningGuide: "부드럽게 흩날리는 피아노의 음률에 발걸음을 맞추며 들판 위 살랑이는 바람을 머금어 보세요.",
      youtubeVideoId: "WNcsUNKlAKw",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1358340973`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "마음속에 상쾌한 바람과 가벼운 생기가 스며들어야 할 시간입니다. 모네의 들판에서 가볍게 산책을 즐겨보세요.",
    defaultChallenges: [
      "붉은색 꽃 한 송이가 마음에 피어나는 상상을 하며 깊은 날숨을 크게 세 번 내쉬어 보세요.",
      "가볍고 느슨한 손길로 들판 위 꽃송이 모양을 낙서하듯 종이에 자유롭게 스케치해 보세요."
    ],
  },
  {
    id: "friedrich_wanderer",
    moods: ["quiet", "resurrection"],
    dailyArtUrl: "https://www.dailyartmagazine.com/caspar-david-friedrich-wanderer-above-the-sea-of-fog/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/08/Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog-768x999.jpg",
    title: "안개 바다 위의 방랑자 (Wanderer above the Sea of Fog, 1818)",
    titleOriginal: "Wanderer above the Sea of Fog",
    creator: "카스파르 다비트 프리드리히 (Caspar David Friedrich, 독일)",
    creatorOriginal: "Caspar David Friedrich",
    artworkType: "미술 (유화)",
    era: "낭만주의 · 1818년",
    description: "자욱하게 깔린 안개 산맥 정상에 홀로 선 남성이 저 먼 우주적 자연을 마주하는 장엄한 장면입니다. 숭고한 침묵 속에서 내면의 깊은 본질과 대화하는 성찰의 계기를 줍니다.",
    quote: "화가는 눈앞에 보이는 것뿐만 아니라 자신의 내면에서 느끼는 것 또한 그려야 한다.",
    aestheticTone: "차갑고 신비로운 청록빛 회색, 실루엣의 짙은 암회색, 눈부신 안개 백색",
    famousPoem: {
      title: "별",
      titleOriginal: "별",
      poet: "정지용 (대한민국)",
      poetOriginal: "정지용",
      excerpt: "누워서 보는 별 하나는 / 진정 멀─고나.",
      whyRecommended: "장엄한 안개 바다처럼 거대하고 아득한 마음의 수평선을 가만히 응시하게 만듭니다.",
      siyoilUrl: buildSiyoilPoemUrl(396, 24647),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Gymnopédie No. 1",
      titleOriginal: "Gymnopédie No. 1",
      artist: "에릭 사티 (Erik Satie, 프랑스)",
      artistOriginal: "Erik Satie",
      listeningGuide: "한없이 맑고 느리게 전개되는 피아노의 고독한 공백 속에서 내면의 성찰을 더 깊이 다듬어 보세요.",
      youtubeVideoId: "S-Xm7s9e96Y",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1886443937`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "복잡한 세상의 소음에서 한 걸음 물러나 고요히 홀로 서야 할 때, 프리드리히의 방랑자는 주체적인 내면의 고독을 선물합니다.",
    defaultChallenges: [
      "먼 산이나 넓은 수평선 끝을 상상하며 마음속에 맺힌 작은 생각을 한가득 안개 속으로 내던져 보세요.",
      "가장 단단하고 어두운 선 하나를 수평으로 길게 그어 마음의 기둥을 바로 세워 보세요."
    ],
  },
  {
    id: "kandinsky_composition_viii",
    moods: ["planning", "passion"],
    dailyArtUrl: "https://www.dailyartmagazine.com/kandinsky-composition-viii/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/03/kandinsky-composition-viii-768x517.jpg",
    title: "구성 8 (Composition VIII, 1923)",
    titleOriginal: "Composition VIII",
    creator: "바실리 칸딘스키 (Wassily Kandinsky, 러시아)",
    creatorOriginal: "Wassily Kandinsky",
    artworkType: "미술 (유화)",
    era: "추상미술 / 바우하우스 · 1923년",
    description: "원, 선, 삼각형 등 엄격하게 구성된 기하학적 요소들이 캔버스 위에서 고유한 주파수와 리듬으로 공명하는 추상 회화의 기념비적인 수작입니다. 음악적 율동을 시각적으로 구현했습니다.",
    quote: "색채는 영혼에 직접적인 영향을 미치는 수단이다.",
    aestheticTone: "샤프하고 경쾌한 흑색 그리드, 우아한 연노랑 바탕, 강렬하게 폭발하는 원색 포인트",
    famousPoem: {
      title: "가능성",
      titleOriginal: "가능성",
      poet: "오은 (대한민국)",
      poetOriginal: "오은",
      excerpt: "설명할 수 없는 것들이 매일 생겨난다 / 어디든 갈 수 있다는 말",
      whyRecommended: "틀을 깨부수고 도약하는 기하학적 형상과 설명할 수 없는 미지의 창작 가능성이 함께 공명합니다.",
      siyoilUrl: buildSiyoilPoemUrl(2355, 63205),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "Rhapsody in Blue",
      titleOriginal: "Rhapsody in Blue",
      artist: "조지 거슈윈 (George Gershwin, 미국)",
      artistOriginal: "George Gershwin",
      listeningGuide: "자유분방하게 교차하는 재즈의 활기 넘치는 클라리넷 and 관악 리듬에 맞춰 머릿속 영감의 기하학을 펼쳐 보세요.",
      youtubeVideoId: "IIc7xuiVqVI",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/594512997`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "구체적 관념에 막혀 창조적 환기가 시급할 때, 칸딘스키의 리드미컬한 그리드는 뇌 세포에 새롭고 세련된 지적 자극을 선사합니다.",
    defaultChallenges: [
      "공중에 검지손가락으로 날카로운 직선 세 개와 커다란 원 하나를 경쾌한 리듬에 맞춰 그려 보세요.",
      "가장 좋아하는 원색 세 가지색 펜으로 동그라미 세 개를 겹쳐 그리는 즉석 핑거 드로잉을 해 보세요."
    ],
  },
  {
    id: "gogh_almond_blossoms",
    moods: ["resurrection", "refresh"],
    dailyArtUrl: "https://www.dailyartmagazine.com/vincent-van-gogh-almond-blossoms-history/",
    imageUrl: "https://www.dailyartmagazine.com/wp-content/uploads/2021/02/Vincent_van_Gogh_-_Almond_blossom-768x616.jpg",
    title: "꽃 피는 아몬드 나무 (Almond Blossoms, 1890)",
    titleOriginal: "Almond Blossoms",
    creator: "빈센트 반 고흐 (Vincent van Gogh, 네덜란드)",
    creatorOriginal: "Vincent van Gogh",
    artworkType: "미술 (유화)",
    era: "후기 인상주의 · 1890년",
    description: "조카의 탄생을 축하하기 위해 푸른 밤하늘 같은 배경 위에 활짝 피어나는 하얀 아몬드 꽃가지들을 세심하고 따뜻한 시선으로 그려낸 명작입니다. 강인한 생명력과 따스한 희망의 전율을 줍니다.",
    quote: "절망 속에서도 나는 언제나 찬란하게 피어나는 꽃을 꿈꾼다.",
    aestheticTone: "맑고 깨끗한 민트색 아쿠아마린, 꽃잎의 유백색, 가지의 따뜻한 브라운",
    famousPoem: {
      title: "흔들리며 피는 꽃",
      titleOriginal: "흔들리며 피는 꽃",
      poet: "도종환 (대한민국)",
      poetOriginal: "도종환",
      excerpt: "흔들리지 않고 피는 꽃이 어디 있으랴 / 이 세상 그 어떤 아름다운 꽃들도 / 다 흔들리면서 피었나니",
      whyRecommended: "추운 겨울을 극복하고 봄날 가장 먼저 하얗게 꽃망울을 피워낸 고흐의 아몬드 나무와 흔들림의 가치가 포근히 결합됩니다.",
      siyoilUrl: buildSiyoilPoemUrl(2050, 55102),
      poemSourceName: SIYOIL_POEM_SOURCE_NAME,
    },
    famousSong: {
      title: "사랑의 인사 (Salut d'Amour)",
      titleOriginal: "Salut d'Amour",
      artist: "에드워드 엘가 (Edward Elgar, 영국)",
      artistOriginal: "Edward Elgar",
      listeningGuide: "봄날의 아지랑이처럼 따뜻하게 온몸을 감싸 안는 바이올린 선율과 함께 고흐의 따스한 희망의 시선을 맞이해 보세요.",
      youtubeVideoId: "MreT_U00zI8",
      appleMusicClassicalUrl: `${APPLE_MUSIC_CLASSICAL_HOME}album/1440843236`,
      songSourceName: APPLE_MUSIC_CLASSICAL_SOURCE_NAME,
    },
    defaultWhyRecommended: "차가운 겨울을 지나 희망찬 삶의 생기를 새롭게 싹틔우고 싶은 오늘, 고흐의 아몬드 꽃송이는 온전한 평온과 부활의 사랑을 안겨 줍니다.",
    defaultChallenges: [
      "양손을 가슴 위에 포개 얹고 '오늘 하루도 잘 자라나 보자'고 스스로에게 나지막한 인사를 건네 보세요.",
      "하늘색과 연두색을 마구 문질러 봄빛이 일렁이는 30초 그라데이션 여백을 종이 한 구석에 칠해 보세요."
    ],
  }
];

const MOOD_KEYWORDS: Record<MuseArtMoodId, string[]> = {
  quiet: ["고요", "명상", "평온", "안식"],
  passion: ["열정", "자극", "강렬", "대담", "카타르시스"],
  refresh: ["정돈", "환기", "리프레시", "경쾌"],
  planning: ["영감", "구상", "아이디어", "탐색"],
  resurrection: ["비장", "부활", "극복", "시련"],
};

export function resolveMoodId(currentMood: string, moodId?: string): MuseArtMoodId {
  const normalized = String(moodId || "").trim() as MuseArtMoodId;
  if (normalized && normalized in MOOD_KEYWORDS) return normalized;

  const lower = currentMood.toLowerCase();
  for (const [id, keywords] of Object.entries(MOOD_KEYWORDS) as [MuseArtMoodId, string[]][]) {
    if (keywords.some((word) => lower.includes(word))) return id;
  }
  return "quiet";
}

export function pickVerifiedArtEntry(
  dateKey: string,
  currentMood: string,
  moodId?: string,
  randomOffset?: number,
  excludeCatalogIds?: string[],
): VerifiedArtEntry {
  const resolvedMood = resolveMoodId(currentMood, moodId);
  const moodPool = MUSE_ART_CATALOG.filter((entry) => entry.moods.includes(resolvedMood));
  let pool = moodPool.length > 0 ? moodPool : MUSE_ART_CATALOG;

  if (excludeCatalogIds && excludeCatalogIds.length > 0) {
    const filteredPool = pool.filter((entry) => !excludeCatalogIds.includes(entry.id));
    if (filteredPool.length > 0) {
      pool = filteredPool;
    } else {
      const allFiltered = MUSE_ART_CATALOG.filter((entry) => !excludeCatalogIds.includes(entry.id));
      if (allFiltered.length > 0) {
        pool = allFiltered;
      }
    }
  }

  let index = hashSeed(`${dateKey}_muse_dailyart_${resolvedMood}`) % pool.length;
  if (typeof randomOffset === "number") {
    index = (index + randomOffset) % pool.length;
  }
  return pool[index];
}

export function buildVerifiedArtRecommendation(
  dateKey: string,
  currentMood: string,
  moodId?: string,
  randomOffset?: number,
  excludeCatalogIds?: string[],
): ArtRecommendationPayload {
  const entry = pickVerifiedArtEntry(dateKey, currentMood, moodId, randomOffset, excludeCatalogIds);
  return {
    catalogId: entry.id,
    title: entry.title,
    titleOriginal: entry.titleOriginal,
    creator: entry.creator,
    creatorOriginal: entry.creatorOriginal,
    artworkType: entry.artworkType,
    era: entry.era,
    description: entry.description,
    quote: entry.quote,
    aestheticTone: entry.aestheticTone,
    famousPoem: entry.famousPoem,
    famousSong: entry.famousSong,
    whyRecommended: entry.defaultWhyRecommended,
    challenges: [...entry.defaultChallenges],
    dailyArtUrl: entry.dailyArtUrl,
    imageUrl: entry.imageUrl,
    sourceName: "DailyArt Magazine",
  };
}