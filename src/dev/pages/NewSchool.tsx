// @ts-nocheck
import { useState } from "react";
import { papi, explain, toast } from "../api";
import { Field, Modal, CopyBox } from "../ui";

export const NewSchool = ({ go }) => {
  const [f, setF] = useState({ name: "", slug: "", address_line1: "", city: "", state: "", phone: "", email: "", plan: "", admin_name: "", admin_email: "", admin_phone: "", admin_password: "" });
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value, ...(k === "name" && !p._slugEdited ? { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) } : {}) }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await papi("/schools", "POST", { name: f.name, slug: f.slug, address_line1: f.address_line1, city: f.city, state: f.state, phone: f.phone, email: f.email, plan: f.plan,
        admin: { full_name: f.admin_name, email: f.admin_email, phone: f.admin_phone, password: f.admin_password || undefined } });
      setDone(r); toast("School created");
    } catch (x) { toast(explain(x), "err"); } finally { setBusy(false); }
  };
  const Inp = ({ k, label, type = "text", req }) => <Field label={label}><input className="input" type={type} required={req} value={f[k]} onChange={set(k)} /></Field>;
  return (
    <form onSubmit={submit}>
      <button type="button" className="btn btn-ghost" onClick={() => go("schools")} style={{ marginBottom: 10 }}>&larr; All schools</button>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="syne" style={{ fontWeight: 800 }}>New school</h3>
        <div className="dc-grid" style={{ marginBottom: 0 }}>
          <Inp k="name" label="School name" req /><Inp k="slug" label="Slug (a-z, 0-9, -)" req /><Inp k="address_line1" label="Address" req />
          <Inp k="city" label="City" req /><Inp k="state" label="State" req /><Inp k="phone" label="Phone" /><Inp k="email" label="School email" type="email" /><Inp k="plan" label="Plan" />
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="syne" style={{ fontWeight: 800 }}>First admin</h3>
        <div className="dc-grid" style={{ marginBottom: 0 }}>
          <Inp k="admin_name" label="Full name" req /><Inp k="admin_email" label="Email (login)" type="email" req /><Inp k="admin_phone" label="Phone" /><Inp k="admin_password" label="Password (blank = auto)" />
        </div>
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
