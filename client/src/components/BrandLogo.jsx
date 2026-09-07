import React from 'react';

/**
 * NEBULA Supermarket Brand Logo
 * Concept: Minimal modern grocery basket + fresh leaf + tech orbit
 */
export default function BrandLogo({ size = 'md', showText = true, theme = 'light', className = '' }) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 16, text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', icon: 20, text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-12 h-12', icon: 26, text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'w-16 h-16', icon: 36, text: 'text-2xl', sub: 'text-sm' }
  };

  const s = sizeMap[size] || sizeMap.md;
  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div
        className={`${s.box} rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 bg-[#14532D] text-white`}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-3/4 h-3/4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shopping Basket / Bag Outline */}
          <path
            d="M7 13H25L23.2 24.5C23.1 25.3 22.4 26 21.6 26H10.4C9.6 26 8.9 25.3 8.8 24.5L7 13Z"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="#166534"
          />
          {/* Handle */}
          <path
            d="M11 13V9C11 6.8 12.8 5 15 5H17C19.2 5 21 6.8 21 9V13"
            stroke="#F97316"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Fresh Leaf Element Inside Basket */}
          <path
            d="M16 13C16 13 18.5 15 18.5 18C18.5 19.4 17.4 20.5 16 20.5C14.6 20.5 13.5 19.4 13.5 18C13.5 15 16 13 16 13Z"
            fill="#22C55E"
          />
          {/* Subtle Smart Orbit Tech Dot */}
          <circle cx="16" cy="18" r="1.5" fill="#FAFAF7" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="leading-tight overflow-hidden">
          <div
            className={`font-black tracking-wider uppercase font-sans ${s.text} ${
              isDark ? 'text-white' : 'text-[#14532D]'
            }`}
          >
            NEBULA
          </div>
          <div
            className={`font-bold tracking-[0.22em] uppercase ${s.sub} ${
              isDark ? 'text-emerald-300' : 'text-[#647067]'
            }`}
          >
            SUPERMARKET
          </div>
        </div>
      )}
    </div>
  );
}
