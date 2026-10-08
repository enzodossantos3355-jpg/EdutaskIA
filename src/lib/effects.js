/**
 * Catálogo e utilitários de Molduras de Avatar do Edutask.
 * Cada moldura envolve e transforma a moldura inteira do bloco do perfil na seleção e o avatar.
 */

export const DEFAULT_EFFECTS = {
  none: {
    id: "none",
    name: "Sem Moldura",
    emoji: "⚪",
    description: "Visual clássico limpo sem efeitos no bloco do perfil.",
    cost: 0,
    rarity: "common",
    avatarEffect: "",
    cardClass: "bg-white text-neutral-900 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-50/50",
    badgeClass: "bg-sky-200 text-sky-950 border-black",
    avatarBg: "bg-sky-300",
    avatarBgHex: "#7dd3fc",
    avatarTextColor: "#0369a1",
  },
  stranger_things: {
    id: "stranger_things",
    name: "Moldura Stranger Things",
    emoji: "🧇",
    description: "Moldura épica do Mundo Invertido de Hawkins com logotipo retrô vermelho neon, céu estrelado cósmico, luzes de natal da Joyce e faróis!",
    cost: 200,
    rarity: "rare",
    avatarEffect: "fx-stranger-things",
    cardClass: "card-moldura-stranger-things border-2 text-black",
    badgeClass: "bg-red-950 text-red-200 border-red-500 font-black",
    avatarBg: "bg-neutral-900",
    avatarBgHex: "#111827",
    avatarTextColor: "#ef4444",
  },
  riverdale: {
    id: "riverdale",
    name: "Moldura Riverdale",
    emoji: "🐍",
    description: "Moldura inspirada no mistério de Riverdale com azul e ouro dos Bulldogs, verde das Serpentes do Sul e o clássico Pop's Chock'lit Shoppe!",
    cost: 180,
    rarity: "rare",
    avatarEffect: "fx-riverdale",
    cardClass: "card-moldura-riverdale border-2 text-black",
    badgeClass: "bg-amber-400 text-blue-950 border-blue-900 font-black",
    avatarBg: "bg-blue-900",
    avatarBgHex: "#1e3a8a",
    avatarTextColor: "#fbbf24",
  },
  spongebob: {
    id: "spongebob",
    name: "Moldura Bob Esponja",
    emoji: "🍍",
    description: "Moldura alegre da Fenda do Biquíni com arte tropical submarina central, bolhas marinhas e aura dourada!",
    cost: 120,
    rarity: "rare",
    avatarEffect: "fx-spongebob",
    cardClass: "card-moldura-spongebob text-black border-2",
    badgeClass: "bg-amber-400 text-yellow-950 border-yellow-800 font-black",
    avatarBg: "bg-yellow-200",
    avatarBgHex: "#fef08a",
    avatarTextColor: "#854d0e",
  },
  mentalist: {
    id: "mentalist",
    name: "Moldura O Mentalista",
    emoji: "🔍",
    description: "Moldura inspirada na série O Mentalista com arte central vermelha e bege, mistério analítico e Patrick Jane.",
    cost: 160,
    rarity: "rare",
    avatarEffect: "fx-mentalist",
    cardClass: "card-moldura-mentalist border-2 text-black",
    badgeClass: "bg-red-700 text-amber-100 border-red-950 font-black",
    avatarBg: "bg-amber-100",
    avatarBgHex: "#fef3c7",
    avatarTextColor: "#991b1b",
  },
  one_piece: {
    id: "one_piece",
    name: "Moldura One Piece",
    emoji: "🏴‍☠️",
    description: "Moldura épica do Rei dos Piratas com cartaz Wanted, bússola náutica, ondas do Grand Line e moedas de ouro de tesouro!",
    cost: 280,
    rarity: "epic",
    avatarEffect: "fx-one-piece",
    cardClass: "card-moldura-one-piece border-2 text-black",
    badgeClass: "bg-amber-400 text-amber-950 border-amber-950 font-black",
    avatarBg: "bg-amber-950",
    avatarBgHex: "#451a03",
    avatarTextColor: "#fde68a",
    dashboardBannerClass: "bg-amber-200 border-2 border-black text-black shadow-[4px_4px_0_0_#000]",
  },
  chemistry_lab: {
    id: "chemistry_lab",
    name: "Moldura Laboratório Químico",
    emoji: "🧪",
    description: "Moldura científica de química com frascos erlenmeyer borbulhantes, neon esmeralda bioluminescente, fitas moleculares e reações atômicas!",
    cost: 240,
    rarity: "rare",
    avatarEffect: "fx-chemistry-lab",
    cardClass: "card-moldura-chemistry border-2 text-black",
    badgeClass: "bg-emerald-400 text-emerald-950 border-emerald-950 font-black",
    avatarBg: "bg-emerald-950",
    avatarBgHex: "#022c22",
    avatarTextColor: "#6ee7b7",
    dashboardBannerClass: "bg-emerald-200 border-2 border-black text-black shadow-[4px_4px_0_0_#000]",
  },
  japan: {
    id: "japan",
    name: "Moldura Japão Tradicional",
    emoji: "⛩️",
    description: "Moldura zen do Japão imperial com o majestoso Monte Fuji, portal Torii carmesim, galhos e pétalas de sakura e lanternas orientais!",
    cost: 300,
    rarity: "epic",
    avatarEffect: "fx-japan",
    cardClass: "card-moldura-japan border-2 text-black",
    badgeClass: "bg-red-600 text-rose-50 border-red-950 font-black",
    avatarBg: "bg-red-950",
    avatarBgHex: "#450a0a",
    avatarTextColor: "#fecdd3",
    dashboardBannerClass: "bg-rose-200 border-2 border-black text-black shadow-[4px_4px_0_0_#000]",
  },
  minecraft: {
    id: "minecraft",
    name: "Moldura Minecraft",
    emoji: "🟩",
    description: "Autêntico bloco de grama do Minecraft preenchendo completamente o perfil com textura 16x16 pixel-art clássica de grama e terra.",
    cost: 320,
    rarity: "epic",
    avatarEffect: "fx-minecraft",
    cardClass: "card-moldura-minecraft border-2 text-black",
    badgeClass: "bg-emerald-600 text-white border-emerald-950 font-black",
    avatarBg: "bg-emerald-900",
    avatarBgHex: "#38591b",
    avatarTextColor: "#86efac",
    dashboardBannerClass: "bg-lime-200 border-2 border-black text-black shadow-[4px_4px_0_0_#000]",
  },
  neon_pulse: {
    id: "neon_pulse",
    name: "Moldura Neon Pulse",
    emoji: "💠",
    description: "Halo azul pulsante futurista que envolve todo o bloco do perfil.",
    cost: 50,
    rarity: "common",
    avatarEffect: "fx-neon-pulse",
    cardClass: "card-moldura-neon border-2",
    badgeClass: "bg-cyan-950 text-cyan-300 border-cyan-400 font-bold",
    avatarBg: "bg-cyan-950",
    avatarBgHex: "#082f49",
    avatarTextColor: "#22d3ee",
  },
  sunset: {
    id: "sunset",
    name: "Moldura Pôr do Sol",
    emoji: "🌅",
    description: "Borda giratória em degradê laranja e rosa quente com brilho solar envolvente.",
    cost: 80,
    rarity: "common",
    avatarEffect: "fx-sunset",
    cardClass: "card-moldura-sunset text-neutral-900 border-2",
    badgeClass: "bg-orange-200 text-orange-950 border-orange-600 font-bold",
    avatarBg: "bg-orange-100",
    avatarBgHex: "#ffedd5",
    avatarTextColor: "#c2410c",
  },
  golden: {
    id: "golden",
    name: "Moldura Ouro Imperial",
    emoji: "🥇",
    description: "Borda dourada reluzente com rotação e brilho nobre cobrindo o bloco do perfil.",
    cost: 150,
    rarity: "rare",
    avatarEffect: "fx-golden",
    cardClass: "card-moldura-golden border-2",
    badgeClass: "bg-amber-300 text-amber-950 border-amber-700 font-black",
    avatarBg: "bg-amber-100",
    avatarBgHex: "#fef3c7",
    avatarTextColor: "#b45309",
  },
  rainbow: {
    id: "rainbow",
    name: "Moldura Arco-Íris",
    emoji: "🌈",
    description: "Borda multicolorida em rotação contínua e dinâmica.",
    cost: 200,
    rarity: "rare",
    avatarEffect: "fx-rainbow",
    cardClass: "card-moldura-rainbow bg-white text-neutral-900 border-2",
    badgeClass: "bg-gradient-to-r from-pink-300 via-amber-300 to-sky-300 text-black border-black font-black",
    avatarBg: "bg-pink-100",
    avatarBgHex: "#fdf2f8",
    avatarTextColor: "#db2777",
  },
  ice: {
    id: "ice",
    name: "Moldura Gelo Astral",
    emoji: "❄️",
    description: "Cristais azuis cintilantes com reflexo de geada fresca no bloco.",
    cost: 220,
    rarity: "rare",
    avatarEffect: "fx-ice",
    cardClass: "card-moldura-ice border-2",
    badgeClass: "bg-sky-200 text-sky-950 border-sky-500 font-bold",
    avatarBg: "bg-sky-100",
    avatarBgHex: "#e0f2fe",
    avatarTextColor: "#0284c7",
  },
  fire: {
    id: "fire",
    name: "Moldura Magma Flamejante",
    emoji: "🔥",
    description: "Chamas vivas em tons quentes de fogo e lava vulcânica cobrindo o card.",
    cost: 250,
    rarity: "rare",
    avatarEffect: "fx-fire",
    cardClass: "card-moldura-fire border-2",
    badgeClass: "bg-red-500 text-white border-red-800 font-bold",
    avatarBg: "bg-red-950",
    avatarBgHex: "#450a0a",
    avatarTextColor: "#f97316",
  },
  galaxy: {
    id: "galaxy",
    name: "Moldura Nebulosa Cósmica",
    emoji: "🌌",
    description: "Nebulosa espacial roxa e azul com aura estelar em todo o perfil.",
    cost: 500,
    rarity: "epic",
    avatarEffect: "fx-galaxy",
    cardClass: "card-moldura-galaxy border-2",
    badgeClass: "bg-purple-900 text-purple-200 border-purple-400 font-bold",
    avatarBg: "bg-purple-950",
    avatarBgHex: "#2e1065",
    avatarTextColor: "#c084fc",
  },
  shadow: {
    id: "shadow",
    name: "Moldura Obsidiana Dark",
    emoji: "🖤",
    description: "Aura escura pulsante minimalista para foco total no bloco.",
    cost: 700,
    rarity: "epic",
    avatarEffect: "fx-shadow",
    cardClass: "card-moldura-shadow border-2",
    badgeClass: "bg-neutral-800 text-neutral-300 border-neutral-600 font-bold",
    avatarBg: "bg-neutral-900",
    avatarBgHex: "#171717",
    avatarTextColor: "#f5f5f5",
  },
  sakura: {
    id: "sakura",
    name: "Moldura Sakura Zen",
    emoji: "🌸",
    description: "Borda suave com tons de pétalas de cerejeira florescente.",
    cost: 300,
    rarity: "epic",
    avatarEffect: "fx-sunset",
    cardClass: "card-moldura-sakura border-2",
    badgeClass: "bg-pink-200 text-pink-950 border-pink-400 font-bold",
    avatarBg: "bg-pink-100",
    avatarBgHex: "#fdf2f8",
    avatarTextColor: "#db2777",
  },
  emerald_forest: {
    id: "emerald_forest",
    name: "Moldura Esmeralda Mística",
    emoji: "🌲",
    description: "Verde esmeralda cintilante com sabedoria ancestral.",
    cost: 400,
    rarity: "epic",
    avatarEffect: "fx-neon-pulse",
    cardClass: "card-moldura-emerald border-2",
    badgeClass: "bg-emerald-200 text-emerald-950 border-emerald-700 font-bold",
    avatarBg: "bg-emerald-950",
    avatarBgHex: "#022c22",
    avatarTextColor: "#34d399",
  },
  phoenix: {
    id: "phoenix",
    name: "Moldura Fênix Lendária",
    emoji: "🔴",
    description: "Aura suprema de renascimento em chamas rubi e douradas.",
    cost: 900,
    rarity: "legendary",
    avatarEffect: "fx-phoenix",
    cardClass: "card-moldura-phoenix border-2",
    badgeClass: "bg-rose-900 text-rose-200 border-rose-500 font-black",
    avatarBg: "bg-rose-950",
    avatarBgHex: "#4c0519",
    avatarTextColor: "#f59e0b",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Moldura Cyberpunk Neon",
    emoji: "⚡",
    description: "Aura futurista de Night City com glitch dourado e magenta, grade neon e visores cibernéticos!",
    cost: 350,
    rarity: "epic",
    avatarEffect: "fx-cyberpunk",
    cardClass: "card-moldura-cyberpunk border-2 text-black",
    badgeClass: "bg-yellow-400 text-black border-black font-black",
    avatarBg: "bg-slate-900",
    avatarBgHex: "#0f172a",
    avatarTextColor: "#f43f5e",
  },
  hogwarts: {
    id: "hogwarts",
    name: "Moldura Castelo da Magia",
    emoji: "🧙",
    description: "Moldura mística inspirada no mundo bruxo com céu estrelado, brasão dourado e faíscas de feitiço!",
    cost: 380,
    rarity: "epic",
    avatarEffect: "fx-hogwarts",
    cardClass: "card-moldura-hogwarts border-2 text-black",
    badgeClass: "bg-amber-400 text-amber-950 border-amber-950 font-black",
    avatarBg: "bg-indigo-950",
    avatarBgHex: "#1e1b4b",
    avatarTextColor: "#fbbf24",
  },
  pixel_art: {
    id: "pixel_art",
    name: "Moldura Pixel Arcade 8-Bit",
    emoji: "👾",
    description: "Estilo retrô 8-bits com borda pixelada, corações de vida e moedas douradas de videogame!",
    cost: 260,
    rarity: "rare",
    avatarEffect: "fx-pixel-art",
    cardClass: "card-moldura-pixel border-2 text-black",
    badgeClass: "bg-green-400 text-black border-black font-black",
    avatarBg: "bg-zinc-900",
    avatarBgHex: "#18181b",
    avatarTextColor: "#4ade80",
  },
};

