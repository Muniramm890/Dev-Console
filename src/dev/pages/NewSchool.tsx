// @ts-nocheck
// New school: SAME data as the public registration page (school name, affiliation no., address, city, state,
// admin name, email, phone, password). School code is generated the same way. The school admin does the rest
// of the setup (classes, fees, staff ...) from the Admin app.
import { useState } from "react";
import { papi, explain, toast } from "../api";
import { Field, Modal, CopyBox } from "../ui";

// same format as registration: SUN-260603-458
const schoolCode = (name) => {
  const ini = String(name).replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "SCH";
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `${ini}-${d}-${Math.floor(100 + Math.random() * 900)}`;
};

export const NewSchool = ({ go }) => {
  const [f, setF] = useState({ name: "", affiliation_no: "", address_line1: "", city: "", state: "", admin_name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const create = () => papi("/schools", "POST", {
    name: f.name.trim(), slug: schoolCode(f.name), affiliation_no: f.affiliation_no.trim() || undefined,
    address_line1: f.address_line1.trim(), city: f.city.trim(), state: f.state.trim(), email: f.email.trim(), phone: f.phone.trim(),
    admin: { full_name: f.admin_name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password || undefined },
  });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      let r;
      try { r = await create(); } catch (x) { if (/slug/i.test(explain(x))) r = await create(); else throw x; } // rare code clash: new random code
      setDone(r); toast("School created");
    } catch (x) { toast(explain(x), "err"); } finally { setBusy(false); }
  };
  const Inp = ({ k, label, type = "text", req, ph }) => <Field label={label}><input className="input" type={type} required={req} placeholder={ph} value={f[k]} onChange={set(k)} /></Field>;
  return (
    <form onSubmit={submit}>
      <button type="button" className="btn btn-ghost" onClick={() => go("schools")} style={{ marginBottom: 10 }}>&larr; All schools</button>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="syne" style={{ fontWeight: 800 }}>School</h3>
        <div className="dc-grid" style={{ marginBottom: 0 }}>
          <Inp k="name" label="School name" req /><Inp k="affiliation_no" label="Affiliation no. (optional)" />
          <Inp k="address_line1" label="Address" req /><Inp k="city" label="City" req /><Inp k="state" label="State" req />
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="syne" style={{ fontWeight: 800 }}>School admin</h3>
        <div className="dc-grid" style={{ marginBottom: 0 }}>
          <Inp k="admin_name" label="Admin name" req /><Inp k="email" label="Email (login)" type="email" req />
          <Inp k="phone" label="Phone" req /><Inp k="password" label="Password (blank = auto-generate)" />
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>Same details as the registration page. The admin completes the school setup after logging in.</p>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Creating..." : "Create school"}</button>
      {done && (
        <Modal title="School created" onClose={() => go(`school:${done.school_id}`)}>
          <p style={{ fontSize: 12 }}>Shown only once. Share the login with the school admin.</p>
          <span className="dc-label">Admin email</span><CopyBox text={done.admin_email} />
          <span className="dc-label">Temporary password</span><CopyBox text={done.temporary_password} />
        </Modal>)}
    </form>
  );
};
