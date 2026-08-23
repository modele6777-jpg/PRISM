import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  User, Star, Music, Brain, Palette,
  ChevronRight, ChevronLeft, Check, Save, ArrowLeft, Moon, Sparkles, BookOpen, UserCheck
} from 'lucide-react';
import { useApp, getPersistentUserProfile, setPersistentUserProfile } from '@/contexts/AppContext';
import { loadProfileFromAllVaults, saveProfileToAllVaults } from '@/lib/profileVault';
import { type UserProfile, mergeUserProfiles } from '@/lib/sharedState';
import { SajuCardView } from '@/components/SajuCardView';
import { db, doc, setDoc, serverTimestamp } from '@/lib/firebase';
import { SpecialFeatureFabGroup, ChatFabButton, HandbookFabButton } from '@/components/SpecialFeatureFab';
import { EpilogueHandbookModal } from '@/components/epilogue/EpilogueHandbookModal';

const SECTIONS = [
  { id: 'basic', label: '기본 정보', icon: User, color: 'oklch(0.75 0.12 50)', desc: '이름 · 생년월일 · 성별' },
  { id: 'fate', label: '운명 관심사', icon: Star, color: 'oklch(0.85 0.15 90)', desc: '사주 · 타로 · 별자리 관심사' },
  { id: 'music', label: '음악 취향', icon: Music, color: 'oklch(0.50 0.15 260)', desc: '장르 · 악기 · 창의 목표' },
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
            type="button"
            onClick={() => toggle(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer"
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

export default function EpilogueApp() {
  const [, navigate] = useLocation();
  const { sharedState, updateSharedState, firebaseUser, signInWithGoogle, openLucyChat, sendUnifiedMessage } = useApp();
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHandbookModal, setShowHandbookModal] = useState(false);

  const initialProfile = sharedState?.userProfile || loadProfileFromAllVaults() || getPersistentUserProfile();

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

  // Load from Profile Vault and Firebase
  useEffect(() => {
    const profile = sharedState?.userProfile || loadProfileFromAllVaults() || getPersistentUserProfile();
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
      await updateSharedState({ userProfile: profile }, 'profile').catch(err => {
        console.error('[Profile] Sync failed:', err);
      });

      // Direct cloud push
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
          <div className="space-y-4">
            <InputField label="실명 *" value={basic.name}
              onChange={v => setBasic(b => ({ ...b, name: v }))} placeholder="예: 박소연" />
            <InputField label="닉네임 (루시가 부를 이름)" value={basic.nickname}
              onChange={v => setBasic(b => ({ ...b, nickname: v }))} placeholder="예: 쭈" />
            <InputField label="생년월일" value={basic.birthdate} type="date"
              onChange={v => setBasic(b => ({ ...b, birthdate: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1.5 tracking-wider">양력/음력</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid oklch(0.22 0.01 270)' }}>
                  {(['solar', 'lunar'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBasic(b => ({ ...b, lunarSolar: type }))}
                      className="flex-1 py-3 text-xs font-medium transition-colors cursor-pointer"
                      style={{
                        background: basic.lunarSolar === type ? 'oklch(0.75 0.12 50 / 0.2)' : 'oklch(0.14 0.015 270)',
                        color: basic.lunarSolar === type ? 'oklch(0.75 0.12 50)' : 'oklch(0.5 0.01 270)',
                      }}
                    >
                      {type === 'solar' ? '양력' : '음력'}
                    </button>
                  ))}
                </div>
              </div>
              <InputField label="태어난 시간" value={basic.birthtime} type="time"
                onChange={v => setBasic(b => ({ ...b, birthtime: v }))} />
            </div>
            <InputField label="출생 도시" value={basic.birthCity}
              onChange={v => setBasic(b => ({ ...b, birthCity: v }))} placeholder="예: 서울, 부산, 대구..." />
            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">성별</label>
              <div className="flex gap-2">
                {[
                  { val: 'female', label: '여성' },
                  { val: 'male', label: '남성' },
                  { val: 'other', label: '기타' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBasic(b => ({ ...b, gender: val as any }))}
                    className="flex-1 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: basic.gender === val ? 'oklch(0.75 0.12 50 / 0.2)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${basic.gender === val ? 'oklch(0.75 0.12 50 / 0.5)' : 'oklch(0.22 0.01 270)'}`,
                      color: basic.gender === val ? 'oklch(0.75 0.12 50)' : 'oklch(0.5 0.01 270)',
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
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">관심 있는 분야 (다중 선택)</label>
              <TagSelector
                options={FATE_INTERESTS}
                selected={fate.fateInterests}
                onChange={v => setFate(f => ({ ...f, fateInterests: v }))}
                color="oklch(0.85 0.15 90)"
              />
            </div>
            <InputField label="인생의 주요 목표/방향" value={fate.lifeGoal}
              onChange={v => setFate(f => ({ ...f, lifeGoal: v }))} placeholder="예: 경제적 자유, 내면의 평화, 창작 활동..." />
            <InputField label="요즘 가장 큰 고민거리" value={fate.currentWorry}
              onChange={v => setFate(f => ({ ...f, currentWorry: v }))} placeholder="예: 이직 고민, 인간관계, 건강..." />
          </div>
        );
      case 2: // 음악 취향
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">좋아하는 음악 장르 (다중 선택)</label>
              <TagSelector
                options={MUSIC_GENRES}
                selected={music.favoriteGenres}
                onChange={v => setMusic(m => ({ ...m, favoriteGenres: v }))}
                color="oklch(0.50 0.15 260)"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">다룰 수 있는 악기/분야 (다중 선택)</label>
              <TagSelector
                options={INSTRUMENTS}
                selected={music.instruments}
                onChange={v => setMusic(m => ({ ...m, instruments: v }))}
                color="oklch(0.50 0.15 260)"
              />
            </div>
            <InputField label="좋아하는 아티스트/뮤지션" value={music.favoriteArtists}
              onChange={v => setMusic(m => ({ ...m, favoriteArtists: v }))} placeholder="예: 아이유, 쇼팽, 콜드플레이..." />
            <InputField label="음악/창작 관련 목표" value={music.creativeGoal}
              onChange={v => setMusic(m => ({ ...m, creativeGoal: v }))} placeholder="예: 피아노 한 곡 완곡, 자작곡 만들기..." />
          </div>
        );
      case 3: // 심리 · 결정
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">MBTI 유형</label>
              <div className="grid grid-cols-4 gap-2">
                {MBTI_LIST.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPsych(p => ({ ...p, mbti: type }))}
                    className="py-2.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer"
                    style={{
                      background: psych.mbti === type ? 'oklch(0.72 0.18 55 / 0.2)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${psych.mbti === type ? 'oklch(0.72 0.18 55 / 0.6)' : 'oklch(0.22 0.01 270)'}`,
                      color: psych.mbti === type ? 'oklch(0.72 0.18 55)' : 'oklch(0.5 0.01 270)',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">선호하는 AI 상담 스타일</label>
              <div className="flex gap-2">
                {[
                  { val: 'empathy', label: '따뜻한 공감' },
                  { val: 'advice', label: '명확한 솔루션' },
                  { val: 'mixed', label: '공감 + 솔루션' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPsych(p => ({ ...p, counselingStyle: val as any }))}
                    className="flex-1 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: psych.counselingStyle === val ? 'oklch(0.72 0.18 55 / 0.2)' : 'oklch(0.14 0.015 270)',
                      border: `1px solid ${psych.counselingStyle === val ? 'oklch(0.72 0.18 55 / 0.5)' : 'oklch(0.22 0.01 270)'}`,
                      color: psych.counselingStyle === val ? 'oklch(0.72 0.18 55)' : 'oklch(0.5 0.01 270)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <InputField label="현재 전반적인 기분/마음 상태" value={psych.currentMood}
              onChange={v => setPsych(p => ({ ...p, currentMood: v }))} placeholder="예: 평온함, 약간의 불안, 설렘..." />
          </div>
        );
      case 4: // 예술 취향
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">선호하는 화풍/스타일 (다중 선택)</label>
              <TagSelector
                options={ART_STYLES}
                selected={art.favoriteArtStyle}
                onChange={v => setArt(a => ({ ...a, favoriteArtStyle: v }))}
                color="oklch(0.65 0.18 240)"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">선호하는 색감/톤 (다중 선택)</label>
              <TagSelector
                options={ART_COLORS}
                selected={art.favoriteColors}
                onChange={v => setArt(a => ({ ...a, favoriteColors: v }))}
                color="oklch(0.65 0.18 240)"
              />
            </div>
            <InputField label="좋아하는 시인/작가/책" value={art.favoritePoets}
              onChange={v => setArt(a => ({ ...a, favoritePoets: v }))} placeholder="예: 윤동주, 헤르만 헤세, 릴케..." />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-app-screen flex flex-col bg-[#05010a] text-white select-text pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4 backdrop-blur-xl border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,0.2)]">
            <Moon className="text-purple-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>PRISM PROFILE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                EPILOGUE
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-white/40 font-sans tracking-wide">
              소울 프로필 관리 &amp; 5대 우주 지능 연동
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer shadow-lg active:scale-95 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white"
        >
          {saving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <Check size={14} className="text-white" />
          ) : (
            <Save size={14} />
          )}
          <span>{saved ? '저장 완료' : '프로필 저장'}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Section Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {SECTIONS.map((sec, idx) => {
            const Icon = sec.icon;
            const isActive = currentSection === idx;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  handleSave(true);
                  setCurrentSection(idx);
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold font-sans transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white/15 border border-purple-400/40 text-white shadow-md shadow-purple-500/10'
                    : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white/50'
                }`}
              >
                <Icon size={14} style={{ color: isActive ? sec.color : undefined }} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Section Form Card */}
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: section.color + '20' }}>
                <SectionIcon size={18} style={{ color: section.color }} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">{section.label}</h2>
                <p className="text-xs text-white/40">{section.desc}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-white/30">{currentSection + 1} / {SECTIONS.length}</span>
          </div>

          {renderSection()}

          <div className="flex justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              disabled={currentSection === 0}
              onClick={() => {
                handleSave(true);
                setCurrentSection(s => Math.max(0, s - 1));
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>이전</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleSave(true);
                if (currentSection < SECTIONS.length - 1) {
                  setCurrentSection(s => s + 1);
                } else {
                  handleSave(false);
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <span>{currentSection < SECTIONS.length - 1 ? '다음 단계' : '저장하기'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>

        {/* Live Saju & Cosmic Card Preview */}
        {basic.birthdate && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Sparkles size={13} className="text-yellow-400" />
                <span>나의 실시간 천문 사주 &amp; 운명 카드 프리뷰</span>
              </h3>
            </div>
            <SajuCardView profile={{ basic: { ...basic, gender: basic.gender || undefined }, fate, music, psych, art }} />
          </div>
        )}
      </div>

      {/* Epilogue Handbook Modal */}
      <EpilogueHandbookModal
        isOpen={showHandbookModal}
        onClose={() => setShowHandbookModal(false)}
        onConsult={(text) => {
          openLucyChat('epilogue');
          sendUnifiedMessage(text, 'lucy');
        }}
      />

      {/* Special Feature Floating Action Buttons */}
      <SpecialFeatureFabGroup>
        <HandbookFabButton
          theme="epilogue"
          isOpen={showHandbookModal}
          tooltipLabel="📖 에필로그 핸드북 &amp; 종합 결산"
          onClick={() => setShowHandbookModal((prev) => !prev)}
        />
        <ChatFabButton onClick={() => openLucyChat('epilogue')} />
      </SpecialFeatureFabGroup>
    </div>
  );
}
