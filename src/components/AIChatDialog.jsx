import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, X, Sparkles, Bot, User as UserIcon, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";

/**
 * Reusable AI chat drawer/modal.
 * Props:
 *  - open, onClose
 *  - taskId (optional) — binds context to a task
 *  - sessionKey (localStorage key to persist session_id across mounts)
 *  - title
 *  - initialAssistantMessage (shown as the first message before user types)
 */
export default function AIChatDialog({ open, onClose, taskId, taskTitle, sessionKey = "ai_chat_default", title = "Tira-dúvida IA", initialAssistantMessage }) {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(sessionKey) || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!sessionId) {
      // reset local view
      setMessages(initialAssistantMessage
        ? [{ role: "assistant", content: initialAssistantMessage, ts: new Date().toISOString() }]
        : []);
      return;
    }
    // load history from backend
    let cancelled = false;
    setLoadingHistory(true);
    api.get(`/ai/chat/${sessionId}`).then(({ data }) => {
      if (cancelled) return;
      const msgs = data.messages || [];
      if (msgs.length === 0 && initialAssistantMessage) {
        setMessages([{ role: "assistant", content: initialAssistantMessage, ts: new Date().toISOString() }]);
      } else {
        setMessages(msgs);
      }
    }).catch(() => {
      if (!cancelled) setMessages([]);
    }).finally(() => {
      if (!cancelled) setLoadingHistory(false);
    });
    return () => { cancelled = true; };
  }, [open, sessionId, initialAssistantMessage]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (customText) => {
    const text = (customText || input).trim();
    if (!text || sending) return;
    setSending(true);
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", content: text, ts: now }]);
    if (!customText) setInput("");
    try {
      const { data } = await api.post("/ai/chat", {
        session_id: sessionId,
        message: text,
        task_id: taskId || null,
      });
      if (!sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem(sessionKey, data.session_id);
      }
      setMessages((m) => [...m, { role: "assistant", content: data.message, ts: new Date().toISOString() }]);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha na IA");
      setMessages((m) => m.filter((x) => !(x.role === "user" && x.content === text)));
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    if (sessionId) {
      try { await api.delete(`/ai/chat/${sessionId}`); } catch {}
    }
    localStorage.removeItem(sessionKey);
    setSessionId(null);
    setMessages(initialAssistantMessage
      ? [{ role: "assistant", content: initialAssistantMessage, ts: new Date().toISOString() }]
      : []);
    toast.success("Conversa reiniciada");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" data-testid="ai-chat-dialog">
      <div className="nb-card bg-white w-full max-w-2xl h-[92vh] sm:h-[85vh] flex flex-col p-3.5 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 nb-card flex items-center justify-center bg-gradient-to-br from-violet-300 to-pink-300 flex-shrink-0">
              <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-base sm:text-xl truncate">{title}</h3>
              <p className="text-[10px] text-neutral-500">Tutor Pedagógico com Acesso a Tarefas & Gabaritos</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={reset}
              className="nb-btn bg-white hover:bg-red-100 px-2 py-1.5"
              title="Nova conversa"
              data-testid="ai-chat-reset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="nb-btn bg-white px-2 py-1.5" data-testid="ai-chat-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Context Banner */}
        {taskId && (
          <div className="mb-2 p-2 bg-violet-100 rounded-lg border border-violet-300 text-[11px] font-bold text-violet-950 flex items-center justify-between flex-shrink-0">
            <span className="truncate">🎯 Foco na tarefa: <strong>{taskTitle || "Tarefa selecionada"}</strong></span>
            <span className="text-[10px] text-violet-700 bg-white/70 px-1.5 py-0.5 rounded border border-violet-200 ml-2 flex-shrink-0">
              Gabarito ativo
            </span>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1" data-testid="ai-chat-messages">
          {loadingHistory && <p className="text-xs text-neutral-500">Carregando conversa...</p>}
          {!loadingHistory && messages.length === 0 && (
            <div className="nb-card bg-amber-50 p-4 text-xs sm:text-sm text-neutral-700 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-amber-500" strokeWidth={2.5} />
              Tire qualquer dúvida sobre matérias, confira o raciocínio dos gabaritos ou pergunte sobre suas tarefas pendentes! 💡
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 nb-card flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-sky-200" : "bg-violet-200"}`}>
                {m.role === "user" ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`nb-card px-3 py-2 max-w-[85%] whitespace-pre-wrap text-xs sm:text-sm leading-relaxed ${m.role === "user" ? "bg-sky-100" : "bg-white"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 nb-card flex items-center justify-center flex-shrink-0 bg-violet-200">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="nb-card px-3 py-2 bg-white text-xs text-neutral-500 italic">
                analisando tarefas e gabaritos<span className="inline-block animate-pulse">...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 flex-shrink-0 no-scrollbar">
          {taskId ? (
            <>
              <button
                onClick={() => send("Pode me dar uma dica sobre como começar essa tarefa?")}
                disabled={sending}
                className="nb-btn bg-white hover:bg-violet-50 text-[11px] px-2.5 py-1 whitespace-nowrap flex-shrink-0"
              >
                💡 Dica para começar
              </button>
              <button
                onClick={() => send("Como conferir a resposta ou o gabarito oficial dessa tarefa?")}
                disabled={sending}
                className="nb-btn bg-white hover:bg-emerald-50 text-[11px] px-2.5 py-1 whitespace-nowrap flex-shrink-0"
              >
                ✅ Conferir gabarito
              </button>
              <button
                onClick={() => send("Pode me explicar o enunciado passo a passo?")}
                disabled={sending}
                className="nb-btn bg-white hover:bg-sky-50 text-[11px] px-2.5 py-1 whitespace-nowrap flex-shrink-0"
              >
                📖 Explicar enunciado
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => send("Quais são minhas tarefas pendentes para fazer?")}
                disabled={sending}
                className="nb-btn bg-white hover:bg-sky-50 text-[11px] px-2.5 py-1 whitespace-nowrap flex-shrink-0"
              >
                📋 Minhas tarefas pendentes
              </button>
              <button
                onClick={() => send("Como está meu perfil e meu progresso de tarefas?")}
                disabled={sending}
                className="nb-btn bg-white hover:bg-amber-50 text-[11px] px-2.5 py-1 whitespace-nowrap flex-shrink-0"
              >
                👤 Meu perfil e progresso
              </button>
              <button
                onClick={() => send("O que você recomenda eu estudar agora?")}
                disabled={sending}
                className="nb-btn bg-white hover:bg-violet-50 text-[11px] px-2.5 py-1 whitespace-nowrap flex-shrink-0"
              >
                🎯 O que estudar agora?
              </button>
            </>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2 flex-shrink-0"
          data-testid="ai-chat-form"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={taskId ? "Pergunte sobre a tarefa ou gabarito..." : "Tire sua dúvida ou pergunte sobre suas tarefas..."}
            className="nb-input flex-1 text-sm py-2 px-3"
            maxLength={1000}
            disabled={sending}
            data-testid="ai-chat-input"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="nb-btn bg-violet-300 hover:bg-violet-400 px-3.5 py-2 flex items-center justify-center"
            data-testid="ai-chat-send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
