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
  },
  spongebob: {
    id: "spongebob",
    name: "Moldura Bob Esponja",
    emoji: "🍍",
    description: "Moldura alegre da Fenda do Biquíni com arte tropical submarina central, bolhas marinhas e aura dourada!",
    cost: 120,
    rarity: "rare",
    avatarEffect: "fx-spongebob",
    cardClass: "card-moldura-spongebob text-yellow-950 border-2",
    badgeClass: "bg-amber-400 text-yellow-950 border-yellow-800 font-black",
  },
  mentalist: {
    id: "mentalist",
    name: "Moldura O Mentalista",
    emoji: "🔍",
    description: "Moldura inspirada na série O Mentalista com arte central vermelha e bege, mistério analítico e Patrick Jane.",
    cost: 160,
    rarity: "rare",
    avatarEffect: "fx-mentalist",
    cardClass: "card-moldura-mentalist border-2 text-white",
    badgeClass: "bg-red-700 text-amber-100 border-red-950 font-black",
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

export const getTheme = getEffect;

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

