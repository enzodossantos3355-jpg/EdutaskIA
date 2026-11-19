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
 * Strips stray outer code fences and normalizes common escaped sequences.
 */
function cleanMarkdownText(md) {
  if (!md) return "";
  return String(md)
    .replace(/^```(?:markdown|md|latex|math|text)?\s*$/gim, "")
    .replace(/^`+\s*$/gm, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function isStepLine(line) {
  const lower = (line || "").trim().toLowerCase();
  return (
    /^(\*\*)?(passo|etapa)\s*\d+/i.test(lower) ||
    lower.includes("passo a passo") ||
    lower.includes("resolução passo a passo") ||
    lower.includes("cálculo ilustrado")
  );
}

function isTableRow(line) {
  const t = (line || "").trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isTableSeparatorRow(line) {
  const t = (line || "").trim();
  return /^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(t);
}

function parseTableCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Structured line-by-line block parser so headings, tables, ordered/unordered lists,
 * math blocks, blockquotes, and step-by-step solutions never bleed into each other.
 */
function parseMarkdownBlocks(md) {
  const lines = cleanMarkdownText(md).split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings (#, ##, ###, ####) - never swallow next line
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      blocks.push({ type: `h${hMatch[1].length}`, text: hMatch[2].trim() });
      i++;
      continue;
    }

    // Multi-line or single-line Display Math $$...$$ or \[...\] or \begin{...}
    if (trimmed.startsWith("$$") || trimmed.startsWith("\\[") || /^\\begin\{([a-zA-Z*]+)\}/.test(trimmed)) {
      const startLine = trimmed;
      if (
        (startLine.startsWith("$$") && startLine.endsWith("$$") && startLine.length > 4) ||
        (startLine.startsWith("\\[") && startLine.endsWith("\\]") && startLine.length > 4) ||
        /^\\begin\{[a-zA-Z*]+\}[\s\S]*\\end\{[a-zA-Z*]+\}$/.test(startLine)
      ) {
        blocks.push({ type: "math", text: startLine });
        i++;
        continue;
      }

      const mathLines = [rawLine];
      i++;
      while (i < lines.length) {
        const cur = lines[i].trim();
        mathLines.push(lines[i]);
        i++;
        if (cur.endsWith("$$") || cur.endsWith("\\]") || /^\\end\{[a-zA-Z*]+\}$/.test(cur)) {
          break;
        }
      }
      blocks.push({ type: "math", text: mathLines.join("\n").trim() });
      continue;
    }

    // Markdown Table (| ... |)
    if (isTableRow(trimmed)) {
      const tableLines = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = parseTableCells(tableLines[0]);
        const bodyStart = isTableSeparatorRow(tableLines[1]) ? 2 : 1;
        const rows = tableLines
          .slice(bodyStart)
          .filter((r) => !isTableSeparatorRow(r))
          .map(parseTableCells);
        blocks.push({ type: "table", headers, rows });
        continue;
      }
      blocks.push({ type: "p", text: tableLines.join("\n") });
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Step-by-step calculation / resolution lines
    if (isStepLine(trimmed)) {
      const stepLines = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^#{1,4}\s+/.test(lines[i].trim()) &&
        !isTableRow(lines[i]) &&
        !lines[i].trim().startsWith(">")
      ) {
        stepLines.push(lines[i].trim());
        i++;
      }
      if (stepLines.length > 1) {
        blocks.push({ type: "steps", lines: stepLines });
      } else {
        blocks.push({ type: "p", text: stepLines.join("\n") });
      }
      continue;
    }

    // Unordered list (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list (1. or 1))
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Standard Paragraph (collect until blank line or structural block)
    const pLines = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^#{1,4}\s+/.test(cur) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(cur) ||
        isTableRow(cur) ||
        cur.startsWith(">") ||
        /^[-*•]\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        cur.startsWith("$$") ||
        cur.startsWith("\\[") ||
        isStepLine(cur)
      ) {
        break;
      }
      pLines.push(lines[i].trim());
      i++;
    }
    if (pLines.length > 0) {
      blocks.push({ type: "p", text: pLines.join("\n") });
    }
  }

  return blocks;
}

/**
 * Parses inline markdown like **bold**, *italic*, `code`, and $math$ into React JSX elements.
 */
