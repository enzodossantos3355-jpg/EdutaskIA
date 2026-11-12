import React from "react";
import { CheckCircle2, BookOpen, HelpCircle } from "lucide-react";
import { MathRenderer, hasLatexMath } from "@/lib/mathUtils";

/**
 * FormattedGabaritoViewer
 * Displays direct answers cleanly without forcing fake "Questão 1" headers.
 */
export default function FormattedGabaritoViewer({ text }) {
  if (!text || typeof text !== "string") return null;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className="space-y-3 font-sans">
      {lines.map((line, index) => {
        // Check if line starts with Page or Question header
        let pageNum = "";
        let qTitle = "";

        const pageMatch = line.match(/(?:Página|Pág\.?|Page)\s*(\d+|[A-Za-z0-9]+)/i);
        if (pageMatch) {
          pageNum = pageMatch[0];
        }

        const qMatch = line.match(/(?:Questão|Ex\.?|Exercício|Item)\s*(\d+|[A-Za-z0-9]+)/i);
        if (qMatch) {
          qTitle = qMatch[0];
        }

        return (
          <div
            key={index}
            className="bg-white text-neutral-900 p-3.5 sm:p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-start gap-3 transition-all hover:bg-emerald-50/40"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-300 border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {(pageNum || qTitle) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {pageNum && (
                    <span className="bg-sky-200 text-sky-950 font-heading font-black text-[10px] sm:text-xs uppercase px-2 py-0.5 rounded border border-black flex items-center gap-1 shadow-xs">
                      <BookOpen className="w-3 h-3 text-sky-950" />
                      {pageNum}
                    </span>
                  )}
                  {qTitle && (
                    <span className="bg-amber-300 text-black font-heading font-black text-[10px] sm:text-xs uppercase px-2 py-0.5 rounded border border-black flex items-center gap-1 shadow-xs">
                      <HelpCircle className="w-3 h-3 text-black" />
                      {qTitle}
                    </span>
                  )}
                </div>
              )}
              <div className="font-sans font-semibold text-sm sm:text-base text-neutral-900 leading-relaxed break-words">
                {hasLatexMath(line) ? (
                  <MathRenderer math={line} inline={true} />
                ) : (
                  <span>{line}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
