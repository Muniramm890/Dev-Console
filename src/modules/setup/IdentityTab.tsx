// @ts-nocheck
// Setup -> Identity & Branding. Every editable column of the `schools` table lives here, grouped into clear sections.
// School timings / periods are NOT edited here any more: they come from Timetable -> Daily Routine (shown read-only below).
import { useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = [["monday", "Mon"], ["tuesday", "Tue"], ["wednesday", "Wed"], ["thursday", "Thu"], ["friday", "Fri"], ["saturday", "Sat"], ["sunday", "Sun"]];
const ZONES = ["Asia/Kolkata", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Colombo", "Asia/Dubai", "Asia/Singapore", "UTC"];
const BOARDS = [["CBSE", "CBSE"], ["ICSE", "ICSE"], ["STATE", "State Board"], ["IB", "IB / Cambridge"]];

const parseDays = (v) => { try { const a = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(a) ? a : []; } catch { return []; } };
const hhmm = (t) => String(t || "").slice(0, 5);
const onColor = (hex) => {
  const n = parseInt(String(hex || "").replace("#", ""), 16);
  if (!Number.isFinite(n)) return "#ffffff";
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? "#0f172a" : "#ffffff";
};

const Section = ({ icon, title, hint, children, color }) => (
  <div className="card">
    <div style={{ marginBottom: 14 }}>
      <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, color: color || C.primary, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
        <Icon name={icon} size={16} /> {title}
      </h3>
      {hint && <p style={{ fontSize: 11.5, color: C.textMuted, margin: "4px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
    {children}
  </div>
);

// Image upload (logo / watermark / principal signature). Upload is saved on the server straight away; "Remove" applies on Save.
const AssetField = ({ label, help, type, url, onUrl }) => {
  const [busy, setBusy] = useState(false);
  const id = `school-asset-${type}`;
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await apiRequest("/setup/school/upload-asset", "POST", fd, true);
      onUrl(res.data.url);
    } catch (err) { alert("Upload failed: " + err.message); }
    finally { setBusy(false); }
  };
  return (
    <FormRow label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {url ? (
          <img src={url} alt={label} style={{ width: 64, height: 44, borderRadius: 8, objectFit: "contain", background: "#ffffff", border: `1px solid ${C.border}` }} />
        ) : (
          <div style={{ width: 64, height: 44, borderRadius: 8, border: `1px dashed ${C.border}`, color: C.textMuted, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>No file</div>
        )}
        <input type="file" id={id} accept="image/*" style={{ display: "none" }} onChange={pick} />
        <label htmlFor={id} className="btn btn-ghost" style={{ cursor: busy ? "wait" : "pointer", fontSize: 12, opacity: busy ? 0.6 : 1 }}>
          <Icon name="plus" size={12} /> {busy ? "Uploading…" : url ? "Replace" : "Upload"}
        </label>
        {url && (
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, color: C.red }} onClick={() => onUrl("")}>
            <Icon name="trash" size={12} /> Remove
          </button>
        )}
      </div>
      {help && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>{help}</div>}
    </FormRow>
  );
};

export const IdentityTab = ({ schoolData: d, setSchoolData, saving, onSave }) => {
  const set = (k) => (e) => setSchoolData((p) => ({ ...p, [k]: e.target.value }));
  const setV = (k, v) => setSchoolData((p) => ({ ...p, [k]: v }));
  const days = parseDays(d.working_days);
  const toggleDay = (day) => {
    const next = days.includes(day) ? days.filter((x) => x !== day) : [...days, day];
    setV("working_days", JSON.stringify(WEEKDAYS.map((w) => w[0]).filter((x) => next.includes(x))));
  };
  const startMonth = Number(d.academic_year_start) || 4;
  const setStartMonth = (m) => setSchoolData((p) => ({ ...p, academic_year_start: m, academic_year_end: m === 1 ? 12 : m - 1 }));
  const color = /^#[0-9a-fA-F]{6}$/.test(d.brand_color || "") ? d.brand_color : "#E8600A";
  const zones = ZONES.includes(d.timezone) || !d.timezone ? ZONES : [d.timezone, ...ZONES];
  const hasPlan = d.plan_name || d.valid_until || d.max_students || d.max_staff || d.platform_status;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 20, marginBottom: 20, alignItems: "start" }}>
        {/* 1 ─ Identity */}
        <Section icon="setup" title="School Identity" hint="Name and basic details printed on every document.">
          <FormRow label="School / Institution Name">
            <input className="input" value={d.name || ""} onChange={set("name")} />
          </FormRow>
          <FormRow label="Tagline / Motto">
            <input className="input" value={d.tagline || ""} onChange={set("tagline")} placeholder="Illuminating Futures..." />
          </FormRow>
          <FormGrid cols={2}>
            <FormRow label="Established Year">
              <input className="input" type="number" value={d.established_year || ""} onChange={set("established_year")} placeholder="e.g. 1998" />
            </FormRow>
            <FormRow label="School Code (read-only)">
              <input className="input" value={d.slug || ""} disabled />
            </FormRow>
          </FormGrid>
        </Section>

        {/* 2 ─ Branding */}
        <Section icon="file" title="Branding" hint="Logo, watermark and colour used in the app and in every generated PDF (receipts, report cards, registers).">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: color, color: onColor(color), marginBottom: 14 }}>
            {d.logo_url && <img src={d.logo_url} alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6, background: "#ffffff" }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(d.name || "Your School").toUpperCase()}</div>
              {d.tagline && <div style={{ fontSize: 11, opacity: 0.85 }}>{d.tagline}</div>}
            </div>
          </div>
          <FormGrid cols={2}>
            <AssetField label="School Logo" type="logo" url={d.logo_url} onUrl={(u) => setV("logo_url", u)} />
            <AssetField label="Watermark" type="watermark" url={d.watermark_url} onUrl={(u) => setV("watermark_url", u)} help="Faint background on documents. Logo is used if empty." />
          </FormGrid>
          <FormRow label="Brand Colour">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={color} onChange={set("brand_color")} style={{ width: 45, height: 38, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer" }} />
              <input className="input" value={d.brand_color || ""} onChange={set("brand_color")} placeholder="#E8600A" style={{ flex: 1 }} />
            </div>
          </FormRow>
        </Section>

        {/* 3 ─ Leadership */}
        <Section icon="user" title="Principal & Signature" hint="Printed on admit cards, report cards, certificates and registers.">
          <FormRow label="Principal / Head Name">
            <input className="input" value={d.principal_name || ""} onChange={set("principal_name")} />
          </FormRow>
          <AssetField label="Principal Signature" type="signature" url={d.principal_signature_url} onUrl={(u) => setV("principal_signature_url", u)}
            help="Transparent PNG works best (about 300 × 100 px). It is placed above every 'Principal' line." />
        </Section>

        {/* 4 ─ Affiliation */}
        <Section icon="file" title="Affiliation & Registration" hint="Government / board details shown in document headers.">
          <FormGrid cols={2}>
            <FormRow label="Affiliation Board">
              <select className="select" value={d.affiliation_board || ""} onChange={set("affiliation_board")}>
                <option value="">-- Select --</option>
                {BOARDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                {d.affiliation_board && !BOARDS.some(([v]) => v === d.affiliation_board) && <option value={d.affiliation_board}>{d.affiliation_board}</option>}
              </select>
            </FormRow>
            <FormRow label="Affiliation / Reg No.">
              <input className="input" value={d.affiliation_no || ""} onChange={set("affiliation_no")} />
            </FormRow>
          </FormGrid>
          <FormRow label="UDISE Code (Govt)">
            <input className="input" value={d.udise_code || ""} onChange={set("udise_code")} />
          </FormRow>
        </Section>

        {/* 5 ─ Address */}
        <Section icon="setup" title="Campus Address" hint="Printed under the school name on documents.">
          <FormRow label="Address Line 1">
            <input className="input" value={d.address_line1 || ""} onChange={set("address_line1")} />
          </FormRow>
          <FormRow label="Address Line 2 (Optional)">
            <input className="input" value={d.address_line2 || ""} onChange={set("address_line2")} />
          </FormRow>
          <FormGrid cols={2}>
            <FormRow label="City"><input className="input" value={d.city || ""} onChange={set("city")} /></FormRow>
            <FormRow label="State"><input className="input" value={d.state || ""} onChange={set("state")} /></FormRow>
          </FormGrid>
          <FormGrid cols={2}>
            <FormRow label="Pincode (6 digits)"><input className="input" inputMode="numeric" maxLength={6} value={d.pincode || ""} onChange={set("pincode")} /></FormRow>
            <FormRow label="Country"><input className="input" value={d.country || ""} onChange={set("country")} /></FormRow>
          </FormGrid>
        </Section>

        {/* 6 ─ Contact */}
        <Section icon="user" title="Contact & Reachability" hint="Shown in the document footer.">
          <FormRow label="Official Phone"><input className="input" value={d.phone || ""} onChange={set("phone")} /></FormRow>
          <FormRow label="Official Email"><input className="input" type="email" value={d.email || ""} onChange={set("email")} /></FormRow>
          <FormRow label="Website"><input className="input" value={d.website || ""} onChange={set("website")} placeholder="www.school.com" /></FormRow>
        </Section>

        {/* 7 ─ Calendar */}
        <Section icon="timetable" title="Calendar & Working Days" hint="Regional settings of the school.">
          <FormGrid cols={2}>
            <FormRow label="Academic Year Starts In">
              <select className="select" value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{MONTHS[startMonth - 1]} → {MONTHS[(startMonth + 10) % 12]}</div>
            </FormRow>
            <FormRow label="Time Zone">
              <select className="select" value={d.timezone || "Asia/Kolkata"} onChange={set("timezone")}>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </FormRow>
          </FormGrid>
          <FormRow label="Working Days">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {WEEKDAYS.map(([v, l]) => {
                const on = days.includes(v);
                return (
                  <button key={v} type="button" onClick={() => toggleDay(v)}
                    style={{ padding: "7px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? C.primary : C.border}`, background: on ? `${C.primary}22` : "transparent", color: on ? C.primaryText : C.textMuted }}>
                    {l}
                  </button>
                );
              })}
            </div>
          </FormRow>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
            <b style={{ color: C.text }}>School day:</b>{" "}
            {d.school_start_time ? `${hhmm(d.school_start_time)} – ${hhmm(d.school_end_time)} · ${d.periods_per_day} periods · ${d.period_duration_min} min each` : "not set"}
            <br />Set automatically from <b>Timetable → Daily Routine</b>.
          </div>
        </Section>

        {/* 8 ─ Plan (read-only) */}
        {hasPlan && (
          <Section icon="check" title="Plan & Limits" hint="Managed by the platform. Contact support to change." color={C.textMuted}>
            <FormGrid cols={2}>
              <FormRow label="Plan"><input className="input" value={d.plan_name || "—"} disabled /></FormRow>
              <FormRow label="Status"><input className="input" value={d.platform_status || "—"} disabled /></FormRow>
              <FormRow label="Valid Until"><input className="input" value={d.valid_until ? String(d.valid_until).slice(0, 10) : "—"} disabled /></FormRow>
              <FormRow label="Max Students / Staff"><input className="input" value={`${d.max_students ?? "∞"} / ${d.max_staff ?? "∞"}`} disabled /></FormRow>
            </FormGrid>
          </Section>
        )}
      </div>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 24px" }}>
        <div style={{ fontSize: 13, color: C.textMuted }}>Review all details carefully before saving.</div>
        <button className="btn btn-primary" style={{ minWidth: 200, opacity: saving ? 0.7 : 1 }} onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Identity Changes"}
        </button>
      </div>
    </div>
  );
};
