import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, User, Wrench, Lock, BookOpen, Pencil, Bot } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";
import api, { formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import MolduraArtCenter from "@/components/MolduraArtCenter";
import ImageMolduraCard, { hasImageMoldura } from "@/components/ImageMolduraCard";
import MentalistMotifs from "@/components/MentalistMotifs";
import { effectClass, effectCardClass, effectBadgeClass, isDarkTheme } from "@/lib/effects";

const STATUS_META = {
  active: { label: null, icon: null, bg: null, dim: false },
  bot: { label: null, icon: null, bg: null, dim: false },
  maintenance: { label: "Manutenção", icon: Wrench, bg: "bg-orange-300", dim: true },
  blocked: { label: "Bloqueado", icon: Lock, bg: "bg-neutral-400", dim: true },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { framesDisabled } = useAIStatus();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (selected) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selected]);

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/aluno", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    let apiLoaded = false;
    let fallbackLoaded = false;

    const mapFirestoreUsers = (users) =>
      users
        .map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          status: u.status || "active",
          has_avatar: Boolean(u.avatar_data),
          points: u.points || 0,
          equipped_effect: u.equipped_effect || "none",
        }))
        .sort((a, b) => {
          if (a.role === "admin" && b.role !== "admin") return -1;
          if (a.role !== "admin" && b.role === "admin") return 1;
          return (a.name || "").localeCompare(b.name || "");
        });

    const loadFirestoreProfiles = async () => {
      try {
        const users = await firebaseService.getAllUsers();
        if (cancelled || apiLoaded) return false;
        if (Array.isArray(users) && users.length > 0) {
          fallbackLoaded = true;
          setProfiles(mapFirestoreUsers(users));
          setLoading(false);
          return true;
        }
      } catch (e2) {
        console.warn("Firestore profiles load fallback:", e2);
      }
      return false;
    };

    // Fast 2.5s cold-start guard: show Firestore profiles quickly if Render/server is sleeping
    const fastFallbackTimer = setTimeout(() => {
      if (!cancelled && !apiLoaded) {
        loadFirestoreProfiles();
      }
    }, 2500);

    const load = async () => {
      try {
        const res = await api.get("/auth/profiles", { timeout: 8000 });
        const data = res?.data;
        const serverSynced = res?.headers?.["x-edutask-firebase-synced"] !== "false";
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          // If server hasn't synced Firestore yet and only has seed profiles, fetch directly from Firestore too
          if (!serverSynced && data.length <= 2) {
            const okDirect = await loadFirestoreProfiles();
            if (okDirect) {
              clearTimeout(fastFallbackTimer);
              return;
            }
          }
          apiLoaded = true;
          clearTimeout(fastFallbackTimer);
          setProfiles(data);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("API load profiles fallback to Firestore:", e?.message);
      }

      if (cancelled || fallbackLoaded) return;

      const ok = await loadFirestoreProfiles();
      if (!cancelled && !ok && !fallbackLoaded) {
        // Default Admin Profile fallback
        setProfiles([
          {
            id: "admin-user-001",
            name: "Administrador",
            role: "admin",
            status: "active",
            has_avatar: false,
            points: 0,
            equipped_effect: "none",
          }
        ]);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(fastFallbackTimer);
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const u = await login({ user_id: selected.id, password });
      toast.success(`Bem-vindo, ${u.name}!`);
      navigate(u.role === "admin" ? "/admin" : "/aluno", { replace: true });
    } catch (err) {
      const msg = formatApiError(err?.response?.data?.detail) || "Senha incorreta";
      toast.error(msg);
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileClick = (p) => {
    if (p.status === "maintenance") {
      toast.warning("Este perfil está em manutenção. Fale com o administrador.");
      return;
    }
    if (p.status === "blocked") {
      toast.error("Este perfil está bloqueado. Fale com o administrador.");
      return;
    }
    setSelected(p);
    setPassword("");
  };

  const isMentalistSelected = Boolean(
    selected && !framesDisabled && selected.equipped_effect === "mentalist"
  );

  return (
    <div
      className={`min-h-screen w-full flex flex-col lg:flex-row page-enter relative overflow-x-hidden ${
        isMentalistSelected ? "theme-mentalist" : "bg-[#FAFAFA]"
      }`}
      data-testid="login-page"
    >
      {isMentalistSelected && <MentalistMotifs variant="login" />}

      {/* Mobile Mentalist Crimson Top Bar (when Mentalist profile selected) */}
      {isMentalistSelected && (
        <div className="lg:hidden sticky top-0 z-30 bg-[#5b0e14] text-[#fdf6e7] border-b-2 border-black px-4 py-2.5 flex items-center justify-between gap-2 shadow-[0_3px_0_0_#1a0404]">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-heading font-black text-xl tracking-tight">
              <span>Edu</span>
              <span className="text-[#f5c451]">Task</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setPassword(""); }}
            className="nb-btn bg-[#fbf5e8] hover:bg-amber-100 text-[#1a0505] px-2.5 py-1 text-xs font-bold flex items-center gap-1"
            data-testid="back-to-profiles"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trocar perfil
          </button>
        </div>
      )}

      {/* Left brand panel */}
      {isMentalistSelected ? (
        <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative border-r-2 border-black overflow-hidden bg-gradient-to-br from-[#3a1812] via-[#2b120d] to-[#1a0906] z-10 flex-col">
          {/* Top crimson bar */}
          <div className="bg-[#5b0e14] border-b-2 border-black px-8 py-4 flex items-center gap-3">
            <Logo size={42} />
            <span className="font-heading font-black text-2xl tracking-tight text-[#fdf6e7]">
              Edu<span className="text-[#f5c451]">Task</span>
            </span>
            <span className="ml-auto nb-badge bg-[#e2b03a] text-[#1a0505] border-black text-[11px] font-black uppercase">
              O Mentalista
            </span>
          </div>

          <div className="flex-1 p-8 xl:p-10 flex flex-col justify-between relative">
            {/* Dossier Block */}
            <div className="my-auto relative">
              <div className="nb-card bg-[#e7d4b0] border-2 border-black shadow-[6px_6px_0_0_#000] p-7 xl:p-8 relative rotate-[-1.5deg]">
                {/* Binder Clip Accent */}
                <div className="w-16 h-5 bg-neutral-900 border-2 border-black rounded-t-md mx-auto -mt-10 mb-5 shadow-[2px_2px_0_0_#000]" />
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="inline-block bg-[#5b0e14] text-[#fdf6e7] border-2 border-black px-3 py-1 font-heading font-black text-xs uppercase tracking-widest shadow-[2px_2px_0_0_#000]">
                    THE MENTALIST
                  </div>
                  <svg viewBox="0 0 80 80" className="w-16 h-16 text-[#8f1616] shrink-0" fill="none" aria-hidden="true">
                    <path d="M14 35c2-16 14-24 28-23 15 2 25 12 24 28-2 15-14 26-30 25-13-1-24-12-22-30z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="31" cy="32" r="3" fill="currentColor" />
                    <path d="M31 35v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="48" cy="31" r="3" fill="currentColor" />
                    <path d="M48 34v9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M26 45c7 9 20 9 27-1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 className="font-heading font-black text-3xl xl:text-4xl leading-tight text-[#240707] mb-2">
                  CASO EDUTASK
                </h1>
                <p className="text-sm font-bold text-[#4a1814] leading-relaxed">
                  A lição de hoje, investigada e organizada para amanhã com foco total nas suas entregas.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <div className="nb-card bg-[#fbf5e8] border-2 border-black shadow-[3px_3px_0_0_#000] px-3.5 py-2 flex items-center gap-2 text-sm font-bold text-[#240707]">
                <BookOpen className="w-4 h-4 text-[#7f1d1d]" /> Matérias
              </div>
              <div className="nb-card bg-[#fbf5e8] border-2 border-black shadow-[3px_3px_0_0_#000] px-3.5 py-2 flex items-center gap-2 text-sm font-bold text-[#240707]">
                <Pencil className="w-4 h-4 text-[#7f1d1d]" /> Anexos
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative border-r-2 border-black overflow-hidden bg-amber-100">
          <img
            src="https://images.pexels.com/photos/28503354/pexels-photo-28503354.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=900"
            alt="Material escolar"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/40 via-transparent to-sky-200/30" />
          <div className="relative z-10 p-10 flex flex-col justify-between w-full">
            <div className="flex items-center gap-3">
              <Logo size={48} />
              <span className="font-heading font-black text-3xl tracking-tight text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]">
                Edu<span className="text-sky-300">task</span>
              </span>
            </div>
            <div className="space-y-4">
              <div className="inline-block nb-card bg-amber-300 px-4 py-2">
                <span className="font-heading font-bold tracking-wide text-sm">Tarefas de Casa Escolares</span>
              </div>
              <h1 className="font-heading font-black text-5xl xl:text-6xl leading-[1.05] text-black drop-shadow-[2px_2px_0_rgba(255,255,255,0.6)]">
                A lição de hoje, organizada para amanhã
              </h1>
            </div>
            <div className="flex gap-3">
              <div className="nb-card bg-white px-3 py-2 flex items-center gap-2 text-sm font-bold">
                <BookOpen className="w-4 h-4" /> Matérias
              </div>
              <div className="nb-card bg-white px-3 py-2 flex items-center gap-2 text-sm font-bold">
                <Pencil className="w-4 h-4" /> Anexos
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative z-10">
        <div className="w-full max-w-2xl">
          {!isMentalistSelected && (
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <Logo size={40} />
              <span className="font-heading font-black text-2xl tracking-tight">
                <span className="text-black dark:text-white">Edu</span><span className="text-sky-500">task</span>
              </span>
            </div>
          )}

          {!selected ? (
            <div className="nb-fade-in">
              <h2 className="font-heading font-black text-3xl sm:text-4xl mb-2">Quem está usando?</h2>
              <p className="text-neutral-600 mb-6 sm:mb-8">Escolha seu perfil para continuar.</p>
              {loading ? (
                <p className="text-neutral-500">Carregando perfis...</p>
              ) : profiles.length === 0 ? (
                <div className="nb-card bg-white p-8 text-center">
                  <p className="font-bold mb-1">Nenhum perfil cadastrado</p>
                  <p className="text-sm text-neutral-600">Aguarde o administrador criar seu perfil.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" data-testid="profiles-grid">
                  {profiles.map((p, i) => {
                    const meta = STATUS_META[p.status] || STATUS_META.active;
                    const StatusIcon = meta.icon;
                    const cardCls = effectCardClass(p.equipped_effect);
                    const badgeCls = effectBadgeClass(p.equipped_effect);
                    if (!framesDisabled && hasImageMoldura(p.equipped_effect)) {
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleProfileClick(p)}
                          className={`nb-card nb-card-hover text-center group nb-fade-in relative overflow-hidden transition-all duration-200 ${cardCls} card-moldura-image-bleed flex items-center justify-center ${
                            meta.dim ? "opacity-60" : ""
                          }`}
                          style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }}
                          data-testid={`profile-${p.id}`}
                        >
                          <ImageMolduraCard
                            effectId={p.equipped_effect}
                            userId={p.id}
                            name={p.name}
                            role={p.role}
                            hasAvatar={p.has_avatar}
                            dim={meta.dim}
                            statusMeta={meta}
                            bleed={true}
                          />
                          {StatusIcon && (
                            <div className={`absolute -top-2 -right-2 w-9 h-9 nb-card flex items-center justify-center z-30 ${meta.bg}`}>
                              <StatusIcon className="w-4 h-4" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleProfileClick(p)}
                        className={`nb-card nb-card-hover p-4 text-center group nb-fade-in relative overflow-hidden transition-all duration-200 ${cardCls} ${meta.dim ? "opacity-60" : ""}`}
                        style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }}
                        data-testid={`profile-${p.id}`}
                      >
                        {/* Central Moldura Artwork */}
                        <MolduraArtCenter effectId={p.equipped_effect} />

                        <div className="relative z-10 flex flex-col items-center justify-between h-full py-1">
                          <div className="w-[82px] h-[82px] flex items-center justify-center mx-auto mb-2.5 flex-shrink-0">
                            <Avatar
                              userId={p.id}
                              name={p.name}
                              size={72}
                              hasAvatar={p.has_avatar}
                              bg={p.role === "admin" ? "bg-red-300" : "bg-sky-300"}
                              className={meta.dim ? "grayscale" : ""}
                              effect={!meta.dim ? effectClass(p.equipped_effect) : null}
                            />
                          </div>
                          <div
                            className={`w-full text-center truncate font-heading font-bold text-base leading-tight px-1 py-0.5 rounded ${
                              isDarkTheme(p.equipped_effect) ? "text-white" : "text-black"
                            }`}
                          >
                            {p.name}
                          </div>
                          <div className="flex flex-col items-center gap-1 mt-2">
                            {meta.label ? (
                              <span className={`nb-badge inline-flex items-center gap-1 ${meta.bg}`} data-testid={`profile-status-${p.id}`}>
                                {StatusIcon && <StatusIcon className="w-3 h-3" strokeWidth={2.5} />}
                                {meta.label}
                              </span>
                            ) : (
                              <span className={`nb-badge inline-flex items-center gap-1 ${p.role === "admin" ? "bg-red-200 text-red-950 border-black" : badgeCls}`}>
                                {p.role === "admin" ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {p.role === "admin" ? "Admin" : "Aluno"}
                              </span>
                            )}
                          </div>
                        </div>
                        {StatusIcon && (
                          <div className={`absolute -top-2 -right-2 w-9 h-9 nb-card flex items-center justify-center z-20 ${meta.bg}`}>
                            <StatusIcon className="w-4 h-4" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`max-w-md mx-auto nb-card p-6 sm:p-8 lg:p-10 nb-fade-in ${
                isMentalistSelected ? "bg-[#fbf5e8]" : "bg-white"
              }`}
              data-testid="password-step"
            >
              <button
                onClick={() => { setSelected(null); setPassword(""); }}
                className={`nb-btn px-3 py-1.5 text-sm flex items-center gap-1 mb-6 ${
                  isMentalistSelected
                    ? "hidden lg:flex bg-[#5b0e14] hover:bg-[#7f1d1d] text-[#fdf6e7]"
                    : "bg-white hover:bg-neutral-100"
                }`}
                data-testid={isMentalistSelected ? "back-to-profiles-desktop" : "back-to-profiles"}
              >
                <ArrowLeft className="w-4 h-4" /> Trocar perfil
              </button>

              <div className="text-center mb-6">
                <div className="mx-auto inline-block mb-4">
                  <Avatar
                    userId={selected.id}
                    name={selected.name}
                    size={96}
                    hasAvatar={selected.has_avatar}
                    bg={selected.role === "admin" ? "bg-red-300" : isMentalistSelected ? "bg-amber-100" : "bg-sky-300"}
                    effect={effectClass(selected.equipped_effect)}
                  />
                </div>
                <div className="flex justify-center mb-2">
                  <h2 className={`font-heading font-black text-2xl ${isMentalistSelected ? "text-[#240707]" : "text-neutral-900"}`}>
                    Olá, {selected.name}!
                  </h2>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
                  <span
                    className={`nb-badge inline-flex items-center gap-1 ${
                      selected.role === "admin"
                        ? "bg-red-200 text-red-950 border-black"
                        : isMentalistSelected
                        ? "bg-[#e7d4b0] text-[#3b0707] border-[#2b0909]"
                        : "bg-sky-200 text-sky-950 border-black"
                    }`}
                  >
                    {selected.role === "admin" ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {selected.role === "admin" ? "Admin" : "Aluno"}
                  </span>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isMentalistSelected ? "text-[#240707]" : "text-neutral-900"}`}>
                    Senha de Acesso
                  </label>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    required
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSubmit(e);
                      }
                    }}
                    className="nb-input"
                    placeholder="••••••••"
                    data-testid="login-password-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`nb-btn nb-btn-primary font-bold w-full px-6 py-3 text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] ${
                    isMentalistSelected
                      ? "mentalist-btn-gold"
                      : "bg-sky-400 hover:bg-sky-500 text-neutral-950"
                  }`}
                  data-testid="login-submit-button"
                >
                  {submitting ? "Entrando..." : "Entrar no EduTask"}
                </button>
                <div className="pt-1 text-center">
                  <p className={`text-xs font-medium ${isMentalistSelected ? "text-[#5b2a22]" : "text-neutral-500"}`} data-testid="forgot-password-notice">
                    Esqueceu sua senha? Solicite ao administrador
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
