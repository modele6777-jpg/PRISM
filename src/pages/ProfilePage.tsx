import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  User, Star, Music, Brain, Palette,
  ChevronRight, ChevronLeft, Check, Save, ArrowLeft
} from 'lucide-react';
import { useApp, getPersistentUserProfile, setPersistentUserProfile } from '@/contexts/AppContext';
import { loadProfileFromAllVaults, saveProfileToAllVaults } from '@/lib/profileVault';
import { type UserProfile, mergeUserProfiles } from '@/lib/sharedState';
import { APP_VERSION } from '@/lib/appVersion';
import { SajuCardView } from '@/components/SajuCardView';
import { db, doc, setDoc, serverTimestamp } from '@/lib/firebase';

const SECTIONS = [
  { id: 'basic', label: '기본 정보', icon: User, color: 'oklch(0.75 0.12 50)', desc: '이름 · 생년월일 · 성별' },
  { id: 'fate', label: '운명 관심사', icon: Star, color: 'oklch(0.75 0.12 50)', desc: '사주 · 타로 · 별자리 관심사' },
  { id: 'music', label: '음악 취향', icon: Music, color: 'oklch(0.70 0.18 295)', desc: '장르 · 악기 · 창의 목표' },
  { id: 'psych', label: '심리 · 결정', icon: Brain, color: 'oklch(0.72 0.18 55)', desc: 'MBTI · 상담 스타일' },
  { id: 'art', label: '예술 취향', icon: Palette, color: 'oklch(0.65 0.18 240)', desc: '화풍 · 색감 · 선호 매체' },
];

const FATE_INTERESTS = ['사주', '타로', '별자리', '꿈해몽', '수비학', '관상'];
const MUSIC_GENRES = ['K-Pop', '팝', '재즈', '클래식', 'R&B', '힙합', '인디', '락', 'EDM', '포크', '발라드', '트로트'];
const INSTRUMENTS = ['피아노', '기타', '드럼', '베이스', '바이올린', '첼로', '플루트', '보컬', '작곡', '프로듀싱'];
const MBTI_LIST = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const ART_STYLES = ['인상주의', '추상화', '팝아트', '미니멀리즘', '초현실주의', '입체파', '사진', '일러스트', '동양화', '조각'];
const ART_COLORS = ['따뜻한 톤', '차가운 톤', '파스텔', '모노톤', '비비드', '어스 톤', '네온'];

