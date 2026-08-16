import React from 'react';
import { motion } from 'motion/react';

export const BluebirdSoulLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6">
      <div className="relative w-20 h-20">
        {/* Core Pulsing Heart of the Pharmacy */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 m-auto w-4 h-4 bg-blue-400 rounded-full blur-[2px]"
        />

        {/* Orbiting Frequency Rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
            }}
            className="absolute inset-0 border border-blue-500/20 rounded-[35%] flex items-center justify-center"
            style={{ padding: i * 8 }}
          >
            <div className="w-1 h-1 bg-blue-300 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
          </motion.div>
        ))}

        {/* The Ghost Bird Wings (Abstract) */}
        <motion.div
          animate={{
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-400/30">
             <path d="M20.3 5.4a1 1 0 0 0-1.2-1.2c-1.5.4-3.5 1.4-5 2.8C12.6 8.5 12 10.5 12 12c0 1.5.6 3.5 2.1 5 1.5 1.4 3.5 2.4 5 2.8a1 1 0 0 0 1.2-1.2c-.4-1.5-1.4-3.5-2.8-5 1.4-1.5 2.4-3.5 2.8-5z" />
             <path d="M3.7 5.4a1 1 0 0 1 1.2-1.2c1.5.4 3.5 1.4 5 2.8C11.4 8.5 12 10.5 12 12c0 1.5-.6 3.5-2.1 5-1.5 1.4-3.5 2.4-5 2.8a1 1 0 0 1-1.2-1.2c.4-1.5 1.4-3.5 2.8-5-1.4-1.5-2.4-3.5-2.8-5z" />
           </svg>
        </motion.div>
      </div>
      
      <div className="flex flex-col items-center">
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[10px] font-bold text-blue-400 tracking-[0.4em] uppercase"
        >
          Compounding Soul Medicine
        </motion.span>
        <p className="text-[9px] text-white/20 mt-1 ">치유의 주파수를 조율하는 중...</p>
      </div>
    </div>
  );
};
