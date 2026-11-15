/**
 * Subtle decorative SVG motifs for Tema O Mentalista.
 * Pointer-events-none background accents inspired by investigative dossier cards,
 * keeping all EduTask block cards and text crisp and readable.
 */
export default function MentalistMotifs({ variant = "dashboard" }) {
  return (
    <div
      className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      data-testid={`mentalist-motifs-${variant}`}
    >
      {/* Subtle Fingerprint (Left Edge) */}
      <svg
        viewBox="0 0 120 140"
        className={`absolute ${
          variant === "login"
            ? "top-20 -left-5 w-28 h-32 sm:w-36 sm:h-40 opacity-[0.18]"
            : "top-24 -left-6 w-28 h-36 sm:w-40 sm:h-48 opacity-[0.13]"
        } text-[#4a1814]`}
        fill="none"
      >
        <path
          d="M60 18c-22 0-38 16-38 40 0 16 4 30 9 43M60 28c-16 0-28 12-28 30 0 15 4 28 10 40M60 38c-10 0-18 8-18 20 0 14 5 26 11 36M60 48c-5 0-9 4-9 10 0 12 6 24 12 32M60 18c22 0 38 16 38 40 0 12-2 23-6 33M60 28c16 0 28 12 28 30 0 12-3 22-7 31M60 38c10 0 18 8 18 20 0 10-3 19-7 27M60 48c5 0 9 4 9 10 0 8-2 15-5 21M60 58c0 10 5 18 11 26"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>

      {/* Red John Crimson Smiley Motif (Top Right) */}
      <svg
        viewBox="0 0 120 120"
        className={`absolute ${
          variant === "login"
            ? "top-20 right-3 sm:right-8 w-20 h-20 sm:w-28 sm:h-28 opacity-[0.26]"
            : "top-20 right-3 sm:right-10 w-20 h-20 sm:w-24 sm:h-24 opacity-[0.18]"
        } text-[#8f1616]`}
        fill="none"
      >
        <path
          d="M22 52c3-24 22-36 42-34 22 2 37 18 35 42-2 23-20 39-44 37-19-2-35-18-33-45z"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="46" cy="48" r="4.2" fill="currentColor" />
        <path d="M46 52v11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="72" cy="47" r="4.2" fill="currentColor" />
        <path d="M72 51v13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M39 67c10 13 30 13 41-2"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path d="M27 72v18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>

      {/* Ace of Spades Corner Card Accent (Bottom Right) */}
      <svg
        viewBox="0 0 120 150"
        className="hidden sm:block absolute bottom-4 right-4 w-24 h-32 md:w-28 md:h-36 opacity-[0.22] rotate-[10deg]"
        fill="none"
      >
        <rect
          x="6"
          y="6"
          width="108"
          height="138"
          rx="10"
          fill="#fbf4e2"
          stroke="#2b0909"
          strokeWidth="3"
        />
        <text x="16" y="28" fill="#5b0e14" fontSize="18" fontWeight="900" fontFamily="serif">
          A
        </text>
        <path
          d="M60 44c-11 16-24 26-24 38 0 9 7 15 15 15 4 0 7-2 9-5 2 3 5 5 9 5 8 0 15-6 15-15 0-12-13-22-24-38zm-4 50l-6 14h20l-6-14h-8z"
          fill="#2b0909"
        />
      </svg>

      {/* Subtle Investigative Crosshair / Case Line (Bottom Left on Desktop) */}
      <svg
        viewBox="0 0 120 120"
        className="hidden lg:block absolute bottom-6 left-6 w-20 h-20 opacity-[0.14] text-[#5b0e14]"
        fill="none"
      >
        <path d="M12 60h96M60 12v96" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="60" cy="60" r="26" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}
