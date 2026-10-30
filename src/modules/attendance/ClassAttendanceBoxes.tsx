// @ts-nocheck
// Class-wise attendance boxes (one per marked class) for the selected date, with a
// class detail popup (Present / Absent / Leave / On Duty lists), parent WhatsApp absent
// alert, and a bell to remind teachers of classes whose attendance is still pending.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";
import { useDialog } from "../../contexts/DialogContext";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { PillTabs } from "../../components/ui/PillTabs";
import { C } from "../../theme/theme";
import { STATUS_KEYS, STATUS_META } from "../../utils/status";

// grade names may already start with "Class" (e.g. "Class 6")
const cls = (l) => (/^class\b/i.test(String(l || "")) ? String(l) : `Class ${l}`);
const fmtDay = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const Chip = ({ s, n }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 10,
      background: `${STATUS_META[s].color}1f`, color: STATUS_META[s].color, fontSize: 11.5, fontWeight: 700,
    }}
  >
    {s} {n}
  </span>
);

// ───────────────────────── class detail popup ─────────────────────────
const ClassDetailModal = ({ sec, date, onClose, onAlerted }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("A");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await apiRequest(`/attendance/students/roster?section_id=${sec.section_id}&date=${date}&alerts=1`);
        if (off) return;
        const list = (res?.data?.students || []).map((s) => ({
          ...s, name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" "),
        }));
        setStudents(list);
        setTab(list.some((s) => s.status === "A") ? "A" : "P");
      } catch (e) { if (!off) setError(e.message || "Could not load class"); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [sec.section_id, date]);

  const by = (k) => students.filter((s) => s.status === k);
  const list = by(tab);

  const send = async (ids, resend) => {
    setBusy(ids ? ids[0] : "all");
    try {
      const res = await apiRequest("/attendance/students/alert-absent", "POST", {
        date, section_id: sec.section_id, student_ids: ids || undefined, resend: !!resend,
      });
      const d = res?.data || {};
      const map = {};
      (d.results || []).forEach((r) => { map[r.student_id] = r.status; });
      setStudents((prev) => prev.map((s) => (map[s.student_id] && map[s.student_id] !== "skipped" ? { ...s, alert: map[s.student_id] } : s)));
      onAlerted && onAlerted();
      const bad = (d.results || []).filter((r) => r.status === "failed");
      await dialogAlert(
        `WhatsApp alerts sent: ${d.sent || 0}` +
          (d.skipped ? `\nAlready alerted: ${d.skipped}` : "") +
          (bad.length ? `\nNot sent: ${bad.length}\n${[...new Set(bad.map((b) => b.reason))].slice(0, 3).join("\n")}` : ""),
        bad.length ? "Partly sent" : "Done"
      );
    } catch (e) {
      await dialogAlert(e.message || "Could not send alert", "Alert failed");
    } finally { setBusy(""); }
  };

  const one = async (s) => {
    const ok = await dialogConfirm(
      s.alert === "sent" ? `Alert already sent for ${s.name}. Send again?` : `Send WhatsApp absence alert to the parent of ${s.name}?`,
      "Send alert"
    );
    if (ok) send([s.student_id], s.alert === "sent");
  };
  const all = async () => {
    const todo = by("A").filter((s) => s.has_phone && s.alert !== "sent");
    if (!todo.length) return dialogAlert("Every absent student already has an alert, or has no parent phone.");
    const ok = await dialogConfirm(`Send WhatsApp absence alert to ${todo.length} parent(s)?`, "Alert all absent");
    if (ok) send(todo.map((s) => s.student_id), false);
  };

  return (
    <Modal open onClose={onClose} title={`${cls(sec.label)} · ${fmtDay(date)}`} width={640}>
      <PillTabs
        tabs={STATUS_KEYS.map((k) => ({ id: k, label: `${STATUS_META[k].label} (${by(k).length})` }))}
        active={tab}
        onChange={setTab}
      />
      {loading ? (
        <div className="pulse" style={{ padding: 30, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading class…</div>
      ) : error ? (
        <EmptyState icon="warning" title="Could not load class" sub={error} />
      ) : (
        <>
          {tab === "A" && by("A").length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }} disabled={!!busy} onClick={all}>
                <Icon name="send" size={13} /> {busy === "all" ? "Sending…" : "Alert all absent parents"}
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <EmptyState icon="users" title={`No ${STATUS_META[tab].label.toLowerCase()} students`} />
          ) : (
            <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
              {list.map((s) => (
                <div key={s.student_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: `1px solid ${C.border}` }}>
                  <Avatar teacher={{ full_name: s.name, avatar_url: s.photo_url, gender: s.gender }} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted }}>
                      {s.roll_no ? `Roll ${s.roll_no}` : ""}{s.remarks ? `${s.roll_no ? " · " : ""}${s.remarks}` : ""}
                    </div>
                  </div>
                  {tab === "A" &&
                    (s.alert === "sent" ? (
                      <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "6px 10px", color: C.green, display: "flex", alignItems: "center", gap: 4 }} disabled={!!busy} onClick={() => one(s)} title="Alert sent. Tap to resend">
                        <Icon name="check" size={13} /> Sent
                      </button>
                    ) : (
                      <button
                        className={s.alert === "failed" ? "btn btn-danger" : "btn btn-primary"}
                        style={{ fontSize: 11.5, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}
                        disabled={!!busy || !s.has_phone}
                        title={s.has_phone ? `Parent ••••${s.phone_tail}` : "No parent phone on file"}
                        onClick={() => one(s)}
                      >
                        <Icon name="send" size={12} /> {busy === s.student_id ? "…" : s.alert === "failed" ? "Retry" : s.has_phone ? "Alert" : "No phone"}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

// ───────────────────────── pending classes / teacher reminder ─────────────────────────
const RemindModal = ({ data, date, onClose, onDone }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const { currentYear } = useSession();
  const [busy, setBusy] = useState("");

  const remind = async (ids) => {
    if (ids === null) {
      const ok = await dialogConfirm(`Remind teachers of ${data.pending.length} pending class(es)?`, "Remind all");
      if (!ok) return;
    }
    setBusy(ids ? ids[0] : "all");
    try {
      const res = await apiRequest("/attendance/students/remind-teachers", "POST", {
        date, section_ids: ids || undefined, academic_year_id: currentYear?.id || undefined,
      });
      const bad = (res?.data?.results || []).filter((r) => r.status !== "sent");
      await dialogAlert(
        (res?.message || "Done") + (bad.length ? `\n${bad.length} not sent: ${[...new Set(bad.map((b) => b.reason))].join(", ")}` : ""),
        "Reminder"
      );
      onDone && onDone();
    } catch (e) { await dialogAlert(e.message || "Could not send reminder", "Reminder failed"); }
    finally { setBusy(""); }
  };

  return (
    <Modal open onClose={onClose} title="Attendance pending" width={560}>
      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
        {data.pending.map((p) => (
          <div key={p.section_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cls(p.label)}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted }}>
                {p.teacher_name || "No teacher assigned"}
                {p.reminded_at ? ` · reminded ${fmtTime(p.reminded_at)}` : ""}
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
              disabled={!!busy || !p.teacher_ids.length}
              title={p.teacher_ids.length ? "Send reminder to the class teacher" : "No teacher assigned"}
              onClick={() => remind([p.section_id])}
            >
              <Icon name="bell" size={14} /> {busy === p.section_id ? "…" : "Remind"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} disabled={!!busy} onClick={() => remind(null)}>
          <Icon name="bell" size={14} /> {busy === "all" ? "Sending…" : "Remind all teachers"}
        </button>
      </div>
    </Modal>
  );
};

// ───────────────────────── main ─────────────────────────
// data comes from the old /attendance/students/school-overview response (classes, pending, is_today, is_admin)
export const ClassAttendanceBoxes = ({ date, data, loading, onReload }) => {
  const [openSec, setOpenSec] = useState(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const error = "";
  const load = (silent) => onReload && onReload(silent);

  const pending = data?.pending || [];
  const classes = data?.classes || [];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>
          Class-wise Attendance <span style={{ color: C.textMuted, fontWeight: 500 }}>· {fmtDay(date)}</span>
        </h3>
        {pending.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 12px", borderRadius: 12, background: `${STATUS_META.L.color}1f`, color: C.text, fontSize: 12.5, fontWeight: 600 }}>
            <Icon name="warning" size={14} />
            {pending.length} class{pending.length > 1 ? "es" : ""} pending
            {data?.is_today && data?.is_admin && (
              <button className="btn btn-ghost" style={{ padding: "5px 9px", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }} onClick={() => setRemindOpen(true)} title="Remind teachers to mark attendance">
                <Icon name="bell" size={14} /> Remind
              </button>
            )}
          </div>
        )}
      </div>

      {loading && !data?.classes ? (
        <div className="card pulse" style={{ padding: 28, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading classes…</div>
      ) : error ? (
        <div className="card">
          <EmptyState icon="warning" title="Could not load class attendance" sub={error} action={<button className="btn btn-primary" onClick={() => load(false)}>Retry</button>} />
        </div>
      ) : classes.length === 0 ? (
        <div className="card"><EmptyState icon="attendance" title="No class attendance marked" sub="Classes appear here once their attendance is saved for this date." /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
          {classes.map((c) => {
            const pct = c.total ? Math.round((c.P / c.total) * 100) : 0;
            return (
              <div
                key={c.section_id}
                className="card"
                role="button"
                tabIndex={0}
                onClick={() => setOpenSec(c)}
                onKeyDown={(e) => { if (e.key === "Enter") setOpenSec(c); }}
                style={{ cursor: "pointer", padding: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="syne" style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{cls(c.label)}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: pct >= 75 ? STATUS_META.P.color : STATUS_META.A.color }}>{pct}%</div>
                </div>
                <div style={{ fontSize: 11.5, color: C.textMuted, margin: "2px 0 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.teacher_name || "No class teacher"}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUS_KEYS.map((k) => <Chip key={k} s={k} n={c[k] || 0} />)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: C.textMuted }}>
                  <span>{c.total < c.enrolled ? `${c.total}/${c.enrolled} marked` : `${c.total} students`}</span>
                  {c.A > 0 && (
                    <span style={{ color: c.alerted >= c.A ? STATUS_META.P.color : STATUS_META.A.color, fontWeight: 600 }}>
                      {c.alerted}/{c.A} alerted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openSec && <ClassDetailModal sec={openSec} date={date} onClose={() => setOpenSec(null)} onAlerted={() => load(true)} />}
      {remindOpen && <RemindModal data={data} date={date} onClose={() => setRemindOpen(false)} onDone={() => load(true)} />}
    </div>
  );
};
