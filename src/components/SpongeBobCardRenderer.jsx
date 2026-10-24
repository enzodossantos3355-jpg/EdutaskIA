import Avatar from "@/components/Avatar";

export function SailorCapIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      {/* Sailor Hat Brim */}
      <path
        d="M2 17C4 19 20 19 22 17C20 14 4 14 2 17Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Sailor Hat Crown */}
      <path
        d="M5 14C6 8 18 8 19 14Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Blue / Black band */}
      <path d="M4.5 14C8 13.5 16 13.5 19.5 14" stroke="#0284c7" strokeWidth="2.5" />
      {/* Anchor Emblem */}
      <circle cx="12" cy="11" r="1.5" fill="#000000" />
      <path d="M12 12V16M10 14.5C10.5 16 13.5 16 14 14.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function StarfishAndUrchin({ scale = 1 }) {
  return (
    <div
      className="absolute -bottom-1.5 -right-2 z-30 pointer-events-none flex items-center origin-bottom-right"
      style={{ transform: `scale(${scale})` }}
    >
      {/* Orange Starfish */}
      <svg width="30" height="30" viewBox="0 0 36 36" className="drop-shadow-[1px_2px_2px_rgba(0,0,0,0.6)]">
        <polygon
          points="18,2 22,13 34,13 24,20 28,32 18,24 8,32 12,20 2,13 14,13"
          fill="#f97316"
          stroke="#7c2d12"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Suction dots */}
        <circle cx="18" cy="12" r="1" fill="#fed7aa" />
        <circle cx="15" cy="18" r="1" fill="#fed7aa" />
        <circle cx="21" cy="18" r="1" fill="#fed7aa" />
        <circle cx="18" cy="22" r="1" fill="#fed7aa" />
      </svg>
      {/* Purple Sea Urchin */}
      <svg width="20" height="20" viewBox="0 0 24 24" className="-ml-2 mt-1.5 drop-shadow-[1px_2px_2px_rgba(0,0,0,0.6)]">
        <circle cx="12" cy="12" r="8" fill="#a855f7" stroke="#581c87" strokeWidth="1.5" />
        {/* Spines */}
        <path d="M12 2V5M12 19V22M2 12H5M19 12H22M5 5L7 7M17 17L19 19M5 19L7 17M17 7L19 5" stroke="#581c87" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" fill="#c084fc" />
      </svg>
    </div>
  );
}

