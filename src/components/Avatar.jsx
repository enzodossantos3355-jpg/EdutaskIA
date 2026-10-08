import { useState, useEffect } from "react";
import { API } from "@/lib/api";
import { getThemeByEffectOrId } from "@/lib/effects";

/**
 * Circular avatar. Optional `effect` renders a decorative wrapper (frame).
 * Legacy `tierBorderColor` prop is accepted but ignored (tier system removed).
 */
export default function Avatar({
  userId,
  name,
  size = 48,
  hasAvatar,
  version = 0,
  bg = "bg-sky-300",
  className = "",
  textClassName = "",
  // eslint-disable-next-line no-unused-vars
  tierBorderColor = null,
  effect = null,
}) {
  const [src, setSrc] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (hasAvatar && userId) {
      setSrc(`${API}/avatars/${encodeURIComponent(userId)}?v=${version || 0}`);
      setErrored(false);
    } else {
      setSrc(null);
      setErrored(false);
    }
  }, [userId, hasAvatar, version]);

  const showImage = src && !errored;
  const initial = (name?.[0] || "?").toUpperCase();
  const fontSize = size >= 60 ? "text-3xl" : size >= 40 ? "text-xl" : "text-base";

  // Sistema universal de cores temáticas para perfis sem foto em todos os temas
  const theme = getThemeByEffectOrId(effect);
  const avatarBg = showImage ? "bg-white" : theme?.avatarBg || bg;
  const avatarBgHex = !showImage ? theme?.avatarBgHex : undefined;
  const initialColor = theme?.avatarTextColor || "#0a0a0a";

  const inner = (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full border-2 border-black ${avatarBg} ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: "3px 3px 0 0 #0a0a0a",
        backgroundColor: avatarBgHex || undefined,
      }}
      data-testid={`avatar-${userId}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover rounded-full"
          draggable={false}
        />
      ) : (
        <span
          className={`font-heading font-black select-none ${fontSize} ${textClassName}`}
          style={{
            color: initialColor,
            fontWeight: 900,
          }}
          data-testid={`avatar-initial-${userId}`}
        >
          {initial}
        </span>
      )}
    </div>
  );

  if (!effect || effect === "none") return inner;
  return (
    <div
      className={`fx-avatar-wrapper ${effect}`}
      style={{ width: size + 10, height: size + 10 }}
      data-testid={`avatar-effect-${userId}`}
    >
      {inner}
    </div>
  );
}
