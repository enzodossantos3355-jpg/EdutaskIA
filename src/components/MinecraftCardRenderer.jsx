import ImageMolduraCard from "@/components/ImageMolduraCard";

export default function MinecraftCardRenderer({ profile, onClick, isSelected = false, meta = null }) {
  const p = profile;

  return (
    <div
      onClick={onClick}
      className={`relative w-full max-w-[170px] cursor-pointer transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 select-none ${
        isSelected ? "ring-4 ring-emerald-400 rounded-2xl" : ""
      }`}
      data-testid={`minecraft-card-${p.id}`}
    >
      <ImageMolduraCard
        effectId="minecraft"
        userId={p.id}
        name={p.name}
        role={p.role}
        hasAvatar={p.has_avatar}
        dim={Boolean(meta?.dim)}
        statusMeta={meta}
      />
    </div>
  );
}
