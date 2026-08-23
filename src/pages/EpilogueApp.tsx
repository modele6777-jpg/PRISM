import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'wouter';
import {
  X,
  User,
  Star,
  Music,
  Brain,
  Palette,
  ChevronRight,
  ChevronLeft,
  Check,
  Save,
  Moon,
  Sparkles,
  Zap,
  Globe,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { useApp, getPersistentUserProfile, setPersistentUserProfile } from '@/contexts/AppContext';
import { loadProfileFromAllVaults, saveProfileToAllVaults } from '@/lib/profileVault';
import { type UserProfile, mergeUserProfiles } from '@/lib/sharedState';
import { SajuCardView } from '@/components/SajuCardView';
import { db, doc, setDoc, serverTimestamp } from '@/lib/firebase';
import { SpecialFeatureFabGroup, ChatFabButton, HandbookFabButton } from '@/components/SpecialFeatureFab';
import { EpilogueHandbookModal } from '@/components/epilogue/EpilogueHandbookModal';
import { useNarrowPhone } from '@/hooks/useNarrowPhone';
import { isLegacyMobile } from '@/lib/perfMode';

// Floating Particle Component for Galaxy Milky Way Theme
function FloatingParticles({ count = 20 }: { count?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            opacity: Math.random() * 0.3 + 0.1,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, (Math.random() - 0.5) * 100 + '%'],
            x: [null, (Math.random() - 0.5) * 100 + '%'],
            opacity: [0.1, 0.35, 0.1],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-1 h-1 bg-purple-300 rounded-full blur-[0.8px]"
        />
      ))}
    </div>
  );
}

const SECTIONS = [
  { id: 'basic', label: '기본 정보', icon: User, color: 'oklch(0.75 0.12 50)', desc: '이름 · 생년월일 · 성별' },
  { id: 'fate', label: '운명 관심사', icon: Star, color: 'oklch(0.85 0.15 90)', desc: '사주 · 타로 · 인생 목표' },
  { id: 'music', label: '음악 취향', icon: Music, color: 'oklch(0.65 0.18 290)', desc: '장르 · 악기 · 창의 목표' },
  { id: 'psych', label: '심리 · 결정', icon: Brain, color: 'oklch(0.72 0.18 55)', desc: 'MBTI · AI 상담 스타일' },
  { id: 'art', label: '예술 감성', icon: Palette, color: 'oklch(0.65 0.18 240)', desc: '화풍 · 색감 · 선호 시인' },
  { id: 'card', label: '운명 프리뷰', icon: Sparkles, color: 'oklch(0.80 0.20 320)', desc: '실시간 천문 사주 카드' },
];

const FATE_INTERESTS = ['사주', '타로', '별자리', '꿈해몽', '수비학', '관상', '기적수업', '동양철학'];
const MUSIC_GENRES = ['K-Pop', '팝', '재즈', '클래식', 'R&B', '힙합', '인디', '락', 'EDM', '포크', '발라드', '뉴에이지'];
const INSTRUMENTS = ['피아노', '기타', '드럼', '베이스', '바이올린', '첼로', '플루트', '보컬', '작곡', '프로듀싱'];
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const ART_STYLES = ['인상주의', '추상화', '팝아트', '미니멀리즘', '초현실주의', '입체파', '사진', '일러스트', '동양화', '미디어아트'];
const ART_COLORS = ['따뜻한 톤', '차가운 톤', '파스텔', '모노톤', '비비드', '어스 톤', '네온 사이버', '골드 & 퍼플'];

