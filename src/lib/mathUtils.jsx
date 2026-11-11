import React from "react";
import katex from "katex";

/**
 * Transforms raw LaTeX math strings into clean readable text for badges/pills.
 * E.g., "\begin{cases} x+y=5 \\ x+y=-2 \end{cases}" -> "{ x + y = 5 ; x + y = -2 }"
 */
export function cleanLatexFormula(formula) {
  if (!formula || typeof formula !== "string") return "";

  let cleaned = formula.trim();

  // Strip outer quotes, backticks or $$ delimiters
  cleaned = cleaned.replace(/^[`"'$]+|[`"'$]+$/g, "").trim();

  // Strip LaTeX cases / matrix environments
  cleaned = cleaned.replace(/\\BEGIN\{CASES\}/gi, "{ ");
  cleaned = cleaned.replace(/\\END\{CASES\}/gi, " }");
  cleaned = cleaned.replace(/\\begin\{cases\}/gi, "{ ");
  cleaned = cleaned.replace(/\\end\{cases\}/gi, " }");
  cleaned = cleaned.replace(/\\begin\{matrix\}/gi, "[ ");
  cleaned = cleaned.replace(/\\end\{matrix\}/gi, " ]");
  cleaned = cleaned.replace(/\\begin\{align\*?\}/gi, "");
  cleaned = cleaned.replace(/\\end\{align\*?\}/gi, "");

  // Strip \text{...} and \quad
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, "$1");
  cleaned = cleaned.replace(/\\quad/g, " ");
  cleaned = cleaned.replace(/\\qquad/g, " ");

  // Replace \\ with semicolon / newline
  cleaned = cleaned.replace(/\\\\/g, " ; ");

  // Clean up fractions \frac{a}{b} -> (a / b)
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");

  // Clean up roots \sqrt{x} -> √(x)
  cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // Clean remaining backslashes
  cleaned = cleaned.replace(/\\/g, "");

  // Clean multi-spaces
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Checks whether a text contains LaTeX math commands or KaTeX delimiters.
 */
export function hasLatexMath(text) {
  if (!text || typeof text !== "string") return false;
  return (
    text.includes("$$") ||
    text.includes("\\begin") ||
    text.includes("\\frac") ||
    text.includes("\\sqrt") ||
    text.includes("\\left") ||
    text.includes("\\right") ||
    text.includes("\\quad") ||
    text.includes("\\BEGIN") ||
    text.includes("\\END") ||
    /\\[a-zA-Z]+/.test(text)
  );
}

/**
 * Component to render LaTeX using KaTeX HTML string with fallback.
 */
export function MathRenderer({ math, inline = false, className = "" }) {
  if (!math) return null;

  const rawStr = String(math).trim();

  // Strip all leading and trailing backticks, quotes and spaces
  let targetMath = rawStr
    .replace(/^[`"'\s\n]+|[`"'\s\n]+$/g, "")
    .replace(/^\[\s*\]/g, "")
    .trim();

  // Remove $$ or $ wrapper for KaTeX rendering
  if (targetMath.startsWith("$$") && targetMath.endsWith("$$")) {
    targetMath = targetMath.slice(2, -2).trim();
  } else if (targetMath.startsWith("$") && targetMath.endsWith("$") && targetMath.length > 2) {
    targetMath = targetMath.slice(1, -1).trim();
  } else if (targetMath.startsWith("\\[") && targetMath.endsWith("\\]")) {
    targetMath = targetMath.slice(2, -2).trim();
  } else if (targetMath.startsWith("\\(") && targetMath.endsWith("\\)")) {
    targetMath = targetMath.slice(2, -2).trim();
  }

  // Strip residual backticks if any
  targetMath = targetMath.replace(/^`+|`+$/g, "").trim();

  // Normalize uppercase \BEGIN{CASES} to \begin{cases}
  targetMath = targetMath.replace(/\\BEGIN\{CASES\}/gi, "\\begin{cases}");
  targetMath = targetMath.replace(/\\END\{CASES\}/gi, "\\end{cases}");
  targetMath = targetMath.replace(/\\BEGIN\{MATRIX\}/gi, "\\begin{matrix}");
  targetMath = targetMath.replace(/\\END\{MATRIX\}/gi, "\\end{matrix}");

  if (!targetMath) return null;

  try {
    const html = katex.renderToString(targetMath, {
      displayMode: !inline,
      throwOnError: true,
      output: "htmlAndMathml",
    });

    return (
      <span
        className={`katex-rendered-wrapper inline-block max-w-full overflow-x-auto align-middle ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    // Fallback to cleaned readable plain text math without raw LaTeX noise
    const readableFallback = cleanLatexFormula(targetMath);
    return (
      <span className={`font-mono text-xs font-bold text-slate-900 bg-sky-50 px-2 py-0.5 rounded border border-black/30 inline-block align-middle ${className}`}>
        {readableFallback}
      </span>
    );
  }
}
