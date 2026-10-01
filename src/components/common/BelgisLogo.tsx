import React from 'react';

interface BelgisLogoProps {
  className?: string;
  size?: number | string;
  showDetails?: boolean;
  alt?: string;
}

export const BelgisLogo: React.FC<BelgisLogoProps> = ({
  className = '',
  size = 64,
  alt = "Dulzuras de Belgi's",
}) => {
  const sizeStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full aspect-square bg-black/5 ${className}`}
      style={sizeStyle}
    >
      <img
        src="/images/logo.png"
        alt={alt}
        className="w-full h-full object-contain rounded-full select-none pointer-events-none"
        loading="eager"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          if (target.src.endsWith('/images/logo.png')) {
            target.src = '/logo.png';
          } else if (target.src.endsWith('/logo.png')) {
            target.src = '/logo.jpg';
          }
        }}
        style={{ aspectRatio: '1 / 1' }}
      />
    </div>
  );
};