export default function SpongeBobCardRenderer({ profile, onClick, isSelected = false }) {
  const p = profile;
  const isAdmin = p.role === "admin";
  const roleLabel = isAdmin ? "ADMIN" : "ALUNO";

  return (
    <div
      onClick={onClick}
      className={`relative w-full max-w-[155px] sm:max-w-[160px] h-[200px] text-center group cursor-pointer transition-transform duration-200 hover:-translate-y-1 active:translate-y-0.5 select-none font-spongebob ${
        isSelected ? "ring-4 ring-cyan-400" : ""
      }`}
      data-testid={`spongebob-card-${p.id}`}
    >
      {/* TOP DECORATION: Pineapple leaves + Hibiscus Flowers + Fluffy Clouds */}
      <div className="absolute -top-2.5 inset-x-0 z-20 flex items-center justify-between px-1 pointer-events-none">
        {/* Left Pink / Purple Flower & Cloud */}
        <div className="flex items-center -space-x-1">
          <div className="w-4 h-3 bg-white/90 rounded-full border border-sky-300" />
          <svg width="18" height="18" viewBox="0 0 32 32" className="drop-shadow-xs">
            <circle cx="16" cy="7" r="6" fill="#ec4899" />
            <circle cx="7" cy="16" r="6" fill="#ec4899" />
            <circle cx="25" cy="16" r="6" fill="#ec4899" />
            <circle cx="10" cy="24" r="6" fill="#a855f7" />
            <circle cx="22" cy="24" r="6" fill="#a855f7" />
            <circle cx="16" cy="16" r="4.5" fill="#facc15" stroke="#000" strokeWidth="1" />
          </svg>
        </div>

        {/* Central Pineapple Crown Leaves */}
        <svg width="40" height="22" viewBox="0 0 60 34" className="-mt-1 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]">
          <path d="M30 30 Q12 18 2 12 Q14 26 30 30Z" fill="#15803d" stroke="#052e16" strokeWidth="1.5" />
          <path d="M30 30 Q18 10 12 2 Q22 20 30 30Z" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
          <path d="M30 30 Q30 4 30 0 Q30 4 30 30Z" fill="#22c55e" stroke="#052e16" strokeWidth="2.5" />
          <path d="M30 30 Q42 10 48 2 Q38 20 30 30Z" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
          <path d="M30 30 Q48 18 58 12 Q46 26 30 30Z" fill="#15803d" stroke="#052e16" strokeWidth="1.5" />
        </svg>

        {/* Right Yellow / Orange Flower & Cloud */}
        <div className="flex items-center -space-x-1">
          <svg width="18" height="18" viewBox="0 0 32 32" className="drop-shadow-xs">
            <circle cx="16" cy="7" r="6" fill="#facc15" />
            <circle cx="7" cy="16" r="6" fill="#facc15" />
            <circle cx="25" cy="16" r="6" fill="#facc15" />
            <circle cx="10" cy="24" r="6" fill="#fb923c" />
            <circle cx="22" cy="24" r="6" fill="#fb923c" />
            <circle cx="16" cy="16" r="4.5" fill="#38bdf8" stroke="#000" strokeWidth="1" />
          </svg>
          <div className="w-4 h-3 bg-white/90 rounded-full border border-sky-300" />
        </div>
      </div>

      {/* CARD CONTAINER WITH THICK NAUTICAL ROPE BORDER */}
      <div
        className="w-full h-full relative rounded-2xl overflow-hidden p-1.5 pt-4 pb-0.5 flex flex-col justify-between items-center"
        style={{
          backgroundColor: "#facc15",
          border: "3.5px solid #78350f",
          boxShadow: "0 0 0 2px #fef08a, 3px 3px 0 0 #000000, inset 0 0 14px #eab308",
        }}
      >
        {/* Sponge Pores / Holes Graphic Elements */}
        <div className="absolute top-5 left-1.5 w-4 h-4 rounded-full bg-[#ca8a04]/50 pointer-events-none" />
        <div className="absolute top-6 right-2 w-4 h-4 rounded-full bg-[#ca8a04]/50 pointer-events-none" />
        <div className="absolute bottom-12 left-1.5 w-3 h-3 rounded-full bg-[#ca8a04]/40 pointer-events-none" />
        <div className="absolute bottom-14 right-2 w-3.5 h-3.5 rounded-full bg-[#ca8a04]/40 pointer-events-none" />

        {/* Floating Underwater Bubbles */}
        <div className="absolute top-9 left-1/4 w-2.5 h-2.5 rounded-full border border-white/80 bg-white/30 pointer-events-none" />
        <div className="absolute top-14 right-1/4 w-2 h-2 rounded-full border border-white/80 bg-white/30 pointer-events-none" />

        {/* CENTER AVATAR: Submarine Metallic Porthole (Escotilha) */}
        <div className="relative mt-0.5 mb-1 flex-shrink-0">
          {/* Metallic porthole ring with screws */}
          <div
            className="p-1 rounded-full relative shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.7)]"
            style={{
              background: "radial-gradient(circle at 35% 35%, #cbd5e1 0%, #94a3b8 50%, #475569 100%)",
              border: "3px solid #1e293b",
            }}
          >
            {/* Screws */}
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#334155] border border-white/60" />
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#334155] border border-white/60" />
            <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#334155]" />
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#334155]" />

            {/* Inner Avatar Photo */}
            <div className="w-14 h-14 rounded-full overflow-hidden border border-black/80 shadow-inner flex items-center justify-center bg-sky-200">
              <Avatar
                userId={p.id}
                name={p.name}
                size={56}
                hasAvatar={p.has_avatar}
                bg={isAdmin ? "bg-red-300" : "bg-sky-300"}
              />
            </div>

            {/* Starfish and Urchin attached to the bottom right */}
            <StarfishAndUrchin scale={0.65} />
          </div>
        </div>

        {/* NAME PLAQUE: Rustic Weathered Wooden Board */}
        <div
          className="w-full py-0.5 px-1.5 my-0.5 border-2 border-black rounded-md shadow-[inset_0_1px_0_#92400e,1.5px_2px_0_#000000] relative z-10 flex-shrink-0"
          style={{
            backgroundColor: "#78350f",
            backgroundImage: "linear-gradient(180deg, #92400e 0%, #78350f 50%, #542509 100%)",
          }}
        >
          <div
            className="text-white text-[11px] font-black text-center whitespace-normal break-words leading-tight"
            style={{
              fontFamily: "'Fredoka', 'Sniglet', cursive, sans-serif",
              textShadow: "1.5px 1.5px 0px #000000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000",
            }}
          >
            {p.name}
          </div>
        </div>

        {/* BOTTOM CARGO BUTTON: Glossy Cyan Cartoon Bubble + Sailor Cap */}
        <div
          className="w-full py-0.5 px-1.5 rounded-xl border-2 border-black flex items-center justify-center gap-1 relative z-10 shadow-[inset_0_2px_0_#bae6fd,inset_0_-2px_0_#0369a1,0_2px_0_#000000] transition-transform active:translate-y-0.5 flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)",
          }}
        >
          <SailorCapIcon size={14} />
          <span
            className="text-white text-[10px] font-black tracking-wide"
            style={{
              fontFamily: "'Fredoka', 'Sniglet', cursive, sans-serif",
              textShadow: "1px 1px 0px #000000",
            }}
          >
            {roleLabel}
          </span>
        </div>

        {/* BOTTOM SEA FLOOR: Sand, Seaweed, Rocks & Seashells Base */}
        <div className="w-full -mx-1.5 -mb-0.5 mt-0.5 relative pointer-events-none h-3.5 flex-shrink-0">
          {/* Left Wavy Kelp */}
          <svg className="absolute -bottom-0.5 -left-1 w-5 h-8 z-20" viewBox="0 0 32 64">
            <path d="M8 64 Q2 45 10 30 Q18 15 8 0 Q0 15 6 30 Q12 45 6 64Z" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
          </svg>

          {/* Right Wavy Kelp */}
          <svg className="absolute -bottom-0.5 -right-1 w-5 h-8 z-20" viewBox="0 0 32 64">
            <path d="M24 64 Q30 45 22 30 Q14 15 24 0 Q32 15 26 30 Q20 45 26 64Z" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
          </svg>

          {/* Sand floor */}
          <svg className="w-full h-3.5" viewBox="0 0 200 30" preserveAspectRatio="none">
            <path d="M0 12 Q50 4 100 8 Q150 12 200 6 L200 30 L0 30Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
            <ellipse cx="30" cy="18" rx="8" ry="4" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
            <circle cx="70" cy="22" r="3" fill="#f472b6" stroke="#9d174d" strokeWidth="0.8" />
            <ellipse cx="170" cy="19" rx="7" ry="4" fill="#475569" stroke="#0f172a" strokeWidth="1" />
            <circle cx="140" cy="23" r="2.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
