import React from "react";
import { isFramesDisabled } from "@/lib/effects";

/**
 * Renderiza o preenchimento central visual da caixa do perfil na tela de seleção
 * especificamente para as molduras Bob Esponja e Mentalista.
 * Os outros efeitos não são modificados.
 */
export default function MolduraArtCenter({ effectId }) {
  if (!effectId || isFramesDisabled()) return null;

      if (effectId === "spongebob") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-spongebob"
      >
        <img
          src="/assets/aistudio/image_2a9500fc.png"
          alt="Bob Esponja Moldura Oficial"
          className="absolute inset-0 w-full h-full object-cover scale-[1.28] origin-[46%_48%] rounded-[14px]"
          draggable={false}
        />
      </div>
    );
  }

  if (effectId === "mentalist") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-mentalist"
      >
        <img
          src="/assets/aistudio/image_1e34085b.png"
          alt="O Mentalista Moldura Oficial"
          className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
          draggable={false}
        />
      </div>
    );
  }

  if (effectId === "stranger_things") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-stranger-things"
      >
        <img
          src="/assets/aistudio/image_ee0012db.png"
          alt="Stranger Things Moldura Oficial"
          className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
          draggable={false}
        />
      </div>
    );
  }

  if (effectId === "minecraft") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-minecraft"
      >
        <img
          src="/assets/aistudio/image_355bf36a.png"
          alt="Minecraft Moldura Oficial"
          className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
          draggable={false}
        />
      </div>
    );
  }

  if (effectId === "riverdale") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-riverdale"
      >
        <img
          src="/assets/aistudio/image_db92fb6a.png"
          alt="Riverdale Moldura Oficial"
          className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
          draggable={false}
        />
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

  if (effectId === "valorant") {
    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[14px] pointer-events-none transition-all duration-300"
        data-testid="art-valorant"
      >
        {/* Full Tactical Valorant Card Artwork */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 200 280"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Tactical dot grid pattern */}
            <pattern id="valDotGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="#ff4655" opacity="0.25" />
            </pattern>
            {/* Valorant Crimson Gradient */}
            <linearGradient id="valCrimson" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff4655" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b31928" stopOpacity="0.4" />
            </linearGradient>
            {/* Radiant Cyan Glow */}
            <linearGradient id="valRadiant" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ff4655" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Deep Carbon Base Background */}
          <rect width="200" height="280" fill="#0f1923" />
          <rect width="200" height="280" fill="url(#valDotGrid)" />

          {/* Valorant Geometric "V" Emblem in Center/Background */}
          <g transform="translate(100, 110) scale(0.65)" opacity="0.18">
            <polygon points="0,65 -55,-35 -30,-35 0,25 30,-35 55,-35" fill="#ff4655" />
            <polygon points="0,45 -35,-20 -20,-20 0,15 20,-20 35,-20" fill="#ece8e1" />
          </g>

          {/* Tactical Target Reticle behind Avatar (Center around x:100, y:52) */}
          <g transform="translate(100, 52)" stroke="#ff4655" strokeWidth="1" fill="none" opacity="0.5">
            <circle cx="0" cy="0" r="42" strokeDasharray="6 4" opacity="0.7" />
            <circle cx="0" cy="0" r="46" stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="3 8" opacity="0.8" />
            {/* Crosshair ticks */}
            <line x1="-50" y1="0" x2="-44" y2="0" strokeWidth="2" />
            <line x1="44" y1="0" x2="50" y2="0" strokeWidth="2" />
            <line x1="0" y1="-50" x2="0" y2="-44" strokeWidth="2" />
            <line x1="0" y1="44" x2="0" y2="50" strokeWidth="2" />
            {/* 45 degree tactical ticks */}
            <line x1="-33" y1="-33" x2="-29" y2="-29" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="33" y1="-33" x2="29" y2="-29" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="-33" y1="33" x2="-29" y2="29" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="33" y1="33" x2="29" y2="29" stroke="#00f0ff" strokeWidth="1.5" />
          </g>

          {/* Top Tactical Text HUD */}
          <text x="12" y="16" fill="#ece8e1" fontSize="7" fontFamily="monospace" fontWeight="900" letterSpacing="1.5" opacity="0.75">
            // VALORANT PROTOCOL
          </text>
          <text x="12" y="24" fill="#ff4655" fontSize="6" fontFamily="monospace" fontWeight="900" letterSpacing="1" opacity="0.8">
            RADIANITE // 01
          </text>

          {/* Tactical Corner Crosshairs "+" */}
          <g stroke="#ff4655" strokeWidth="1.5" opacity="0.7">
            {/* Top-left */}
            <line x1="8" y1="32" x2="16" y2="32" />
            <line x1="12" y1="28" x2="12" y2="36" />
            {/* Bottom-right */}
            <line x1="184" y1="248" x2="192" y2="248" />
            <line x1="188" y1="244" x2="188" y2="252" />
          </g>

          {/* Bottom Tactical Status Stripe */}
          <g transform="translate(10, 240)">
            <rect x="0" y="0" width="180" height="2" fill="url(#valRadiant)" />
            <text x="4" y="14" fill="#ece8e1" fontSize="7" fontFamily="monospace" fontWeight="900" letterSpacing="1" opacity="0.75">
              SYSTEM // READY
            </text>
            <text x="176" y="14" textAnchor="end" fill="#00f0ff" fontSize="7" fontFamily="monospace" fontWeight="900" letterSpacing="1" opacity="0.85">
              RADIANT
            </text>
          </g>
        </svg>
      </div>
    );
  }

  return null;
}
