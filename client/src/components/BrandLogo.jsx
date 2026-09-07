import React from 'react';

/**
 * NEBULA Supermarket Official Brand Logo
 * Hand-drawn warm grocery shopping bag with products
 * Lockup:
 * [ GROCERY BAG ICON ]
 * NEBULA
 * SUPERMARKET
 * Simplify. Manage. Grow.
 */
export default function BrandLogo({
  size = 'md',
  showText = true,
  showTagline = true,
  theme = 'light',
  className = ''
}) {
  const sizeMap = {
    sm: {
      box: 'w-10 h-10 rounded-xl',
      img: 'w-full h-full object-contain p-0.5',
      text: 'text-sm font-black',
      sub: 'text-[8.5px] tracking-[0.18em]',
      tag: 'text-[8.5px]'
    },
    md: {
      box: 'w-14 h-14 rounded-2xl',
      img: 'w-full h-full object-contain p-1',
      text: 'text-lg font-black',
      sub: 'text-[10px] tracking-[0.2em]',
      tag: 'text-[10px]'
    },
    lg: {
      box: 'w-20 h-20 rounded-2xl',
      img: 'w-full h-full object-contain p-1.5',
      text: 'text-2xl font-black',
      sub: 'text-[12px] tracking-[0.22em]',
      tag: 'text-xs'
    },
    xl: {
      box: 'w-28 h-28 rounded-3xl',
      img: 'w-full h-full object-contain p-2',
      text: 'text-4xl font-black',
      sub: 'text-base tracking-[0.24em]',
      tag: 'text-sm'
    }
  };

  const s = sizeMap[size] || sizeMap.md;
  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center space-x-3.5 select-none ${className}`}>
      {/* Official Grocery Bag Icon from uploaded artwork */}
      <div
        className={`${s.box} flex-shrink-0 flex items-center justify-center overflow-hidden bg-[#FFF4D6] border border-[#E8E0CC] shadow-2xs transition-transform duration-200 group-hover:scale-105`}
        title="NEBULA Supermarket"
      >
        <img
          src="/nebula-bag-logo.png"
          alt="NEBULA Grocery Bag Icon"
          className={s.img}
        />
      </div>

      {/* Brand Typography Lockup */}
      {showText && (
        <div className="leading-tight overflow-hidden">
          <div
            className={`tracking-tight uppercase font-sans ${s.text} ${
              isDark ? 'text-white' : 'text-[#292929]'
            }`}
          >
            NEBULA
          </div>
          <div
            className={`font-extrabold uppercase font-sans ${s.sub} ${
              isDark ? 'text-[#FFD84D]' : 'text-[#6B6B63]'
            }`}
          >
            SUPERMARKET
          </div>
          {showTagline && (
            <p
              className={`font-medium tracking-wide mt-0.5 ${s.tag} ${
                isDark ? 'text-amber-100' : 'text-[#6B6B63]'
              }`}
            >
              Simplify. Manage. Grow.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
