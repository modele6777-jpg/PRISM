import React from 'react';
import { useLocation } from 'wouter';
import { Sun, Sparkles, Music, TreeDeciduous, Bird, Activity, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useNarrowPhone } from '@/hooks/useNarrowPhone';
import { isLegacyMobile } from '@/lib/perfMode';

const NAV_ITEMS = [
  { path: '/', icon: Sun, label: 'PROLOGUE', color: 'oklch(0.60 0.22 15)', isHome: true },
  { path: '/orange', icon: TreeDeciduous, label: 'ORANGE', color: 'oklch(0.72 0.18 55)' },
  { path: '/trinity', icon: Sparkles, label: 'TRINITY', color: 'oklch(0.85 0.15 90)' },
  { path: '/heal', icon: Activity, label: 'AURA', color: 'oklch(0.70 0.15 150)' },
  { path: '/bluebird', icon: Bird, label: 'BLUEBIRD', color: 'oklch(0.75 0.12 230)' },
  { path: '/muse', icon: Music, label: 'MUSE', color: 'oklch(0.40 0.15 250)' },
  { path: '/epilogue', icon: Moon, label: 'EPILOGUE', color: 'oklch(0.65 0.25 310)' },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const narrow = useNarrowPhone();
  const legacy = isLegacyMobile();

  return (
    <nav
      aria-label="앱 네비게이션"
      className="prism-bottom-nav z-50 px-safe"
    >
      <div className="flex items-center justify-around w-full max-w-md mx-auto h-[var(--nav-bar-h)] px-1">
        {NAV_ITEMS.map(({ path, icon: Icon, color, isHome }) => {
          const isActive =
            location === path ||
            (path !== '/' && location.startsWith(path + '/')) ||
            (path !== '/' && location === path);

          return (
            <button
              key={path}
              onClick={() => {
                if (isActive) {
                  window.dispatchEvent(new CustomEvent('nav-click-active', { detail: { path } }));
                  if (location !== path) {
                    navigate(path);
                  }
                } else {
                  navigate(path);
                  window.dispatchEvent(new CustomEvent('nav-click-active', { detail: { path } }));
                }
              }}
              className="flex flex-1 min-w-0 h-full items-center justify-center rounded-md transition-all duration-150 relative active:scale-90"
              title={path === '/' ? 'PROLOGUE' : path.slice(1).toUpperCase()}
            >
              <div className="relative flex items-center justify-center">
                {isActive && (
                  narrow || legacy ? (
                    <div
                      className="absolute -inset-1 rounded-lg"
                      style={{ background: color + '22', border: `1px solid ${color}35` }}
                    />
                  ) : (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -inset-1 rounded-lg"
                      style={{ background: color + '22', border: `1px solid ${color}35` }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )
                )}
                <Icon
                  size={isHome ? 15 : 16}
                  style={{ color: isActive ? color : 'oklch(0.55 0.01 270)' }}
                  className="relative transition-colors duration-150 stroke-[1.8]"
                />
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}