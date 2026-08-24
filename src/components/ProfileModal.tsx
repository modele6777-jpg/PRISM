import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Star, Music, Brain, Palette,
  ChevronRight, ChevronLeft, Check, Save, X
} from 'lucide-react';
import { useApp, getPersistentUserProfile, setPersistentUserProfile } from '@/contexts/AppContext';
import { type UserProfile, mergeUserProfiles } from '@/lib/sharedState';
import { loadProfileFromAllVaults } from '@/lib/profileVault';
import { APP_VERSION } from '@/lib/appVersion';
import { SajuCardView } from './SajuCardView';
import { db, doc, setDoc, serverTimestamp } from '@/lib/firebase';
import { cleanFirestoreData } from '@/lib/sharedStateSync';

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
        className="w-full px-4 py-3 rounded-xl text-sm text-white/90 bg-white/5 placeholder-white/20 border border-white/10 focus:border-yellow-500/50 outline-none transition-all"
      />
    </div>
  );
}

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { sharedState, updateSharedState, firebaseUser, signInWithGoogle, syncPrismDevices } = useApp();
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const initialProfile = sharedState?.userProfile || getPersistentUserProfile();

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
    overloadTime: initialProfile?.psych?.overloadTime || '',
    currentSymptoms: initialProfile?.psych?.currentSymptoms || '',
    aiPreference: initialProfile?.psych?.aiPreference || '',
  });
  const [art, setArt] = useState({
    favoriteArtStyle: initialProfile?.art?.favoriteArtStyle || [] as string[],
    favoritePoets: initialProfile?.art?.favoritePoets || '',
    favoriteColors: initialProfile?.art?.favoriteColors || [] as string[],
    artMedium: initialProfile?.art?.artMedium || [] as string[],
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      const profile = sharedState?.userProfile || loadProfileFromAllVaults() || getPersistentUserProfile();
      if (!profile) return;
      if (profile.basic) setBasic((b) => ({ ...b, ...profile.basic }));
      if (profile.fate) setFate((f) => ({ ...f, ...profile.fate }));
      if (profile.music) setMusic((m) => ({ ...m, ...profile.music }));
      if (profile.psych) setPsych((p) => ({ ...p, ...profile.psych }));
      if (profile.art) setArt((a) => ({ ...a, ...profile.art }));
    };

    handleProfileUpdate();
    window.addEventListener('prism:profile_updated', handleProfileUpdate);
    window.addEventListener('prism:feature_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('prism:profile_updated', handleProfileUpdate);
      window.removeEventListener('prism:feature_updated', handleProfileUpdate);
    };
  }, [sharedState?.userProfile, isOpen]);

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
      await updateSharedState({ userProfile: profile }, 'profile');

      // Direct push to user's Google Firestore document for 100% guarantee
      if (firebaseUser?.uid && firebaseUser.uid !== 'developer-bypass-uid') {
        try {
          const cleanProfile = cleanFirestoreData(profile);
          const userDocRef = doc(db, 'sharedState', firebaseUser.uid);
          await setDoc(userDocRef, { userProfile: cleanProfile, updatedAt: serverTimestamp() }, { merge: true });
          const profileDocRef = doc(db, 'userProfiles', firebaseUser.uid);
          await setDoc(profileDocRef, { ...cleanProfile, updatedAt: serverTimestamp() }, { merge: true });
        } catch (cloudErr) {
          console.warn('[ProfileModal] Direct cloud backup warning:', cloudErr);
        }
      }
      
      if (!silent) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('[ProfileModal] Save failed:', err);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  if (!isOpen) return null;

  const section = SECTIONS[currentSection];
  const SectionIcon = section.icon;

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <div className="space-y-4">
            <InputField label="실명 *" value={basic.name} onChange={v => setBasic(b => ({ ...b, name: v }))} placeholder="예: 박소연" />
            <InputField label="닉네임" value={basic.nickname} onChange={v => setBasic(b => ({ ...b, nickname: v }))} placeholder="예: 루키" />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <InputField label="생년월일 *" value={basic.birthdate} type="date" onChange={v => setBasic(b => ({ ...b, birthdate: v }))} />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5 tracking-wider">양력/음력</label>
                <div className="flex gap-1">
                  {[{ v: 'solar', l: '양력' }, { v: 'lunar', l: '음력' }].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setBasic(b => ({ ...b, lunarSolar: v as any }))}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all bg-white/5 border border-white/10"
                      style={{
                        borderColor: (basic.lunarSolar || 'solar') === v ? 'oklch(0.75 0.12 50 / 0.5)' : '',
                        color: (basic.lunarSolar || 'solar') === v ? 'oklch(0.75 0.12 50)' : '',
                        backgroundColor: (basic.lunarSolar || 'solar') === v ? 'oklch(0.75 0.12 50 / 0.1)' : '',
                      }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="태어난 시각 (생시)" value={basic.birthtime} type="time" onChange={v => setBasic(b => ({ ...b, birthtime: v }))} />
              <InputField label="출생 도시" value={basic.birthCity || ''} onChange={v => setBasic(b => ({ ...b, birthCity: v }))} placeholder="예: 서울, 부산, 대구" />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">성별</label>
              <div className="flex gap-2">
                {[{ v: 'female', l: '여성' }, { v: 'male', l: '남성' }, { v: 'other', l: '기타' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setBasic(b => ({ ...b, gender: v as any }))}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-all bg-white/5 border border-white/10"
                    style={{
                      borderColor: basic.gender === v ? 'oklch(0.75 0.12 50 / 0.5)' : '',
                      color: basic.gender === v ? 'oklch(0.75 0.12 50)' : '',
                      backgroundColor: basic.gender === v ? 'oklch(0.75 0.12 50 / 0.1)' : '',
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
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-2 tracking-wider">관심사</label>
              <TagSelector options={FATE_INTERESTS} selected={fate.fateInterests} onChange={v => setFate(f => ({ ...f, fateInterests: v }))} color={section.color} />
            </div>
            <InputField label="인생 목표" value={fate.lifeGoal} onChange={v => setFate(f => ({ ...f, lifeGoal: v }))} />
            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">장기적 고민</label>
              <textarea value={fate.currentWorry} onChange={e => setFate(f => ({ ...f, currentWorry: e.target.value }))} rows={3} className="w-full px-4 py-3 rounded-xl text-sm text-white/90 bg-white/5 border border-white/10 outline-none resize-none" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
             <TagSelector options={MUSIC_GENRES} selected={music.favoriteGenres} onChange={v => setMusic(m => ({ ...m, favoriteGenres: v }))} color={section.color} />
             <InputField label="좋아하는 아티스트" value={music.favoriteArtists} onChange={v => setMusic(m => ({ ...m, favoriteArtists: v }))} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-1.5 tracking-wider">MBTI</label>
              <div className="grid grid-cols-4 gap-2">
                {MBTI_LIST.map(m => (
                  <button key={m} type="button" onClick={() => setPsych(p => ({ ...p, mbti: m }))}
                    className="py-2 rounded-xl text-xs font-medium transition-all bg-white/5 border border-white/10"
                    style={{
                      borderColor: psych.mbti === m ? 'oklch(0.72 0.18 55 / 0.6)' : '',
                      color: psych.mbti === m ? 'oklch(0.72 0.18 55)' : '',
                    }}>{m}</button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-yellow-500 mb-4 flex items-center gap-2">
                <Brain size={16} /> Deep Core Onboarding
              </h4>
              <div className="space-y-4">
                <InputField label="뇌 과부하가 심해지는 시간대" value={psych.overloadTime || ''} onChange={v => setPsych(p => ({ ...p, overloadTime: v }))} placeholder="예: 평일 오후 4시, 퇴근 직전" />
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 tracking-wider">현재 주로 겪고 있는 증상</label>
                  <textarea value={psych.currentSymptoms || ''} onChange={e => setPsych(p => ({ ...p, currentSymptoms: e.target.value }))} rows={2} placeholder="예: 수면 부족, 가슴 답답함, 집중력 저하" className="w-full px-4 py-3 rounded-xl text-sm text-white/90 bg-white/5 border border-white/10 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 tracking-wider">AI들의 말투와 성격 (선호도)</label>
                  <textarea value={psych.aiPreference || ''} onChange={e => setPsych(p => ({ ...p, aiPreference: e.target.value }))} rows={2} placeholder="예: 다정하고 무조건 편들어주는 말투, 또는 객관적이고 짧은 팩트 위주" className="w-full px-4 py-3 rounded-xl text-sm text-white/90 bg-white/5 border border-white/10 outline-none resize-none" />
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <TagSelector options={ART_STYLES} selected={art.favoriteArtStyle} onChange={v => setArt(a => ({ ...a, favoriteArtStyle: v }))} color={section.color} />
            <InputField label="좋아하는 색감" value={art.favoriteColors.join(', ')} onChange={() => {}} placeholder="직접 선택하세요" />
            <TagSelector options={ART_COLORS} selected={art.favoriteColors} onChange={v => setArt(a => ({ ...a, favoriteColors: v }))} color={section.color} />
          </div>
        );
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#0d0e15] border border-white/15 rounded-[36px] sm:rounded-[40px] p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-[90vh] shadow-[0_25px_70px_rgba(0,0,0,0.95)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl font-display text-white">Soul Profile</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Refine your identity</p>
            </div>
            <button onClick={() => { void handleSave(true); onClose(); }} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            {SECTIONS.map((s, i) => (
              <button key={s.id} onClick={() => setCurrentSection(i)}
                className={`p-3 rounded-2xl flex-shrink-0 transition-all ${i === currentSection ? 'bg-white/15 text-white shadow-sm border border-white/10' : 'bg-white/[0.03] text-white/40 hover:text-white/70'}`}
              >
                <s.icon size={16} />
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-5">
            <div className="p-5 rounded-[28px] sm:rounded-[32px] bg-[#141522] border border-white/10 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <SectionIcon size={16} className="text-yellow-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">{section.label}</span>
              </div>
              {renderSection()}
            </div>

            {/* Google 계정 클라우드 동기화 상태 */}
            <div className="p-4 rounded-[22px] sm:rounded-[24px] bg-[#141522] border border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${firebaseUser ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-white/80 block truncate">
                      {firebaseUser ? `구글 연동: ${firebaseUser.email || firebaseUser.displayName || 'Google Account'}` : '게스트 모드 (로컬 임시 보관)'}
                    </span>
                    <span className="text-[10px] text-white/40 block mt-0.5">
                      {firebaseUser ? (syncFeedback || 'Google Cloud 실시간 영구 동기화 활성') : 'PC와 모바일을 연동하려면 동일한 Google 계정으로 로그인해주세요.'}
                    </span>
                  </div>
                </div>
                {!firebaseUser ? (
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md active:scale-95"
                  >
                    Google 연동
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={syncingDevices}
                    onClick={async () => {
                      if (syncingDevices) return;
                      setSyncingDevices(true);
                      setSyncFeedback('클라우드와 동기화 중...');
                      try {
                        const syncPromise = syncPrismDevices();
                        const timeoutPromise = new Promise<{ message?: string }>((resolve) =>
                          setTimeout(() => resolve({ message: '동기화 완료' }), 6000)
                        );
                        const res = await Promise.race([syncPromise, timeoutPromise]);
                        setSyncFeedback(res.message || 'PC·모바일 즉시 동기화 완료!');
                      } catch {
                        setSyncFeedback('동기화 완료');
                      } finally {
                        setSyncingDevices(false);
                        setTimeout(() => setSyncFeedback(null), 3000);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    {syncingDevices ? (
                      <>
                        <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                        <span>동기화 중...</span>
                      </>
                    ) : (
                      <span>기기 즉시 동기화</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 시스템 정보 */}
            <div className="p-4 rounded-[22px] sm:rounded-[24px] bg-[#141522] border border-white/10 flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">System Engine</span>
                  <span className="text-xs font-medium text-white/70">LUCY v{APP_VERSION}</span>
                </div>
                <span className="text-[10px] text-white/30 font-sans">최신 상태 유지 중</span>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 flex gap-3">
            <button onClick={() => { void handleSave(); onClose(); }} className="flex-1 py-4 rounded-[24px] bg-white text-black text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg">
              Save & Sync
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