export const RARITY_META = {
  common: { label: "Comum", bg: "bg-slate-200 text-slate-900 border-slate-400" },
  rare: { label: "Raro", bg: "bg-sky-200 text-sky-950 border-sky-400" },
  epic: { label: "Épico", bg: "bg-purple-200 text-purple-950 border-purple-400" },
  legendary: { label: "Lendário", bg: "bg-amber-300 text-amber-950 border-amber-500 font-black" },
};

export function getEffect(effectId) {
  if (!effectId) return DEFAULT_EFFECTS.none;
  return DEFAULT_EFFECTS[effectId] || DEFAULT_EFFECTS.none;
}

export function effectClass(effectId) {
  const eff = getEffect(effectId);
  return eff.avatarEffect || "";
}

export function effectCardClass(effectId) {
  const eff = getEffect(effectId);
  return eff.cardClass || DEFAULT_EFFECTS.none.cardClass;
}

export function effectBadgeClass(effectId) {
  const eff = getEffect(effectId);
  return eff.badgeClass || DEFAULT_EFFECTS.none.badgeClass;
}

export const DARK_THEME_IDS = new Set([
  "stranger_things",
  "mentalist",
  "one_piece",
  "chemistry_lab",
  "japan",
  "minecraft",
  "cyberpunk",
  "hogwarts",
  "pixel_art",
  "shadow",
  "galaxy",
  "fire",
  "phoenix",
  "emerald_forest",
  "neon_pulse",
]);

export function isDarkTheme(effectId) {
  if (!effectId) return false;
  return DARK_THEME_IDS.has(effectId);
}

export const getTheme = getEffect;

export function getThemeByEffectOrId(effectOrId) {
  if (!effectOrId || effectOrId === "none") return DEFAULT_EFFECTS.none;
  if (DEFAULT_EFFECTS[effectOrId]) return DEFAULT_EFFECTS[effectOrId];
  const found = Object.values(DEFAULT_EFFECTS).find(
    (e) => e.avatarEffect === effectOrId || e.id === effectOrId
  );
  return found || DEFAULT_EFFECTS.none;
}

/**
 * Puxa a tela da pessoa suavemente até a exibição da Loja de Molduras.
 * Funciona tanto se a aba da loja já estiver aberta quanto se estiver acabando de montar.
 */
export function pullScreenToStore() {
  const tryScroll = (attempts = 0) => {
    const el = document.getElementById("store-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const headerOffset = 70;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth"
      });
    } else if (attempts < 20) {
      setTimeout(() => tryScroll(attempts + 1), 35);
    }
  };
  requestAnimationFrame(() => tryScroll());
}

