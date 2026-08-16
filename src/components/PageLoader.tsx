import React from 'react';

export function PageLoader() {
  return (
    <div className="h-full min-h-[40vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/15 border-t-white/70 rounded-full animate-spin" />
    </div>
  );
}