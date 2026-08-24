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
      <div className="flex items-center justify-between w-full max-w-lg mx-auto h-[var(--nav-bar-h)]">
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
              className="flex flex-1 min-w-0 h-full items-center justify-center px-0.5 rounded-md transition-all duration-200 relative"
            >
              <div className={`relative flex items-center justify-center p-1.5 rounded-xl ${isHome ? 'prism-nav-home' : ''}`}>
                {isActive && (
                  narrow || legacy ? (
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{ background: color + '25', border: `1px solid ${color}40` }}
                    />
                  ) : (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-xl shadow-lg"
                      style={{ background: color + '25', border: `1px solid ${color}40` }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )
                )}
                {narrow || legacy ? (
                  <Icon
                    size={isHome ? 16 : 18}
                    style={{ color: isActive ? color : 'oklch(0.55 0.01 270)' }}
                    className="relative transition-colors duration-200"
                  />
                ) : (
                  <motion.div
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative flex items-center justify-center"
                  >
                    <Icon
                      size={isHome ? 18 : 20}
                      style={{ color: isActive ? color : 'oklch(0.55 0.01 270)' }}
                      className="relative transition-colors duration-200"
                    />
                  </motion.div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}