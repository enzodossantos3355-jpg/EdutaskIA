import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Calendar as CalendarIcon, CalendarDays, Trash2, Users, ListTodo, Paperclip, X, CheckCircle2, Circle, Upload, Eye, EyeOff, BookMarked, Wrench, Lock, CheckCircle, Megaphone, Pencil, Copy, History, BarChart3, Trophy, Minus, Cpu, Sparkles, Coins, ShoppingBag, Clock, AlertTriangle, Star, MessageSquare, FileArchive, Link2, Bot, Rocket, Zap, BookOpen, FileText, Settings, Image as ImageIcon, Crown, Palette, Loader2, Check, Scissors, Target, Bell, Menu, LogOut, Download, ChevronDown } from "lucide-react";
import api, { API, formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import ModalPortal from "@/components/ModalPortal";
import RecipientSelector from "@/components/RecipientSelector";
import AvatarUploader from "@/components/AvatarUploader";
import EditProfileDialog from "@/components/EditProfileDialog";
import AnnouncementComments from "@/components/AnnouncementComments";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import FirmwarePanel from "@/components/FirmwarePanel";
import AIEnhanceButton from "@/components/AIEnhanceButton";
import AIAdminPanel from "@/components/AIAdminPanel";
import StoreEffects from "@/components/StoreEffects";
import TaskCleanupDialog from "@/components/TaskCleanupDialog";
import AdminSystemClock from "@/components/AdminSystemClock";
import WhatsAppConfigPanel from "@/components/WhatsAppConfigPanel";
import WhatsAppDispatchDialog from "@/components/WhatsAppDispatchDialog";
import ZipDataTransferPanel from "@/components/ZipDataTransferPanel";
import StudentButtonsPanel from "@/components/StudentButtonsPanel";
import AnnualRankingPanel from "@/components/AnnualRankingPanel";
import AdminResumosPanel from "@/components/AdminResumosPanel";
import NotificationsAdminPanel from "@/components/NotificationsAdminPanel";
import ScheduleAdminPanel from "@/components/ScheduleAdminPanel";
import AdminStudentAreasPanel from "@/components/AdminStudentAreasPanel";
import { useAIStatus } from "@/context/AIStatusContext";
import { usePWA } from "@/context/PWAContext";
import { useAutoDriveBackup } from "@/lib/autoBackupManager";
import MolduraArtCenter from "@/components/MolduraArtCenter";
import { effectClass, effectCardClass, getTheme, isDarkTheme, pullScreenToStore } from "@/lib/effects";
import { getPriority, formatDateBR } from "@/lib/priority";
import { SUBJECT_COLOR_OPTIONS, colorFor, getSubjectColorConfig, getSubjectCardClass, getSubjectBadgeClass, setCachedSubjects } from "@/lib/subjectColors";

const STATUS_OPTS = [
  { key: "active", label: "Ativo", icon: CheckCircle, bg: "bg-emerald-200" },
  { key: "bot", label: "Bot (Teste)", icon: Bot, bg: "bg-cyan-200" },
  { key: "maintenance", label: "Em manutenção", icon: Wrench, bg: "bg-orange-300" },
  { key: "blocked", label: "Bloqueado", icon: Lock, bg: "bg-neutral-300" },
];

import { useAuth } from "@/context/AuthContext";

const TAB_LABELS = {
  tasks: "Tarefas",
  announcements: "Avisos",
  subjects: "Matérias",
  schedule: "Cronograma",
  resumos: "Resumos",
  ranking_annual: "Ranking Anual",
  store: "Loja de Molduras",
  buttons: "Botões dos Alunos",
  students: "Alunos",
  logs: "Acessos",
  stats: "Estatísticas",
  firmware: "Firmware",
  ai: "IA",
  whatsapp: "WhatsApp",
  notifications: "Notificações",
  student_areas: "Áreas dos Alunos",
  zip_transfer: "Dados ZIP",
};

export default function AdminDashboard() {
  const { user, refresh, logout } = useAuth();
  const { framesDisabled } = useAIStatus();
  const { canInstallOrGuide, installApp } = usePWA();
  useAutoDriveBackup(true);
  const [tab, setTab] = useState("tasks");
  const [annualCycle, setAnnualCycle] = useState(null);
  const [globalCleanupOpen, setGlobalCleanupOpen] = useState(false);
  const [globalCleanupData, setGlobalCleanupData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({ estudos: true, configuracoes: true });
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
  );

  const [mainSection, setMainSection] = useState("estudos"); // "estudos" | "configuracoes"

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileMenuOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const loadGlobalCleanup = useCallback(async () => {
    try {
      const [{ data }, statusRes] = await Promise.all([
        api.get("/admin/task-cleanup"),
        api.get("/app-status").catch(() => null),
      ]);
      setGlobalCleanupData(data);
      if (statusRes?.data?.collection_prefix !== undefined) {
        firebaseService.setCollectionPrefix(statusRes.data.collection_prefix);
      }
      if (statusRes?.data?.annual_cycle) {
        setAnnualCycle(statusRes.data.annual_cycle);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadGlobalCleanup();
  }, [loadGlobalCleanup]);

  // Listener para evento customizado do botão superior da Loja
  useEffect(() => {
    const handleOpenStore = () => {
      setMainSection("estudos");
      setTab("store");
      setMobileMenuOpen(false);
      pullScreenToStore();
    };
    window.addEventListener("open-store-tab", handleOpenStore);
    return () => window.removeEventListener("open-store-tab", handleOpenStore);
  }, []);

  const selectTab = (nextTab, sectionKey) => {
    setMainSection(sectionKey);
    setTab(nextTab);
    setMobileMenuOpen(false);
    if (nextTab === "store") {
      pullScreenToStore();
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const estudosItems = [
    { key: "tasks", label: "Tarefas", icon: ListTodo, testId: "tab-tasks" },
    { key: "announcements", label: "Avisos", icon: Megaphone, testId: "tab-announcements" },
    { key: "subjects", label: "Matérias", icon: BookMarked, testId: "tab-subjects" },
    { key: "schedule", label: "Cronograma", icon: CalendarDays, testId: "tab-schedule", title: "Configurar matérias necessárias de Segunda a Sexta" },
    { key: "resumos", label: "Resumos", icon: BookOpen, testId: "tab-resumos", title: "Resumos de Estudo por Matéria" },
    { key: "ranking_annual", label: "Ranking Anual", icon: Trophy, testId: "tab-ranking-annual", title: "Ranking Anual dos Alunos e Controle do Ano Letivo" },
    {
      key: "store",
      label: framesDisabled ? "Loja de Molduras (Desativada)" : "Loja de Molduras",
      icon: ShoppingBag,
      testId: "tab-store",
      title: framesDisabled
        ? "Loja desativada para os alunos — clique para gerenciar ou reativar"
        : "Acessar Loja de Molduras",
    },
    { key: "buttons", label: "Botões dos Alunos", icon: Link2, testId: "tab-buttons", title: "Criar e gerenciar botões para os alunos" },
  ];

  const configuracoesItems = [
    { key: "students", label: "Alunos", icon: Users, testId: "tab-students" },
    { key: "logs", label: "Acessos", icon: History, testId: "tab-logs" },
    { key: "stats", label: "Estatísticas", icon: BarChart3, testId: "tab-stats" },
    { key: "firmware", label: "Firmware", icon: Cpu, testId: "tab-firmware" },
    { key: "ai", label: "IA", icon: Sparkles, testId: "tab-ai" },
    { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, testId: "tab-whatsapp" },
    { key: "notifications", label: "Notificações", icon: Bell, testId: "tab-notifications" },
    {
      key: "student_areas",
      label: "Áreas dos Alunos",
      icon: Eye,
      testId: "tab-student-areas",
      title: "Ativar ou desativar Tarefas, Avisos e Resumos de Estudo para os alunos",
    },
    { key: "zip_transfer", label: "Dados ZIP", icon: FileArchive, testId: "tab-zip-transfer" },
  ];

  const activeTabLabel = TAB_LABELS[tab] || "Painel Administrativo";
  const hasCustomFrame = !framesDisabled && user?.equipped_effect && user.equipped_effect !== "none";
  const currentTheme = getTheme(user?.equipped_effect);
  const darkProfileFrame = hasCustomFrame && isDarkTheme(user?.equipped_effect);
  const compactProfileCls = hasCustomFrame
    ? effectCardClass(user?.equipped_effect)
    : "bg-slate-50 border border-slate-200";

  return (
    <div className="min-h-screen admin-workspace overflow-x-hidden">
      {/* Backdrop da gaveta mobile/tablet */}
      <div
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={isDesktop || !mobileMenuOpen}
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden admin-drawer-backdrop ${
          !isDesktop && mobileMenuOpen
            ? "opacity-100 visible pointer-events-auto"
            : "opacity-0 invisible pointer-events-none"
        }`}
        data-testid="admin-drawer-backdrop"
      />

      {/* Menu lateral fixo (desktop) / Gaveta lateral (celular e tablet) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-white border-r border-slate-200 flex flex-col admin-drawer-panel lg:w-64 xl:w-72 lg:z-30 lg:translate-x-0 lg:visible lg:pointer-events-auto shadow-xl lg:shadow-none ${
          mobileMenuOpen ? "translate-x-0 visible pointer-events-auto" : "-translate-x-full invisible pointer-events-none"
        }`}
        aria-label="Menu do painel administrativo"
        aria-hidden={!isDesktop && !mobileMenuOpen}
        data-testid="admin-sidebar"
      >
        {/* Marca + Botão Fechar (mobile) */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo size={30} />
            <div className="min-w-0 leading-tight">
              <div className="font-heading font-black text-base tracking-tight truncate">
                <span>Edu</span><span className="text-sky-500">Task</span>
              </div>
              <div className="text-[11px] font-semibold text-neutral-500 truncate">
                Painel Administrativo
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden nb-btn bg-white hover:bg-slate-100 p-1.5 text-neutral-800"
            aria-label="Fechar menu"
            data-testid="close-mobile-menu-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Perfil Compacto do Administrador */}
        {user && (
          <div className="p-3 border-b border-slate-200 flex-shrink-0">
            <div
              className={`relative overflow-hidden rounded-xl p-2.5 transition-colors ${compactProfileCls}`}
              data-testid="admin-compact-profile"
            >
              {hasCustomFrame && <MolduraArtCenter effectId={user.equipped_effect} />}
              {hasCustomFrame && (
                <div
                  className={`absolute inset-0 z-[1] pointer-events-none ${
                    darkProfileFrame ? "bg-black/45" : "bg-white/45"
                  }`}
                />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    userId={user.id}
                    name={user.name}
                    size={38}
                    hasAvatar={user.has_avatar}
                    bg="bg-red-300"
                    effect={effectClass(user.equipped_effect)}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-heading font-bold text-sm leading-tight truncate ${
                        darkProfileFrame ? "text-white drop-shadow-sm" : "text-neutral-900"
                      }`}
                    >
                      {user.name}
                    </div>
                    <div
                      className={`text-[11px] font-semibold truncate ${
                        darkProfileFrame ? "text-white/90 drop-shadow-sm" : "text-neutral-700"
                      }`}
                    >
                      Administrador{hasCustomFrame && currentTheme?.id && currentTheme.id !== "none" ? ` • ${currentTheme.name.replace("Moldura ", "")}` : ""}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setEditProfileOpen(true);
                  }}
                  className="mt-2.5 w-full rounded-lg bg-white hover:bg-sky-50 text-neutral-950 border border-neutral-900 px-2.5 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-[1px_1px_0_0_#000]"
                  data-testid="open-edit-profile-button"
                >
                  <Pencil className="w-3.5 h-3.5 text-sky-700" />
                  <span>Editar perfil</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navegação com Grupos Expansíveis */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3" aria-label="Seções administrativas">
          {/* Grupo 1: Tarefas & Estudos */}
          <div data-testid="nav-group-estudos">
            <button
              type="button"
              onClick={() => toggleGroup("estudos")}
              aria-expanded={expandedGroups.estudos}
              className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs font-heading font-black uppercase tracking-wider text-neutral-600 hover:text-neutral-900 hover:bg-slate-100 transition-colors"
              data-testid="group-toggle-estudos"
            >
              <span className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="truncate">Tarefas & Estudos</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  expandedGroups.estudos ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>
            <div className={`expandable-grid ${expandedGroups.estudos ? "open" : ""}`}>
              <div className="expandable-inner">
                <div className="pt-1 space-y-1">
                  {estudosItems.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectTab(item.key, "estudos")}
                        title={item.title}
                        data-testid={item.testId}
                        aria-current={active ? "page" : undefined}
                        className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2.5 text-left transition-all duration-150 ${
                          active
                            ? "bg-sky-400 text-neutral-950 font-bold border-2 border-neutral-900 shadow-[2px_2px_0_0_#000]"
                            : "text-neutral-700 hover:bg-slate-100 hover:text-neutral-950 font-medium border border-transparent"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Grupo 2: Configurações */}
          <div data-testid="nav-group-configuracoes">
            <button
              type="button"
              onClick={() => toggleGroup("configuracoes")}
              aria-expanded={expandedGroups.configuracoes}
              className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs font-heading font-black uppercase tracking-wider text-neutral-600 hover:text-neutral-900 hover:bg-slate-100 transition-colors"
              data-testid="group-toggle-configuracoes"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Settings className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="truncate">Configurações</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  expandedGroups.configuracoes ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>
            <div className={`expandable-grid ${expandedGroups.configuracoes ? "open" : ""}`}>
              <div className="expandable-inner">
                <div className="pt-1 space-y-1">
                  {configuracoesItems.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectTab(item.key, "configuracoes")}
                        title={item.title}
                        data-testid={item.testId}
                        aria-current={active ? "page" : undefined}
                        className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2.5 text-left transition-all duration-150 ${
                          active
                            ? "bg-sky-400 text-neutral-950 font-bold border-2 border-neutral-900 shadow-[2px_2px_0_0_#000]"
                            : "text-neutral-700 hover:bg-slate-100 hover:text-neutral-950 font-medium border border-transparent"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}

                  {/* Ação de Limpeza de Tarefas dentro de Configurações */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setGlobalCleanupOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 text-left bg-rose-50 hover:bg-rose-100 text-rose-900 font-semibold border border-rose-200 transition-colors duration-150"
                    data-testid="btn-open-task-cleanup"
                    title="Configurar exclusão automática de tarefas com hora do servidor"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Clock className="w-4 h-4 flex-shrink-0 text-rose-700" />
                      <span className="truncate">Limpeza de Tarefas</span>
                    </span>
                    {globalCleanupData?.config?.enabled && (
                      <span className="px-1.5 py-0.5 bg-neutral-900 text-white text-[10px] rounded font-mono flex-shrink-0">
                        {globalCleanupData.config.cleanup_time}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Shell principal à direita da barra lateral */}
      <div className="lg:pl-64 xl:pl-72 min-h-screen flex flex-col min-w-0">
        {/* Cabeçalho Compacto */}
        <header
          className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200"
          data-testid="app-header"
        >
          <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden nb-btn admin-btn-primary px-2.5 py-1.5 text-xs flex items-center gap-1.5 flex-shrink-0"
                aria-label="Abrir menu"
                aria-expanded={mobileMenuOpen}
                data-testid="mobile-menu-button"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>

              <div className="flex items-center gap-2 lg:hidden min-w-0">
                <Logo size={26} />
                <span className="font-heading font-black text-sm tracking-tight hidden min-[390px]:inline truncate">
                  <span>Edu</span><span className="text-sky-500">Task</span>
                </span>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-sm min-w-0">
                <span className="text-neutral-500 font-medium">
                  {mainSection === "estudos" ? "Tarefas & Estudos" : "Configurações"}
                </span>
                <span className="text-neutral-300">/</span>
                <span className="font-heading font-bold text-neutral-900 truncate" data-testid="admin-header-breadcrumb">
                  {activeTabLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              <AdminSystemClock compact />

              {canInstallOrGuide && (
                <button
                  type="button"
                  onClick={installApp}
                  className="nb-btn bg-amber-200 hover:bg-amber-300 text-neutral-950 px-2 sm:px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  title="Instalar aplicativo EduTask IA"
                  aria-label="Instalar aplicativo"
                  data-testid="header-pwa-install-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Instalar</span>
                </button>
              )}

              <button
                type="button"
                onClick={logout}
                className="nb-btn bg-white hover:bg-red-50 text-neutral-800 hover:text-red-700 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-1.5"
                data-testid="logout-button"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 pb-12 page-enter min-w-0">
          {/* Banner de Ano Letivo Encerrado */}
          {annualCycle?.is_closed && (
            <div className="mb-6 nb-card bg-amber-50 border border-amber-400 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 nb-fade-in" data-testid="annual-cycle-closed-banner">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-300 border border-neutral-900 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-amber-950">
                    Ano Letivo {annualCycle?.active_year || 2026} Encerrado — Criação Suspensa
                  </h3>
                  <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                    O ranking anual foi finalizado e os alunos estão na tela de bloqueio com o Pódio Top 3. A criação de novas tarefas, avisos e botões está desativada até você iniciar o próximo ano.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectTab("ranking_annual", "estudos")}
                className="nb-btn admin-btn-primary px-4 py-2 text-xs flex-shrink-0 flex items-center gap-1.5"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Iniciar Próximo Ano</span>
              </button>
            </div>
          )}

          {tab === "tasks" && <TasksPanel annualCycle={annualCycle} />}
          {tab === "announcements" && <AnnouncementsPanel annualCycle={annualCycle} />}
          {tab === "students" && <StudentsPanel />}
          {tab === "subjects" && <SubjectsPanel annualCycle={annualCycle} />}
          {tab === "schedule" && <ScheduleAdminPanel />}
          {tab === "resumos" && <AdminResumosPanel />}
          {tab === "logs" && <LoginLogsPanel />}
          {tab === "stats" && <StatsPanel />}
          {tab === "firmware" && <FirmwarePanel />}
          {tab === "ai" && <AIAdminPanel />}
          {tab === "ranking_annual" && <AnnualRankingPanel />}
          {tab === "store" && <StoreEffects user={user} refresh={refresh} />}
          {tab === "whatsapp" && <WhatsAppConfigPanel />}
          {tab === "notifications" && <NotificationsAdminPanel />}
          {tab === "student_areas" && <AdminStudentAreasPanel />}
          {tab === "buttons" && <StudentButtonsPanel annualCycle={annualCycle} />}
          {tab === "zip_transfer" && <ZipDataTransferPanel />}
        </main>
      </div>

      {editProfileOpen && user && (
        <EditProfileDialog
          userId={user.id}
          hasAvatar={Boolean(user.has_avatar)}
          avatarPath="/me/avatar"
          initialName={user.name}
          path="/me"
          onClose={() => setEditProfileOpen(false)}
          onSaved={() => {
            setEditProfileOpen(false);
            refresh();
          }}
        />
      )}

      {globalCleanupOpen && (
        <TaskCleanupDialog
          open={globalCleanupOpen}
          onClose={() => setGlobalCleanupOpen(false)}
          onSaved={loadGlobalCleanup}
        />
      )}
    </div>
  );
}

// --- Tasks panel ---
function TasksPanel({ annualCycle }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupData, setCleanupData] = useState(null);
  const [dispatchTask, setDispatchTask] = useState(null);
  const [sendingWhatsappId, setSendingWhatsappId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: t }, { data: c }] = await Promise.all([
        api.get("/tasks"),
        api.get("/admin/task-cleanup").catch(() => ({ data: null })),
      ]);
      if (!Array.isArray(t)) throw new Error("Formato inválido de tarefas");
      setTasks(t);
      if (c) setCleanupData(c);
    } catch (e) {
      try {
        const firestoreTasks = await firebaseService.getAllTasks();
        if (Array.isArray(firestoreTasks)) {
          setTasks(firestoreTasks);
        }
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao carregar tarefas");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/tasks/${confirmDelete.id}`);
      toast.success("Tarefa excluída");
      setConfirmDelete(null);
      load();
    } catch (e) {
      if (e?.response) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao excluir tarefa");
        return;
      }
      try {
        await firebaseService.deleteTask(confirmDelete.id);
        toast.success("Tarefa excluída");
        setConfirmDelete(null);
        load();
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao excluir tarefa");
      }
    }
  };

  const copyTaskInfo = async (task) => {
    const recipients = task.all_students
      ? "Todos os alunos"
      : (task.progress || []).map((p) => p.name).join(", ") || "—";
    const attachments = (task.attachments || []).map((a) => a.original_filename).join(", ") || "—";
    const text = [
      `📚 ${task.subject} — ${task.title}`,
      `📅 Entrega: ${formatDateBR(task.due_date)}`,
      `👥 Destinatários: ${recipients}`,
      `📎 Anexos: ${attachments}`,
      "",
      task.description,
    ].join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Informações copiadas!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const willDeleteToday = cleanupData?.will_delete_today;
  const deleteCount = cleanupData?.count || 0;
  const cleanupTime = cleanupData?.config?.cleanup_time || "23:59";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">Tarefas</h1>
          <p className="text-sm text-neutral-600 mt-0.5">Crie tarefas e acompanhe o progresso dos alunos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCleanupOpen(true)}
            className={`nb-btn px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 ${
              willDeleteToday
                ? "bg-amber-200 hover:bg-amber-300 font-bold"
                : "bg-white hover:bg-slate-50"
            }`}
            title="Configurar exclusão automática de tarefas"
            data-testid="open-task-cleanup-btn"
          >
            <Clock className={`w-4 h-4 ${willDeleteToday ? "text-amber-900" : "text-neutral-700"}`} />
            <span>
              {willDeleteToday
                ? `${deleteCount} p/ apagar hoje às ${cleanupTime}`
                : "Auto-exclusão"}
            </span>
          </button>

          <button
            onClick={() => {
              if (annualCycle?.is_closed) {
                toast.error("O Ano Letivo está encerrado. Inicie o novo ano letivo na aba Ranking Anual para poder criar tarefas.");
                return;
              }
              setCreating(true);
            }}
            className={`nb-btn px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 ${annualCycle?.is_closed ? "bg-neutral-200 text-neutral-500 opacity-70" : "admin-btn-primary"}`}
            title={annualCycle?.is_closed ? "Ano Letivo encerrado" : "Criar nova tarefa"}
            data-testid="open-create-task-button"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Nova tarefa
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando...</p>
      ) : tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nenhuma tarefa ainda" subtitle="Clique em 'Nova tarefa' para criar a primeira." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((t, i) => (
            <AdminTaskCard
              key={t.id}
              task={t}
              onDelete={() => setConfirmDelete({ id: t.id, label: t.title })}
              onEdit={() => setEditing(t)}
              onCopy={() => copyTaskInfo(t)}
              onSendWhatsApp={() => setDispatchTask(t)}
              isSendingWhatsApp={false}
              index={i}
            />
          ))}
        </div>
      )}

      {creating && <TaskDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {editing && <TaskDialog task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {cleanupOpen && <TaskCleanupDialog open={cleanupOpen} onClose={() => setCleanupOpen(false)} onSaved={load} />}
      {dispatchTask && (
        <WhatsAppDispatchDialog
          open={Boolean(dispatchTask)}
          type="task"
          item={dispatchTask}
          onClose={() => setDispatchTask(null)}
          onSuccess={load}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Excluir tarefa?"
          message={`Tem certeza que deseja excluir "${confirmDelete.label}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          confirmClass="bg-red-300"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function AdminTaskCard({ task, onDelete, onEdit, onCopy, onSendWhatsApp, isSendingWhatsApp, index }) {
  const pct = task.total_students > 0 ? Math.round((task.completed_count / task.total_students) * 100) : 0;
  const priority = getPriority(task.due_date, false);
  return (
    <div className="nb-card nb-card-hover p-6 nb-fade-in" style={{ animationDelay: `${Math.min(index || 0, 7) * 30}ms` }} data-testid={`admin-task-card-${task.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`nb-badge ${colorFor(task.subject)}`}>{task.subject}</span>
          <span className={`nb-badge ${priority.bg}`} data-testid={`task-priority-${task.id}`}>
            {priority.icon} {priority.label}
          </span>
          <span className="nb-badge bg-white" data-testid={`task-recipients-${task.id}`}>
            <Users className="w-3 h-3 inline mr-1 -mt-0.5" />
            {task.all_students ? "Todos" : `${task.total_students} aluno${task.total_students === 1 ? "" : "s"}`}
          </span>
          {(task.was_edited || task.edited_at || task.last_updated_at) && (
            <span
              className="nb-badge bg-amber-200 text-amber-950 border border-black inline-flex items-center gap-1"
              data-testid={`admin-task-edited-${task.id}`}
              title={`Editada em ${formatDateBR(task.edited_at || task.last_updated_at, true)}`}
            >
              <Pencil className="w-3 h-3" />
              <span>Editada</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onSendWhatsApp}
            disabled={isSendingWhatsApp}
            className="nb-btn bg-emerald-300 hover:bg-emerald-400 text-emerald-950 px-2 py-2"
            data-testid={`whatsapp-task-${task.id}`}
            aria-label="Enviar ao WhatsApp"
            title="Disparar para os 2 Grupos do WhatsApp"
          >
            <MessageSquare className={`w-4 h-4 ${isSendingWhatsApp ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onCopy}
            className="nb-btn bg-white hover:bg-sky-100 px-2 py-2"
            data-testid={`copy-task-${task.id}`}
            aria-label="Copiar informações"
            title="Copiar informações"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="nb-btn bg-amber-200 hover:bg-amber-300 px-2 py-2"
            data-testid={`edit-task-${task.id}`}
            aria-label="Editar tarefa"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="nb-btn bg-red-200 hover:bg-red-300 px-2 py-2"
            data-testid={`delete-task-${task.id}`}
            aria-label="Excluir tarefa"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <h3 className="font-heading font-bold text-xl mb-1 leading-tight">{task.title}</h3>
      <p className="text-sm text-neutral-700 mb-4 line-clamp-3 whitespace-pre-wrap">{task.description}</p>

      <div className="flex items-center gap-2 text-sm mb-4">
        <CalendarIcon className="w-4 h-4" />
        <span className="font-medium">Entrega: {formatDateBR(task.due_date)}</span>
      </div>

      {task.attachments?.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Anexos</div>
          {task.attachments.map((a) => (
            <FileLink key={a.id} file={a} />
          ))}
        </div>
      )}

      <div className="border-t-2 border-dashed border-black/30 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">Progresso</span>
          <span className="text-sm font-bold">{task.completed_count} / {task.total_students}</span>
        </div>
        <div className="h-3 border-2 border-black rounded-full overflow-hidden bg-white mb-3">
          <div className="h-full bg-emerald-300 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-1 max-h-32 overflow-auto">
          {task.progress?.length === 0 && <p className="text-xs text-neutral-500">Nenhum aluno cadastrado.</p>}
          {task.progress?.map((p) => (
            <div key={p.user_id} className="flex items-center gap-2 text-xs">
              {p.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
              ) : (
                <Circle className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span className={p.completed ? "font-bold" : ""}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FileLink({ file }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
  const url = `${API}/files/${file.id}/download?auth=${encodeURIComponent(token || "")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 nb-card bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-medium"
      data-testid={`file-link-${file.id}`}
    >
      <Paperclip className="w-3.5 h-3.5" />
      <span className="truncate">{file.original_filename}</span>
    </a>
  );
}

function TaskDialog({ task, onClose, onSaved }) {
  const { user } = useAuth();
  const { hidden: aiHidden, aiHidden: aiHiddenAlt } = useAIStatus();
  const adminId = user?.id || "admin";
  const draftTaskKey = `edutask_draft_task_${adminId}`;

  const [currentTask, setCurrentTask] = useState(task);
  const isEdit = Boolean(currentTask);
  const [subject, setSubject] = useState(currentTask?.subject || "");
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignedTo, setAssignedTo] = useState(currentTask?.assigned_to || []);
  const [title, setTitle] = useState(currentTask?.title || "");
  const [description, setDescription] = useState(currentTask?.description || "");
  const [dueDate, setDueDate] = useState(currentTask?.due_date || "");
  const [files, setFiles] = useState(
    (currentTask?.attachments || []).map((a) => ({ id: a.id, filename: a.original_filename }))
  );
  const [adminPhotos, setAdminPhotos] = useState(
    (currentTask?.admin_photos || []).map((a) => ({ id: a.id, filename: a.original_filename }))
  );
  const [answerSource, setAnswerSource] = useState(currentTask?.answer_source || "");
  const [answer, setAnswer] = useState(currentTask?.answer || "");
  const [points, setPoints] = useState(currentTask?.points ?? 10);
  const [answerLength, setAnswerLength] = useState("medium");
  const [uploading, setUploading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saving" | "saved"
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const submitting = saveState === "saving";

  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [draftSavedStatus, setDraftSavedStatus] = useState(false);

  useEffect(() => {
    setLoadingSubjects(true);
    api.get("/subjects").then(({ data }) => {
      if (Array.isArray(data)) {
        setSubjects(data);
        if (!isEdit && data.length > 0 && !subject) setSubject(data[0].name);
      }
    }).catch(async () => {
      try {
        const list = await firebaseService.getAllSubjects();
        if (Array.isArray(list)) {
          setSubjects(list);
          if (!isEdit && list.length > 0 && !subject) setSubject(list[0].name);
        }
      } catch {}
    }).finally(() => setLoadingSubjects(false));
    api.get("/users").then(({ data }) => {
      if (Array.isArray(data)) setStudents(data);
    }).catch(async () => {
      try {
        const list = await firebaseService.getAllUsers();
        if (Array.isArray(list)) setStudents(list.filter((u) => u.role === "aluno"));
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for auto-saved task draft on creation form mount
  useEffect(() => {
    if (!isEdit) {
      try {
        const saved = localStorage.getItem(draftTaskKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.title || parsed.description || parsed.answerSource || parsed.answer || parsed.dueDate)) {
            setDraftData(parsed);
            setHasDraft(true);
          }
        }
      } catch {}
    }
  }, [isEdit, draftTaskKey]);

  // Auto-save form fields to localStorage
  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      if (title.trim() || description.trim() || answerSource.trim() || answer.trim() || dueDate) {
        const dataToSave = {
          subject,
          title,
          description,
          dueDate,
          points,
          assignedTo,
          answerSource,
          answer,
          hadFiles: files.length > 0 || adminPhotos.length > 0,
          updatedAt: Date.now(),
        };
        try {
          localStorage.setItem(draftTaskKey, JSON.stringify(dataToSave));
          setDraftSavedStatus(true);
        } catch {}
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [isEdit, subject, title, description, dueDate, points, assignedTo, answerSource, answer, files.length, adminPhotos.length, draftTaskKey]);

  const handleContinueTaskDraft = () => {
    if (!draftData) return;
    if (draftData.subject) setSubject(draftData.subject);
    if (draftData.title) setTitle(draftData.title);
    if (draftData.description) setDescription(draftData.description);
    if (draftData.dueDate) setDueDate(draftData.dueDate);
    if (draftData.points !== undefined) setPoints(draftData.points);
    if (Array.isArray(draftData.assignedTo)) setAssignedTo(draftData.assignedTo);
    if (draftData.answerSource) setAnswerSource(draftData.answerSource);
    if (draftData.answer) setAnswer(draftData.answer);
    setHasDraft(false);
    if (draftData.hadFiles) {
      toast.info("Anexos e fotos anteriores não foram armazenados no rascunho e precisam ser selecionados novamente.");
    }
  };

  const handleDiscardTaskDraft = () => {
    try {
      localStorage.removeItem(draftTaskKey);
    } catch {}
    setHasDraft(false);
    setDraftData(null);
  };

  const handleUpload = async (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const f of list) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/files/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFiles((prev) => [...prev, data]);
      }
      toast.success("Anexo enviado");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao enviar arquivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handlePhotoUpload = async (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (const f of list) {
        if (!f.type.startsWith("image/")) {
          toast.error(`${f.name} não é imagem`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/files/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setAdminPhotos((prev) => [...prev, data]);
      }
      toast.success("Foto adicionada");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao enviar foto");
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const generateAnswer = async () => {
    // Save task first if new (need task_id for the AI endpoint)
    setGeneratingAnswer(true);
    try {
      let currentTaskId = currentTask?.id;
      if (!currentTaskId) {
        // Save-and-reload as draft
        const { data } = await api.post("/tasks", {
          subject, title, description, due_date: dueDate,
          attachments: files.map((f) => f.id),
          admin_photos: adminPhotos.map((f) => f.id),
          answer,
          answer_source: answerSource,
          points: Math.max(0, parseInt(points, 10) || 0),
          assigned_to: assignedTo,
        });
        currentTaskId = data.id;
        setCurrentTask({ ...data });
        toast.info("Rascunho salvo — gerando resposta...");
      } else {
        // Persist current photo list first
        await api.put(`/tasks/${currentTaskId}`, {
          admin_photos: adminPhotos.map((f) => f.id),
          answer_source: answerSource,
        });
      }
      const { data: gen } = await api.post("/ai/generate-task-answer", {
        task_id: currentTaskId,
        photo_ids: adminPhotos.map((f) => f.id || f),
        subject: subject || "Geral",
        title: title || "Atividade Escolar",
        description,
        answer_source: answerSource,
        length: answerLength,
      });
      const sanitized = (gen.answer || "")
        .replace(/^#+\s*/gm, "")
        .replace(/#+/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/^[ \t]*(?:Explicação|Resolução|Passo a passo|Justificativa):\s*/gim, "")
        .trim();
      setAnswer(sanitized);
      const label = answerLength === "short" ? "Curto" : answerLength === "detailed" ? "Detalhado" : "Médio";
      toast.success(`Gabarito (${label}) gerado com base nas fotos analisadas! (${gen.photos_used || adminPhotos.length} foto(s))`);
      // Dialog stays open so admin can review and click "Salvar alterações"
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao gerar resposta");
    } finally {
      setGeneratingAnswer(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saveState !== "idle") return;
    setSaveState("saving");
    const payload = {
      subject, title, description, due_date: dueDate,
      attachments: files.map((f) => f.id),
      admin_photos: adminPhotos.map((f) => f.id),
      answer,
      answer_source: answerSource,
      points: Math.max(0, parseInt(points, 10) || 0),
      assigned_to: assignedTo,
    };
    try {
      if (currentTask?.id) {
        await api.put(`/tasks/${currentTask.id}`, payload);
        toast.success("Tarefa atualizada!");
      } else {
        await api.post("/tasks", payload);
        toast.success("Tarefa criada!");
      }
      try { localStorage.removeItem(draftTaskKey); } catch {}
      setSaveState("saved");
      setTimeout(() => onSaved(), 360);
    } catch (err) {
      if (err?.response) {
        setSaveState("idle");
        toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao salvar tarefa");
        return;
      }
      try {
        const taskId = currentTask?.id || `task-${Date.now()}`;
        const taskDoc = {
          id: taskId,
          ...payload,
          created_at: currentTask?.created_at || new Date().toISOString(),
        };
        await firebaseService.saveTask(taskDoc);
        toast.success(currentTask?.id ? "Tarefa atualizada!" : "Tarefa criada!");
        try { localStorage.removeItem(draftTaskKey); } catch {}
        setSaveState("saved");
        setTimeout(() => onSaved(), 360);
      } catch (err2) {
        setSaveState("idle");
        toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao salvar tarefa");
      }
    }
  };

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-50 bg-black/40 flex ${isEdit ? "items-end sm:items-stretch sm:justify-end p-0" : "items-center justify-center p-3 sm:p-4"}`}
        data-testid="task-dialog"
        onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      >
      <div
        className={`nb-card bg-white w-full overflow-auto p-5 sm:p-7 ${
          isEdit
            ? "panel-drawer drawer-panel sm:max-w-2xl max-h-[92vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-none sm:rounded-l-2xl border-b-0 sm:border-y-0 sm:border-r-0 shadow-[-6px_0_0_0_#000]"
            : "max-w-2xl max-h-[92vh]"
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="font-heading font-black text-xl sm:text-2xl">{isEdit ? "Editar tarefa" : "Nova tarefa"}</h3>
            {draftSavedStatus && !isEdit && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-600 inline-flex items-center gap-1" data-testid="task-draft-saved-indicator">
                <Check className="w-3 h-3 stroke-[3]" /> Rascunho salvo
              </span>
            )}
          </div>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-2" data-testid="close-task-dialog">
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasDraft && (
          <div className="mb-4 nb-card bg-amber-200 border-2 border-black p-3.5 shadow-[3px_3px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="task-draft-banner">
            <div>
              <div className="font-heading font-black text-sm text-black flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-black flex-shrink-0" />
                <span>Rascunho não publicado encontrado</span>
              </div>
              <p className="text-xs font-bold text-neutral-800 mt-0.5">
                Há um rascunho salvo anteriormente deste formulário neste navegador.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleContinueTaskDraft}
                className="nb-btn bg-sky-300 hover:bg-sky-400 text-xs font-black px-3 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]"
                data-testid="continue-task-draft-button"
              >
                Continuar rascunho
              </button>
              <button
                type="button"
                onClick={handleDiscardTaskDraft}
                className="nb-btn bg-white hover:bg-neutral-100 text-xs font-bold px-2.5 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]"
                data-testid="discard-task-draft-button"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1.5">Matéria</label>
              {subjects.length > 0 ? (
                <select
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="nb-input cursor-pointer"
                  data-testid="task-subject-select"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : loadingSubjects ? (
                <div className="nb-card bg-neutral-100 p-3 text-xs font-bold text-neutral-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                  <span>Carregando matérias...</span>
                </div>
              ) : (
                <div className="nb-card bg-amber-50 p-3 text-sm">
                  <p className="font-bold mb-1">Nenhuma matéria cadastrada</p>
                  <p className="text-xs text-neutral-700">Crie matérias na aba "Matérias" antes de criar tarefas.</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5">Data de entrega</label>
              <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="nb-input" data-testid="task-due-date-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Pontos ao concluir
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="nb-input"
              data-testid="task-points-input"
              placeholder="10"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Aluno ganha <b>{parseInt(points,10)||10}</b> pts no prazo, <b>{Math.max(1, Math.floor((parseInt(points, 10) || 10) * 0.3))}</b> pts atrasado.
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Título</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lista de exercícios cap. 4" className="nb-input" data-testid="task-title-input" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="block text-sm font-bold">Descrição</label>
              <AIEnhanceButton
                endpoint="/ai/improve-task"
                payload={{ title, subject, hint: description }}
                disabled={!title.trim()}
                label="Escrever com IA"
                testId="ai-improve-task-button"
                onResult={(data) => {
                  const parts = [data.description];
                  if (data.objectives?.length) parts.push("\n\nObjetivos:\n" + data.objectives.map((o) => `• ${o}`).join("\n"));
                  if (data.tips?.length) parts.push("\n\nDicas:\n" + data.tips.map((t) => `• ${t}`).join("\n"));
                  setDescription(parts.join(""));
                }}
              />
            </div>
            <textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa..." className="nb-input resize-y" data-testid="task-description-input" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Anexos</label>
            <label className="block w-full border-2 border-dashed border-black rounded-xl bg-sky-50 hover:bg-sky-100 p-6 cursor-pointer transition-colors text-center" data-testid="task-file-upload-zone">
              <Upload className="w-6 h-6 mx-auto mb-1.5" />
              <span className="text-sm font-bold">{uploading ? "Enviando..." : "Clique para anexar arquivos"}</span>
              <p className="text-xs text-neutral-600">PDF, imagens, documentos</p>
              <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} data-testid="task-file-input" />
            </label>
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between nb-card bg-amber-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{f.filename}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                      className="text-red-700 hover:text-red-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Destinatários</label>
            <RecipientSelector
              students={students}
              value={assignedTo}
              onChange={setAssignedTo}
              testIdPrefix="task-recipients"
            />
          </div>

          {/* Fonte da resposta para a IA e fotos */}
          <div className="nb-card p-4 bg-gradient-to-br from-violet-100 via-sky-50 to-pink-50 border-2 border-black/80 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-violet-700" strokeWidth={2.5} />
                <h4 className="font-heading font-black text-sm text-neutral-900">
                  Fonte para Resposta por IA (Gabarito Inteligente)
                </h4>
                <span className="nb-badge bg-emerald-200 text-emerald-950 text-[10px] font-bold">
                  Novo
                </span>
              </div>
              <p className="text-xs text-neutral-700 mb-2">
                Coloque apenas a fonte aqui (trecho do livro, notas, resolução rápida ou material de apoio). O aluno escolhe o tamanho da resposta (<strong>Curta</strong>, <strong>Média</strong> ou <strong>Detalhada</strong>) e a IA gera para ele!
              </p>
              <textarea
                rows={4}
                value={answerSource}
                onChange={(e) => setAnswerSource(e.target.value)}
                placeholder="Ex: Livro de Ciências pág. 50: O ciclo da água envolve evaporação, condensação e precipitação... ou cole os pontos do gabarito aqui."
                className="nb-input resize-y bg-white text-xs sm:text-sm font-sans"
                data-testid="task-answer-source-input"
              />
            </div>

            <div className="border-t border-black/10 pt-3">
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-neutral-900 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-neutral-800" /> Fotos do Enunciado / Livro / Quadro
                  </span>
                  <span className="nb-badge bg-neutral-200 text-neutral-800 text-[9px] font-bold">
                    Material de Apoio
                  </span>
                </div>
                {adminPhotos.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-black/20">
                      {[
                        { key: "short", label: "Curto", Icon: Zap },
                        { key: "medium", label: "Médio", Icon: FileText },
                        { key: "detailed", label: "Detalhado", Icon: BookOpen },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          disabled={generatingAnswer}
                          onClick={() => setAnswerLength(opt.key)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${
                            answerLength === opt.key
                              ? "bg-amber-300 text-neutral-950 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                              : "text-neutral-700 hover:text-black hover:bg-white/60"
                          }`}
                        >
                          <opt.Icon className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    {!aiHidden && !aiHiddenAlt && (
                      <button
                        type="button"
                        onClick={generateAnswer}
                        disabled={generatingAnswer}
                        className="nb-btn px-2.5 py-1 bg-violet-200 hover:bg-violet-300 text-xs flex items-center gap-1 font-bold"
                        data-testid="generate-answer-button"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${generatingAnswer ? "animate-spin" : ""}`} />
                        {generatingAnswer ? "Lendo fotos e resolvendo..." : "Gerar gabarito das fotos (IA)"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <label className="block w-full border-2 border-dashed border-neutral-400 hover:border-amber-600 rounded-xl bg-white/90 hover:bg-amber-50/50 p-3.5 cursor-pointer text-center transition-all" data-testid="task-photo-upload-zone">
                <Upload className="w-5 h-5 mx-auto mb-1 text-amber-700" />
                <span className="text-xs font-bold text-neutral-800">{uploadingPhotos ? "Enviando fotos..." : "Clique para anexar foto do enunciado / livro / quadro"}</span>
                <p className="text-[10px] text-neutral-500 mt-0.5">PNG, JPG, JPEG (fotos para leitura da IA e resolução)</p>
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhotos} data-testid="task-photo-input" />
              </label>

              {adminPhotos.length > 0 && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {adminPhotos.map((f) => {
                    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
                    const photoUrl = `${API}/files/${f.id}/download?auth=${encodeURIComponent(token || "")}`;
                    return (
                      <div key={f.id} className="flex items-center justify-between nb-card bg-white p-2 text-xs border border-neutral-300">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={photoUrl} alt="Thumbnail" className="w-8 h-8 object-cover rounded border border-black flex-shrink-0" />
                          <span className="truncate font-medium">{f.filename}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdminPhotos((p) => p.filter((x) => x.id !== f.id))}
                          className="nb-btn bg-red-100 hover:bg-red-200 text-red-700 px-1.5 py-1 text-xs"
                          data-testid={`remove-photo-${f.id}`}
                          title="Remover foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-black/10 pt-3">
              <label className="block text-xs font-bold mb-1 text-neutral-800">
                Resposta / Gabarito fixo pré-definido <span className="text-neutral-500 font-normal">(Opcional se forneceu a fonte acima)</span>
              </label>
              <textarea
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Se preferir, digite uma resposta fixa pronta para todos os alunos..."
                className="nb-input resize-y bg-white text-xs sm:text-sm"
                data-testid="task-answer-input"
              />
              {answer && (
                <p className="text-[10px] text-emerald-700 mt-0.5 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Resposta direta salva
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="nb-btn bg-white px-5 py-2.5">Cancelar</button>
            <button
              type="submit"
              disabled={saveState !== "idle" || subjects.length === 0}
              className={`nb-btn px-5 py-2.5 flex items-center gap-2 transition-colors duration-200 ${saveState === "saved" ? "bg-emerald-300" : "bg-sky-400"}`}
              data-testid="submit-task-button"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : saveState === "saved" ? (
                <>
                  <Check className="w-4 h-4 animate-check-pop" strokeWidth={3} />
                  <span>Salvo!</span>
                </>
              ) : (
                <span>{isEdit ? "Salvar alterações" : "Criar tarefa"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

// --- Students panel ---
function StudentsPanel() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjustPoints, setAdjustPoints] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      if (!Array.isArray(data)) throw new Error("Formato inválido de usuários");
      setStudents(data);
    } catch (e) {
      try {
        const firestoreUsers = await firebaseService.getAllUsers();
        if (Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
          setStudents(firestoreUsers.filter((u) => u.role === "aluno"));
        } else {
          setStudents([]);
        }
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao carregar alunos");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/users/${confirmDelete.id}`);
      toast.success("Aluno removido");
      setConfirmDelete(null);
      load();
    } catch (e) {
      try {
        await firebaseService.deleteUser(confirmDelete.id);
        toast.success("Aluno removido");
        setConfirmDelete(null);
        load();
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao remover");
      }
    }
  };

  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">Alunos</h1>
          <p className="text-sm text-neutral-600 mt-0.5">Gerencie as contas dos seus alunos e veja as senhas.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCreating({ isBot: true })}
            className="nb-btn bg-white hover:bg-cyan-50 px-3.5 py-2 flex items-center gap-1.5 text-xs sm:text-sm font-bold"
            data-testid="open-create-bot-button"
            title="Criar perfil simulado para testes rápidos"
          >
            <Bot className="w-4 h-4 text-cyan-700" strokeWidth={2.5} /> Novo Bot de Teste
          </button>
          <button
            onClick={() => setCreating({ isBot: false })}
            className="nb-btn admin-btn-primary px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5"
            data-testid="open-create-student-button"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Novo aluno
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando...</p>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum aluno cadastrado" subtitle="Clique em 'Novo aluno' para criar a primeira conta." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((s, i) => {
            const revealed = revealedIds.has(s.id);
            const status = s.status || "active";
            const statusOpt = STATUS_OPTS.find((o) => o.key === status) || STATUS_OPTS[0];
            const StatusIcon = statusOpt.icon;
            return (
              <div key={s.id} className="nb-card nb-card-hover p-5 nb-fade-in" style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }} data-testid={`student-card-${s.id}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <AvatarUploader
                    userId={s.id}
                    name={s.name}
                    hasAvatar={s.has_avatar}
                    onChanged={() => load()}
                    path={`/users/${s.id}/avatar`}
                    size={56}
                    bg="bg-sky-200"
                  />
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setEditing(s)}
                      className="nb-btn bg-amber-200 hover:bg-amber-300 px-2 py-2"
                      data-testid={`edit-student-${s.id}`}
                      aria-label="Editar perfil"
                      title="Editar nome / senha"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: s.id, label: s.name })}
                      className="nb-btn bg-red-200 hover:bg-red-300 px-2 py-2"
                      data-testid={`delete-student-${s.id}`}
                      aria-label="Remover aluno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-heading font-bold text-lg leading-tight">{s.name}</h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="nb-badge bg-amber-200 inline-flex items-center gap-1" data-testid={`student-points-${s.id}`}>
                    <Trophy className="w-3 h-3" /> {s.points || 0} pts
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setAdjustPoints({ student: s, sign: 1 })}
                      className="nb-btn bg-emerald-200 hover:bg-emerald-300 px-1.5 py-1 text-xs"
                      data-testid={`add-points-${s.id}`}
                      title="Adicionar pontos"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setAdjustPoints({ student: s, sign: -1 })}
                      className="nb-btn bg-red-200 hover:bg-red-300 px-1.5 py-1 text-xs"
                      data-testid={`remove-points-${s.id}`}
                      title="Tirar pontos"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        await api.patch(`/users/${s.id}/status`, { status: newStatus });
                        toast.success(`Status alterado para ${STATUS_OPTS.find(o => o.key === newStatus).label}`);
                        load();
                      } catch (err) {
                        toast.error(formatApiError(err?.response?.data?.detail) || "Erro");
                      }
                    }}
                    className={`nb-input cursor-pointer text-sm py-2 ${statusOpt.bg}`}
                    data-testid={`student-status-select-${s.id}`}
                  >
                    {STATUS_OPTS.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold">
                    <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>{statusOpt.label}</span>
                  </div>
                </div>

                {status === "bot" && (
                  <div className="mt-3 p-2.5 bg-cyan-50 border-2 border-cyan-800 text-xs text-cyan-950 font-medium">
                    <div className="flex items-center gap-1 font-black text-cyan-950 mb-1">
                      <Bot className="w-3.5 h-3.5 text-cyan-800" /> Perfil de Teste • Sandbox Ativo
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-neutral-700 font-semibold mt-1">
                      <span className="inline-flex items-center gap-1.5"><Scissors className="w-3 h-3 text-cyan-800 flex-shrink-0" /> Fora do ranking oficial mensal</span>
                      <span className="inline-flex items-center gap-1.5"><Scissors className="w-3 h-3 text-cyan-800 flex-shrink-0" /> Sem disparos de WhatsApp</span>
                      <span className="inline-flex items-center gap-1.5"><Scissors className="w-3 h-3 text-cyan-800 flex-shrink-0" /> Não polui médias da escola</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 nb-card bg-amber-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">Senha de Acesso</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono font-bold truncate select-all" data-testid={`student-password-${s.id}`}>
                      {revealed ? (s.password || s.password_plain || "—") : "••••••••"}
                    </code>
                    <button
                      onClick={() => toggleReveal(s.id)}
                      className="nb-btn bg-white px-2 py-1 flex-shrink-0"
                      aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
                      data-testid={`toggle-password-${s.id}`}
                      title={revealed ? "Ocultar senha" : "Ver senha do aluno"}
                    >
                      {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-sky-700" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <CreateStudentDialog
          initialIsBot={Boolean(creating?.isBot)}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}
      {editing && (
        <EditProfileDialog
          userId={editing.id}
          hasAvatar={editing.has_avatar}
          avatarPath={`/users/${editing.id}/avatar`}
          initialName={editing.name}
          path={`/users/${editing.id}`}
          label={`aluno: ${editing.name}`}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {adjustPoints && (
        <AdjustPointsDialog
          student={adjustPoints.student}
          sign={adjustPoints.sign}
          onClose={() => setAdjustPoints(null)}
          onSaved={() => { setAdjustPoints(null); load(); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Remover aluno?"
          message={`Tem certeza que deseja remover "${confirmDelete.label}"? Todos os progressos deste aluno serão apagados.`}
          confirmLabel="Remover"
          confirmClass="bg-red-300"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function CreateStudentDialog({ initialIsBot = false, onClose, onCreated }) {
  const [isBot, setIsBot] = useState(initialIsBot);
  const [name, setName] = useState(initialIsBot ? "Bot Alfa (Teste)" : "");
  const [password, setPassword] = useState("");
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saving" | "saved"
  const submitting = saveState === "saving";

  const toggleBot = (checked) => {
    setIsBot(checked);
    if (checked && (!name || name === "")) {
      setName("Bot de Teste");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saveState !== "idle") return;
    setSaveState("saving");
    const chosenStatus = isBot ? "bot" : "active";
    try {
      await api.post("/users", { name, password, status: chosenStatus });
      toast.success(isBot ? `Bot de teste ${name} criado!` : `Aluno ${name} criado!`);
      setSaveState("saved");
      setTimeout(() => onCreated(), 360);
    } catch (err) {
      try {
        const id = `${isBot ? "bot" : "aluno"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const email = `${name.toLowerCase().replace(/\s+/g, '.')}-${Date.now().toString().slice(-4)}@escola.com`;
        await firebaseService.saveUser({
          id,
          name: name.trim(),
          email,
          role: "aluno",
          status: chosenStatus,
          password_plain: password,
          points: isBot ? 100 : 0,
          created_at: new Date().toISOString(),
        });
        toast.success(isBot ? `Bot de teste ${name} criado!` : `Aluno ${name} criado!`);
        setSaveState("saved");
        setTimeout(() => onCreated(), 360);
      } catch (err2) {
        setSaveState("idle");
        toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao criar usuário");
      }
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4"
        data-testid="create-student-dialog"
        onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      >
      <div className="nb-card bg-white w-full max-w-md p-5 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-black text-xl sm:text-2xl flex items-center gap-2">
            {isBot ? <Bot className="w-6 h-6 text-cyan-600" /> : null}
            {isBot ? "Novo Bot de Teste" : "Novo aluno"}
          </h3>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-2"><X className="w-4 h-4" /></button>
        </div>

        {/* Bot sandbox toggle */}
        <div className={`p-3 border-2 mb-4 transition-colors ${isBot ? "bg-cyan-100 border-cyan-800" : "bg-neutral-50 border-neutral-300"}`}>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isBot}
              onChange={(e) => toggleBot(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-600 cursor-pointer"
            />
            <div>
              <span className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-cyan-800" /> Criar como Perfil de Teste (Bot)
              </span>
              <p className="text-xs text-neutral-600 mt-0.5">
                Perfil de sandbox com cortes automáticos: isolado de rankings oficiais e bloqueado de envio de WhatsApp.
              </p>
            </div>
          </label>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5">
              {isBot ? "Nome do Bot de Teste" : "Nome do aluno"}
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nb-input"
              placeholder={isBot ? "Ex.: Bot Alfa (Teste)" : "Ex.: Ana Beatriz"}
              data-testid="student-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Senha</label>
            <input
              required
              type="password"
              minLength={3}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nb-input"
              placeholder="Digite a senha"
              data-testid="student-password-input"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Mínimo 3 caracteres.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className="nb-btn bg-white px-5 py-2.5">Cancelar</button>
            <button
              type="submit"
              disabled={saveState !== "idle"}
              className={`nb-btn px-5 py-2.5 font-bold flex items-center gap-2 transition-colors duration-200 ${saveState === "saved" ? "bg-emerald-300" : isBot ? "bg-cyan-300 hover:bg-cyan-400" : "bg-amber-300 hover:bg-amber-400"}`}
              data-testid="submit-student-button"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : saveState === "saved" ? (
                <>
                  <Check className="w-4 h-4 animate-check-pop" strokeWidth={3} />
                  <span>Salvo!</span>
                </>
              ) : (
                <span>{isBot ? "Criar Bot de Teste" : "Criar aluno"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

function ConfirmDialog({ title, message, confirmLabel, confirmClass = "bg-red-300", onCancel, onConfirm }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" data-testid="confirm-dialog">
        <div className="nb-card bg-white w-full max-w-sm p-6">
          <h3 className="font-heading font-black text-xl mb-2">{title}</h3>
          <p className="text-sm text-neutral-700 mb-5">{message}</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="nb-btn bg-white px-4 py-2" data-testid="confirm-cancel">Cancelar</button>
            <button type="button" onClick={onConfirm} className={`nb-btn ${confirmClass} px-4 py-2`} data-testid="confirm-ok">{confirmLabel}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// --- Subjects panel ---
function SubjectsPanel({ annualCycle }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState("sky");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingColorSubject, setEditingColorSubject] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/subjects");
      if (!Array.isArray(data)) throw new Error("Formato inválido de matérias");
      setSubjects(data);
      setCachedSubjects(data);
    } catch (e) {
      try {
        const firestoreSubjects = await firebaseService.getAllSubjects();
        if (Array.isArray(firestoreSubjects) && firestoreSubjects.length > 0) {
          setSubjects(firestoreSubjects);
          setCachedSubjects(firestoreSubjects);
        }
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao carregar matérias");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post("/subjects", { name: newName.trim(), color: selectedColor });
      toast.success("Matéria adicionada com sucesso!");
      setNewName("");
      load();
      window.dispatchEvent(new Event("subjects-updated"));
    } catch (err) {
      try {
        const id = `subj-${Date.now()}`;
        await firebaseService.saveSubject({ id, name: newName.trim(), color: selectedColor });
        toast.success("Matéria adicionada com sucesso!");
        setNewName("");
        load();
        window.dispatchEvent(new Event("subjects-updated"));
      } catch (err2) {
        toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao adicionar matéria");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateColor = async (subjectId, newColor) => {
    try {
      await api.put(`/subjects/${subjectId}`, { color: newColor });
      toast.success("Cor da matéria atualizada!");
      const updated = subjects.map((s) => (s.id === subjectId ? { ...s, color: newColor } : s));
      setSubjects(updated);
      setCachedSubjects(updated);
      window.dispatchEvent(new Event("subjects-updated"));
      setEditingColorSubject(null);
    } catch (err) {
      try {
        const sub = subjects.find((s) => s.id === subjectId);
        if (sub) {
          await firebaseService.saveSubject({ ...sub, color: newColor });
          toast.success("Cor da matéria atualizada!");
          const updated = subjects.map((s) => (s.id === subjectId ? { ...s, color: newColor } : s));
          setSubjects(updated);
          setCachedSubjects(updated);
          window.dispatchEvent(new Event("subjects-updated"));
          setEditingColorSubject(null);
        }
      } catch (err2) {
        toast.error("Falha ao atualizar cor da matéria");
      }
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/subjects/${confirmDelete.id}`);
      toast.success("Matéria removida");
      setConfirmDelete(null);
      load();
      window.dispatchEvent(new Event("subjects-updated"));
    } catch (e) {
      try {
        await firebaseService.deleteSubject(confirmDelete.id);
        toast.success("Matéria removida");
        setConfirmDelete(null);
        load();
        window.dispatchEvent(new Event("subjects-updated"));
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao remover matéria");
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">Matérias</h1>
        <p className="text-sm text-neutral-600 mt-0.5">
          Personalize as matérias e suas cores. As cores selecionadas serão exibidas nos cards, prazos e resumos de todos os alunos.
        </p>
      </div>

      <form onSubmit={add} className="nb-card bg-white p-5 mb-6 max-w-2xl" data-testid="subject-form">
        <div className="font-heading font-black text-sm uppercase tracking-wider text-neutral-800 mb-3 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-sky-600" />
          Cadastrar Nova Matéria
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Filosofia, Química, Robótica..."
            className="nb-input flex-1"
            maxLength={50}
            data-testid="subject-name-input"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="nb-btn admin-btn-primary text-sm px-5 py-2.5 flex items-center justify-center gap-1.5"
            data-testid="add-subject-button"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Adicionar
          </button>
        </div>

        {/* Seletor de Cores da Matéria */}
        <div className="pt-2 border-t border-black/10">
          <div className="text-xs font-heading font-bold text-neutral-700 uppercase tracking-wide mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-neutral-900" />
              Escolha a cor da matéria:
            </span>
            <span className="text-[11px] font-bold text-neutral-500">
              {SUBJECT_COLOR_OPTIONS.find((c) => c.id === selectedColor)?.name}
            </span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {SUBJECT_COLOR_OPTIONS.map((c) => {
              const isSelected = selectedColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`h-9 rounded-lg border-2 border-black transition-transform flex items-center justify-center ${c.bgClass} ${
                    isSelected
                      ? "ring-2 ring-black scale-110 shadow-[2px_2px_0_0_#000] z-10"
                      : "opacity-85 hover:opacity-100 hover:scale-105"
                  }`}
                  title={c.name}
                  aria-label={c.name}
                >
                  {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-black shadow-sm" />}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {loading ? (
        <p className="text-neutral-500 font-bold">Carregando matérias...</p>
      ) : subjects.length === 0 ? (
        <EmptyState icon={BookMarked} title="Nenhuma matéria cadastrada" subtitle="Adicione matérias para usá-las em tarefas." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map((s, i) => {
            const colorCfg = getSubjectColorConfig(s, subjects);
            return (
              <div
                key={s.id}
                className={`nb-card p-4 flex items-center justify-between gap-3 nb-fade-in border-2 border-black shadow-[3px_3px_0_0_#000] ${colorCfg.cardClasses}`}
                style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }}
                data-testid={`subject-item-${s.id}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border border-black flex-shrink-0 ${colorCfg.bgClass} shadow-sm`}
                  />
                  <span className="font-heading font-black text-sm truncate text-black">{s.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingColorSubject(s)}
                    className="nb-btn bg-white hover:bg-neutral-100 px-2 py-1.5 border border-black"
                    title={`Trocar cor de ${s.name}`}
                    aria-label="Trocar cor"
                  >
                    <Palette className="w-3.5 h-3.5 text-neutral-800" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ id: s.id, label: s.name })}
                    className="nb-btn bg-white hover:bg-rose-100 px-2 py-1.5 border border-black"
                    data-testid={`delete-subject-${s.id}`}
                    aria-label="Remover matéria"
                    title="Excluir matéria"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Trocar a Cor de uma Matéria Existente */}
      {editingColorSubject && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="nb-card bg-white p-6 max-w-md w-full border-3 border-black shadow-[6px_6px_0_0_#000] modal-window">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-600" />
                <h3 className="font-heading font-black text-lg text-black">
                  Mudar Cor da Matéria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingColorSubject(null)}
                className="nb-btn bg-white hover:bg-neutral-100 p-1 border border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-neutral-700 font-medium mb-4">
              Escolha uma nova cor para <span className="font-heading font-black text-black">"{editingColorSubject.name}"</span>. Esta alteração será refletida em todas as tarefas, calendário e resumos.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {SUBJECT_COLOR_OPTIONS.map((c) => {
                const isCurrent = (editingColorSubject.color || "sky") === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleUpdateColor(editingColorSubject.id, c.id)}
                    className={`p-2.5 rounded-lg border-2 border-black text-left flex items-center gap-2.5 transition-all ${c.bgClass} ${c.textClass} ${
                      isCurrent
                        ? "ring-2 ring-black font-black shadow-[2px_2px_0_0_#000]"
                        : "opacity-85 hover:opacity-100 hover:scale-[1.02]"
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-black bg-white flex items-center justify-center">
                      {isCurrent && <span className="w-2 h-2 rounded-full bg-black" />}
                    </span>
                    <span className="text-xs font-heading font-bold">{c.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditingColorSubject(null)}
                className="nb-btn bg-neutral-200 hover:bg-neutral-300 font-heading font-bold text-xs px-4 py-2 border-2 border-black"
              >
                Cancelar
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Remover matéria?"
          message={`Tem certeza que deseja remover "${confirmDelete.label}"? Tarefas existentes que usam esta matéria continuam intactas.`}
          confirmLabel="Remover"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="nb-card bg-white p-12 text-center max-w-xl mx-auto">
      <div className="w-14 h-14 nb-card bg-amber-100 mx-auto mb-4 flex items-center justify-center">
        <Icon className="w-6 h-6" strokeWidth={2.2} />
      </div>
      <h3 className="font-heading font-bold text-xl mb-1">{title}</h3>
      <p className="text-neutral-600 text-sm">{subtitle}</p>
    </div>
  );
}

// --- Announcements panel ---
function AnnouncementsPanel({ annualCycle }) {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dispatchAnnouncement, setDispatchAnnouncement] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: anns }, { data: studs }] = await Promise.all([
        api.get("/announcements"),
        api.get("/users"),
      ]);
      if (!Array.isArray(anns) || !Array.isArray(studs)) {
        throw new Error("Formato inválido de avisos");
      }
      setItems(anns);
      setStudents(studs);
    } catch (e) {
      try {
        const [anns, users] = await Promise.all([
          firebaseService.getAllAnnouncements(),
          firebaseService.getAllUsers(),
        ]);
        setItems(Array.isArray(anns) ? anns : []);
        setStudents(Array.isArray(users) ? users.filter((u) => u.role === "aluno") : []);
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail || e2?.message) || "Erro ao carregar avisos");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/announcements/${confirmDelete.id}`);
      toast.success("Aviso removido");
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const normalizeAnnAtt = (item) => {
    if (!item) return null;
    if (typeof item === "string") return { id: item, original_filename: item, content_type: "" };
    if (typeof item === "object" && item.id) {
      return {
        id: String(item.id),
        original_filename: String(item.original_filename || item.filename || item.id),
        content_type: item.content_type || "",
        size: item.size,
      };
    }
    return null;
  };

  const getAnnAttachments = (a) => {
    const raw =
      Array.isArray(a?.attachment_files) && a.attachment_files.length > 0
        ? a.attachment_files
        : Array.isArray(a?.attachments)
        ? a.attachments
        : [];
    return raw.map(normalizeAnnAtt).filter(Boolean);
  };

  const isImgAtt = (att) => {
    const ct = String(att?.content_type || "").toLowerCase();
    const name = String(att?.original_filename || "").toLowerCase();
    return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(name);
  };

  const copyAnnouncement = async (a) => {
    const recipients = a.all_students
      ? "Todos os alunos"
      : (a.recipients || []).map((r) => r.name).join(", ") || "—";
    const atts = getAnnAttachments(a);
    const lines = [
      `📣 ${a.title}`,
      `👥 Destinatários: ${recipients}`,
      `📅 ${formatDateBR(a.created_at)}`,
      "",
      a.message,
    ];
    if (atts.length > 0) {
      lines.push("", `📎 Anexos: ${atts.map((x) => x.original_filename).join(", ")}`);
    }
    const text = lines.join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Aviso copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">Avisos</h1>
          <p className="text-sm text-neutral-600 mt-0.5">Comunique-se com seus alunos. Avisos aparecem no dashboard deles.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="nb-btn admin-btn-primary px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 self-start sm:self-auto"
          data-testid="open-create-announcement-button"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Novo aviso
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhum aviso publicado" subtitle="Clique em 'Novo aviso' para criar." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((a, i) => (
            <div
              key={a.id}
              className={`nb-card nb-card-hover p-5 nb-fade-in ${
                a.is_special
                  ? "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 border-2 border-amber-500 shadow-[5px_5px_0px_0px_rgba(245,158,11,0.7)]"
                  : "bg-white"
              }`}
              style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }}
              data-testid={`announcement-card-${a.id}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 nb-card flex items-center justify-center flex-shrink-0 ${a.is_special ? "bg-amber-300 text-amber-950" : "bg-violet-200"}`}>
                    {a.is_special ? <Star className="w-5 h-5 fill-amber-500 text-amber-950" /> : <Megaphone className="w-5 h-5" strokeWidth={2.5} />}
                  </div>
                  {a.is_special && (
                    <span className="nb-badge bg-amber-300 text-amber-950 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-950 text-amber-950" /> Aviso Especial (Pop-up)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setDispatchAnnouncement(a)}
                    className="nb-btn bg-emerald-300 hover:bg-emerald-400 text-emerald-950 px-2 py-2"
                    data-testid={`whatsapp-announcement-${a.id}`}
                    aria-label="Enviar ao WhatsApp"
                    title="Disparar aviso para os Grupos do WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => copyAnnouncement(a)}
                    className="nb-btn bg-white hover:bg-sky-100 px-2 py-2"
                    data-testid={`copy-announcement-${a.id}`}
                    aria-label="Copiar aviso"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditing(a)}
                    className="nb-btn bg-amber-200 hover:bg-amber-300 px-2 py-2"
                    data-testid={`edit-announcement-${a.id}`}
                    aria-label="Editar aviso"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: a.id, label: a.title })}
                    className="nb-btn bg-red-200 hover:bg-red-300 px-2 py-2"
                    data-testid={`delete-announcement-${a.id}`}
                    aria-label="Remover aviso"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-heading font-bold text-lg leading-tight mb-1">{a.title}</h3>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap mb-3">{a.message}</p>
              {(() => {
                const annsAtts = getAnnAttachments(a);
                if (annsAtts.length === 0) return null;
                const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
                return (
                  <div className="mb-3 space-y-2">
                    <div className="text-[11px] font-heading font-black uppercase tracking-wide text-neutral-700 flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Anexos ({annsAtts.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {annsAtts.map((att) =>
                        isImgAtt(att) ? (
                          <a
                            key={att.id}
                            href={`${API}/files/${att.id}/download?auth=${encodeURIComponent(token || "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative w-20 h-20 rounded-xl border-2 border-black overflow-hidden bg-white shadow-[2px_2px_0_0_#000]"
                            title={att.original_filename}
                          >
                            <img
                              src={`/api/files/${att.id}?auth=${encodeURIComponent(token || "")}`}
                              alt={att.original_filename}
                              className="w-full h-full object-cover group-hover:opacity-80"
                            />
                          </a>
                        ) : (
                          <FileLink key={att.id} file={att} />
                        )
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="nb-badge bg-white">
                  <Users className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {a.all_students
                    ? "Todos os alunos"
                    : `${(a.recipients || []).length} aluno${(a.recipients || []).length === 1 ? "" : "s"}`}
                </span>
                <span className="text-neutral-500">{formatDateBR(a.created_at)}</span>
                {(a.was_edited || a.edited_at) && (
                  <span
                    className="nb-badge bg-amber-200 text-amber-950 border border-black inline-flex items-center gap-1"
                    data-testid={`admin-announcement-edited-${a.id}`}
                    title={a.edited_at ? `Editado em ${formatDateBR(a.edited_at, true)}` : "Aviso editado"}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Editado{a.edited_at ? ` • ${formatDateBR(a.edited_at, true)}` : ""}</span>
                  </span>
                )}
              </div>
              {!a.all_students && (a.recipients || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(a.recipients || []).slice(0, 5).map((r) => (
                    <span key={r.id} className="nb-badge bg-sky-100 text-xs">{r.name}</span>
                  ))}
                  {(a.recipients || []).length > 5 && (
                    <span className="nb-badge bg-white text-xs">+{(a.recipients || []).length - 5}</span>
                  )}
                </div>
              )}
              <AnnouncementComments announcementId={a.id} />
            </div>
          ))}
        </div>
      )}

      {creating && (
        <AnnouncementDialog
          students={students}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
      {editing && (
        <AnnouncementDialog
          announcement={editing}
          students={students}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Remover aviso?"
          message={`Tem certeza que deseja remover "${confirmDelete.label}"?`}
          confirmLabel="Remover"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={onDelete}
        />
      )}
      {dispatchAnnouncement && (
        <WhatsAppDispatchDialog
          open={Boolean(dispatchAnnouncement)}
          type="announcement"
          item={dispatchAnnouncement}
          onClose={() => setDispatchAnnouncement(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}

function AnnouncementDialog({ announcement, students, onClose, onSaved }) {
  const { user } = useAuth();
  const adminId = user?.id || "admin";
  const draftAnnKey = `edutask_draft_announcement_${adminId}`;

  const isEdit = Boolean(announcement);
  const [title, setTitle] = useState(announcement?.title || "");
  const [message, setMessage] = useState(announcement?.message || "");
  const [assignedTo, setAssignedTo] = useState(announcement?.assigned_to || []);
  const [isSpecial, setIsSpecial] = useState(Boolean(announcement?.is_special));
  const [attachments, setAttachments] = useState(() => {
    const raw =
      Array.isArray(announcement?.attachment_files) && announcement.attachment_files.length > 0
        ? announcement.attachment_files
        : Array.isArray(announcement?.attachments)
        ? announcement.attachments
        : [];
    return raw
      .map((item) =>
        typeof item === "string"
          ? { id: item, filename: item, original_filename: item, content_type: "" }
          : item?.id
          ? {
              id: String(item.id),
              filename: String(item.original_filename || item.filename || item.id),
              original_filename: String(item.original_filename || item.filename || item.id),
              content_type: item.content_type || "",
              size: item.size,
            }
          : null
      )
      .filter(Boolean);
  });
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saving" | "saved"
  const submitting = saveState === "saving";

  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [draftSavedStatus, setDraftSavedStatus] = useState(false);

  // Check for auto-saved announcement draft on creation form mount
  useEffect(() => {
    if (!isEdit) {
      try {
        const saved = localStorage.getItem(draftAnnKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.title || parsed.message)) {
            setDraftData(parsed);
            setHasDraft(true);
          }
        }
      } catch {}
    }
  }, [isEdit, draftAnnKey]);

  // Auto-save form fields to localStorage
  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      if (title.trim() || message.trim()) {
        const dataToSave = {
          title,
          message,
          assignedTo,
          isSpecial,
          updatedAt: Date.now(),
        };
        try {
          localStorage.setItem(draftAnnKey, JSON.stringify(dataToSave));
          setDraftSavedStatus(true);
        } catch {}
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [isEdit, title, message, assignedTo, isSpecial, draftAnnKey]);

  const handleContinueAnnDraft = () => {
    if (!draftData) return;
    if (draftData.title) setTitle(draftData.title);
    if (draftData.message) setMessage(draftData.message);
    if (Array.isArray(draftData.assignedTo)) setAssignedTo(draftData.assignedTo);
    if (draftData.isSpecial !== undefined) setIsSpecial(Boolean(draftData.isSpecial));
    setHasDraft(false);
  };

  const handleDiscardAnnDraft = () => {
    try { localStorage.removeItem(draftAnnKey); } catch {}
    setHasDraft(false);
    setDraftData(null);
  };

  const handleUploadAttachment = async (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setUploadingAttachments(true);
    try {
      for (const f of list) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/files/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setAttachments((prev) => [
          ...prev,
          {
            id: data.id,
            filename: data.filename || f.name,
            original_filename: data.filename || f.name,
            content_type: data.content_type || f.type || "",
            size: data.size || f.size,
          },
        ]);
      }
      toast.success("Anexo enviado!");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao enviar anexo");
    } finally {
      setUploadingAttachments(false);
      e.target.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saveState !== "idle") return;
    setSaveState("saving");
    const attachmentIds = attachments.map((f) => f.id);
    const attachmentFilesMeta = attachments.map((f) => ({
      id: f.id,
      original_filename: f.original_filename || f.filename || f.id,
      content_type: f.content_type || "",
      size: f.size,
    }));
    const payload = {
      title,
      message,
      assigned_to: assignedTo,
      is_special: isSpecial,
      attachments: attachmentIds,
      attachment_files: attachmentFilesMeta,
    };
    try {
      if (isEdit) {
        await api.put(`/announcements/${announcement.id}`, payload);
        toast.success("Aviso atualizado!");
      } else {
        await api.post("/announcements", payload);
        toast.success("Aviso publicado!");
      }
      try { localStorage.removeItem(draftAnnKey); } catch {}
      setSaveState("saved");
      setTimeout(() => onSaved(), 360);
    } catch (err) {
      if (err?.response) {
        setSaveState("idle");
        toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao salvar aviso");
        return;
      }
      try {
        const annId = announcement?.id || `ann-${Date.now()}`;
        await firebaseService.saveAnnouncement({
          id: annId,
          title,
          message,
          assigned_to: assignedTo,
          is_special: isSpecial,
          attachments: attachmentIds,
          attachment_files: attachmentFilesMeta,
          created_at: announcement?.created_at || new Date().toISOString(),
        });
        toast.success(isEdit ? "Aviso atualizado!" : "Aviso publicado!");
        try { localStorage.removeItem(draftAnnKey); } catch {}
        setSaveState("saved");
        setTimeout(() => onSaved(), 360);
      } catch (err2) {
        setSaveState("idle");
        toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao salvar aviso");
      }
    }
  };

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-50 bg-black/40 flex ${isEdit ? "items-end sm:items-stretch sm:justify-end p-0" : "items-center justify-center p-3 sm:p-4"}`}
        data-testid="announcement-dialog"
        onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      >
      <div
        className={`nb-card bg-white w-full overflow-auto p-5 sm:p-7 ${
          isEdit
            ? "panel-drawer drawer-panel sm:max-w-xl max-h-[92vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-none sm:rounded-l-2xl border-b-0 sm:border-y-0 sm:border-r-0 shadow-[-6px_0_0_0_#000]"
            : "max-w-xl max-h-[92vh]"
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="font-heading font-black text-xl sm:text-2xl">{isEdit ? "Editar aviso" : "Novo aviso"}</h3>
            {draftSavedStatus && !isEdit && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-600 inline-flex items-center gap-1" data-testid="announcement-draft-saved-indicator">
                <Check className="w-3 h-3 stroke-[3]" /> Rascunho salvo
              </span>
            )}
          </div>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-2"><X className="w-4 h-4" /></button>
        </div>

        {hasDraft && (
          <div className="mb-4 nb-card bg-amber-200 border-2 border-black p-3.5 shadow-[3px_3px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="announcement-draft-banner">
            <div>
              <div className="font-heading font-black text-sm text-black flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-black flex-shrink-0" />
                <span>Rascunho não publicado encontrado</span>
              </div>
              <p className="text-xs font-bold text-neutral-800 mt-0.5">
                Há um rascunho de aviso salvo anteriormente neste navegador.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleContinueAnnDraft}
                className="nb-btn bg-sky-300 hover:bg-sky-400 text-xs font-black px-3 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]"
                data-testid="continue-announcement-draft-button"
              >
                Continuar rascunho
              </button>
              <button
                type="button"
                onClick={handleDiscardAnnDraft}
                className="nb-btn bg-white hover:bg-neutral-100 text-xs font-bold px-2.5 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]"
                data-testid="discard-announcement-draft-button"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5">Título</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reunião de pais" className="nb-input" data-testid="announcement-title-input" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="block text-sm font-bold">Mensagem</label>
              <AIEnhanceButton
                endpoint="/ai/generate-announcement"
                payload={{ prompt: title || message }}
                disabled={!title.trim() && !message.trim()}
                label="Escrever com IA"
                testId="ai-generate-announcement-button"
                onResult={(data) => {
                  if (data.title && !title) setTitle(data.title);
                  setMessage(data.message);
                }}
              />
            </div>
            <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Detalhes do aviso..." className="nb-input resize-y" data-testid="announcement-message-input" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Anexos (Opcional)</label>
            <label className="block w-full border-2 border-dashed border-black rounded-xl bg-sky-50 hover:bg-sky-100 p-4 cursor-pointer transition-colors text-center" data-testid="announcement-file-upload-zone">
              <Upload className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs sm:text-sm font-bold">
                {uploadingAttachments ? "Enviando anexo..." : "Clique para anexar arquivos no aviso"}
              </span>
              <p className="text-[11px] text-neutral-600">PDF, imagens, documentos ou comunicados</p>
              <input
                type="file"
                multiple
                onChange={handleUploadAttachment}
                className="hidden"
                disabled={uploadingAttachments}
                data-testid="announcement-file-input"
              />
            </label>
            {attachments.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {attachments.map((f) => (
                  <div key={f.id} className="flex items-center justify-between nb-card bg-amber-50 px-3 py-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate font-bold">{f.original_filename || f.filename}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments((p) => p.filter((x) => x.id !== f.id))}
                      className="text-red-700 hover:text-red-900"
                      title="Remover anexo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Destinatários</label>
            <RecipientSelector
              students={students}
              value={assignedTo}
              onChange={setAssignedTo}
              testIdPrefix="announcement-recipients"
            />
          </div>

          <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-3">
            <div>
              <label htmlFor="is-special-checkbox" className="text-sm font-bold text-neutral-900 flex items-center gap-1.5 cursor-pointer">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Marcar como Aviso Especial (Pop-up)
              </label>
              <p className="text-xs text-neutral-600 mt-0.5">
                Aparecerá em pop-up destacado na tela do aluno e permanecerá fixado em destaque no painel de avisos.
              </p>
            </div>
            <input
              id="is-special-checkbox"
              type="checkbox"
              checked={isSpecial}
              onChange={(e) => setIsSpecial(e.target.checked)}
              className="w-5 h-5 accent-amber-500 cursor-pointer rounded border-2 border-black flex-shrink-0"
              data-testid="announcement-is-special-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className="nb-btn bg-white px-5 py-2.5">Cancelar</button>
            <button
              type="submit"
              disabled={saveState !== "idle" || uploadingAttachments}
              className={`nb-btn px-5 py-2.5 flex items-center gap-2 transition-colors duration-200 ${saveState === "saved" ? "bg-emerald-300" : "bg-violet-300"}`}
              data-testid="submit-announcement-button"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : saveState === "saved" ? (
                <>
                  <Check className="w-4 h-4 animate-check-pop" strokeWidth={3} />
                  <span>Salvo!</span>
                </>
              ) : (
                <span>{isEdit ? "Salvar alterações" : "Publicar aviso"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

// --- Login logs panel ---
function LoginLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/login-logs");
      setLogs(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearAll = async () => {
    try {
      const { data } = await api.delete("/login-logs");
      toast.success(`${data.deleted} registro${data.deleted === 1 ? "" : "s"} apagado${data.deleted === 1 ? "" : "s"}`);
      setConfirmClear(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const removeOne = async (id) => {
    try {
      await api.delete(`/login-logs/${id}`);
      toast.success("Registro removido");
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  const formatDateTimeBR = (iso) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">Acessos</h1>
          <p className="text-sm text-neutral-600 mt-0.5">Registros e histórico de logins dos alunos.</p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="nb-btn bg-rose-100 hover:bg-rose-200 text-rose-900 px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 self-start sm:self-auto"
            data-testid="clear-logs-button"
          >
            <Trash2 className="w-4 h-4" /> Limpar tudo
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-neutral-500">Carregando...</p>
      ) : logs.length === 0 ? (
        <EmptyState icon={History} title="Nenhum acesso registrado" subtitle="Quando os alunos fizerem login, aparecerá aqui." />
      ) : (
        <div className="nb-card bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="logs-table">
            <thead className="bg-emerald-100 border-b-2 border-black">
              <tr>
                <th className="text-left p-3 text-sm font-heading font-bold">Aluno</th>
                <th className="text-left p-3 text-sm font-heading font-bold">Data e horário</th>
                <th className="text-right p-3 text-sm font-heading font-bold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} className={`${i % 2 === 0 ? "bg-white" : "bg-neutral-50"} border-b border-neutral-200`} data-testid={`log-${l.id}`}>
                  <td className="p-3 font-medium">{l.user_name}</td>
                  <td className="p-3 font-mono text-sm">{formatDateTimeBR(l.created_at)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => removeOne(l.id)}
                      className="nb-btn bg-red-200 hover:bg-red-300 px-2 py-1.5"
                      data-testid={`delete-log-${l.id}`}
                      aria-label="Remover registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Limpar todos os registros?"
          message={`Isso apagará ${logs.length} registro${logs.length === 1 ? "" : "s"} de acesso. Esta ação não pode ser desfeita.`}
          confirmLabel="Limpar tudo"
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearAll}
        />
      )}
    </div>
  );
}


// --- Stats panel (admin) ---
function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    window.addEventListener("prize-updated", fetchStats);
    return () => window.removeEventListener("prize-updated", fetchStats);
  }, [fetchStats]);

  const handleChooseWinner = async (chosen) => {
    setActionLoading(true);
    try {
      const onTimeVal = chosen.on_time_month ?? chosen.on_time_completions ?? 0;
      await api.post("/monthly-prize/confirm-winner", {
        winner_id: chosen.id,
        winner_name: chosen.name,
        score: chosen.score || 98,
        is_tie: false,
        tied_winners: null,
        on_time_month: onTimeVal,
        justification: `Aluno(a) escolhido(a) oficialmente pelo administrador para o Prêmio do Mês entre os alunos empatados no 1º lugar (${onTimeVal} tarefas no prazo e zero pendências).`,
        criteria: [
          `${onTimeVal} entrega(s) rigorosamente no prazo`,
          (chosen.uncompleted_count === 0 || chosen.uncompleted_tasks === 0) ? "Zero pendências no mês" : "Maior compromisso com prazos",
          "Decisão administrativa de desempate"
        ]
      });
      toast.success(`${chosen.name} foi escolhido(a) como vencedor(a) do prêmio!`);
      window.dispatchEvent(new CustomEvent("prize-updated"));
      fetchStats();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao definir vencedor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmJointTie = async () => {
    const leaders = stats?.ai_monthly?.leaders || [];
    if (leaders.length === 0) return;
    setActionLoading(true);
    try {
      const onTimeVal = leaders[0].on_time_month ?? leaders[0].on_time_completions ?? 0;
      await api.post("/monthly-prize/confirm-winner", {
        winner_id: leaders[0].id,
        winner_name: leaders.map((l) => l.name).join(" & "),
        score: leaders[0].score || 98,
        is_tie: true,
        tied_winners: leaders,
        on_time_month: onTimeVal,
        justification: `Empate conjunto oficializado pelo administrador entre ${leaders.map((l) => l.name).join(' e ')} (${onTimeVal} tarefas no prazo e zero pendências).`,
        criteria: [
          `${onTimeVal} entrega(s) rigorosamente no prazo`,
          "Empate conjunto no 1º lugar",
          "Ambos reconhecidos como vencedores conjuntos"
        ]
      });
      toast.success("Empate conjunto oficializado como vencedores do mês!");
      window.dispatchEvent(new CustomEvent("prize-updated"));
      fetchStats();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao oficializar empate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveWinnerChoice = async () => {
    setActionLoading(true);
    try {
      await api.delete("/monthly-prize/winner");
      toast.success("Escolha de vencedor removida! O resultado retornou ao estado original de empate.");
      window.dispatchEvent(new CustomEvent("prize-updated"));
      fetchStats();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao remover escolha");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p className="text-neutral-500">Carregando...</p>;
  if (!stats) return null;

  const maxDayCount = Math.max(1, ...stats.completions_per_day.map((d) => d.count));
  const maxSubjCount = Math.max(1, ...(stats.top_subjects || []).map((s) => s.count));

  const isTie = Boolean(stats.ai_monthly?.is_tie_top1 || (stats.ai_monthly?.leaders && stats.ai_monthly.leaders.length > 1));
  const leaders = stats.ai_monthly?.leaders && stats.ai_monthly.leaders.length > 0
    ? stats.ai_monthly.leaders
    : (stats.ai_monthly?.leader ? [stats.ai_monthly.leader] : []);
  const activeWinner = stats.ai_monthly?.ai_winner;
  const hasCustomWinner = Boolean(activeWinner && !activeWinner.is_tie);
  const hasJointTieWinner = Boolean(activeWinner && activeWinner.is_tie);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">Estatísticas</h1>
        <p className="text-sm text-neutral-600 mt-0.5">Visão geral do engajamento da turma.</p>
      </div>

      <PrizeEditor />

      {/* AI Monthly Leader / Tie Spotlight */}
      {stats.ai_monthly && leaders.length > 0 && (
        <div className="nb-card bg-gradient-to-br from-amber-300 via-amber-200 to-amber-300 p-5 sm:p-6 border-3 border-black relative overflow-hidden" data-testid="admin-ai-leader-card">
          {/* Header Badges */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="nb-badge bg-black text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-300" />
                <span>
                  {isTie
                    ? `Empate no 1º Lugar (${leaders.length} alunos empatados) • ${stats.ai_monthly.month_label}`
                    : `Líder da Avaliação Pedagógica IA • ${stats.ai_monthly.month_label}`}
                </span>
              </span>
              <span className="nb-badge bg-white text-neutral-900 text-xs font-bold">
                Nota IA: {leaders[0]?.score || stats.ai_monthly.leader?.score || 98}/100
              </span>
            </div>

            {activeWinner && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`nb-badge text-xs font-black flex items-center gap-1.5 ${hasCustomWinner ? "bg-emerald-300 text-emerald-950 border-emerald-950" : "bg-amber-400 text-amber-950 border-amber-950"}`}>
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{hasCustomWinner ? `Vencedor Escolhido: ${activeWinner.winner_name}` : `Empate Oficializado: ${activeWinner.winner_name}`}</span>
                </span>
                <button
                  onClick={handleRemoveWinnerChoice}
                  disabled={actionLoading}
                  className="nb-btn bg-red-200 hover:bg-red-300 text-red-950 text-xs py-1 px-2.5 font-black flex items-center gap-1 border-2 border-red-950 shadow-[1px_1px_0px_0px_#000]"
                  title="Tirar a escolha e voltar ao resultado original de empate"
                  data-testid="remove-winner-choice-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Tirar a escolha
                </button>
              </div>
            )}
          </div>

          {/* Tie or Single Leader Layout */}
          {isTie ? (
            <div className="space-y-4">
              <div className="bg-amber-100/90 border-2 border-amber-900/30 rounded-xl p-3 text-xs text-amber-950 font-bold flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-800 flex-shrink-0" />
                  <span>
                    <strong>Informação de Empate:</strong> Os alunos abaixo obtiveram a mesma pontuação máxima de pontualidade ({leaders[0]?.on_time_month || 0} no prazo) e zero pendências.
                  </span>
                </div>
                <span className="text-[11px] bg-amber-300 px-2 py-0.5 rounded border border-amber-900/40">
                  Você pode escolher quem vai ganhar ou manter o empate!
                </span>
              </div>

              {/* Grid dos alunos empatados com opção de escolha individual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {leaders.map((l) => {
                  const isSelectedAsWinner = hasCustomWinner && (activeWinner.winner_id === l.id || activeWinner.winner_name === l.name);
                  return (
                    <div
                      key={l.id}
                      className={`nb-card p-4 transition-all duration-200 flex flex-col justify-between ${
                        isSelectedAsWinner
                          ? "bg-emerald-100 border-3 border-emerald-900 shadow-[4px_4px_0px_0px_#064e3b]"
                          : "bg-white/95 border-2 border-black"
                      }`}
                      data-testid={`tied-candidate-${l.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          userId={l.id}
                          name={l.name}
                          size={56}
                          hasAvatar={l.has_avatar}
                          bg="bg-sky-300"
                          effect={effectClass(l.equipped_effect)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-heading font-black text-lg text-neutral-900 leading-tight truncate">
                              {l.name}
                            </h4>
                            <span className="nb-badge bg-amber-200 text-amber-900 text-[10px] font-black flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-800" /> 1º Lugar
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="nb-badge bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              {l.on_time_month || 0} no prazo
                            </span>
                            <span className="nb-badge bg-white text-neutral-800 text-[10px] font-bold">
                              {l.uncompleted_count === 0 ? "0 pendências" : `${l.uncompleted_count} pend.`}
                            </span>
                            <span className="nb-badge bg-violet-100 text-violet-950 text-[10px] font-bold flex items-center gap-1">
                              <Coins className="w-3 h-3 text-violet-700" /> {l.points || 0} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Escolha para este aluno */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-200 flex items-center justify-between gap-2">
                        {isSelectedAsWinner ? (
                          <span className="nb-badge bg-emerald-300 text-emerald-950 font-black text-xs py-1.5 px-3 border border-emerald-900 flex items-center justify-center gap-1 w-full">
                            <Trophy className="w-3.5 h-3.5" /> Vencedor(a) Escolhido(a)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleChooseWinner(l)}
                            disabled={actionLoading}
                            className="nb-btn bg-white hover:bg-emerald-200 text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] w-full justify-center"
                            title={`Escolher ${l.name} para vencer o prêmio individualmente`}
                            data-testid={`choose-winner-${l.id}`}
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-600" />
                            <span>Escolher {l.name} como Vencedor(a)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barra de Ações Coletivas do Empate */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <button
                  onClick={handleConfirmJointTie}
                  disabled={actionLoading}
                  className={`nb-btn text-xs py-2 px-3.5 font-bold flex items-center gap-1.5 ${
                    hasJointTieWinner
                      ? "bg-amber-400 text-amber-950 border-2 border-black"
                      : "bg-white hover:bg-amber-100 text-neutral-900"
                  }`}
                  data-testid="confirm-joint-tie-btn"
                >
                  <Users className="w-4 h-4 text-amber-700" />
                  {hasJointTieWinner ? "Empate Conjunto Oficializado (Ambos Vencem)" : "Oficializar Empate Conjunto (Ambos Vencem)"}
                </button>

                {activeWinner && (
                  <button
                    onClick={handleRemoveWinnerChoice}
                    disabled={actionLoading}
                    className="nb-btn bg-red-200 hover:bg-red-300 text-red-950 text-xs py-2 px-3.5 font-black flex items-center gap-1.5 border-2 border-red-900"
                    data-testid="remove-choice-btn"
                  >
                    <Trash2 className="w-4 h-4" /> Tirar a Escolha (Voltar ao Empate)
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Caso de líder único */
            <div className="space-y-4">
              <div className="flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap mt-3">
                <Avatar
                  userId={stats.ai_monthly.leader.id}
                  name={stats.ai_monthly.leader.name}
                  size={64}
                  hasAvatar={stats.ai_monthly.leader.has_avatar}
                  bg="bg-sky-300"
                  effect={effectClass(stats.ai_monthly.leader.equipped_effect)}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-black text-2xl text-neutral-900 leading-tight">
                    {stats.ai_monthly.leader.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="nb-badge bg-white text-emerald-900 text-xs font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      {stats.ai_monthly.leader.on_time_month} tarefa(s) no prazo
                    </span>
                    <span className="nb-badge bg-white text-neutral-900 text-xs font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {stats.ai_monthly.leader.uncompleted_count === 0 ? "Zero pendências" : `${stats.ai_monthly.leader.uncompleted_count} pendência(s)`}
                    </span>
                    <span className="nb-badge bg-white text-violet-950 text-xs font-bold inline-flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-violet-700" /> {stats.ai_monthly.leader?.points || 0} pts (p/ molduras)
                    </span>
                  </div>
                </div>
              </div>

              {activeWinner && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleRemoveWinnerChoice}
                    disabled={actionLoading}
                    className="nb-btn bg-red-200 hover:bg-red-300 text-red-950 text-xs py-1.5 px-3 font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Tirar a Escolha
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Parecer Pedagógico da IA */}
          <div className="mt-4 nb-card bg-white/95 p-3.5 border-2 border-black text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Parecer Pedagógico da IA:
            </div>
            {stats.ai_monthly.leader_verdict}
          </div>
        </div>
      )}

      {/* Total cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Tarefas" value={stats.totals.tasks} bg="bg-sky-200" />
        <StatTile label="Conclusões" value={stats.totals.completions} bg="bg-emerald-200" />
        <StatTile label="Avisos" value={stats.totals.announcements} bg="bg-violet-200" />
        <StatTile label="Alunos" value={stats.totals.students} bg="bg-amber-200" />
      </div>

      {/* Top alunos */}
      <div>
        <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="font-heading font-bold text-2xl">Destaques do Mês</h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Ordenados por pontualidade e menos pendências. <strong>Lembrete:</strong> O sistema de níveis foi desligado permanentemente; os pontos são apenas para adquirir molduras na loja e o vencedor mensal é avaliado pela IA.
            </p>
          </div>
        </div>
        {(stats.top_students || []).length === 0 ? (
          <p className="text-neutral-600 text-sm">Nenhum aluno cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.top_students.map((s, i) => {
              const tiedIds = new Set((stats.ai_monthly?.leaders || []).map((l) => l.id));
              const isTiedWithTop = isTie && tiedIds.has(s.id);
              return (
                <div key={s.id} className="nb-card p-4 bg-white flex items-center gap-3" data-testid={`top-student-${s.id}`}>
                  <div className={`font-heading font-black text-2xl w-12 text-center flex flex-col items-center justify-center leading-none ${
                    isTiedWithTop || i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-700" : "text-neutral-500"
                  }`}>
                    <span>{isTiedWithTop ? "#1" : `#${i + 1}`}</span>
                    {isTiedWithTop && (
                      <span className="text-[8px] uppercase tracking-wider font-bold bg-amber-200 text-amber-950 px-1 py-0.5 rounded mt-0.5 leading-none">
                        Empate
                      </span>
                    )}
                  </div>
                  <Avatar userId={s.id} name={s.name} size={48} hasAvatar={s.has_avatar} bg="bg-sky-200" />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold truncate flex items-center gap-1.5">
                      <span>{s.name}</span>
                      {isTiedWithTop && (
                        <span className="nb-badge bg-amber-100 text-amber-900 text-[9px] font-bold inline-flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-700" /> Top 1
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="nb-badge bg-emerald-100 text-emerald-900 text-[10px] font-bold inline-flex items-center gap-1">
                        <Target className="w-3 h-3 text-emerald-700" /> {s.on_time_completions || 0} no prazo
                      </span>
                      <span className="nb-badge bg-amber-100 text-amber-900 text-[10px] font-bold inline-flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-amber-800" /> {s.points || 0} pts
                      </span>
                      {s.uncompleted_tasks != null && (
                        <span className="nb-badge bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                          {s.uncompleted_tasks === 0 ? "0 pendências" : `${s.uncompleted_tasks} pend.`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Conclusões últimos 7 dias */}
      <div>
        <h2 className="font-heading font-bold text-2xl mb-3">Resumo Semanal de Conclusões</h2>

        <div className="nb-card bg-white p-5">
          <div className="flex items-end gap-2 h-40" data-testid="completions-chart">
            {stats.completions_per_day.map((d) => {
              const h = (d.count / maxDayCount) * 100;
              const day = new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <div className="text-xs font-bold">{d.count}</div>
                  <div
                    className="w-full nb-card bg-emerald-300"
                    style={{ height: `${Math.max(h, 4)}%`, minHeight: 4 }}
                  />
                  <div className="text-[10px] text-neutral-600 text-center">{day}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top matérias */}
      {stats.top_subjects && stats.top_subjects.length > 0 && (
        <div>
          <h2 className="font-heading font-bold text-2xl mb-3">Matérias com mais tarefas</h2>
          <div className="nb-card bg-white p-5 space-y-3">
            {stats.top_subjects.map((s) => {
              const w = (s.count / maxSubjCount) * 100;
              return (
                <div key={s.subject} className="flex items-center gap-3">
                  <div className="w-32 font-bold text-sm truncate">{s.subject}</div>
                  <div className="flex-1 h-7 border-2 border-black rounded-lg overflow-hidden bg-neutral-50">
                    <div className="h-full bg-amber-300" style={{ width: `${w}%` }} />
                  </div>
                  <div className="w-10 text-right text-sm font-bold">{s.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, bg }) {
  return (
    <div className={`nb-card p-4 ${bg}`}>
      <div className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-heading font-black text-3xl sm:text-4xl mt-1">{value}</div>
    </div>
  );
}


function AdjustPointsDialog({ student, sign, onClose, onSaved }) {
  const [amount, setAmount] = useState(5);
  const [reason, setReason] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const submitting = saveState === "saving";
  const isAdd = sign > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (amount <= 0 || saveState !== "idle") return;
    setSaveState("saving");
    try {
      const { data } = await api.post(`/users/${student.id}/points`, {
        delta: isAdd ? amount : -amount,
        reason: reason.trim(),
      });
      toast.success(`${isAdd ? "+" : "-"}${amount} pts → ${data.total_points} pts totais`);
      setSaveState("saved");
      setTimeout(() => onSaved(), 360);
    } catch (err) {
      setSaveState("idle");
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao ajustar pontos");
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-4"
        data-testid="adjust-points-dialog"
        onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      >
      <div className="nb-card bg-white w-full max-w-md p-5 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-black text-xl sm:text-2xl">
            {isAdd ? "Adicionar pontos" : "Tirar pontos"}
          </h3>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-2"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-neutral-600 mb-4">Aluno: <span className="font-bold">{student.name}</span> ({student.points || 0} pts atualmente)</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5">Quantidade</label>
            <input
              type="number"
              required
              min="1"
              max="1000"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
              className="nb-input"
              data-testid="adjust-amount-input"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Motivo (opcional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAdd ? "Ex.: ajudou os colegas" : "Ex.: comportamento inadequado"}
              maxLength={200}
              className="nb-input"
              data-testid="adjust-reason-input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className="nb-btn bg-white px-5 py-2.5">Cancelar</button>
            <button
              type="submit"
              disabled={saveState !== "idle"}
              className={`nb-btn px-5 py-2.5 flex items-center gap-2 transition-colors duration-200 ${saveState === "saved" ? "bg-emerald-300" : isAdd ? "bg-emerald-300" : "bg-red-300"}`}
              data-testid="submit-adjust-points"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : saveState === "saved" ? (
                <>
                  <Check className="w-4 h-4 animate-check-pop" strokeWidth={3} />
                  <span>Salvo!</span>
                </>
              ) : (
                <span>{isAdd ? `+${amount} pts` : `-${amount} pts`}</span>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

// --- Prize editor (inside StatsPanel) ---
function PrizeEditor() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🏆");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/monthly-prize");
      setData(data);
      if (data.prize) {
        setTitle(data.prize.title);
        setDescription(data.prize.description || "");
        setEmoji(data.prize.emoji || "🏆");
      }
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put("/monthly-prize", { title, description, emoji });
      toast.success("Prêmio salvo!");
      setEditing(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete("/monthly-prize");
      toast.success("Prêmio do mês removido com sucesso!");
      setTitle("");
      setDescription("");
      setEmoji("🏆");
      setData((prev) => (prev ? { ...prev, prize: null } : null));
      load();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao remover prêmio");
    }
  };

  if (!data) return null;

  return (
    <div data-testid="prize-editor">
      <h2 className="font-heading font-bold text-2xl mb-3 flex items-center gap-2">
        <Trophy className="w-6 h-6" /> Prêmio do mês
      </h2>
      <div className="nb-card bg-amber-100 p-5">
        {!editing && data.prize ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 nb-card flex items-center justify-center bg-amber-300 text-2xl">
                {data.prize.emoji && data.prize.emoji !== "🏆" ? (
                  data.prize.emoji
                ) : (
                  <Trophy className="w-6 h-6 text-amber-950" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-black text-xl">{data.prize.title}</h3>
                {data.prize.description && <p className="text-sm text-neutral-700 mt-1">{data.prize.description}</p>}
                <p className="text-xs text-neutral-600 mt-2">
                  Restam {data.days_remaining} dia{data.days_remaining === 1 ? "" : "s"}
                  {data.is_tie_top1 && data.leaders?.length > 1 ? (
                    <span>
                      {" "}• <Crown className="w-3.5 h-3.5 text-amber-800 inline -mt-0.5 mr-1" /><span className="font-bold text-amber-950">Empate no 1º lugar:</span>{" "}
                      {data.leaders.map((l) => l.name).join(" e ")} ({(data.leaders[0]?.on_time_month ?? data.leaders[0]?.on_time ?? 0)} no prazo)
                      {data.ai_winner && (
                        <span className="ml-1">
                          • <span className="font-bold text-emerald-900">[Vencedor: {data.ai_winner.winner_name}]</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.delete("/monthly-prize/winner");
                                toast.success("Escolha de vencedor removida!");
                                window.dispatchEvent(new CustomEvent("prize-updated"));
                                load();
                              } catch (e) {
                                toast.error("Falha ao remover escolha");
                              }
                            }}
                            className="ml-2 text-xs font-bold text-red-700 hover:text-red-900 underline"
                          >
                            Tirar escolha
                          </button>
                        </span>
                      )}
                    </span>
                  ) : data.leader ? (
                    <span>
                      {" "}• Liderando: <span className="font-bold">{data.leader.name}</span> ({(data.leader?.on_time_month ?? data.leader?.on_time ?? 0)} no prazo • {data.leader?.points || 0} pts)
                      {data.ai_winner && (
                        <span className="ml-1">
                          • <span className="font-bold text-emerald-900">[Vencedor: {data.ai_winner.winner_name}]</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.delete("/monthly-prize/winner");
                                toast.success("Escolha de vencedor removida!");
                                window.dispatchEvent(new CustomEvent("prize-updated"));
                                load();
                              } catch (e) {
                                toast.error("Falha ao remover escolha");
                              }
                            }}
                            className="ml-2 text-xs font-bold text-red-700 hover:text-red-900 underline"
                          >
                            Tirar escolha
                          </button>
                        </span>
                      )}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="nb-btn bg-white px-3 py-1.5 text-sm flex items-center gap-1.5" data-testid="edit-prize-button">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={remove} className="nb-btn bg-red-200 hover:bg-red-300 px-3 py-1.5 text-sm flex items-center gap-1.5" data-testid="remove-prize-button">
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            </div>
          </div>
        ) : !editing && !data.prize ? (
          <div className="text-center">
            <p className="text-sm text-neutral-700 mb-3">Nenhum prêmio configurado.</p>
            <button onClick={() => setEditing(true)} className="nb-btn bg-amber-300 px-4 py-2 flex items-center gap-2 mx-auto" data-testid="set-prize-button">
              <Plus className="w-4 h-4" /> Definir prêmio do mês
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Emoji</label>
                <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="nb-input text-center text-2xl" data-testid="prize-emoji-input" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Prêmio</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: 1 caixa de bombom" className="nb-input" data-testid="prize-title-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Detalhes (opcional)</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: entrega no último dia letivo" className="nb-input resize-none" data-testid="prize-description-input" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditing(false)} className="nb-btn bg-white px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={submitting || !title.trim()} className="nb-btn bg-amber-300 px-4 py-2 text-sm" data-testid="save-prize-button">
                {submitting ? "Salvando..." : "Salvar prêmio"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

