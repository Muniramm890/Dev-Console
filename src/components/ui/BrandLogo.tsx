// FILE: teacher-app/src/components/ui/BrandLogo.tsx
// Source: admin App.tsx -> BrandLogo, Mark, Wordmark, Lockup
// @ts-nocheck

export const BrandLogo = ({ size = 72 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block" }}
  >
    <defs>
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E2E52" />
        <stop offset="100%" stopColor="#0F1A33" />
      </linearGradient>
      <linearGradient id="ribbonGrad" x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#FFB25B" />
        <stop offset="100%" stopColor="#E8600A" />
      </linearGradient>
      <filter id="softLift" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F1A33" floodOpacity="0.28" />
      </filter>
    </defs>

    <rect x="4" y="4" width="192" height="192" rx="46" fill="url(#badgeGrad)" />
    <rect x="4.5" y="4.5" width="191" height="191" rx="45.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

    {/* recentered group: shape's own bbox center moved onto (100,100) */}
    <g transform="translate(-7, 8)">
      <path
        d="M62,66 C100,44 152,52 146,82 C141,108 96,96 88,116 C81,134 116,140 150,132"
        fill="none"
        stroke="url(#ribbonGrad)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#softLift)"
      />
      <circle cx="150" cy="132" r="13" fill="#FFD98A" />
      <circle cx="150" cy="132" r="13" fill="none" stroke="#0F1A33" strokeWidth="2" opacity="0.15" />
    </g>
  </svg>
);

/**
 * Icon mark: a single flowing ribbon forming an "S" — reads as motion/growth
 * (student progress, ERP workflow) rather than a generic ring/orbit.
 * A single accent dot at the stroke's terminal acts as the one "smart" cue —
 * one bold move, everything else kept quiet and disciplined.
 */
export const Mark = ({ size = 96 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <defs>
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E2E52" />
        <stop offset="100%" stopColor="#0F1A33" />
      </linearGradient>
      <linearGradient id="ribbonGrad" x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#FFB25B" />
        <stop offset="100%" stopColor="#E8600A" />
      </linearGradient>
      <filter id="softLift" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F1A33" floodOpacity="0.28" />
      </filter>
    </defs>

    {/* Badge */}
    <rect x="4" y="4" width="192" height="192" rx="46" fill="url(#badgeGrad)" />
    <rect x="4.5" y="4.5" width="191" height="191" rx="45.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

    {/* Flowing S ribbon */}
    <path
      d="M62,66 C100,44 152,52 146,82 C141,108 96,96 88,116 C81,134 116,140 150,132"
      fill="none"
      stroke="url(#ribbonGrad)"
      strokeWidth="20"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#softLift)"
    />

    {/* Smart node — single accent, the terminal of the ribbon */}
    <circle cx="150" cy="132" r="13" fill="#FFD98A" />
    <circle cx="150" cy="132" r="13" fill="none" stroke="#0F1A33" strokeWidth="2" opacity="0.15" />
  </svg>
);

export const Wordmark = ({ tagline = true, dark = false }) => (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
    <div
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: 30,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: dark ? "#F4F6FB" : "#14213D" }}>School</span>
      <span style={{ color: "#E8600A" }}>Office</span>
    </div>
    {tagline && (
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 12.5,
          letterSpacing: "0.02em",
          color: dark ? "#9BA6C4" : "#6B7595",
          marginTop: 6,
        }}
      >
        smart ERP for Smart Schools
      </div>
    )}
  </div>
);

export const Lockup = ({ dark = false }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "28px 34px",
      borderRadius: 20,
      background: dark ? "#0B1224" : "#FFFFFF",
      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ECEEF3",
    }}
  >
    <Mark size={64} />
    <Wordmark dark={dark} />
  </div>
);
