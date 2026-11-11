import {
  Printer,
  Copy,
  Image as ImageIcon,
  Sparkles,
  BookOpen,
  CheckCircle,
  Calculator,
  Lightbulb,
} from "lucide-react";
import {
  copySummaryToClipboard,
  printSummaryReport,
  downloadSummaryAsImage,
} from "@/lib/summaryExport";
import { MathRenderer, hasLatexMath } from "@/lib/mathUtils";

/**
 * Strips stray code fences, lone backtick lines, and cleans up raw LLM markdown.
 */
function cleanMarkdownText(md) {
  if (!md) return "";
  return md
    .replace(/^```(?:markdown|latex|math|text)?\s*$/gim, "")
    .replace(/^`+\s*$/gm, "")
    .trim();
}

/**
 * Checks if a trimmed block is a standalone display math equation (e.g. $$...$$ or \begin{cases}...\end{cases}).
 */
function isDisplayMathBlock(text) {
  if (!text) return false;
  const t = text.trim();
  return (
    (t.startsWith("$$") && t.endsWith("$$")) ||
    (t.startsWith("\\[") && t.endsWith("\\]")) ||
    /^\s*\\begin\{[a-zA-Z*]+\}[\s\S]*\\end\{[a-zA-Z*]+\}\s*$/i.test(t)
  );
}

/**
 * Checks if a block is explicitly a multi-step calculation box with labeled steps.
 */
function isStepCalculationBlock(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const hasStepWord =
    lower.includes("passo 1") ||
    lower.includes("passo a passo") ||
    lower.includes("etapa 1") ||
    lower.includes("resolução passo a passo") ||
    lower.includes("cálculo ilustrado");
  return hasStepWord && text.split("\n").filter((l) => l.trim()).length > 1;
}

/**
 * Parses inline markdown like **bold**, *italic*, `code`, and $math$ into React JSX elements.
 */
function renderInlineMarkdown(text) {
  if (!text) return null;

  // Regex matching:
  // 1: $$ ... $$ (display math)
  // 2: $ ... $ (inline math)
  // 3: \begin{env} ... \end{env}
  // 4: **...** or __...__ (bold)
  // 5: `...` (inline code)
  const regex = /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$\n])+?\$|\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\}|\*\*.*?\*\*|__.*?__|`.*?`)/g;
  const parts = text.split(regex).filter(Boolean);

  return parts.map((part, index) => {
    // Display Math
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <span key={index} className="inline-block my-1 max-w-full overflow-x-auto align-middle">
          <MathRenderer math={part} inline={false} />
        </span>
      );
    }

    // Inline Math: $...$ or LaTeX environment
    if ((part.startsWith("$") && part.endsWith("$")) || part.startsWith("\\begin{")) {
      return <MathRenderer key={index} math={part} inline={true} />;
    }

    // Bold
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const inner = part.slice(2, -2);
      // If bold has math inside, render math inside
      if (hasLatexMath(inner)) {
        return (
          <strong key={index} className="font-black text-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
            <MathRenderer math={inner} inline={true} />
          </strong>
        );
      }
      return (
        <strong key={index} className="font-black text-black bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
          {inner}
        </strong>
      );
    }

    // Code
    if (part.startsWith("`") && part.endsWith("`")) {
      const codeText = part.slice(1, -1).trim();
      if (!codeText) return null;
      if (hasLatexMath(codeText)) {
        return <MathRenderer key={index} math={codeText} inline={true} />;
      }
      return (
        <code key={index} className="font-mono text-xs bg-amber-100 text-black px-2 py-0.5 rounded border border-black font-bold">
          {codeText}
        </code>
      );
    }

    // Plain text: if it has raw LaTeX commands without $, try rendering if valid
    if (hasLatexMath(part) && (part.includes("\\frac") || part.includes("\\sqrt") || part.includes("\\begin"))) {
      return <MathRenderer key={index} math={part} inline={true} />;
    }

    return part;
  });
}

/**
 * Component to display, format, print, copy and export AI study summaries.
 */
