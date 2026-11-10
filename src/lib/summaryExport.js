import { toast } from "sonner";

/**
 * Copies text cleanly to clipboard with fallback.
 */
export async function copySummaryToClipboard(text) {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success("Resumo copiado para a área de transferência!");
      return;
    }
  } catch (err) {
    console.warn("Clipboard API failed, trying fallback...", err);
  }

  // Fallback for older browsers / restricted contexts
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) {
      toast.success("Resumo copiado para a área de transferência!");
      return;
    }
  } catch (e) {
    console.error("Fallback copy failed", e);
  }

  toast.error("Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.");
}

/**
 * Opens a dedicated printable window with full styling and triggers print.
 */
export function printSummaryReport({ title = "Resumo de Estudo Edutask", subtitle = "", markdownContent = "" }) {
  if (!markdownContent) return;

  const printWindow = window.open("", "_blank", "width=900,height=800");
  if (!printWindow) {
    toast.error("Permita pop-ups no seu navegador para imprimir o resumo.");
    return;
  }


  // Convert markdown headings/lists to clean HTML
  const formattedHtml = parseMarkdownToHtml(markdownContent);

  const docHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
    
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'DM Sans', sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
      font-size: 14px;
    }

    .header {
      border-bottom: 3px solid #000000;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .title {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 22px;
      color: #000000;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }

    .subtitle {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }

    .badge {
      background: #fef08a;
      color: #000000;
      border: 2px solid #000000;
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
    }

    h2 {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 16px;
      background: #fef3c7;
      border: 2px solid #000;
      padding: 8px 12px;
      border-radius: 8px;
      margin-top: 18px;
      margin-bottom: 10px;
    }

    h3 {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 14px;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    ul, ol {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 12px 12px 28px;
      margin: 10px 0;
    }

    li {
      margin-bottom: 4px;
      font-weight: 500;
    }

    p {
      margin: 8px 0;
      font-weight: 500;
    }

    strong {
      font-weight: 700;
      color: #000;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 30px;
      padding-top: 10px;
      font-size: 11px;
      text-align: center;
      color: #64748b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${escapeHtml(title)}</div>
      <div class="subtitle">${escapeHtml(subtitle || `Data: ${new Date().toLocaleDateString("pt-BR")}`)}</div>
    </div>
    <div class="badge">Edutask AI</div>
  </div>

  <div class="content">
    ${formattedHtml}
  </div>

  <div class="footer">
    Gerado pelo Sistema Pedagógico de Inteligência Artificial Edutask • Documento Oficial de Estudo
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(docHtml);
  printWindow.document.close();
}

/**
 * Downloads the summary as an image file (PNG) rendered on a canvas.
 */
export function downloadSummaryAsImage({ title = "Apostila de Estudo Edutask", subtitle = "", markdownContent = "", fileName = "Resumo_Edutask.png" }) {
  if (!markdownContent) return;

  try {
    toast.loading("Gerando imagem em alta resolução do resumo...", { id: "export-img" });

    const width = 1000;
    const padding = 40;
    const lines = parseMarkdownToLines(markdownContent);

    // Calculate dynamic canvas height based on content
    const estimatedHeight = Math.max(700, 180 + lines.length * 28 + 80);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = estimatedHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Não foi possível inicializar a geração de imagem.", { id: "export-img" });
      return;
    }

    // Background field
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, width, estimatedHeight);

    // Header Card
    ctx.fillStyle = "#FEF08A";
    ctx.fillRect(padding, padding, width - padding * 2, 90);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(padding, padding, width - padding * 2, 90);

    // Header Title
    ctx.fillStyle = "#000000";
    ctx.font = "900 24px Outfit, sans-serif";
    ctx.fillText(title.toUpperCase(), padding + 20, padding + 42);

    ctx.fillStyle = "#451A03";
    ctx.font = "700 14px DM Sans, sans-serif";
    ctx.fillText(subtitle || `EDUTASK • ${new Date().toLocaleDateString("pt-BR")}`, padding + 20, padding + 68);

    // Render Lines
    let currentY = padding + 130;

    lines.forEach((line) => {
      if (line.type === "h1") {
        currentY += 15;
        ctx.fillStyle = "#FEF3C7";
        ctx.fillRect(padding, currentY - 22, width - padding * 2, 36);
        ctx.strokeRect(padding, currentY - 22, width - padding * 2, 36);

        ctx.fillStyle = "#000000";
        ctx.font = "900 18px Outfit, sans-serif";
        ctx.fillText(line.text.toUpperCase(), padding + 15, currentY + 2);
        currentY += 30;
      } else if (line.type === "h2" || line.type === "h3") {
        currentY += 10;
        ctx.fillStyle = "#000000";
        ctx.font = "800 16px Outfit, sans-serif";
        ctx.fillText(line.text, padding + 10, currentY);
        currentY += 24;
      } else if (line.type === "list") {
        ctx.fillStyle = "#0284C7";
        ctx.font = "900 14px DM Sans, sans-serif";
        ctx.fillText("•", padding + 15, currentY);

        ctx.fillStyle = "#1E293B";
        ctx.font = "500 14px DM Sans, sans-serif";
        ctx.fillText(line.text, padding + 32, currentY);
        currentY += 22;
      } else {
        ctx.fillStyle = "#0F172A";
        ctx.font = "500 14px DM Sans, sans-serif";
        ctx.fillText(line.text, padding + 10, currentY);
        currentY += 22;
      }
    });

    // Footer
    currentY += 20;
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.font = "700 12px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Edutask Plataforma de Gestão Escolar e Inteligência Artificial", width / 2, currentY + 25);

    // Download PNG
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Imagem PNG gerada e baixada com sucesso!", { id: "export-img" });
  } catch (err) {
    console.error(err);
    toast.error("Erro ao gerar arquivo de imagem.", { id: "export-img" });
  }
}

