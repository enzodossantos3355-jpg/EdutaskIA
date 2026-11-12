import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Check } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import AvatarUploader from "@/components/AvatarUploader";
import ModalPortal from "@/components/ModalPortal";

/**
 * Dialog to edit a user's name, password and avatar.
 * - For self: pass `path="/me"`, `avatarPath="/me/avatar"`. Title shows "Editar meu perfil".
 * - For admin editing student: pass `path="/users/{id}"`, `avatarPath="/users/{id}/avatar"`, `userId`, `hasAvatar` and label.
 */
export default function EditProfileDialog({
  userId,
  hasAvatar = false,
  avatarPath = "/me/avatar",
  initialName = "",
  path = "/me",
  label,
  showPassword = true,
  onClose,
  onSaved,
}) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saving" | "saved"
  const [avatarChanged, setAvatarChanged] = useState(false);

  const submitting = saveState === "saving";

  const submit = async (e) => {
    e.preventDefault();
    if (saveState !== "idle") return;
    const payload = {};
    if (name.trim() && name.trim() !== initialName) payload.name = name.trim();
    if (password.trim()) payload.password = password.trim();

    if (Object.keys(payload).length === 0) {
      if (avatarChanged) {
        setSaveState("saved");
        toast.success("Perfil atualizado!");
        setTimeout(() => {
          onSaved?.();
        }, 320);
      } else {
        toast("Nenhuma alteração de texto");
        onClose();
      }
      return;
    }

    setSaveState("saving");
    try {
      await api.patch(path, payload);
      setSaveState("saved");
      toast.success("Perfil atualizado!");
      setTimeout(() => {
        onSaved?.();
      }, 360);
    } catch (err) {
      setSaveState("idle");
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao atualizar");
    }
  };

  const title = label ? `Editar ${label}` : "Editar meu perfil";

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-stretch sm:justify-end p-0"
      data-testid="edit-profile-dialog"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="panel-drawer drawer-panel nb-card bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-none sm:rounded-l-2xl overflow-auto p-5 sm:p-7 border-b-0 sm:border-y-0 sm:border-r-0 shadow-[-6px_0_0_0_#000]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-black text-xl sm:text-2xl">{title}</h3>
          <button onClick={onClose} disabled={submitting} className="nb-btn bg-white px-2 py-2" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo Management Section */}
        <div className="mb-5 p-3.5 bg-neutral-50 rounded-xl border-2 border-neutral-900 shadow-[3px_3px_0px_0px_#0a0a0a]">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2.5">
            Foto do Perfil
          </label>
          <AvatarUploader
            userId={userId}
            name={name || initialName}
            hasAvatar={hasAvatar}
            path={avatarPath}
            size={64}
            bg="bg-sky-200"
            showLabelButtons={true}
            onChanged={() => {
              setAvatarChanged(true);
            }}
          />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nb-input"
              placeholder="Nome do perfil"
              data-testid="edit-name-input"
            />
          </div>
          {showPassword && (
            <div>
              <label className="block text-sm font-bold mb-1.5">Nova senha</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="nb-input"
                placeholder="Deixe em branco para manter"
                minLength={4}
                data-testid="edit-password-input"
              />
              <p className="text-xs text-neutral-500 mt-1">Mínimo 4 caracteres. Deixe vazio para não alterar.</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="nb-btn bg-white px-5 py-2.5">Cancelar</button>
            <button
              type="submit"
              disabled={saveState !== "idle"}
              className={`nb-btn px-5 py-2.5 font-bold flex items-center gap-2 transition-colors duration-200 ${saveState === "saved" ? "bg-emerald-300" : "bg-sky-400"}`}
              data-testid="submit-edit-profile"
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
                <span>Salvar alterações</span>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}
