import React from 'react';
import {
  Leaf, Wind, ShieldCheck, Heart, Sparkles, Activity, Sun, Anchor,
  Brain, Ban, TrendingUp, Combine, BookOpen,
} from 'lucide-react';
import { BibleToolSection } from '../BibleToolSection';

export const SedonaBible: React.FC<{ onConsult: (text: string) => void }> = ({ onConsult }) => {
  const sedonaProps = {
    subtitle: 'Sedona Method · AURA',
    color: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-400',
    onSelectStep: onConsult,
  };

  const hawkinsProps = {
    subtitle: 'Letting Go · David Hawkins',
    color: 'border-teal-500/20',
    textColor: 'text-teal-400',
    bgColor: 'bg-teal-400',
    onSelectStep: onConsult,
  };

  const fusionProps = {
    subtitle: 'Sedona × Letting Go',
    color: 'border-cyan-500/20',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-400',
    onSelectStep: onConsult,
  };

  return (
    <div className="space-y-12 py-6 overflow-y-auto no-scrollbar">
      <div className="text-center space-y-4 mb-16">
        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-[0.3em] font-mono block">
          Sedona Method × Letting Go
        </span>
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">
          Sedona Bible
        </h2>
        <p className="text-sm text-emerald-400/90 uppercase tracking-[0.25em] font-bold">
          세도나 메서드 & 데이비드 호킨스 『놓아버림』 통합 바이블
        </p>
        <p className="text-xs text-white/45 max-w-2xl mx-auto leading-relaxed font-sans normal-case tracking-normal">
          레스터 레븐슨의 세도나 4문답과 데이비드 호킨스의 감정 놓아버림을 한 흐름으로 실천합니다.
          느끼고, 환영하고, 흘려보내세요.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
          {['4문답', '느끼기', '저항풀기', '항복', '놓아버림'].map((step) => (
            <span
              key={step}
              className="text-[9px] font-bold tracking-[0.1em] px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300/90"
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <BibleToolSection
        title="4 Questions · 세도나 4문답"
        icon={Leaf}
        principles={[
          '레스터 레븐슨이 전한 세도나 메서드의 핵심은 네 가지 질문입니다.',
          '① 이 감정을 느낄 수 있나요? ② 흘려보낼 수 있나요? ③ 기꺼이 놓아버리겠습니까? ④ 언제? (지금!)',
          '질문만으로도 감정의 전하(Charge)가 약해지고, 호킨스의 놓아버림과 자연스럽게 이어집니다.',
        ]}
        steps={[
          '지금 느끼는 감정에 세도나 4문답을 적용하는 방법 알려줘',
          '4문답 각 단계에서 스스로에게 할 말 예시 들어줘',
          '감정이 강할 때 4문답을 반복하는 실전 가이드 해줘',
        ]}
        {...sedonaProps}
      />

      <BibleToolSection
        title="Letting Go · 놓아버림의 원리"
        icon={BookOpen}
        principles={[
          '데이비드 호킨스 『놓아버림(Letting Go)』— 억압이 아니라 자연스러운 해방입니다.',
          '감정을 느끼면 느낄수록, 저항 없이 통과하면 스스로 약해지고 사라집니다.',
          '분석하거나 해결하려 하지 말고, 느끼고 환영하는 것이 핵심입니다.',
        ]}
        steps={[
          '호킨스의 놓아버림 3단계(느끼기→환영→놓기)를 오늘 내 감정에 적용해줘',
          '감정을 억누르지 않고 느끼다 자연스럽게 놓아버리는 연습 알려줘',
          '「놓아버림」과 「흘려보내기」의 차이와 공통점 설명해줘',
        ]}
        {...hawkinsProps}
      />

      <BibleToolSection
        title="Feel the Feeling · 감정을 온전히 느끼기"
        icon={Brain}
        principles={[
          '호킨스는 「감정을 느껴라」고 합니다. 머리가 아니라 몸에서 느껴야 합니다.',
          '가슴, 목, 배, 어깨— 감정이 어디에 자리하는지 찾아 비춰 보세요.',
          '얼마나 오래 느끼든 괜찮습니다. 느끼는 것 자체가 정화입니다.',
        ]}
        steps={[
          '지금 감정이 몸 어디에 있는지 함께 찾아봐줘',
          '감정을 온전히 느끼며 놓아버리는 5분 바디 스캔 가이드 해줘',
          '머리로 분석하지 않고 몸으로 느끼는 연습법 알려줘',
        ]}
        {...hawkinsProps}
      />

      <BibleToolSection
        title="Resistance · 저항 풀기"
        icon={Ban}
        principles={[
          '호킨스: 저항이 감정을 붙잡아 둡니다. 「이런 기분 싫어」가 고통을 연장합니다.',
          '세도나: 「느낄 수 있나요?」— 저항 대신 환영의 첫 질문입니다.',
          '저항을 저항하지 마세요. 저항마저 느끼고 놓아버릴 수 있습니다.',
        ]}
        steps={[
          '지금 내가 무엇에 저항하고 있는지 함께 살펴봐줘',
          '저항을 느끼고 놓아버리는 호킨스식 연습 해줘',
          '세도나 1번 질문으로 저항을 환영하는 방법 알려줘',
        ]}
        {...fusionProps}
      />

      <BibleToolSection
        title="Three Desires · 에고의 3대 욕구"
        icon={ShieldCheck}
        principles={[
          '세도나: 에고의 결핍 욕구—통제, 인정, 안전—에서 자유를 찾습니다.',
          '호킨스: 낮은 의식의 욕망(Desire)과 집착이 감정을 만들어냅니다.',
          '욕구를 알아차리고 느끼면, 세도나 질문과 놓아버림이 함께 작동합니다.',
        ]}
        steps={[
          '지금 나의 통제 욕구를 느끼고 세도나+놓아버림으로 풀어줘',
          '인정 욕구가 올라올 때 호킨스식 감정 처리법 알려줘',
          '안전 욕구와 두려움을 항복하며 놓아버리는 통합 가이드 해줘',
        ]}
        {...fusionProps}
      />

      <BibleToolSection
        title="Map of Consciousness · 의식 지도"
        icon={TrendingUp}
        principles={[
          '호킨스 의식 지도: 수치가 낮을수록—수치심, 죄책감, 무기력, 슬픔, 두려움, 욕망, 분노, 자만.',
          '높을수록—용기, 수용, 사랑, 평화, 깨달음. 방하착은 한 단계씩 올라가는 길입니다.',
          '세도나 릴리즈 테마(무기력·슬픔·두려움·분노·통제·인정·안전)와 의식 지도가 맞닿아 있습니다.',
        ]}
        steps={[
          '지금 내 감정이 호킨스 의식 지도 어디쯤인지 함께 살펴봐줘',
          '의식 수준을 한 단계 올리는 오늘의 놓아버림 처방 알려줘',
          '분노에서 용기로, 두려움에서 수용으로 올라가는 실천법 알려줘',
        ]}
        {...hawkinsProps}
      />

      <BibleToolSection
        title="Emotional Release · 감정 방하착"
        icon={Heart}
        principles={[
          '무기력, 슬픔, 두려움, 분노— 억압된 감정은 몸에 전하(Charge)로 남습니다.',
          '호킨스: 감정 에너지가 쌓이면 스트레스와 질볥으로 이어질 수 있습니다.',
          '세도나 4문답으로 질문하고, 호킨스 방식으로 느끼며, 함께 흘려냅니다.',
        ]}
        steps={[
          '지금 가장 크게 느껴지는 감정을 세도나+놓아버림으로 흘려보내줘',
          '분노를 느끼다 놓아버리는 통합 4문답 적용해줘',
          '슬픔과 상실감을 안아 느끼고 흘려보내는 명상 가이드 해줘',
        ]}
        {...fusionProps}
      />

      <BibleToolSection
        title="Surrender · 항복"
        icon={Sparkles}
        principles={[
          '호킨스: 항복(Surrender)은 패배가 아니라, 더 높은 힘에 맡기는 것입니다.',
          '세도나: 「기꺼이 놓아버리겠습니까?」— 항복의 질문입니다.',
          '완고한 에고를 내려놓을 때, 평정과 자비가 스스로 찾아옵니다.',
        ]}
        steps={[
          '오늘 항복해야 할 완고함을 느끼고 흘려보내는 연습 해줘',
          '호킨스+세도나 융합 항복 확언문 맞춤으로 만들어줘',
          '통제하려는 마음을 우주에 맡기는 짧은 기도 가이드 해줘',
        ]}
        {...fusionProps}
      />

      <BibleToolSection
        title="Sedona × Letting Go · 융합 실천"
        icon={Combine}
        principles={[
          '① 몸에서 감정을 느낀다 (호킨스) → ② 세도나 4문답으로 흘려보낸다 → ③ 항복하며 놓는다.',
          '두 방법은 경쟁이 아니라 같은 방향의 다른 손잡이입니다.',
          '어느 쪽이든 편한 것부터 시작하면 됩니다.',
        ]}
        steps={[
          '세도나 4문답과 호킨스 놓아버림을 한 세션으로 합친 10분 가이드 해줘',
          '스트레스 순간에 30초 융합 릴리즈 기법 알려줘',
          '오늘 내 감정에 맞는 세도나 테마와 놓아버림 순서 추천해줘',
        ]}
        {...fusionProps}
      />

      <BibleToolSection
        title="Stress & Body · 스트레스와 몸"
        icon={Activity}
        principles={[
          '호킨스: 쌓인 감정 에너지가 만성 스트레스와 신체 긴장을 만듭니다.',
          '몸의 긴장을 느끼고 놓아버리면, 마음의 짐도 함께 가벼워집니다.',
          '세도나 솔페지오 주파수와 함께하면 신체·정서 동시 정화에 도움이 됩니다.',
        ]}
        steps={[
          '몸에 쌓인 스트레스를 호킨스 방식으로 방출하는 법 알려줘',
          '어깨·턱·배 긴장을 느끼고 놓아버리는 바디 릴리즈 해줘',
          '신체 긴장과 감정을 함께 풀는 저녁 루틴 짜줘',
        ]}
        {...hawkinsProps}
      />

      <BibleToolSection
        title="Daily Practice · 매일의 방하착"
        icon={Sun}
        principles={[
          '방하착은 한 번이 아니라 매 순간 선택하는 연습입니다.',
          '아침: 의식 지도 점검 + 세도나 질문. 낮: 감정 올라올 때 즉시 느끼고 놓기.',
          '저녁: 하루 쌓인 감정 에너지를 호킨스식으로 비우고 평온히 마무리.',
        ]}
        steps={[
          '아침 5분 세도나+놓아버림 통합 루틴 짜줘',
          '감정이 올라올 때 바로 쓸 융합 30초 기법 알려줘',
          '하루를 평온하게 마무리하는 저녁 방하착 가이드 해줘',
        ]}
        {...fusionProps}
      />

      <BibleToolSection
        title="Hollowness · 비움과 평정"
        icon={Anchor}
        principles={[
          '호킨스: 감정을 놓으면 잠시 텅 빈 느낌이 옵니다. 그것이 평정의 문입니다.',
          '세도나: 완전한 해방 후 남는 것은 순수한 자아와 고요함입니다.',
          '비어 있음은 결핍이 아니라, 본래의 자비로운 본성이 드러나는 공간입니다.',
        ]}
        steps={[
          '방하착 후 텅 빈 느낌이 올 때 호킨스가 권하는 대처법 알려줘',
          '평정과 공허를 구분하는 방법 설명해줘',
          '비움 속에서 본래의 나를 느끼는 짧은 명상 안내해줘',
        ]}
        {...fusionProps}
      />

      <div className="mt-12 p-8 rounded-[36px] bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center text-center space-y-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="w-16 h-16 rounded-[24px] bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-2xl relative z-10">
          <Combine className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="space-y-6 relative z-10">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em] opacity-90 drop-shadow-md">
            Sedona × Letting Go Note
          </h3>
          <p className="text-xl md:text-xl text-emerald-100 leading-relaxed font-sans max-w-3xl mx-auto drop-shadow-lg">
            &ldquo;레스터 레븐슨은 질문으로, 데이비드 호킨스는 느낌으로 가르칩니다. 둘 다 같은 곳으로 향합니다—감정을 붙잡지 않는 자유.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};