/**
 * Downloads raw text/markdown file
 */
export function downloadSummaryFile(markdownContent, fileName = "Resumo_Edutask.md") {
  if (!markdownContent) return;
  const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Arquivo .MD salvo com sucesso!");
}

// Helper: Escape HTML
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper: Simple Markdown to HTML converter with rich formatting support
function parseMarkdownToHtml(md) {
  if (!md) return "";
  const lines = md.split("\n");
  let html = "";
  let inList = false;

  lines.forEach((line) => {
    let trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      return;
    }

    // Format bold and italic
    trimmed = escapeHtml(trimmed)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code style='background:#f1f5f9;padding:2px 6px;border-radius:4px;'>$1</code>");

    if (trimmed.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h1>${trimmed.replace(/^#\s+/, "")}</h1>`;
    } else if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${trimmed.replace(/^##\s+/, "")}</h2>`;
    } else if (trimmed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${trimmed.replace(/^###\s+/, "")}</h3>`;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${trimmed.replace(/^[-*]\s+/, "")}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${trimmed}</p>`;
    }
  });

  if (inList) html += "</ul>";
  return html;
}

// Helper: Parse markdown into canvas lines
function parseMarkdownToLines(md) {
  const lines = md.split("\n");
  const result = [];

  lines.forEach((l) => {
    let trimmed = l.trim();
    if (!trimmed) return;

    // Clean bold markdown markers for canvas plain text rendering
    const cleanText = trimmed.replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "");

    if (trimmed.startsWith("# ")) {
      result.push({ type: "h1", text: cleanText.replace(/^#\s+/, "") });
    } else if (trimmed.startsWith("## ")) {
      result.push({ type: "h2", text: cleanText.replace(/^##\s+/, "") });
    } else if (trimmed.startsWith("### ")) {
      result.push({ type: "h3", text: cleanText.replace(/^###\s+/, "") });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      result.push({ type: "list", text: cleanText.replace(/^[-*]\s+/, "") });
    } else {
      // Chunk long paragraphs into 90 chars per line for canvas
      const maxLen = 85;
      if (cleanText.length > maxLen) {
        const words = cleanText.split(" ");
        let current = "";
        words.forEach((w) => {
          if ((current + " " + w).length > maxLen) {
            result.push({ type: "p", text: current });
            current = w;
          } else {
            current = current ? current + " " + w : w;
          }
        });
        if (current) result.push({ type: "p", text: current });
      } else {
        result.push({ type: "p", text: cleanText });
      }
    }
  });

  return result;
}
