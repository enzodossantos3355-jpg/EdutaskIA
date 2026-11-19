import { useState } from "react";
import { toast } from "sonner";
import { ListTodo, Megaphone, BookOpen, AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import { useAIStatus, LAST_AREA_REQUIRED_MESSAGE } from "@/context/AIStatusContext";

const STUDENT_AREAS_META = [
  {
    key: "tasks",
    label: "Tarefas",
    description:
      "Atividades, prazos, entregas, cronograma de aulas e tira-dúvidas vinculados às tarefas.",
    icon: ListTodo,
    accentBg: "bg-sky-100",
    iconBg: "bg-sky-300",
  },
  {
    key: "announcements",
    label: "Avisos",
    description:
      "Comunicados gerais, avisos especiais em pop-up, notificações e comentários dos alunos.",
    icon: Megaphone,
    accentBg: "bg-violet-100",
    iconBg: "bg-violet-300",
  },
  {
    key: "resumos",
    label: "Resumos de Estudo",
    description:
      "Biblioteca de materiais, textos formatados e arquivos de revisão por matéria.",
    icon: BookOpen,
    accentBg: "bg-amber-100",
    iconBg: "bg-amber-300",
  },
];

export default function AdminStudentAreasPanel() {
  const { studentAreas, toggleStudentArea } = useAIStatus();
  const [savingKey, setSavingKey] = useState(null);
  const [ruleAlert, setRuleAlert] = useState("");

  const activeCount = STUDENT_AREAS_META.filter((item) => studentAreas?.[item.key] !== false).length;

  const handleToggle = async (areaKey) => {
    if (savingKey) return;
    const currentEnabled = studentAreas?.[areaKey] !== false;
    const nextEnabled = !currentEnabled;

    setRuleAlert("");
    setSavingKey(areaKey);
    try {
      await toggleStudentArea(areaKey, nextEnabled);
      const areaLabel = STUDENT_AREAS_META.find((m) => m.key === areaKey)?.label || areaKey;
      toast.success(
        nextEnabled
          ? `Área "${areaLabel}" ativada para os alunos.`
          : `Área "${areaLabel}" desativada para os alunos.`
      );
    } catch (err) {
      const msg = err?.message || LAST_AREA_REQUIRED_MESSAGE;
      if (msg.includes("Mantenha pelo menos uma área ativa")) {
        setRuleAlert(LAST_AREA_REQUIRED_MESSAGE);
      } else {
        setRuleAlert(msg);
      }
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-student-areas-panel">
      <div className="nb-card bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-200 border-2 border-neutral-900 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]">
              <ShieldCheck className="w-6 h-6 text-neutral-900" />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl sm:text-2xl text-neutral-900">
                Áreas Visíveis para os Alunos
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                Ative ou desative globalmente o acesso dos alunos a Tarefas, Avisos e Resumos de Estudo sem apagar nenhum dado.
              </p>
            </div>
          </div>

          <span
            className="nb-badge bg-slate-100 text-neutral-900 text-xs font-bold px-3 py-1.5 self-start sm:self-center flex-shrink-0"
            data-testid="student-areas-active-count"
          >
            {activeCount} de {STUDENT_AREAS_META.length} ativas
          </span>
        </div>

        {ruleAlert && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-amber-100 border-2 border-amber-700 text-amber-950 flex items-center gap-2.5 text-xs sm:text-sm font-bold shadow-[2px_2px_0_0_rgba(180,83,9,0.5)]"
            data-testid="student-areas-rule-alert"
          >
            <AlertTriangle className="w-5 h-5 text-amber-800 flex-shrink-0" />
            <span>{ruleAlert}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STUDENT_AREAS_META.map((area) => {
            const Icon = area.icon;
            const isEnabled = studentAreas?.[area.key] !== false;
            const isSaving = savingKey === area.key;

            return (
              <div
                key={area.key}
                className={`nb-card p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isEnabled ? "bg-white" : "bg-neutral-100 border-neutral-400"
                }`}
                data-testid={`student-area-card-${area.key}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-neutral-900 flex items-center justify-center flex-shrink-0 ${
                        isEnabled ? area.iconBg : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {isEnabled ? (
                        <Icon className="w-5 h-5 text-neutral-900" />
                      ) : (
                        <Lock className="w-5 h-5 text-neutral-600" />
                      )}
                    </div>
                    <span
                      className={`nb-badge text-xs font-black px-2.5 py-0.5 ${
                        isEnabled
                          ? "bg-emerald-200 text-emerald-950 border border-emerald-900"
                          : "bg-neutral-300 text-neutral-800 border border-neutral-600"
                      }`}
                      data-testid={`student-area-status-${area.key}`}
                    >
                      {isEnabled ? "Ativa" : "Desativada"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-black text-base sm:text-lg text-neutral-900">
                      {area.label}
                    </h3>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      {area.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-neutral-700">
                    {isEnabled ? "Visível aos alunos" : "Bloqueada para alunos"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Alternar área ${area.label}`}
                    disabled={Boolean(savingKey)}
                    onClick={() => handleToggle(area.key)}
                    data-testid={`student-area-switch-${area.key}`}
                    className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 ${
                      isEnabled ? "bg-emerald-400" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white border border-neutral-900 shadow transition-transform ${
                        isEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-neutral-700 space-y-1">
          <p className="font-bold text-neutral-900">Como funciona para administradores e alunos:</p>
          <p>
            • Ao menos uma das três áreas deve permanecer ativa para os alunos (ordem inicial de entrada: Tarefas → Avisos → Resumos).
          </p>
          <p>
            • Áreas desativadas continuam aparecendo na barra do aluno com um cadeado e exibem uma tela em tons de cinza sem revelar conteúdos.
          </p>
          <p>
            • Você continua podendo criar, editar e gerenciar normalmente os conteúdos das áreas desativadas aqui no painel administrativo.
          </p>
        </div>
      </div>
    </div>
  );
}
