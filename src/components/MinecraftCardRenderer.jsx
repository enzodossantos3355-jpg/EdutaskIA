import Avatar from "@/components/Avatar";

export function SteveFaceIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" className="flex-shrink-0" shapeRendering="crispEdges">
      {/* Base skin */}
      <rect width="8" height="8" fill="#b97c55" />
      {/* Brown Hair */}
      <rect x="0" y="0" width="8" height="2" fill="#3b2718" />
      <rect x="0" y="2" width="1" height="1" fill="#3b2718" />
      <rect x="7" y="2" width="1" height="1" fill="#3b2718" />
      {/* Eyes: white + cyan/blue */}
      <rect x="1" y="3" width="1" height="1" fill="#ffffff" />
      <rect x="2" y="3" width="1" height="1" fill="#2563eb" />
      <rect x="5" y="3" width="1" height="1" fill="#2563eb" />
      <rect x="6" y="3" width="1" height="1" fill="#ffffff" />
      {/* Nose */}
      <rect x="3" y="4" width="2" height="1" fill="#935738" />
      {/* Mouth / Beard */}
      <rect x="2" y="5" width="4" height="1" fill="#583722" />
    </svg>
  );
}

export default function MinecraftCardRenderer({ profile, onClick, isSelected = false, meta = null }) {
  const p = profile;
  const isAdmin = p.role === "admin";
  const roleLabel = isAdmin ? "ADMIN" : "ALUNO";

  return (
    <div
      onClick={onClick}
      className={`relative w-full max-w-[155px] sm:max-w-[160px] h-[200px] text-center group cursor-pointer transition-transform duration-200 hover:-translate-y-1 active:translate-y-0.5 select-none font-minecraft ${
        isSelected ? "ring-4 ring-[#2cc5f6]" : ""
      }`}
      style={{ borderRadius: "0px" }}
      data-testid={`minecraft-card-${p.id}`}
    >
      {/* Yellow Dandelions poking out from the top edge */}
      <div className="absolute -top-2.5 inset-x-0 flex justify-between px-2.5 pointer-events-none z-20">
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 bg-[#facc15] border border-black" />
          <div className="w-1 h-1.5 bg-[#15803d]" />
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 bg-[#facc15] border border-black" />
          <div className="w-1 h-1.5 bg-[#15803d]" />
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 bg-[#facc15] border border-black" />
          <div className="w-1 h-1.5 bg-[#15803d]" />
        </div>
      </div>

      {/* Main Minecraft Card Outer Border (Solid Black 8-bit) */}
      <div
        className="w-full h-full border-3 border-black bg-[#866043] flex flex-col justify-between relative overflow-hidden"
        style={{
          borderRadius: "0px",
          boxShadow: "3px 3px 0 0 #000000",
        }}
      >
        {/* TOP LAYER: Grass Block with pixel tufts */}
        <div className="w-full h-3.5 bg-[#5c8e32] border-b-2 border-[#38591b] relative px-1 flex-shrink-0">
          {/* Pixel grass texture details */}
          <div className="absolute top-0.5 left-2 w-1.5 h-0.5 bg-[#7cbd3a]" />
          <div className="absolute top-1 left-8 w-2 h-0.5 bg-[#7cbd3a]" />
          <div className="absolute top-0.5 right-6 w-1.5 h-0.5 bg-[#7cbd3a]" />
          <div className="absolute top-1 right-2 w-2 h-0.5 bg-[#7cbd3a]" />
        </div>

        {/* MIDDLE LAYER: Dirt Block Texture + Avatar + Name Plaque */}
        <div
          className="flex-1 w-full px-2 py-1 flex flex-col items-center justify-center relative min-h-0"
          style={{
            backgroundColor: "#866043",
            backgroundImage: `radial-gradient(#573d26 15%, transparent 16%), radial-gradient(#3d2817 15%, transparent 16%)`,
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0, 6px 6px",
          }}
        >
          {/* Avatar Slot: Beveled Metallic Silver 8-bit Inventory Frame */}
          <div
            className="p-1 bg-[#8b8b8b] border-t-2 border-l-2 border-[#ffffff] border-b-2 border-r-2 border-[#373737] shadow-[0_0_0_1.5px_#000000] flex-shrink-0"
            style={{ borderRadius: "0px" }}
          >
            <div className="w-14 h-14 bg-[#1f1f1f] flex items-center justify-center overflow-hidden">
              <Avatar
                userId={p.id}
                name={p.name}
                size={56}
                hasAvatar={p.has_avatar}
                bg={isAdmin ? "bg-red-400" : "bg-sky-400"}
                square={true}
              />
            </div>
          </div>

          {/* Name Plaque: Horizontal Dark Oak Wood Plaque with Seams */}
          <div
            className="w-full bg-[#3e2723] border-2 border-black px-1.5 py-0.5 mt-1 relative shadow-[inset_1px_1px_0_rgba(255,255,255,0.25),inset_-1px_-1px_0_rgba(0,0,0,0.6),1px_1px_0_#000000] flex-shrink-0"
            style={{
              borderRadius: "0px",
              backgroundImage: "repeating-linear-gradient(90deg, #3e2723 0px, #4e342e 6px, #36201b 12px)",
            }}
          >
            <div
              className="text-[#000000] text-[10px] font-black text-center whitespace-normal break-words leading-tight select-text"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                textShadow: "1px 1px 0px #ffffff, -1px -1px 0px #ffffff, 1px -1px 0px #ffffff, -1px 1px 0px #ffffff, 1.5px 1.5px 0px #000000",
              }}
            >
              {p.name}
            </div>
          </div>
        </div>

        {/* BOTTOM LAYER: Stone with Diamond Ores (left), Gold Ores (right) and Diamond Block ALUNO button */}
        <div
          className="w-full py-1 px-1.5 border-t-2 border-black relative flex items-center justify-between flex-shrink-0"
          style={{
            backgroundColor: "#708090",
            backgroundImage: "radial-gradient(#475569 20%, transparent 20%), radial-gradient(#334155 20%, transparent 20%)",
            backgroundSize: "8px 8px",
            backgroundPosition: "0 0, 4px 4px",
          }}
        >
          {/* Left Diamond Ore Particles */}
          <div className="flex flex-col gap-0.5 pointer-events-none flex-shrink-0">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 bg-[#22d3ee] border border-black/40" />
              <div className="w-1 h-1 bg-[#67e8f9]" />
            </div>
            <div className="w-1.5 h-1 bg-[#06b6d4] ml-1" />
          </div>

          {/* Center Button: Shiny Cyan Diamond Block Button with Steve Skin */}
          <div
            className="flex-1 mx-1 py-1 px-1.5 bg-[#2cc5f6] border-2 border-black flex items-center justify-center gap-1 shadow-[inset_0_1.5px_0_#a5f3fc,inset_-1.5px_0_0_#0284c7,inset_0_-1.5px_0_#0369a1,inset_1.5px_0_0_#38bdf8,1px_1px_0_#000000] transition-transform active:translate-y-0.5"
            style={{ borderRadius: "0px" }}
          >
            <SteveFaceIcon size={14} />
            <span
              className="text-white text-[9px] font-black tracking-wide"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                textShadow: "1px 1px 0px #000000",
              }}
            >
              {roleLabel}
            </span>
          </div>

          {/* Right Gold Ore Particles */}
          <div className="flex flex-col gap-0.5 pointer-events-none flex-shrink-0">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 bg-[#facc15] border border-black/40" />
              <div className="w-1 h-1 bg-[#fde047]" />
            </div>
            <div className="w-1.5 h-1 bg-[#eab308] mr-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