export default function MarkdownSummaryViewer({
  markdown = "",
  title = "Resumo de Estudo Personalizado",
  subtitle = "",
  subjects = [],
  showToolbar = true,
  onReset = null,
}) {
  if (!markdown) return null;

  const fullTitle = title || "Resumo de Estudo Edutask";
  const fullSubtitle = subtitle || (subjects.length > 0 ? `Matérias: ${subjects.join(" • ")}` : "");

  // Clean raw markdown of stray code fences and lone backtick lines
  const cleanedMarkdown = cleanMarkdownText(markdown);

  // Parse Markdown into structured blocks
  const blocks = cleanedMarkdown.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-4 font-body" data-testid="markdown-summary-viewer">
      {/* Action Toolbar */}
      {showToolbar && (
        <div className="nb-card bg-amber-300 text-black p-4 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-heading font-bold">
            <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase border-2 border-black flex items-center gap-1.5 px-3 py-1 shadow-[2px_2px_0_0_#000]">
              <Sparkles className="w-4 h-4 text-black" />
              <span>Resumo Edutask AI</span>
            </span>

            {subjects.length > 0 && (
              <span className="text-black font-black truncate max-w-[220px] sm:max-w-xs">
                {subjects.join(", ")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => printSummaryReport({ title: fullTitle, subtitle: fullSubtitle, markdownContent: cleanedMarkdown })}
              className="nb-btn px-3.5 py-2 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] transition-all"
              title="Imprimir ou Salvar como PDF Oficial"
              data-testid="print-summary-btn"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={() => downloadSummaryAsImage({ title: fullTitle, subtitle: fullSubtitle, markdownContent: cleanedMarkdown, fileName: "Resumo_Edutask.png" })}
              className="nb-btn px-3.5 py-2 bg-emerald-300 hover:bg-emerald-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] transition-all"
              title="Baixar resumo formatado em arquivo de Imagem (PNG)"
              data-testid="export-image-summary-btn"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Salvar Imagem (PNG)</span>
            </button>

            <button
              onClick={() => copySummaryToClipboard(cleanedMarkdown)}
              className="nb-btn px-3.5 py-2 bg-sky-300 hover:bg-sky-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] transition-all"
              title="Copiar todo o texto do resumo"
              data-testid="copy-summary-btn"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Texto</span>
            </button>

            {onReset && (
              <button
                onClick={onReset}
                className="nb-btn px-3.5 py-2 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black transition-all"
              >
                Refazer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Styled Summary Card Container */}
      <div className="nb-card p-6 sm:p-8 bg-white rounded-2xl border-3 border-black shadow-[6px_6px_0_0_#000] font-body text-neutral-900 leading-relaxed">
        {/* Printable Header */}
        <div className="border-b-3 border-black pb-4 mb-6 flex items-center justify-between flex-wrap gap-3 bg-amber-50 p-4 rounded-xl border-2 border-black">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <span>{fullTitle}</span>
            </h1>
            <p className="text-xs font-bold text-neutral-700 font-body mt-1">
              {fullSubtitle || `Data: ${new Date().toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          <div className="text-right">
            <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs rounded-lg uppercase border-2 border-black px-3 py-1 shadow-[2px_2px_0_0_#000]">
              Edutask AI Pedagógico
            </span>
          </div>
        </div>

        {/* Formatted Markdown Content */}
        <div className="space-y-4">
          {blocks.map((block, idx) => {
            const trimmed = block.trim();

            // Main Header #
            if (trimmed.startsWith("# ")) {
              return (
                <h1 key={idx} className="text-xl sm:text-2xl font-heading font-black text-black uppercase border-b-2 border-black pb-1.5 mt-6 mb-3 flex items-center gap-2">
                  <span className="w-3 h-6 bg-amber-400 border border-black rounded-sm inline-block"></span>
                  <span>{renderInlineMarkdown(trimmed.replace(/^#\s+/, ""))}</span>
                </h1>
              );
            }

            // Sub Header ##
            if (trimmed.startsWith("## ")) {
              return (
                <h2 key={idx} className="text-base sm:text-lg font-heading font-black text-black mt-5 mb-2 bg-amber-200 p-3 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-900 shrink-0" />
                  <span>{renderInlineMarkdown(trimmed.replace(/^##\s+/, ""))}</span>
                </h2>
              );
            }

            // Section Header ###
            if (trimmed.startsWith("### ")) {
              const headerText = trimmed.replace(/^###\s+/, "");
              const isMath = hasLatexMath(headerText) || headerText.toLowerCase().includes("fórmula") || headerText.toLowerCase().includes("equação");

              return (
                <h3 key={idx} className="text-sm sm:text-base font-heading font-black text-neutral-900 mt-4 mb-1.5 flex items-center gap-2">
                  {isMath ? (
                    <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                  <span>{renderInlineMarkdown(headerText)}</span>
                </h3>
              );
            }

            // Callout / Blockquote (> ...)
            if (trimmed.startsWith("> ")) {
              const calloutContent = trimmed.split("\n").map(l => l.replace(/^>\s*/, "")).join("\n");
              return (
                <div key={idx} className="nb-card bg-amber-100/90 p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] my-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-amber-950">
                    <Lightbulb className="w-4 h-4 text-amber-800 shrink-0" />
                    <span>Dica & Conceito Importante:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-900 font-body leading-relaxed">
                    {renderInlineMarkdown(calloutContent)}
                  </div>
                </div>
              );
            }

            // Standalone Display Math Equation Block ($$ ... $$ or \begin{cases} ... \end{cases})
            if (isDisplayMathBlock(trimmed)) {
              return (
                <div key={idx} className="nb-card bg-sky-50/90 p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] my-4 space-y-2 overflow-x-auto text-center">
                  <div className="text-xs font-heading font-black uppercase text-sky-950 mb-1.5 text-left flex items-center gap-1.5 border-b border-black/10 pb-1.5">
                    <Calculator className="w-4 h-4 text-sky-800" />
                    <span>Fórmula / Equação Matemática:</span>
                  </div>
                  <div className="py-2 flex items-center justify-center">
                    <MathRenderer math={trimmed} inline={false} className="text-base sm:text-lg font-bold" />
                  </div>
                </div>
              );
            }

            // Visual Step-by-Step Math / Calculation Box
            if (isStepCalculationBlock(trimmed)) {
              const lines = trimmed.split("\n").filter(l => l.trim().length > 0);
              return (
                <div key={idx} className="nb-card bg-sky-50/90 p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] my-4 space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-black/20 pb-2">
                    <span className="nb-badge bg-sky-300 text-sky-950 font-heading font-black text-xs uppercase border border-black flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-sky-900" />
                      <span>Passo a Passo / Cálculo Ilustrado</span>
                    </span>
                  </div>
                  <div className="space-y-2 font-mono">
                    {lines.map((line, lIdx) => {
                      const isStepHeader = line.toLowerCase().includes("passo") || line.toLowerCase().includes("fórmula:");
                      const isFormula = line.includes("=") || line.includes("+") || line.includes("-") || line.includes("×") || line.includes("÷") || hasLatexMath(line);
                      
                      return (
                        <div
                          key={lIdx}
                          className={`p-3 rounded-xl border-2 border-black flex items-start gap-2.5 text-xs sm:text-sm ${
                            isStepHeader
                              ? "bg-amber-200 text-black font-heading font-black shadow-[2px_2px_0_0_#000]"
                              : isFormula
                              ? "bg-emerald-100 text-emerald-950 font-bold shadow-[2px_2px_0_0_#000]"
                              : "bg-white text-neutral-800 font-medium"
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-amber-300 text-black text-[11px] font-heading font-black flex items-center justify-center shrink-0 border-2 border-black shadow-[1px_1px_0_0_#000]">
                            {lIdx + 1}
                          </span>
                          <span className="flex-1 whitespace-pre-line leading-relaxed font-body">
                            {renderInlineMarkdown(line)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Bullet Lists (- or *)
            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
              const lines = trimmed.split("\n").filter(l => l.trim().length > 0);
              return (
                <ul key={idx} className="space-y-2 my-3 bg-neutral-50 p-4 rounded-xl border-2 border-black/20 font-medium">
                  {lines.map((line, i) => (
                    <li key={i} className="text-xs sm:text-sm font-medium text-neutral-800 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</span>
                    </li>
                  ))}
                </ul>
              );
            }

            // Standard Paragraph
            return (
              <p key={idx} className="text-xs sm:text-sm font-medium leading-relaxed text-neutral-800 whitespace-pre-line">
                {renderInlineMarkdown(trimmed)}
              </p>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-neutral-200 pt-4 mt-8 text-center text-xs font-bold text-neutral-500 font-body">
          Gerado pelo Sistema Pedagógico de Inteligência Artificial Edutask • Ensino Fundamental
        </div>
      </div>
    </div>
  );
}
