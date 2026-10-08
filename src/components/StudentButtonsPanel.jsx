import React, { useState, useEffect, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Link2,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  MousePointerClick,
  HelpCircle,
  Globe,
  Loader2,
} from "lucide-react";

export const BUTTON_COLORS = [
  { id: "emerald", label: "Verde Esmeralda", bg: "bg-emerald-400 text-emerald-950", border: "border-emerald-800", shadow: "shadow-[3px_3px_0px_0px_rgba(6,78,59,1)] hover:bg-emerald-300" },
  { id: "sky", label: "Azul Céu", bg: "bg-sky-400 text-sky-950", border: "border-sky-800", shadow: "shadow-[3px_3px_0px_0px_rgba(3,105,161,1)] hover:bg-sky-300" },
  { id: "indigo", label: "Azul Índigo", bg: "bg-indigo-400 text-indigo-950", border: "border-indigo-900", shadow: "shadow-[3px_3px_0px_0px_rgba(49,46,129,1)] hover:bg-indigo-300" },
  { id: "violet", label: "Roxo Violeta", bg: "bg-violet-400 text-violet-950", border: "border-violet-900", shadow: "shadow-[3px_3px_0px_0px_rgba(76,29,149,1)] hover:bg-violet-300" },
  { id: "amber", label: "Amarelo Âmbar", bg: "bg-amber-300 text-amber-950", border: "border-amber-700", shadow: "shadow-[3px_3px_0px_0px_rgba(180,83,9,1)] hover:bg-amber-200" },
  { id: "rose", label: "Rosa / Carmim", bg: "bg-rose-400 text-rose-950", border: "border-rose-900", shadow: "shadow-[3px_3px_0px_0px_rgba(136,19,55,1)] hover:bg-rose-300" },
  { id: "cyan", label: "Ciano Neon", bg: "bg-cyan-300 text-cyan-950", border: "border-cyan-800", shadow: "shadow-[3px_3px_0px_0px_rgba(14,116,144,1)] hover:bg-cyan-200" },
  { id: "dark", label: "Preto / Escuro", bg: "bg-neutral-900 text-white", border: "border-black", shadow: "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800" },
];

export const PRESET_ICONS = ["🔗", "📚", "🎥", "🌐", "📝", "💡", "🚀", "💬", "🧪", "📊", "🏆", "⭐", "📂", "📌", "🎓"];

export function getButtonColorStyle(colorId) {
  const found = BUTTON_COLORS.find((c) => c.id === colorId);
  return found || BUTTON_COLORS[0];
}

