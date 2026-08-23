import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Palette, 
  Music, 
  BookOpen, 
  Heart, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  Feather, 
  ChevronRight, 
  Check, 
  Copy, 
  FileText,
  Maximize2,
  Download,
} from "lucide-react";
import { ImageOutputActions, downloadImage } from "@/components/ImageOutputActions";
import { auth, db, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "@/lib/firebase";
import { getTodayDateKey, getDateSeed, isSameDayString, pickDailySeededItem } from "@/lib/dailyCache";
import { MuseDocentAudio } from "@/components/muse/MuseDocentAudio";
import { buildPoemGoogleArtsAndCultureSearchUrl, buildArtworkGoogleArtsAndCultureSearchUrl, buildPoemFullTextSearchQuery, buildPoemGoogleAiSearchUrl } from "@/utils/artSearchQuery";
import { lookupCatalogDailyArtUrl, resolveArtworkDailyArtUrl } from "@/lib/museDailyArt";
import { MuseSongYouTubePlayer } from "@/components/muse/MuseSongYouTubePlayer";
import {
  resolveArtworkImage,
  buildPollinationsArtUrl,
  type ArtworkImageSource,
} from "@/utils/artworkImage";

interface FamousPoem {
  title: string;
  titleOriginal?: string;
  poet: string;
  poetOriginal?: string;
  excerpt: string;
  whyRecommended: string;
  siyoilUrl?: string;
  poemSourceName?: string;
}

interface FamousSong {
  title: string;
  titleOriginal?: string;
  artist: string;
  artistOriginal?: string;
  listeningGuide: string;
  youtubeVideoId?: string;
  appleMusicClassicalUrl?: string;
  songSourceName?: string;
}

interface ArtRecommendation {
  title: string;
  titleOriginal?: string;
  creator: string;
  creatorOriginal?: string;
  artworkType: string;
  era: string;
  description: string;
  whyRecommended: string;
  challenges: string[];
  aestheticTone: string;
  quote: string;
  catalogId?: string;
  dailyArtUrl?: string;
  imageUrl?: string;
  sourceName?: string;
  famousPoem?: FamousPoem;
  famousSong?: FamousSong;
}

const DAILY_POEM_SONG_FALLBACKS: Array<{ famousPoem: FamousPoem; famousSong: FamousSong }> = [
  {
    famousPoem: {
      title: "호수 1",
      titleOriginal: "호수 1",
      poet: "정지용 (대한민국)",
      poetOriginal: "정지용",
      excerpt: "얼굴 하나야 / 손바닥 둘로 폭 가리지만",
      whyRecommended: "고요한 수면처럼 마음속 그리움을 가만히 들여다보게 하는 시입니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=396&subcontentid=24605",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "달빛 (Clair de Lune)",
      titleOriginal: "Clair de Lune",
      artist: "클로드 드뷔시",
      artistOriginal: "Claude Debussy",
      listeningGuide: "물결처럼 번지는 피아노의 여백과 잔향에 집중해 보세요.",
      youtubeVideoId: "WNcsUNKlAKw",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1358340973",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "조용하게, 강으로, 그러다 흐르라",
      titleOriginal: "조용하게, 강으로, 그러다 흐르라",
      poet: "김용택 (대한민국)",
      poetOriginal: "김용택",
      excerpt: "사람들 속에서 조용하게, 강으로, 그러다 흐르라.",
      whyRecommended: "흔들림 속에서도 자신의 중심과 순수한 의지를 다시 세우게 합니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=2515&subcontentid=69084",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "교향곡 5번 다단조, Op.67",
      titleOriginal: "Symphony No. 5 in C minor, Op. 67",
      artist: "루트비히 판 베토벤",
      artistOriginal: "Ludwig van Beethoven",
      listeningGuide: "운명 동기가 절망을 뚫고 승리의 리듬으로 변화하는 과정을 따라가 보세요.",
      youtubeVideoId: "_4IRnGS1l48",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1499288492",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "몰라서 좋아요",
      titleOriginal: "몰라서 좋아요",
      poet: "오은 (대한민국)",
      poetOriginal: "오은",
      excerpt: "모르는 감정이 싹텄다 / 몰라서 설레고",
      whyRecommended: "자신만의 창작 방향을 선택할 용기와 긴 호흡을 일깨워 줍니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=2355&subcontentid=63217",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "무반주 첼로 모음곡 1번 프렐류드",
      titleOriginal: "Cello Suite No. 1 in G major, BWV 1007: Prelude",
      artist: "요한 제바스티안 바흐",
      artistOriginal: "Johann Sebastian Bach",
      listeningGuide: "한 줄의 선율이 질서와 자유를 동시에 만들어내는 흐름에 집중해 보세요.",
      youtubeVideoId: "1prwe0WcGY8",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1398580507",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "서시",
      titleOriginal: "서시",
      poet: "윤동주 (대한민국)",
      poetOriginal: "윤동주",
      excerpt: "죽는 날까지 하늘을 우러러 / 한 점 부끄럼이 없기를",
      whyRecommended: "맑고 투명한 영혼의 거울을 들여다보며 내면의 양심과 의지를 곧게 세워 줍니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=405&subcontentid=25164",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "엘리제를 위하여 (Für Elise)",
      titleOriginal: "Für Elise",
      artist: "루트비히 판 베토벤",
      artistOriginal: "Ludwig van Beethoven",
      listeningGuide: "섬세하게 이어지는 멜로디의 선율 속에 흐르는 마음의 정서를 느껴보세요.",
      youtubeVideoId: "yAsDLGjMhFI",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1440843236",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "진달래꽃",
      titleOriginal: "진달래꽃",
      poet: "김소월 (대한민국)",
      poetOriginal: "김소월",
      excerpt: "나 보기가 역겨워 / 가실 때에는",
      whyRecommended: "떠나보냄 속에서도 피어나는 지극한 사랑과 애절함의 미학을 전합니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=10&subcontentid=612",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "G선상의 아리아 (Air on the G String)",
      titleOriginal: "Air on the G String",
      artist: "요한 제바스티안 바흐",
      artistOriginal: "Johann Sebastian Bach",
      listeningGuide: "장엄하고도 깊은 울림의 첼로 선율에 맞춰 조용히 호흡해 보세요.",
      youtubeVideoId: "FZ_E_vL-Pj4",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1545642456",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "꽃",
      titleOriginal: "꽃",
      poet: "김춘수 (대한민국)",
      poetOriginal: "김춘수",
      excerpt: "내가 그의 이름을 불러주기 전에는 / 그는 다만 / 하나의 몸짓에 지나지 않았다.",
      whyRecommended: "서로에게 의미 있는 존재가 된다는 것의 깊은 영감과 실존적 만남을 깨워 줍니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=502&subcontentid=30510",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "사랑의 인사 (Salut d'Amour)",
      titleOriginal: "Salut d'Amour",
      artist: "에드워드 엘가",
      artistOriginal: "Edward Elgar",
      listeningGuide: "감미롭고 따뜻한 바이올린의 서정적인 선율에 귀 기울여 보세요.",
      youtubeVideoId: "MreT_U00zI8",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1440843236",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "흔들리며 피는 꽃",
      titleOriginal: "흔들리며 피는 꽃",
      poet: "도종환 (대한민국)",
      poetOriginal: "도종환",
      excerpt: "흔들리지 않고 피는 꽃이 어디 있으랴 / 이 세상 그 어떤 아름다운 꽃들도 / 다 흔들리면서 피었나니",
      whyRecommended: "삶의 폭풍과 흔들림을 자연스러운 과정으로 품어 안는 따뜻한 격려를 건넵니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=2050&subcontentid=55102",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "캐논 변주곡 (Canon in D)",
      titleOriginal: "Canon in D",
      artist: "요한 파헬벨",
      artistOriginal: "Johann Pachelbel",
      listeningGuide: "반복되고 점층적으로 확장되는 캐논의 평화로운 선율을 따라가 보세요.",
      youtubeVideoId: "H10vY9PZpx8",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1440843236",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "사평역에서",
      titleOriginal: "사평역에서",
      poet: "곽재구 (대한민국)",
      poetOriginal: "곽재구",
      excerpt: "막차는 좀처럼 오지 않았다 / 대합실 밖에는 밤새 송이눈이 쌓이고",
      whyRecommended: "추운 겨울 대합실처럼 아득하고 아늑한 기다림 속에서 인생의 낭만을 반추합니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=2001&subcontentid=54001",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "녹턴 Op.9 No.2 (Nocturne)",
      titleOriginal: "Nocturne in E-flat major, Op. 9, No. 2",
      artist: "프레데리크 쇼팽",
      artistOriginal: "Frédéric Chopin",
      listeningGuide: "밤의 감성을 깨우는 서정적이고 감미로운 피아노 선율에 몰입해 보세요.",
      youtubeVideoId: "9E6b3swgX-g",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1440843236",
      songSourceName: "Apple Music Classical",
    },
  },
  {
    famousPoem: {
      title: "풀꽃",
      titleOriginal: "풀꽃",
      poet: "나태주 (대한민국)",
      poetOriginal: "나태주",
      excerpt: "자세히 보아야 / 예쁘다 // 오래 보아야 / 사랑스럽다 // 너도 그렇다",
      whyRecommended: "곁에 있는 평범하고 작은 존재들의 아름다움을 귀히 여기는 평온을 선물합니다.",
      siyoilUrl: "https://www.siyoillib.com/PoemViewer?contentid=2880&subcontentid=75012",
      poemSourceName: "시요일 라이브러리",
    },
    famousSong: {
      title: "트로이메라이 (Träumerei)",
      titleOriginal: "Träumerei",
      artist: "로베르트 슈만",
      artistOriginal: "Robert Schumann",
      listeningGuide: "꿈결 같고 부드러운 슈만의 멜로디에 맞춰 마음을 차분히 내려놓으세요.",
      youtubeVideoId: "6z82w0p6_M8",
      appleMusicClassicalUrl: "https://classical.music.apple.com/kr/album/1440843236",
      songSourceName: "Apple Music Classical",
    },
  },
];

interface ArtFallbackEntry {
  title: string;
  titleOriginal?: string;
  creator: string;
  creatorOriginal?: string;
  artworkType: string;
  era: string;
  description: string;
  whyRecommended: string;
  challenges: string[];
  aestheticTone: string;
  quote: string;
  dailyArtUrl?: string;
}

const DAILY_ART_FALLBACKS: ArtFallbackEntry[] = [
  {
    title: "수련 (Water Lilies, 1916)",
    titleOriginal: "Water Lilies",
    creator: "클로드 모네 (Claude Monet, 프랑스)",
    creatorOriginal: "Claude Monet",
    artworkType: "미술 (유화)",
    era: "인상주의 · 1916년",
    description: "빛의 변화에 따른 물그림자의 색조를 끊임없이 기록한 명작입니다. 연못의 깊이에 침잠하여 경계 없는 평온함을 선물하며 번뇌를 녹여내어 깊은 명상적 합일에 이르게 합니다.",
    whyRecommended: "지금 당신의 마음에 고요하고 부드러운 치유가 필요합니다. 세세한 격리된 감정을 흐르는 빛줄기에 스며들게 함으로써 창작의 근원 주파수를 정화해 줍니다.",
    challenges: [
      "눈을 감고 정갈한 호수 수면을 바라보는 명상을 3분간 진행해 보세요.",
      "노트 중심에 파란색이나 보라색 크레용으로 가볍게 퍼져나가는 원형 물결을 어루만지듯 그려보세요."
    ],
    aestheticTone: "수면에 반사된 보랏빛 라벤더와 에메랄드 그린 컬러톤",
    quote: "내가 수련을 그리는 것은 마음을 편안하게 만들기 위한 유일한 의식이다.",
    dailyArtUrl: "https://www.dailyartmagazine.com/water-lilies-by-claude-monet/",
  },
  {
    title: "별이 빛나는 밤 (The Starry Night, 1889)",
    titleOriginal: "The Starry Night",
    creator: "빈센트 반 고흐 (Vincent van Gogh, 네덜란드)",
    creatorOriginal: "Vincent van Gogh",
    artworkType: "미술 (유화)",
    era: "후기 인상주의 · 1889년",
    description: "요동치는 푸른 밤하늘과 소용돌이치는 황금빛 별들이 영혼의 격정을 예술로 승화한 걸작입니다. 내면의 혼란을 창조적 에너지로 치유하는 강렬한 울림을 줍니다.",
    whyRecommended: "당신의 깊은 무의식에 잠재된 열정과 빛을 일깨울 시간입니다. 어두운 밤하늘 속에서도 영롱하게 빛나는 별의 주파수에 주파수를 맞추어 보세요.",
    challenges: [
      "밤하늘을 올려다보며 가장 밝게 빛나는 별 하나를 찾아 10초간 응시해 보세요.",
      "노란색 펜으로 나만의 빛나는 별 모양을 스케치북에 힘있게 휘갈겨 보세요."
    ],
    aestheticTone: "깊은 코발트 블루, 울트라마린, 그리고 소용돌이치는 황금빛 노랑",
    quote: "나는 별들을 볼 때마다 언제나 꿈을 꾼다.",
    dailyArtUrl: "https://www.dailyartmagazine.com/vincent-van-gogh-starry-night-masterpiece/",
  },
  {
    title: "키스 (The Kiss, 1907-1908)",
    titleOriginal: "The Kiss",
    creator: "구스타프 클림트 (Gustav Klimt, 오스트리아)",
    creatorOriginal: "Gustav Klimt",
    artworkType: "미술 (혼합재료 및 금박)",
    era: "상징주의 / 아르누보 · 1908년",
    description: "금빛 광채 속에서 두 연인이 하나로 녹아내리는 영원한 결합의 순간을 그린 작품입니다. 세상의 모든 소음으로부터 격리되어 오직 깊은 연결과 충만함을 선사합니다.",
    whyRecommended: "사랑과 소통, 그리고 완벽한 일치감이 필요한 하루입니다. 흩어진 에너지를 모아 황금빛 광채 속에서 가장 소중한 가치와 합치되는 고요를 만끽하세요.",
    challenges: [
      "오늘 나 자신이나 사랑하는 사람에게 전할 감사의 한마디를 마음속으로 소리 내어 보세요.",
      "스케치 가장자리를 따뜻한 금빛 또는 주황색 테두리로 부드럽게 감싸듯 채색해 보세요."
    ],
    aestheticTone: "눈부신 황금빛 골드, 산화된 오렌지, 기하학적 흑백 패턴",
    quote: "나에 대해 알고 싶다면 내 그림을 주의 깊게 들여다보라.",
    dailyArtUrl: "https://www.dailyartmagazine.com/gustav-klimt-the-kiss/",
  },
  {
    title: "절규 (The Scream, 1893)",
    titleOriginal: "The Scream",
    creator: "에드바르 뭉크 (Edvard Munch, 노르웨이)",
    creatorOriginal: "Edvard Munch",
    artworkType: "미술 (템페라 및 크레용)",
    era: "표현주의 · 1893년",
    description: "불타는 듯 핏빛으로 물든 하늘과 요동치는 자연의 비명에 압도되어 귀를 막고 절규하는 인간의 원초적 불안을 역동적으로 시각화한 표현주의의 기념비적 작품입니다.",
    whyRecommended: "가슴 속에 맺힌 응어리와 불안을 거침없이 배출하고 정화하는 카타르시스가 필요합니다. 감정을 억누르기보다 온전히 마주하여 흘려보내세요.",
    challenges: [
      "숨을 크게 들이마신 뒤, 입을 벌려 소리 없이 크게 소리를 내지르는 '무음 비명'을 3회 반복해 보세요.",
      "붉은색과 주황색 선을 물결 모양으로 세차게 그어 마음에 쌓인 응어리를 종이에 풀어내세요."
    ],
    aestheticTone: "타오르는 핏빛 주황, 짙은 남색 바다, 격동하는 곡선",
    quote: "나의 예술은 내 삶에 대한 고백이다.",
    dailyArtUrl: "https://www.dailyartmagazine.com/the-scream-edvard-munch/",
  },
  {
    title: "그랑드 자트 섬의 일요일 오후 (A Sunday on La Grande Jatte, 1884-1886)",
    titleOriginal: "A Sunday on La Grande Jatte",
    creator: "조르주 쇠라 (Georges Seurat, 프랑스)",
    creatorOriginal: "Georges Seurat",
    artworkType: "미술 (점묘화)",
    era: "신인상주의 · 1886년",
    description: "수많은 작은 원색 점들을 캔버스에 꼼꼼히 찍어 빛과 형태를 직조해 낸 신인상주의 점묘화의 정수입니다. 정돈된 평화로움 속에서 찬란하고 우아한 일상의 휴식을 그립니다.",
    whyRecommended: "복잡하고 어지러운 생각들을 작은 조각으로 세심하게 나누어 정리해야 할 때입니다. 질서 있고 고요한 초록빛 정원에서의 휴식을 당신의 마음에 선물하세요.",
    challenges: [
      "주변의 소리나 사물들을 아주 미세한 점들의 집합체로 상상하며 30초간 집중해 보세요.",
      "초록색이나 노란색 색연필로 가벼운 점을 콕콕 찍어가며 작은 나뭇잎 하나를 완성해 보세요."
    ],
    aestheticTone: "생기 넘치는 올리브 그린, 밝은 레몬 옐로우, 은은한 옥색 물빛",
    quote: "어떤 이들은 내 그림에서 시를 본다고 하지만, 나는 오직 과학만을 본다.",
    dailyArtUrl: "https://www.dailyartmagazine.com/sunday-on-la-grande-jatte-georges-seurat/",
  }
];

function getValid30DayHistory<T extends { shownAt: string }>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    if (!Array.isArray(parsed)) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const valid = parsed.filter((entry) => {
      const shownDate = new Date(entry.shownAt);
      return !isNaN(shownDate.getTime()) && shownDate >= thirtyDaysAgo;
    });

    localStorage.setItem(storageKey, JSON.stringify(valid));
    return valid;
  } catch (e) {
    console.error(`Failed to read 30-day history for ${storageKey}:`, e);
    return [];
  }
}

