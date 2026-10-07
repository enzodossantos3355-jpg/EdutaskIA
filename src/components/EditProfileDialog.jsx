import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import AvatarUploader from "@/components/AvatarUploader";

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
  const [submitting, setSubmitting] = useState(false);
  const [avatarChanged, setAvatarChanged] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (name.trim() && name.trim() !== initialName) payload.name = name.trim();
    if (password.trim()) payload.password = password.trim();

    if (Object.keys(payload).length === 0) {
      if (avatarChanged) {
        toast.success("Perfil atualizado!");
        onSaved?.();
      } else {
        toast("Nenhuma alteração de texto");
        onClose();
      }
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(path, payload);
      toast.success("Perfil atualizado!");
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao atualizar");
    } finally {
      setSubmitting(false);
    }
  };

  const title = label ? `Editar ${label}` : "Editar meu perfil";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-4" data-testid="edit-profile-dialog">
      <div className="nb-card bg-white w-full max-w-md p-5 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-black text-xl sm:text-2xl">{title}</h3>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-2" aria-label="Fechar">
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
            <button type="button" onClick={onClose} className="nb-btn bg-white px-5 py-2.5">Cancelar</button>
            <button type="submit" disabled={submitting} className="nb-btn bg-sky-400 px-5 py-2.5 font-bold" data-testid="submit-edit-profile">
              {submitting ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
