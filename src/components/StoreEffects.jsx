import { useState, useEffect, useCallback, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { DEFAULT_EFFECTS, RARITY_META } from "@/lib/effects";
import { useAuth } from "@/context/AuthContext";
import Avatar from "./Avatar";
import MolduraArtCenter from "./MolduraArtCenter";
import {
  Sparkles,
  Lock,
  CheckCircle2,
  Coins,
  Settings,
  X,
  Save,
  Search,
  Filter,
  Eye,
  SlidersHorizontal,
  Shield,
  Tag,
  Zap,
} from "lucide-react";

export default function StoreEffects({ user: propUser, refresh: propRefresh }) {
  const { user: authUser, refresh: authRefresh } = useAuth();
  const user = propUser || authUser;
  const refresh = propRefresh || authRefresh;

  const [unlocked, setUnlocked] = useState([]);
  const [equipped, setEquipped] = useState(user?.equipped_effect || user?.effect || "none");
  const [userPoints, setUserPoints] = useState(user?.points || 0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const [effectsList, setEffectsList] = useState([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [tabFilter, setTabFilter] = useState("all");

  // Sandbox Live Preview State
  const [previewEffect, setPreviewEffect] = useState(null);

  useEffect(() => {
    if (user?.equipped_effect || user?.effect) {
      setEquipped(user.equipped_effect || user.effect);
    }
    if (user?.points !== undefined) setUserPoints(user.points);
  }, [user]);

  const enrichEffect = useCallback((eff) => {
    if (!eff) return DEFAULT_EFFECTS.none;
    const base = DEFAULT_EFFECTS[eff.id] || DEFAULT_EFFECTS.none;
    return {
      ...base,
      ...eff,
      cardClass: eff.cardClass || base.cardClass || `card-moldura-${eff.id.replace('_lab', '').replace('_', '-')}`,
      avatarEffect: eff.avatarEffect || base.avatarEffect || `fx-${eff.id.replace('_', '-')}`,
      emoji: eff.emoji || base.emoji || "🖼️",
      badgeClass: eff.badgeClass || base.badgeClass,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: userRes }, { data: listRes }] = await Promise.all([
        api.get("/me"),
        api.get("/effects"),
      ]);
      const rawEffects = Array.isArray(listRes) ? listRes : (listRes?.effects || []);
      
      const rawMap = new Map();
      if (Array.isArray(rawEffects)) {
        rawEffects.forEach((e) => {
          if (e && e.id) rawMap.set(e.id, e);
        });
      }

      // Combine all DEFAULT_EFFECTS with server rawEffects
      const allKeys = new Set([...Object.keys(DEFAULT_EFFECTS), ...rawMap.keys()]);
      const items = Array.from(allKeys).map((id) => {
        const defaultObj = DEFAULT_EFFECTS[id] || {};
        const serverObj = rawMap.get(id) || {};
        return enrichEffect({
          ...defaultObj,
          ...serverObj,
        });
      });

      setEffectsList(items);

      const ownedList = userRes.role === "admin"
        ? items.map((e) => e.id)
        : (listRes?.owned || userRes.owned_effects || userRes.unlocked_effects || []);
      setUnlocked(ownedList);
      setEquipped(userRes.equipped_effect || userRes.effect || listRes?.equipped || "none");
      setUserPoints(userRes.points || 0);
    } catch {
      setEffectsList(Object.values(DEFAULT_EFFECTS).map((e) => enrichEffect(e)));
    } finally {
      setLoading(false);
    }
  }, [enrichEffect]);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (eff) => {
    setBusy(eff.id);
    try {
      const { data } = await api.post(`/effects/buy/${eff.id}`);
      toast.success(data.message || "Moldura adquirida com sucesso! 🎨");
      setUnlocked((prev) => [...prev, eff.id]);
      if (data.points !== undefined) setUserPoints(data.points);
      if (refresh) refresh();
    } catch (e) {
      toast.error(
        formatApiError(e?.response?.data?.detail) || "Erro ao comprar moldura"
      );
    } finally {
      setBusy(null);
    }
  };

  const equip = async (effId) => {
    setBusy(effId);
    try {
      const { data } = await api.post(`/effects/equip/${effId}`);
      toast.success(data.message || "Moldura equipada com sucesso!");
      setEquipped(effId);
      if (refresh) refresh();
    } catch (e) {
      toast.error(
        formatApiError(e?.response?.data?.detail) || "Erro ao equipar moldura"
      );
    } finally {
      setBusy(null);
    }
  };

  const isUnlocked = (effId) => user?.role === "admin" || effId === "none" || unlocked.includes(effId);

  const filteredEffects = useMemo(() => {
    return effectsList.filter((eff) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eff.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (eff.emoji && eff.emoji.includes(searchQuery));

      const matchesRarity =
        rarityFilter === "all" || eff.rarity === rarityFilter;

      const unlockedState = isUnlocked(eff.id);
      const matchesTab =
        tabFilter === "all" ||
        (tabFilter === "owned" && unlockedState) ||
        (tabFilter === "shop" && !unlockedState);

      return matchesSearch && matchesRarity && matchesTab;
    });
  }, [effectsList, searchQuery, rarityFilter, tabFilter, unlocked, user]);

  const activePreview = useMemo(() => {
    if (previewEffect) return enrichEffect(previewEffect);
    const found = effectsList.find((e) => e.id === equipped);
    if (found) return found;
    return DEFAULT_EFFECTS[equipped] ? enrichEffect(DEFAULT_EFFECTS[equipped]) : DEFAULT_EFFECTS.none;
  }, [previewEffect, equipped, effectsList, enrichEffect]);
  const isEquippedActive = equipped === activePreview.id;
  const isUnlockedActive = isUnlocked(activePreview.id);
  const isAdmin = user?.role === "admin";

  return (
    <div
      className="space-y-6 nb-fade-in"
      id="store-section"
      data-testid="store-effects"
    >
      {/* Classic Header Banner */}
      <div className="bg-gradient-to-r from-amber-200 via-orange-100 to-amber-100 p-5 sm:p-6 border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-black text-amber-300 border border-black rounded-full font-heading font-black text-[11px] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Loja de Molduras & Efeitos
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-500 text-white border border-black rounded-full font-heading font-black text-[11px] uppercase tracking-wider">
                <Shield className="w-3 h-3" /> Modo Admin (Edição de Molduras Ativa)
              </span>
            )}
          </div>

          <h2 className="font-heading font-black text-2xl sm:text-3xl text-neutral-950">
            Personalize seu Perfil 🖼️
          </h2>
          <p className="text-xs sm:text-sm text-neutral-800 font-bold leading-relaxed">
            Acumule pontos com suas atividades e escolha as melhores molduras para o seu avatar.
            {isAdmin && " Clique no ícone de engrenagem ⚙️ em qualquer moldura para alterar seu valor e raridade."}
          </p>
        </div>

        {/* Balance Box */}
        <div className="bg-white px-4 py-3 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-amber-400 border border-black flex items-center justify-center text-amber-950 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-neutral-500">
              Seu Saldo
            </div>
            <div
              className="font-heading font-black text-2xl text-amber-950 leading-none"
              data-testid="user-points-balance"
            >
              {userPoints}{" "}
              <span className="text-xs font-bold text-neutral-600">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Classic Provador Virtual Sandbox */}
      <div className="bg-neutral-900 text-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <h3 className="font-heading font-black text-base text-white">
              Provador Virtual — Visualizar Moldura
            </h3>
          </div>
          <span className="text-xs text-amber-300 font-bold">
            Clique em qualquer moldura abaixo para testar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          {/* Live Card Preview */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Exemplo no Bloco do Perfil</span>
              <span className="text-amber-400 font-black">
                {activePreview.emoji} {activePreview.name}
              </span>
            </div>
            <div
              className={`p-4 relative rounded-xl border-2 border-black transition-all duration-300 min-h-[140px] flex items-center gap-3 ${activePreview.cardClass}`}
            >
              <MolduraArtCenter effectId={activePreview.id} />
              <div className="relative z-10 flex items-center gap-3 w-full">
                <Avatar
                  userId={user?.id}
                  name={user?.name || "Aluno"}
                  size={52}
                  hasAvatar={user?.has_avatar}
                  version={user?.avatar_version}
                  effect={activePreview.avatarEffect || activePreview.id}
                />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-heading font-black text-base truncate">
                      {user?.name || "Seu Nome de Aluno"}
                    </h4>
                    <span>{activePreview.emoji}</span>
                  </div>
                  <p className="text-xs opacity-90 font-bold line-clamp-2">
                    {activePreview.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase text-amber-400">
                  {activePreview.emoji} {activePreview.name}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black ${
                    RARITY_META[activePreview.rarity]?.bg || "bg-slate-200 text-black"
                  }`}
                >
                  {RARITY_META[activePreview.rarity]?.label || activePreview.rarity}
                </span>
              </div>
              <p className="text-xs text-neutral-300 font-medium mb-2">
                {activePreview.description}
              </p>
              <div className="text-xs text-neutral-400 flex items-center gap-3 font-bold bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                <span>Valor: <strong className="text-amber-300">{activePreview.cost === 0 ? "Grátis" : `${activePreview.cost} pts`}</strong></span>
                <span>Status: <strong className={isUnlockedActive ? "text-emerald-400" : "text-red-400"}>{isUnlockedActive ? "Desbloqueada" : "Bloqueada"}</strong></span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setEditing(activePreview)}
                  className="nb-btn px-3 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 shrink-0"
                  title="Editar valor e raridade"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              )}

              {isEquippedActive ? (
                <div className="w-full py-2 bg-emerald-500 text-emerald-950 font-heading font-black text-xs rounded-lg flex items-center justify-center gap-1.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Moldura Equipada
                </div>
              ) : isUnlockedActive ? (
                <button
                  onClick={() => equip(activePreview.id)}
                  disabled={busy === activePreview.id}
                  className="nb-btn w-full py-2 bg-sky-300 hover:bg-sky-200 text-sky-950 font-heading font-black text-xs flex items-center justify-center gap-1.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {busy === activePreview.id ? "Equipando..." : "Equipar Moldura"}
                </button>
              ) : (
                <button
                  onClick={() => buy(activePreview)}
                  disabled={userPoints < activePreview.cost || busy === activePreview.id}
                  className={`nb-btn w-full py-2 font-heading font-black text-xs flex items-center justify-center gap-1.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    userPoints >= activePreview.cost
                      ? "bg-amber-400 hover:bg-amber-300 text-amber-950"
                      : "bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-700"
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  {busy === activePreview.id
                    ? "Comprando..."
                    : userPoints >= activePreview.cost
                    ? `Comprar (${activePreview.cost} pts)`
                    : `Pontos Insuficientes (${activePreview.cost} pts)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Rarity Filter Bar */}
      <div className="bg-white p-4 border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs font-bold py-2 w-full border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Rarities */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-neutral-500 mr-1 flex items-center gap-1 uppercase text-[10px]">
            <Filter className="w-3 h-3" /> Raridade:
          </span>
          {[
            { id: "all", label: "Todas" },
            { id: "common", label: "Comuns" },
            { id: "rare", label: "Raras" },
            { id: "epic", label: "Épicas" },
            { id: "legendary", label: "Lendárias" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRarityFilter(r.id)}
              className={`px-3 py-1 text-xs font-black rounded-lg border transition-all whitespace-nowrap ${
                rarityFilter === r.id
                  ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Ownership Tab */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-black shrink-0">
          <button
            onClick={() => setTabFilter("all")}
            className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all ${
              tabFilter === "all"
                ? "bg-amber-300 text-amber-950 border border-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setTabFilter("owned")}
            className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all ${
              tabFilter === "owned"
                ? "bg-amber-300 text-amber-950 border border-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Adquiridas
          </button>
          <button
            onClick={() => setTabFilter("shop")}
            className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all ${
              tabFilter === "shop"
                ? "bg-amber-300 text-amber-950 border border-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Na Loja
          </button>
        </div>
      </div>

      {/* Grid of Frame Cards */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500 font-bold text-sm">
          Carregando catálogo de molduras...
        </div>
      ) : filteredEffects.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl border-2 border-black space-y-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-3xl">🔍</div>
          <h4 className="font-heading font-black text-base">
            Nenhuma moldura encontrada
          </h4>
          <p className="text-xs text-neutral-600 font-bold">
            Tente alterar o filtro ou termo de busca acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEffects.map((eff) => {
            const unlockedState = isUnlocked(eff.id);
            const isEquipped = equipped === eff.id;
            const canAfford = userPoints >= eff.cost;
            const isSelectedForPreview = activePreview.id === eff.id;

            return (
              <div
                key={eff.id}
                onClick={() => setPreviewEffect(eff)}
                className={`bg-white border-2 border-black rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelectedForPreview
                    ? "ring-2 ring-amber-400 bg-amber-50/50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                    : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                }`}
                data-testid={`frame-card-${eff.id}`}
              >
                <div>
                  {/* Card Header: Rarity + Admin Gear Button */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black ${
                        RARITY_META[eff.rarity]?.bg || "bg-slate-200 text-black"
                      }`}
                    >
                      {RARITY_META[eff.rarity]?.label || eff.rarity}
                    </span>

                    {/* ADMIN GEAR ICON BUTTON */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(eff);
                        }}
                        className="p-1.5 bg-amber-300 hover:bg-amber-400 text-amber-950 rounded-lg border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 text-[11px] font-black"
                        title="Editar Valor & Raridade"
                        data-testid={`admin-edit-frame-${eff.id}`}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}
                  </div>

                  {/* Frame Visual Display Box */}
                  <div
                    className={`p-3 rounded-xl border-2 border-black min-h-[110px] relative mb-3 ${eff.cardClass}`}
                  >
                    <MolduraArtCenter effectId={eff.id} />
                    <div className="relative z-10 flex items-center gap-3">
                      <Avatar
                        userId={user?.id}
                        name={user?.name || "Aluno"}
                        size={44}
                        hasAvatar={user?.has_avatar}
                        version={user?.avatar_version}
                        effect={eff.avatarEffect || eff.id}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-heading font-black text-sm truncate flex items-center gap-1">
                          <span>{eff.emoji}</span>
                          <span className="truncate">{eff.name}</span>
                        </div>
                        <p className="text-[11px] opacity-90 font-bold line-clamp-2">
                          {eff.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                  <div className="text-xs font-black">
                    {eff.cost === 0 ? (
                      <span className="text-emerald-700 text-sm font-black">
                        Grátis
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-900 text-sm font-black">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />{" "}
                        {eff.cost} pts
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isEquipped ? (
                      <button
                        disabled
                        className="px-3 py-1 text-xs bg-emerald-400 text-emerald-950 border border-black cursor-default font-black flex items-center gap-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Equipada
                      </button>
                    ) : unlockedState ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          equip(eff.id);
                        }}
                        disabled={busy === eff.id}
                        className="nb-btn px-3 py-1 text-xs bg-amber-300 hover:bg-amber-400 text-amber-950 font-black border border-black rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {busy === eff.id ? "Equipando..." : "Equipar"}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buy(eff);
                        }}
                        disabled={!canAfford || busy === eff.id}
                        className={`nb-btn px-3 py-1 text-xs font-black flex items-center gap-1 border border-black rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] ${
                          canAfford
                            ? "bg-amber-400 hover:bg-amber-500 text-amber-950"
                            : "bg-neutral-200 text-neutral-500 cursor-not-allowed border-neutral-400"
                        }`}
                      >
                        {canAfford ? (
                          <Coins className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        {busy === eff.id
                          ? "Comprando..."
                          : canAfford
                          ? "Comprar"
                          : "Bloqueada"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Price & Rarity Edit Dialog Modal */}
      {editing && (
        <EditFrameModal
          effect={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            if (refresh) refresh();
          }}
        />
      )}
    </div>
  );
}

function EditFrameModal({ effect, onClose, onSaved }) {
  const [cost, setCost] = useState(
    effect.cost !== undefined ? effect.cost : 100
  );
  const [rarity, setRarity] = useState(effect.rarity || "rare");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const presets = [0, 50, 80, 100, 120, 150, 200, 250, 300, 500, 800, 1000];
  const rarities = [
    { key: "common", label: "Comum" },
    { key: "rare", label: "Raro" },
    { key: "epic", label: "Épico" },
    { key: "legendary", label: "Lendário" },
  ];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const parsedCost = Math.max(0, parseInt(cost) || 0);
    try {
      await api.put(`/effects/${effect.id}`, { cost: parsedCost, rarity });
      toast.success(
        `Moldura "${effect.name}" atualizada! (Custo: ${parsedCost} pts, Raridade: ${RARITY_META[rarity]?.label || rarity}) 💰`
      );
      onSaved();
    } catch (err) {
      toast.error(
        formatApiError(err?.response?.data?.detail) ||
          "Falha ao atualizar moldura"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 nb-fade-in">
      <div className="bg-white border-3 border-black p-6 sm:p-7 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full space-y-5 relative">
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-300 border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0_0_#000]">
              {effect.emoji}
            </div>
            <div>
              <span className="px-2 py-0.5 bg-red-500 text-white border border-black rounded text-[10px] font-black uppercase">
                Edição do Administrador
              </span>
              <h3 className="font-heading font-black text-lg text-neutral-950 leading-tight">
                Editar Valor & Raridade
              </h3>
              <p className="text-xs text-neutral-600 font-bold">
                {effect.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg border border-black shadow-[1.5px_1.5px_0_0_#000]"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-neutral-900 mb-1.5 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" /> Valor em Pontos (Custo na Loja)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="99999"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="nb-input w-full text-lg font-black border-2 border-black rounded-xl p-2.5"
                required
                autoFocus
              />
              <span className="font-heading font-black text-sm text-neutral-900 whitespace-nowrap bg-amber-200 px-3 py-2.5 border-2 border-black rounded-xl">
                pts
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase text-neutral-500 mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Sugestões Rápidas:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCost(p)}
                  className={`px-2 py-1 text-xs font-black rounded-lg border border-black transition-all ${
                    parseInt(cost) === p
                      ? "bg-amber-400 text-amber-950 font-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                  }`}
                >
                  {p === 0 ? "Grátis" : `${p} pts`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-neutral-900 mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Raridade da Moldura
            </label>
            <div className="grid grid-cols-2 gap-2">
              {rarities.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRarity(r.key)}
                  className={`px-3 py-2 text-xs font-black rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                    rarity === r.key
                      ? "bg-black text-amber-300 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border border-black ${
                      RARITY_META[r.key]?.bg || "bg-slate-300"
                    }`}
                  />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-3 border-t-2 border-black/10">
            <button
              type="button"
              onClick={onClose}
              className="nb-btn bg-white hover:bg-neutral-100 px-3.5 py-2 text-xs font-bold border border-black rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nb-btn bg-amber-400 hover:bg-amber-300 text-amber-950 px-4 py-2 text-xs font-heading font-black border border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