interface ShownArtHistoryEntry {
  catalogId: string;
  title?: string;
  shownAt: string;
}

interface ShownItemHistoryEntry {
  title: string;
  shownAt: string;
}

function getExcludeCatalogIds(): string[] {
  const list = getValid30DayHistory<ShownArtHistoryEntry>("muse_shown_artworks_history");
  return list.map((entry) => entry.catalogId || entry.title || "").filter(Boolean);
}

function getExcludePoemTitles(): string[] {
  const list = getValid30DayHistory<ShownItemHistoryEntry>("muse_shown_poems_history");
  return list.map((entry) => entry.title).filter(Boolean);
}

function getExcludeSongTitles(): string[] {
  const list = getValid30DayHistory<ShownItemHistoryEntry>("muse_shown_songs_history");
  return list.map((entry) => entry.title).filter(Boolean);
}

function recordArtworkHistory(art: ArtRecommendation): void {
  try {
    const todayStr = getTodayDateKey();
    
    // 1. Artwork history (30 days)
    const artKey = "muse_shown_artworks_history";
    const artHistory = getValid30DayHistory<ShownArtHistoryEntry>(artKey);
    const artId = art.catalogId || art.title;
    if (artId && !artHistory.some((entry) => (entry.catalogId === artId || entry.title === art.title) && entry.shownAt === todayStr)) {
      artHistory.push({ catalogId: artId, title: art.title, shownAt: todayStr });
      localStorage.setItem(artKey, JSON.stringify(artHistory));
    }

    // 2. Poem history (30 days)
    if (art.famousPoem?.title) {
      const poemKey = "muse_shown_poems_history";
      const poemHistory = getValid30DayHistory<ShownItemHistoryEntry>(poemKey);
      if (!poemHistory.some((entry) => entry.title === art.famousPoem?.title && entry.shownAt === todayStr)) {
        poemHistory.push({ title: art.famousPoem.title, shownAt: todayStr });
        localStorage.setItem(poemKey, JSON.stringify(poemHistory));
      }
    }

    // 3. Song history (30 days)
    if (art.famousSong?.title) {
      const songKey = "muse_shown_songs_history";
      const songHistory = getValid30DayHistory<ShownItemHistoryEntry>(songKey);
      if (!songHistory.some((entry) => entry.title === art.famousSong?.title && entry.shownAt === todayStr)) {
        songHistory.push({ title: art.famousSong.title, shownAt: todayStr });
        localStorage.setItem(songKey, JSON.stringify(songHistory));
      }
    }
  } catch (e) {
    console.error("Failed to record artwork history:", e);
  }
}