export default function StudentButtonsPanel() {
  const [buttons, setButtons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBtn, setEditingBtn] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("emerald");
  const [icon, setIcon] = useState("🔗");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadButtons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/student-buttons");
      setButtons(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao carregar botões");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadButtons();
  }, [loadButtons]);

  const openCreateModal = () => {
    setEditingBtn(null);
    setName("");
    setUrl("");
    setDescription("");
    setColor("emerald");
    setIcon("🔗");
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (btn) => {
    setEditingBtn(btn);
    setName(btn.name);
    setUrl(btn.url);
    setDescription(btn.description || "");
    setColor(btn.color || "emerald");
    setIcon(btn.icon || "🔗");
    setActive(btn.active !== false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para o botão.");
      return;
    }
    if (!url.trim()) {
      toast.error("Informe o link de destino.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
        color,
        icon,
        active,
      };

      if (editingBtn) {
        await api.put(`/student-buttons/${editingBtn.id}`, payload);
        toast.success(`Botão "${name}" atualizado com sucesso!`);
      } else {
        await api.post("/student-buttons", payload);
        toast.success(`Botão "${name}" criado com sucesso para os alunos!`);
      }

      setModalOpen(false);
      loadButtons();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao salvar botão.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (btn) => {
    try {
      await api.put(`/student-buttons/${btn.id}`, { active: !btn.active });
      toast.success(
        !btn.active
          ? `Botão "${btn.name}" ativado e visível aos alunos!`
          : `Botão "${btn.name}" desativado.`
      );
      setButtons((prev) =>
        prev.map((b) => (b.id === btn.id ? { ...b, active: !b.active } : b))
      );
    } catch (err) {
      toast.error("Falha ao atualizar status do botão.");
    }
  };

  const handleDelete = async (btn) => {
    if (!window.confirm(`Tem certeza que deseja excluir o botão "${btn.name}"?`)) return;
    setDeletingId(btn.id);
    try {
      await api.delete(`/student-buttons/${btn.id}`);
      toast.success(`Botão "${btn.name}" excluído.`);
      setButtons((prev) => prev.filter((b) => b.id !== btn.id));
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao excluir botão.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 nb-fade-in" data-testid="student-buttons-panel">
      {/* Banner de Apresentação */}
      <div className="nb-card bg-gradient-to-r from-sky-100 via-indigo-50 to-emerald-100 p-5 sm:p-7 border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl sm:text-2xl text-neutral-900 leading-tight">
                Botões & Links para Alunos
              </h2>
              <span className="nb-badge bg-black text-white text-[11px] font-bold">
                Acessos Rápidos Personalizados
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed pt-1">
            Crie botões personalizados que levam os alunos diretamente para qualquer link da sua escolha
            (Google Classroom, videoaulas, apostilas, formulários, simulados, bibliotecas digitais, etc.).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-4 py-2.5 text-sm font-heading font-black flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] self-start sm:self-auto flex-shrink-0"
          data-testid="create-student-button-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Botão</span>
        </button>
      </div>

      {/* Lista de Botões */}
      {loading ? (
        <div className="nb-card p-12 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
          <span className="text-sm font-bold text-neutral-600">Carregando botões dos alunos...</span>
        </div>
      ) : buttons.length === 0 ? (
        <div className="nb-card p-10 sm:p-14 text-center space-y-4 border-2 border-dashed border-neutral-400 bg-neutral-50/60">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 border-2 border-black flex items-center justify-center mx-auto text-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            🔗
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-heading font-black text-lg text-neutral-900">
              Nenhum botão criado ainda
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600">
              Crie seu primeiro botão com um nome e o link desejado para que os alunos vejam na tela inicial deles!
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-5 py-2.5 text-sm font-heading font-black inline-flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Meu Primeiro Botão</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700 px-1">
            <span>
              Total de <b>{buttons.length}</b> botão(ões) configurado(s) ({buttons.filter((b) => b.active).length} ativos para alunos)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buttons.map((btn) => {
              const colorStyle = getButtonColorStyle(btn.color);
              return (
                <div
                  key={btn.id}
                  className={`nb-card p-4 sm:p-5 flex flex-col justify-between gap-4 border-2 transition-all ${
                    btn.active ? "bg-white" : "bg-neutral-100 opacity-60 border-neutral-400"
                  }`}
                  data-testid={`student-button-card-${btn.id}`}
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="nb-badge bg-neutral-200 text-neutral-800 text-[10px] font-bold">
                        {btn.icon || "🔗"} {colorStyle.label}
                      </span>
                      <button
                        onClick={() => handleToggleActive(btn)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border border-black flex items-center gap-1 ${
                          btn.active
                            ? "bg-emerald-200 text-emerald-950"
                            : "bg-neutral-300 text-neutral-700"
                        }`}
                        title={btn.active ? "Clique para desativar" : "Clique para ativar"}
                      >
                        {btn.active ? (
                          <>
                            <Eye className="w-3 h-3" /> Ativo
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Oculto
                          </>
                        )}
                      </button>
                    </div>

                    {/* Pré-visualização do Botão como o Aluno Vê */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">
                        Visualização para o Aluno:
                      </div>
                      <a
                        href={btn.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full text-left p-3 rounded-xl border-2 border-black flex items-center justify-between gap-2 font-heading font-black text-sm transition-transform active:translate-y-0.5 ${colorStyle.bg} ${colorStyle.shadow}`}
                        title={`Abrir link: ${btn.url}`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="text-base">{btn.icon || "🔗"}</span>
                          <span className="truncate">{btn.name}</span>
                        </span>
                        <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-80" />
                      </a>
                    </div>

                    {/* Descrição & URL */}
                    {btn.description && (
                      <p className="text-xs text-neutral-600 line-clamp-2 italic">
                        "{btn.description}"
                      </p>
                    )}

                    <div className="text-[11px] text-neutral-600 truncate bg-neutral-50 p-2 rounded border border-black/10 font-mono">
                      <span className="text-neutral-400 mr-1">URL:</span>
                      {btn.url}
                    </div>
                  </div>

                  {/* Rodapé do Card com Ações */}
                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500" title="Cliques registrados por alunos">
                      <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />
                      <span><b>{btn.click_count || 0}</b> cliques</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={btn.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nb-btn px-2.5 py-1 text-[11px] bg-white hover:bg-neutral-100 flex items-center gap-1"
                        title="Testar link"
                      >
                        <ExternalLink className="w-3 h-3" /> Testar
                      </a>
                      <button
                        onClick={() => openEditModal(btn)}
                        className="nb-btn px-2.5 py-1 text-[11px] bg-white hover:bg-neutral-100 flex items-center gap-1"
                        title="Editar botão"
                        data-testid={`edit-button-${btn.id}`}
                      >
                        <Edit2 className="w-3 h-3 text-sky-700" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(btn)}
                        disabled={deletingId === btn.id}
                        className="nb-btn px-2.5 py-1 text-[11px] bg-red-100 hover:bg-red-200 text-red-900 flex items-center gap-1"
                        title="Excluir botão"
                        data-testid={`delete-button-${btn.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 nb-fade-in backdrop-blur-xs"
          data-testid="student-button-modal"
        >
          <div className="nb-card bg-white w-full max-w-lg p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-400 text-indigo-950 border-2 border-black flex items-center justify-center font-bold">
                  🔗
                </div>
                <h3 className="font-heading font-black text-lg sm:text-xl">
                  {editingBtn ? "Editar Botão para Alunos" : "Criar Novo Botão para Alunos"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="nb-btn bg-white hover:bg-neutral-100 p-1.5"
                data-testid="close-button-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Nome do Botão */}
              <div>
                <label className="block text-xs font-bold mb-1 text-neutral-800">
                  Nome do Botão <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Google Sala de Aula, Link da Videoaula, Apostila Virtual..."
                  className="nb-input bg-white text-sm font-bold"
                  data-testid="input-button-name"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Este é o texto que os alunos verão gravado no botão.
                </p>
              </div>

              {/* Link de Escolha */}
              <div>
                <label className="block text-xs font-bold mb-1 text-neutral-800">
                  Link / URL de Sua Escolha <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com/pagina-ou-aula"
                  className="nb-input bg-white text-sm font-mono"
                  data-testid="input-button-url"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Cole o link completo para onde o aluno será direcionado ao clicar.
                </p>
              </div>

              {/* Descrição / Dica (Opcional) */}
              <div>
                <label className="block text-xs font-bold mb-1 text-neutral-800">
                  Descrição ou Orientações Extras (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Acesse os slides da aula ou tire suas dúvidas"
                  className="nb-input bg-white text-xs"
                  data-testid="input-button-description"
                />
              </div>

              {/* Escolha do Ícone / Emoji */}
              <div>
                <label className="block text-xs font-bold mb-1 text-neutral-800">
                  Ícone / Emoji do Botão
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-100 rounded-xl border border-black/20">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setIcon(emoji)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        icon === emoji
                          ? "bg-amber-300 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-110"
                          : "bg-white hover:bg-neutral-200 border border-neutral-300"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Escolha da Cor / Tema */}
              <div>
                <label className="block text-xs font-bold mb-1 text-neutral-800">
                  Cor & Estilo Visual
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUTTON_COLORS.map((col) => (
                    <button
                      type="button"
                      key={col.id}
                      onClick={() => setColor(col.id)}
                      className={`p-2 rounded-xl border-2 text-xs font-bold flex items-center gap-1.5 justify-center transition-all ${
                        col.bg
                      } ${
                        color === col.id
                          ? "border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ring-2 ring-black"
                          : "border-black/30 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <span>{icon || "🔗"}</span>
                      <span>{col.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="btn-active-check"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-black text-emerald-600 focus:ring-0 cursor-pointer"
                  data-testid="input-button-active"
                />
                <label htmlFor="btn-active-check" className="text-xs font-bold text-neutral-800 cursor-pointer">
                  Visível para os alunos na tela inicial (Ativo)
                </label>
              </div>

              {/* Pré-visualização ao Vivo */}
              <div className="bg-neutral-100 p-3.5 rounded-xl border-2 border-black space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500">
                  Prévia em Tempo Real para os Alunos:
                </span>
                {(() => {
                  const style = getButtonColorStyle(color);
                  return (
                    <div
                      className={`p-3 rounded-xl border-2 border-black flex items-center justify-between gap-2 font-heading font-black text-sm ${style.bg} ${style.shadow}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-base">{icon || "🔗"}</span>
                        <span className="truncate">{name || "Nome do Botão"}</span>
                      </span>
                      <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-80" />
                    </div>
                  );
                })()}
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/20">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="nb-btn bg-white hover:bg-neutral-100 px-4 py-2 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-5 py-2 text-xs font-heading font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="submit-student-button-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingBtn ? "Salvar Alterações" : "Criar Botão"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
