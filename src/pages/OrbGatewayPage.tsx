import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  Square,
  Play,
  Check,
  Copy,
  X,
  ArrowRight,
} from "lucide-react";
import { sacredAudio } from "@/lib/omniWarp/sacredAudio";
import { triggerHaptic } from "@/lib/omniWarp/omniWarpHaptics";
import { playTTS, stopTTS, useTTSActive } from "@/utils/tts";
import { getPendingPrismToss, clearPrismToss } from "@/lib/prismToss";
import { LucyGatewayFabButton } from "@/components/LucyGatewayFabButton";
import { BgMusicPlayer } from "@/components/trinity/BgMusicPlayer";
import { CrystalOrbIcon } from "@/components/icons/CrystalOrbIcon";
import { PrismGatewayFabButton } from "@/components/PrismGatewayFabButton";
import { safeLocalStorage } from "@/utils/safeStorage";

export interface SeptagramAppDimension {
  id: string;
  name: string;
  shortName: string;
  subTitle: string;
  path: string;
  icon: string;
  runeSymbol: string;
  runeName: string;
  runeMeaning: string;
  orbitTier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  orbitRadius: number;
  initialAngle: number;
  color: string;
  glowColor: string;
  keywords: string[];
  description: string;
}

/**
 * 🪐 칠요 성진(Septagram) 7대 차원(앱) 메타데이터
 * 7대 전용 동심 궤도(Concentric Planetary Orrery) & 고대 룬 표식(Elder Runic Sigils)
 * 각 룬의 명칭을 실제 앱 제목과 1:1로 정확하게 일치
 */
export const SEPTAGRAM_APPS: SeptagramAppDimension[] = [
  // Tier 1 (r=120): PROLOGUE
  {
    id: "prologue",
    name: "PROLOGUE",
    shortName: "프롤로그",
    subTitle: "운명의 서막 & 프리즘 허브",
    path: "/",
    icon: "☀️",
    runeSymbol: "ᚠ",
    runeName: "Fehu",
    runeMeaning: "새로운 시작과 운명의 창조",
    orbitTier: 1,
    orbitRadius: 120,
    initialAngle: 0,
    color: "#f59e0b", // 골드 앰버
    glowColor: "rgba(245, 158, 11, 0.9)",
    keywords: ["시작", "운명", "서막", "프리즘", "허브", "탄생", "비전", "전체", "홈"],
    description: "새로운 운명의 서막과 전체 프리즘 유니버스의 관문",
  },
  // Tier 2 (r=135): ORANGE
  {
    id: "orange",
    name: "ORANGE",
    shortName: "오렌지",
    subTitle: "감정 성찰과 소원의 우물",
    path: "/orange",
    icon: "🍊",
    runeSymbol: "ᛋ",
    runeName: "Sowilo",
    runeMeaning: "태양과 내면의 빛",
    orbitTier: 2,
    orbitRadius: 135,
    initialAngle: 51.4,
    color: "#f97316", // 오렌지
    glowColor: "rgba(249, 115, 22, 0.9)",
    keywords: ["성찰", "소원의 우물", "감정", "마음", "소원", "치유", "불안", "시크릿", "평온"],
    description: "불안과 감정을 성찰하고 소원의 우물에 소망을 띄우는 비밀의 숲",
  },
  // Tier 3 (r=150): TRINITY
  {
    id: "trinity",
    name: "TRINITY",
    shortName: "트리니티",
    subTitle: "3장의 타로와 무의식 탐색",
    path: "/trinity",
    icon: "🔮",
    runeSymbol: "ᛈ",
    runeName: "Pertho",
    runeMeaning: "운명과 심층 무의식의 비밀",
    orbitTier: 3,
    orbitRadius: 150,
    initialAngle: 102.8,
    color: "#a855f7", // 퍼플
    glowColor: "rgba(168, 85, 247, 0.9)",
    keywords: ["미래", "갈림길", "선택", "운명", "무의식", "타로", "상징", "카드", "심층", "직관", "점괘", "예견", "방향"],
    description: "3장의 상징 카드로 무의식의 심층 심리를 해독",
  },
  // Tier 4 (r=165): AURA
  {
    id: "aura",
    name: "AURA",
    shortName: "오라",
    subTitle: "소울 바이오 스펙트럼 & 방하착 치유",
    path: "/heal",
    icon: "🧘",
    runeSymbol: "ᛉ",
    runeName: "Algiz",
    runeMeaning: "보호와 내면의 치유",
    orbitTier: 4,
    orbitRadius: 165,
    initialAngle: 154.3,
    color: "#10b981", // 에메랄드
    glowColor: "rgba(16, 185, 129, 0.9)",
    keywords: ["집착", "불안", "긴장", "내려놓기", "방하착", "흘려보냄", "명상", "통제", "수용", "오라", "치유", "바이오"],
    description: "마음의 긴장과 번뇌를 내려놓는 세도나 방하착 명상과 오라 바이오",
  },
  // Tier 5 (r=180): BLUEBIRD
  {
    id: "bluebird",
    name: "BLUEBIRD",
    shortName: "파랑새",
    subTitle: "호오포노포노 정화 & 웰니스 성소",
    path: "/bluebird",
    icon: "🐦",
    runeSymbol: "ᛒ",
    runeName: "Berkana",
    runeMeaning: "영혼을 감싸는 안식처",
    orbitTier: 5,
    orbitRadius: 180,
    initialAngle: 205.7,
    color: "#06b6d4", // 청록 아쿠아
    glowColor: "rgba(6, 182, 212, 0.9)",
    keywords: ["상처", "죄책감", "미안", "용서", "화해", "참회", "인간관계", "갈등", "정화", "사랑합니다", "안식", "웰니스", "파랑새"],
    description: "미안합니다·용서하세요·감사합니다·사랑합니다 정화와 웰니스 성소",
  },
  // Tier 6 (r=195): MUSE
  {
    id: "muse",
    name: "MUSE",
    shortName: "뮤즈",
    subTitle: "명화·명시·명곡 예술처방",
    path: "/muse",
    icon: "🎨",
    runeSymbol: "ᚹ",
    runeName: "Wunjo",
    runeMeaning: "예술적 희열과 하모니",
    orbitTier: 6,
    orbitRadius: 195,
    initialAngle: 257.1,
    color: "#ec4899", // 핑크
    glowColor: "rgba(236, 72, 153, 0.9)",
    keywords: ["감성", "예술", "명화", "음악", "영감", "시", "창의", "처방", "클래식", "노래", "아름다움"],
    description: "클래식 명곡과 명화, 시구로 메마른 감성을 소생",
  },
  // Tier 7 (r=210): EPILOGUE
  {
    id: "epilogue",
    name: "EPILOGUE",
    shortName: "에필로그",
    subTitle: "밤 서재 하루 마감 영감 일기",
    path: "/epilogue",
    icon: "🌙",
    runeSymbol: "ᚨ",
    runeName: "Ansuz",
    runeMeaning: "신성한 지혜와 영감의 기록",
    orbitTier: 7,
    orbitRadius: 210,
    initialAngle: 308.6,
    color: "#6366f1", // 인디고
    glowColor: "rgba(99, 102, 241, 0.9)",
    keywords: ["밤", "하루", "마감", "일기", "회고", "성찰", "마무리", "오늘", "기록", "지혜", "서재", "기억", "에필로그"],
    description: "오늘 하루를 고요히 마무리하고 지혜로 기록하는 서재",
  },
];

export interface ScryingResult {
  query: string;
  keyTheme: string;
  directAnswer: string;
  actionSolution: string;
  color?: string;
  glow?: string;
  timestamp: number;
  recommendedAppId?: string;
  modeTitle?: string;
  activeRunes?: string[];
  isMaster?: boolean;
}

/**
 * 🪐 440x440 오러리 좌표계 상에서 각 룬의 정밀 중심 좌표(cx, cy) 계산
 */
export function getRuneCoordinates(appId: string): { x: number; y: number } {
  const app = SEPTAGRAM_APPS.find((a) => a.id === appId);
  if (!app) return { x: 220, y: 220 };
  const r = app.orbitRadius;
  const rad = (app.initialAngle * Math.PI) / 180;
  return {
    x: 220 + r * Math.cos(rad),
    y: 220 + r * Math.sin(rad),
  };
}