function getDailyPoemSongFallback(randomOffset?: number): { famousPoem: FamousPoem; famousSong: FamousSong } {
  const excludePoems = getExcludePoemTitles();
  const excludeSongs = getExcludeSongTitles();

  const filtered = DAILY_POEM_SONG_FALLBACKS.filter(
    (item) =>
      !excludePoems.some((p) => item.famousPoem.title.toLowerCase().includes(p.toLowerCase())) &&
      !excludeSongs.some((s) => item.famousSong.title.toLowerCase().includes(s.toLowerCase()))
  );

  const pool = filtered.length > 0 ? filtered : DAILY_POEM_SONG_FALLBACKS;
  const seed = getDateSeed('muse_poem_song');
  const index = typeof randomOffset === "number" ? (seed + randomOffset) : seed;
  return pool[index % pool.length];
}

function getDailyArtFallback(randomOffset?: number): ArtRecommendation {
  const excludeArts = getExcludeCatalogIds();
  const filtered = DAILY_ART_FALLBACKS.filter(
    (art) => !excludeArts.some((ex) => art.title.toLowerCase().includes(ex.toLowerCase()))
  );
  const pool = filtered.length > 0 ? filtered : DAILY_ART_FALLBACKS;

  const seed = getDateSeed('muse_artwork');
  const index = typeof randomOffset === "number" ? (seed + randomOffset) : seed;
  const art = pool[index % pool.length];
  const { famousPoem, famousSong } = getDailyPoemSongFallback(randomOffset);
  return {
    ...art,
    sourceName: "DailyArt Magazine",
    famousPoem,
    famousSong,
  };
}

