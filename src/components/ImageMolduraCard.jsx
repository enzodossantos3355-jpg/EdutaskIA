import { ShieldCheck, User } from "lucide-react";
import Avatar from "@/components/Avatar";
import { effectBadgeClass, effectClass, getEffect, isFramesDisabled } from "@/lib/effects";

export const IMAGE_MOLDURA_SPECS = {
  stranger_things: {
    id: "stranger_things",
    src: "/assets/aistudio/image_ee0012db.png",
    alt: "Moldura Stranger Things",
    holeLeftPct: 49.51,
    holeTopPct: 34.43,
    avatarWidthPct: 40.8,
    bleedScale: 1.095,
    bleedOrigin: "50% 50.3%",
    contentTopPct: 53.5,
    contentBottomPct: 22.5,
    nameClass: "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.98)]",
  },
  minecraft: {
    id: "minecraft",
    src: "/assets/aistudio/image_355bf36a.png",
    alt: "Moldura Minecraft",
    holeLeftPct: 49.51,
    holeTopPct: 32.86,
    avatarWidthPct: 40.4,
    bleedScale: 1.085,
    bleedOrigin: "50% 50%",
    contentTopPct: 52.0,
    contentBottomPct: 21.0,
    nameClass: "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)]",
  },
  riverdale: {
    id: "riverdale",
    src: "/assets/aistudio/image_db92fb6a.png",
    alt: "Moldura Riverdale",
    holeLeftPct: 49.73,
    holeTopPct: 34.31,
    avatarWidthPct: 40.6,
    bleedScale: 1.135,
    bleedOrigin: "50% 49.5%",
    contentTopPct: 53.5,
    contentBottomPct: 22.0,
    nameClass: "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.98)]",
  },
  mentalist: {
    id: "mentalist",
    src: "/assets/aistudio/image_1e34085b.png",
    alt: "Moldura O Mentalista",
    holeLeftPct: 49.42,
    holeTopPct: 33.02,
    avatarWidthPct: 40.8,
    bleedScale: 1.115,
    bleedOrigin: "50.2% 50.5%",
    contentTopPct: 52.5,
    contentBottomPct: 21.0,
    nameClass: "text-[#3b0707] drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]",
  },
};

export function hasImageMoldura(effectId) {
  if (!effectId || isFramesDisabled()) return false;
  return Boolean(IMAGE_MOLDURA_SPECS[effectId]);
}

export default function ImageMolduraCard({
  effectId,
  userId,
  name,
  role = "aluno",
  hasAvatar = false,
  version = 0,
  dim = false,
  statusMeta = null,
  showRoleBadge = true,
  bleed = false,
  className = "",
}) {
  const spec = IMAGE_MOLDURA_SPECS[effectId];
  if (!spec) return null;

  const theme = getEffect(effectId);
  const avatarFx = !dim ? effectClass(effectId) : null;
  const badgeCls = effectBadgeClass(effectId);
  const isAdmin = role === "admin";
  const StatusIcon = statusMeta?.icon || null;

  return (
    <div
      className={`relative w-full aspect-[1126/1397] overflow-hidden select-none ${className}`}
      data-testid={`image-moldura-${effectId}`}
    >
      {/* Scaled artwork + avatar layer so outer PNG margin bleeds seamlessly to the glowing card-moldura-* border */}
      <div
        className="absolute inset-0"
        style={
          bleed
            ? {
                transform: `scale(${spec.bleedScale})`,
                transformOrigin: spec.bleedOrigin,
              }
            : undefined
        }
      >
        {/* Avatar positioned behind the transparent circular cutout; inherits frame icon coloration & fx ring */}
        <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden flex items-center justify-center z-0 ${
            dim ? "grayscale" : ""
          }`}
          style={{
            left: `${spec.holeLeftPct}%`,
            top: `${spec.holeTopPct}%`,
            width: `${spec.avatarWidthPct}%`,
            aspectRatio: "1 / 1",
            backgroundColor: theme.avatarBgHex || "#e2e8f0",
          }}
        >
          <Avatar
            userId={userId}
            name={name}
            size={72}
            fillContainer={true}
            hasAvatar={hasAvatar}
            version={version}
            bg={isAdmin ? "bg-red-300" : "bg-sky-300"}
            effect={avatarFx}
          />
        </div>

        {/* Official remodeled frame overlay (transparent cutout reveals avatar cleanly) */}
        <img
          src={spec.src}
          alt={spec.alt}
          className="relative z-10 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      </div>

      {/* Name & role/status badge placed inside the open central-lower zone of the artwork */}
      <div
        className="absolute inset-x-[13%] z-20 flex flex-col items-center justify-center gap-1.5 text-center pointer-events-none"
        style={{
          top: `${spec.contentTopPct}%`,
          bottom: `${spec.contentBottomPct}%`,
        }}
      >
        <div
          className={`w-full font-heading font-black text-sm sm:text-[15px] leading-normal break-words px-1 ${spec.nameClass}`}
        >
          {name}
        </div>
        {statusMeta?.label ? (
          <span
            className={`nb-badge inline-flex items-center gap-1 text-[10px] px-2 py-0.5 ${statusMeta.bg}`}
            data-testid={userId ? `profile-status-${userId}` : undefined}
          >
            {StatusIcon && <StatusIcon className="w-3 h-3" strokeWidth={2.5} />}
            {statusMeta.label}
          </span>
        ) : showRoleBadge ? (
          <span
            className={`nb-badge inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 font-black shadow-[1.5px_1.5px_0_0_#000] ${
              isAdmin ? "bg-red-200 text-red-950 border-black" : badgeCls
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {isAdmin ? "Admin" : "Aluno"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
