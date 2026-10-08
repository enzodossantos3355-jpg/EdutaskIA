import React from "react";

/**
 * Renderiza o preenchimento central visual da caixa do perfil na tela de seleção
 * especificamente para as molduras Bob Esponja e Mentalista.
 * Os outros efeitos não são modificados.
 */
/**
 * Componente do Bloco de Grama Autêntico do Minecraft (16x16 pixels)
 * Preenche completamente o bloco com a textura frontal/lateral original do Minecraft:
 * topo com grama verde vibrante e raízes escorrendo, e base completa de terra com seixos.
 */
function MinecraftGrassBlock({ x = 0, y = 0, size = 26, stroke = true, className = "" }) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ shapeRendering: "crispEdges" }}
      className={className}
    >
      {/* Base de terra preenchendo 100% da área quadrada do bloco */}
      <rect x="0" y="0" width="16" height="16" fill="#866043" />
      {/* Textura e seixos de terra (tons escuros e claros) */}
      <path fill="#5a3c26" d="M9,7h1v1h-1zM3,8h1v1h-1zM13,8h1v1h-1zM7,9h1v1h-1zM3,10h1v1h-1zM12,10h1v1h-1zM6,11h1v1h-1zM10,12h1v1h-1zM15,12h1v1h-1zM3,13h1v1h-1zM7,14h1v1h-1zM13,14h1v1h-1zM1,15h1v1h-1zM6,15h1v1h-1zM10,15h1v1h-1zM15,15h1v1h-1z" />
      <path fill="#6c4d33" d="M7,3h1v1h-1zM2,4h1v1h-1zM12,4h1v1h-1zM0,5h1v1h-1zM7,5h1v1h-1zM9,5h1v1h-1zM15,5h1v1h-1zM1,6h1v1h-1zM5,6h1v1h-1zM8,6h1v1h-1zM14,6h1v1h-1zM2,7h1v1h-1zM4,7h1v1h-1zM10,7h1v1h-1zM13,7h1v1h-1zM0,8h1v1h-1zM4,8h1v1h-1zM7,8h1v1h-1zM9,8h1v1h-1zM15,8h1v1h-1zM1,9h1v1h-1zM5,9h1v1h-1zM8,9h1v1h-1zM11,9h1v1h-1zM13,9h1v1h-1zM2,10h1v1h-1zM6,10h1v1h-1zM10,10h1v1h-1zM13,10h1v1h-1zM1,11h1v1h-1zM4,11h1v1h-1zM7,11h1v1h-1zM9,11h1v1h-1zM12,11h1v1h-1zM0,12h1v1h-1zM3,12h1v1h-1zM5,12h1v1h-1zM8,12h1v1h-1zM11,12h1v1h-1zM14,12h1v1h-1zM1,13h1v1h-1zM6,13h1v1h-1zM10,13h1v1h-1zM13,13h1v1h-1zM15,13h1v1h-1zM2,14h1v1h-1zM4,14h1v1h-1zM8,14h1v1h-1zM11,14h1v1h-1zM0,15h1v1h-1zM5,15h1v1h-1zM9,15h1v1h-1zM12,15h1v1h-1zM14,15h1v1h-1z" />
      <path fill="#986f4e" d="M7,4h1v1h-1zM3,5h1v1h-1zM13,5h1v1h-1zM7,6h1v1h-1zM12,6h1v1h-1zM1,7h1v1h-1zM7,7h1v1h-1zM14,7h1v1h-1zM5,8h1v1h-1zM10,8h1v1h-1zM3,9h1v1h-1zM14,9h1v1h-1zM0,10h1v1h-1zM5,10h1v1h-1zM8,10h1v1h-1zM15,10h1v1h-1zM11,11h1v1h-1zM1,12h1v1h-1zM7,12h1v1h-1zM4,13h1v1h-1zM9,13h1v1h-1zM12,13h1v1h-1zM0,14h1v1h-1zM5,14h1v1h-1zM14,14h1v1h-1zM3,15h1v1h-1zM8,15h1v1h-1z" />
      <path fill="#ab7f5a" d="M6,7h1v1h-1zM11,8h1v1h-1zM2,9h1v1h-1zM9,10h1v1h-1zM14,11h1v1h-1zM2,12h1v1h-1zM8,13h1v1h-1z" />
      {/* Camadas de grama verde com raízes penduradas */}
      <path fill="#38591b" d="M15,2h1v1h-1zM2,3h1v1h-1zM12,3h1v1h-1zM9,4h1v1h-1zM1,5h1v1h-1zM5,5h1v1h-1zM11,5h1v1h-1zM4,6h1v1h-1zM10,6h1v1h-1z" />
      <path fill="#4c7828" d="M2,1h1v1h-1zM7,1h1v1h-1zM10,1h1v1h-1zM15,1h1v1h-1zM0,2h1v1h-1zM6,2h1v1h-1zM11,2h1v1h-1zM1,3h1v1h-1zM6,3h1v1h-1zM9,3h1v1h-1zM15,3h1v1h-1zM1,4h1v1h-1zM5,4h1v1h-1zM11,4h1v1h-1zM14,4h1v1h-1zM4,5h1v1h-1zM10,5h1v1h-1z" />
      <path fill="#5c8e32" d="M2,0h1v1h-1zM7,0h1v1h-1zM10,0h1v1h-1zM15,0h1v1h-1zM0,1h1v1h-1zM3,1h1v1h-1zM6,1h1v1h-1zM8,1h1v1h-1zM11,1h1v1h-1zM14,1h1v1h-1zM1,2h2v1h-2zM5,2h1v1h-1zM7,2h2v1h-2zM10,2h1v1h-1zM12,2h1v1h-1zM14,2h1v1h-1zM0,3h1v1h-1zM4,3h1v1h-1zM8,3h1v1h-1zM11,3h1v1h-1zM14,3h1v1h-1zM4,4h1v1h-1zM10,4h1v1h-1z" />
      <path fill="#73a83d" d="M0,0h1v1h-1zM3,0h1v1h-1zM6,0h1v1h-1zM8,0h1v1h-1zM11,0h1v1h-1zM14,0h1v1h-1zM1,1h1v1h-1zM5,1h1v1h-1zM9,1h1v1h-1zM12,1h1v1h-1zM3,2h2v1h-2zM9,2h1v1h-1zM13,2h1v1h-1zM5,3h1v1h-1zM10,3h1v1h-1z" />
      <path fill="#87c348" d="M1,0h1v1h-1zM5,0h1v1h-1zM9,0h1v1h-1zM12,0h1v1h-1zM4,1h1v1h-1zM13,1h1v1h-1z" />
      <path fill="#9bd654" d="M4,0h1v1h-1zM13,0h1v1h-1z" />
      {/* Contorno sutil do bloco cúbico */}
      {stroke && (
        <rect
          x="0"
          y="0"
          width="16"
          height="16"
          fill="none"
          stroke="#1f140a"
          strokeWidth="0.8"
          opacity="0.85"
        />
      )}
    </svg>
  );
}

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

  if (effectId === "cyberpunk") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-cyberpunk"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#180828] via-[#090a16] to-[#04060e]" />
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-85"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="neonPinkGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
            <linearGradient id="neonCyanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Perspective Cyber Grid */}
          <line x1="0" y1="180" x2="200" y2="180" stroke="#f43f5e" strokeWidth="0.8" opacity="0.4" />
          <line x1="0" y1="200" x2="200" y2="200" stroke="#f43f5e" strokeWidth="1" opacity="0.6" />
          <line x1="0" y1="225" x2="200" y2="225" stroke="#facc15" strokeWidth="1.2" opacity="0.8" />
          <line x1="100" y1="160" x2="0" y2="240" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
          <line x1="100" y1="160" x2="50" y2="240" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
          <line x1="100" y1="160" x2="150" y2="240" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
          <line x1="100" y1="160" x2="200" y2="240" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />

          {/* Cyberpunk Top Neon Header */}
          <g transform="translate(100, 20)">
            <rect x="-65" y="-10" width="130" height="18" rx="2" fill="#facc15" />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fontSize="9"
              letterSpacing="2.5"
              fill="#090a16"
            >
              NIGHT CITY // 2077
            </text>
          </g>

          {/* Cyber Circuit Glitch Elements */}
          <path d="M10,80 L35,80 L50,95 L80,95" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.7" />
          <circle cx="80" cy="95" r="2.5" fill="#facc15" />
          <path d="M190,80 L165,80 L150,95 L120,95" stroke="#f43f5e" strokeWidth="1.5" fill="none" opacity="0.7" />
          <circle cx="120" cy="95" r="2.5" fill="#06b6d4" />
        </svg>
      </div>
    );
  }

  if (effectId === "hogwarts") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-hogwarts"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1442] via-[#100d29] to-[#0a071d]" />
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-85"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Constellations / Stars */}
          <circle cx="30" cy="45" r="1.5" fill="#fbbf24" opacity="0.9" />
          <circle cx="55" cy="70" r="1.2" fill="#ffffff" opacity="0.8" />
          <circle cx="170" cy="50" r="1.5" fill="#fbbf24" opacity="0.9" />
          <circle cx="145" cy="75" r="1" fill="#ffffff" opacity="0.7" />
          <circle cx="95" cy="55" r="1.8" fill="#fbbf24" opacity="0.9" />

          {/* Castle Towers Silhouette at Bottom */}
          <g fill="#070514" opacity="0.95">
            <path d="M15,240 L15,180 L25,160 L35,180 L35,240 Z" />
            <path d="M40,240 L40,195 L50,180 L60,195 L60,240 Z" />
            <path d="M140,240 L140,195 L150,180 L160,195 L160,240 Z" />
            <path d="M165,240 L165,180 L175,160 L185,180 L185,240 Z" />
            <rect x="60" y="210" width="80" height="30" />
            <polygon points="100,165 80,195 120,195" />
          </g>

          {/* Wand Magic Sparks */}
          <g transform="translate(100, 110)">
            <path d="M-50,0 Q-20,-20 0,-15 T50,0" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.7" />
            <circle cx="-15" cy="-18" r="2" fill="#fbbf24" />
            <circle cx="20" cy="-12" r="2.5" fill="#fef08a" />
          </g>

          {/* Hogwarts Scroll Header */}
          <g transform="translate(100, 20)">
            <rect x="-70" y="-10" width="140" height="18" rx="4" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="1.2" />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontFamily="serif, ui-serif"
              fontWeight="bold"
              fontSize="8.5"
              letterSpacing="2"
              fill="#fbbf24"
            >
              ESCOLA DE MAGIA
            </text>
          </g>
        </svg>
      </div>
    );
  }

  if (effectId === "pixel_art") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-pixel-art"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#18181b] via-[#09090b] to-[#040405]" />
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-85"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pixel Coins */}
          <rect x="25" y="50" width="10" height="10" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
          <rect x="165" y="50" width="10" height="10" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />

          {/* Pixel Hearts */}
          <g transform="translate(30, 85) scale(0.8)">
            <rect x="0" y="0" width="5" height="5" fill="#ef4444" />
            <rect x="10" y="0" width="5" height="5" fill="#ef4444" />
            <rect x="-5" y="5" width="25" height="5" fill="#ef4444" />
            <rect x="0" y="10" width="15" height="5" fill="#ef4444" />
            <rect x="5" y="15" width="5" height="5" fill="#ef4444" />
          </g>
          <g transform="translate(155, 85) scale(0.8)">
            <rect x="0" y="0" width="5" height="5" fill="#ef4444" />
            <rect x="10" y="0" width="5" height="5" fill="#ef4444" />
            <rect x="-5" y="5" width="25" height="5" fill="#ef4444" />
            <rect x="0" y="10" width="15" height="5" fill="#ef4444" />
            <rect x="5" y="15" width="5" height="5" fill="#ef4444" />
          </g>

          {/* 8-bit Ground Brick Blocks */}
          <g transform="translate(0, 220)">
            <rect x="0" y="0" width="40" height="20" fill="#166534" stroke="#22c55e" strokeWidth="1.5" />
            <rect x="40" y="0" width="40" height="20" fill="#15803d" stroke="#22c55e" strokeWidth="1.5" />
            <rect x="80" y="0" width="40" height="20" fill="#166534" stroke="#22c55e" strokeWidth="1.5" />
            <rect x="120" y="0" width="40" height="20" fill="#15803d" stroke="#22c55e" strokeWidth="1.5" />
            <rect x="160" y="0" width="40" height="20" fill="#166534" stroke="#22c55e" strokeWidth="1.5" />
          </g>

          {/* Arcade Header */}
          <g transform="translate(100, 20)">
            <rect x="-60" y="-10" width="120" height="18" fill="#000000" stroke="#4ade80" strokeWidth="1.5" />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fontSize="8"
              letterSpacing="2"
              fill="#4ade80"
            >
              8-BIT ARCADE // 1UP
            </text>
          </g>
        </svg>
      </div>
    );
  }

  if (effectId === "one_piece") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-one-piece"
      >
        {/* Dark Nautical & Sunset Sea Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1708] via-[#140b04] to-[#080402]" />
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="wantedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="goldCoinGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="oceanWaveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Ship Timber Planks background lines */}
          <line x1="0" y1="45" x2="200" y2="45" stroke="#78350f" strokeWidth="0.8" opacity="0.4" />
          <line x1="0" y1="95" x2="200" y2="95" stroke="#78350f" strokeWidth="0.8" opacity="0.4" />
          <line x1="0" y1="145" x2="200" y2="145" stroke="#78350f" strokeWidth="0.8" opacity="0.4" />
          <line x1="0" y1="195" x2="200" y2="195" stroke="#78350f" strokeWidth="0.8" opacity="0.4" />

          {/* Wanted Poster Vintage Header */}
          <g transform="translate(100, 18)">
            <rect x="-65" y="-11" width="130" height="20" rx="3" fill="#78350f" stroke="#f59e0b" strokeWidth="1.2" />
            <text
              x="0"
              y="2"
              textAnchor="middle"
              fontFamily="Impact, 'Arial Black', sans-serif"
              fontWeight="900"
              fontSize="11"
              letterSpacing="3"
              fill="#fef3c7"
            >
              WANTED
            </text>
            <text
              x="0"
              y="7"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize="4.5"
              letterSpacing="1"
              fill="#fbbf24"
            >
              DEAD OR ALIVE
            </text>
          </g>

          {/* Iconic Straw Hat over the avatar area */}
          <g transform="translate(100, 36) scale(0.85)">
            {/* Straw brim */}
            <ellipse cx="0" cy="0" rx="34" ry="7" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
            {/* Straw crown */}
            <path d="M-17,-1 C-17,-14 17,-14 17,-1 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
            {/* Red pirate band */}
            <path d="M-17,-1 C-17,-6 17,-6 17,-1 L17,1 C17,1 -17,1 -17,1 Z" fill="#ef4444" />
          </g>

          {/* Ocean Waves at Bottom (Hokusai Style Pirate Sea) */}
          <g fill="url(#oceanWaveGrad)">
            <path d="M-10,210 Q25,185 60,205 T130,200 T210,210 L210,240 L-10,240 Z" />
            <path d="M-10,222 Q35,205 80,220 T160,215 T210,225 L210,240 L-10,240 Z" fill="#0369a1" fillOpacity="0.6" />
          </g>
          {/* Wave spray crests */}
          <circle cx="60" cy="205" r="2" fill="#e0f2fe" opacity="0.8" />
          <circle cx="130" cy="200" r="2.5" fill="#e0f2fe" opacity="0.8" />
          <circle cx="95" cy="208" r="1.5" fill="#e0f2fe" opacity="0.7" />

          {/* Golden Berries Coins (Left bottom) */}
          <g transform="translate(24, 216)">
            <circle cx="0" cy="0" r="8" fill="url(#goldCoinGrad)" stroke="#78350f" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="7" fill="#451a03">฿</text>
            <circle cx="9" cy="5" r="6" fill="url(#goldCoinGrad)" stroke="#78350f" strokeWidth="0.8" />
            <text x="9" y="7.5" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="5" fill="#451a03">฿</text>
          </g>

          {/* Log Pose / Compass Rose (Right bottom) */}
          <g transform="translate(176, 216) scale(0.85)">
            <circle cx="0" cy="0" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="8" fill="#0f172a" />
            {/* Compass points */}
            <polygon points="0,-7 2,-1 0,0 -2,-1" fill="#ef4444" />
            <polygon points="0,7 2,1 0,0 -2,1" fill="#f8fafc" />
            <polygon points="-7,0 -1,2 0,0 -1,-2" fill="#f59e0b" />
            <polygon points="7,0 1,2 0,0 1,-2" fill="#f59e0b" />
            <circle cx="0" cy="0" r="1.5" fill="#fbbf24" />
          </g>

          {/* Pirate Anchor Silhouette on Left side */}
          <g transform="translate(14, 85) scale(0.55)" stroke="#f59e0b" strokeWidth="1.8" fill="none" opacity="0.6">
            <circle cx="0" cy="-14" r="4" />
            <line x1="0" y1="-10" x2="0" y2="12" />
            <line x1="-8" y1="-4" x2="8" y2="-4" />
            <path d="M-12,4 C-12,16 12,16 12,4" />
            <polygon points="-12,4 -15,1 -9,1" fill="#f59e0b" />
            <polygon points="12,4 15,1 9,1" fill="#f59e0b" />
          </g>

          {/* Golden Sparkles & Berries value banner at very bottom */}
          <text
            x="100"
            y="234"
            textAnchor="middle"
            fontFamily="Impact, sans-serif"
            fontWeight="900"
            fontSize="8"
            letterSpacing="1"
            fill="#fbbf24"
          >
            ฿ 3,000,000,000-
          </text>
        </svg>
      </div>
    );
  }

  if (effectId === "chemistry_lab") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-chemistry-lab"
      >
        {/* Dark Bioluminescent Lab Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#032317] via-[#021810] to-[#010b07]" />
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flaskLiquidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id="chemGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Lab Grid Lines */}
          <line x1="0" y1="40" x2="200" y2="40" stroke="#065f46" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />
          <line x1="0" y1="200" x2="200" y2="200" stroke="#065f46" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />

          {/* Header Banner */}
          <g transform="translate(100, 18)">
            <rect x="-68" y="-10" width="136" height="18" rx="3" fill="#022c22" stroke="#10b981" strokeWidth="1.2" />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontFamily="monospace, sans-serif"
              fontWeight="900"
              fontSize="8"
              letterSpacing="2"
              fill="#6ee7b7"
            >
              LABORATÓRIO // REAÇÃO
            </text>
          </g>

          {/* Left: Erlenmeyer Flask with Bubbling Toxic Potion */}
          <g transform="translate(24, 180) scale(0.9)">
            {/* Flask Body */}
            <path d="M-4,-24 L-4,-14 L-16,14 L16,14 L4,-14 L4,-24 Z" fill="none" stroke="#6ee7b7" strokeWidth="1.5" />
            {/* Liquid inside */}
            <path d="M-13,6 L13,6 L15,13 L-15,13 Z" fill="url(#flaskLiquidGrad)" />
            {/* Bubbles rising from flask */}
            <circle cx="-3" cy="2" r="1.5" fill="#a7f3d0" />
            <circle cx="4" cy="-4" r="2" fill="#a7f3d0" />
            <circle cx="-1" cy="-12" r="2" fill="#a7f3d0" />
            <circle cx="2" cy="-22" r="2.5" fill="#34d399" />
            <circle cx="-2" cy="-32" r="3" fill="#6ee7b7" opacity="0.8" />
          </g>

          {/* Right: Test Tube Rack with Reagents */}
          <g transform="translate(176, 180) scale(0.9)">
            {/* Tube 1 (Cyan) */}
            <rect x="-10" y="-18" width="6" height="26" rx="3" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
            <rect x="-9" y="-4" width="4" height="11" rx="2" fill="#0ea5e9" opacity="0.8" />
            {/* Tube 2 (Violet / Fuchsia) */}
            <rect x="4" y="-18" width="6" height="26" rx="3" fill="none" stroke="#c084fc" strokeWidth="1.2" />
            <rect x="5" y="-8" width="4" height="15" rx="2" fill="#a855f7" opacity="0.8" />
            {/* Little fizz bubble */}
            <circle cx="-7" cy="-24" r="1.8" fill="#38bdf8" opacity="0.8" />
            <circle cx="7" cy="-26" r="2.2" fill="#c084fc" opacity="0.8" />
          </g>

          {/* Floating Benzene Rings (Hexagons) */}
          <g transform="translate(30, 75) scale(0.7)" stroke="#34d399" strokeWidth="1.2" fill="none" opacity="0.6">
            <polygon points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7" />
            <circle cx="0" cy="0" r="7" strokeDasharray="3 2" />
          </g>
          <g transform="translate(170, 75) scale(0.65)" stroke="#38bdf8" strokeWidth="1.2" fill="none" opacity="0.6">
            <polygon points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7" />
            <circle cx="0" cy="0" r="7" strokeDasharray="3 2" />
          </g>

          {/* Molecular formulas text */}
          <text x="32" y="115" fontFamily="monospace" fontSize="7" fill="#6ee7b7" opacity="0.7">H₂O + C₆H₁₂O₆</text>
          <text x="135" y="115" fontFamily="monospace" fontSize="7" fill="#38bdf8" opacity="0.7">pH = 7.4 [OK]</text>

          {/* Central Atomic Orbital Rings at Bottom Center */}
          <g transform="translate(100, 218) scale(0.75)" stroke="#10b981" strokeWidth="1" fill="none">
            <ellipse cx="0" cy="0" rx="26" ry="7" />
            <ellipse cx="0" cy="0" rx="26" ry="7" transform="rotate(60)" stroke="#06b6d4" />
            <ellipse cx="0" cy="0" rx="26" ry="7" transform="rotate(120)" stroke="#a855f7" />
            <circle cx="0" cy="0" r="3.5" fill="#34d399" />
          </g>
        </svg>
      </div>
    );
  }

  if (effectId === "japan" || effectId === "sakura") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-japan"
      >
        {/* Japanese Imperial Sunset / Twilight Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#250811] via-[#1a050d] to-[#0d0206]" />
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          viewBox="0 0 200 240"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="toriiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>

          {/* Rising Crimson Sun behind Mount Fuji */}
          <circle cx="100" cy="110" r="38" fill="url(#sunGrad)" opacity="0.85" />

          {/* Mount Fuji Silhouette with Snow Cap */}
          <g transform="translate(100, 160)">
            {/* Mountain base */}
            <polygon points="-75,60 0,-35 75,60" fill="#1e1b4b" opacity="0.9" />
            {/* Snow Cap on Peak */}
            <polygon points="-24,-5 0,-35 24,-5 12,2 0,-3 -12,2" fill="#fdf2f8" opacity="0.95" />
          </g>

          {/* Grand Vermilion Torii Gate at Top framing the avatar */}
          <g transform="translate(100, 22)">
            {/* Upper curved lintel (Kasagi) */}
            <path d="M-68,-6 Q0,-12 68,-6 L68,-2 Q0,-8 -68,-2 Z" fill="#991b1b" stroke="#f59e0b" strokeWidth="0.8" />
            {/* Second horizontal beam (Nuki) */}
            <rect x="-56" y="2" width="112" height="4" fill="#dc2626" />
            {/* Left Pillar */}
            <rect x="-42" y="2" width="6" height="52" fill="url(#toriiGrad)" rx="1" />
            {/* Right Pillar */}
            <rect x="36" y="2" width="6" height="52" fill="url(#toriiGrad)" rx="1" />
            {/* Central plaque (Gakuzuka) */}
            <rect x="-6" y="0" width="12" height="9" fill="#18181b" stroke="#f59e0b" strokeWidth="0.8" />
            <text x="0" y="7" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="5.5" fill="#f59e0b">鳥居</text>
          </g>

          {/* Hanging Traditional Lanterns (Chōchin) */}
          <g transform="translate(24, 60)">
            <line x1="0" y1="-12" x2="0" y2="0" stroke="#f59e0b" strokeWidth="1" />
            <ellipse cx="0" cy="8" rx="6" ry="9" fill="#dc2626" stroke="#f59e0b" strokeWidth="0.8" />
            <text x="0" y="11" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="#fef08a">福</text>
          </g>
          <g transform="translate(176, 60)">
            <line x1="0" y1="-12" x2="0" y2="0" stroke="#f59e0b" strokeWidth="1" />
            <ellipse cx="0" cy="8" rx="6" ry="9" fill="#dc2626" stroke="#f59e0b" strokeWidth="0.8" />
            <text x="0" y="11" textAnchor="middle" fontFamily="sans-serif" fontSize="5" fill="#fef08a">寿</text>
          </g>

          {/* Sakura Cherry Blossom Branch & Flowers (Top Right) */}
          <g transform="translate(160, 20)">
            <path d="M20,0 Q-10,12 -25,25" stroke="#78350f" strokeWidth="1.8" fill="none" />
            {/* Blossom 1 */}
            <circle cx="-10" cy="12" r="3.5" fill="#f472b6" />
            <circle cx="-10" cy="12" r="1.5" fill="#fdf2f8" />
            {/* Blossom 2 */}
            <circle cx="-25" cy="25" r="4" fill="#fb7185" />
            <circle cx="-25" cy="25" r="1.5" fill="#fdf2f8" />
          </g>

          {/* Sakura Cherry Blossom Branch & Flowers (Top Left) */}
          <g transform="translate(40, 20)">
            <path d="M-20,0 Q10,12 25,25" stroke="#78350f" strokeWidth="1.8" fill="none" />
            <circle cx="10" cy="12" r="3.5" fill="#f472b6" />
            <circle cx="10" cy="12" r="1.5" fill="#fdf2f8" />
            <circle cx="25" cy="25" r="4" fill="#fb7185" />
            <circle cx="25" cy="25" r="1.5" fill="#fdf2f8" />
          </g>

          {/* Falling Sakura Petals Fluttering */}
          <g fill="#f472b6" opacity="0.85">
            <ellipse cx="45" cy="110" rx="3" ry="1.5" transform="rotate(35 45 110)" />
            <ellipse cx="60" cy="150" rx="3.5" ry="1.8" transform="rotate(-20 60 150)" />
            <ellipse cx="155" cy="120" rx="3" ry="1.5" transform="rotate(45 155 120)" />
            <ellipse cx="140" cy="170" rx="3.5" ry="1.8" transform="rotate(-40 140 170)" />
            <ellipse cx="85" cy="195" rx="3" ry="1.5" transform="rotate(15 85 195)" />
            <ellipse cx="115" cy="215" rx="3" ry="1.5" transform="rotate(-30 115 215)" />
          </g>

          {/* Traditional Wave pattern at bottom */}
          <g transform="translate(100, 230)">
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="7.5"
              letterSpacing="2.5"
              fill="#fb7185"
            >
              桜 // 日本の美
            </text>
          </g>
        </svg>
      </div>
    );
  }

  if (effectId === "minecraft") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-minecraft"
      >
        {/* Único Bloco de Grama do Minecraft preenchendo completamente o card (16x16 pixels autênticos) */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 16 16"
          preserveAspectRatio="none"
          style={{ shapeRendering: "crispEdges" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base de terra preenchendo 100% da área do card */}
          <rect x="0" y="0" width="16" height="16" fill="#866043" />

          {/* Textura e seixos de terra (tons escuros e claros da terra do Minecraft) */}
          <path fill="#5a3c26" d="M9,7h1v1h-1zM3,8h1v1h-1zM13,8h1v1h-1zM7,9h1v1h-1zM3,10h1v1h-1zM12,10h1v1h-1zM6,11h1v1h-1zM10,12h1v1h-1zM15,12h1v1h-1zM3,13h1v1h-1zM7,14h1v1h-1zM13,14h1v1h-1zM1,15h1v1h-1zM6,15h1v1h-1zM10,15h1v1h-1zM15,15h1v1h-1z" />
          <path fill="#6c4d33" d="M7,3h1v1h-1zM2,4h1v1h-1zM12,4h1v1h-1zM0,5h1v1h-1zM7,5h1v1h-1zM9,5h1v1h-1zM15,5h1v1h-1zM1,6h1v1h-1zM5,6h1v1h-1zM8,6h1v1h-1zM14,6h1v1h-1zM2,7h1v1h-1zM4,7h1v1h-1zM10,7h1v1h-1zM13,7h1v1h-1zM0,8h1v1h-1zM4,8h1v1h-1zM7,8h1v1h-1zM9,8h1v1h-1zM15,8h1v1h-1zM1,9h1v1h-1zM5,9h1v1h-1zM8,9h1v1h-1zM11,9h1v1h-1zM13,9h1v1h-1zM2,10h1v1h-1zM6,10h1v1h-1zM10,10h1v1h-1zM13,10h1v1h-1zM1,11h1v1h-1zM4,11h1v1h-1zM7,11h1v1h-1zM9,11h1v1h-1zM12,11h1v1h-1zM0,12h1v1h-1zM3,12h1v1h-1zM5,12h1v1h-1zM8,12h1v1h-1zM11,12h1v1h-1zM14,12h1v1h-1zM1,13h1v1h-1zM6,13h1v1h-1zM10,13h1v1h-1zM13,13h1v1h-1zM15,13h1v1h-1zM2,14h1v1h-1zM4,14h1v1h-1zM8,14h1v1h-1zM11,14h1v1h-1zM0,15h1v1h-1zM5,15h1v1h-1zM9,15h1v1h-1zM12,15h1v1h-1zM14,15h1v1h-1z" />
          <path fill="#986f4e" d="M7,4h1v1h-1zM3,5h1v1h-1zM13,5h1v1h-1zM7,6h1v1h-1zM12,6h1v1h-1zM1,7h1v1h-1zM7,7h1v1h-1zM14,7h1v1h-1zM5,8h1v1h-1zM10,8h1v1h-1zM3,9h1v1h-1zM14,9h1v1h-1zM0,10h1v1h-1zM5,10h1v1h-1zM8,10h1v1h-1zM15,10h1v1h-1zM11,11h1v1h-1zM1,12h1v1h-1zM7,12h1v1h-1zM4,13h1v1h-1zM9,13h1v1h-1zM12,13h1v1h-1zM0,14h1v1h-1zM5,14h1v1h-1zM14,14h1v1h-1zM3,15h1v1h-1zM8,15h1v1h-1z" />
          <path fill="#ab7f5a" d="M6,7h1v1h-1zM11,8h1v1h-1zM2,9h1v1h-1zM9,10h1v1h-1zM14,11h1v1h-1zM2,12h1v1h-1zM8,13h1v1h-1z" />

          {/* Camadas de grama verde com raízes escorrendo na terra (textura clássica 16x16) */}
          <path fill="#38591b" d="M15,2h1v1h-1zM2,3h1v1h-1zM12,3h1v1h-1zM9,4h1v1h-1zM1,5h1v1h-1zM5,5h1v1h-1zM11,5h1v1h-1zM4,6h1v1h-1zM10,6h1v1h-1z" />
          <path fill="#4c7828" d="M2,1h1v1h-1zM7,1h1v1h-1zM10,1h1v1h-1zM15,1h1v1h-1zM0,2h1v1h-1zM6,2h1v1h-1zM11,2h1v1h-1zM1,3h1v1h-1zM6,3h1v1h-1zM9,3h1v1h-1zM15,3h1v1h-1zM1,4h1v1h-1zM5,4h1v1h-1zM11,4h1v1h-1zM14,4h1v1h-1zM4,5h1v1h-1zM10,5h1v1h-1z" />
          <path fill="#5c8e32" d="M2,0h1v1h-1zM7,0h1v1h-1zM10,0h1v1h-1zM15,0h1v1h-1zM0,1h1v1h-1zM3,1h1v1h-1zM6,1h1v1h-1zM8,1h1v1h-1zM11,1h1v1h-1zM14,1h1v1h-1zM1,2h2v1h-2zM5,2h1v1h-1zM7,2h2v1h-2zM10,2h1v1h-1zM12,2h1v1h-1zM14,2h1v1h-1zM0,3h1v1h-1zM4,3h1v1h-1zM8,3h1v1h-1zM11,3h1v1h-1zM14,3h1v1h-1zM4,4h1v1h-1zM10,4h1v1h-1z" />
          <path fill="#73a83d" d="M0,0h1v1h-1zM3,0h1v1h-1zM6,0h1v1h-1zM8,0h1v1h-1zM11,0h1v1h-1zM14,0h1v1h-1zM1,1h1v1h-1zM5,1h1v1h-1zM9,1h1v1h-1zM12,1h1v1h-1zM3,2h2v1h-2zM9,2h1v1h-1zM13,2h1v1h-1zM5,3h1v1h-1zM10,3h1v1h-1z" />
          <path fill="#87c348" d="M1,0h1v1h-1zM5,0h1v1h-1zM9,0h1v1h-1zM12,0h1v1h-1zM4,1h1v1h-1zM13,1h1v1h-1z" />
          <path fill="#9bd654" d="M4,0h1v1h-1zM13,0h1v1h-1z" />
        </svg>
      </div>
    );
  }

  return null;
}
