import { useRef, useState, useEffect } from "react";
import { Camera, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import Avatar from "@/components/Avatar";

/**
 * AvatarUploader: shows an avatar with buttons to change / remove.
 * - For self: pass `path="/me/avatar"` (default).
 * - For admin managing another user: pass `path="/users/{id}/avatar"`.
 */
export default function AvatarUploader({
  userId,
  name,
  hasAvatar,
  onChanged,
  path = "/me/avatar",
  size = 96,
  bg = "bg-sky-300",
  tierBorderColor = null,
  effect = null,
  compact = false,
  showLabelButtons = true,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState(0);
  const [localHasAvatar, setLocalHasAvatar] = useState(Boolean(hasAvatar));

  useEffect(() => {
    setLocalHasAvatar(Boolean(hasAvatar));
  }, [hasAvatar]);

  /**
   * Reads and optionally optimizes standard images via Canvas to avoid
   * unsupported raw camera formats and massive payload sizes.
   */
  const processImageFile = async (file) => {
    // If SVG or gif, return as is to preserve vector or animation
    if (
      file.type === "image/svg+xml" ||
      file.type === "image/gif" ||
      /\.(svg|gif)$/i.test(file.name)
    ) {
      return file;
    }

    // Try canvas optimization for jpg/png/webp/bmp/heic/avif
    try {
      const bitmapOrUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = bitmapOrUrl;
      });

      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(bitmapOrUrl);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          file.type === "image/png" ? "image/png" : "image/jpeg",
          0.92
        );
      });

      if (blob) {
        return new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: blob.type,
        });
      }
    } catch {
      // Fallback: send raw file
    }
    return file;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = Boolean(
      (file.type && file.type.startsWith("image/")) ||
      /\.(png|jpe?g|webp|gif|avif|bmp|svg|heic|heif|jfif|ico|tiff?)$/i.test(file.name || "")
    );

    if (!isImage) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP, GIF, SVG, BMP, AVIF, HEIC).");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(path, fd);
      const newVer = Date.now();
      setVersion(newVer);
      setLocalHasAvatar(true);
      toast.success("Foto atualizada com sucesso!");
      onChanged?.(true);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao enviar imagem. Verifique o arquivo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = async () => {
    setUploading(true);
    try {
      await api.delete(path);
      const newVer = Date.now();
      setVersion(newVer);
      setLocalHasAvatar(false);
      toast.success("Foto removida com sucesso!");
      onChanged?.(false);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao remover foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3" data-testid="avatar-uploader">
      <div className="relative inline-block">
        <Avatar
          userId={userId}
          name={name}
          size={size}
          hasAvatar={localHasAvatar}
          version={version}
          bg={bg}
          tierBorderColor={tierBorderColor}
          effect={effect}
        />

        {/* Action icons directly on avatar badge */}
        <div className="absolute -bottom-1 -right-1 flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="nb-btn bg-amber-300 hover:bg-amber-400 p-1.5 rounded-md shadow-[2px_2px_0px_0px_#0a0a0a]"
            data-testid="avatar-upload-button"
            title="Escolher nova foto"
            aria-label="Escolher foto"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" strokeWidth={2.5} />}
          </button>

          {localHasAvatar && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="nb-btn bg-red-400 hover:bg-red-500 text-white p-1.5 rounded-md shadow-[2px_2px_0px_0px_#0a0a0a]"
              data-testid="avatar-remove-button-icon"
              title="Remover foto do perfil"
              aria-label="Remover foto"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.pjpeg,.jfif,.webp,.gif,.avif,.bmp,.svg,.heic,.heif,.ico,.tif,.tiff"
          onChange={handleFile}
          className="hidden"
          data-testid="avatar-file-input"
        />
      </div>

      {showLabelButtons && !compact && (
        <div className="flex flex-col gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="nb-btn bg-white hover:bg-sky-100 px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap"
            data-testid="avatar-change-button"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Enviando..." : localHasAvatar ? "Trocar foto" : "Adicionar foto"}
          </button>
          {localHasAvatar && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="nb-btn bg-red-200 hover:bg-red-300 px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap text-red-950 font-bold"
              data-testid="avatar-remove-button"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-700" />
              Remover foto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