function TagSelector({ options, selected, onChange, color }: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  color: string;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
            style={{
              background: active ? color + '30' : 'oklch(0.15 0.015 270)',
              border: `1px solid ${active ? color + '60' : 'oklch(0.25 0.01 270)'}`,
              color: active ? color : 'oklch(0.55 0.01 270)',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1.5 tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/20 outline-none transition-all"
        style={{
          background: 'oklch(0.14 0.015 270)',
          border: '1px solid oklch(0.22 0.01 270)',
        }}
        onFocus={e => e.target.style.borderColor = 'oklch(0.75 0.12 50 / 0.5)'}
        onBlur={e => e.target.style.borderColor = 'oklch(0.22 0.01 270)'}
      />
    </div>
  );
}

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { sharedState, updateSharedState, firebaseUser, signInWithGoogle } = useApp();
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initialProfile = sharedState?.userProfile || getPersistentUserProfile();

  // 5개 섹션 상태
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
    fateInterests: initialProfile?.fate?.fateInterests || [] as string[],
    lifeGoal: initialProfile?.fate?.lifeGoal || '',
    currentWorry: initialProfile?.fate?.currentWorry || '',
  });
  const [music, setMusic] = useState({
    favoriteGenres: initialProfile?.music?.favoriteGenres || [] as string[],
    instruments: initialProfile?.music?.instruments || [] as string[],
    creativeGoal: initialProfile?.music?.creativeGoal || '',
    favoriteArtists: initialProfile?.music?.favoriteArtists || '',
  });
  const [psych, setPsych] = useState({
    mbti: initialProfile?.psych?.mbti || '',
    counselingStyle: (initialProfile?.psych?.counselingStyle || 'mixed') as 'empathy' | 'advice' | 'mixed',
    currentMood: initialProfile?.psych?.currentMood || '',
    personalityKeywords: initialProfile?.psych?.personalityKeywords || [] as string[],
  });
  const [art, setArt] = useState({
    favoriteArtStyle: initialProfile?.art?.favoriteArtStyle || [] as string[],
    favoritePoets: initialProfile?.art?.favoritePoets || '',
    favoriteColors: initialProfile?.art?.favoriteColors || [] as string[],
    artMedium: initialProfile?.art?.artMedium || [] as string[],
  });

  // Firebase에서 기존 프로필 로드
  useEffect(() => {
    const profile = sharedState?.userProfile || getPersistentUserProfile();
    if (!profile) return;
    if (profile.basic) setBasic(b => ({ ...b, ...profile.basic }));
    if (profile.fate) setFate(f => ({ ...f, ...profile.fate }));
    if (profile.music) setMusic(m => ({ ...m, ...profile.music }));
    if (profile.psych) setPsych(p => ({ ...p, ...profile.psych }));
    if (profile.art) setArt(a => ({ ...a, ...profile.art }));
  }, [sharedState?.userProfile]);

  const handleSave = async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const existingProfile = sharedState?.userProfile || getPersistentUserProfile() || {};
      const basicData: any = { ...basic };
      if (!basicData.gender) delete basicData.gender;

      const profile: UserProfile = mergeUserProfiles(existingProfile, {
        basic: basicData,
        fate,
        music,
        psych,
        art,
      });

      setPersistentUserProfile(profile);
      await updateSharedState({ userProfile: profile }, 'profile').catch(err => {
        console.error('[ProfilePage] Sync failed:', err);
      });

      // Direct push to user's Google Firestore document for 100% guarantee
      if (firebaseUser?.uid && firebaseUser.uid !== 'developer-bypass-uid') {
        try {
          const userDocRef = doc(db, 'sharedState', firebaseUser.uid);
          await setDoc(userDocRef, { userProfile: profile, updatedAt: serverTimestamp() }, { merge: true });
          const profileDocRef = doc(db, 'userProfiles', firebaseUser.uid);
          await setDoc(profileDocRef, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
        } catch (cloudErr) {
          console.warn('[ProfilePage] Direct cloud backup warning:', cloudErr);
        }
      }

      if (!silent) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('[ProfilePage] Save failed:', err);
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
          <div className="space-y-4">
            <InputField label="실명 *" value={basic.name}
              onChange={v => setBasic(b => ({ ...b, name: v }))} placeholder="예: 박소연" />
            <InputField label="닉네임 (루시가 부를 이름)" value={basic.nickname}
              onChange={v => setBasic(b => ({ ...b, nickname: v }))} placeholder="예: 루키" />
            <InputField label="생년월일" value={basic.birthdate} type="date"
              onChange={v => setBasic(b => ({ ...b, birthdate: v }))} />
            <InputField label="태어난 시각 (모르면 비워두세요)" value={basic.birthtime} type="time"
              onChange={v => setBasic(b => ({ ...b, birthtime: v }))} />
            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">성별</label>
              <div className="flex gap-2">
                {[{ v: 'female', l: '여성' }, { v: 'male', l: '남성' }, { v: 'other', l: '기타' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setBasic(b => ({ ...b, gender: v as any }))}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: basic.gender === v ? 'oklch(0.75 0.12 50 / 0.2)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${basic.gender === v ? 'oklch(0.75 0.12 50 / 0.5)' : 'oklch(0.22 0.01 270)'}`,
                      color: basic.gender === v ? 'oklch(0.75 0.12 50)' : 'oklch(0.55 0.01 270)',
                    }}>{l}</button>
                ))}
              </div>
            </div>
            <InputField label="태어난 도시 (별자리 계산용)" value={basic.birthCity}
              onChange={v => setBasic(b => ({ ...b, birthCity: v }))} placeholder="예: 서울" />
            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">생년월일 기준</label>
              <div className="flex gap-2">
                {[{ v: 'solar', l: '양력' }, { v: 'lunar', l: '음력' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setBasic(b => ({ ...b, lunarSolar: v as any }))}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: basic.lunarSolar === v ? 'oklch(0.75 0.12 50 / 0.2)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${basic.lunarSolar === v ? 'oklch(0.75 0.12 50 / 0.5)' : 'oklch(0.22 0.01 270)'}`,
                      color: basic.lunarSolar === v ? 'oklch(0.75 0.12 50)' : 'oklch(0.55 0.01 270)',
                    }}>{l}</button>
                ))}
              </div>
            </div>

            {/* 실시간 사주 본원 에너지 카드 */}
            {basic.birthdate && (
              <div className="pt-2">
                <SajuCardView profile={{ basic: { ...basic, gender: (basic.gender || undefined) as any }, fate, music, psych, art }} />
              </div>
            )}
          </div>
        );

      case 1: // 운명 관심사
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">관심 있는 운명학 분야</label>
              <TagSelector options={FATE_INTERESTS} selected={fate.fateInterests}
                onChange={v => setFate(f => ({ ...f, fateInterests: v }))} color={section.color} />
            </div>
            <InputField label="인생 목표 (한 줄)" value={fate.lifeGoal}
              onChange={v => setFate(f => ({ ...f, lifeGoal: v }))} placeholder="예: 나의 음악으로 세상을 연결하고 싶어요" />
            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">요즘 가장 큰 고민</label>
              <textarea value={fate.currentWorry}
                onChange={e => setFate(f => ({ ...f, currentWorry: e.target.value }))}
                placeholder="루시에게 속시원하게 털어놔보세요..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm text-white/90 placeholder-white/20 outline-none resize-none transition-all"
                style={{ background: 'oklch(0.14 0.015 270)', border: '1px solid oklch(0.22 0.01 270)' }}
                onFocus={e => e.target.style.borderColor = 'oklch(0.75 0.12 50 / 0.5)'}
                onBlur={e => e.target.style.borderColor = 'oklch(0.22 0.01 270)'}
              />
            </div>
          </div>
        );

      case 2: // 음악 취향
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">좋아하는 음악 장르</label>
              <TagSelector options={MUSIC_GENRES} selected={music.favoriteGenres}
                onChange={v => setMusic(m => ({ ...m, favoriteGenres: v }))} color={section.color} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">다루는 악기 / 관심 분야</label>
              <TagSelector options={INSTRUMENTS} selected={music.instruments}
                onChange={v => setMusic(m => ({ ...m, instruments: v }))} color={section.color} />
            </div>
            <InputField label="좋아하는 아티스트" value={music.favoriteArtists}
              onChange={v => setMusic(m => ({ ...m, favoriteArtists: v }))} placeholder="예: 아이유, 콜드플레이, 히사이시 조" />
            <InputField label="음악적 창의 목표" value={music.creativeGoal}
              onChange={v => setMusic(m => ({ ...m, creativeGoal: v }))} placeholder="예: 나만의 감정을 담은 연주곡 완성하기" />
          </div>
        );

      case 3: // 심리 · 결정
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">MBTI</label>
              <div className="grid grid-cols-4 gap-2">
                {MBTI_LIST.map(m => (
                  <button key={m} type="button" onClick={() => setPsych(p => ({ ...p, mbti: m }))}
                    className="py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: psych.mbti === m ? 'oklch(0.72 0.18 55 / 0.25)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${psych.mbti === m ? 'oklch(0.72 0.18 55 / 0.6)' : 'oklch(0.22 0.01 270)'}`,
                      color: psych.mbti === m ? 'oklch(0.72 0.18 55)' : 'oklch(0.55 0.01 270)',
                    }}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">선호하는 상담 스타일</label>
              <div className="flex gap-2">
                {[
                  { v: 'empathy', l: '공감 위주', d: '그저 들어줘요' },
                  { v: 'advice', l: '조언 위주', d: '해결책이 중요해요' },
                  { v: 'mixed', l: '복합형', d: '상황에 따라' },
                ].map(({ v, l, d }) => (
                  <button key={v} type="button" onClick={() => setPsych(p => ({ ...p, counselingStyle: v as any }))}
                    className="flex-1 py-3 rounded-xl text-xs transition-all flex flex-col items-center gap-1"
                    style={{
                      background: psych.counselingStyle === v ? 'oklch(0.72 0.18 55 / 0.2)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${psych.counselingStyle === v ? 'oklch(0.72 0.18 55 / 0.5)' : 'oklch(0.22 0.01 270)'}`,
                      color: psych.counselingStyle === v ? 'oklch(0.72 0.18 55)' : 'oklch(0.55 0.01 270)',
                    }}>
                    <span className="font-medium">{l}</span>
                    <span className="text-white/30 text-[10px]">{d}</span>
                  </button>
                ))}
              </div>
            </div>
            <InputField label="요즘 기분 한 줄 묘사" value={psych.currentMood}
              onChange={v => setPsych(p => ({ ...p, currentMood: v }))} placeholder="예: 설레이면서도 조금 불안해요" />
          </div>
        );

      case 4: // 예술 취향
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">좋아하는 화풍 / 아트 스타일</label>
              <TagSelector options={ART_STYLES} selected={art.favoriteArtStyle}
                onChange={v => setArt(a => ({ ...a, favoriteArtStyle: v }))} color={section.color} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">주로 선호하는 색감</label>
              <TagSelector options={ART_COLORS} selected={art.favoriteColors}
                onChange={v => setArt(a => ({ ...a, favoriteColors: v }))} color={section.color} />
            </div>
            <InputField label="좋아하는 시인 / 작가 " value={art.favoritePoets}
              onChange={v => setArt(a => ({ ...a, favoritePoets: v }))} placeholder="예: 윤동주, 김소월, 파블로 네루다" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-app-full bg-[#080910] text-white relative overflow-x-hidden overflow-y-auto flex flex-col">
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col relative text-white">
      <div className="relative z-10 px-4 pt-[calc(3rem+var(--sat))] pb-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-xl" style={{ color: 'oklch(0.75 0.12 50)' }}>Profile Settings</h1>
            <p className="text-xs text-white/30 mt-0.5">Let the 4 AIs know you better</p>
          </div>
          <div className="ml-auto">
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
              style={{ background: 'oklch(0.75 0.12 50 / 0.15)', border: '1px solid oklch(0.75 0.12 50 / 0.4)', color: 'oklch(0.75 0.12 50)' }}>
              <AnimatePresence mode="wait">
                {saved ? (
                  <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                    <Check size={14} /> 저장됨
                  </motion.span>
                ) : saving ? (
                  <motion.span key="saving" className="flex items-center gap-1">
                    <Save size={14} className="animate-spin" /> 저장 중
                  </motion.span>
                ) : (
                  <motion.span key="save" className="flex items-center gap-1">
                    <Save size={14} /> 저장
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* App integration info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-3xl p-5 border border-white/10 bg-[#121320] shadow-2xl hover:border-white/20 transition-all duration-300">
          <p className="text-[10px] font-bold text-white/20 mb-4 tracking-[0.3em] uppercase">Core Data Linked Apps</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'TRINITY', color: 'oklch(0.75 0.12 50)', desc: 'Birth data sync' },
              { name: 'MUSE', color: 'oklch(0.70 0.18 295)', desc: 'Creative goals' },
              { name: 'ORANGE', color: 'oklch(0.72 0.18 55)', desc: 'MBTI & Personality' },
              { name: 'BLUEBIRD', color: 'oklch(0.65 0.18 240)', desc: 'Soul aesthetics' },
            ].map(({ name, color, desc }) => (
              <div key={name} className="rounded-2xl p-3" style={{ background: color + '05', border: `1px solid ${color}10` }}>
                <p className="text-[10px] font-bold mb-1 tracking-wider" style={{ color }}>{name}</p>
                <p className="text-[9px] text-white/20 leading-tight uppercase font-mono">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Google 계정 클라우드 동기화 상태 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-3xl p-5 border border-white/10 bg-[#121320] shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-3 h-3 rounded-full shrink-0 ${firebaseUser ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white/80 block truncate">
                  {firebaseUser ? `구글 연동 계정: ${firebaseUser.email || firebaseUser.displayName || 'Google Account'}` : '게스트 모드 (로컬 임시 보관)'}
                </span>
                <span className="text-[11px] text-white/40 block mt-0.5">
                  {firebaseUser ? 'Google Cloud Firestore에 안전하게 실시간 영구 동기화 중' : '구글 계정으로 로그인하면 기기가 바뀌거나 캐시가 삭제되어도 프로필이 영구 보관됩니다.'}
                </span>
              </div>
            </div>
            {!firebaseUser && (
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md active:scale-95"
              >
                Google 연동
              </button>
            )}
          </div>
        </motion.div>

        {/* 시스템 정보 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-3xl p-5 border border-white/10 bg-[#121320] shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">System Engine</span>
              <span className="text-xs font-semibold text-white/80 mt-1">LUCY v{APP_VERSION}</span>
            </div>
            <span className="text-[10px] text-white/30 font-sans">최신 상태 유지 중</span>
          </div>
        </motion.div>

        {/* Section tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentSection;
            return (
              <button key={s.id} onClick={() => setCurrentSection(i)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 cursor-pointer"
                style={{
                  background: isActive ? s.color + '20' : 'oklch(0.12 0.015 270)',
                  border: `1px solid ${isActive ? s.color + '50' : 'oklch(0.20 0.01 270)'}`,
                  color: isActive ? s.color : 'oklch(0.45 0.01 270)',
                }}>
                <Icon size={12} />
                {s.label}
              </button>
            );
          })}
        </motion.div>

        {/* Section header */}
        <motion.div key={currentSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl p-5 mb-5 bg-[#121320] border border-white/10 shadow-lg">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: section.color + '15', border: `1px solid ${section.color}30` }}>
              <SectionIcon size={16} style={{ color: section.color }} />
            </div>
            <div>
              <h2 className="font-medium text-white/90 text-sm">{section.label}</h2>
              <p className="text-xs text-white/35">{section.desc}</p>
            </div>
            <div className="ml-auto text-xs text-white/25">{currentSection + 1} / {SECTIONS.length}</div>
          </div>
        </motion.div>

        {/* Section content */}
        <AnimatePresence mode="wait">
          <motion.div key={currentSection}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-5 mb-6 bg-[#121320] border border-white/10 shadow-xl">
            {renderSection()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentSection > 0 && (
            <button onClick={() => setCurrentSection(c => c - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm transition-all"
              style={{ background: 'oklch(0.14 0.015 270)', border: '1px solid oklch(0.22 0.01 270)', color: 'oklch(0.55 0.01 270)' }}>
              <ChevronLeft size={16} /> 이전
            </button>
          )}
          {currentSection < SECTIONS.length - 1 ? (
            <button onClick={async () => { 
                handleSave(true); // Silent save
                setCurrentSection(c => c + 1); 
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: section.color + '20', border: `1px solid ${section.color}40`, color: section.color }}>
              다음 <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={async () => { await handleSave(); navigate('/'); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'oklch(0.75 0.12 50 / 0.2)', border: '1px solid oklch(0.75 0.12 50 / 0.5)', color: 'oklch(0.75 0.12 50)' }}>
              <Check size={16} /> Complete and Go Home
            </button>
          )}
        </div>

        </div>
      </div>
    </div>
  );
}
