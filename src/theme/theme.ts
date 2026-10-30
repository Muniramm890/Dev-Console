// FILE: teacher-app/src/theme/theme.ts
// Source: admin App.tsx -> SCHOOL_CONFIG, DARK/LIGHT_SURFACE, C, applyTheme, injectStyles (global CSS)
// @ts-nocheck

export const SCHOOL_CONFIG = {
  // [teacher-app] fake school details hataye (API /setup/school se real data aata hai)
  name: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  logo: "🌅",
  color: "#E8600A",
  colorLight: "#FFF3EC",
  colorDark: "#B84800",
};

export const DARK_SURFACE = {
  bg: "#0F1117",
  surface: "#1A1D27",
  surfaceAlt: "#21253A",
  border: "#2D3250",
  text: "#E8EAF6",
  textMuted: "#8B92B8",
  primaryText: SCHOOL_CONFIG.color,
  greenText: "#22C55E",
  redText: "#EF4444",
  yellowText: "#F59E0B",
  blueText: "#3B82F6",
  purpleText: "#A855F7",
  shadow: "none",
};
export const LIGHT_SURFACE = {
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F1EC",
  border: "#E7E2DA",
  text: "#1C1917",
  textMuted: "#6B645C",
  primaryText: SCHOOL_CONFIG.colorDark,
  greenText: "#15803D",
  redText: "#B91C1C",
  yellowText: "#A16207",
  blueText: "#1D4ED8",
  purpleText: "#7E22CE",
  shadow: "0 1px 2px rgba(28,25,23,.06), 0 1px 3px rgba(28,25,23,.04)",
};
export const getSavedTheme = () => { try { return localStorage.getItem("erp_theme") || "dark"; } catch (_) { return "dark"; } };

// C ko "let" rakha hai aur mutate karte hain — kabhi reassign nahi karte,
// kyunki poori file me C.xxx bare reference se padha jaata hai. Isliye
// in-place mutation + ek re-render se sabhi jagah naya theme aa jaata hai.
export let C = {
  primary: SCHOOL_CONFIG.color,
  primaryLight: SCHOOL_CONFIG.colorLight,
  primaryDark: SCHOOL_CONFIG.colorDark,
  ...(getSavedTheme() === "light" ? LIGHT_SURFACE : DARK_SURFACE),
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#F59E0B",
  blue: "#3B82F6",
  purple: "#A855F7",
  cyan: "#06B6D4",
};

export const applyTheme = (mode) => {
  Object.assign(C, mode === "light" ? LIGHT_SURFACE : DARK_SURFACE);
  try { localStorage.setItem("erp_theme", mode); } catch (_) { /* ignore */ }
  document.documentElement.style.background = C.bg;
  injectStyles(); // stylesheet ko naye C values ke sath dobara likhta hai
};

