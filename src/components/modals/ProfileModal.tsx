// FILE: teacher-app/src/components/modals/ProfileModal.tsx
// Source: admin App.tsx -> ProfileModal [25401-25607]
// [teacher-app] UI premium redesign (hero banner, tabs, strength meter). Logic + API calls (/auth/me GET/PUT, /auth/change-password,
// Cloudinary photo upload) admin wale ProfileModal se same hain.
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { uploadToCloudinary } from "../../api/uploads";
import { useDialog } from "../../contexts/DialogContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { C, getSavedTheme } from "../../theme/theme";
import { ROLE_META } from "../../utils/roles";

// ── tiny inline icons (feather-style) ──
const PATHS = {
  camera: ["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z", "M12 17a4 4 0 100-8 4 4 0 000 8z"],
  lock: ["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z", "M7 11V7a5 5 0 0110 0v4"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z", "M12 15a3 3 0 100-6 3 3 0 000 6z"],
  eyeOff: ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24", "M1 1l22 22"],
  mail: ["M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z", "M22 6l-10 7L2 6"],
  phone: ["M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"],
  building: ["M3 21h18", "M5 21V7l8-4v18", "M19 21V11l-6-4", "M9 9v.01M9 12v.01M9 15v.01M9 18v.01"],
  user: ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8z"],
  calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"],
  clock: ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M12 6v6l4 2"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  id: ["M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z", "M8 12a2 2 0 100-4 2 2 0 000 4z", "M5 16c.6-1.5 1.8-2 3-2s2.4.5 3 2", "M14 9h5M14 13h5"],
  check: ["M20 6L9 17l-5-5"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  key: ["M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"],
};
const Ico = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {(PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
  </svg>
);

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const initialsOf = (name = "") => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

const strengthOf = (pw) => {
  if (!pw) return { score: 0, label: "", color: C.border };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 8) return { score: 1, label: "Too short", color: C.red };
  const score = Math.min(4, Math.max(1, s - 0));
  return [
    null,
    { score: 1, label: "Weak", color: C.red },
    { score: 2, label: "Fair", color: C.yellow },
    { score: 3, label: "Good", color: C.blue },
    { score: 4, label: "Strong", color: C.green },
  ][score];
};

const EMPTY_PW = { currentPassword: "", newPassword: "", confirmPassword: "" };

// Mobile (<=768px): full-screen sheet + extra "Account" tab (theme + logout). Desktop unchanged.
export const ProfileModal = ({ open, onClose, onLogout, themeMode, onToggleTheme }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const isMobile = useIsMobile();
  const showAccountTab = isMobile && typeof onLogout === "function";

  // screen resize hone par (mobile -> desktop) Account tab hat jaye to Personal par wapas
  useEffect(() => { if (!showAccountTab && tab === "account") setTab("personal"); }, [showAccountTab]); // eslint-disable-line

  const handleLogoutClick = async () => {
    const ok = await dialogConfirm("Do you want to log out of your account?", "Logout");
    if (!ok) return;
    onClose?.();
    onLogout();
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", date_of_birth: "", gender: "", avatar_url: "",
  });
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [savingPw, setSavingPw] = useState(false);
  const [tab, setTab] = useState("personal");
  const [showPw, setShowPw] = useState({ cur: false, nw: false, cf: false });

  const toForm = (data) => ({
    full_name: data.full_name || "",
    phone: data.phone || "",
    date_of_birth: data.date_of_birth ? data.date_of_birth.split("T")[0] : "",
    gender: data.gender || "",
    avatar_url: data.avatar_url || "",
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/auth/me");
      const data = res?.data || res;
      setProfile(data);
      setForm(toForm(data));
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) { setTab("personal"); loadProfile(); }
  }, [open]); // eslint-disable-line

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToCloudinary(file);
      setF("avatar_url", url);
    } catch (err) {
      dialogAlert("Photo upload failed. Please try again.", "Error");
    } finally { setUploadingPhoto(false); }
  };

  const handleSaveProfile = async () => {
    if (!form.full_name.trim()) {
      dialogAlert("Full name is required.", "Missing Info");
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("/auth/me", "PUT", {
        fullName: form.full_name.trim(),
        phone: form.phone || null,
        dateOfBirth: form.date_of_birth || null,
        gender: form.gender || null,
        avatarUrl: form.avatar_url || null,
      });
      const data = res?.data || res;
      setProfile(data);
      setForm(toForm(data));
      await dialogAlert("Profile updated successfully!", "Success");
    } catch (e) {
      dialogAlert("Failed to update profile: " + e.message, "Error");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      dialogAlert("Please fill in both current and new password.", "Missing Info");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      dialogAlert("New password must be at least 8 characters, with letters and numbers.", "Too Short");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      dialogAlert("New passwords do not match.", "Mismatch");
      return;
    }
    setSavingPw(true);
    try {
      await apiRequest("/auth/change-password", "POST", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      await dialogAlert("Password changed successfully!", "Success");
      setPwForm(EMPTY_PW);
    } catch (e) {
      dialogAlert("Failed to change password: " + e.message, "Error");
    } finally { setSavingPw(false); }
  };

  const handleClose = () => {
    setPwForm(EMPTY_PW);
    setShowPw({ cur: false, nw: false, cf: false });
    onClose();
  };

  // ESC se band (kaam chal raha ho to nahi)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !saving && !savingPw && !uploadingPhoto) handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line

  if (!open) return null;

  const isDark = getSavedTheme() === "dark";
  const baseline = profile ? toForm(profile) : form;
  const dirty = Object.keys(form).some((k) => (form[k] || "") !== (baseline[k] || ""));
  const roleLabel = ROLE_META?.[profile?.role]?.label || (profile?.role || "").replace(/_/g, " ");
  const strength = strengthOf(pwForm.newPassword);
  const pwMatch = pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword;
  const pwMismatch = pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword;
  const checks = [
    { ok: pwForm.newPassword.length >= 8, text: "At least 8 characters with letters and numbers (required)" },
    { ok: /[a-z]/.test(pwForm.newPassword) && /[A-Z]/.test(pwForm.newPassword), text: "Upper & lower case letters" },
    { ok: /\d/.test(pwForm.newPassword), text: "At least one number" },
    { ok: /[^A-Za-z0-9]/.test(pwForm.newPassword), text: "At least one symbol (!@#$…)" },
  ];

  const css = `
    @keyframes pfIn{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes pfTab{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .pf-panel{width:100%;max-width:800px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;
      background:${C.surface};border:1px solid ${C.border};box-shadow:0 30px 80px #00000066;animation:pfIn .28s ease;}
    .pf-hero{position:relative;padding:28px 28px 22px;color:#fff;overflow:hidden;flex-shrink:0;
      background:linear-gradient(135deg,${C.primaryDark} 0%,${C.primary} 55%,${C.primary}DD 100%);}
    .pf-hero:before{content:"";position:absolute;right:-60px;top:-80px;width:260px;height:260px;border-radius:50%;background:#ffffff1c;}
    .pf-hero:after{content:"";position:absolute;left:-40px;bottom:-110px;width:220px;height:220px;border-radius:50%;background:#ffffff12;}
    .pf-hero > *{position:relative;z-index:1;}
    .pf-hero-row{padding-right:44px;}
    .pf-close{position:absolute!important;top:16px;right:16px;width:34px;height:34px;border-radius:50%;border:1px solid #ffffff44;
      background:#ffffff3d;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;
      z-index:10;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
    .pf-close:hover{background:#ffffff40;}
    .pf-avatar-wrap{position:relative;width:96px;height:96px;flex-shrink:0;}
    .pf-avatar{width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid #ffffffcc;box-shadow:0 8px 24px #00000040;
      display:flex;align-items:center;justify-content:center;background:#ffffff2e;font-size:32px;font-weight:800;letter-spacing:1px;}
    .pf-cam{position:absolute;right:-2px;bottom:-2px;width:34px;height:34px;border-radius:50%;background:#fff;color:${C.primary};
      display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px #00000050;transition:transform .15s;}
    .pf-cam:hover{transform:scale(1.1);}
    .pf-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700;
      background:#ffffff2e;border:1px solid #ffffff44;text-transform:capitalize;backdrop-filter:blur(6px);}
    .pf-stat{flex:1;min-width:130px;padding:10px 14px;border-radius:14px;background:#ffffff1f;border:1px solid #ffffff33;backdrop-filter:blur(6px);}
    .pf-stat small{display:flex;align-items:center;gap:5px;font-size:10.5px;opacity:.85;text-transform:uppercase;letter-spacing:.6px;font-weight:600;}
    .pf-stat div{font-size:13.5px;font-weight:700;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .pf-tabs{display:flex;gap:6px;padding:5px;margin:18px 28px 0;border-radius:14px;background:${C.surfaceAlt};border:1px solid ${C.border};flex-shrink:0;}
    .pf-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:10px;border:none;cursor:pointer;
      font-family:inherit;font-size:13.5px;font-weight:700;background:transparent;color:${C.textMuted};transition:all .18s;}
    .pf-tab:hover{color:${C.text};}
    .pf-tab.on{background:${C.primary};color:#fff;box-shadow:0 4px 14px ${C.primary}55;}
    .pf-body{flex:1;overflow-y:auto;padding:22px 28px 8px;animation:pfTab .22s ease;color-scheme:${isDark ? "dark" : "light"};}
    .pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 18px;}
    .pf-full{grid-column:1 / -1;}
    .pf-label{display:block;font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:${C.textMuted};margin-bottom:7px;}
    .pf-inwrap{position:relative;}
    .pf-inwrap > .pf-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:${C.textMuted};display:flex;pointer-events:none;}
    .pf-input{width:100%;box-sizing:border-box;background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:12px;padding:12px 14px 12px 40px;
      color:${C.text};font-size:14px;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;}
    .pf-input:focus{border-color:${C.primary};box-shadow:0 0 0 3px ${C.primary}26;}
    .pf-input:disabled{opacity:.62;cursor:not-allowed;}
    .pf-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:8px;border:none;background:transparent;
      color:${C.textMuted};cursor:pointer;display:flex;align-items:center;justify-content:center;}
    .pf-eye:hover{background:${C.border};color:${C.text};}
    .pf-chips{display:flex;gap:8px;flex-wrap:wrap;}
    .pf-chip{padding:10px 18px;border-radius:12px;border:1px solid ${C.border};background:${C.surfaceAlt};color:${C.textMuted};
      font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s;}
    .pf-chip:hover{border-color:${C.primary};color:${C.text};}
    .pf-chip.on{background:${C.primary}1f;border-color:${C.primary};color:${C.primary};}
    .pf-note{font-size:11.5px;color:${C.textMuted};margin-top:6px;display:flex;align-items:center;gap:5px;}
    .pf-card{padding:16px 18px;border-radius:16px;background:${C.surfaceAlt};border:1px solid ${C.border};}
    .pf-meter{display:flex;gap:5px;margin-top:10px;}
    .pf-meter span{flex:1;height:5px;border-radius:3px;background:${C.border};transition:background .25s;}
    .pf-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 28px;border-top:1px solid ${C.border};
      background:${C.surface};flex-shrink:0;}
    .pf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;border-radius:12px;border:none;cursor:pointer;
      font-family:inherit;font-size:13.5px;font-weight:700;transition:all .15s;}
    .pf-btn.primary{background:${C.primary};color:#fff;box-shadow:0 6px 18px ${C.primary}55;}
    .pf-btn.primary:hover:not(:disabled){background:${C.primaryDark};transform:translateY(-1px);}
    .pf-btn.ghost{background:transparent;color:${C.textMuted};border:1px solid ${C.border};}
    .pf-btn.ghost:hover{background:${C.surfaceAlt};color:${C.text};}
    .pf-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;}
    .pf-btn.danger{background:${C.red}1a;color:${C.red};border:1px solid ${C.red}55;}
    .pf-btn.danger:hover{background:${C.red}2e;}
    .pf-mobile{padding:0!important;align-items:stretch!important;}
    .pf-mobile .pf-panel{max-width:none;max-height:none;height:100vh;height:100dvh;border-radius:0;border:none;box-shadow:none;animation:pfTab .22s ease;}
    .pf-mobile .pf-hero{padding:14px 14px 12px;}
    .pf-mobile .pf-hero-row{flex-direction:row!important;text-align:left!important;gap:12px!important;align-items:center!important;}
    .pf-mobile .pf-hero-row .pf-meta{align-items:flex-start!important;gap:5px!important;}
    .pf-mobile .pf-avatar-wrap,.pf-mobile .pf-avatar{width:64px;height:64px;}
    .pf-mobile .pf-avatar{font-size:22px;border-width:3px;}
    .pf-mobile .pf-cam{width:28px;height:28px;}
    .pf-mobile .pf-hero .syne{font-size:18px!important;}
    .pf-mobile .pf-close{top:8px;right:8px;width:42px;height:42px;}
    .pf-mobile .pf-hero-row{padding-right:48px;}
    .pf-mobile .pf-stat,.pf-mobile .pf-pill{backdrop-filter:none;-webkit-backdrop-filter:none;}
    .pf-mobile .pf-stat{min-width:0;flex:1 1 44%;padding:8px 10px;}
    .pf-mobile .pf-tabs{margin:10px 12px 0;gap:4px;padding:4px;}
    .pf-mobile .pf-tab{padding:9px 6px;font-size:12.5px;gap:5px;}
    .pf-mobile .pf-body{padding:14px 12px 6px;}
    .pf-mobile .pf-input{font-size:16px;}
    .pf-mobile .pf-foot{padding:10px 12px calc(10px + env(safe-area-inset-bottom));}
    @media(max-width:640px){
      .pf-hero{padding:22px 18px 18px;} .pf-hero-row{flex-direction:column;align-items:center!important;text-align:center;}
      .pf-hero-row .pf-meta{align-items:center!important;}
      .pf-grid{grid-template-columns:1fr;} .pf-tabs{margin:14px 16px 0;} .pf-body{padding:18px 16px 6px;} .pf-foot{padding:12px 16px;}
    }
  `;

  const pwField = (label, key, showKey, autoComplete) => (
    <div className="pf-full">
      <label className="pf-label">{label}</label>
      <div className="pf-inwrap">
        <span className="pf-ico"><Ico name="lock" size={16} /></span>
        <input
          className="pf-input"
          style={{ paddingRight: 44 }}
          type={showPw[showKey] ? "text" : "password"}
          autoComplete={autoComplete}
          value={pwForm[key]}
          onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
        />
        <button type="button" className="pf-eye" title={showPw[showKey] ? "Hide" : "Show"}
          onClick={() => setShowPw((s) => ({ ...s, [showKey]: !s[showKey] }))}>
          <Ico name={showPw[showKey] ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className={`modal-overlay ${isMobile ? "pf-mobile" : ""}`} style={{ zIndex: 1000 }} onClick={handleClose}>
      <style>{css}</style>
      <div className="pf-panel" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ padding: 28 }}>
            <div className="pulse" style={{ height: 150, borderRadius: 18, background: C.surfaceAlt, marginBottom: 18 }} />
            <div className="pulse" style={{ height: 46, borderRadius: 14, background: C.surfaceAlt, marginBottom: 16 }} />
            <div className="pulse" style={{ height: 200, borderRadius: 14, background: C.surfaceAlt }} />
            <div style={{ textAlign: "center", color: C.primary, fontWeight: 600, marginTop: 18, fontSize: 13 }}>Loading your profile…</div>
          </div>
        ) : (
          <>
            {/* ── HERO ── */}
            <div className="pf-hero">
              <button className="pf-close" onClick={handleClose} title="Close"><Ico name="x" size={16} /></button>

              <div className="pf-hero-row" style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className="pf-avatar-wrap">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="pf-avatar" />
                  ) : (
                    <div className="pf-avatar">{initialsOf(form.full_name)}</div>
                  )}
                  <input type="file" id="profile-photo-upload" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  <label htmlFor="profile-photo-upload" className="pf-cam" title="Change photo" style={{ cursor: uploadingPhoto ? "wait" : "pointer" }}>
                    {uploadingPhoto ? <span style={{ fontSize: 10, fontWeight: 800 }}>…</span> : <Ico name="camera" size={16} />}
                  </label>
                </div>

                <div className="pf-meta" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <div className="syne" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, wordBreak: "break-word" }}>
                    {form.full_name || "Your Name"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span className="pf-pill"><Ico name="shield" size={13} /> {roleLabel || "User"}</span>
                    {profile?.school_name && <span className="pf-pill" style={{ textTransform: "none" }}><Ico name="building" size={13} /> {profile.school_name}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: 0.92 }}>
                    <Ico name="mail" size={14} /> {profile?.email || "—"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                <div className="pf-stat"><small><Ico name="id" size={12} /> Employee ID</small><div>{profile?.employee_code || "—"}</div></div>
                <div className="pf-stat"><small><Ico name="building" size={12} /> School Code</small><div>{profile?.school_code || "—"}</div></div>
                <div className="pf-stat"><small><Ico name="clock" size={12} /> Last Login</small><div>{fmtDate(profile?.last_login_at)}</div></div>
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="pf-tabs">
              <button className={`pf-tab ${tab === "personal" ? "on" : ""}`} onClick={() => setTab("personal")}>
                <Ico name="user" size={15} /> Personal Info
              </button>
              <button className={`pf-tab ${tab === "security" ? "on" : ""}`} onClick={() => setTab("security")}>
                <Ico name="shield" size={15} /> Security
              </button>
              {showAccountTab && (
                <button className={`pf-tab ${tab === "account" ? "on" : ""}`} onClick={() => setTab("account")}>
                  <Ico name="id" size={15} /> Account
                </button>
              )}
            </div>

            {/* ── BODY ── */}
            <div className="pf-body" key={tab}>
              {tab === "personal" ? (
                <div className="pf-grid">
                  <div>
                    <label className="pf-label">Full Name *</label>
                    <div className="pf-inwrap">
                      <span className="pf-ico"><Ico name="user" size={16} /></span>
                      <input className="pf-input" value={form.full_name} onChange={(e) => setF("full_name", e.target.value)} placeholder="Your full name" />
                    </div>
                  </div>
                  <div>
                    <label className="pf-label">Phone</label>
                    <div className="pf-inwrap">
                      <span className="pf-ico"><Ico name="phone" size={16} /></span>
                      <input className="pf-input" type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="10-digit mobile number" />
                    </div>
                  </div>
                  <div>
                    <label className="pf-label">Date of Birth</label>
                    <div className="pf-inwrap">
                      <span className="pf-ico"><Ico name="calendar" size={16} /></span>
                      <input className="pf-input" type="date" value={form.date_of_birth} onChange={(e) => setF("date_of_birth", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="pf-label">Gender</label>
                    <div className="pf-chips">
                      {["Male", "Female", "Other"].map((g) => (
                        <button key={g} type="button" className={`pf-chip ${form.gender === g ? "on" : ""}`}
                          onClick={() => setF("gender", form.gender === g ? "" : g)}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pf-full">
                    <label className="pf-label">Email</label>
                    <div className="pf-inwrap">
                      <span className="pf-ico"><Ico name="mail" size={16} /></span>
                      <input className="pf-input" value={profile?.email || ""} disabled />
                    </div>
                    <div className="pf-note"><Ico name="lock" size={12} /> Email cannot be changed. Contact your school admin if it needs an update.</div>
                  </div>
                </div>
              ) : tab === "account" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="pf-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div className="syne" style={{ fontSize: 15, fontWeight: 700 }}>Appearance</div>
                      <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>Switch between light and dark theme.</div>
                    </div>
                    <button className="pf-btn ghost" onClick={onToggleTheme} style={{ flexShrink: 0 }}>
                      {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
                    </button>
                  </div>
                  <div className="pf-card">
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: C.textMuted, marginBottom: 6 }}>Signed in as</div>
                    <div style={{ fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>{form.full_name || "—"}</div>
                    <div style={{ fontSize: 12.5, color: C.textMuted, wordBreak: "break-all" }}>{profile?.email || "—"}</div>
                  </div>
                  <button className="pf-btn danger" onClick={handleLogoutClick} style={{ width: "100%", padding: "14px 22px" }}>
                    Logout
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="pf-card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.primary}1f`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ico name="key" size={20} />
                    </div>
                    <div>
                      <div className="syne" style={{ fontSize: 15, fontWeight: 700 }}>Change Password</div>
                      <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>Choose a strong password and never share it with anyone.</div>
                    </div>
                  </div>

                  <div className="pf-grid">
                    {pwField("Current Password", "currentPassword", "cur", "current-password")}
                    <div>
                      <div className="pf-full">{pwField("New Password", "newPassword", "nw", "new-password")}</div>
                      <div className="pf-meter">
                        {[1, 2, 3, 4].map((i) => (
                          <span key={i} style={{ background: pwForm.newPassword && i <= strength.score ? strength.color : undefined }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, minHeight: 16, color: strength.color }}>
                        {pwForm.newPassword ? strength.label : ""}
                      </div>
                    </div>
                    <div>
                      {pwField("Confirm New Password", "confirmPassword", "cf", "new-password")}
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, minHeight: 16, color: pwMatch ? C.green : C.red }}>
                        {pwMatch ? "✓ Passwords match" : pwMismatch ? "✕ Passwords do not match" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="pf-card">
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: C.textMuted, marginBottom: 10 }}>
                      Password tips
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>
                      {checks.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: c.ok ? C.green : C.textMuted }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            background: c.ok ? `${C.green}22` : C.border, color: c.ok ? C.green : C.textMuted,
                          }}>
                            {c.ok ? <Ico name="check" size={11} /> : null}
                          </span>
                          {c.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ height: 14 }} />
            </div>

            {/* ── FOOTER ── */}
            {tab !== "account" && (
            <div className="pf-foot">
              {tab === "personal" ? (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: dirty ? C.yellow : C.textMuted, display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dirty ? C.yellow : C.green }} />
                    {dirty ? "You have unsaved changes" : "All changes saved"}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {dirty && (
                      <button className="pf-btn ghost" onClick={() => setForm(toForm(profile))} disabled={saving}>Reset</button>
                    )}
                    <button className="pf-btn primary" onClick={handleSaveProfile} disabled={saving || !dirty}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: C.textMuted }}>New password must be at least 8 characters, with letters and numbers long.</div>
                  <button className="pf-btn primary" onClick={handleChangePassword}
                    disabled={savingPw || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}>
                    {savingPw ? "Updating…" : "Update Password"}
                  </button>
                </>
              )}
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