function renderInlineMarkdown(text) {
  if (!text) return null;

  const regex =
    /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$\n])+?\$|\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\}|\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\n]+?\*|`[^`\n]+?`)/g;
  const parts = String(text).split(regex).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <span key={index} className="inline-block my-1 max-w-full overflow-x-auto align-middle">
          <MathRenderer math={part} inline={false} />
        </span>
      );
    }

    if ((part.startsWith("$") && part.endsWith("$")) || part.startsWith("\\begin{")) {
      return <MathRenderer key={index} math={part} inline={true} />;
    }

    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const inner = part.slice(2, -2);
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

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-neutral-900 font-semibold">
          {hasLatexMath(inner) ? <MathRenderer math={inner} inline={true} /> : inner}
        </em>
      );
    }

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

    if (hasLatexMath(part) && (part.includes("\\frac") || part.includes("\\sqrt") || part.includes("\\begin"))) {
      return <MathRenderer key={index} math={part} inline={true} />;
    }

    return part;
  });
}

/**
 * Component to display, format, print, copy and export study summaries.
 */
export default function MarkdownSummaryViewer({
  markdown = "",
  title = "Resumo de Estudo",
  subtitle = "",
  subjects = [],
  showToolbar = true,
  onReset = null,
}) {
  if (!markdown) return null;

  const fullTitle = title || "Resumo de Estudo Edutask";
  const fullSubtitle = subtitle || (subjects.length > 0 ? `Matérias: ${subjects.join(" • ")}` : "");
  const cleanedMarkdown = cleanMarkdownText(markdown);
  const blocks = parseMarkdownBlocks(cleanedMarkdown);

  return (
    <div className="space-y-4 font-body" data-testid="markdown-summary-viewer">
      {/* Action Toolbar */}
      {showToolbar && (
        <div className="nb-card bg-amber-300 text-black p-3.5 sm:p-4 rounded-2xl border-3 border-black shadow-[4px_4px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-heading font-bold">
            <span className="text-black font-black uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-black shrink-0" />
              <span>Material de Estudo</span>
            </span>

            {subjects.length > 0 && (
              <span className="text-black/80 font-bold truncate max-w-[180px] sm:max-w-xs">
                · {subjects.join(", ")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => printSummaryReport({ title: fullTitle, subtitle: fullSubtitle, markdownContent: cleanedMarkdown })}
              className="nb-btn min-h-[44px] px-2.5 sm:px-3.5 bg-white hover:bg-neutral-100 text-black font-heading font-black text-[11px] sm:text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_#000] transition-all"
              title="Imprimir ou Salvar como PDF Oficial"
              data-testid="print-summary-btn"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="truncate">PDF</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSummaryAsImage({ title: fullTitle, subtitle: fullSubtitle, markdownContent: cleanedMarkdown, fileName: "Resumo_Edutask.png" })}
              className="nb-btn min-h-[44px] px-2.5 sm:px-3.5 bg-emerald-300 hover:bg-emerald-400 text-black font-heading font-black text-[11px] sm:text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_#000] transition-all"
              title="Baixar resumo formatado em arquivo de Imagem (PNG)"
              data-testid="export-image-summary-btn"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">Imagem</span>
            </button>

            <button
              type="button"
              onClick={() => copySummaryToClipboard(cleanedMarkdown)}
              className="nb-btn min-h-[44px] px-2.5 sm:px-3.5 bg-sky-300 hover:bg-sky-400 text-black font-heading font-black text-[11px] sm:text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_#000] transition-all"
              title="Copiar todo o texto do resumo"
              data-testid="copy-summary-btn"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span className="truncate">Copiar</span>
            </button>

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="nb-btn min-h-[44px] px-3.5 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black transition-all"
              >
                Refazer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Styled Summary Card Container */}
      <div className="nb-card p-4 sm:p-7 bg-white rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] font-body text-neutral-900 leading-relaxed min-w-0 break-words">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-3.5 mb-5 flex items-center justify-between flex-wrap gap-3 bg-amber-50 p-3.5 sm:p-4 rounded-xl border-2 border-black">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-heading font-black text-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
              <span>{fullTitle}</span>
            </h1>
            <p className="text-xs font-bold text-neutral-700 font-body mt-1">
              {fullSubtitle || `Data: ${new Date().toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] bg-amber-300 text-black font-heading font-black rounded-lg uppercase border border-black px-2.5 py-1">
              Edutask Estudo
            </span>
          </div>
        </div>

        {/* Formatted Markdown Content */}
        <div className="space-y-4">
          {blocks.map((block, idx) => {
            if (block.type === "hr") {
              return <hr key={idx} className="border-t-2 border-dashed border-black/25 my-5" />;
            }

            if (block.type === "h1") {
              return (
                <h1 key={idx} className="text-xl sm:text-2xl font-heading font-black text-black uppercase border-b-2 border-black pb-1.5 mt-6 mb-3 flex items-center gap-2">
                  <span className="w-3 h-6 bg-amber-400 border border-black rounded-sm inline-block shrink-0" />
                  <span>{renderInlineMarkdown(block.text)}</span>
                </h1>
              );
            }

            if (block.type === "h2") {
              return (
                <h2 key={idx} className="text-base sm:text-lg font-heading font-black text-black mt-5 mb-2 bg-amber-200 p-3 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-900 shrink-0" />
                  <span>{renderInlineMarkdown(block.text)}</span>
                </h2>
              );
            }

            if (block.type === "h3" || block.type === "h4") {
              const isMath =
                hasLatexMath(block.text) ||
                block.text.toLowerCase().includes("fórmula") ||
                block.text.toLowerCase().includes("equação");
              return (
                <h3
                  key={idx}
                  className={`${block.type === "h4" ? "text-xs sm:text-sm" : "text-sm sm:text-base"} font-heading font-black text-neutral-900 mt-4 mb-1.5 flex items-center gap-2`}
                >
                  {isMath ? (
                    <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                  <span>{renderInlineMarkdown(block.text)}</span>
                </h3>
              );
            }

            if (block.type === "blockquote") {
              return (
                <div key={idx} className="nb-card bg-amber-100/90 p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] my-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-heading font-black text-xs uppercase text-amber-950">
                    <Lightbulb className="w-4 h-4 text-amber-800 shrink-0" />
                    <span>Dica & Ponto Importante:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-900 font-body leading-relaxed whitespace-pre-line">
                    {renderInlineMarkdown(block.text)}
                  </div>
                </div>
              );
            }

            if (block.type === "table") {
              return (
                <div key={idx} className="my-4 overflow-x-auto rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000]">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-amber-200 border-b-2 border-black">
                        {block.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5 font-heading font-black text-black border-r last:border-r-0 border-black/30">
                            {renderInlineMarkdown(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                          {block.headers.map((_, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2.5 font-medium text-neutral-800 border-t border-r last:border-r-0 border-black/20 align-top">
                              {renderInlineMarkdown(row[cIdx] || "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (block.type === "math") {
              return (
                <div key={idx} className="nb-card bg-sky-50/90 p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] my-4 space-y-2 overflow-x-auto text-center">
                  <div className="text-xs font-heading font-black uppercase text-sky-950 mb-1.5 text-left flex items-center gap-1.5 border-b border-black/10 pb-1.5">
                    <Calculator className="w-4 h-4 text-sky-800" />
                    <span>Fórmula / Equação:</span>
                  </div>
                  <div className="py-2 flex items-center justify-center">
                    <MathRenderer math={block.text} inline={false} className="text-base sm:text-lg font-bold" />
                  </div>
                </div>
              );
            }

            if (block.type === "steps") {
              return (
                <div key={idx} className="nb-card bg-sky-50/90 p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] my-4 space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-black/20 pb-2">
                    <span className="nb-badge bg-sky-300 text-sky-950 font-heading font-black text-xs uppercase border border-black flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-sky-900" />
                      <span>Resolução Passo a Passo</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {block.lines.map((line, lIdx) => {
                      const isStepHeader = line.toLowerCase().includes("passo") || line.toLowerCase().includes("etapa") || line.toLowerCase().includes("fórmula:");
                      const isFormula = line.includes("=") || hasLatexMath(line);
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

            if (block.type === "ul") {
              return (
                <ul key={idx} className="space-y-2 my-3 bg-neutral-50 p-4 rounded-xl border-2 border-black/20 font-medium">
                  {block.items.map((item, i) => (
                    <li key={i} className="text-xs sm:text-sm font-medium text-neutral-800 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{renderInlineMarkdown(item)}</span>
                    </li>
                  ))}
                </ul>
              );
            }

            if (block.type === "ol") {
              return (
                <ol key={idx} className="space-y-2 my-3 bg-neutral-50 p-4 rounded-xl border-2 border-black/20 font-medium">
                  {block.items.map((item, i) => (
                    <li key={i} className="text-xs sm:text-sm font-medium text-neutral-800 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-amber-300 text-black text-[11px] font-heading font-black flex items-center justify-center shrink-0 border border-black mt-0.5 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="flex-1">{renderInlineMarkdown(item)}</span>
                    </li>
                  ))}
                </ol>
              );
            }

            return (
              <p key={idx} className="text-xs sm:text-sm font-medium leading-relaxed text-neutral-800 whitespace-pre-line">
                {renderInlineMarkdown(block.text)}
              </p>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-neutral-200 pt-4 mt-8 text-center text-xs font-bold text-neutral-500 font-body">
          Edutask • Material de Estudo Organizado
        </div>
      </div>
    </div>
  );
}

