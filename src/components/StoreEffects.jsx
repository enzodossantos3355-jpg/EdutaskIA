import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Palette, Check, Sparkles, Lock, Pencil, X, Coins, CheckCircle2, Sliders, DollarSign, RefreshCw, Save } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import Avatar from "@/components/Avatar";
import MolduraArtCenter from "@/components/MolduraArtCenter";
import { effectClass, effectCardClass, effectBadgeClass, RARITY_META } from "@/lib/effects";
import { useAuth } from "@/context/AuthContext";
import { playEquipThemeSound } from "@/lib/soundEffects";

/**
 * Loja e Painel de Gerenciamento de Valores das Molduras de Perfil.
 * Permite ao Admin escolher e alterar o valor em pontos de qualquer moldura,
 * e aos alunos comprarem e equiparem molduras.
 */
export default function StoreEffects() {
  const { user, refresh } = useAuth();
  const [effects, setEffects] = useState([]);
  const [owned, setOwned] = useState([]);
  const [equipped, setEquipped] = useState("none");
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const [quickBatchMode, setQuickBatchMode] = useState(false);
  const [batchPrices, setBatchPrices] = useState({});
  const [savingBatch, setSavingBatch] = useState(false);

  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/effects");
      const effList = data.effects || [];
      setEffects(effList);
      setOwned(data.owned || []);
      setEquipped(data.equipped || "none");
      setPoints(data.points || 0);

      // Pre-fill batch prices
      const initialBatch = {};
      effList.forEach((e) => {
        initialBatch[e.id] = e.cost;
      });
      setBatchPrices(initialBatch);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao carregar loja de molduras");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (eff) => {
    setBusy(eff.id);
    try {
      await api.post("/me/effects/buy", { effect_id: eff.id });
      playEquipThemeSound(eff.id);
      toast.success(`Comprou a moldura "${eff.name}"! ${eff.emoji}`);
      await load();
      if (refresh) refresh();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao comprar moldura");
    } finally {
      setBusy(null);
    }
  };

  const equip = async (eff) => {
    setBusy(eff.id);
    try {
      await api.post("/me/effects/equip", { effect_id: eff.id === "none" ? null : eff.id });
      playEquipThemeSound(eff.id);
      toast.success(eff.id === "none" ? "Moldura padrão redefinida" : `Moldura "${eff.name}" ativada com sucesso! 🖼️`);
      setEquipped(eff.id);
      if (refresh) refresh();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao equipar moldura");
    } finally {
      setBusy(null);
    }
  };

  const saveBatchPrices = async () => {
    setSavingBatch(true);
    try {
      const overrides = {};
      Object.entries(batchPrices).forEach(([id, costVal]) => {
        const c = parseInt(costVal);
        if (!isNaN(c) && c >= 0) {
          overrides[id] = { cost: c };
        }
      });
      await api.put("/effects", { overrides });
      toast.success("Todos os valores das molduras foram salvos com sucesso! ✨");
      await load();
      setQuickBatchMode(false);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao salvar valores em lote");
    } finally {
      setSavingBatch(false);
    }
  };

  return (
    <div id="store-section" className="space-y-6 nb-fade-in scroll-mt-20 sm:scroll-mt-24" data-testid="store-effects">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 border-b-2 border-black pb-5">
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-5xl tracking-tight flex items-center gap-2.5 sm:gap-3">
            <Palette className="w-7 h-7 sm:w-11 sm:h-11 text-amber-500" strokeWidth={2.2} />
            Loja de Molduras de Perfil
          </h1>
          <p className="text-neutral-600 mt-1 max-w-2xl text-sm sm:text-base">
            {isAdmin
              ? "Painel do Administrador: Defina os valores em pontos de cada moldura ou equipe-as para testes."
              : "Troque seus pontos de tarefas escolares por molduras visuais completas que cobrem todo o bloco do seu perfil na tela inicial e no seu avatar!"}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickBatchMode(!quickBatchMode)}
              className={`nb-btn px-4 py-2.5 text-sm font-heading font-black flex items-center gap-2 ${
                quickBatchMode ? "bg-amber-400 text-amber-950" : "bg-white hover:bg-neutral-100"
              }`}
              data-testid="toggle-batch-prices"
            >
              <Sliders className="w-4 h-4" />
              {quickBatchMode ? "Fechar Tabela de Valores" : "Tabela Rápida de Valores"}
            </button>
          </div>
        ) : (
          <div className="nb-card bg-amber-200 px-4 py-2.5 flex items-center justify-between sm:justify-start gap-2.5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto" data-testid="store-points">
            <Coins className="w-6 h-6 text-amber-950" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-900">Seus Pontos para Molduras</div>
              <div className="font-heading font-black text-2xl leading-none text-neutral-950">{points} pts</div>
            </div>
          </div>
        )}
      </div>

      {/* Regra explicativa */}
      <div className="nb-card bg-gradient-to-r from-amber-100 via-sky-100 to-emerald-100 p-4 border-2 border-black flex items-start gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <Sparkles className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-900 space-y-1">
          <p className="font-heading font-black text-sm text-neutral-950">
            🖼️ Como funcionam as Molduras no Edutask:
          </p>
          <p>
            • Ao equipar uma moldura, ela envolve <strong>todo o bloco do seu perfil</strong> na tela de seleção com cores, auras e bordas especiais, além do efeito no seu <strong>avatar</strong>!
          </p>
          <p>
            • Os pontos de entrega de lição servem exclusivamente para desbloquear molduras. O <strong>vencedor final do mês</strong> é avaliado pela <strong>Inteligência Artificial</strong>.
          </p>
          {isAdmin && (
            <p className="font-bold text-amber-900 pt-1">
              💡 <strong>Dica de Admin:</strong> Você pode clicar no botão <strong>"Editar Preço"</strong> em qualquer moldura para definir seu valor exato em pontos.
            </p>
          )}
        </div>
      </div>

      {/* Painel Tabela Rápida de Valores para Admin */}
      {isAdmin && quickBatchMode && (
        <div className="nb-card bg-amber-50/70 p-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 nb-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <h3 className="font-heading font-black text-base">Tabela de Ajuste Rápido de Preços (Pontos)</h3>
            </div>
            <button
              onClick={() => setQuickBatchMode(false)}
              className="p-1 hover:bg-neutral-200 rounded-lg text-xs font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-neutral-600">
            Ajuste os valores de pontos de todas as molduras de uma só vez e clique em <strong>Salvar Todos os Valores</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {effects.map((eff) => (
              <div key={eff.id} className="bg-white p-2.5 rounded-xl border border-black/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xl">{eff.emoji}</span>
                  <span className="text-xs font-bold truncate">{eff.name}</span>
                </div>
                {eff.id === "none" ? (
                  <span className="text-xs font-bold text-neutral-400 px-2 py-1 bg-neutral-100 rounded">Grátis</span>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="99999"
                      value={batchPrices[eff.id] !== undefined ? batchPrices[eff.id] : eff.cost}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchPrices((prev) => ({ ...prev, [eff.id]: val }));
                      }}
                      className="w-16 px-1.5 py-1 text-xs border-2 border-black rounded text-right font-black bg-amber-50"
                    />
                    <span className="text-[10px] font-bold text-neutral-600">pts</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={load}
              className="nb-btn bg-white hover:bg-neutral-100 px-3 py-2 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Redefinir
            </button>
            <button
              type="button"
              onClick={saveBatchPrices}
              disabled={savingBatch}
              className="nb-btn bg-amber-400 hover:bg-amber-300 px-5 py-2 text-sm font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Save className="w-4 h-4" /> {savingBatch ? "Salvando..." : "Salvar Todos os Valores"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500 font-bold">Carregando molduras...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {effects.map((eff) => {
            const isOwned = owned.includes(eff.id) || eff.id === "none";
            const isEquipped = equipped === eff.id || (eff.id === "none" && (!equipped || equipped === "none"));
            const canAfford = points >= eff.cost;
            const rarity = RARITY_META[eff.rarity] || RARITY_META.common;
            const cardCls = effectCardClass(eff.id);
            const badgeCls = effectBadgeClass(eff.id);
            const cls = effectClass(eff.id);

            return (
              <div
                key={eff.id}
                className={`nb-card p-4 flex flex-col justify-between transition-all duration-200 relative ${
                  isEquipped ? "ring-4 ring-emerald-400 bg-emerald-50/20" : "bg-white"
                }`}
                data-testid={`effect-card-${eff.id}`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{eff.emoji}</span>
                      <div>
                        <h3 className="font-heading font-bold text-base leading-tight">{eff.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`nb-badge ${rarity.bg} text-[9px]`}>{rarity.label}</span>
                          {eff.id !== "none" && (
                            <span className="nb-badge bg-amber-200 text-amber-950 text-[9px] font-black">
                              {eff.cost} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && eff.id !== "none" && (
                      <button
                        onClick={() => setEditing(eff)}
                        className="nb-btn bg-amber-200 hover:bg-amber-300 px-2.5 py-1 text-xs font-bold flex items-center gap-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                        title="Escolher e alterar valor desta moldura"
                        data-testid={`edit-price-${eff.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Preço</span>
                      </button>
                    )}
                  </div>

                  {/* Preview da Moldura: Visual Completo no Bloco do Perfil */}
                  <div className="p-3 rounded-xl border-2 border-black/20 mb-3 bg-neutral-50/80 space-y-2">
                    <div className="text-[10px] font-black uppercase text-neutral-600 flex items-center justify-between">
                      <span>Visual no Bloco do Perfil:</span>
                      <span className="text-[9px] opacity-75">Prévia</span>
                    </div>

                    <div className={`p-3 rounded-lg text-center transition-all duration-300 relative overflow-hidden ${cardCls}`}>
                      <MolduraArtCenter effectId={eff.id} />
                      <div className="relative z-10">
                        <div className="mx-auto mb-2 inline-block">
                          <Avatar
                            userId={`preview-${eff.id}`}
                            name={user?.name || "Aluno"}
                            size={52}
                            hasAvatar={user?.has_avatar}
                            bg={isAdmin ? "bg-red-300" : "bg-sky-300"}
                            effect={cls}
                          />
                        </div>
                        <div className="truncate text-xs font-heading font-bold text-black">{user?.name || "Seu Nome"}</div>
                        <div className="mt-1.5 flex justify-center">
                          <span className={`nb-badge text-[9px] ${badgeCls}`}>
                            {isAdmin ? "Admin" : "Aluno"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Features pill */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-neutral-600 font-medium">
                      <span className="bg-white px-1.5 py-0.5 rounded border border-black/10">Bloco Inteiro</span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-black/10">Avatar com Aura</span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-black/10">Badge</span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 mb-3 min-h-[32px] leading-relaxed">{eff.description}</p>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  {isAdmin ? (
                    <div className="grid grid-cols-2 gap-2">
                      {eff.id !== "none" && (
                        <button
                          onClick={() => setEditing(eff)}
                          className="nb-btn bg-amber-300 hover:bg-amber-400 py-2 text-xs font-heading font-black flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Valor ({eff.cost} pts)
                        </button>
                      )}
                      <button
                        onClick={() => equip(eff)}
                        disabled={isEquipped || busy === eff.id}
                        className={`nb-btn py-2 text-xs font-heading font-black ${
                          eff.id === "none" ? "col-span-2" : ""
                        } ${
                          isEquipped
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-sky-300 hover:bg-sky-400 text-slate-950"
                        }`}
                        data-testid={`equip-${eff.id}`}
                      >
                        {isEquipped ? "✓ Ativada" : "Testar Moldura"}
                      </button>
                    </div>
                  ) : (
                    <>
                      {eff.id === "none" ? (
                        <button
                          onClick={() => equip(eff)}
                          disabled={isEquipped || busy === eff.id}
                          className={`nb-btn w-full py-2 text-sm font-heading font-black ${
                            isEquipped ? "bg-emerald-200 text-emerald-950" : "bg-white hover:bg-neutral-100"
                          }`}
                          data-testid={`equip-${eff.id}`}
                        >
                          {isEquipped ? (<><Check className="w-4 h-4 inline mr-1" /> Moldura Padrão Ativa</>) : "Usar Sem Moldura"}
                        </button>
                      ) : isOwned ? (
                        <button
                          onClick={() => equip(eff)}
                          disabled={isEquipped || busy === eff.id}
                          className={`nb-btn w-full py-2 text-sm font-heading font-black ${
                            isEquipped ? "bg-emerald-400 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-sky-400 hover:bg-sky-300 text-slate-950"
                          }`}
                          data-testid={`equip-${eff.id}`}
                        >
                          {isEquipped ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Moldura Ativada
                            </span>
                          ) : (
                            "Equipar Moldura 🖼️"
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => buy(eff)}
                          disabled={!canAfford || busy === eff.id}
                          className={`nb-btn w-full py-2 text-sm font-heading font-black flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? "bg-amber-300 hover:bg-amber-400 text-amber-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              : "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                          }`}
                          data-testid={`buy-${eff.id}`}
                        >
                          {canAfford ? <Coins className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          {busy === eff.id ? "Comprando..." : canAfford ? `Comprar Moldura (${eff.cost} pts)` : `Bloqueado (${eff.cost} pts)`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog for Admin to edit frame cost */}
      {editing && (
        <EditPriceDialog
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

function EditPriceDialog({ effect, onClose, onSaved }) {
  const [cost, setCost] = useState(effect.cost !== undefined ? effect.cost : 100);
  const [saving, setSaving] = useState(false);

  // Trava completamente a rolagem da página enquanto estiver na seleção de preço
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const handleWheel = (e) => {
      // Se não for scroll interno permitido, previne
      const target = e.target;
      if (!target.closest?.(".allow-internal-scroll")) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchmove", handleWheel, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleWheel);
    };
  }, []);

  const presets = [0, 50, 80, 100, 120, 150, 200, 250, 300, 500, 800, 1000];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const parsedCost = Math.max(0, parseInt(cost) || 0);
    try {
      // Envia requisição para atualizar o valor da moldura
      await api.put(`/effects/${effect.id}`, { cost: parsedCost });
      toast.success(`Preço da moldura "${effect.name}" atualizado para ${parsedCost} pts com sucesso! 💰`);
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao atualizar preço da moldura");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 nb-fade-in overscroll-none touch-none"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white border-2 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md w-full space-y-4 touch-auto overscroll-contain select-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{effect.emoji}</span>
            <div>
              <h3 className="font-heading font-black text-lg leading-tight">Escolher Valor da Moldura</h3>
              <p className="text-xs text-neutral-500 font-bold">{effect.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Defina quantos pontos de tarefas escolares os alunos precisam acumular para desbloquear esta moldura na loja.
        </p>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Valor em Pontos (Custo)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="99999"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="nb-input w-full text-lg font-black"
                required
                autoFocus
              />
              <span className="font-heading font-black text-sm text-neutral-700 whitespace-nowrap">
                pts
              </span>
            </div>
          </div>

          {/* Atalhos rápidos de valores */}
          <div>
            <div className="text-[10px] font-bold uppercase text-neutral-500 mb-1.5">
              Valores Rápidos:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCost(p)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border border-black/30 transition-all ${
                    parseInt(cost) === p
                      ? "bg-amber-400 text-amber-950 font-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                  }`}
                >
                  {p === 0 ? "Grátis (0)" : `${p} pts`}
                </button>
              ))}
            </div>
          </div>

          {/* Incrementos rápidos */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCost((prev) => Math.max(0, (parseInt(prev) || 0) - 50))}
              className="px-2 py-1 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 rounded border border-black/20"
            >
              -50 pts
            </button>
            <button
              type="button"
              onClick={() => setCost((prev) => Math.max(0, (parseInt(prev) || 0) - 10))}
              className="px-2 py-1 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 rounded border border-black/20"
            >
              -10 pts
            </button>
            <button
              type="button"
              onClick={() => setCost((prev) => (parseInt(prev) || 0) + 10)}
              className="px-2 py-1 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 rounded border border-black/20"
            >
              +10 pts
            </button>
            <button
              type="button"
              onClick={() => setCost((prev) => (parseInt(prev) || 0) + 50)}
              className="px-2 py-1 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 rounded border border-black/20"
            >
              +50 pts
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end pt-3 border-t border-black/10">
            <button type="button" onClick={onClose} className="nb-btn bg-white hover:bg-neutral-100 px-3.5 py-2 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nb-btn bg-amber-400 hover:bg-amber-300 px-5 py-2 text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Valor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
