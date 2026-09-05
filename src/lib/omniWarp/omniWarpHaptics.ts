/**
 * OmniWarp Haptic Patterns
 * 차등 진동 피드백 (navigator.vibrate)
 */

export function triggerHaptic(type: 'whitehole' | 'event_horizon' | 'blackhole' | 'bigbang' | 'abort'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'whitehole':
        // 맑고 가벼운 고주파 탭 (톡-)
        navigator.vibrate?.([15]);
        break;
      case 'event_horizon':
        // 주파수가 낮아지며 굵어짐 (두둑...)
        navigator.vibrate?.([30, 25, 35]);
        break;
      case 'blackhole':
        // 바닥까지 울리는 저주파 중력파 (쿠구궁-)
        navigator.vibrate?.([80, 40, 100, 50, 140]);
        break;
      case 'bigbang':
        // 단발성 임팩트 킥 (쿵!)
        navigator.vibrate?.([160]);
        break;
      case 'abort':
        // 안전 취소 부드러운 해제
        navigator.vibrate?.([20]);
        break;
    }
  } catch (_) {}
}