let _styleTag = null;
export const injectStyles = () => {
  if (!_styleTag) {
    _styleTag = document.createElement("style");
    document.head.appendChild(_styleTag);
  }

  _styleTag.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};overflow-x:hidden;}
    ::-webkit-scrollbar{width:5px;height:5px;}
    ::-webkit-scrollbar-track{background:${C.surface};}
    ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
    ::-webkit-scrollbar-thumb:hover{background:${C.primary};}
    .syne{font-family:'Syne',sans-serif;}
    .sidebar-link{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all 0.2s;color:${C.textMuted};font-size:13.5px;font-weight:500;text-decoration:none;border:none;background:transparent;width:100%;text-align:left;}
    .sidebar-link:hover{background:${C.surfaceAlt};color:${C.text};}
    .sidebar-link.active{background:linear-gradient(135deg,${C.primary}22,${C.primary}11);color:${C.primaryText};border-left:3px solid ${C.primary};}
    .sidebar-group{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${C.textMuted};padding:14px 14px 6px;font-weight:600;}
    .card{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:20px;box-shadow:${C.shadow};}
    .card-sm{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:14px;box-shadow:${C.shadow};}
    .kpi-card{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:20px;position:relative;overflow:hidden;transition:transform 0.2s,border-color 0.2s;box-shadow:${C.shadow};}
    .kpi-card:hover{transform:translateY(-2px);border-color:${C.primary}44;}
    .btn{padding:9px 18px;border-radius:9px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:13px;transition:all 0.2s;}
    .btn-primary{background:${C.primary};color:white;}
    .btn-primary:hover{background:${C.primaryDark};}
    .btn-ghost{background:transparent;color:${C.textMuted};border:1px solid ${C.border};}
    .btn-ghost:hover{background:${C.surfaceAlt};color:${C.text};}
    .btn-danger{background:${C.red}22;color:${C.redText};border:1px solid ${C.red}44;}
    .btn-success{background:${C.green}22;color:${C.greenText};border:1px solid ${C.green}44;}
    .input{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:9px;padding:9px 13px;color:${C.text};font-family:'DM Sans',sans-serif;font-size:13.5px;outline:none;transition:border-color 0.2s;width:100%;}
    .input:focus{border-color:${C.primary};}
    .select{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:9px;padding:9px 13px;color:${C.text};font-family:'DM Sans',sans-serif;font-size:13.5px;outline:none;cursor:pointer;width:100%;}
    .select:focus{border-color:${C.primary};}
    .table{width:100%;border-collapse:collapse;font-size:13.5px;}
    .table th{background:${C.surfaceAlt};color:${C.textMuted};padding:10px 14px;text-align:left;font-weight:600;font-size:11.5px;letter-spacing:0.5px;text-transform:uppercase;}
    .table td{padding:11px 14px;border-bottom:1px solid ${C.border}22;color:${C.text};}
    .table tr:hover td{background:${C.surfaceAlt}44;}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11.5px;font-weight:600;}
    .badge-green{background:${C.green}22;color:${C.greenText};}
    .badge-red{background:${C.red}22;color:${C.redText};}
    .badge-yellow{background:${C.yellow}22;color:${C.yellowText};}
    .badge-blue{background:${C.blue}22;color:${C.blueText};}
    .badge-purple{background:${C.purple}22;color:${C.purpleText};}
    .tab{padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;border:none;background:transparent;color:${C.textMuted};transition:all 0.2s;}
    .tab.active{background:${C.primary}22;color:${C.primaryText};}
    .tab:hover{color:${C.text};}
    .modal-overlay{position:fixed;inset:0;background:#00000088;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
    .modal{background:${C.surface};border:1px solid ${C.border};border-radius:20px;padding:28px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;}
    .progress-bar{height:6px;background:${C.border};border-radius:3px;overflow:hidden;}
    .progress-fill{height:100%;border-radius:3px;transition:width 0.5s;}
    /* ── Topbar: title shrinks (ellipsis) so right-side icons NEVER get pushed off-screen ── */
    .topbar{background:${C.surface};border-bottom:1px solid ${C.border};padding:12px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;min-width:0;}
    .topbar-title{flex:1 1 0;min-width:0;}
    .topbar-title > div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .topbar-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
    .topbar-session{width:150px;}
    @media(max-width:768px){
      .topbar{padding:8px 12px;gap:8px;}
      .topbar-right{gap:6px;}
      .topbar-session{width:92px;font-size:12px!important;padding:7px 6px!important;}
      .topbar-desktop-only{display:none!important;}
    }
    /* [teacher-app] Global "auto-fit" row for two-up panels (charts, cards). Unlike .grid-2 it looks at the space that is
       actually available (the desktop sidebar takes ~230px), not just the screen width: two columns only when each can be
       >= 360px wide, otherwise it stacks. Use: <div className="grid-auto-2"> ... </div>  (children shrink safely, min-width:0) */
    .grid-auto-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:16px;}
    .grid-auto-2>*{min-width:0;}
    @media(max-width:768px){
      .sidebar-desktop{display:none!important;}
      .main-content{margin-left:0!important;}
      .grid-4{grid-template-columns:1fr 1fr!important;}
      .grid-3{grid-template-columns:1fr!important;}
      .grid-2{grid-template-columns:1fr!important;}
      .hide-mobile{display:none!important;}
    }
    @media(min-width:769px){
      .mobile-menu-btn{display:none!important;}
      .mobile-sidebar{display:none!important;}
    }
    /* [global-responsive] Reusable mobile-safe layout helpers */
    .scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;}
    .table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;}
    .table-scroll>table{min-width:520px;}
    .table-scroll-y{max-height:320px;overflow:auto;-webkit-overflow-scrolling:touch;max-width:100%;}
    .grid-auto-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:16px;}
    .grid-auto-stat{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,96px),1fr));gap:8px;}
    .grid-auto-thumb{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr));gap:16px;}
    .grid-auto-kpi>*,.grid-auto-stat>*,.grid-auto-thumb>*{min-width:0;}
    .split-pane{flex:1;display:flex;overflow:hidden;min-height:0;}
    .split-pane-side{width:350px;flex-shrink:0;}
    .routine-row{display:grid;grid-template-columns:40px 160px 1fr 130px 130px 40px;gap:8px;align-items:center;}
    @media(max-width:768px){
      .split-pane{flex-direction:column;overflow-y:auto;}
      .split-pane>*{overflow:visible!important;flex:none!important;}
      .split-pane-side{width:100%!important;border-right:none!important;border-bottom:1px solid rgba(128,128,128,0.25);}
      .split-pane-main{padding:16px!important;}
      .routine-row{grid-template-columns:28px 1fr 1fr 36px;}
      .routine-row>:nth-child(1){grid-column:1;grid-row:1;}
      .routine-row>:nth-child(2){grid-column:2/4;grid-row:1;}
      .routine-row>:nth-child(6){grid-column:4;grid-row:1;}
      .routine-row>:nth-child(3){grid-column:1/-1;}
      .routine-row>:nth-child(4){grid-column:1/3;}
      .routine-row>:nth-child(5){grid-column:3/-1;}
    }
    .pulse{animation:pulse 2s infinite;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    .slide-in{animation:slideIn 0.3s ease;}
    @keyframes slideIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    .attendance-dot{width:8px;height:8px;border-radius:50%;display:inline-block;}
    .form-grid-responsive{}
    @media(max-width:640px){
      .form-grid-responsive{grid-template-columns:1fr!important;}
      .grid-4,.grid-3{grid-template-columns:1fr!important;}
    }
    .logo-loader-spin{display:inline-block;border-radius:14px;overflow:hidden;animation:logoSpinZoom 1.4s ease-in-out infinite;}
    @keyframes logoSpinZoom{0%{transform:scale(0.82) rotate(0deg);opacity:0.75;}50%{transform:scale(1.08) rotate(180deg);opacity:1;}100%{transform:scale(0.82) rotate(360deg);opacity:0.75;}}
  `;
};


// ── appended from admin App.tsx (lines 358-367, 497-497) ──
export const CHART_COLORS = [
  C.primary,
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#F59E0B",
  "#06B6D4",
  "#EF4444",
  "#EC4899",
];

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap');`;
