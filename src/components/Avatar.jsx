import { useState, useEffect } from "react";
import { firebaseService } from "@/lib/firebaseService";

// In-Memory cache to prevent avatar flickering and avoid redundant Firestore calls
const avatarMemoryCache = new Map();

/**
 * Circular avatar. Optional `effect` renders a decorative wrapper (frame).
 * Loads image directly from memory cache, localStorage, or Firestore.
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
  const [src, setSrc] = useState(() => {
    if (!userId) return null;
    if (avatarMemoryCache.has(userId)) {
      return avatarMemoryCache.get(userId);
    }
    const cached = localStorage.getItem("cached_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if ((parsed.id === userId || userId.startsWith("preview-")) && parsed.avatar_data) {
          avatarMemoryCache.set(userId, parsed.avatar_data);
          return parsed.avatar_data;
        }
      } catch {}
    }
    return null;
  });

  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setSrc(null);
      return;
    }

    // Handle preview avatars
    if (userId.startsWith("preview-")) {
      const cached = localStorage.getItem("cached_user");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.avatar_data) {
            setSrc(parsed.avatar_data);
            setErrored(false);
            return;
          }
        } catch {}
      }
    }

    // Check memory cache first
    if (avatarMemoryCache.has(userId) && version === 0) {
      setSrc(avatarMemoryCache.get(userId));
      setErrored(false);
      return;
    }

    // Check cached logged-in user in localStorage
    const cached = localStorage.getItem("cached_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === userId && parsed.avatar_data) {
          avatarMemoryCache.set(userId, parsed.avatar_data);
          setSrc(parsed.avatar_data);
          setErrored(false);
          return;
        }
      } catch {}
    }

    // If hasAvatar is explicitly false and no version bump, skip Firestore fetch
    if (hasAvatar === false && version === 0) {
      setSrc(null);
      return;
    }

    // Fetch from Firestore directly
    firebaseService
      .getUserById(userId)
      .then((user) => {
        if (!active) return;
        if (user && user.avatar_data) {
          avatarMemoryCache.set(userId, user.avatar_data);
          setSrc(user.avatar_data);
          setErrored(false);
        } else {
          avatarMemoryCache.delete(userId);
          setSrc(null);
        }
      })
      .catch(() => {
        if (active) setSrc(null);
      });

    return () => {
      active = false;
    };
  }, [userId, hasAvatar, version]);

  const showImage = Boolean(src) && !errored;
  const initial = (name?.[0] || "?").toUpperCase();
  const fontSize = size >= 60 ? "text-3xl" : size >= 40 ? "text-xl" : "text-base";

  const inner = (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full border-2 border-black ${showImage ? "bg-white" : bg} ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: "3px 3px 0 0 #0a0a0a",
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
        <span className={`font-heading font-black ${fontSize} ${textClassName}`}>{initial}</span>
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
