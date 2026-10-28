import Avatar from "@/components/Avatar";

export default function SpongeBobCardRenderer({ profile, onClick, isSelected = false }) {
  const p = profile;
  const isAdmin = p.role === "admin";
  const roleLabel = isAdmin ? "ADMIN" : "ALUNO";

  return (
    <div
      onClick={onClick}
      className={`nb-card relative rounded-xl border-2 border-black overflow-hidden cursor-pointer transition-all duration-200 min-h-[160px] ${
        isSelected ? "ring-4 ring-amber-400" : ""
      }`}
      data-testid={`spongebob-card-${p.id}`}
    >
      {/* Exact SpongeBob Card Background Image attached by user */}
      <img
        src="/assets/aistudio/image_2a9500fc.png"
        alt="Bob Esponja Moldura"
        className="absolute inset-0 w-full h-full object-cover scale-[1.28] origin-[46%_48%] z-0"
        draggable={false}
      />

      {/* Avatar positioned over the white cutout circle */}
      <div className="absolute top-[28%] left-[48%] -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-none">
        <Avatar
          userId={p.id}
          name={p.name}
          size={64}
          hasAvatar={p.has_avatar}
          bg={isAdmin ? "bg-red-300" : "bg-sky-300"}
          effect="fx-spongebob"
        />
      </div>

      {/* Student Name Board at Bottom */}
      <div className="absolute bottom-2.5 inset-x-2 z-20 bg-neutral-900/90 border-2 border-black rounded-lg p-1.5 shadow-[2px_2px_0_0_#000] text-center">
        <div
          className="text-white text-xs font-black truncate"
          style={{
            textShadow: "1px 1px 0px #000",
          }}
        >
          {p.name}
        </div>
        <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
          {roleLabel}
        </div>
      </div>
    </div>
  );
}
