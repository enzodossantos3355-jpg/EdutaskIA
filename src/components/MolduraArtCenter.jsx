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

  if (effectId === "stranger_things") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-stranger-things"
      >
        {/* Upside Down Dark Atmospheric Background with Cosmic Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f19] via-[#111827] to-[#1f0909]" />

        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="stRedGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.8" />
            </linearGradient>
            <radialGradient id="stRift" cx="50%" cy="85%" r="60%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#7f1d1d" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Glowing Red Rift Background Glow */}
          <rect x="0" y="100" width="200" height="140" fill="url(#stRift)" />

          {/* Full Moon in Hawkins Sky */}
          <circle cx="150" cy="38" r="16" fill="url(#moonGlow)" />
          <circle cx="150" cy="38" r="9" fill="#f8fafc" opacity="0.85" />

          {/* Cosmic Night Sky Stars */}
          <circle cx="25" cy="22" r="1.2" fill="#ffffff" opacity="0.8" />
          <circle cx="65" cy="18" r="1" fill="#ffffff" opacity="0.7" />
          <circle cx="110" cy="30" r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx="185" cy="25" r="1" fill="#ffffff" opacity="0.8" />
          <circle cx="35" cy="45" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="80" cy="48" r="1.2" fill="#ffffff" opacity="0.75" />
          <circle cx="125" cy="65" r="0.8" fill="#ffffff" opacity="0.5" />
          <circle cx="180" cy="80" r="1.1" fill="#ffffff" opacity="0.6" />

          {/* Joyce's Iconic Christmas Alphabet String Lights */}
          <path d="M5,16 Q50,32 100,18 T195,16" stroke="#374151" strokeWidth="1.2" fill="none" opacity="0.8" />
          {/* Bulb 1 - Red */}
          <circle cx="25" cy="22" r="3.2" fill="#ef4444" filter="drop-shadow(0 0 4px #ef4444)" />
          {/* Bulb 2 - Blue */}
          <circle cx="55" cy="24" r="3.2" fill="#38bdf8" filter="drop-shadow(0 0 4px #38bdf8)" />
          {/* Bulb 3 - Yellow */}
          <circle cx="85" cy="22" r="3.2" fill="#facc15" filter="drop-shadow(0 0 4px #facc15)" />
          {/* Bulb 4 - Green */}
          <circle cx="115" cy="18" r="3.2" fill="#22c55e" filter="drop-shadow(0 0 4px #22c55e)" />
          {/* Bulb 5 - Purple */}
          <circle cx="145" cy="19" r="3.2" fill="#c084fc" filter="drop-shadow(0 0 4px #c084fc)" />
          {/* Bulb 6 - Orange */}
          <circle cx="175" cy="17" r="3.2" fill="#fb923c" filter="drop-shadow(0 0 4px #fb923c)" />

          {/* Hawkins Woods Silhouettes */}
          <path
            d="M0,175 L15,160 L25,172 L40,155 L55,170 L70,158 L90,174 L110,152 L125,168 L145,150 L160,166 L180,154 L200,165 L200,240 L0,240 Z"
            fill="#030712"
            opacity="0.9"
          />

          {/* Retro Netflix Title Header Badge */}
          <g transform="translate(100, 48)">
            <rect x="-86" y="-12" width="172" height="24" rx="4" fill="#000000" fillOpacity="0.85" stroke="#dc2626" strokeWidth="1.5" />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fontFamily="Georgia, serif, ui-serif"
              fontWeight="900"
              fontSize="10"
              letterSpacing="2.8"
              fill="#ef4444"
            >
              STRANGER THINGS
            </text>
          </g>

          {/* Bicycle Silhouettes with Glowing Headlights */}
          <g transform="translate(50, 195) scale(0.65)" opacity="0.95">
            {/* Bike 1 */}
            <circle cx="0" cy="10" r="10" stroke="#475569" strokeWidth="2" fill="none" />
            <circle cx="28" cy="10" r="10" stroke="#475569" strokeWidth="2" fill="none" />
            <path d="M0,10 L14,0 L28,10 L14,10 Z M14,0 L14,-10 L10,-12" stroke="#64748b" strokeWidth="2.5" fill="none" />
            {/* Kid silhouette */}
            <circle cx="12" cy="-18" r="4.5" fill="#020617" />
            <path d="M12,-13 L14,-2 L6,8 M12,-8 L20,-1" stroke="#020617" strokeWidth="3" strokeLinecap="round" />
            {/* Headlight beam */}
            <path d="M22,-7 L70,-15 L70,8 Z" fill="#fef08a" opacity="0.35" />
          </g>

          <g transform="translate(105, 198) scale(0.65)" opacity="0.95">
            {/* Bike 2 */}
            <circle cx="0" cy="10" r="10" stroke="#475569" strokeWidth="2" fill="none" />
            <circle cx="28" cy="10" r="10" stroke="#475569" strokeWidth="2" fill="none" />
            <path d="M0,10 L14,0 L28,10 L14,10 Z M14,0 L14,-10 L10,-12" stroke="#64748b" strokeWidth="2.5" fill="none" />
            {/* Kid silhouette */}
            <circle cx="12" cy="-18" r="4.5" fill="#020617" />
            <path d="M12,-13 L14,-2 L6,8 M12,-8 L20,-1" stroke="#020617" strokeWidth="3" strokeLinecap="round" />
            {/* Headlight beam */}
            <path d="M22,-7 L70,-15 L70,8 Z" fill="#fef08a" opacity="0.4" />
          </g>

          {/* Floating Upside Down Spores / Particles */}
          <circle cx="30" cy="120" r="1.5" fill="#fca5a5" opacity="0.6" />
          <circle cx="75" cy="135" r="2" fill="#fca5a5" opacity="0.75" />
          <circle cx="165" cy="115" r="1.8" fill="#fca5a5" opacity="0.7" />
          <circle cx="140" cy="145" r="1.2" fill="#fca5a5" opacity="0.5" />
          <circle cx="95" cy="105" r="1.5" fill="#fca5a5" opacity="0.65" />
        </svg>

        {/* Bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  if (effectId === "riverdale") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-riverdale"
      >
        {/* Riverdale Atmospheric Varsity Navy & Emerald Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#091326] via-[#172554] to-[#064e3b]" />

        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id="serpentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <radialGradient id="popsNeon" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sweetwater River mist wave lines */}
          <path d="M-20,195 Q50,175 110,190 T220,180 L220,240 L-20,240 Z" fill="#0f172a" opacity="0.7" />
          <path d="M-20,210 Q60,195 130,205 T220,195 L220,240 L-20,240 Z" fill="#064e3b" opacity="0.5" />

          {/* Pop's Chock'lit Shoppe Neon Diner Sign */}
          <g transform="translate(100, 26)">
            {/* Outer Diner Sign Plaque */}
            <rect x="-85" y="-14" width="170" height="28" rx="6" fill="#0f172a" stroke="#fb7185" strokeWidth="1.8" />
            {/* Pop's Neon Script Header */}
            <text
              x="0"
              y="-1"
              textAnchor="middle"
              fontFamily="Impact, fantasy, sans-serif"
              fontWeight="900"
              fontSize="12"
              letterSpacing="2"
              fill="#ffe4e6"
              filter="drop-shadow(0 0 5px #f43f5e)"
            >
              POP'S CHOCK'LIT SHOPPE
            </text>
            <text
              x="0"
              y="9"
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="800"
              fontSize="6.5"
              letterSpacing="2"
              fill="#facc15"
            >
              24 HOURS • RIVERDALE
            </text>
          </g>

          {/* Iconic Varsity Letterman Patch "R" in the Center */}
          <g transform="translate(100, 115)">
            {/* Varsity Shield Background */}
            <path
              d="M-42,-45 L42,-45 C42,-45 44,10 0,46 C-44,10 -42,-45 -42,-45 Z"
              fill="#1e3a8a"
              stroke="#f59e0b"
              strokeWidth="2.5"
              opacity="0.9"
            />
            {/* Inner Shield Accent */}
            <path
              d="M-36,-40 L36,-40 C36,-40 38,7 0,38 C-38,7 -36,-40 -36,-40 Z"
              fill="#0f2942"
              opacity="0.85"
            />
            {/* Collegiate Letter "R" */}
            <path
              d="M-18,-30 L5,-30 C16,-30 22,-24 22,-15 C22,-7 17,-2 8,-1 L22,25 L8,25 L-4,2 L-10,2 L-10,25 L-18,25 Z M-10,-22 L-10,-5 L4,-5 C10,-5 14,-7 14,-14 C14,-20 10,-22 4,-22 Z"
              fill="url(#goldGrad)"
              stroke="#ffffff"
              strokeWidth="1.2"
              filter="drop-shadow(0 0 4px rgba(250,204,21,0.7))"
            />
          </g>

          {/* Southside Serpents Coiled Snake Insignia on Bottom Right */}
          <g transform="translate(160, 185) scale(0.65)" opacity="0.9">
            <path
              d="M0,0 C-10,-15 -25,-5 -20,10 C-15,25 5,20 10,35 C15,50 -5,55 -15,48"
              stroke="url(#serpentGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              filter="drop-shadow(0 0 3px #10b981)"
            />
            {/* Snake head */}
            <ellipse cx="-16" cy="46" rx="5" ry="3.5" fill="#059669" />
            <circle cx="-18" cy="45" r="1.2" fill="#facc15" />
            {/* Snake tongue */}
            <path d="M-21,46 L-26,45 M-21,46 L-26,47" stroke="#ef4444" strokeWidth="1" fill="none" />
          </g>

          {/* Riverdale Bulldogs Banner at Bottom */}
          <g transform="translate(100, 222)">
            <rect x="-70" y="-10" width="140" height="18" rx="4" fill="#091326" stroke="#f59e0b" strokeWidth="1.5" />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="900"
              fontSize="8"
              letterSpacing="2"
              fill="#fbbf24"
            >
              BULLDOGS & SERPENTS
            </text>
          </g>
        </svg>

        {/* Bottom subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return null;
}
