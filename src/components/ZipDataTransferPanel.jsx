import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import ModalPortal from "@/components/ModalPortal";
import {
  FileArchive,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  Check,
  ShieldCheck,
  Database,
  CloudUpload,
  HardDrive,
  Clock,
  FolderCheck,
  Trash2,
  LogOut,
  RotateCcw,
  X,
} from "lucide-react";
import api from "@/lib/api";
import {
  downloadDriveBackup,
  deleteDriveBackup,
  getDriveAccessToken,
  listDriveBackups,
} from "@/lib/googleDrive";
import {
  connectGoogleDriveAccount,
  disconnectGoogleDriveAccount,
  runGoogleDriveBackup,
  updateAutoBackupConfig,
  useAutoDriveBackup,
} from "@/lib/autoBackupManager";

const INTERVAL_OPTIONS = [
  { value: 15, label: "A cada 15 minutos" },
  { value: 30, label: "A cada 30 minutos" },
  { value: 60, label: "A cada 1 hora" },
  { value: 180, label: "A cada 3 horas" },
  { value: 360, label: "A cada 6 horas" },
  { value: 720, label: "A cada 12 horas" },
  { value: 1440, label: "Diariamente (24 horas)" },
];

function formatBytesBR(bytesStr) {
  const num = Number(bytesStr);
  if (!Number.isFinite(num) || num <= 0) return "—";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTimeBR(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return isoStr;
  }
}

