// @ts-nocheck
import { useEffect, useState } from "react";
import { papi } from "../api";
import { Modal } from "../ui";
import { C } from "../../theme/theme";

// global search: schools, staff, students across the platform
export const SearchModal = ({ onClose, go, onOpen }) => {
  const [q, setQ] = useState(""); const [r, setR] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setR(null); return; }
    setBusy(true); const t = setTimeout(() => papi(`/search?q=${encodeURIComponent(q.trim())}`).then(setR).catch(() => setR(null)).finally(() => setBusy(false)), 300);
    return () => clearTimeout(t);
  }, [q]);
  const Row = ({ title, sub, children }) => (<div className="dc-row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}><div style={{ minWidth: 0 }}><b>{title}</b><div style={{ fontSize: 12, color: C.textMuted }}>{sub}</div></div><div className="dc-row">{children}</div></div>);
  const Head = ({ t }) => <div className="dc-label" style={{ marginTop: 14 }}>{t}</div>;
  return (
    <Modal title="Search everything" onClose={onClose} wide>
      <input className="input" autoFocus placeholder="School, staff name / email / phone, student name / admission no" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: "60vh", overflow: "auto", marginTop: 6 }}>
        {busy && <p style={{ color: C.textMuted }}>Searching...</p>}
        {r && !r.schools.length && !r.staff.length && !r.students.length && <p style={{ color: C.textMuted }}>No matches.</p>}
        {r?.schools.length > 0 && <><Head t="Schools" />{r.schools.map((s) => <Row key={s.id} title={s.name} sub={`${s.slug} - ${s.platform_status}`}><button className="btn btn-ghost" onClick={() => { onClose(); go(`school:${s.id}`); }}>Manage</button>{!s.deleted_at && <button className="btn btn-primary" onClick={() => { onClose(); onOpen({ id: s.id, name: s.name }); }}>Open</button>}</Row>)}</>}
        {r?.staff.length > 0 && <><Head t="Staff" />{r.staff.map((u) => <Row key={u.id + u.school_id} title={`${u.full_name} (${u.role})`} sub={`${u.email} - ${u.school_name}`}><button className="btn btn-ghost" onClick={() => { onClose(); go(`school:${u.school_id}`); }}>School</button><button className="btn btn-primary" onClick={() => { onClose(); onOpen({ id: u.school_id, name: u.school_name, userId: u.id, userName: u.full_name }); }}>Open as</button></Row>)}</>}
        {r?.students.length > 0 && <><Head t="Students" />{r.students.map((s) => <Row key={s.id} title={`${s.first_name} ${s.last_name || ""}`} sub={`Adm ${s.admission_no || "-"} - ${s.school_name}`}><button className="btn btn-ghost" onClick={() => { onClose(); go(`school:${s.school_id}`); }}>School</button></Row>)}</>}
      </div>
    </Modal>
  );
};