const DEFAULT_ORACLE_SOLUTIONS: Array<{
  keyTheme: string;
  directAnswer: string;
  actionSolution: string;
  color: string;
  glow: string;
}> = [
  {
    keyTheme: "명료한 결단",
    directAnswer: "망설임이 길어질수록 생각의 무게만 늘어납니다. 이미 마음 깊은 곳에서 당신이 느끼고 있는 그 첫 번째 선택을 신뢰하고 방향을 확정하세요.",
    actionSolution: "불필요한 비교를 멈추고, 선택한 방향에 오늘 바로 첫 걸음을 떼어보세요.",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.6)",
  },
  {
    keyTheme: "과감한 실행",
    directAnswer: "완벽한 타이밍을 기다리지 마세요. 작은 움직임이 거대한 생각의 정체를 깨뜨리고 새로운 돌파구를 열어줍니다.",
    actionSolution: "5분 안에 끝낼 수 있는 가장 쉬운 행동 하나를 지금 즉시 실행하세요.",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.6)",
  },
  {
    keyTheme: "순리적 흐름",
    directAnswer: "지금은 억지로 힘을 주어 상황을 통제하려 하기보다, 흐름을 한 박자 관망하며 주변의 신호를 지켜보는 편이 훨씬 유리합니다.",
    actionSolution: "조급한 마음에 즉각적인 답을 요구하지 말고 하루만 여유를 두어보세요.",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.6)",
  },
  {
    keyTheme: "내면의 정돈",
    directAnswer: "외부의 소음과 타인의 기준에서 한 걸음 물러설 때, 진짜 당신이 원하고 집중해야 할 본질이 뚜렷해집니다.",
    actionSolution: "머릿속을 어지럽히는 복잡한 생각들을 종이에 적어보고 불필요한 것을 지워보세요.",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.6)",
  },
  {
    keyTheme: "시야의 전환",
    directAnswer: "지금 부딪힌 문제는 막다른 길이 아니라, 지금까지와는 다른 시각으로 접근하라는 기회의 신호입니다.",
    actionSolution: "문제를 정반대 입장에서 생각해보거나 다른 분야의 방식을 대입해보세요.",
    color: "#ec4899",
    glow: "rgba(236, 72, 153, 0.6)",
  },
  {
    keyTheme: "자기 신뢰",
    directAnswer: "당신은 이미 이 상황을 지혜롭게 풀어갈 충분한 내적 역량을 갖추고 있습니다. 의심의 안개를 걷어내세요.",
    actionSolution: "과거에 어려움을 지혜롭게 극복했던 경험을 떠올리며 스스로를 격려하세요.",
    color: "#6366f1",
    glow: "rgba(99, 102, 241, 0.6)",
  },
];

