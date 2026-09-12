import React from 'react';

// Banner de fondo original: degradado oscuro con lomas y un cielo con puntos
// sutiles. Sin imágenes de terceros. Se coloca absoluto detrás del hero.
const stars = [80, 220, 410, 640, 900, 1120, 1330];

const HeroBanner: React.FC = () => (
  <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#020617" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="lp-hill1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#064e3b" />
        <stop offset="1" stopColor="#022c22" />
      </linearGradient>
      <linearGradient id="lp-hill2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#065f46" />
        <stop offset="1" stopColor="#064e3b" />
      </linearGradient>
      <radialGradient id="lp-glow" cx="0.8" cy="0.2" r="0.5">
        <stop offset="0" stopColor="#06b6d4" stopOpacity="0.25" />
        <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1440" height="700" fill="url(#lp-sky)" />
    <rect width="1440" height="700" fill="url(#lp-glow)" />
    <g fill="#e2e8f0" opacity="0.35">
      {stars.map((x, i) => (
        <circle key={x} cx={x} cy={60 + ((i * 37) % 160)} r={i % 2 ? 1.2 : 1.8} />
      ))}
    </g>
    <path d="M0 520 C 240 440, 420 470, 640 500 S 1060 560, 1440 470 L1440 700 L0 700 Z" fill="url(#lp-hill2)" opacity="0.9" />
    <path d="M0 600 C 300 540, 560 580, 820 560 S 1200 520, 1440 580 L1440 700 L0 700 Z" fill="url(#lp-hill1)" />
  </svg>
);

export default HeroBanner;
