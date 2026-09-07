import React from 'react';

export default function BrandLogo({ size = 'md', showText = true, className = '' }) {
  const sizeMap = {
    sm: { img: 'w-7 h-7', text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'w-10 h-10', text: 'text-base', sub: 'text-xs' },
    lg: { img: 'w-14 h-14', text: 'text-xl', sub: 'text-xs' },
    xl: { img: 'w-20 h-20', text: 'text-2xl', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Brand Mark Emblem */}
      <div className={`${currentSize.img} rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-amber-300/40 bg-[#FFF7E6] flex items-center justify-center p-0.5`}>
        <img
          src="/brand-logo.png"
          alt="Nebula Supermarket Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Typography Wordmark */}
      {showText && (
        <div className="overflow-hidden leading-tight">
          <div className={`font-extrabold text-white tracking-wide uppercase font-serif ${currentSize.text}`}>
            Nebula
          </div>
          <div className="text-amber-400 font-semibold tracking-wider text-[11px] uppercase">
            Supermarket
          </div>
        </div>
      )}
    </div>
  );
}