export default function OrbGatewayPage() {
  const [, navigate] = useLocation();
  const [inquiry, setInquiry] = useState("");
  const [isScrying, setIsScrying] = useState(false);
  const [scryingResult, setScryingResult] = useState<ScryingResult | null>(null);
  const [hoveredApp, setHoveredApp] = useState<SeptagramAppDimension | null>(null);
  const [hoveredRuneInfo, setHoveredRuneInfo] = useState<{
    app: SeptagramAppDimension;
    x: number;
    y: number;
  } | null>(null);
  const hoveredRuneRef = useRef<HTMLElement | null>(null);

  // 룬 선택 및 연동 모드 상태 (최대 2개 선택)
  const [selectedRuneIds, setSelectedRuneIds] = useState<string[]>([]);
  // 가운데 오브 터치 시 활성화되는 마스터 모드 (7대 차원 통합 공명)
  const [isMasterMode, setIsMasterMode] = useState<boolean>(false);

  // 룬 호버 시 궤도 회전 중에도 배지가 항상 정방향(수평)으로 정밀 추적되도록 애니메이션 프레임 동기화
  useEffect(() => {
    if (!hoveredApp || !hoveredRuneRef.current) return;
    let animId: number;
    const updatePosition = () => {
      if (hoveredRuneRef.current && hoveredApp) {
        const rect = hoveredRuneRef.current.getBoundingClientRect();
        setHoveredRuneInfo({
          app: hoveredApp,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        animId = requestAnimationFrame(updatePosition);
      }
    };
    animId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animId);
  }, [hoveredApp]);

  // 룬 클릭 시 최대 7개까지 연동 모드 확장 가능 (7개 연동 시 마스터 모드 가동)
  const handleRuneClick = (app: SeptagramAppDimension) => {
    setScryingResult(null); // 이전 결과 리셋하여 전환된 모드 상태가 오브 중심에 즉시 표기되게 함

    setSelectedRuneIds((prev) => {
      let next: string[];
      if (prev.includes(app.id)) {
        // 이미 선택된 룬 클릭 시 즉시 선택 해제
        next = prev.filter((id) => id !== app.id);
        triggerHaptic("whitehole");
        sacredAudio.playSingingBowl(639);
      } else {
        // 최대 7개까지 연동 선택 추가
        if (prev.length >= 7) {
          next = [...prev.slice(1), app.id];
        } else {
          next = [...prev, app.id];
        }
        triggerHaptic("whitehole");
        sacredAudio.playSingingBowl(639);
      }

      // 7개 연동되면 그게 바로 마스터 모드!
      if (next.length === 7) {
        setIsMasterMode(true);
        triggerHaptic("blackhole");
        sacredAudio.playSingingBowl(528);
      } else {
        setIsMasterMode(false);
      }
      return next;
    });
  };

  // 가운데 오브 클릭 시: 마스터 모드(7개 전 차원 연동)와 수다 모드 간의 즉각 토글!
  const handleCenterOrbClick = () => {
    setScryingResult(null); // 이전 결과 리셋하여 모드 변경 상태 즉각 노출

    if (isMasterMode || selectedRuneIds.length === 7) {
      // 마스터 모드에서 가운데 오브 누르면 바로 수다모드로 전환 (모든 룬 연동 해제)
      triggerHaptic("whitehole");
      sacredAudio.playSingingBowl(528);
      setIsMasterMode(false);
      setSelectedRuneIds([]);
    } else {
      // 일반/연동 모드에서 가운데 오브 터치 시 -> 7개 룬 전체 동시 연동으로 마스터 모드 즉각 가동!
      triggerHaptic("blackhole");
      sacredAudio.playSingingBowl(528);
      setIsMasterMode(true);
      setSelectedRuneIds(SEPTAGRAM_APPS.map((a) => a.id));
    }
  };

  // Audio & Mic States
  const [isDroneOn, setIsDroneOn] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // TTS State from Prism Hook
  const isTTSActive = useTTSActive();

  // 7대 앱 중 질문과 해답에 가장 알맞은 앱 판별
  const determineRecommendedApp = (queryText: string, theme: string, answer: string): string => {
    const combined = `${queryText} ${theme} ${answer}`.toLowerCase();
    let bestId = "bluebird";
    let maxScore = -1;

    for (const app of SEPTAGRAM_APPS) {
      let score = 0;
      for (const kw of app.keywords) {
        if (combined.includes(kw.toLowerCase())) {
          score += 2;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestId = app.id;
      }
    }

    if (maxScore <= 0) {
      const hash = queryText.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      bestId = SEPTAGRAM_APPS[Math.abs(hash) % SEPTAGRAM_APPS.length].id;
    }

    return bestId;
  };

  // 룬 보석 클릭 시 영시 문맥을 품고 해당 차원으로 즉시 도약(Toss)
  const handleTossToDimension = (app: SeptagramAppDimension) => {
    try {
      const tossPayload = {
        source: "orb",
        sourceName: "크리스탈 오브",
        targetAppId: app.id,
        timestamp: Date.now(),
        query: scryingResult?.query || inquiry || "",
        keyTheme: scryingResult?.keyTheme || "직관의 통찰",
        directAnswer: scryingResult?.directAnswer || "",
        actionSolution: scryingResult?.actionSolution || "",
      };
      safeLocalStorage.setItem("prism_toss_context", JSON.stringify(tossPayload));
      safeLocalStorage.setItem("pending_prism_toss", JSON.stringify(tossPayload));
    } catch (_) {}

    triggerHaptic("whitehole");
    sacredAudio.playSingingBowl(852);

    if (app.id === "hooponopono") {
      navigate("/bluebird?tab=hooponopono");
    } else {
      navigate(app.path);
    }
  };

  // Prism Sync Info
  const [prismUserName, setPrismUserName] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Dynamic Head & PWA Meta for iPhone Safari "Add to Home Screen"
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "크리스탈 오브 (Crystal Orb)";

    // 1. Manifest
    let manifestTag = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifestHref = manifestTag ? manifestTag.getAttribute("href") : null;
    if (manifestTag) {
      manifestTag.setAttribute("href", "/manifest-orb.webmanifest");
    } else {
      manifestTag = document.createElement("link");
      manifestTag.rel = "manifest";
      manifestTag.href = "/manifest-orb.webmanifest";
      document.head.appendChild(manifestTag);
    }

    // 2. Apple Touch Icons (Critical for iOS Safari "Add to Home Screen")
    const appleTouchIcons = document.querySelectorAll('link[rel^="apple-touch-icon"]') as NodeListOf<HTMLLinkElement>;
    const prevAppleIconHrefs: Array<{ el: HTMLLinkElement; href: string }> = [];
    appleTouchIcons.forEach((iconTag) => {
      prevAppleIconHrefs.push({ el: iconTag, href: iconTag.href });
      iconTag.href = "/apple-touch-icon-orb.png";
    });

    let standardAppleIcon = document.querySelector('link[rel="apple-touch-icon"]:not([sizes])') as HTMLLinkElement | null;
    let createdStandardAppleIcon = false;
    if (!standardAppleIcon) {
      standardAppleIcon = document.createElement("link");
      standardAppleIcon.rel = "apple-touch-icon";
      standardAppleIcon.href = "/apple-touch-icon-orb.png";
      document.head.appendChild(standardAppleIcon);
      createdStandardAppleIcon = true;
    } else {
      standardAppleIcon.href = "/apple-touch-icon-orb.png";
    }

    let standardPrecomposedIcon = document.querySelector('link[rel="apple-touch-icon-precomposed"]:not([sizes])') as HTMLLinkElement | null;
    let createdPrecomposedIcon = false;
    if (!standardPrecomposedIcon) {
      standardPrecomposedIcon = document.createElement("link");
      standardPrecomposedIcon.rel = "apple-touch-icon-precomposed";
      standardPrecomposedIcon.href = "/apple-touch-icon-orb.png";
      document.head.appendChild(standardPrecomposedIcon);
      createdPrecomposedIcon = true;
    } else {
      standardPrecomposedIcon.href = "/apple-touch-icon-orb.png";
    }

    // 3. Favicons
    const favicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]') as NodeListOf<HTMLLinkElement>;
    const prevFaviconHrefs: Array<{ el: HTMLLinkElement; href: string }> = [];
    favicons.forEach((favTag) => {
      prevFaviconHrefs.push({ el: favTag, href: favTag.href });
      favTag.href = "/orb-icon-192.png";
    });

    // 4. Apple Mobile Web App Title
    let appleTitleTag = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    const prevAppleTitle = appleTitleTag ? appleTitleTag.getAttribute("content") : null;
    if (appleTitleTag) {
      appleTitleTag.setAttribute("content", "크리스탈 오브");
    } else {
      appleTitleTag = document.createElement("meta");
      appleTitleTag.name = "apple-mobile-web-app-title";
      appleTitleTag.content = "크리스탈 오브";
      document.head.appendChild(appleTitleTag);
    }

    // 5. Application Name
    let appNameTag = document.querySelector('meta[name="application-name"]') as HTMLMetaElement | null;
    const prevAppName = appNameTag ? appNameTag.getAttribute("content") : null;
    if (appNameTag) {
      appNameTag.setAttribute("content", "크리스탈 오브");
    }

    // 6. Theme Color
    let themeColorTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const prevThemeColor = themeColorTag ? themeColorTag.getAttribute("content") : null;
    if (themeColorTag) {
      themeColorTag.setAttribute("content", "#030308");
    }

    return () => {
      document.title = prevTitle;
      if (manifestTag && prevManifestHref) manifestTag.setAttribute("href", prevManifestHref);
      prevAppleIconHrefs.forEach(({ el, href }) => {
        el.href = href;
      });
      if (createdStandardAppleIcon && standardAppleIcon && standardAppleIcon.parentNode) {
        standardAppleIcon.parentNode.removeChild(standardAppleIcon);
      }
      if (createdPrecomposedIcon && standardPrecomposedIcon && standardPrecomposedIcon.parentNode) {
        standardPrecomposedIcon.parentNode.removeChild(standardPrecomposedIcon);
      }
      prevFaviconHrefs.forEach(({ el, href }) => {
        el.href = href;
      });
      if (appleTitleTag && prevAppleTitle) appleTitleTag.setAttribute("content", prevAppleTitle);
      if (appNameTag && prevAppName) appNameTag.setAttribute("content", prevAppName);
      if (themeColorTag && prevThemeColor) themeColorTag.setAttribute("content", prevThemeColor);
    };
  }, []);

  // Synchronize Prism identity
  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem("prism_user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.displayName) setPrismUserName(p.displayName);
      }
    } catch (_) {}

    const handlePrismNavigate = (e: any) => {
      const targetPath = e?.detail?.path;
      if (targetPath && typeof targetPath === "string") {
        window.location.href = targetPath;
      }
    };
    window.addEventListener("prism-navigate", handlePrismNavigate);

    return () => {
      stopTTS();
      window.removeEventListener("prism-navigate", handlePrismNavigate);
    };
  }, []);

  // Swirling Particle Nebula Inside Orb Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = 380);
    const height = (canvas.height = 380);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      speed: number;
      dist: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = ["#60a5fa", "#a78bfa", "#38bdf8", "#c084fc", "#ffffff"];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        radius: Math.random() * 2.2 + 0.6,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.012 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        dist: Math.random() * 130 + 8,
        alpha: Math.random() * 0.65 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep glowing core
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        width / 2
      );
      grad.addColorStop(0, "rgba(96, 165, 250, 0.22)");
      grad.addColorStop(0.5, "rgba(167, 139, 250, 0.12)");
      grad.addColorStop(1, "rgba(4, 3, 10, 0.95)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      // Swirling Stardust Particles
      particles.forEach((p) => {
        p.angle += p.speed * (1 + audioLevel * 2.5 + (isScrying ? 4 : 0));
        const px = width / 2 + Math.cos(p.angle) * p.dist;
        const py = height / 2 + Math.sin(p.angle) * p.dist;

        ctx.beginPath();
        ctx.arc(px, py, p.radius * (1 + audioLevel * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (isScrying ? 0.95 : 0.7);
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [audioLevel, isScrying]);

  // Toggle 528Hz Solfeggio Healing Drone
  const handleToggleDrone = () => {
    const active = sacredAudio.toggleDrone();
    setIsDroneOn(active);
    triggerHaptic("whitehole");
  };

  // Toggle Vocal Resonance Microphone
  const handleToggleMic = async () => {
    if (isMicActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setIsMicActive(false);
      setAudioLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = actx;
      const src = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyserRef.current = analyser;
      setIsMicActive(true);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (!analyserRef.current || !mediaStreamRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;
        setAudioLevel(Math.min(1.0, avg / 70));
        requestAnimationFrame(poll);
      };
      poll();
    } catch {
      setIsMicActive(true);
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.3 + 0.1);
      }, 250);
      setTimeout(() => clearInterval(interval), 15000);
    }
  };

  // Speak Oracle Message with TTS
  const handleSpeakTTS = (result: ScryingResult) => {
    if (isTTSActive) {
      stopTTS();
      return;
    }

    const speechScript = `${result.keyTheme}. ${result.directAnswer} 실천 가이드입니다. ${result.actionSolution}`;
    playTTS(speechScript, "lucy");
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyResult = (result: ScryingResult) => {
    try {
      navigator.clipboard.writeText(`[직관의 해답 - ${result.keyTheme}]\n질문: "${result.query}"\n해답: ${result.directAnswer}\n실천 가이드: ${result.actionSolution}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  // Execute Direct Question-Answering & Insight Scrying with guaranteed safety timeout
  const executeScrying = async (questionText?: string) => {
    if (isScrying) return; // Prevent concurrent overlapping requests

    const query = questionText || inquiry.trim() || "지금 나에게 가장 필요한 명료한 방향과 선택";
    stopTTS();
    setIsScrying(true);
    setScryingResult(null);

    sacredAudio.playSingingBowl(528);
    triggerHaptic("blackhole");

    // Gather Prism background knowledge (Profile, MBTI, Saju)
    let prismContextBriefing = "";
    try {
      const profileRaw = localStorage.getItem("prism_user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.displayName) prismContextBriefing += `이름: ${p.displayName}. `;
        if (p?.basic?.mbti) prismContextBriefing += `성향/MBTI: ${p.basic.mbti}. `;
      }
    } catch (_) {}

    // Base fallback oracle solution
    const hash = query.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const baseFallback = DEFAULT_ORACLE_SOLUTIONS[Math.abs(hash) % DEFAULT_ORACLE_SOLUTIONS.length];

    // Determine Mode, System Instruction, and Mode-Tuned Fallbacks
    let modeTitle = "루시 수다 모드";
    let promptInstruction = "";
    let defaultKeyTheme = "다정한 공감";
    let defaultAnswer = `그런 생각을 하고 있었군요! 충분히 그럴 수 있고, 그 마음 정말 이해돼요. 너무 무겁게 짊어지지 말고 편안하게 털어놓아 줘서 고마워요.`;
    let defaultAction = `지금 가볍게 기지개를 켜고, 시원한 물 한 잔 마시면서 마음을 가볍게 환기해 봐요!`;
    let modeColor = "#38bdf8";
    let modeGlow = "rgba(56, 189, 248, 0.6)";

    if (isMasterMode || selectedRuneIds.length === 7) {
      modeTitle = "👑 7대 차원 통합 마스터 모드";
      modeColor = "#fbbf24";
      modeGlow = "rgba(251, 191, 36, 0.7)";
      defaultKeyTheme = "통섭의 지혜";
      defaultAnswer = `현재 당신이 마주한 고민은 단편적인 문제가 아니라 삶의 흐름이 한 단계 도약하려는 중요한 전환점입니다. 내면의 불안과 집착을 내려놓고 솔직한 감정을 마주할 때, 가장 본질적이고 명료한 길이 비로소 드러납니다.`;
      defaultAction = `조급한 통제를 멈추고 깊은 심호흡과 함께, 지금 이 순간 할 수 있는 가장 선명한 단 하나의 행동에 온전히 몰입하세요.`;
      promptInstruction = `[현재 모드: 7대 차원 통합 마스터 모드 (Master Cosmic Synthesis)]
오브의 7대 차원(프롤로그 운명의 서막, 오렌지 소원의 우물, 트리니티 심층 무의식, 오라 방하착 치유, 파랑새 호오포노포노 정화, 뮤즈 예술처방, 에필로그 삶의 지혜)의 모든 지혜를 집대성한 최고 권위의 7대 차원 '마스터 모드' 답변입니다.
고민의 근원적 원인을 꿰뚫고, 입체적이며 총체적인 통섭 통찰과 현실적 마스터 액션을 제시하세요.`;
    } else if (selectedRuneIds.length >= 2) {
      const activeApps = selectedRuneIds
        .map((id) => SEPTAGRAM_APPS.find((a) => a.id === id))
        .filter(Boolean) as SeptagramAppDimension[];
      const names = activeApps.map((a) => a.shortName).join(" × ");
      modeTitle = `⚡ ${names} ${activeApps.length}중 연동 모드`;
      modeColor = activeApps[0]?.color || "#38bdf8";
      modeGlow = activeApps[0]?.glowColor || "rgba(56, 189, 248, 0.6)";
      defaultKeyTheme = activeApps.slice(0, 2).map((a) => a.shortName).join("과 ");
      defaultAnswer = `[${activeApps.map((a) => a.name).join(", ")}]의 시너지를 결합하면, 지금의 상황은 한 방향의 시각을 넘어 다채로운 가능성으로 풀려나갈 수 있습니다. 각 차원의 지혜가 서로를 보완하며 명쾌한 통찰의 실마리를 제공합니다.`;
      defaultAction = `${activeApps.length}개 연동 차원의 조화로운 흐름을 신뢰하며, 지금 마음속 가장 선명하게 떠오르는 실천을 시작해 보세요.`;
      const dimensionDescriptions = activeApps
        .map((a, i) => `- 차원 ${i + 1} (${a.name}): ${a.description} (룬: ${a.runeMeaning})`)
        .join("\n");
      promptInstruction = `[현재 모드: ${names} ${activeApps.length}중 차원 연동 시너지 모드]
선택된 ${activeApps.length}개 앱의 고유한 지혜를 유기적으로 융합하여 단일 관점을 뛰어넘는 심화 시너지 답변을 제공하세요.
${dimensionDescriptions}
선택된 차원들의 관점이 상호 보완되어 깊어지는 융합 통찰과 결합된 현실적 실천 솔루션을 명쾌하게 제시하세요.`;
    } else if (selectedRuneIds.length === 1) {
      const app = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
      modeTitle = `✨ ${app?.name} 모드`;
      modeColor = app?.color || "#38bdf8";
      modeGlow = app?.glowColor || "rgba(56, 189, 248, 0.6)";
      defaultKeyTheme = app?.shortName || "직관의 답";

      if (app?.id === "prologue") {
        defaultAnswer = `새로운 운명의 서막이 열리고 있습니다. 과거의 묵은 틀에 갇히지 말고 모든 가능성이 열려 있는 출발선에 섰음을 자각하세요.`;
        defaultAction = `오늘 하루 새로운 가능성을 향해 가벼운 마음으로 첫 걸음을 내딛으세요.`;
      } else if (app?.id === "aura") {
        defaultAnswer = `잡고 있으려 할수록 손안의 모래처럼 에너지만 소모됩니다. 그 생각과 긴장을 통제하려 하지 말고 '그냥 온전히 놓아주어도 괜찮다'고 스스로에게 허락해 보세요.`;
        defaultAction = `어깨의 힘을 툭 빼고, 깊은 날숨과 함께 마음에 쥔 집착을 허공으로 흘려보내세요.`;
      } else if (app?.id === "bluebird") {
        defaultAnswer = `이 상황과 감정의 뿌리를 맑게 정화할 때입니다. 내면의 엉킨 매듭을 향해 네 마디 정화의 말(미안합니다, 용서하세요, 감사합니다, 사랑합니다)을 건네며 화해를 이루세요.`;
        defaultAction = `가슴에 손을 얹고 마음속으로 4마디 정화의 말을 고요히 세 번 읊어보세요.`;
      } else if (app?.id === "orange") {
        defaultAnswer = `솔직하지 못한 감정은 마음속에 앙금으로 남습니다. 지금 느끼는 두려움이나 아쉬움을 솔직히 인정하고, 소원의 우물에 진짜 바라는 소망의 빛을 띄워보세요.`;
        defaultAction = `내가 진정으로 바라는 소망이 무엇인지 단 한 문장으로 종이에 적어보세요.`;
      } else if (app?.id === "trinity") {
        defaultAnswer = `무의식의 거울은 이미 당신이 가야 할 방향을 비추고 있습니다. 불확실성에 휘둘리기보다, 당신의 깊은 직관이 속삭이는 명확한 상징과 선택을 신뢰하세요.`;
        defaultAction = `타인의 의견보다 당신의 첫 번째 직관적 영감을 나침반 삼아 과감히 한 걸음 나아가세요.`;
      } else if (app?.id === "muse") {
        defaultAnswer = `메마른 생각의 굴레에서 벗어나 감성의 선율에 귀를 기울이세요. 이 고민은 아름다운 시구처럼 당신을 더욱 깊고 풍요롭게 빚어내는 예술적 성장의 과정입니다.`;
        defaultAction = `좋아하는 음악 한 곡을 눈감고 감상하며 굳어있던 마음에 신선한 영감을 불어넣으세요.`;
      } else if (app?.id === "epilogue") {
        defaultAnswer = `오늘 하루 마주했던 혼란도 밤의 서재에서는 한 줄의 지혜로운 기록이 됩니다. 지나간 일에 매달리지 말고 오늘 배운 교훈을 품고 평온히 마무리하세요.`;
        defaultAction = `오늘 나를 성장시킨 감사한 배움 하나를 기록하고 홀가분하게 잠자리에 드세요.`;
      } else {
        defaultAnswer = `지친 마음을 억지로 다그치지 마세요. 따뜻한 쉼과 자기 연민이 지금 당신에게 가장 필요한 회복의 묘약입니다.`;
        defaultAction = `따뜻한 차 한 잔을 마시며 오늘은 오직 나 자신만을 위한 온전한 휴식을 선물하세요.`;
      }

      promptInstruction = `[현재 모드: ${app?.name} 단일 차원 모드]
해당 앱의 핵심 철학(${app?.description}, 룬 의미: ${app?.runeMeaning})에 오롯이 집중하여, 질문/고민에 대해 이 차원의 고유한 렌즈로 명쾌하고 깊이 있는 맞춤형 해답과 실천 가이드를 제시하세요.`;
    } else {
      // 수다 모드 (아무런 룬도 선택하지 않았을 때)
      modeTitle = "💬 루시 수다 모드";
      modeColor = "#38bdf8";
      modeGlow = "rgba(56, 189, 248, 0.6)";
      defaultKeyTheme = baseFallback.keyTheme || "다정한 공감";
      promptInstruction = `[현재 모드: 루시 다정한 수다 모드 (Casual Chat)]
아무런 룬도 선택되지 않은 편안한 '수다 모드'입니다. 루시처럼 매우 친근하고 다정하며, 공감과 가벼운 위로, 재치 있는 일상 조언을 카페에서 대화하듯 편안하게 건네주세요. 어려운 전문 용어나 카드 상징은 일절 쓰지 마세요.`;
    }

    let finalResult: ScryingResult = {
      query,
      keyTheme: defaultKeyTheme,
      directAnswer: defaultAnswer,
      actionSolution: defaultAction,
      color: modeColor,
      glow: modeGlow,
      timestamp: Date.now(),
      modeTitle,
      activeRunes: selectedRuneIds,
      isMaster: isMasterMode,
    };

    // Call API with strict 3.5s timeout via AbortController to guarantee no infinite hang
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 3500);

    try {
      const resp = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          prompt: `[질문자 정보: ${prismContextBriefing || "자유 탐색자"}]\n사용자의 질문/고민: "${query}"\n\n${promptInstruction}\n\n반드시 다음 순수 JSON 포맷으로만 응답하세요:\n{\n  "keyTheme": "2~4글자의 핵심 키워드",\n  "directAnswer": "고민에 대한 2~3문장의 명쾌하고 직관적인 직접 해답",\n  "actionSolution": "1문장의 구체적이고 현실적인 실천 가이드"\n}`,
        }),
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const rawContent = data?.text || data?.response || data?.content || "";
        if (typeof rawContent === "string" && rawContent.trim().length > 0) {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.keyTheme && parsed.directAnswer) {
                finalResult = {
                  query,
                  keyTheme: String(parsed.keyTheme).trim(),
                  directAnswer: String(parsed.directAnswer).trim(),
                  actionSolution: String(parsed.actionSolution || defaultAction).trim(),
                  color: modeColor,
                  glow: modeGlow,
                  timestamp: Date.now(),
                  modeTitle,
                  activeRunes: selectedRuneIds,
                  isMaster: isMasterMode,
                };
              }
            } catch (_) {}
          } else if (rawContent.trim().length > 10) {
            finalResult = {
              query,
              keyTheme: defaultKeyTheme,
              directAnswer: rawContent.trim(),
              actionSolution: defaultAction,
              color: modeColor,
              glow: modeGlow,
              timestamp: Date.now(),
              modeTitle,
              activeRunes: selectedRuneIds,
              isMaster: isMasterMode,
            };
          }
        }
      }
    } catch (e) {
      // Aborted or network failure -> seamlessly use fallback instant solution
      console.warn("[OrbGateway] AI generation completed with fallback:", e);
    } finally {
      clearTimeout(timeoutId);
    }

    // Always finish scrying and present result cleanly
    setTimeout(() => {
      finalResult.recommendedAppId = determineRecommendedApp(
        finalResult.query,
        finalResult.keyTheme,
        finalResult.directAnswer
      );
      setIsScrying(false);
      setScryingResult(finalResult);
      sacredAudio.playSingingBowl(639);

      // Auto play TTS voice reading
      const speechScript = `${finalResult.keyTheme}. ${finalResult.directAnswer} 실천 가이드입니다. ${finalResult.actionSolution}`;
      playTTS(speechScript, "lucy");

      // Bidirectional Synchronization: Save Insight into Prism Background Knowledge
      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const orbPayload = {
          query: finalResult.query,
          keyTheme: finalResult.keyTheme,
          directAnswer: finalResult.directAnswer,
          actionSolution: finalResult.actionSolution,
          timestamp: finalResult.timestamp,
          dateKey: todayKey,
        };

        // 1. Dedicated Prism background storage slots
        localStorage.setItem("prism_orb_latest_scrying", JSON.stringify(orbPayload));
        localStorage.setItem(`prism_daily_oracle_orb_${todayKey}`, JSON.stringify(orbPayload));
        localStorage.setItem("prism_latest_daily_orb", JSON.stringify(orbPayload));

        // 2. Register to general Prism feature history directly
        try {
          const entry = {
            id: `feat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            app: "hub",
            appName: "크리스탈 오라클",
            featureName: "직관의 해답",
            summary: `[${finalResult.keyTheme}] ${finalResult.directAnswer.slice(0, 80)}`,
            details: orbPayload,
            timestamp: Date.now(),
            dateKey: todayKey,
          };
          const rawHist = localStorage.getItem("prism_omni_feature_history");
          let hist = rawHist ? JSON.parse(rawHist) : [];
          if (!Array.isArray(hist)) hist = [];
          hist.unshift(entry);
          if (hist.length > 60) hist = hist.slice(0, 60);
          localStorage.setItem("prism_omni_feature_history", JSON.stringify(hist));
        } catch (_) {}

        // 3. Real-time Cross-tab Broadcast Channel
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("prism-cross-app");
          bc.postMessage({
            type: "PRISM_ORB_INSIGHT",
            payload: orbPayload,
          });
          bc.close();
        }

        // 4. CustomEvents for live reactivity
        window.dispatchEvent(new CustomEvent("prism:orb_scrying_updated", { detail: orbPayload }));
        window.dispatchEvent(new CustomEvent("prism:feature_updated", { detail: orbPayload }));
      } catch (syncErr) {
        console.warn("[OrbGateway] Prism sync error:", syncErr);
      }
    }, 600);
  };

  // Check for incoming cross-app toss payload into Orb (One-touch Auto-Scrying)
  useEffect(() => {
    try {
      const pending = getPendingPrismToss("orb");
      if (pending) {
        clearPrismToss();
        const incomingQuestion = pending.personaDialogue?.lastUserMessage || pending.autoPrompt || pending.contextMessage || "";
        if (incomingQuestion) {
          setInquiry(incomingQuestion);
        }
        if (pending.autoTrigger) {
          setTimeout(() => {
            executeScrying(incomingQuestion || undefined);
          }, 450);
        }
      }
    } catch (_) {}
  }, []);

  return (
    <div
      className="relative w-full h-screen text-slate-100 flex flex-col items-center justify-between overflow-hidden select-none font-sans bg-[#05050c]"
      style={{
        background: "radial-gradient(circle at 50% 30%, #0d0d1e 0%, #05050e 65%, #020206 100%)",
      }}
    >
      {/* Background Soft Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top-Right Background Music Player (Same position as Prism Main & Expands Leftwards) */}
      <div className="fixed top-safe-2 right-4 sm:right-6 md:top-safe-4 z-[300]">
        <BgMusicPlayer />
      </div>

      {/* Top Header */}
      <header className="relative z-40 w-full max-w-4xl px-4 sm:px-6 pt-5 sm:pt-7 pr-16 sm:pr-24 flex items-center justify-between">
        {/* Left: Real-time Prism Sync Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-slate-300 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">실시간 연동</span>
            <span className="sm:hidden">연동됨</span>
          </div>
        </div>

        {/* Center Title */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg">
          <CrystalOrbIcon size={16} />
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200">
            {prismUserName ? `${prismUserName}의 직관 오브` : "크리스탈 오브"}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDrone}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl border transition-all active:scale-95 ${
              isDroneOn
                ? "bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title="528Hz 치유 사운드 토글"
          >
            {isDroneOn ? <Volume2 size={13} className="text-purple-400 animate-pulse" /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">528Hz</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl border transition-all active:scale-95 ${
              isMicActive
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title="마이크 공명 토글"
          >
            {isMicActive ? <Mic size={13} className="text-cyan-400 animate-bounce" /> : <MicOff size={13} />}
            <span className="hidden sm:inline">{isMicActive ? "공명 중" : "음성"}</span>
          </button>
        </div>
      </header>

      {/* Main Stage: Pristine 3D Crystal Ball with Arcane Magic Circle Matrix */}
      <main className="relative z-30 flex-1 flex flex-col items-center justify-center w-full max-w-lg px-4 my-auto">
        <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80">
          {/* 🌟 1. 대형 아케인 마법진 & 태양계 다층 오러리 (Concentric Planetary Orrery Matrix) */}
          <div
            className="absolute inset-[-68px] sm:inset-[-88px] pointer-events-none flex items-center justify-center transition-all duration-700 select-none z-0"
            style={{
              transform: `scale(${1 + audioLevel * 0.12})`,
            }}
          >
            {/* 회전하는 마법진 후광 코로나 오라 */}
            <div
              className="absolute inset-6 rounded-full pointer-events-none blur-3xl transition-opacity duration-500"
              style={{
                background: isScrying
                  ? "radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(168,85,247,0.3) 45%, rgba(251,191,36,0.15) 70%, transparent 85%)"
                  : "radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(168,85,247,0.15) 45%, transparent 75%)",
              }}
            />

            {/* 마법진 방사형 빛살 (8-Fold Arcane Light Flares) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: isScrying ? 18 : 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30"
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <div
                  key={`arcane-ray-${deg}`}
                  className="absolute w-0.5 h-full pointer-events-none"
                  style={{
                    transform: `rotate(${deg}deg)`,
                    background:
                      "linear-gradient(180deg, transparent 5%, rgba(56,189,248,0.6) 20%, transparent 45%, transparent 55%, rgba(168,85,247,0.6) 80%, transparent 95%)",
                  }}
                />
              ))}
            </motion.div>

            {/* 최외곽 황도 성간 눈금 림 (Outer Celestial Zodiac Rim - 440px) */}
            <svg
              viewBox="0 0 440 440"
              className="absolute inset-0 w-full h-full text-slate-400/30 pointer-events-none"
            >
              <circle cx="220" cy="220" r="216" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 6" />
              <circle cx="220" cy="220" r="212" fill="none" stroke="rgba(251,191,36,0.25)" strokeWidth="0.5" />
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180;
                const x1 = 220 + 210 * Math.cos(angle);
                const y1 = 220 + 210 * Math.sin(angle);
                const x2 = 220 + 216 * Math.cos(angle);
                const y2 = 220 + 216 * Math.sin(angle);
                return (
                  <line
                    key={`celestial-tick-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth={i % 6 === 0 ? "1.5" : "0.8"}
                    strokeOpacity={i % 6 === 0 ? 0.7 : 0.4}
                  />
                );
              })}
            </svg>

            {/* 🪐 칠요 성진 7대 전용 동심 궤도 시스템 (7 Concentric Planetary Tiers)
                - 선택모드/연동모드에서도 멈추지 않고 계속 동일 방향 회전
                - 2개 룬 연동 시: 마지막 선택된 룬이 신속히(0.35s) 이동하여 오브 중심(220, 220)을 관통하는 일직선 축 완성
                - 일직선 축 완성 후에도 정지하지 않고 오브 중심으로 같은 방향 회전 지속
            */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{
                duration: isScrying ? 16 : 48,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {/* 1. 7대 전용 동심 궤도 링 (7 Dedicated Orbit Rings, 1 ring per orb) */}
              <svg viewBox="0 0 440 440" className="absolute inset-0 w-full h-full pointer-events-none">
                {SEPTAGRAM_APPS.map((app) => {
                  const isSelected = selectedRuneIds.includes(app.id);
                  return (
                    <g key={`orbit-ring-${app.id}`}>
                      <circle
                        cx="220"
                        cy="220"
                        r={app.orbitRadius}
                        fill="none"
                        stroke={app.color}
                        strokeWidth={isSelected ? "1.6" : "0.85"}
                        strokeDasharray={isSelected ? "6 4" : "4 6"}
                        strokeOpacity={isSelected ? 0.85 : 0.3}
                        className="transition-all duration-300"
                      />
                      {isSelected && (
                        <circle
                          cx="220"
                          cy="220"
                          r={app.orbitRadius}
                          fill="none"
                          stroke={app.color}
                          strokeWidth="3.5"
                          strokeOpacity="0.25"
                          className="blur-[2px]"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* 2. 성간 공명 일직선 레이저 및 기하 결속 레이어 (Laser Beams rotating synchronously) */}
              <svg
                viewBox="0 0 440 440"
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              >
                {/* ⚡ [연동 모드] 2개 룬 연동: 오브 중심(220, 220)을 통과하는 완벽한 일직선 축 레이저 */}
                {selectedRuneIds.length === 2 && (() => {
                  const app1 = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
                  const app2 = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[1]);
                  if (!app1 || !app2) return null;

                  const rad1 = (app1.initialAngle * Math.PI) / 180;
                  // Rune 1 좌표
                  const x1 = 220 + app1.orbitRadius * Math.cos(rad1);
                  const y1 = 220 + app1.orbitRadius * Math.sin(rad1);
                  // Rune 2 좌표 (오브 중심 220, 220의 정반대편 일직선 상에 정렬)
                  const x2 = 220 - app2.orbitRadius * Math.cos(rad1);
                  const y2 = 220 - app2.orbitRadius * Math.sin(rad1);
                  const lineColor = app1.color;

                  return (
                    <motion.g
                      key={`aligned-resonance-beam-${app1.id}-${app2.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15, duration: 0.25 }}
                      className="pointer-events-none"
                    >
                      {/* 1. 외곽 코로나 블러 글로우 */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={lineColor}
                        strokeWidth="10"
                        strokeOpacity="0.35"
                        strokeLinecap="round"
                        className="blur-[5px]"
                      />
                      {/* 2. 보조 듀얼 컬러 글로우 */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={app2.color}
                        strokeWidth="4"
                        strokeOpacity="0.75"
                        strokeLinecap="round"
                      />
                      {/* 3. 코어 화이트 일직선 빔 */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* 4. 활주하는 에너지 파동 점선 */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="6 8"
                        className="animate-pulse"
                      />
                      {/* 5. 오브 중심 관통 에너지 코어 포인트 */}
                      <circle cx="220" cy="220" r="5" fill="#ffffff" className="opacity-90 shadow-sm" />
                      <circle cx="220" cy="220" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="opacity-60" />
                    </motion.g>
                  );
                })()}

                {/* ✨ [단일 모드] 1개 룬 선택 시: 선택된 룬에서 중심 오브(220, 220)로 뻗는 공명 유도 광선 */}
                {selectedRuneIds.length === 1 && (() => {
                  const app = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
                  if (!app) return null;
                  const rad = (app.initialAngle * Math.PI) / 180;
                  const x = 220 + app.orbitRadius * Math.cos(rad);
                  const y = 220 + app.orbitRadius * Math.sin(rad);
                  const lineColor = app.color;

                  return (
                    <g key={`single-beam-${app.id}`} className="pointer-events-none">
                      <line
                        x1={x}
                        y1={y}
                        x2={220}
                        y2={220}
                        stroke={lineColor}
                        strokeWidth="6"
                        strokeOpacity="0.25"
                        className="blur-[3px]"
                      />
                      <line
                        x1={x}
                        y1={y}
                        x2={220}
                        y2={220}
                        stroke={lineColor}
                        strokeWidth="2"
                        strokeDasharray="4 6"
                        strokeOpacity="0.85"
                        className="animate-pulse"
                      />
                    </g>
                  );
                })()}

                {/* 🔷 [다차원 연동 모드] 3~6개 룬 연동: 선택된 룬들 간의 성간 네트워크 및 중심 펄스 빔 */}
                {selectedRuneIds.length >= 3 && selectedRuneIds.length < 7 && !isMasterMode && (() => {
                  const selectedApps = selectedRuneIds
                    .map((id) => SEPTAGRAM_APPS.find((a) => a.id === id))
                    .filter(Boolean) as SeptagramAppDimension[];

                  return (
                    <g className="pointer-events-none">
                      {/* 선택된 룬들 간의 순환 결속선 */}
                      {selectedApps.map((app, idx) => {
                        const nextApp = selectedApps[(idx + 1) % selectedApps.length];
                        const rad1 = (app.initialAngle * Math.PI) / 180;
                        const rad2 = (nextApp.initialAngle * Math.PI) / 180;
                        const x1 = 220 + app.orbitRadius * Math.cos(rad1);
                        const y1 = 220 + app.orbitRadius * Math.sin(rad1);
                        const x2 = 220 + nextApp.orbitRadius * Math.cos(rad2);
                        const y2 = 220 + nextApp.orbitRadius * Math.sin(rad2);
                        return (
                          <line
                            key={`poly-link-${app.id}-${nextApp.id}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={app.color}
                            strokeWidth="1.2"
                            strokeOpacity="0.5"
                            strokeDasharray="4 4"
                            className="animate-pulse"
                          />
                        );
                      })}
                      {/* 각 선택된 룬에서 중심 오브로의 공명 광선 */}
                      {selectedApps.map((app) => {
                        const rad = (app.initialAngle * Math.PI) / 180;
                        const x = 220 + app.orbitRadius * Math.cos(rad);
                        const y = 220 + app.orbitRadius * Math.sin(rad);
                        return (
                          <g key={`poly-beam-${app.id}`}>
                            <line
                              x1={x}
                              y1={y}
                              x2={220}
                              y2={220}
                              stroke={app.color}
                              strokeWidth="1.5"
                              strokeOpacity="0.45"
                              strokeDasharray="3 5"
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

                {/* 🌟 [마스터 모드] 7개 룬 전체 연동 / 마스터 모드 가동 시: 7대 차원 성간 결속 기하망 */}
                {(isMasterMode || selectedRuneIds.length === 7) && (
                  <g className="pointer-events-none">
                    {/* 7대 룬에서 중심 오브로 향하는 황금 광선 */}
                    {SEPTAGRAM_APPS.map((app) => {
                      const rad = (app.initialAngle * Math.PI) / 180;
                      const x = 220 + app.orbitRadius * Math.cos(rad);
                      const y = 220 + app.orbitRadius * Math.sin(rad);
                      return (
                        <g key={`master-beam-${app.id}`}>
                          <line
                            x1={x}
                            y1={y}
                            x2={220}
                            y2={220}
                            stroke="#fbbf24"
                            strokeWidth="1.8"
                            strokeOpacity="0.75"
                            strokeDasharray="4 4"
                            className="animate-pulse"
                          />
                        </g>
                      );
                    })}
                    {/* 칠각성(Septagram) 별자리 결속선 */}
                    {SEPTAGRAM_APPS.map((app, idx) => {
                      const nextApp = SEPTAGRAM_APPS[(idx + 2) % SEPTAGRAM_APPS.length];
                      const rad1 = (app.initialAngle * Math.PI) / 180;
                      const rad2 = (nextApp.initialAngle * Math.PI) / 180;
                      const p1x = 220 + app.orbitRadius * Math.cos(rad1);
                      const p1y = 220 + app.orbitRadius * Math.sin(rad1);
                      const p2x = 220 + nextApp.orbitRadius * Math.cos(rad2);
                      const p2y = 220 + nextApp.orbitRadius * Math.sin(rad2);
                      return (
                        <line
                          key={`master-star-${idx}`}
                          x1={p1x}
                          y1={p1y}
                          x2={p2x}
                          y2={p2y}
                          stroke="rgba(251, 191, 36, 0.65)"
                          strokeWidth="1.4"
                          strokeDasharray="4 6"
                        />
                      );
                    })}
                  </g>
                )}
              </svg>

              {/* 3. 7대 전용 룬 노드 (각 오브당 1개의 층, 총 7개 층) */}
              {SEPTAGRAM_APPS.map((app) => {
                const isApp1 = selectedRuneIds[0] === app.id;
                const isApp2 = selectedRuneIds[1] === app.id;
                const isSelected = selectedRuneIds.includes(app.id);
                const selectedIndex = selectedRuneIds.indexOf(app.id);
                const isHovered = hoveredApp?.id === app.id;

                // 마지막에 선택한 룬(app2)을 오브 중심으로 반대편 일직선 축에 맞추는 각도 오프셋 계산
                let alignmentDelta = 0;
                if (isApp2 && selectedRuneIds.length === 2) {
                  const app1 = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
                  if (app1) {
                    const targetAngle = (app1.initialAngle + 180) % 360;
                    alignmentDelta = (targetAngle - app.initialAngle) % 360;
                    if (alignmentDelta > 180) alignmentDelta -= 360;
                    if (alignmentDelta < -180) alignmentDelta += 360;
                  }
                }

                // 좌표 계산 (회전 좌표계 내부의 고유 위치)
                const rad = (app.initialAngle * Math.PI) / 180;
                const cx = 220 + app.orbitRadius * Math.cos(rad);
                const cy = 220 + app.orbitRadius * Math.sin(rad);
                const leftPercent = (cx / 440) * 100;
                const topPercent = (cy / 440) * 100;

                return (
                  <motion.div
                    key={`tier-node-wrap-${app.id}`}
                    className="absolute inset-0 pointer-events-none"
                    animate={{ rotate: isApp2 ? alignmentDelta : 0 }}
                    transition={{
                      duration: 0.35,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  >
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30"
                      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                    >
                      <button
                        type="button"
                        onClick={() => handleRuneClick(app)}
                        onMouseEnter={(e) => {
                          hoveredRuneRef.current = e.currentTarget;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredApp(app);
                          setHoveredRuneInfo({
                            app,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseMove={(e) => {
                          hoveredRuneRef.current = e.currentTarget;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredRuneInfo({
                            app,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => {
                          hoveredRuneRef.current = null;
                          setHoveredApp(null);
                          setHoveredRuneInfo(null);
                        }}
                        className={`group/rune relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-300 active:scale-90 cursor-pointer ${
                          (isMasterMode || selectedRuneIds.length === 7)
                            ? "scale-120 ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.95)] z-40"
                            : isSelected
                            ? "scale-125 ring-2 ring-white shadow-[0_0_25px_rgba(255,255,255,0.95)] z-40"
                            : isHovered
                            ? "scale-120 shadow-[0_0_18px_rgba(56,189,248,0.85)]"
                            : "hover:scale-115 opacity-85 hover:opacity-100"
                        }`}
                        style={{
                          background: (isMasterMode || selectedRuneIds.length === 7)
                            ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.6) 0%, #fbbf24 60%, ${app.color} 100%)`
                            : isSelected
                            ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.4) 0%, ${app.color} 85%)`
                            : "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, rgba(15,20,35,0.95) 75%)",
                          border: `1.5px solid ${(isMasterMode || selectedRuneIds.length === 7) ? "#fbbf24" : isSelected ? "#ffffff" : app.color}`,
                          boxShadow: (isMasterMode || selectedRuneIds.length === 7)
                            ? "0 0 20px rgba(251,191,36,0.9), inset 0 0 8px rgba(255,255,255,0.9)"
                            : isSelected
                            ? `0 0 25px ${app.glowColor}, inset 0 0 10px rgba(255,255,255,0.8)`
                            : `0 0 12px ${app.glowColor}`,
                        }}
                        aria-label={`${app.name} 룬 선택`}
                      >
                        {isSelected && selectedRuneIds.length >= 2 && selectedRuneIds.length < 7 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center shadow-md">
                            {selectedIndex + 1}
                          </span>
                        )}

                        {(isMasterMode || selectedRuneIds.length === 7) && (
                          <>
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shadow-md">
                              ✦
                            </span>
                            <span className="absolute -inset-1 rounded-full animate-pulse bg-amber-400/25 pointer-events-none" />
                          </>
                        )}

                        {/* 정방향 자전 보정 (Counter-rotation so rune symbol stays upright) */}
                        <motion.span
                          animate={{ rotate: -360 }}
                          transition={{
                            duration: isScrying ? 16 : 48,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="font-serif font-black text-sm sm:text-base select-none text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.85)] transition-transform group-hover/rune:scale-110 inline-block"
                        >
                          {app.runeSymbol}
                        </motion.span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* 영시 결과 추천 시 에테르 공명 코로나 펄스 */}
            {scryingResult?.recommendedAppId && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 rounded-full border border-amber-400/40 animate-pulse opacity-60" />
                <div className="w-80 h-80 rounded-full border border-cyan-400/30 animate-pulse" />
              </div>
            )}
          </div>

          {/* Subtle Outer Energy Rings */}
          <div
            className="absolute inset-0 rounded-full border border-cyan-500/30 pointer-events-none transition-all duration-700 z-10"
            style={{
              transform: `scale(${1 + audioLevel * 0.15})`,
              boxShadow: isScrying ? "0 0 45px rgba(56, 189, 248, 0.45), 0 0 80px rgba(168, 85, 247, 0.3)" : "0 0 20px rgba(56, 189, 248, 0.2)",
            }}
          />
          <div
            className="absolute -inset-4 rounded-full border border-purple-500/25 pointer-events-none transition-all duration-700 animate-pulse z-10"
            style={{
              transform: `scale(${1 + audioLevel * 0.25})`,
            }}
          />

          {/* Pure Hyper-Realistic Glass Crystal Orb (터치 시: 마스터 모드 토글) */}
          <div
            onClick={handleCenterOrbClick}
            className="group relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 overflow-hidden"
            style={{
              background: isMasterMode
                ? "radial-gradient(circle at 35% 30%, rgba(251, 191, 36, 0.35) 0%, rgba(245, 158, 11, 0.1) 45%, rgba(0, 0, 0, 0.92) 100%)"
                : "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 45%, rgba(0, 0, 0, 0.88) 100%)",
              boxShadow: isScrying
                ? "inset 0 0 40px rgba(56, 189, 248, 0.45), inset -10px -10px 25px rgba(0,0,0,0.95), 0 0 50px rgba(56, 189, 248, 0.4), 0 0 80px rgba(168, 85, 247, 0.25)"
                : isMasterMode
                ? "inset 0 0 40px rgba(251, 191, 36, 0.5), inset -10px -10px 25px rgba(0,0,0,0.95), 0 0 50px rgba(251, 191, 36, 0.5), 0 0 80px rgba(245, 158, 11, 0.3)"
                : "inset 0 0 30px rgba(255, 255, 255, 0.25), inset -10px -10px 25px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.25)",
              transform: `scale(${1 + audioLevel * 0.08})`,
            }}
            title="오브 터치: 마스터 모드 전환 (전체 통섭)"
          >
            {/* Swirling Stardust Particle Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-full pointer-events-none z-10"
            />

            {/* Top Specular Glare (Glass Surface Reflection) */}
            <div
              className="absolute top-3 left-6 sm:top-4 sm:left-8 w-20 sm:w-24 h-8 sm:h-10 rounded-full pointer-events-none z-30 -rotate-[28deg]"
              style={{
                background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.75) 0%, transparent 75%)",
              }}
            />

            {/* Internal Center Revelation Typography */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center pointer-events-none p-4 select-none">
              <AnimatePresence mode="wait">
                {isScrying ? (
                  <motion.div
                    key="scrying"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: [1, 1.05, 1] }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-xs sm:text-sm font-semibold tracking-widest text-cyan-300 animate-pulse">
                      답변 숙고 중...
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {isMasterMode
                        ? "7대 차원 통섭 공명 중"
                        : selectedRuneIds.length === 2
                        ? "2개 차원 연동 융합 중"
                        : selectedRuneIds.length === 1
                        ? "선택 차원 심층 공명 중"
                        : "다정한 수다 준비 중"}
                    </span>
                  </motion.div>
                ) : scryingResult ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center px-3"
                  >
                    <span
                      style={{
                        color: scryingResult.color || "#38bdf8",
                        textShadow: `0 0 14px ${scryingResult.glow || "rgba(56, 189, 248, 0.6)"}`,
                      }}
                      className="text-base sm:text-lg font-extrabold tracking-wider"
                    >
                      {scryingResult.keyTheme}
                    </span>
                    <span className="text-[10px] text-slate-300 mt-1">
                      {scryingResult.modeTitle || "직관의 해답"}
                    </span>
                  </motion.div>
                ) : (isMasterMode || selectedRuneIds.length === 7) ? (
                  <motion.div key="master" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                    <span className="text-amber-300 text-lg font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse">
                      ✦ 👑 ✦
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold tracking-widest text-amber-200 mt-0.5">
                      마스터 모드
                    </span>
                    <span className="text-[9px] text-amber-300/80 mt-1">
                      7대 차원 통합 공명 (7/7)
                    </span>
                  </motion.div>
                ) : selectedRuneIds.length >= 2 ? (
                  (() => {
                    const activeApps = selectedRuneIds
                      .map((id) => SEPTAGRAM_APPS.find((a) => a.id === id))
                      .filter(Boolean) as SeptagramAppDimension[];
                    return (
                      <motion.div key={`multi-${selectedRuneIds.length}`} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                        <span className="text-cyan-300 text-base font-serif font-black tracking-widest drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
                          {activeApps.map((a) => a.runeSymbol).join(" · ")}
                        </span>
                        <span className="text-xs sm:text-sm font-bold tracking-wider text-cyan-200 mt-0.5">
                          {activeApps.length}중 연동 모드
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1">
                          {activeApps.map((a) => a.shortName).join(" + ")}
                        </span>
                      </motion.div>
                    );
                  })()
                ) : selectedRuneIds.length === 1 ? (
                  (() => {
                    const app = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
                    return (
                      <motion.div key="single" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                        <span className="text-lg font-serif font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ color: app?.color || "#38bdf8" }}>
                          {app?.runeSymbol}
                        </span>
                        <span className="text-xs sm:text-sm font-bold tracking-wider text-white mt-0.5">
                          {app?.name}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1">
                          다른 룬 클릭 시 연동 확장
                        </span>
                      </motion.div>
                    );
                  })()
                ) : (
                  <motion.div key="casual" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                    <span className="text-sm">💬</span>
                    <span className="text-xs sm:text-sm font-medium tracking-wider text-slate-200 mt-0.5">
                      수다 모드
                    </span>
                    <span className="text-[9px] text-slate-400 mt-1">
                      룬 클릭: 연동(최대 7개) · 오브 터치: 마스터
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Glass Rim Light */}
            <div className="absolute inset-x-8 bottom-1.5 h-2.5 rounded-full bg-gradient-to-t from-cyan-400/25 to-transparent blur-[1px] pointer-events-none z-30" />
          </div>
        </div>

        {/* 🧭 현재 활성 모드 표시 상태 바 (수다 / 단일 / 2~6개 연동 / 7개 마스터 모드) */}
        <div className="h-9 flex items-center justify-center -mt-1 mb-2 px-3 text-center">
          {(isMasterMode || selectedRuneIds.length === 7) ? (
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/50 shadow-md text-xs text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold">👑 마스터 모드 가동 중 (7/7)</span>
              <span className="text-amber-300/80 text-[11px] hidden sm:inline">전 차원 통합 공명</span>
              <button
                type="button"
                onClick={() => {
                  setIsMasterMode(false);
                  setSelectedRuneIds([]);
                }}
                className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 cursor-pointer"
              >
                해제
              </button>
            </div>
          ) : selectedRuneIds.length >= 2 ? (
            (() => {
              const activeApps = selectedRuneIds
                .map((id) => SEPTAGRAM_APPS.find((a) => a.id === id))
                .filter(Boolean) as SeptagramAppDimension[];
              return (
                <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/50 shadow-md text-xs text-cyan-200">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-bold">⚡ 연동 모드 ({activeApps.length}/7): {activeApps.map((a) => a.shortName).join(" ⟷ ")}</span>
                  <span className="text-cyan-300/80 text-[11px] hidden sm:inline">심화 융합 답변</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRuneIds([])}
                    className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 cursor-pointer"
                  >
                    초기화
                  </button>
                </div>
              );
            })()
          ) : selectedRuneIds.length === 1 ? (
            (() => {
              const app = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
              return (
                <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 shadow-md text-xs text-slate-200">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: app?.color || "#38bdf8" }} />
                  <span className="font-bold">{app?.name} 모드 (1/7)</span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">다른 룬 클릭 시 연동 확장</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRuneIds([])}
                    className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                  >
                    해제
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-medium text-slate-300">💬 수다 모드</span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">(룬을 클릭하여 최대 7개까지 연동 / 7개 연동 시 마스터 모드)</span>
            </div>
          )}
        </div>

        {/* Revealed Direct Solution Card with TTS Player */}
        <AnimatePresence>
          {scryingResult && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full mt-4 p-5 rounded-3xl bg-zinc-900/85 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-3"
            >
              {/* Card Header & TTS Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      scryingResult.isMaster || (scryingResult.activeRunes && scryingResult.activeRunes.length === 7)
                        ? "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                    }`}>
                      {scryingResult.modeTitle || "직관의 해답"}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {scryingResult.keyTheme}
                    </h4>
                  </div>
                  {scryingResult.query && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">
                      Q. "{scryingResult.query}"
                    </p>
                  )}
                </div>

                {/* Right: TTS Voice Reading & Close (X) Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSpeakTTS(scryingResult)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 shrink-0 ${
                      isTTSActive
                        ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                        : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
                    }`}
                    title={isTTSActive ? "낭독 중지" : "루시 음성으로 답변 듣기"}
                  >
                    {isTTSActive ? (
                      <>
                        <Square size={12} className="fill-cyan-300 text-cyan-300" />
                        <span>낭독 중지</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-slate-200 text-slate-200" />
                        <span>음성 낭독</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopTTS();
                      setScryingResult(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-90"
                    title="결과창 닫기"
                    aria-label="결과창 닫기"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Direct Answer & Practical Solution */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-2.5">
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
                  {scryingResult.directAnswer}
                </p>
                <div className="pt-2 border-t border-white/5 flex items-start gap-1.5 text-[11px] text-cyan-200/90 leading-normal">
                  <span className="font-semibold text-cyan-300 shrink-0">실천 가이드:</span>
                  <span>{scryingResult.actionSolution}</span>
                </div>
              </div>

              {/* 🌟 추천 차원 도약 (Recommended Dimension Link Banner) */}
              {scryingResult.recommendedAppId && (() => {
                const recApp = SEPTAGRAM_APPS.find((a) => a.id === scryingResult.recommendedAppId);
                if (!recApp) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-zinc-900/70 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border font-serif font-black text-lg text-white"
                        style={{
                          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.2) 0%, rgba(20,20,35,0.9) 80%)",
                          borderColor: recApp.color,
                          boxShadow: `0 0 14px ${recApp.glowColor}`,
                        }}
                      >
                        {recApp.runeSymbol}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/40">
                            추천 차원 도약
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {recApp.name}
                          </span>
                          <span className="text-amber-300/80 text-[11px] font-serif">
                            ({recApp.runeName} 룬)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5">
                          {recApp.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTossToDimension(recApp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${recApp.color}, #f59e0b)`,
                        boxShadow: `0 0 15px ${recApp.glowColor}`,
                      }}
                    >
                      <span>차원 도약</span>
                      <ArrowRight size={13} />
                    </button>
                  </motion.div>
                );
              })()}

              {/* Action Buttons: Standalone Tools & Prism Sync Indicator */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                {/* Left: Auto-Sync Confirmation Badge */}
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <Check size={12} className="text-emerald-400" />
                  <span>프리즘 배경지식 연동 완료</span>
                </div>

                {/* Right: Copy & Ask Again */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyResult(scryingResult)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-all active:scale-95 border border-white/10"
                    title="해답 및 실천 가이드 복사"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-300">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>답변 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => executeScrying()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/20 text-white transition-all active:scale-95 border border-white/15"
                  >
                    <RotateCcw size={12} />
                    <span>다시 묻기</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopTTS();
                      setScryingResult(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95 border border-white/10"
                    title="결과창 닫기"
                  >
                    <X size={12} />
                    <span>닫기</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Divination Inquiry Console */}
      <footer className="relative z-40 w-full max-w-lg px-4 pb-24 sm:pb-28 flex flex-col items-center">
        {/* Question Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inquiry.trim()) executeScrying(inquiry);
          }}
          className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/85 border border-white/10 backdrop-blur-2xl shadow-xl transition-all focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-400/20"
        >
          <input
            type="text"
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder={
              (isMasterMode || selectedRuneIds.length === 7)
                ? "[마스터 모드] 7대 차원의 통합 통섭으로 답할 깊은 질문을 입력하세요..."
                : selectedRuneIds.length >= 2
                ? (() => {
                    const names = selectedRuneIds
                      .map((id) => SEPTAGRAM_APPS.find((a) => a.id === id)?.shortName)
                      .filter(Boolean)
                      .join(" × ");
                    return `[${selectedRuneIds.length}중 연동: ${names}] 차원을 융합할 질문을 입력하세요...`;
                  })()
                : selectedRuneIds.length === 1
                ? (() => {
                    const a = SEPTAGRAM_APPS.find((a) => a.id === selectedRuneIds[0]);
                    return `[${a?.name} 모드] 차원의 관점으로 답할 질문을 입력하세요...`;
                  })()
                : "[수다 모드] 마음속 고민이나 가벼운 일상을 이야기해보세요..."
            }
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={isScrying}
            className="shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black active:scale-95 transition-all disabled:opacity-50 shadow-md cursor-pointer"
          >
            <span>답변받기</span>
            <Send size={13} />
          </button>
        </form>
      </footer>

      {/* 🔮 Bottom-Left Prism Portal Button (프리즘 메인 홈 바로가기) */}
      <PrismGatewayFabButton
        position="left"
        onClick={() => {
          try {
            triggerHaptic("whitehole");
          } catch (_) {}
          window.location.href = "/";
        }}
      />

      {/* 💬 Bottom-Right Lucy AI Chat Button (우측 하단 루시채팅 바로가기) */}
      <LucyGatewayFabButton
        position="right"
        onClick={() => {
          try {
            triggerHaptic("whitehole");
          } catch (_) {}
          window.location.href = "/chat";
        }}
      />

      {/* 🏷️ 룬 마우스 호버 시 항상 정방향(수평 upright)으로 표시되는 어플 이름 배지 */}
      <AnimatePresence>
        {hoveredRuneInfo && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-1 rounded-full bg-zinc-950/95 border text-xs font-bold text-white shadow-[0_4px_24px_rgba(0,0,0,0.9)] backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap select-none"
            style={{
              left: `${hoveredRuneInfo.x}px`,
              top: `${hoveredRuneInfo.y - 10}px`,
              borderColor: hoveredRuneInfo.app.color,
              boxShadow: `0 0 16px ${hoveredRuneInfo.app.glowColor}, 0 4px 18px rgba(0,0,0,0.85)`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: hoveredRuneInfo.app.color }}
            />
            <span style={{ color: hoveredRuneInfo.app.color }}>
              {hoveredRuneInfo.app.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
