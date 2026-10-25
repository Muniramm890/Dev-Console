// FILE: teacher-app/src/modules/commhub/ComposeMessageTab.tsx
// Source: admin App.tsx -> ComposeMessageTab [10232-10438]
// [teacher-app] Redesigned UI: composer cards on the left, sticky live summary/preview on the right.
// State, API calls (/setup/*, /comm/preview, /comm/messages) and validation are unchanged.
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { SectionCard } from "../../components/ui/SectionCard";
import { TargetRow } from "./TargetRow";
import {
  ATTACHMENT_CHANNEL_MATRIX, ATTACHMENT_TYPE_META, CATEGORY_META, CHANNEL_META,
  TARGET_TYPE_META, detectAttachmentType, fmtSize,
} from "./helpers";
import { C } from "../../theme/theme";
import { ROLE_META } from "../../utils/roles";

export const ComposeMessageTab = ({ academicYearId, onSent }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [channels, setChannels] = useState({ app: true, email: false, sms: false });
  const [targets, setTargets] = useState([{ target_type: "all_school" }]);
  const [files, setFiles] = useState([]);
  const [allowReplies, setAllowReplies] = useState(false);
  const [repliesCloseOn, setRepliesCloseOn] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!academicYearId) return;
    Promise.all([
      apiRequest(`/setup/grades`),
      apiRequest(`/setup/sections?academic_year_id=${academicYearId}`),
      apiRequest(`/setup/subjects`),
    ]).then(([gRes, secRes, subRes]) => {
      setGrades(gRes?.data || []);
      setSections(secRes?.data || []);
      setSubjects(subRes?.data || []);
    }).catch((e) => console.error(e.message));
  }, [academicYearId]);

  // Strictest attachment type present decides which channels are even selectable
  const strictestType = useMemo(() => {
    if (files.length === 0) return "none";
    const rank = { none: 0, image: 1, pdf: 1, document: 1, video: 2 };
    let worst = "none";
    files.forEach((f) => { const t = detectAttachmentType(f); if (rank[t] > rank[worst]) worst = t; });
    return worst;
  }, [files]);

  const allowedChannels = ATTACHMENT_CHANNEL_MATRIX[strictestType];

  // Auto-uncheck any channel that becomes invalid the moment attachments change
  useEffect(() => {
    setChannels((p) => {
      const next = { ...p };
      Object.keys(next).forEach((k) => { if (next[k] && !allowedChannels.includes(k)) next[k] = false; });
      return next;
    });
  }, [strictestType]); // eslint-disable-line

  const toggleChannel = (ch) => setChannels((p) => ({ ...p, [ch]: !p[ch] }));

  const addTarget = () => setTargets((p) => [...p, { target_type: "section" }]);
  const updateTarget = (idx, t) => setTargets((p) => p.map((x, i) => (i === idx ? t : x)));
  const removeTarget = (idx) => setTargets((p) => p.filter((_, i) => i !== idx));

  const addFiles = (picked) => {
    if (files.length + picked.length > 3) { setError("Max 3 attachments per message"); return; }
    setFiles((p) => [...p, ...picked]);
    setError("");
  };
  const handleFilePick = (e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (files.length >= 3) return;
    addFiles(Array.from(e.dataTransfer?.files || []));
  };
  const removeFile = (i) => setFiles((p) => p.filter((_, idx) => idx !== i));

  const cleanTargets = () => targets.map((t) => ({
    target_type: t.target_type,
    grade_id: t.grade_id || undefined,
    section_id: t.section_id || undefined,
    subject_id: t.subject_id || undefined,
    student_id: t.student_id || undefined,
    gender: t.gender || undefined,
    role: t.role || undefined,
  }));

  const handlePreview = async () => {
    setPreviewing(true);
    setError("");
    try {
      const res = await apiRequest("/comm/preview", "POST", { academic_year_id: academicYearId, targets: cleanTargets() });
      setPreview(res?.data || null);
    } catch (e) { setError(e.message); }
    finally { setPreviewing(false); }
  };

  const selectedChannels = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and message are required"); return; }
    if (selectedChannels.length === 0) { setError("Select at least one channel"); return; }

    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("body", body.trim());
      fd.append("category", category);
      fd.append("channels", JSON.stringify(selectedChannels));
      fd.append("targets", JSON.stringify(cleanTargets()));
      fd.append("academic_year_id", academicYearId);
      if (allowReplies) {
        fd.append("allow_replies", "1");
        if (repliesCloseOn) fd.append("replies_close_at", new Date(`${repliesCloseOn}T23:59:59`).toISOString());
      }
      files.forEach((f) => fd.append("attachments", f));

      const res = await apiRequest("/comm/messages", "POST", fd, true);
      setResult(res?.data || null);
      setTitle(""); setBody(""); setTargets([{ target_type: "all_school" }]); setFiles([]); setPreview(null); setAllowReplies(false); setRepliesCloseOn("");
      setTimeout(() => onSent?.(), 1200);
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  // Human readable audience label for the summary panel
  const targetLabel = (t) => {
    const base = TARGET_TYPE_META[t.target_type]?.label || t.target_type;
    const parts = [];
    const g = grades.find((x) => x.id === t.grade_id)?.name;
    const s = sections.find((x) => x.id === t.section_id)?.name;
    const sub = subjects.find((x) => x.id === t.subject_id)?.name;
    if (g) parts.push(g);
    if (s) parts.push(s);
    if (t.gender) parts.push(t.gender === "male" ? "Boys" : "Girls");
    if (sub) parts.push(sub);
    if (t.role) parts.push(ROLE_META[t.role]?.label || t.role);
    if (t.student_label) parts.push(t.student_label);
    return parts.length ? `${base}: ${parts.join(" · ")}` : base;
  };

  const cat = CATEGORY_META[category] || CATEGORY_META.general;
  const catColor = C[cat.color];
  const clamp4 = { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word" };
  const summaryRow = { display: "flex", flexDirection: "column", gap: 6, paddingTop: 14, marginTop: 14, borderTop: `1px solid ${C.border}` };
  const summaryLabel = { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 100, background: C.surfaceAlt, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600 };

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* ───────────── LEFT: composer ───────────── */}
      <div style={{ flex: "1 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionCard icon="edit" title="Message" sub="What do you want to announce?">
          <FormGrid cols={1}>
            <FormRow label="Title">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PTM on Saturday" maxLength={150} />
            </FormRow>
            <FormRow label="Message">
              <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." style={{ resize: "vertical" }} />
              <div style={{ textAlign: "right", fontSize: 11, color: C.textMuted, marginTop: 4 }}>{body.length} characters</div>
            </FormRow>
          </FormGrid>

          <div style={{ ...summaryLabel, marginBottom: 8 }}>Category</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(CATEGORY_META).map(([k, m]) => {
              const on = category === k;
              const col = C[m.color];
              return (
                <button
                  key={k} type="button" className="btn" onClick={() => setCategory(k)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700,
                    background: on ? `${col}22` : C.surfaceAlt, color: on ? col : C.textMuted, border: `1px solid ${on ? col : "transparent"}`,
                  }}
                >
                  <Icon name={m.icon} size={13} /> {m.label}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          icon="users" title="Audience" sub="Who should receive this announcement?"
          right={
            <button className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "6px 12px" }} onClick={addTarget}>
              <Icon name="plus" size={13} /> Add audience
            </button>
          }
        >
          {targets.map((t, i) => (
            <TargetRow key={i} target={t} grades={grades} sections={sections} subjects={subjects}
              onChange={(nt) => updateTarget(i, nt)} onRemove={() => removeTarget(i)} />
          ))}
          {targets.length === 0 && (
            <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 12 }}>No audience selected — add at least one.</div>
          )}
        </SectionCard>

        <SectionCard
          icon="paperclip" title="Attachments" sub="Optional · image, PDF, Word/PowerPoint or video"
          right={<span className="badge badge-blue">{files.length}/3</span>}
        >
          <label
            htmlFor="announcement-files"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center",
              padding: "22px 16px", borderRadius: 14, border: `2px dashed ${dragOver ? C.primary : C.border}`,
              background: dragOver ? `${C.primary}0f` : C.surfaceAlt,
              cursor: files.length >= 3 ? "not-allowed" : "pointer", opacity: files.length >= 3 ? 0.55 : 1, transition: "all .15s",
            }}
          >
            <div style={{ color: C.primary }}><Icon name="upload" size={22} /></div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>
              Drag & drop files here or <span style={{ color: C.primary }}>browse</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.textMuted }}>Up to 3 files per announcement</div>
            <input
              id="announcement-files" type="file" multiple
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,video/*"
              onChange={handleFilePick} disabled={files.length >= 3} style={{ display: "none" }}
            />
          </label>

          {files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {files.map((f, i) => {
                const ft = detectAttachmentType(f);
                const col = C[ATTACHMENT_TYPE_META[ft].color];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${col}22`, color: col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="file" size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: C.textMuted }}>{ATTACHMENT_TYPE_META[ft].label} · {fmtSize(f.size)}</div>
                    </div>
                    <button className="btn btn-ghost" style={{ padding: "6px 8px" }} onClick={() => removeFile(i)} title="Remove file">
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {strictestType !== "none" && (
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10 }}>
              "{strictestType}" attachments can only be sent through these channels: <strong>{allowedChannels.join(", ")}</strong>
            </div>
          )}
        </SectionCard>

        <SectionCard icon="send" title="Send via" sub="Choose how people receive it">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            {Object.entries(CHANNEL_META).map(([k, m]) => {
              const blocked = m.alwaysDisabled || !allowedChannels.includes(k);
              const on = !!channels[k] && !blocked;
              return (
                <button
                  key={k} type="button" disabled={blocked} onClick={() => toggleChannel(k)}
                  style={{
                    position: "relative", textAlign: "left", display: "flex", gap: 12, alignItems: "center", padding: 14, borderRadius: 14,
                    cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.5 : 1, fontFamily: "inherit", color: C.text, transition: "all .15s",
                    background: on ? `${C.primary}14` : C.surfaceAlt, border: `1.5px solid ${on ? C.primary : C.border}`,
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? C.primary : `${C.primary}1f`, color: on ? "#fff" : C.primary }}>
                    <Icon name={m.icon} size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.label}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted }}>
                      {m.alwaysDisabled ? "Coming soon" : blocked ? `Not available with ${strictestType} attachments` : m.sub}
                    </div>
                  </div>
                  {on && (
                    <span style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="check" size={11} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard icon="message" title="Replies" sub="Let people answer you privately">
          <button
            type="button" onClick={() => setAllowReplies((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", color: C.text, textAlign: "left",
              background: allowReplies ? `${C.primary}14` : C.surfaceAlt, border: `1.5px solid ${allowReplies ? C.primary : C.border}`, touchAction: "manipulation" }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Allow replies</div>
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.45 }}>
                Each person gets a private chat with you. Replies are visible only to you and school admins — never to other recipients.
              </div>
            </div>
            <span style={{ width: 42, height: 24, borderRadius: 100, flexShrink: 0, position: "relative", background: allowReplies ? C.primary : C.border, transition: "background .15s" }}>
              <span style={{ position: "absolute", top: 3, left: allowReplies ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
            </span>
          </button>
          {allowReplies && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6 }}>Close replies on (optional)</label>
              <input type="date" className="input" style={{ maxWidth: 220 }} value={repliesCloseOn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setRepliesCloseOn(e.target.value)} />
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>
                Staff can reply in the app Inbox. Student replies need the student app update.
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ───────────── RIGHT: live preview + summary + send ───────────── */}
      <div style={{ flex: "1 1 320px", maxWidth: 420, minWidth: 0, position: "sticky", top: 16, alignSelf: "flex-start" }}>
        <SectionCard icon="eye" title="Preview & Summary" sub="How your announcement will look">
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderLeft: `4px solid ${catColor}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: catColor, background: `${catColor}22`, padding: "3px 10px", borderRadius: 100 }}>
                <Icon name={cat.icon} size={12} /> {cat.label}
              </span>
              <span style={{ fontSize: 11, color: C.textMuted }}>Just now</span>
            </div>
            <div className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, wordBreak: "break-word", color: title.trim() ? C.text : C.textMuted }}>
              {title.trim() || "Your title appears here"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: body.trim() ? C.text : C.textMuted, ...clamp4 }}>
              {body.trim() || "Your message will be shown here as you type."}
            </div>
            {files.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted, marginTop: 10 }}>
                <Icon name="paperclip" size={13} /> {files.length} attachment{files.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <div style={summaryRow}>
            <div style={summaryLabel}>Audience</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {targets.map((t, i) => (<span key={i} style={chip}>{targetLabel(t)}</span>))}
            </div>
          </div>

          <div style={summaryRow}>
            <div style={summaryLabel}>Channels</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {selectedChannels.length === 0 && <span style={{ fontSize: 12.5, color: C.textMuted }}>None selected</span>}
              {selectedChannels.map((k) => (
                <span key={k} style={chip}><Icon name={CHANNEL_META[k].icon} size={12} /> {CHANNEL_META[k].label}</span>
              ))}
            </div>
          </div>

          <div style={summaryRow}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={summaryLabel}>Recipients</div>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={handlePreview} disabled={previewing}>
                {previewing ? "Checking..." : "Check recipients"}
              </button>
            </div>
            {preview ? (
              <div style={{ fontSize: 13 }}>
                This message will reach <strong>{preview.total}</strong> people — <strong>{preview.students}</strong> students, <strong>{preview.staff}</strong> staff.
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: C.textMuted }}>Not checked yet</div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: `${C.red}14`, border: `1px solid ${C.red}44`, color: C.red, fontSize: 12.5 }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: `${C.green}14`, border: `1px solid ${C.green}44`, fontSize: 13 }}>
              <strong style={{ color: C.green }}>Announcement sent</strong> — status: <strong>{result.status}</strong>, recipients: <strong>{result.recipient_count}</strong>
              {result.attachment_count > 0 && <span>, attachments: <strong>{result.attachment_count}</strong></span>}
            </div>
          )}

          <button
            className="btn btn-primary" onClick={handleSend} disabled={sending}
            style={{ width: "100%", marginTop: 16, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, opacity: sending ? 0.7 : 1 }}
          >
            <Icon name="send" size={15} /> {sending ? "Sending..." : "Send Now"}
          </button>
        </SectionCard>
      </div>
    </div>
  );
};
