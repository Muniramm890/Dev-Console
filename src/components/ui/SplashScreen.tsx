// FILE: teacher-app/src/components/ui/SplashScreen.tsx
// Source: admin App.tsx -> SplashScreen
// @ts-nocheck
import { Mark } from "./BrandLogo";

export const SplashScreen = () => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 100000,
    background: "radial-gradient(circle at 50% 40%, #131A2E 0%, #0B0D14 70%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 26, overflow: "hidden",
  }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&family=Inter:wght@500&display=swap');
      @keyframes splashBreathe {
        0%   { transform: scale(0.85) rotate(-3deg); }
        50%  { transform: scale(1.06) rotate(2deg); }
        100% { transform: scale(0.85) rotate(-3deg); }
      }
      @keyframes splashGlow {
        0%   { opacity: 0.25; }
        50%  { opacity: 0.65; }
        100% { opacity: 0.25; }
      }
      @keyframes splashRing {
        0%   { transform: scale(0.75); opacity: 0.5; }
        100% { transform: scale(1.9); opacity: 0; }
      }
      @keyframes splashWordUp {
        0%   { opacity: 0; transform: translateY(16px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes splashTagIn {
        0%   { opacity: 0; letter-spacing: 0.5em; }
        100% { opacity: 1; letter-spacing: 0.15em; }
      }
      @keyframes splashDotBounce {
        0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-5px); }
      }
      .splash-logo-wrap { position: relative; width: 140px; height: 140px; display:flex; align-items:center; justify-content:center; }
      .splash-ring { position: absolute; width: 140px; height: 140px; border-radius: 38px; border: 1.5px solid #E8600A; animation: splashRing 2.6s cubic-bezier(0.2,0.7,0.3,1) infinite; }
      .splash-ring-2 { animation-delay: 0.9s; }
      .splash-glow { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(232,96,10,0.35) 0%, transparent 70%); animation: splashGlow 2.6s ease-in-out infinite; }
      .splash-mark { position: relative; z-index: 2; animation: splashBreathe 2.6s cubic-bezier(0.45,0,0.55,1) infinite; }
      .splash-word { animation: splashWordUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
      .splash-tag { animation: splashTagIn 1.2s ease 0.75s both; }
      .splash-dot { width: 6px; height: 6px; border-radius: 50%; background: #E8600A; display: inline-block; animation: splashDotBounce 1.3s ease-in-out infinite; }
    `}</style>

    <div className="splash-logo-wrap">
      <div className="splash-glow" />
      <div className="splash-ring" />
      <div className="splash-ring splash-ring-2" />
      <div className="splash-mark"><Mark size={92} /></div>
    </div>

    <div style={{ textAlign: "center" }}>
      <div
        className="splash-word"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "#F4F6FB" }}>School</span>
        <span style={{ color: "#E8600A" }}>Office</span>
      </div>
      <div
        className="splash-tag"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 12,
          color: "#8891A8",
          marginTop: 10,
          textTransform: "uppercase",
        }}
      >
        Smart ERP for Smart Schools
      </div>
    </div>

    <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
      <span className="splash-dot" style={{ animationDelay: "0s" }} />
      <span className="splash-dot" style={{ animationDelay: "0.15s" }} />
      <span className="splash-dot" style={{ animationDelay: "0.3s" }} />
    </div>
  </div>
);