function TagSelector({
  options,
  selected,
  onChange,
  color,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  color: string;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer backdrop-blur-md"
            style={{
              background: active ? `${color}30` : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${active ? `${color}70` : 'rgba(255, 255, 255, 0.08)'}`,
              color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
              boxShadow: active ? `0 0 12px ${color}35` : 'none',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-white/50 tracking-wider font-sans uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-2xl text-sm text-white/95 placeholder-white/20 outline-none transition-all duration-200 bg-white/[0.03] backdrop-blur-md border border-white/10 focus:border-purple-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(192,132,252,0.15)]"
      />
    </div>
  );
}

export default function EpilogueApp() {
  const narrow = useNarrowPhone();
  const legacy = isLegacyMobile();
  const [, navigate] = useLocation();
  const { sharedState, updateSharedState, firebaseUser, openLucyChat, sendUnifiedMessage } = useApp();
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHandbookModal, setShowHandbookModal] = useState(false);
  const [showEmblemModal, setShowEmblemModal] = useState(false);

  const initialProfile = sharedState?.userProfile || loadProfileFromAllVaults() || getPersistentUserProfile();

  const [basic, setBasic] = useState({
    name: initialProfile?.basic?.name || '',
    nickname: initialProfile?.basic?.nickname || '',
    birthdate: initialProfile?.basic?.birthdate || '',
    birthtime: initialProfile?.basic?.birthtime || '',
    gender: (initialProfile?.basic?.gender || '') as '' | 'male' | 'female' | 'other',
    birthCity: initialProfile?.basic?.birthCity || '',
    lunarSolar: (initialProfile?.basic?.lunarSolar || 'solar') as 'solar' | 'lunar',
  });
  const [fate, setFate] = useState({
    fateInterests: initialProfile?.fate?.fateInterests || ([] as string[]),
    lifeGoal: initialProfile?.fate?.lifeGoal || '',
    currentWorry: initialProfile?.fate?.currentWorry || '',
  });
  const [music, setMusic] = useState({
    favoriteGenres: initialProfile?.music?.favoriteGenres || ([] as string[]),
    instruments: initialProfile?.music?.instruments || ([] as string[]),
    creativeGoal: initialProfile?.music?.creativeGoal || '',
    favoriteArtists: initialProfile?.music?.favoriteArtists || '',
  });
  const [psych, setPsych] = useState({
    mbti: initialProfile?.psych?.mbti || '',
    counselingStyle: (initialProfile?.psych?.counselingStyle || 'mixed') as 'empathy' | 'advice' | 'mixed',
    currentMood: initialProfile?.psych?.currentMood || '',
    personalityKeywords: initialProfile?.psych?.personalityKeywords || ([] as string[]),
  });
  const [art, setArt] = useState({
    favoriteArtStyle: initialProfile?.art?.favoriteArtStyle || ([] as string[]),
    favoritePoets: initialProfile?.art?.favoritePoets || '',
    favoriteColors: initialProfile?.art?.favoriteColors || ([] as string[]),
    artMedium: initialProfile?.art?.artMedium || ([] as string[]),
  });

  useEffect(() => {
    const profile = sharedState?.userProfile || loadProfileFromAllVaults() || getPersistentUserProfile();
    if (!profile) return;
    if (profile.basic) setBasic((b) => ({ ...b, ...profile.basic }));
    if (profile.fate) setFate((f) => ({ ...f, ...profile.fate }));
    if (profile.music) setMusic((m) => ({ ...m, ...profile.music }));
    if (profile.psych) setPsych((p) => ({ ...p, ...profile.psych }));
    if (profile.art) setArt((a) => ({ ...a, ...profile.art }));
  }, [sharedState?.userProfile]);

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const existingProfile = sharedState?.userProfile || loadProfileFromAllVaults() || getPersistentUserProfile() || {};
      const basicData: any = { ...basic };
      if (!basicData.gender) delete basicData.gender;

      const profile: UserProfile = mergeUserProfiles(existingProfile, {
        basic: basicData,
        fate,
        music,
        psych,
        art,
      });

      saveProfileToAllVaults(profile);
      setPersistentUserProfile(profile);
      await updateSharedState({ userProfile: profile }, 'profile').catch((err) => {
        console.error('[Profile] Sync failed:', err);
      });

      if (firebaseUser?.uid && firebaseUser.uid !== 'developer-bypass-uid') {
        try {
          const userDocRef = doc(db, 'sharedState', firebaseUser.uid);
          await setDoc(userDocRef, { userProfile: profile, updatedAt: serverTimestamp() }, { merge: true });
          const profileDocRef = doc(db, 'userProfiles', firebaseUser.uid);
          await setDoc(profileDocRef, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
        } catch (cloudErr) {
          console.warn('[Profile] Direct cloud backup warning:', cloudErr);
        }
      }

      if (!silent) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('[Profile] Save failed:', err);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const section = SECTIONS[currentSection];
  const SectionIcon = section.icon;

  const renderSection = () => {
    switch (currentSection) {
      case 0: // 기본 정보
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <InputField
              label="실명 *"
              value={basic.name}
              onChange={(v) => setBasic((b) => ({ ...b, name: v }))}
              placeholder="예: 박소연"
            />
            <InputField
              label="닉네임 (루시 AI가 부를 호칭)"
              value={basic.nickname}
              onChange={(v) => setBasic((b) => ({ ...b, nickname: v }))}
              placeholder="예: 쭈, 루키"
            />
            <InputField
              label="생년월일"
              value={basic.birthdate}
              type="date"
              onChange={(v) => setBasic((b) => ({ ...b, birthdate: v }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1.5 tracking-wider font-sans uppercase">
                  양력 / 음력
                </label>
                <div className="flex rounded-2xl overflow-hidden border border-white/10 p-0.5 bg-white/[0.02] backdrop-blur-md">
                  {(['solar', 'lunar'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBasic((b) => ({ ...b, lunarSolar: type }))}
                      className="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      style={{
                        background: basic.lunarSolar === type ? 'rgba(192, 132, 252, 0.25)' : 'transparent',
                        color: basic.lunarSolar === type ? '#e9d5ff' : 'rgba(255, 255, 255, 0.4)',
                        border: basic.lunarSolar === type ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid transparent',
                      }}
                    >
                      {type === 'solar' ? '양력' : '음력'}
                    </button>
                  ))}
                </div>
              </div>
              <InputField
                label="태어난 시간"
                value={basic.birthtime}
                type="time"
                onChange={(v) => setBasic((b) => ({ ...b, birthtime: v }))}
              />
            </div>
            <InputField
              label="출생 도시"
              value={basic.birthCity}
              onChange={(v) => setBasic((b) => ({ ...b, birthCity: v }))}
              placeholder="예: 서울, 부산, 대구..."
            />
            <div>
              <label className="block text-xs font-bold text-white/50 mb-1.5 tracking-wider font-sans uppercase">
                성별
              </label>
              <div className="flex gap-2">
                {[
                  { val: 'female', label: '여성' },
                  { val: 'male', label: '남성' },
                  { val: 'other', label: '기타' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBasic((b) => ({ ...b, gender: val as any }))}
                    className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
                    style={{
                      background: basic.gender === val ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${basic.gender === val ? 'rgba(192, 132, 252, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: basic.gender === val ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                      boxShadow: basic.gender === val ? '0 0 15px rgba(192, 132, 252, 0.25)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1: // 운명 관심사
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                관심 있는 분야 (다중 선택)
              </label>
              <TagSelector
                options={FATE_INTERESTS}
                selected={fate.fateInterests}
                onChange={(v) => setFate((f) => ({ ...f, fateInterests: v }))}
                color="#eab308"
              />
            </div>
            <InputField
              label="인생의 주요 목표 / 방향"
              value={fate.lifeGoal}
              onChange={(v) => setFate((f) => ({ ...f, lifeGoal: v }))}
              placeholder="예: 경제적 자유, 내면의 평화, 창작 활동..."
            />
            <InputField
              label="요즘 가장 큰 고민거리"
              value={fate.currentWorry}
              onChange={(v) => setFate((f) => ({ ...f, currentWorry: v }))}
              placeholder="예: 이직 고민, 인간관계, 건강, 사업 방향..."
            />
          </div>
        );
      case 2: // 음악 취향
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                좋아하는 음악 장르 (다중 선택)
              </label>
              <TagSelector
                options={MUSIC_GENRES}
                selected={music.favoriteGenres}
                onChange={(v) => setMusic((m) => ({ ...m, favoriteGenres: v }))}
                color="#a855f7"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                다룰 수 있거나 관심 있는 악기 (다중 선택)
              </label>
              <TagSelector
                options={INSTRUMENTS}
                selected={music.instruments}
                onChange={(v) => setMusic((m) => ({ ...m, instruments: v }))}
                color="#a855f7"
              />
            </div>
            <InputField
              label="좋아하는 아티스트 / 뮤지션"
              value={music.favoriteArtists}
              onChange={(v) => setMusic((m) => ({ ...m, favoriteArtists: v }))}
              placeholder="예: 아이유, 쇼팽, 콜드플레이, 요한 세바스찬 바흐..."
            />
            <InputField
              label="음악 &amp; 창작 관련 목표"
              value={music.creativeGoal}
              onChange={(v) => setMusic((m) => ({ ...m, creativeGoal: v }))}
              placeholder="예: 피아노 한 곡 완곡, 나만의 힐링 플레이리스트 제작..."
            />
          </div>
        );
      case 3: // 심리 · 결정
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                MBTI 유형
              </label>
              <div className="grid grid-cols-4 gap-2">
                {MBTI_LIST.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPsych((p) => ({ ...p, mbti: type }))}
                    className="py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer backdrop-blur-md"
                    style={{
                      background: psych.mbti === type ? 'rgba(249, 115, 22, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${psych.mbti === type ? 'rgba(249, 115, 22, 0.6)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: psych.mbti === type ? '#fed7aa' : 'rgba(255, 255, 255, 0.5)',
                      boxShadow: psych.mbti === type ? '0 0 12px rgba(249, 115, 22, 0.25)' : 'none',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                선호하는 AI 상담 스타일
              </label>
              <div className="flex gap-2">
                {[
                  { val: 'empathy', label: '따뜻한 공감형' },
                  { val: 'advice', label: '명확한 솔루션형' },
                  { val: 'mixed', label: '공감 + 솔루션 혼합' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPsych((p) => ({ ...p, counselingStyle: val as any }))}
                    className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
                    style={{
                      background: psych.counselingStyle === val ? 'rgba(249, 115, 22, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${psych.counselingStyle === val ? 'rgba(249, 115, 22, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: psych.counselingStyle === val ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                      boxShadow: psych.counselingStyle === val ? '0 0 12px rgba(249, 115, 22, 0.2)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <InputField
              label="현재 전반적인 기분 / 마음 상태"
              value={psych.currentMood}
              onChange={(v) => setPsych((p) => ({ ...p, currentMood: v }))}
              placeholder="예: 평온함, 새로운 도전을 앞둔 설렘, 약간의 피로..."
            />
          </div>
        );
      case 4: // 예술 감성
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                선호하는 화풍 &amp; 미술 스타일 (다중 선택)
              </label>
              <TagSelector
                options={ART_STYLES}
                selected={art.favoriteArtStyle}
                onChange={(v) => setArt((a) => ({ ...a, favoriteArtStyle: v }))}
                color="#38bdf8"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 mb-2 tracking-wider font-sans uppercase">
                선호하는 색감 &amp; 은하 톤 (다중 선택)
              </label>
              <TagSelector
                options={ART_COLORS}
                selected={art.favoriteColors}
                onChange={(v) => setArt((a) => ({ ...a, favoriteColors: v }))}
                color="#38bdf8"
              />
            </div>
            <InputField
              label="좋아하는 시인 / 작가 / 책"
              value={art.favoritePoets}
              onChange={(v) => setArt((a) => ({ ...a, favoritePoets: v }))}
              placeholder="예: 윤동주, 헤르만 헤세, 라이너 마리아 릴케, 어린 왕자..."
            />
          </div>
        );
      case 5: // 운명 카드 프리뷰
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200/90 font-sans leading-relaxed flex items-center gap-2.5">
              <Sparkles size={16} className="text-yellow-400 shrink-0" />
              <span>입력하신 생년월일과 시간을 기반으로 산출된 실시간 천문 사주 카드입니다.</span>
            </div>
            <SajuCardView
              profile={{
                basic: { ...basic, gender: basic.gender || undefined },
                fate,
                music,
                psych,
                art,
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-app-full w-full flex flex-col relative overflow-hidden font-sans bg-transparent">
      {/* Galaxy Milky Way Ambient Particles */}
      {!legacy && <FloatingParticles count={narrow ? 5 : 22} />}

      {/* Galaxy Nebulae Glow Orbs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/15 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none z-0" />

      {/* Background Texture Mask */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header Info Bar (Matching other channels) */}
      <div className="prism-hub-header fixed top-safe-2 left-1.5 sm:left-2 md:top-safe-4 md:left-6 pointer-events-auto z-[110] scale-[0.68] sm:scale-75 md:scale-100 origin-top-left">
        <div className="flex items-center gap-3">
          <div
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] group backdrop-blur-md cursor-pointer"
            onClick={() => setShowEmblemModal(true)}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-purple-400/40"
            />
            <div className="absolute inset-[3px] md:inset-[4px] rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
              <Moon
                size={24}
                className="relative z-10 text-purple-400 drop-shadow-[0_0_12px_rgba(192,132,252,0.8)] transition-transform group-hover:scale-110 duration-500 animate-pulse md:w-6 md:h-6"
                strokeWidth={1.5}
              />
            </div>
          </div>
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="prism-xs-hub-title text-lg md:text-xl font-display font-black text-white uppercase tracking-tighter leading-tight">
              PRISM
            </h1>
            <p className="text-[8px] md:text-[9px] text-purple-300/60 uppercase tracking-widest font-bold font-sans leading-none mt-0.5">
              EPILOGUE • SOUL PROFILE
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Subnav Menu (Moved to Top matching other apps) */}
      <nav className="prism-xs-subnav fixed top-safe-nav md:top-safe-nav-md left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar md:max-w-fit md:overflow-visible transition-all duration-300">
        {SECTIONS.map((item, idx) => {
          const isActive = currentSection === idx;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                handleSave(true);
                setCurrentSection(idx);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl text-[11px] md:text-xs font-bold font-sans transition-all duration-300 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500/40 via-pink-500/30 to-purple-500/40 text-white border border-purple-400/50 shadow-[0_0_15px_rgba(192,132,252,0.3)] scale-[1.02]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-purple-300 animate-pulse' : 'text-white/40'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <div data-app-scroll-root className="flex-1 w-full overflow-x-hidden overflow-y-auto flex flex-col no-scrollbar z-10 pb-28">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-home md:pt-home-md space-y-6">
          {/* Section Form Card */}
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-2xl space-y-6 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(192,132,252,0.2)]"
                  style={{ background: `${section.color}25` }}
                >
                  <SectionIcon size={20} style={{ color: section.color }} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-sans text-white tracking-tight">
                    {section.label}
                  </h2>
                  <p className="text-xs text-white/45 font-sans">{section.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-purple-300/80 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                  {currentSection + 1} / {SECTIONS.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-lg shadow-purple-500/20 active:scale-95 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white border border-purple-300/30"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : saved ? (
                    <Check size={14} className="text-white animate-bounce" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{saved ? '저장됨' : '저장'}</span>
                </button>
              </div>
            </div>

            <div className="relative z-10">{renderSection()}</div>

            {/* Bottom Step Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10 relative z-10">
              <button
                type="button"
                disabled={currentSection === 0}
                onClick={() => {
                  handleSave(true);
                  setCurrentSection((s) => Math.max(0, s - 1));
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>이전 단계</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSave(true);
                  if (currentSection < SECTIONS.length - 1) {
                    setCurrentSection((s) => s + 1);
                  } else {
                    handleSave(false);
                  }
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10 shadow-md"
              >
                <span>{currentSection < SECTIONS.length - 1 ? '다음 단계' : '완료 & 저장'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Epilogue Handbook Modal */}
      
      {/* Epilogue Sanctuary Lore Modal */}
      <AnimatePresence>
        {showEmblemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto z-[9999]"
            onClick={() => setShowEmblemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass p-8 md:p-10 max-w-lg w-full rounded-[48px] border border-purple-500/30 text-center space-y-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowEmblemModal(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="mx-auto w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(192,132,252,0.25)]">
                <Moon className="text-purple-400 animate-pulse" size={40} strokeWidth={1.5} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-sans text-white tracking-tight uppercase">Epilogue Sanctuary Lore</h3>
                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-[0.3em]">Soul Architect · 소울 프로필 &amp; 마스터 피날레</p>
              </div>

              <p className="text-sm text-purple-100/75 leading-relaxed font-sans text-left break-keep bg-white/5 p-6 rounded-3xl border border-purple-500/10">
                <strong>EPILOGUE</strong>는 하루 동안 쌓인 사주, 힐링, 웰니스, 창작의 모든 발자취를 집대성하고 당신의 소울 프로필을 조율하는 마스터 샌추어리입니다. 하루의 여정을 평화롭게 매듭짓고 내일의 새로운 새벽을 밝힙니다.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Soul Spectrum Coherence (소울 스펙트럼 일치도)', val: 97, color: 'from-purple-400 to-pink-500' },
                  { label: 'Omniverse Balance Ratio (5대 우주 조화율)', val: 94, color: 'from-pink-400 to-indigo-500' },
                  { label: 'Circadian Energy Recovery (생체 에너지 회복률)', val: 96, color: 'from-indigo-500 to-purple-600' }
                ].map(spec => (
                  <div key={spec.label} className="space-y-1 text-left">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/60">{spec.label}</span>
                      <span className="text-purple-300 font-bold">{spec.val}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${spec.val}%` }} 
                        transition={{ duration: 1.2, ease: "easeOut" }} 
                        className={`h-full bg-gradient-to-r ${spec.color}`} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowEmblemModal(false)}
                className="w-full py-4 rounded-[20px] bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs cursor-pointer"
              >
                Sync Complete 🌀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special Feature Floating Action Buttons */}
      <SpecialFeatureFabGroup>
        <HandbookFabButton
          theme="epilogue"
          tooltipLabel="📖 에필로그 핸드북 &amp; 종합 결산"
        />
        <ChatFabButton onClick={() => openLucyChat('epilogue')} />
      </SpecialFeatureFabGroup>
    </div>
  );
}
