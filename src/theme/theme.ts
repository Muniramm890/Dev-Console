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
};
export const LIGHT_SURFACE = {
  bg: "#F7F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F1F8",
  border: "#E4E4F0",
  text: "#14151F",
  textMuted: "#676C8A",
};
export const getSavedTheme = () => localStorage.getItem("erp_theme") || "dark";

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
  localStorage.setItem("erp_theme", mode);
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
    .sidebar-link.active{background:linear-gradient(135deg,${C.primary}22,${C.primary}11);color:${C.primary};border-left:3px solid ${C.primary};}
    .sidebar-group{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${C.textMuted};padding:14px 14px 6px;font-weight:600;}
    .card{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:20px;}
    .card-sm{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:14px;}
    .kpi-card{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:20px;position:relative;overflow:hidden;transition:transform 0.2s,border-color 0.2s;}
    .kpi-card:hover{transform:translateY(-2px);border-color:${C.primary}44;}
    .btn{padding:9px 18px;border-radius:9px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:13px;transition:all 0.2s;}
    .btn-primary{background:${C.primary};color:white;}
    .btn-primary:hover{background:${C.primaryDark};}
    .btn-ghost{background:transparent;color:${C.textMuted};border:1px solid ${C.border};}
    .btn-ghost:hover{background:${C.surfaceAlt};color:${C.text};}
    .btn-danger{background:${C.red}22;color:${C.red};border:1px solid ${C.red}44;}
    .btn-success{background:${C.green}22;color:${C.green};border:1px solid ${C.green}44;}
    .input{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:9px;padding:9px 13px;color:${C.text};font-family:'DM Sans',sans-serif;font-size:13.5px;outline:none;transition:border-color 0.2s;width:100%;}
    .input:focus{border-color:${C.primary};}
    .select{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:9px;padding:9px 13px;color:${C.text};font-family:'DM Sans',sans-serif;font-size:13.5px;outline:none;cursor:pointer;width:100%;}
    .select:focus{border-color:${C.primary};}
    .table{width:100%;border-collapse:collapse;font-size:13.5px;}
    .table th{background:${C.surfaceAlt};color:${C.textMuted};padding:10px 14px;text-align:left;font-weight:600;font-size:11.5px;letter-spacing:0.5px;text-transform:uppercase;}
    .table td{padding:11px 14px;border-bottom:1px solid ${C.border}22;color:${C.text};}
    .table tr:hover td{background:${C.surfaceAlt}44;}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11.5px;font-weight:600;}
    .badge-green{background:${C.green}22;color:${C.green};}
    .badge-red{background:${C.red}22;color:${C.red};}
    .badge-yellow{background:${C.yellow}22;color:${C.yellow};}
    .badge-blue{background:${C.blue}22;color:${C.blue};}
    .badge-purple{background:${C.purple}22;color:${C.purple};}
    .tab{padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;border:none;background:transparent;color:${C.textMuted};transition:all 0.2s;}
    .tab.active{background:${C.primary}22;color:${C.primary};}
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
