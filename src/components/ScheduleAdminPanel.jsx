import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  X,
  Save,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { getSubjectColorConfig, setCachedSubjects } from "@/lib/subjectColors";

const WEEKDAYS = [
  { key: "monday", label: "Segunda-feira", short: "Seg" },
  { key: "tuesday", label: "Terça-feira", short: "Ter" },
  { key: "wednesday", label: "Quarta-feira", short: "Qua" },
  { key: "thursday", label: "Quinta-feira", short: "Qui" },
  { key: "friday", label: "Sexta-feira", short: "Sex" },
];

const EMPTY_SCHEDULE = {
  enabled: true,
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
};

export default function ScheduleAdminPanel() {
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
  const [todayInfo, setTodayInfo] = useState({ today_key: null, today_label: "", is_weekend: false });
  const [subjects, setSubjects] = useState([]);
  const [customInputs, setCustomInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, subjRes] = await Promise.all([
        api.get("/schedule"),
        api.get("/subjects").catch(() => ({ data: [] })),
      ]);
      const data = schedRes?.data;
      if (!data || typeof data !== "object") throw new Error("Resposta inválida");
      if (data?.schedule) {
        setSchedule({
          enabled: data.schedule.enabled !== false,
          monday: Array.isArray(data.schedule.monday) ? data.schedule.monday : [],
          tuesday: Array.isArray(data.schedule.tuesday) ? data.schedule.tuesday : [],
          wednesday: Array.isArray(data.schedule.wednesday) ? data.schedule.wednesday : [],
          thursday: Array.isArray(data.schedule.thursday) ? data.schedule.thursday : [],
          friday: Array.isArray(data.schedule.friday) ? data.schedule.friday : [],
        });
      }
      setTodayInfo({
        today_key: data?.today_key || null,
        today_label: data?.today_label || "",
        is_weekend: Boolean(data?.is_weekend),
      });
      const subjList = Array.isArray(subjRes?.data) ? subjRes.data : [];
      setSubjects(subjList);
      setCachedSubjects(subjList);
      setDirty(false);
    } catch (e) {
      try {
        const [sys, subjList] = await Promise.all([
          firebaseService.getSettings("system").catch(() => null),
          firebaseService.getAllSubjects().catch(() => []),
        ]);
        if (sys?.weekly_schedule) {
          const ws = sys.weekly_schedule;
          setSchedule({
            enabled: ws.enabled !== false,
            monday: Array.isArray(ws.monday) ? ws.monday : [],
            tuesday: Array.isArray(ws.tuesday) ? ws.tuesday : [],
            wednesday: Array.isArray(ws.wednesday) ? ws.wednesday : [],
            thursday: Array.isArray(ws.thursday) ? ws.thursday : [],
            friday: Array.isArray(ws.friday) ? ws.friday : [],
          });
        }
        const safeSubjs = Array.isArray(subjList) ? subjList : [];
        setSubjects(safeSubjs);
        setCachedSubjects(safeSubjs);
        setDirty(false);
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail || e2?.message) || "Erro ao carregar cronograma");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSubjectForDay = (dayKey, subjectName) => {
    const clean = subjectName.trim();
    if (!clean) return;
    setSchedule((prev) => {
      const current = prev[dayKey] || [];
      const exists = current.some((item) => item.toLowerCase() === clean.toLowerCase());
      const nextList = exists
        ? current.filter((item) => item.toLowerCase() !== clean.toLowerCase())
        : [...current, clean];
      return { ...prev, [dayKey]: nextList };
    });
    setDirty(true);
  };

  const addCustomItemForDay = (dayKey) => {
    const raw = (customInputs[dayKey] || "").trim();
    if (!raw) return;
    setSchedule((prev) => {
      const current = prev[dayKey] || [];
      const exists = current.some((item) => item.toLowerCase() === raw.toLowerCase());
      if (exists) return prev;
      return { ...prev, [dayKey]: [...current, raw] };
    });
    setCustomInputs((prev) => ({ ...prev, [dayKey]: "" }));
    setDirty(true);
  };

  const removeItemForDay = (dayKey, itemToRemove) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((item) => item !== itemToRemove),
    }));
    setDirty(true);
  };

  const clearDay = (dayKey) => {
    setSchedule((prev) => ({ ...prev, [dayKey]: [] }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/schedule", schedule);
      if (data?.schedule) {
        setSchedule({
          enabled: data.schedule.enabled !== false,
          monday: data.schedule.monday || [],
          tuesday: data.schedule.tuesday || [],
          wednesday: data.schedule.wednesday || [],
          thursday: data.schedule.thursday || [],
          friday: data.schedule.friday || [],
        });
      }
      setDirty(false);
      toast.success("Cronograma semanal salvo com sucesso!");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao salvar cronograma");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-card p-10 bg-white flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
        <span className="text-sm font-bold text-neutral-600">Carregando cronograma semanal...</span>
      </div>
    );
  }

  const totalConfiguredDays = WEEKDAYS.filter((d) => (schedule[d.key] || []).length > 0).length;

  return (
    <div className="space-y-5 nb-fade-in" data-testid="schedule-admin-panel">
      {/* Cabeçalho e Controles */}
      <div className="nb-card p-5 bg-white border-2 border-black flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-emerald-200 border-2 border-black flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-950" />
            </div>
            <h2 className="font-heading font-black text-xl text-neutral-900">
              Cronograma do Dia (Segunda a Sexta)
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-700 tabular-nums">
              {totalConfiguredDays}/5 dias preenchidos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600">
            Configure as matérias necessárias de cada dia da semana. O painel do aluno exibe automaticamente apenas as matérias do dia útil atual (finais de semana não contam).
          </p>
          {todayInfo.is_weekend && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1 inline-block mt-1">
              Hoje é {todayInfo.today_label}: finais de semana não exibem cronograma aos alunos.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }));
              setDirty(true);
            }}
            className={`nb-btn px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 ${
              schedule.enabled ? "bg-emerald-100 text-emerald-950" : "bg-neutral-200 text-neutral-700"
            }`}
            data-testid="toggle-schedule-enabled"
          >
            {schedule.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{schedule.enabled ? "Visível aos alunos" : "Oculto aos alunos"}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`nb-btn px-4 py-2 text-xs sm:text-sm font-heading font-black flex items-center gap-1.5 ${
              dirty
                ? "bg-emerald-400 hover:bg-emerald-500 text-emerald-950 shadow-[3px_3px_0_0_#000]"
                : "bg-sky-300 hover:bg-sky-400 text-black"
            }`}
            data-testid="save-schedule-button"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Salvando..." : dirty ? "Salvar Alterações" : "Salvar Cronograma"}</span>
          </button>
        </div>
      </div>

      {/* Dias Úteis (Segunda a Sexta) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {WEEKDAYS.map((day) => {
          const dayItems = schedule[day.key] || [];
          const isToday = !todayInfo.is_weekend && todayInfo.today_key === day.key;

          return (
            <div
              key={day.key}
              className={`nb-card p-4 bg-white border-2 border-black flex flex-col justify-between gap-3 ${
                isToday ? "ring-2 ring-emerald-500/40" : ""
              }`}
              data-testid={`schedule-day-${day.key}`}
            >
              <div className="space-y-3">
                {/* Título do dia */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-base text-neutral-900">
                      {day.label}
                    </h3>
                    {isToday && (
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-950 border border-black">
                        Hoje
                      </span>
                    )}
                  </div>
                  {dayItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearDay(day.key)}
                      className="text-[11px] font-bold text-neutral-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                      title={`Limpar matérias de ${day.label}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                {/* Selecionadas no dia */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    Matérias do dia ({dayItems.length})
                  </p>
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-1.5">
                      Nenhuma matéria adicionada.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {dayItems.map((item) => {
                        const cfg = getSubjectColorConfig(item);
                        return (
                          <span
                            key={item}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/80 text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={() => removeItemForDay(day.key, item)}
                              className="hover:opacity-70 ml-0.5"
                              aria-label={`Remover ${item}`}
                            >
                              <X className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Seleção rápida das matérias cadastradas */}
                {subjects.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                      Matérias cadastradas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((s) => {
                        const selected = dayItems.some(
                          (item) => item.toLowerCase() === s.name.toLowerCase()
                        );
                        const cfg = getSubjectColorConfig(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSubjectForDay(day.key, s.name)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-colors flex items-center gap-1 ${
                              selected
                                ? `${cfg.badgeBg} ${cfg.badgeText} border-black`
                                : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300"
                            }`}
                          >
                            {selected ? (
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            <span>{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Adicionar matéria personalizada */}
              <div className="pt-2 border-t border-neutral-200 flex items-center gap-1.5">
                <input
                  type="text"
                  value={customInputs[day.key] || ""}
                  onChange={(e) =>
                    setCustomInputs((prev) => ({ ...prev, [day.key]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomItemForDay(day.key);
                    }
                  }}
                  placeholder="Outra matéria ou material..."
                  className="nb-input flex-1 text-xs py-1.5 px-2.5 bg-white"
                  data-testid={`schedule-custom-input-${day.key}`}
                />
                <button
                  type="button"
                  onClick={() => addCustomItemForDay(day.key)}
                  className="nb-btn bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                  data-testid={`schedule-custom-add-${day.key}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
