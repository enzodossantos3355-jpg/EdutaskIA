import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  FileArchive,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  ListTodo,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  ArrowRight,
  ShieldCheck,
  Database
} from "lucide-react";
import api from "@/lib/api";

export default function ZipDataTransferPanel() {
  // Export states
  const [exporting, setExporting] = useState(false);
  const [includeUploads, setIncludeUploads] = useState(true);

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
  const [optCompletions, setOptCompletions] = useState(true);
  const [optUploads, setOptUploads] = useState(true);

  const fileInputRef = useRef(null);

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

      toast.success("Arquivo ZIP baixado com sucesso!", { id: "zip-export" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar arquivo ZIP.", { id: "zip-export" });
    } finally {
      setExporting(false);
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
      formData.append("import_completions", String(optCompletions));
      formData.append("import_uploads", String(optUploads));

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
      {/* Top Banner */}
      <div className="nb-card p-5 sm:p-6 bg-gradient-to-r from-sky-100 via-sky-50 to-amber-100 border-2 border-black">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black font-heading flex items-center gap-2">
              <FileArchive className="w-6 h-6 text-sky-600" />
              Transferência de Dados & Backup via Arquivo ZIP
            </h2>
            <p className="text-sm text-neutral-700 max-w-2xl">
              Exporte todos os dados, anexos, fotos de alunos e planilhas em um único arquivo compactado <strong>.zip</strong> ou restaure e passe novos dados para o sistema facilmente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="nb-badge bg-emerald-200 text-emerald-950 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> Compatibilidade Total
            </span>
          </div>
        </div>
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
                  <Database className="w-4 h-4 text-sky-600" />
                  <span><strong>edutask_backup.json</strong> (Alunos, Tarefas, Matérias, Avisos, Notas e Pontos)</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span><strong>Planilhas CSV</strong> (Alunos e Pontos, Tarefas, Entregas Concluídas)</span>
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span><strong>uploads/</strong> (Fotos de perfil dos alunos e arquivos anexados)</span>
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
                <span>Incluir fotos de perfis e anexos de tarefas na pasta <code className="bg-neutral-200 px-1 py-0.5 rounded">uploads/</code></span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-black/10">
            <button
              onClick={handleExportZip}
              disabled={exporting}
              className="w-full nb-btn bg-sky-400 hover:bg-sky-500 text-neutral-950 py-3 font-black text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]"
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
        <div className="nb-card p-5 sm:p-6 bg-white space-y-5 border-2 border-black">
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
              <div className="p-3 bg-neutral-100 rounded-xl border-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileArchive className="w-6 h-6 text-sky-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate text-neutral-900">{selectedFile.name}</p>
                    <p className="text-[10px] text-neutral-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={resetImport}
                  className="nb-btn bg-white hover:bg-red-100 text-neutral-700 px-2 py-1 text-xs"
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

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-sky-600">{previewData.counts.users}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Usuários</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-amber-600">{previewData.counts.tasks}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Tarefas</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-black/10">
                      <p className="font-black text-base text-emerald-600">{previewData.counts.uploads}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">Arquivos/Fotos</p>
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
                        🔄 Mesclar Dados
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
                        ⚠️ Substituição Total
                        <span className="block text-[10px] font-normal opacity-80">
                          Restaura o sistema exatamente como no backup
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Opções Granulares */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <p className="font-bold text-neutral-800">Selecione o que importar:</p>
                    <div className="grid grid-cols-2 gap-1.5">
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
                          checked={optCompletions}
                          onChange={(e) => setOptCompletions(e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Histórico de Entregas</span>
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
                    </div>
                  </div>

                  {/* Botão de confirmação */}
                  <button
                    onClick={handleImportZip}
                    disabled={importing}
                    className="w-full nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 py-2.5 font-black text-sm flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px]"
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
                    <p>• {importResult.imported.files} arquivos de mídia e fotos extraídos.</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => window.location.reload()}
                      className="nb-btn bg-white hover:bg-emerald-50 text-emerald-950 px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Atualizar Painel
                    </button>
                    <button
                      onClick={resetImport}
                      className="nb-btn bg-emerald-200 hover:bg-emerald-300 text-emerald-950 px-3 py-1.5 text-xs font-bold"
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
    </div>
  );
}