export default function ZipDataTransferPanel() {
  // Shared Automatic Backup + Drive Auth state
  const { config: autoConfig, backingUp, driveAuth } = useAutoDriveBackup(false);

  // Local Export & Drive list states
  const [exporting, setExporting] = useState(false);
  const [signingInDrive, setSigningInDrive] = useState(false);
  const [includeUploads, setIncludeUploads] = useState(true);
  const [savingAutoConfig, setSavingAutoConfig] = useState(false);

  const [driveBackups, setDriveBackups] = useState([]);
  const [loadingDriveList, setLoadingDriveList] = useState(false);
  const [busyDriveFileId, setBusyDriveFileId] = useState(null);
  const [confirmDeleteBackup, setConfirmDeleteBackup] = useState(null);
  const [deletingDriveFile, setDeletingDriveFile] = useState(false);

  // Import states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importMode, setImportMode] = useState("merge"); // 'merge' | 'overwrite'

  // Granular options
  const [optUsers, setOptUsers] = useState(true);
  const [optTasks, setOptTasks] = useState(true);
  const [optSubjects, setOptSubjects] = useState(true);
  const [optSummaries, setOptSummaries] = useState(true);
  const [optAnnouncements, setOptAnnouncements] = useState(true);
  const [optCompletions, setOptCompletions] = useState(true);
  const [optUploads, setOptUploads] = useState(true);
  const [optButtons, setOptButtons] = useState(true);
  const [optSchedule, setOptSchedule] = useState(true);
  const [optEffects, setOptEffects] = useState(true);
  const [optWhatsapp, setOptWhatsapp] = useState(true);
  const [optMonthly, setOptMonthly] = useState(true);
  const [optSettings, setOptSettings] = useState(true);

  const fileInputRef = useRef(null);
  const importSectionRef = useRef(null);

  const refreshDriveBackups = useCallback(async (silent = false) => {
    const token = getDriveAccessToken();
    if (!token) {
      setDriveBackups([]);
      return;
    }
    try {
      setLoadingDriveList(true);
      const files = await listDriveBackups(token);
      setDriveBackups(Array.isArray(files) ? files : []);
    } catch (err) {
      if (!silent) {
        toast.error(err?.message || "Erro ao listar backups do Google Drive.");
      }
    } finally {
      setLoadingDriveList(false);
    }
  }, []);

  useEffect(() => {
    if (driveAuth.connected) {
      refreshDriveBackups(true);
    } else {
      setDriveBackups([]);
    }
  }, [driveAuth.connected, refreshDriveBackups]);

  useEffect(() => {
    const onCompleted = () => {
      if (driveAuth.connected) {
        refreshDriveBackups(true);
      }
    };
    window.addEventListener("edutask:drive-backup-completed", onCompleted);
    return () => {
      window.removeEventListener("edutask:drive-backup-completed", onCompleted);
    };
  }, [driveAuth.connected, refreshDriveBackups]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningInDrive(true);
      const res = await connectGoogleDriveAccount();
      toast.success(
        `Google Drive conectado${res?.user?.email ? ` (${res.user.email})` : ""}!`
      );
      await refreshDriveBackups(true);
    } catch (err) {
      toast.error(err?.message || "Não foi possível conectar ao Google Drive.");
    } finally {
      setSigningInDrive(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await disconnectGoogleDriveAccount();
    setDriveBackups([]);
    toast.info("Conta do Google Drive desconectada desta sessão.");
  };

  const handleUpdateAutoConfig = async (patch, successMsg) => {
    try {
      setSavingAutoConfig(true);
      await updateAutoBackupConfig(patch);
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Erro ao salvar configuração de backup automático."
      );
    } finally {
      setSavingAutoConfig(false);
    }
  };

  const handleUploadToDriveNow = async () => {
    const result = await runGoogleDriveBackup("manual", includeUploads);
    if (result.ok) {
      await refreshDriveBackups(true);
    }
  };

  const handleDownloadFromDrive = async (driveFile) => {
    const token = getDriveAccessToken();
    if (!token) {
      toast.error("Conecte sua conta do Google Drive primeiro.");
      return;
    }
    try {
      setBusyDriveFileId(driveFile.id);
      toast.loading(`Baixando "${driveFile.name}" do Google Drive...`, {
        id: "drive-download",
      });
      const blob = await downloadDriveBackup(token, driveFile.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", driveFile.name || "edutask-backup.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Backup baixado do Google Drive!", { id: "drive-download" });
    } catch (err) {
      toast.error(err?.message || "Erro ao baixar arquivo do Google Drive.", {
        id: "drive-download",
      });
    } finally {
      setBusyDriveFileId(null);
    }
  };

  const handleLoadDriveBackupToRestore = async (driveFile) => {
    const token = getDriveAccessToken();
    if (!token) {
      toast.error("Conecte sua conta do Google Drive primeiro.");
      return;
    }
    try {
      setBusyDriveFileId(driveFile.id);
      toast.loading(`Carregando "${driveFile.name}" do Google Drive para inspeção...`, {
        id: "drive-restore-preview",
      });
      const blob = await downloadDriveBackup(token, driveFile.id);
      const zipFile = new File([blob], driveFile.name || "edutask_backup.zip", {
        type: "application/zip",
      });
      toast.dismiss("drive-restore-preview");
      await inspectSelectedZipFile(zipFile);
      importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      toast.error(err?.message || "Erro ao carregar backup do Google Drive.", {
        id: "drive-restore-preview",
      });
    } finally {
      setBusyDriveFileId(null);
    }
  };

  const handleConfirmDeleteDriveBackup = async () => {
    if (!confirmDeleteBackup) return;
    const token = getDriveAccessToken();
    if (!token) {
      toast.error("Sessão do Google Drive expirada. Conecte-se novamente.");
      setConfirmDeleteBackup(null);
      return;
    }
    try {
      setDeletingDriveFile(true);
      await deleteDriveBackup(token, confirmDeleteBackup.id);
      toast.success(`Backup "${confirmDeleteBackup.name}" excluído do Google Drive.`);
      setConfirmDeleteBackup(null);
      await refreshDriveBackups(true);
    } catch (err) {
      toast.error(err?.message || "Erro ao excluir backup no Google Drive.");
    } finally {
      setDeletingDriveFile(false);
    }
  };

  // Trigger export download
  const handleExportZip = async () => {
    try {
      setExporting(true);
      toast.loading("Compactando dados e arquivos em ZIP...", { id: "zip-export" });

      const response = await api.get(
        `/admin/zip/export?include_uploads=${includeUploads}&type=full`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute("download", `edutask-backup-${dateStr}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Arquivo ZIP baixado com sucesso para o seu dispositivo!", { id: "zip-export" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar arquivo ZIP.", { id: "zip-export" });
    } finally {
      setExporting(false);
    }
  };

  const inspectSelectedZipFile = async (file) => {
    setSelectedFile(file);
    setPreviewData(null);
    setImportResult(null);
    setPreviewLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      toast.loading("Analisando estrutura do arquivo ZIP...", { id: "zip-preview" });
      const { data } = await api.post("/admin/zip/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPreviewData(data);
      toast.success("Arquivo ZIP verificado com sucesso!", { id: "zip-preview" });
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.detail || "Erro ao inspecionar o arquivo ZIP.",
        { id: "zip-preview" }
      );
      setSelectedFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Select and preview zip file
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Por favor, selecione um arquivo no formato .zip");
      return;
    }

    await inspectSelectedZipFile(file);
  };

  // Perform import
  const handleImportZip = async () => {
    if (!selectedFile) return;

    try {
      setImporting(true);
      toast.loading("Importando e sincronizando dados do ZIP...", { id: "zip-import" });

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mode", importMode);
      formData.append("import_users", String(optUsers));
      formData.append("import_tasks", String(optTasks));
      formData.append("import_subjects", String(optSubjects));
      formData.append("import_summaries", String(optSummaries));
      formData.append("import_announcements", String(optAnnouncements));
      formData.append("import_completions", String(optCompletions));
      formData.append("import_uploads", String(optUploads));
      formData.append("import_buttons", String(optButtons));
      formData.append("import_schedule", String(optSchedule));
      formData.append("import_effects", String(optEffects));
      formData.append("import_whatsapp", String(optWhatsapp));
      formData.append("import_monthly", String(optMonthly));
      formData.append("import_settings", String(optSettings));

      const { data } = await api.post("/admin/zip/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImportResult(data);
      toast.success("Dados do ZIP importados com sucesso!", { id: "zip-import" });
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.detail || "Erro ao importar dados do ZIP.",
        { id: "zip-import" }
      );
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 nb-fade-in" data-testid="zip-data-transfer-panel">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">
              Dados ZIP & Backup Automático
            </h1>
            <span className="nb-badge bg-emerald-100 text-emerald-950 font-bold text-xs inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Compatibilidade Total
            </span>
          </div>
          <p className="text-sm text-neutral-600 mt-0.5 max-w-2xl">
            Ative o backup automático no <strong>Google Drive</strong>, envie cópias instantâneas ou baixe pacotes <strong>.ZIP</strong> completos no dispositivo.
          </p>
        </div>
      </div>

      {/* CARD ESPECIAL: BACKUP AUTOMÁTICO E DIRETO NO GOOGLE DRIVE */}
      <div
        className="nb-card p-4 sm:p-6 bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 border-2 border-black space-y-5"
        data-testid="drive-backup-section"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-300 border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#000] flex-shrink-0">
              <HardDrive className="w-5 h-5 text-amber-950" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-lg text-neutral-900 leading-tight">
                Backup Automático no Google Drive
              </h3>
              <p className="text-xs text-neutral-700 mt-0.5">
                Salva cópias automáticas e manuais na pasta <strong>"EduTask Backups"</strong> do seu Google Drive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {driveAuth.connected ? (
              <>
                <span
                  className="nb-badge bg-emerald-300 text-emerald-950 border border-black text-xs font-black inline-flex items-center gap-1.5"
                  data-testid="drive-connected-badge"
                >
                  <FolderCheck className="w-4 h-4 text-emerald-900" />
                  {driveAuth.user?.email || "Google Drive Conectado"}
                </span>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="nb-btn bg-white hover:bg-rose-50 text-neutral-800 px-3 min-h-[40px] text-xs font-bold inline-flex items-center gap-1.5"
                  data-testid="drive-signout-button"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingInDrive}
                className="gsi-material-button inline-flex items-center gap-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border-2 border-black rounded-xl px-3.5 min-h-[44px] font-bold text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-60"
                data-testid="google-drive-signin-button"
              >
                <span className="w-5 h-5 flex-shrink-0 inline-flex items-center justify-center">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: "block", width: "18px", height: "18px" }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </span>
                <span>
                  {signingInDrive ? "Conectando Google..." : "Sign in with Google"}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção 1: Regras e Agendamento Automático */}
          <div className="bg-white p-4 rounded-xl border-2 border-black flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="font-heading font-black text-sm text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Ativar Backup Automático no Drive
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(autoConfig.enabled)}
                  disabled={savingAutoConfig}
                  onChange={(e) =>
                    handleUpdateAutoConfig(
                      { enabled: e.target.checked },
                      e.target.checked
                        ? "Backup automático no Google Drive ATIVADO!"
                        : "Backup automático no Google Drive desativado."
                    )
                  }
                  className="w-5 h-5 accent-amber-500 cursor-pointer flex-shrink-0"
                  data-testid="toggle-auto-drive-backup"
                />
              </label>

              <div className="space-y-1">
                <label
                  htmlFor="auto-backup-interval-select"
                  className="block text-xs font-bold text-neutral-700"
                >
                  Frequência do envio automático:
                </label>
                <select
                  id="auto-backup-interval-select"
                  value={autoConfig.interval_minutes || 60}
                  disabled={savingAutoConfig}
                  onChange={(e) =>
                    handleUpdateAutoConfig(
                      { interval_minutes: Number(e.target.value) },
                      "Frequência de backup automático atualizada!"
                    )
                  }
                  className="nb-input w-full text-xs font-bold min-h-[42px]"
                  data-testid="select-auto-backup-interval"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={autoConfig.backup_on_changes !== false}
                  disabled={savingAutoConfig}
                  onChange={(e) =>
                    handleUpdateAutoConfig(
                      { backup_on_changes: e.target.checked },
                      "Backup após alterações atualizado!"
                    )
                  }
                  className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer flex-shrink-0"
                  data-testid="toggle-auto-backup-on-changes"
                />
                <span>
                  Gerar backup automático após alterações importantes (tarefas, resumos, alunos e cronograma)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={autoConfig.include_uploads !== false}
                  disabled={savingAutoConfig}
                  onChange={(e) =>
                    handleUpdateAutoConfig(
                      { include_uploads: e.target.checked },
                      "Preferência de anexos no backup automático salva!"
                    )
                  }
                  className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer flex-shrink-0"
                  data-testid="toggle-auto-backup-uploads"
                />
                <span>
                  Incluir pasta <code className="bg-neutral-100 px-1 rounded">uploads/</code> (fotos, PDFs e anexos)
                </span>
              </label>
            </div>

            {autoConfig.enabled && !driveAuth.connected && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 text-[11px] text-amber-950 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span>
                  Backup automático está ligado. Clique em <strong>Sign in with Google</strong> acima para autorizar os envios automáticos nesta sessão.
                </span>
              </div>
            )}
          </div>

          {/* Opção 2: Envio Imediato & Último Status */}
          <div className="bg-white p-4 rounded-xl border-2 border-black flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <span className="font-heading font-black text-sm text-neutral-900 flex items-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-sky-600" />
                Enviar Backup para o Google Drive
              </span>
              <p className="text-xs text-neutral-600">
                Envia imediatamente um pacote <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">edutask_backup_*.zip</code> para a pasta <strong>EduTask Backups</strong> no seu Google Drive.
              </p>

              {autoConfig.last_backup_at ? (
                <div
                  className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] text-emerald-900 space-y-1"
                  data-testid="last-drive-backup-info"
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>Último backup: {formatDateTimeBR(autoConfig.last_backup_at)}</span>
                  </div>
                  {autoConfig.last_backup_filename && (
                    <div className="truncate opacity-85">
                      Arquivo: <strong>{autoConfig.last_backup_filename}</strong>
                    </div>
                  )}
                  <div className="opacity-75">
                    Total enviados no Drive: <strong>{autoConfig.total_backups_sent || 0}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-[11px] text-neutral-600">
                  Nenhum backup enviado ao Google Drive ainda nesta base.
                </div>
              )}

              {autoConfig.last_backup_status === "error" && autoConfig.last_backup_error && (
                <div className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-[11px] text-rose-800 font-medium">
                  Último aviso: {autoConfig.last_backup_error}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleUploadToDriveNow}
              disabled={backingUp}
              className="w-full nb-btn bg-amber-300 hover:bg-amber-400 text-neutral-950 min-h-[44px] py-2.5 text-xs font-black flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
              data-testid="upload-drive-backup-button"
            >
              {backingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-900" />
                  <span>Enviando para Pasta "EduTask Backups"...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Fazer Backup no Google Drive Agora</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lista de backups armazenados na pasta EduTask Backups (visível quando conectado) */}
        {driveAuth.connected && (
          <div className="bg-white p-4 rounded-xl border-2 border-black space-y-3" data-testid="drive-backups-list-card">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="font-heading font-black text-sm text-neutral-900">
                  Cópias na Pasta "EduTask Backups"
                </h4>
                <p className="text-[11px] text-neutral-600">
                  Baixe ou restaure diretamente qualquer backup salvo no seu Google Drive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refreshDriveBackups(false)}
                disabled={loadingDriveList}
                className="nb-btn bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-3 min-h-[38px] text-xs font-bold inline-flex items-center gap-1.5"
                data-testid="refresh-drive-backups-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDriveList ? "animate-spin" : ""}`} />
                <span>Atualizar lista</span>
              </button>
            </div>

            {loadingDriveList ? (
              <div className="py-4 text-center text-xs font-bold text-neutral-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Carregando backups do Google Drive...
              </div>
            ) : driveBackups.length === 0 ? (
              <div className="py-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
                Nenhum arquivo encontrado ainda na pasta "EduTask Backups".
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {driveBackups.map((item) => {
                  const isBusy = busyDriveFileId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-neutral-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {item.createdTime ? formatDateTimeBR(item.createdTime) : "—"} · {formatBytesBR(item.size)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleLoadDriveBackupToRestore(item)}
                          className="nb-btn bg-emerald-200 hover:bg-emerald-300 text-emerald-950 px-2.5 min-h-[36px] text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDownloadFromDrive(item)}
                          className="nb-btn bg-white hover:bg-sky-50 text-neutral-900 px-2.5 min-h-[36px] text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteBackup(item)}
                          className="nb-btn bg-white hover:bg-rose-100 text-rose-700 px-2.5 min-h-[36px] text-[11px] font-bold inline-flex items-center gap-1"
                          aria-label={`Excluir ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEÇÃO 1: EXPORTAÇÃO ZIP */}
        <div className="nb-card p-5 sm:p-6 bg-white space-y-5 border-2 border-black flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-black/10">
              <div className="w-9 h-9 rounded-lg bg-sky-200 border-2 border-black flex items-center justify-center font-black">
                <Download className="w-5 h-5 text-sky-950" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg">1. Exportar Pacote de Dados (.ZIP)</h3>
                <p className="text-xs text-neutral-600">Gera um arquivo .zip contendo todo o estado do sistema</p>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border-2 border-black/10 space-y-3">
              <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Conteúdo incluído no pacote ZIP:</p>
              <ul className="text-xs space-y-2 text-neutral-700">
                <li className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span><strong>edutask_backup.json</strong> (Alunos, Tarefas, Matérias, Resumos, Avisos e Comentários, Cronograma de Aula, Botões de Alunos, Molduras, Push/IA, WhatsApp, Backup Automático, Ciclo Mensal/Anual e Ajustes de Pontos)</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>Planilhas CSV</strong> (Alunos, Matérias, Tarefas, Entregas, Avisos, Resumos, Botões de Alunos, Cronograma Semanal e Ajustes de Pontos)</span>
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span><strong>uploads/</strong> (Fotos de perfis, anexos de tarefas, avisos, PDFs e materiais dos resumos)</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800">
                <input
                  type="checkbox"
                  checked={includeUploads}
                  onChange={(e) => setIncludeUploads(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Incluir fotos de perfis e anexos na pasta <code className="bg-neutral-200 px-1 py-0.5 rounded">uploads/</code></span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-black/10">
            <button
              onClick={handleExportZip}
              disabled={exporting}
              className="w-full nb-btn bg-sky-400 hover:bg-sky-500 text-neutral-950 min-h-[44px] py-3 font-black text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]"
              data-testid="export-zip-button"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando e Compactando ZIP...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Baixar Backup Completo (.ZIP)
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-neutral-500 mt-2">
              Arquivo formatado e pronto para migração ou armazenamento seguro.
            </p>
          </div>
        </div>

        {/* SEÇÃO 2: IMPORTAÇÃO E MIGRAÇÃO ZIP */}
        <div
          ref={importSectionRef}
          className="nb-card p-5 sm:p-6 bg-white space-y-5 border-2 border-black"
        >
          <div className="flex items-center gap-2 pb-2 border-b-2 border-black/10">
            <div className="w-9 h-9 rounded-lg bg-emerald-200 border-2 border-black flex items-center justify-center font-black">
              <UploadCloud className="w-5 h-5 text-emerald-950" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg">2. Importar Dados de Arquivo (.ZIP)</h3>
              <p className="text-xs text-neutral-600">Envie um arquivo .zip para passar novos dados ou restaurar</p>
            </div>
          </div>

          {/* Área de Seleção de Arquivo */}
          {!selectedFile ? (
            <label
              className="border-2 border-dashed border-black rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-sky-50/50 hover:bg-sky-100 transition-colors"
              data-testid="zip-dropzone"
            >
              <FileArchive className="w-12 h-12 text-sky-600 mb-2" />
              <p className="font-heading font-black text-sm text-neutral-900">
                Clique aqui para selecionar o arquivo .ZIP
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Suporta backups completos do EduTask, arquivos de alunos, tarefas e uploads
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-4">
              {/* Arquivo Selecionado */}
              <div className="p-3 bg-neutral-100 rounded-xl border-2 border-black flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileArchive className="w-6 h-6 text-sky-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate text-neutral-900">{selectedFile.name}</p>
                    <p className="text-[10px] text-neutral-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={resetImport}
                  className="nb-btn bg-white hover:bg-red-100 text-neutral-700 px-3 min-h-[36px] text-xs flex-shrink-0"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Preview dos dados detectados */}
              {previewLoading && (
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-300 text-center text-xs font-bold text-sky-800 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Inspecionando dados do ZIP...
                </div>
              )}

              {previewData && !importResult && (
                <div className="space-y-3 bg-neutral-50 p-3.5 rounded-xl border-2 border-black/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-neutral-700">Dados Detectados no ZIP</span>
                    <span className="nb-badge bg-emerald-200 text-emerald-950 text-[10px]">
                      <Check className="w-3 h-3" /> Válido
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-sky-600">{previewData.counts.users}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Usuários</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-amber-600">{previewData.counts.tasks}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Tarefas</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-purple-600">{previewData.counts.summaries ?? 0}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Resumos</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-rose-600">{previewData.counts.announcements ?? 0}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Avisos</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-teal-600">{previewData.counts.schedule_days_configured ?? 0}/5</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Dias Cronograma</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-indigo-600">{previewData.counts.student_buttons ?? 0}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Botões de Aluno</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-orange-600">{previewData.counts.subjects ?? 0}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Matérias</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10 col-span-2 sm:col-span-2">
                      <p className="font-black text-base text-emerald-600">{previewData.counts.uploads}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Arquivos / Fotos / PDFs</p>
                    </div>
                  </div>

                  {/* Modo de Importação */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-bold text-neutral-800">Modo de Importação:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setImportMode("merge")}
                        className={`p-2 rounded-lg border-2 text-left font-bold transition-colors ${
                          importMode === "merge"
                            ? "bg-sky-200 border-black text-sky-950"
                            : "bg-white border-neutral-300 text-neutral-600"
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Mesclar Dados</span>
                        <span className="block text-[10px] font-normal opacity-80">
                          Mantém os dados atuais e adiciona/atualiza do ZIP
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode("overwrite")}
                        className={`p-2 rounded-lg border-2 text-left font-bold transition-colors ${
                          importMode === "overwrite"
                            ? "bg-amber-200 border-black text-amber-950"
                            : "bg-white border-neutral-300 text-neutral-600"
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Substituição Total</span>
                        <span className="block text-[10px] font-normal opacity-80">
                          Restaura o sistema exatamente como no backup
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Opções Granulares */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <p className="font-bold text-neutral-800">Selecione o que importar:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optUsers}
                          onChange={(e) => setOptUsers(e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Alunos e Perfis ({previewData.counts.users})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optTasks}
                          onChange={(e) => setOptTasks(e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Tarefas ({previewData.counts.tasks})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optSubjects}
                          onChange={(e) => setOptSubjects(e.target.checked)}
                          className="rounded text-orange-600"
                        />
                        <span>Matérias ({previewData.counts.subjects ?? 0})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optSummaries}
                          onChange={(e) => setOptSummaries(e.target.checked)}
                          className="rounded text-purple-600"
                        />
                        <span>Resumos ({previewData.counts.summaries ?? 0})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optAnnouncements}
                          onChange={(e) => setOptAnnouncements(e.target.checked)}
                          className="rounded text-rose-600"
                        />
                        <span>Avisos e Comentários ({previewData.counts.announcements ?? 0} av. / {previewData.counts.comments ?? 0} com.)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optButtons}
                          onChange={(e) => setOptButtons(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Botões de Alunos ({previewData.counts.student_buttons ?? 0})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optSchedule}
                          onChange={(e) => setOptSchedule(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Cronograma de Aula ({previewData.counts.schedule_days_configured ?? 0}/5 dias)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optCompletions}
                          onChange={(e) => setOptCompletions(e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Histórico de Entregas ({previewData.counts.completions ?? 0})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optUploads}
                          onChange={(e) => setOptUploads(e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Fotos e Arquivos ({previewData.counts.uploads})</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optEffects}
                          onChange={(e) => setOptEffects(e.target.checked)}
                          className="rounded text-amber-600"
                        />
                        <span>Loja e Molduras</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optWhatsapp}
                          onChange={(e) => setOptWhatsapp(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>WhatsApp (Modelos & Agendas)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optMonthly}
                          onChange={(e) => setOptMonthly(e.target.checked)}
                          className="rounded text-purple-600"
                        />
                        <span>Ciclo Mensal, Anual & Pontos</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={optSettings}
                          onChange={(e) => setOptSettings(e.target.checked)}
                          className="rounded text-neutral-700"
                        />
                        <span>Configurações do Sistema (Backup Automático, Notificações Push, IA & Limpeza)</span>
                      </label>
                    </div>
                  </div>

                  {/* Botão de confirmação */}
                  <button
                    onClick={handleImportZip}
                    disabled={importing}
                    className="w-full nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 min-h-[44px] py-2.5 font-black text-sm flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]"
                    data-testid="confirm-import-zip-button"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processando dados do ZIP...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Iniciar Importação dos Dados
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Resultado da Importação */}
              {importResult && (
                <div className="p-4 bg-emerald-100 border-2 border-black rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-950 font-black">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span>Importação Concluída com Sucesso!</span>
                  </div>
                  <div className="text-xs text-emerald-900 space-y-1">
                    <p>• {importResult.imported.users} usuários sincronizados.</p>
                    <p>• {importResult.imported.tasks} tarefas importadas.</p>
                    <p>• {importResult.imported.subjects} matérias organizadas.</p>
                    {importResult.imported.summaries !== undefined && (
                      <p>• {importResult.imported.summaries} resumos restaurados.</p>
                    )}
                    {importResult.imported.announcements !== undefined && (
                      <p>• {importResult.imported.announcements} avisos e {importResult.imported.comments ?? 0} comentários restaurados.</p>
                    )}
                    {importResult.imported.completions !== undefined && (
                      <p>• {importResult.imported.completions} entregas sincronizadas.</p>
                    )}
                    {importResult.imported.buttons !== undefined && (
                      <p>• {importResult.imported.buttons} botões de alunos sincronizados.</p>
                    )}
                    {importResult.imported.schedule_days !== undefined && (
                      <p>• {importResult.imported.schedule_days} dia(s) de cronograma sincronizados.</p>
                    )}
                    <p>• {importResult.imported.files} arquivos de mídia, PDFs e fotos extraídos.</p>
                  </div>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => window.location.reload()}
                      className="nb-btn bg-white hover:bg-emerald-50 text-emerald-950 px-3 min-h-[40px] text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Atualizar Painel
                    </button>
                    <button
                      onClick={resetImport}
                      className="nb-btn bg-emerald-200 hover:bg-emerald-300 text-emerald-950 px-3 min-h-[40px] text-xs font-bold"
                    >
                      Importar outro arquivo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação Explícita para Excluir Backup do Google Drive */}
      {confirmDeleteBackup && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4"
            data-testid="confirm-delete-drive-backup-modal"
          >
            <div className="nb-card bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border-2 border-black shadow-[6px_6px_0_0_#000] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border-2 border-black flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-700" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-base text-neutral-900">
                      Excluir backup do Google Drive?
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Esta ação removerá o arquivo da pasta "EduTask Backups".
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteBackup(null)}
                  className="nb-btn bg-white hover:bg-neutral-100 p-2 min-w-[38px] min-h-[38px]"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                <div className="font-bold text-neutral-900 break-all">
                  {confirmDeleteBackup.name}
                </div>
                <div className="text-neutral-500">
                  {confirmDeleteBackup.createdTime
                    ? formatDateTimeBR(confirmDeleteBackup.createdTime)
                    : "Data desconhecida"}{" "}
                  · {formatBytesBR(confirmDeleteBackup.size)}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteBackup(null)}
                  disabled={deletingDriveFile}
                  className="nb-btn bg-white hover:bg-neutral-100 text-neutral-900 px-4 min-h-[44px] text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDriveBackup}
                  disabled={deletingDriveFile}
                  className="nb-btn bg-rose-500 hover:bg-rose-600 text-white px-4 min-h-[44px] text-xs font-black inline-flex items-center justify-center gap-1.5"
                  data-testid="confirm-delete-drive-backup-btn"
                >
                  {deletingDriveFile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmar Exclusão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