function isAiRecreatedArtworkSource(source: ArtworkImageSource | null): boolean {
  return source === "ai_replica" || source === "pollinations";
}

function getArtworkImageBadgeLabel(source: ArtworkImageSource | null): string | null {
  if (!source) return null;
  if (source === "dailyart") return "🏛️ DailyArt 원작";
  if (source === "google") return "🏛️ 고화질 원작";
  if (source === "wikimedia" || source === "wikipedia" || source === "artic" || source === "met") return "🏛️ 미술관 원작 소장본";
  return "✨ AI 미학 재현본";
}

const ART_CACHE_KEYS = {
  date: "muse_today_art_date",
  recommendation: "muse_today_art_recommendation_v18",
  image: "muse_today_art_image_v18",
  imageSource: "muse_today_art_image_source_v18",
  mood: "muse_today_art_mood_label",
  offset: "muse_today_art_offset",
} as const;

const ART_MOODS = [
  { id: "quiet", label: "고요·명상", description: "평온함 and 마인드풀니스 치유", icon: "🌊", promptMood: "고요하고 명상적인 안식이 필요한 상태" },
  { id: "passion", label: "열정·자극", description: "강렬하고 대담한 카타르시스", icon: "🔥", promptMood: "막힌 것을 뚫을 수 있는 강렬하고 역동적인 자극이 필요한 상태" },
  { id: "refresh", label: "정돈·환기", description: "리프레시와 감각적 정비", icon: "🍃", promptMood: "복잡한 머리를 식히고 가볍고 경쾌하게 기분을 환기하고 싶은 상태" },
  { id: "planning", label: "영감·구상", description: "지적인 탐색과 신선한 아이디어", icon: "💭", promptMood: "새로운 지평과 독특한 아이디어를 지적/개념적으로 자극받고 싶은 상태" },
  { id: "resurrection", label: "비장·부활", description: "슬픔과 시련을 뛰어넘는 극복", icon: "🎻", promptMood: "고난이나 시련을 딛고 영혼의 힘을 뜨겁게 일깨울 예술" },
];

function enrichRecommendation(rec: ArtRecommendation, randomOffset?: number): ArtRecommendation {
  const fallback = getDailyPoemSongFallback(randomOffset);
  const dailyArtUrl =
    rec.dailyArtUrl?.trim()
    || lookupCatalogDailyArtUrl(rec.catalogId, rec.title, rec.titleOriginal);
  return {
    ...rec,
    dailyArtUrl,
    famousPoem: rec.famousPoem?.title ? rec.famousPoem : fallback.famousPoem,
    famousSong: rec.famousSong?.title ? rec.famousSong : fallback.famousSong,
  };
}

function parseCachedRecommendation(): ArtRecommendation | null {
  const cached = localStorage.getItem(ART_CACHE_KEYS.recommendation);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as ArtRecommendation;
    return parsed?.title ? enrichRecommendation(parsed) : null;
  } catch {
    return null;
  }
}

function getDailyMood(randomOffset?: number) {
  if (typeof randomOffset === "number") {
    const idx = (getDateSeed("muse_daily_art_mood") + randomOffset) % ART_MOODS.length;
    return ART_MOODS[idx];
  }
  return pickDailySeededItem(ART_MOODS, "muse_daily_art_mood");
}

function clearArtRecommendationCache(): void {
  Object.values(ART_CACHE_KEYS).forEach((key) => localStorage.removeItem(key));
}

function isArtCacheFresh(): boolean {
  return isSameDayString(localStorage.getItem(ART_CACHE_KEYS.date));
}

function touchArtCacheDate(): void {
  localStorage.setItem(ART_CACHE_KEYS.date, getTodayDateKey());
}

