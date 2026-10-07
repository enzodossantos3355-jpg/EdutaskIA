import React from "react";

/**
 * Renderiza o preenchimento central visual da caixa do perfil na tela de seleção
 * especificamente para as molduras Bob Esponja e Mentalista.
 * Os outros efeitos não são modificados.
 */
export default function MolduraArtCenter({ effectId }) {
  if (!effectId) return null;

  if (effectId === "spongebob") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-spongebob"
      >
        {/* Tropical undersea gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#38bdf8]/40 via-[#fde047]/30 to-[#facc15]/50" />

        {/* Bikini Bottom elements illustration */}
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-85"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#fde047" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="bubbleGlow" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </radialGradient>
          </defs>

          {/* Undersea hill background */}
          <path d="M-20,180 Q40,140 100,165 T220,150 L220,260 L-20,260 Z" fill="#38bdf8" fillOpacity="0.35" />
          <path d="M-10,195 Q60,170 120,185 T210,175 L210,260 L-10,260 Z" fill="#0284c7" fillOpacity="0.25" />

          {/* SpongeBob & Patrick Tiki Flowers */}
          {/* Flower 1 (Pink) */}
          <g transform="translate(25, 30) scale(0.65)" opacity="0.85">
            <circle cx="0" cy="-14" r="8" fill="#f472b6" />
            <circle cx="14" cy="-5" r="8" fill="#f472b6" />
            <circle cx="9" cy="12" r="8" fill="#f472b6" />
            <circle cx="-9" cy="12" r="8" fill="#f472b6" />
            <circle cx="-14" cy="-5" r="8" fill="#f472b6" />
            <circle cx="0" cy="0" r="6" fill="#fde047" />
          </g>

          {/* Flower 2 (Purple) */}
          <g transform="translate(175, 45) scale(0.55)" opacity="0.8">
            <circle cx="0" cy="-14" r="8" fill="#c084fc" />
            <circle cx="14" cy="-5" r="8" fill="#c084fc" />
            <circle cx="9" cy="12" r="8" fill="#c084fc" />
            <circle cx="-9" cy="12" r="8" fill="#c084fc" />
            <circle cx="-14" cy="-5" r="8" fill="#c084fc" />
            <circle cx="0" cy="0" r="6" fill="#fde047" />
          </g>

          {/* Floating Jellyfish (Pink jellyfish) */}
          <g transform="translate(160, 95) scale(0.55)" opacity="0.75">
            <path d="M-18,0 C-18,-16 18,-16 18,0 C12,4 6,2 0,4 C-6,2 -12,4 -18,0 Z" fill="#f472b6" fillOpacity="0.8" />
            <path d="M-10,2 Q-12,14 -9,22" stroke="#db2777" strokeWidth="2" fill="none" />
            <path d="M-4,4 Q-2,16 -5,24" stroke="#db2777" strokeWidth="2" fill="none" />
            <path d="M4,4 Q2,16 5,24" stroke="#db2777" strokeWidth="2" fill="none" />
            <path d="M10,2 Q12,14 9,22" stroke="#db2777" strokeWidth="2" fill="none" />
            <circle cx="-6" cy="-4" r="2" fill="#9d174d" />
            <circle cx="6" cy="-4" r="2" fill="#9d174d" />
          </g>

          {/* Undersea Bubbles */}
          <circle cx="35" cy="110" r="7" fill="url(#bubbleGlow)" />
          <circle cx="45" cy="85" r="4" fill="url(#bubbleGlow)" />
          <circle cx="150" cy="160" r="9" fill="url(#bubbleGlow)" />
          <circle cx="165" cy="135" r="5" fill="url(#bubbleGlow)" />
          <circle cx="28" cy="170" r="6" fill="url(#bubbleGlow)" />

          {/* Sponge texture pores */}
          <ellipse cx="20" cy="210" rx="8" ry="5" fill="#ca8a04" fillOpacity="0.3" />
          <ellipse cx="180" cy="205" rx="7" ry="4" fill="#ca8a04" fillOpacity="0.3" />
          <ellipse cx="170" cy="225" rx="5" ry="3" fill="#ca8a04" fillOpacity="0.25" />
        </svg>

        {/* Soft vignette for avatar readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-200/90 via-transparent to-amber-100/40 pointer-events-none" />
      </div>
    );
  }

  if (effectId === "mentalist") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-mentalist"
      >
        {/* The Mentalist signature crimson & cream background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fef3c7] via-[#fef2f2] to-[#fee2e2]" />

        {/* The Mentalist Graphic Artwork */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="redBars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="darkRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#450a0a" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* The Mentalist bold red background columns */}
          <rect x="15" y="40" width="36" height="180" fill="url(#redBars)" opacity="0.88" />
          <rect x="58" y="50" width="84" height="170" fill="url(#redBars)" opacity="0.92" />
          <rect x="149" y="40" width="36" height="180" fill="url(#redBars)" opacity="0.88" />

          {/* Patrick Jane profile silhouette shadow in left column */}
          <path
            d="M32,150 C30,135 38,125 45,120 C42,128 44,136 48,142 C45,146 42,152 40,165 C37,175 42,190 44,200 L18,200 L18,170 C24,165 30,160 32,150 Z"
            fill="#450a0a"
            opacity="0.65"
          />

          {/* The Mentalist Box header */}
          <g transform="translate(100, 22)">
            {/* White/cream card label background */}
            <rect x="-85" y="-14" width="170" height="26" rx="4" fill="#ffffff" fillOpacity="0.95" stroke="#991b1b" strokeWidth="1.5" />
            <text
              x="0"
              y="2"
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="900"
              fontSize="10"
              letterSpacing="2.5"
              fill="#991b1b"
            >
              THE MENTALIST
            </text>
          </g>

          {/* Red John subtle iconic smile symbol in background */}
          <g transform="translate(100, 115) scale(0.75)" opacity="0.35">
            <circle cx="0" cy="0" r="32" stroke="#b91c1c" strokeWidth="3.5" fill="none" strokeDasharray="180 20" />
            <circle cx="-11" cy="-6" r="3" fill="#b91c1c" />
            <circle cx="11" cy="-6" r="3" fill="#b91c1c" />
            <path d="M-16,10 Q0,26 16,10" stroke="#b91c1c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>

        {/* Bottom subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/80 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return null;
}
