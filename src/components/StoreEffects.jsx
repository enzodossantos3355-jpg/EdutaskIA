import { useState, useEffect, useCallback, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { DEFAULT_EFFECTS, RARITY_META } from "@/lib/effects";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";
import Avatar from "./Avatar";
import MolduraArtCenter from "./MolduraArtCenter";
import ModalPortal from "@/components/ModalPortal";
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
  Plus,
  RotateCw,
  Palette,
  ShoppingBag,
  Shirt,
  Crown,
  Check,
  Award,
} from "lucide-react";

export default function StoreEffects({ user: propUser, refresh: propRefresh }) {
  const { user: authUser, refresh: authRefresh } = useAuth();
  const {
    framesDisabled,
    frameRotationDisabled,
    toggleFramesDisabled,
    toggleFrameRotationDisabled,
  } = useAIStatus();

  const user = propUser || authUser;
  const refresh = propRefresh || authRefresh;

  const [unlocked, setUnlocked] = useState([]);
  const [equipped, setEquipped] = useState(user?.equipped_effect || user?.effect || "none");
  const [userPoints, setUserPoints] = useState(user?.points || 0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [togglingFrames, setTogglingFrames] = useState(false);
  const [togglingRotation, setTogglingRotation] = useState(false);
  const [effectsList, setEffectsList] = useState([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [tabFilter, setTabFilter] = useState("all");

  // Sandbox Live Preview State (Vestiário)
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
      badgeClass: eff.badgeClass || base.badgeClass,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: userRes }, { data: listRes }] = await Promise.all([
        api.get("/auth/me").catch(() => api.get("/me")),
        api.get("/effects").catch(() => ({ data: [] })),
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

      const currentUserObj = userRes || authUser || user || {};
      const ownedList = currentUserObj.role === "admin"
        ? items.map((e) => e.id)
        : (listRes?.owned || currentUserObj.owned_effects || currentUserObj.unlocked_effects || ["none"]);
      setUnlocked(ownedList);
      setEquipped(currentUserObj.equipped_effect || currentUserObj.effect || listRes?.equipped || "none");
      setUserPoints(currentUserObj.points !== undefined ? currentUserObj.points : (authUser?.points || user?.points || 0));
    } catch {
      setEffectsList(Object.values(DEFAULT_EFFECTS).map((e) => enrichEffect(e)));
      if (authUser?.points !== undefined) setUserPoints(authUser.points);
    } finally {
      setLoading(false);
    }
  }, [enrichEffect, authUser, user]);

  useEffect(() => {
    load();
    const handleProfileUpdate = () => load();
    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("task-completed", handleProfileUpdate);
    window.addEventListener("focus", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("task-completed", handleProfileUpdate);
      window.removeEventListener("focus", handleProfileUpdate);
    };
  }, [load]);

  const buy = async (eff) => {
    setBusy(eff.id);
    try {
      const { data } = await api.post(`/effects/buy/${eff.id}`);
      toast.success(data.message || "Moldura adquirida com sucesso!");
      setUnlocked((prev) => [...prev, eff.id]);
      if (data.points !== undefined) setUserPoints(data.points);
      if (refresh) refresh();
      window.dispatchEvent(new Event("profile-updated"));
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
        eff.description.toLowerCase().includes(searchQuery.toLowerCase());

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

  const handleToggleFrames = async () => {
    setTogglingFrames(true);
    try {
      const nextDisabled = !framesDisabled;
      await toggleFramesDisabled(nextDisabled);
      toast.success(
        nextDisabled
          ? "Molduras e Loja desativadas para todos os alunos!"
          : "Molduras e Loja reativadas com sucesso!"
      );
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar estado da loja");
    } finally {
      setTogglingFrames(false);
    }
  };

  const handleToggleFrameRotation = async () => {
    setTogglingRotation(true);
    try {
      const nextDisabled = !frameRotationDisabled;
      await toggleFrameRotationDisabled(nextDisabled);
      toast.success(
        nextDisabled
          ? "Giro das molduras desativado (efeito estático)."
          : "Giro das molduras ativado (com movimento)!"
      );
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar giro das molduras");
    } finally {
      setTogglingRotation(false);
    }
  };

  return (
    <div
      className="space-y-6 nb-fade-in"
      id="store-section"
      data-testid="store-effects"
    >
      {/* Header Banner Neo-Brutalista EduTask */}
      <div className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 p-5 sm:p-7 border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="nb-badge bg-amber-400 text-black border-2 border-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 shadow-[2px_2px_0_0_#000]">
              <ShoppingBag className="w-4 h-4 text-black" /> Loja de Molduras & Perfil
            </span>
            {isAdmin && (
              <span className="nb-badge bg-red-500 text-white border-2 border-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-1.5 px-3 py-1">
                <Shield className="w-3.5 h-3.5 text-white" /> Painel de Edição Admin
              </span>
            )}
          </div>

          <h2 className="font-heading font-black text-2xl sm:text-3xl text-neutral-950 flex items-center gap-2.5">
            <Palette className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-950" />
            <span>Personalize seu Perfil</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-900 font-bold leading-relaxed">
            Acumule pontos concluindo suas tarefas no prazo e escolha as melhores molduras para destacar seu avatar no pódio!
            {isAdmin && " Administradores podem editar valores e cadastrar novas opções no painel."}
          </p>
        </div>

        {/* Balance Chip */}
        <div className="bg-white p-4 border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] flex items-center gap-3.5 shrink-0 self-start md:self-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-400 border-2 border-black flex items-center justify-center text-amber-950 font-black shadow-[2px_2px_0px_0px_#000]">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
              Seu Saldo em Pontos
            </div>
            <div
              className="font-heading font-black text-2xl sm:text-3xl text-amber-950 leading-none"
              data-testid="user-points-balance"
            >
              {userPoints}{" "}
              <span className="text-xs font-black text-neutral-700">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Controle Admin para Loja & Giro */}
      {isAdmin && (
        <div className="bg-amber-100 border-3 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0_0_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="nb-badge bg-amber-400 text-black border-2 border-black text-xs font-black">
                PAINEL DA LOJA
              </span>

              {framesDisabled ? (
                <span className="nb-badge bg-red-500 text-white border-2 border-black text-xs font-black">
                  Loja Desativada
                </span>
              ) : (
                <span className="nb-badge bg-emerald-300 text-emerald-950 border-2 border-black text-xs font-black">
                  Loja Ativa
                </span>
              )}
              {frameRotationDisabled ? (
                <span className="nb-badge bg-sky-200 text-sky-950 border-2 border-black text-xs font-black">
                  Giro Desligado (Estático)
                </span>
              ) : (
                <span className="nb-badge bg-amber-300 text-amber-950 border-2 border-black text-xs font-black flex items-center gap-1">
                  <RotateCw className="w-3 h-3 animate-spin" /> Giro Ligado
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-900 font-bold">
              Controle o acesso dos alunos à loja, o efeito de rotação das molduras e cadastre novos itens.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="nb-btn px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-emerald-950 text-xs font-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2"
              data-testid="btn-create-new-frame"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Moldura</span>
            </button>

            <button
              onClick={handleToggleFrames}
              disabled={togglingFrames}
              className={`nb-btn px-3.5 py-2 text-xs font-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 ${
                framesDisabled
                  ? "bg-emerald-300 hover:bg-emerald-400 text-emerald-950"
                  : "bg-red-300 hover:bg-red-400 text-red-950"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{togglingFrames ? "Aplicando..." : framesDisabled ? "Reativar Loja" : "Desativar Loja"}</span>
            </button>

            <button
              onClick={handleToggleFrameRotation}
              disabled={togglingRotation}
              className="nb-btn px-3.5 py-2 bg-sky-300 hover:bg-sky-400 text-sky-950 text-xs font-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
            >
              <RotateCw className="w-4 h-4" />
              <span>
                {togglingRotation
                  ? "Aplicando..."
                  : frameRotationDisabled
                  ? "Ligar Giro de Molduras"
                  : "Desligar Giro de Molduras"}
              </span>
            </button>
          </div>
        </div>
      )}



      {/* Filtros e Busca */}
      <div className="bg-white p-4 border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar moldura por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs font-bold py-2.5 w-full border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro de Raridade */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-black text-neutral-600 mr-1 flex items-center gap-1 uppercase text-[10px]">
            <Filter className="w-3.5 h-3.5" /> Raridade:
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
              className={`px-3 py-1.5 text-xs font-black rounded-xl border-2 transition-all whitespace-nowrap ${
                rarityFilter === r.id
                  ? "bg-black text-amber-300 border-black shadow-[2px_2px_0px_0px_#000]"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-black"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Filtro de Posse */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1.5 rounded-xl border-2 border-black shrink-0">
          <button
            onClick={() => setTabFilter("all")}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
              tabFilter === "all"
                ? "bg-amber-300 text-amber-950 border border-black shadow-xs"
                : "text-neutral-700 hover:text-black"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setTabFilter("owned")}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
              tabFilter === "owned"
                ? "bg-amber-300 text-amber-950 border border-black shadow-xs"
                : "text-neutral-700 hover:text-black"
            }`}
          >
            Adquiridas
          </button>
          <button
            onClick={() => setTabFilter("shop")}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
              tabFilter === "shop"
                ? "bg-amber-300 text-amber-950 border border-black shadow-xs"
                : "text-neutral-700 hover:text-black"
            }`}
          >
            Na Loja
          </button>
        </div>
      </div>

      {/* Grid de Cards de Molduras */}
      {loading ? (
        <div className="text-center py-12 text-neutral-600 font-black text-sm">
          Carregando catálogo completo da loja...
        </div>
      ) : filteredEffects.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border-3 border-black space-y-3 shadow-[4px_4px_0px_0px_#000]">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border-2 border-black flex items-center justify-center mx-auto">
            <Search className="w-6 h-6 text-neutral-700" />
          </div>
          <h4 className="font-heading font-black text-lg text-neutral-900">
            Nenhuma moldura encontrada
          </h4>
          <p className="text-xs text-neutral-600 font-bold max-w-sm mx-auto">
            Não encontramos molduras para os filtros aplicados. Tente alterar o termo de busca ou selecionar outra raridade.
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
                className={`bg-white border-3 border-black rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelectedForPreview
                    ? "ring-3 ring-amber-400 bg-amber-50/60 shadow-[6px_6px_0px_0px_#000] -translate-y-0.5"
                    : "shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5"
                }`}
                data-testid={`frame-card-${eff.id}`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border border-black ${
                        RARITY_META[eff.rarity]?.bg || "bg-slate-200 text-black"
                      }`}
                    >
                      {RARITY_META[eff.rarity]?.label || eff.rarity}
                    </span>

                    {/* Botão Admin de Edição */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(eff);
                        }}
                        className="p-1.5 bg-amber-300 hover:bg-amber-400 text-amber-950 rounded-lg border border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1 text-[11px] font-black"
                        title="Editar Valor & Raridade"
                        data-testid={`admin-edit-frame-${eff.id}`}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}
                  </div>

                  {/* Visual Box com a Moldura */}
                  <div
                    className={`p-4 rounded-xl border-2 border-black min-h-[120px] relative ${eff.cardClass}`}
                  >
                    <MolduraArtCenter effectId={eff.id} />
                    <div className="relative z-10 flex items-center gap-3">
                      <Avatar
                        userId={user?.id}
                        name={user?.name || "Aluno"}
                        size={48}
                        hasAvatar={user?.has_avatar}
                        version={user?.avatar_version}
                        effect={eff.avatarEffect || eff.id}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-heading font-black text-sm truncate flex items-center gap-1">
                          <span className="truncate">{eff.name}</span>
                        </div>
                        <p className="text-[11px] opacity-90 font-bold line-clamp-2 leading-tight">
                          {eff.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 mt-3 border-t-2 border-black/10 flex items-center justify-between gap-2">
                  <div className="text-xs font-black">
                    {eff.cost === 0 ? (
                      <span className="text-emerald-700 text-sm font-black">
                        Grátis
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-950 text-sm font-black">
                        <Coins className="w-4 h-4 text-amber-600" />{" "}
                        {eff.cost} pts
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isEquipped ? (
                      <button
                        disabled
                        className="px-3 py-1.5 text-xs bg-emerald-400 text-emerald-950 border-2 border-black cursor-default font-black flex items-center gap-1 rounded-xl shadow-[1.5px_1.5px_0px_0px_#000]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" /> Equipada
                      </button>
                    ) : unlockedState ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          equip(eff.id);
                        }}
                        disabled={busy === eff.id}
                        className="nb-btn px-3 py-1.5 text-xs bg-amber-300 hover:bg-amber-400 text-amber-950 font-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1"
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
                        className={`nb-btn px-3 py-1.5 text-xs font-black flex items-center gap-1 border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] ${
                          canAfford
                            ? "bg-amber-400 hover:bg-amber-500 text-amber-950"
                            : "bg-neutral-200 text-neutral-500 cursor-not-allowed border-neutral-400"
                        }`}
                      >
                        {canAfford ? (
                          <Coins className="w-3.5 h-3.5 text-amber-950" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-neutral-500" />
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

      {/* Admin Create New Frame Modal */}
      {createModalOpen && (
        <CreateFrameModal
          onClose={() => setCreateModalOpen(false)}
          onSaved={() => {
            setCreateModalOpen(false);
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
        `Moldura "${effect.name}" atualizada! (Custo: ${parsedCost} pts, Raridade: ${RARITY_META[rarity]?.label || rarity})`
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
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="nb-card bg-white border-3 border-black p-6 sm:p-7 rounded-2xl shadow-[8px_8px_0px_0px_#000] max-w-md w-full space-y-5 relative">
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-300 border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0_0_#000]">
              <Palette className="w-6 h-6 text-amber-950" />
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
                      ? "bg-amber-400 text-amber-950 font-black shadow-[1.5px_1.5px_0px_0px_#000]"
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
                      ? "bg-black text-amber-300 border-black shadow-[2px_2px_0px_0px_#000]"
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
              className="nb-btn bg-amber-400 hover:bg-amber-300 text-amber-950 px-4 py-2 text-xs font-heading font-black border border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

function CreateFrameModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(150);
  const [rarity, setRarity] = useState("rare");
  const [theme, setTheme] = useState("cyan");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const THEME_OPTIONS = [
    { id: "cyan", label: "Neon Ciano", bg: "bg-cyan-500", cardClass: "border-cyan-500 bg-gradient-to-br from-cyan-900/60 to-black text-cyan-200", avatarEffect: "fx-cyber" },
    { id: "gold", label: "Ouro Real", bg: "bg-amber-400", cardClass: "border-amber-400 bg-gradient-to-br from-amber-950/80 to-yellow-900/40 text-amber-200", avatarEffect: "fx-gold" },
    { id: "purple", label: "Galáxia Neon", bg: "bg-purple-500", cardClass: "border-purple-500 bg-gradient-to-br from-purple-950/80 to-violet-900/50 text-purple-200", avatarEffect: "fx-galaxy" },
    { id: "fire", label: "Fogo Cósmico", bg: "bg-red-500", cardClass: "border-red-500 bg-gradient-to-br from-red-950/80 to-amber-900/50 text-red-200", avatarEffect: "fx-fire" },
    { id: "emerald", label: "Esmeralda", bg: "bg-emerald-400", cardClass: "border-emerald-500 bg-gradient-to-br from-emerald-950/80 to-teal-900/50 text-emerald-200", avatarEffect: "fx-matrix" },
  ];

  const rarities = [
    { key: "common", label: "Comum" },
    { key: "rare", label: "Raro" },
    { key: "epic", label: "Épico" },
    { key: "legendary", label: "Lendário" },
  ];

  const presets = [0, 50, 100, 150, 250, 500];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome da nova moldura.");
      return;
    }

    setSaving(true);
    try {
      const safeId = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "") || `moldura_${Date.now()}`;

      const selectedTheme = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

      const payload = {
        id: safeId,
        name: name.trim(),
        description: description.trim() || `Moldura exclusiva ${name.trim()}`,
        rarity,
        cost: Number(cost) || 0,
        cardClass: selectedTheme.cardClass,
        avatarEffect: selectedTheme.avatarEffect,
      };

      await api.post("/effects", payload);
      toast.success(`Moldura "${name.trim()}" cadastrada com sucesso na loja!`);
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao cadastrar moldura");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
        data-testid="create-frame-modal"
      >
        <div
          className="nb-card bg-white border-4 border-black rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-[8px_8px_0px_0px_#000] max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b-2 border-black/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-300 border-2 border-black flex items-center justify-center text-emerald-950 font-black shadow-[2px_2px_0_0_#000]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-neutral-950">
                Cadastrar Nova Moldura
              </h3>
              <p className="text-xs text-neutral-600 font-bold">
                Defina o nome, valor em pontos e estilo visual para a loja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg border-2 border-black hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-neutral-900 mb-1">
              Nome da Moldura <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cyber Neon, Rainha das Estrelas, Matrix 2026..."
              className="nb-input w-full text-sm font-bold border-2 border-black rounded-xl p-2.5 bg-neutral-50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-neutral-900 mb-1">
              Descrição / Efeito
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Borda luminosa com gradiente holográfico especial"
              className="nb-input w-full text-xs font-medium border-2 border-black rounded-xl p-2.5 bg-neutral-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-neutral-900 mb-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-600" /> Preço em Pontos
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="nb-input w-full text-base font-black border-2 border-black rounded-xl p-2 bg-neutral-50"
                required
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCost(p)}
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded border border-black transition-all ${
                      parseInt(cost) === p
                        ? "bg-amber-400 text-amber-950"
                        : "bg-neutral-100 hover:bg-neutral-200"
                    }`}
                  >
                    {p === 0 ? "Grátis" : `${p}p`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-neutral-900 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Raridade
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {rarities.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRarity(r.key)}
                    className={`px-2 py-1.5 text-xs font-black rounded-lg border-2 transition-all ${
                      rarity === r.key
                        ? "bg-black text-amber-300 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-neutral-900 mb-1">
              Tema Visual do Card e Avatar
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_OPTIONS.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  className={`p-2 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    theme === th.id
                      ? "border-black bg-neutral-900 text-white shadow-[2px_2px_0_0_#000]"
                      : "border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${th.bg} border border-black`} />
                  <span>{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-3 border-t-2 border-black/10">
            <button
              type="button"
              onClick={onClose}
              className="nb-btn bg-white hover:bg-neutral-100 px-4 py-2 text-xs font-bold border border-black rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-5 py-2 text-xs font-heading font-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Cadastrar Moldura"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}