export function ArtRecommendationView() {
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [recommendation, setRecommendation] = useState<ArtRecommendation | null>(null);
  const [nanobananaImage, setNanobananaImage] = useState<string | null>(null);
  const [artworkImageSource, setArtworkImageSource] = useState<ArtworkImageSource | null>(null);
  const [isArtImageOpen, setIsArtImageOpen] = useState(false);
  const [currentMoodLabel, setCurrentMoodLabel] = useState("고요·명상");
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Interactive challenges checklist
  const [completedChallenges, setCompletedChallenges] = useState<Record<number, boolean>>({});
  
  // Reflection/Diary entry for this artwork
  const [reflectionText, setReflectionText] = useState("");
  const [isSavingReflection, setIsSavingReflection] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [geminiCopied, setGeminiCopied] = useState(false);
  const hydrateStartedRef = useRef(false);

  // Cycling reassuring logs during API generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    "퀀텀 시냅스를 정렬하여 당신의 최근 내면 흐름을 수집하고 있습니다...",
    "동조 주파수 파동(Hz)과 마인드풀 에너지의 완벽한 조화를 스캔하는 중...",
    "DailyArt Magazine의 Masterpiece Stories에서 검증된 명작을 큐레이션합니다...",
    "예술이 전하는 영감과 실천적 미션을 마법처럼 조율하는 마지막 단계..."
  ];

  const generateNanobananaImage = useCallback(async (
    art: ArtRecommendation,
    options?: { forcePollinations?: boolean },
  ) => {
    setLoadingImage(true);
    setNanobananaImage(null);
    setArtworkImageSource(null);
    try {
      const { displayUrl, source } = await resolveArtworkImage(
        {
          title: art.title,
          titleOriginal: art.titleOriginal,
          creator: art.creator,
          creatorOriginal: art.creatorOriginal,
          artworkType: art.artworkType,
          era: art.era,
          description: art.description,
          aestheticTone: art.aestheticTone,
          dailyArtImageUrl: art.imageUrl,
        },
        options,
      );

      setNanobananaImage(displayUrl);
      setArtworkImageSource(source);
      localStorage.setItem(ART_CACHE_KEYS.image, displayUrl);
      localStorage.setItem(ART_CACHE_KEYS.imageSource, source);
    } catch (e) {
      console.error("Failed to resolve artwork image:", e);
      const fallbackUrl = buildPollinationsArtUrl(art);
      setNanobananaImage(fallbackUrl);
      setArtworkImageSource("pollinations");
      localStorage.setItem(ART_CACHE_KEYS.image, fallbackUrl);
      localStorage.setItem(ART_CACHE_KEYS.imageSource, "pollinations");
      setLoadingImage(false);
    }
  }, []);

  const restoreDailyArtFromCache = useCallback((): boolean => {
    if (!isArtCacheFresh()) return false;

    const cachedRec = parseCachedRecommendation();
    if (!cachedRec) return false;

    setRecommendation(cachedRec);
    setReflectionSaved(false);
    setReflectionText("");
    setCompletedChallenges({});

    const cachedMoodLabel = localStorage.getItem(ART_CACHE_KEYS.mood);
    setCurrentMoodLabel(cachedMoodLabel || getDailyMood().label);

    const cachedImg = localStorage.getItem(ART_CACHE_KEYS.image);
    const cachedSource = localStorage.getItem(ART_CACHE_KEYS.imageSource) as ArtworkImageSource | null;
    if (cachedImg && cachedImg !== "null" && cachedImg !== "undefined") {
      setNanobananaImage(cachedImg);
      if (cachedSource) setArtworkImageSource(cachedSource);
      setLoadingImage(false);
    }

    return true;
  }, []);

  const handleRecommendArt = useCallback(async (options?: { forceRefresh?: boolean; randomOffset?: number }) => {
    if (!options?.forceRefresh && restoreDailyArtFromCache()) {
      const cachedRec = parseCachedRecommendation();
      if (cachedRec && !localStorage.getItem(ART_CACHE_KEYS.image)) {
        void generateNanobananaImage(cachedRec);
      }
      return;
    }

    setLoading(true);
    setNanobananaImage(null);
    setReflectionSaved(false);
    setReflectionText("");
    setCompletedChallenges({});

    let offset = options?.randomOffset;
    if (typeof offset !== "number") {
      const savedOffset = localStorage.getItem(ART_CACHE_KEYS.offset);
      offset = savedOffset ? parseInt(savedOffset, 10) : undefined;
    }

    const dailyMood = getDailyMood(offset);
    setCurrentMoodLabel(dailyMood.label);
    localStorage.setItem(ART_CACHE_KEYS.mood, dailyMood.label);

    let userContext = "";
    
    // Get live user metadata context from database
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, "muse_history", auth.currentUser.uid, "entries"),
          orderBy("createdAt", "desc"),
          limit(3)
        );
         const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          userContext = querySnapshot.docs
            .map((doc) => doc.data().content || "")
            .join("\n")
            .slice(0, 1000); // truncate for safety
        }
      } catch (err) {
        console.warn("Failed to get latest user context entries for recommender:", err);
      }
    }

    try {
      const excludeCatalogIds = getExcludeCatalogIds();
      const excludePoemTitles = getExcludePoemTitles();
      const excludeSongTitles = getExcludeSongTitles();
      const response = await fetch("/api/ai/recommend-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentMood: dailyMood.promptMood,
          moodId: dailyMood.id,
          userContext,
          energyFrequency: "528Hz",
          dateKey: getTodayDateKey(),
          randomOffset: offset,
          excludeCatalogIds,
          excludePoemTitles,
          excludeSongTitles,
        })
      });

      if (!response.ok) throw new Error("예술 추천 요청 실패");
      const data = await response.json() as ArtRecommendation;
      const enriched: ArtRecommendation = {
        ...data,
        famousPoem: data.famousPoem?.title ? data.famousPoem : getDailyPoemSongFallback(offset).famousPoem,
        famousSong: data.famousSong?.title ? data.famousSong : getDailyPoemSongFallback(offset).famousSong,
      };
      
      setRecommendation(enriched);
      touchArtCacheDate();
      localStorage.setItem(ART_CACHE_KEYS.recommendation, JSON.stringify(enriched));
      recordArtworkHistory(enriched);
      
      // Auto-trigger picture drawing inspired by this masterpiece
      await generateNanobananaImage(enriched);
    } catch (e) {
      console.error(e);
      // Fallback
      const genericFallback = getDailyArtFallback(offset);
      setRecommendation(genericFallback);
      touchArtCacheDate();
      localStorage.setItem(ART_CACHE_KEYS.recommendation, JSON.stringify(genericFallback));
      recordArtworkHistory(genericFallback);
      await generateNanobananaImage(genericFallback);
    } finally {
      setLoading(false);
    }
  }, [generateNanobananaImage, restoreDailyArtFromCache]);

  useEffect(() => {
    if (hydrateStartedRef.current) return;
    hydrateStartedRef.current = true;

    if (!isArtCacheFresh()) {
      clearArtRecommendationCache();
      setRecommendation(null);
      setNanobananaImage(null);
      setCompletedChallenges({});
      setReflectionSaved(false);
      setReflectionText("");
      void handleRecommendArt();
      return;
    }

    if (restoreDailyArtFromCache()) {
      const cachedRec = parseCachedRecommendation();
      if (cachedRec && !localStorage.getItem(ART_CACHE_KEYS.image)) {
        void generateNanobananaImage(cachedRec);
      }
      return;
    }

    void handleRecommendArt();
  }, [generateNanobananaImage, handleRecommendArt, restoreDailyArtFromCache]);

  const toggleChallenge = (index: number) => {
    setCompletedChallenges((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim() || !recommendation || isSavingReflection) return;
    setIsSavingReflection(true);
    
    try {
      if (auth.currentUser) {
        await addDoc(collection(db, "muse_history", auth.currentUser.uid, "entries"), {
          type: "art_reflection",
          title: `창조적 반향: [${recommendation.title}]`,
          content: `추천 작품: ${recommendation.title} (${recommendation.creator})\n\n사용자 창조적 응답 및 감상 기록:\n"${reflectionText}"`,
          aiKeywords: [recommendation.artworkType, recommendation.era, "예술추천"],
          aiEmotions: [currentMoodLabel, "영감"],
          createdAt: serverTimestamp()
        });
        setReflectionSaved(true);
      } else {
        alert("감상 기록이 성공적으로 저장되었습니다! (게스트 라이브러리 자동보관)");
        setReflectionSaved(true);
      }
    } catch (err) {
      console.error("Failed to save reflection to Firestore:", err);
      alert("데이터 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingReflection(false);
    }
  };

  const handleCopyQuote = () => {
    if (!recommendation) return;
    navigator.clipboard.writeText(`"${recommendation.quote}" - ${recommendation.creator}`);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const artworkArticleUrl = recommendation
    ? resolveArtworkDailyArtUrl(
        recommendation.dailyArtUrl,
        recommendation.catalogId,
        recommendation.title,
        recommendation.titleOriginal,
      )
    : "";

  const artworkImageFilename = useMemo(
    () => `muse-daily-art-${recommendation?.title ?? "artwork"}-${getTodayDateKey()}`,
    [recommendation?.title],
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 px-4 py-6 md:py-12 text-white">
      {/* Intro Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-bold uppercase tracking-widest shadow-lg animate-pulse">
          <Palette size={14} className="text-blue-400" />
          MUSE SPECIAL FEATURE
        </div>
        <h2 className="text-3xl md:text-5xl font-sans font-bold tracking-tight text-white leading-tight">
          오늘의 <span className="text-blue-400">예술 추천</span>
        </h2>
        <p className="text-sm text-white/50 max-w-xl mx-auto leading-relaxed font-sans">
          당신의 마음에 잠재된 영적 에너지를 깨우기 위해 뮤즈가 큐레이션하는 고전을 만나보세요. 
          명화와 함께 오늘의 명시·명곡도 매일 자동으로 추천됩니다.
        </p>
        <p className="text-[10px] text-white/30 font-mono tracking-wider">
          매일 자정 이후 새로운 명작이 자동으로 큐레이션됩니다 · {getTodayDateKey()}
        </p>
        
      </div>

      {/* Auto Frequency Tuning Block - Replaces old theme selection. Hidden when recommendation is already generated or loaded */}
      {!recommendation && (
        <div className="bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-[32px] text-center space-y-6 shadow-xl backdrop-blur-md">
          <div className="max-w-md mx-auto space-y-2">
            <span className="text-[10px] font-black tracking-widest text-[#a5b4fc] uppercase font-mono bg-[#a5b4fc]/10 px-3.5 py-1.5 rounded-full border border-[#a5b4fc]/20 inline-block">
              MUSE AUTOSCAN ACTIVE
            </span>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              당신의 최근 감정 상태와 내면 주파수를 백그라운드 환경에서 세밀하게 분석하고 있습니다. 
              별도의 복잡한 테마 선택 없이, 당신의 내면 주파수에 동조되는 세계 미술관 공식 소장 원작 명화와 명시·명곡을 만나보세요.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => void handleRecommendArt()}
              disabled={loading}
              className="prism-rainbow-btn relative py-4 px-10 rounded-2xl text-xs md:text-sm font-black uppercase tracking-[0.2em] transform active:scale-95 text-white shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer min-w-[240px]"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : "animate-pulse"} />
              {isArtCacheFresh() && localStorage.getItem(ART_CACHE_KEYS.recommendation)
                ? "오늘의 명작 다시 보기"
                : "오늘의 명작 공명하기"}
            </button>
          </div>
        </div>
      )}

      {/* Loading Canvas */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-12 rounded-[32px] bg-white/[0.01] border border-white/5 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl backdrop-blur-3xl min-h-[400px]"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-blue-500/40 animate-spin absolute inset-0" />
              <div className="w-16 h-16 rounded-full border-2 border-t-blue-400 border-r-transparent animate-spin relative" />
              <Palette size={20} className="absolute inset-x-0 mx-auto text-blue-400 top-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            
            <div className="space-y-2 max-w-md">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 font-mono animate-pulse">
                [ ATTACHING ARTISTIC RESONANCE ]
              </h4>
              <p className="text-sm text-white/70 leading-relaxed font-sans font-medium h-12 transition-all">
                {loadingMessages[loadingStep]}
              </p>
            </div>
          </motion.div>
        )}

        {/* Art Result Panel */}
        {!loading && recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Core Artwork Display Block */}
            <div className="relative p-6 md:p-10 rounded-[32px] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 shadow-3xl overflow-hidden backdrop-blur-2xl">
              {/* Abs Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[130px] rounded-full pointer-events-none -mr-40 -mt-40 z-0" />

              <div className="relative z-10 space-y-8">
                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1">
                      <Palette size={11} />
                      오늘의 명화
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-medium tracking-wide text-white/50">
                      {recommendation.artworkType}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] text-[10px] font-medium tracking-wide text-white/50">
                      {recommendation.era}
                    </span>
                  </div>
                  
                  <div className="text-[10px] font-mono tracking-widest text-[#a5b4fc]/80 bg-[#a5b4fc]/5 border border-[#a5b4fc]/10 px-3 py-1.5 rounded-xl">
                    ENERGY FREQUENCY: 528Hz Sync
                  </div>
                </div>

                {/* Title & Creator */}
                <div className="space-y-3">
                  <h3 className="text-2xl md:text-4xl font-sans font-extrabold text-white leading-tight tracking-tight">
                    {recommendation.title}
                  </h3>
                  <p className="text-sm md:text-base text-blue-400 font-sans font-bold flex items-center gap-1.5">
                    <Feather size={14} />
                    {recommendation.creator}
                  </p>
                </div>

                {/* NanoBanana Masterpiece Image Canvas */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[4/3] w-full max-w-lg mx-auto flex flex-col items-center justify-center group shadow-2xl">
                  {loadingImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50 text-xs p-6 text-center bg-black/60 z-10 transition-all">
                      <div className="relative w-10 h-10">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-yellow-500/40 animate-spin absolute inset-0" />
                        <div className="w-10 h-10 rounded-full border-2 border-t-yellow-400 border-r-transparent animate-spin relative" />
                      </div>
                      <span className="font-mono tracking-widest uppercase animate-pulse text-[10px] text-yellow-300 font-black">
                        [ 🏛️ 세계 미술관 공식 원작 아카이브 로딩 중... ]
                      </span>
                    </div>
                  )}
                  {nanobananaImage ? (
                    <>
                      <ImageOutputActions
                        src={nanobananaImage}
                        alt={`${recommendation.title} — ${recommendation.creator}`}
                        filename={artworkImageFilename}
                        isOpen={isArtImageOpen}
                        onOpenChange={setIsArtImageOpen}
                      />
                      <img 
                        src={nanobananaImage} 
                        alt={`${recommendation.title} — ${recommendation.creator}`}
                        referrerPolicy="no-referrer"
                        onLoad={() => setLoadingImage(false)}
                        onError={() => {
                          setLoadingImage(false);
                          if (artworkImageSource !== "pollinations") {
                            void generateNanobananaImage(recommendation, { forcePollinations: true });
                            return;
                          }
                          const fallbackUrl = buildPollinationsArtUrl(recommendation);
                          setNanobananaImage(fallbackUrl);
                          setArtworkImageSource("pollinations");
                          localStorage.setItem(ART_CACHE_KEYS.image, fallbackUrl);
                          localStorage.setItem(ART_CACHE_KEYS.imageSource, "pollinations");
                          setLoadingImage(false);
                        }}
                        onClick={() => setIsArtImageOpen(true)}
                        className={`w-full h-full object-cover cursor-zoom-in transition-all duration-700 hover:scale-105 ${loadingImage ? "opacity-0 scale-95" : "opacity-100 scale-100"}`} 
                      />
                      {getArtworkImageBadgeLabel(artworkImageSource) ? (
                        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/85 backdrop-blur-md rounded-xl border border-yellow-400/30 flex items-center gap-2 shadow-lg z-20 pointer-events-none">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400"></span>
                          </span>
                          <span className="text-[9px] font-black tracking-widest text-yellow-300 uppercase font-mono">
                            {getArtworkImageBadgeLabel(artworkImageSource)}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-white/50 text-xs p-6 text-center animate-pulse">
                      <div className="relative w-10 h-10">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-yellow-500/40 animate-spin absolute inset-0" />
                        <div className="w-10 h-10 rounded-full border-2 border-t-yellow-400 border-r-transparent animate-spin relative" />
                      </div>
                      <span className="font-mono tracking-widest uppercase text-[10px] text-yellow-300 font-extrabold">
                        [ 🏛️ 세계 미술관 공식 원작 아카이브 불러오는 중... ]
                      </span>
                    </div>
                  )}
                </div>

                {nanobananaImage && !loadingImage && (
                  <p className="text-[10px] text-amber-200/80 text-center leading-relaxed px-2 -mt-2">
                    {isAiRecreatedArtworkSource(artworkImageSource)
                      ? "✨ 고전 명화의 구성과 화풍을 정밀 분석하여 재현한 고화질 미학 버전입니다."
                      : "🏛️ 시카고 미술관 / 메트로폴리탄 / 위키미디어 공식 소장 원작 스캔본입니다."}
                  </p>
                )}

                {nanobananaImage && !loadingImage && (
                  <>
                    <p className="text-[10px] text-white/40 text-center -mt-4">
                      그림을 탭하거나 버튼으로 크게 보기 · 다운로드
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 -mt-2">
                      <button
                        type="button"
                        onClick={() => setIsArtImageOpen(true)}
                        className="px-3 py-1.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Maximize2 size={12} />
                        크게 보기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem(ART_CACHE_KEYS.image);
                          localStorage.removeItem(ART_CACHE_KEYS.imageSource);
                          void generateNanobananaImage(recommendation, { forcePollinations: false });
                        }}
                        className="px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        원작 고화질 갱신
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadImage(nanobananaImage, artworkImageFilename)}
                        className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={12} />
                        다운로드
                      </button>
                    </div>
                  </>
                )}

                {/* Description */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                    심층 미학 & 미묘한 서사
                  </span>
                  <p className="text-sm md:text-base text-white/70 leading-relaxed font-sans tracking-wide">
                    {recommendation.description}
                  </p>
                </div>

                {/* why recommended - insights */}
                <div className="p-5 md:p-6 rounded-[24px] bg-blue-500/[0.03] border border-blue-500/10 space-y-3 animate-fade-in">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-300">
                    <Sparkles size={11} className="animate-pulse" />
                    뮤즈의 주파수 가이드 전언
                  </span>
                  <p className="text-xs md:text-sm text-blue-100/80 leading-relaxed font-sans font-medium">
                    {recommendation.whyRecommended}
                  </p>
                </div>

                {/* Aesthetic Mood tone line */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40 font-bold uppercase tracking-wider">권장 창작 어우러짐:</span>
                    <span className="text-xs font-semibold text-white/80">{recommendation.aestheticTone}</span>
                  </div>
                </div>

                {/* Quote details */}
                {recommendation.quote && (
                  <div className="border-l-2 border-blue-500/40 pl-4 py-1 space-y-1 relative group">
                    <p className="text-xs md:text-sm italic text-white/60 font-serif leading-relaxed">
                      "{recommendation.quote}"
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-white/30">
                      <span>— {recommendation.creator} 명언</span>
                      <button 
                        onClick={handleCopyQuote}
                        className="p-1 rounded hover:bg-white/5 active:scale-95 transition-all text-white/30 hover:text-white/60 cursor-pointer"
                        title="카피"
                      >
                        {copiedQuote ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    <span className="font-black uppercase tracking-wider text-white/30">출처</span>
                    {" "}{recommendation.sourceName || "DailyArt Magazine"}
                    {recommendation.creator ? ` · ${recommendation.creator}` : ""}
                    {recommendation.titleOriginal ? ` · ${recommendation.titleOriginal}` : ""}
                  </p>
                  <div className="flex flex-col items-end gap-1.5">
                    <a
                      href={artworkArticleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-200/90 hover:text-white transition-colors"
                    >
                      원작 감상하기
                      <ChevronRight size={12} />
                    </a>
                    <a
                      href={buildArtworkGoogleArtsAndCultureSearchUrl(
                        recommendation.title,
                        recommendation.creator,
                        recommendation.titleOriginal,
                        recommendation.creatorOriginal,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-200/90 hover:text-white transition-colors"
                    >
                      Google Arts & Culture 검색
                      <ChevronRight size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {(recommendation.famousPoem || recommendation.famousSong) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendation.famousPoem && (
                  <div className="p-6 md:p-7 rounded-[28px] bg-gradient-to-br from-indigo-500/[0.06] to-white/[0.01] border border-indigo-500/15 space-y-4">
                    <div className="flex items-center gap-2">
                      <BookOpen size={15} className="text-indigo-300" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                        오늘의 명시
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-white leading-snug">
                        {recommendation.famousPoem.title}
                      </h4>
                      <p className="text-xs text-indigo-300/80 font-semibold">
                        {recommendation.famousPoem.poet}
                      </p>
                    </div>
                    <p className="text-sm text-white/70 italic font-serif leading-relaxed border-l-2 border-indigo-400/40 pl-4">
                      {recommendation.famousPoem.excerpt}
                    </p>
                    <p className="text-xs text-white/50 leading-relaxed">
                      {recommendation.famousPoem.whyRecommended}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        <span className="font-black uppercase tracking-wider text-white/30">출처</span>
                        {" "}{recommendation.famousPoem.poemSourceName || "시요일 라이브러리"}
                        {" · "}{recommendation.famousPoem.poet}
                      </p>
                      <div className="flex flex-col items-end gap-1.5">
                        <a
                          href={buildPoemGoogleAiSearchUrl(
                            recommendation.famousPoem.title,
                            recommendation.famousPoem.poet,
                            recommendation.famousPoem.titleOriginal,
                            recommendation.famousPoem.poetOriginal,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-200/90 hover:text-white transition-colors cursor-pointer"
                        >
                          원작 감상하기
                          <ChevronRight size={12} />
                        </a>
                        <a
                          href={buildPoemGoogleArtsAndCultureSearchUrl(
                            recommendation.famousPoem.title,
                            recommendation.famousPoem.poet,
                            recommendation.famousPoem.titleOriginal,
                            recommendation.famousPoem.poetOriginal,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-200/90 hover:text-white transition-colors"
                        >
                          Google Arts & Culture 검색
                          <ChevronRight size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {recommendation.famousSong && (
                  <div className="p-6 md:p-7 rounded-[28px] bg-gradient-to-br from-rose-500/[0.06] to-white/[0.01] border border-rose-500/15 space-y-4">
                    <div className="flex items-center gap-2">
                      <Music size={15} className="text-rose-300" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">
                        오늘의 명곡
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-white leading-snug">
                        {recommendation.famousSong.title}
                      </h4>
                      <p className="text-xs text-rose-300/80 font-semibold">
                        {recommendation.famousSong.artist}
                      </p>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">
                      {recommendation.famousSong.listeningGuide}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        <span className="font-black uppercase tracking-wider text-white/30">출처</span>
                        {" "}{recommendation.famousSong.songSourceName || "Apple Music Classical"}
                      </p>
                    </div>
                    <MuseSongYouTubePlayer
                      key={recommendation.famousSong.youtubeVideoId || recommendation.famousSong.title}
                      title={recommendation.famousSong.title}
                      titleOriginal={recommendation.famousSong.titleOriginal}
                      artist={recommendation.famousSong.artist}
                      artistOriginal={recommendation.famousSong.artistOriginal}
                      youtubeVideoId={recommendation.famousSong.youtubeVideoId}
                    />
                  </div>
                )}
              </div>
            )}

            {nanobananaImage && recommendation.famousPoem && recommendation.famousSong && (
              <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-br from-blue-500/[0.05] to-indigo-500/[0.02] border border-blue-500/15 space-y-4">
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                    MUSE AUDIO DOCENT
                  </span>
                  <p className="text-sm text-white/80 font-sans">
                    오늘의 명화, 명시, 명곡을 뮤즈가 하나의 이야기로 엮어 음성으로 안내해 드립니다.
                  </p>
                </div>
                <MuseDocentAudio
                  artwork={{
                    imageUrl: nanobananaImage,
                    title: recommendation.title,
                    creator: recommendation.creator,
                    artworkType: recommendation.artworkType,
                    era: recommendation.era,
                    description: recommendation.description,
                    whyRecommended: recommendation.whyRecommended,
                    aestheticTone: recommendation.aestheticTone,
                    quote: recommendation.quote,
                    famousPoem: recommendation.famousPoem,
                    famousSong: recommendation.famousSong,
                  }}
                />
              </div>
            )}

            {/* Micro Challenges / Mindful quests */}
            <div className="p-6 md:p-8 rounded-[28px] bg-white/[0.01] border border-white/5 space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#a5b4fc]/90 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#a5b4fc]" />
                  오늘의 마인드풀 창조적 달성 챌린지
                </h3>
                <p className="text-[11px] text-white/40 font-sans">
                  추천된 명화와 공명하여 오늘 하루 속에서 창의적 폐쇄를 돌파할 수 있는 두 가지 쾌활한 연습입니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendation.challenges.map((c, idx) => {
                  const done = !!completedChallenges[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleChallenge(idx)}
                      className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-300 focus:outline-none cursor-pointer ${
                        done
                          ? "bg-green-500/5 border-green-500/30 text-white/50"
                          : "bg-white/[0.01] border-white/5 text-white hover:bg-white/[0.03] hover:border-white/10"
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        done 
                          ? "bg-green-500 border-green-400 text-black font-bold" 
                          : "border-white/20 text-transparent"
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      
                      <div className="space-y-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${done ? "text-green-400/60" : "text-blue-400"}`}>
                          MISSION O{idx + 1}
                        </span>
                        <p className={`text-xs md:text-sm font-sans leading-relaxed ${done ? "line-through text-white/40" : "text-white/80"}`}>
                          {c}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reflection diary input block */}
            <div className="p-6 md:p-8 rounded-[28px] bg-white/[0.01] border border-white/5 space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/90 flex items-center gap-2">
                  <Feather size={14} className="text-blue-400" />
                  창조적 반향 쓰기 (감상 기록 보관)
                </h3>
                <p className="text-[11px] text-white/40 font-sans">
                  오늘 추천받은 명작을 보고 떠오른 전율이나 마음속 사소한 소리를 자유롭게 스케치해 보세요. 보관된 감상은 라이브러리에 연동되어 영구 보존됩니다.
                </p>
              </div>

              {reflectionSaved ? (
                <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20 text-center space-y-2">
                  <p className="text-xs font-bold text-green-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} />
                    당신의 소중한 감상이 뮤즈 보관소(Library)에 영구 동기화되었습니다!
                  </p>
                  <p className="text-[10px] text-white/50">
                    전체 라이브러리(Library) 페이지에서 기록을 확인하고 더 깊은 공명 지수를 쌓아가실 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="작품에 대한 사소한 단상, 오늘 얻은 창의적 아이디어, 혹은 챌린지를 진행하면서 전율을 느꼈던 부분을 가볍게 적어 마음을 정돈해 보세요..."
                    maxLength={1000}
                    rows={4}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-xs md:text-sm font-sans leading-relaxed text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none transition-all"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/30 font-sans">
                      {reflectionText.length} / 1000자
                    </span>
                    <button
                      onClick={handleSaveReflection}
                      disabled={!reflectionText.trim() || isSavingReflection}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                    >
                      {isSavingReflection ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full border border-t-white animate-spin" />
                          기록하는 중...
                        </>
                      ) : (
                        <>
                          <Send size={11} />
                          MUSE 보관소 동기화
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      
    </div>
  );
}
