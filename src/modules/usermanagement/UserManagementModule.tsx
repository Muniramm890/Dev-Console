// FILE: teacher-app/src/modules/usermanagement/UserManagementModule.tsx
// Source: admin App.tsx -> UserManagementModule [22451-23087]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthorizeStudentDialog } from "./dialogs";
import { StaffDetail } from "./StaffDetail";
import { StudentDetail } from "./StudentDetail";
import { C } from "../../theme/theme";
import { ROLE_META } from "../../utils/roles";

export const UserManagementModule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const seg = location.pathname.replace(/^\//, "").split("/"); // ["usermanagement", "staff" | "students", id?]
  const mode = seg[1] === "students" ? "students" : "staff";
  const detailId = seg[2] || null;
  const setMode = (m) => navigate("/usermanagement/" + m);
  const [authorizeFor, setAuthorizeFor] = useState(null); // student row being authorized from the list

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [studentsOverview, setStudentsOverview] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [studentsList, setStudentsList] = useState([]);
  const [loadingStudentsList, setLoadingStudentsList] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilterGrade, setStudentFilterGrade] = useState("");
  const [studentFilterStatus, setStudentFilterStatus] = useState("");
  const [studentGrades, setStudentGrades] = useState([]);


  useEffect(() => { loadStaff(); loadStudentsOverview(); }, []);

  useEffect(() => {
    apiRequest("/setup/grades").then((r) => setStudentGrades(r?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "students") loadStudentsForAuth();
  }, [mode, studentSearch, studentFilterGrade, studentFilterStatus]); 

  const filtered = staff.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchRole = !filterRole || s.role === filterRole;
    const matchStatus = filterStatus === "active" ? s.is_active : filterStatus === "blocked" ? !s.is_active : true;
    return matchSearch && matchRole && matchStatus;
  });

  const kpi = {
    total: staff.length,
    active: staff.filter((s) => s.is_active).length,
    blocked: staff.filter((s) => !s.is_active).length,
    admins: staff.filter((s) => s.role === "school_admin").length,
  };

  const loadStudentsForAuth = async () => {
    setLoadingStudentsList(true);
    try {
      const params = new URLSearchParams({
        search: studentSearch || "",
        grade_id: studentFilterGrade || "",
        status: studentFilterStatus || "",
      });
      const res = await apiRequest(`/admin/users/students?${params.toString()}`);
      setStudentsList(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { console.error(e); } finally { setLoadingStudentsList(false); }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/admin/users/staff");
      setStaff(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadStudentsOverview = async () => {
    setLoadingStudents(true);
    try {
      const res = await apiRequest("/admin/users/students-overview");
      setStudentsOverview(res?.data || null);
    } catch (e) { console.error(e); } finally { setLoadingStudents(false); }
  };

  if (detailId && mode === "staff") return <StaffDetail key={detailId} memberId={detailId} onBack={() => navigate("/usermanagement/staff")} onChanged={loadStaff} />;
  if (detailId && mode === "students") return <StudentDetail key={detailId} studentId={detailId} onBack={() => navigate("/usermanagement/students")} onChanged={() => { loadStudentsForAuth(); loadStudentsOverview(); }} />;

  return (
    <div className="slide-in">
      <SectionHeader
        title="User Management"
        sub="Super Admin only — manage every staff account, access level, and login credentials"
        action={
          <div style={{ display: "flex", background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {[{ id: "staff", label: "Staff", icon: "teachers" }, { id: "students", label: "Students", icon: "students" }].map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13,
                background: mode === m.id ? C.primary : "transparent", color: mode === m.id ? "white" : C.textMuted,
              }}>
                <Icon name={m.icon} size={14} /> {m.label}
              </button>
            ))}
          </div>
        }
      />

      {mode === "staff" ? (
        <>
          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
            <KpiCard label="Total Staff" value={loading ? "—" : kpi.total} icon="teachers" color={C.blue} />
            <KpiCard label="Active" value={loading ? "—" : kpi.active} icon="check" color={C.green} />
            <KpiCard label="Blocked" value={loading ? "—" : kpi.blocked} icon="warning" color={C.red} />
            <KpiCard label="Super Admins" value={loading ? "—" : kpi.admins} icon="setup" color={C.primary} />
          </div>

          <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Icon name="search" size={14} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input className="input" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
              <select className="select" style={{ width: 160 }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="select" style={{ width: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
              <button className="btn btn-ghost" onClick={loadStaff} style={{ padding: "8px 10px" }}><Icon name="attendance" size={14} /></button>
              <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{filtered.length} found</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading staff accounts…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 50, textAlign: "center", color: C.textMuted }}>No staff found.</div>
            ) : (
              <div className="scroll-x">
                <table className="table">
                  <thead>
                    <tr><th>Staff</th><th>Role</th><th>Access</th><th>Status</th><th>Last Login</th><th style={{ width: 90 }}></th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const rMeta = ROLE_META[s.role] || { label: s.role, color: C.textMuted };
                      const modCount = s.permissions?.modules?.length || 0;
                      return (
                        <tr key={s.member_id} onClick={() => navigate(`/usermanagement/staff/${s.member_id}`)} style={{ cursor: "pointer" }}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {s.avatar_url ? (
                                <img src={s.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${rMeta.color}33`, color: rMeta.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                                  {(s.full_name?.[0] || "?").toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.full_name}{s.is_self && <span style={{ color: C.textMuted, fontWeight: 500 }}> (You)</span>}</div>
                                <div style={{ fontSize: 11, color: C.textMuted }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge" style={{ background: `${rMeta.color}22`, color: rMeta.color }}>{rMeta.label}</span></td>
                          <td>
                            {s.role === "school_admin" ? (
                              <span style={{ fontSize: 12, color: C.textMuted }}>Full access</span>
                            ) : modCount === 0 ? (
                              <span style={{ fontSize: 12, color: C.yellow }}>No modules set</span>
                            ) : (
                              <span style={{ fontSize: 12, color: C.text }}>{modCount} module{modCount !== 1 ? "s" : ""}</span>
                            )}
                          </td>
                          <td><span className={`badge ${s.is_active ? "badge-green" : "badge-red"}`}>{s.is_active ? "Active" : "Blocked"}</span></td>
                          <td style={{ fontSize: 12, color: C.textMuted }}>{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString("en-IN") : "Never"}</td>
                          <td style={{ textAlign: "right", color: C.textMuted }}><Icon name="arrow_right" size={16} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
            ) : (
              <div>
                <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
                  <KpiCard label="Total Students" value={loadingStudents ? "—" : studentsOverview?.total || 0} icon="students" color={C.blue} />
                  <KpiCard label="Active" value={loadingStudents ? "—" : studentsOverview?.active || 0} icon="check" color={C.green} />
                  <KpiCard label="Login Enabled" value={loadingStudents ? "—" : studentsOverview?.login_enabled || 0} icon="setup" color={C.primary} />
                </div>
      
                <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                      <Icon name="search" size={14} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input className="input" placeholder="Search by name or admission no…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} style={{ paddingLeft: 32 }} />
                    </div>
                    <select className="select" style={{ width: 160 }} value={studentFilterGrade} onChange={(e) => setStudentFilterGrade(e.target.value)}>
                      <option value="">All Classes</option>
                      {studentGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select className="select" style={{ width: 160 }} value={studentFilterStatus} onChange={(e) => setStudentFilterStatus(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="authorized">Authorized</option>
                      <option value="blocked">Blocked</option>
                      <option value="not_authorized">Not Authorized</option>
                    </select>
                  </div>
                </div>
      
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {loadingStudentsList ? (
                    <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading students…</div>
                  ) : studentsList.length === 0 ? (
                    <div style={{ padding: 50, textAlign: "center", color: C.textMuted }}>No students found.</div>
                  ) : (
                    <div className="scroll-x">
                      <table className="table">
                        <thead>
                          <tr><th>Student</th><th>Class</th><th>Login ID</th><th>Status</th><th>Last Login</th><th style={{ width: 90 }}></th></tr>
                        </thead>
                        <tbody>
                          {studentsList.map((s) => (
                            <tr key={s.student_id} onClick={() => navigate(`/usermanagement/students/${s.student_id}`)} style={{ cursor: "pointer" }}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  {s.photo_url ? (
                                    <img src={s.photo_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                                  ) : (
                                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${C.blue}33`, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                                      {(s.first_name?.[0] || "?").toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.first_name} {s.last_name}</div>
                                    <div style={{ fontSize: 11, color: C.textMuted }}>Adm# {s.admission_no}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 12 }}>{s.class_name} {s.section_name} {s.roll_no ? `· Roll ${s.roll_no}` : ""}</td>
                              <td style={{ fontSize: 12 }}>
                                {s.login_status === "not_authorized" ? "—" : (
                                  <span>
                                    {s.login_phone || s.login_email || s.login_identifier}
                                    <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 9 }}>{s.identifier_type}</span>
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${s.login_status === "active" ? "badge-green" : s.login_status === "blocked" ? "badge-red" : "badge-yellow"}`}>
                                  {s.login_status === "active" ? "Authorized" : s.login_status === "blocked" ? "Blocked" : "Not Authorized"}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: C.textMuted }}>{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString("en-IN") : "Never"}</td>
                              <td style={{ textAlign: "right", color: C.textMuted, whiteSpace: "nowrap" }}>
                                  {s.login_status === "not_authorized"
                                    ? <button className="btn btn-primary" style={{ padding: "5px 12px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setAuthorizeFor(s); }}>Authorize</button>
                                    : <Icon name="arrow_right" size={16} />}
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

      <AuthorizeStudentDialog student={authorizeFor} onClose={() => setAuthorizeFor(null)} onDone={() => { loadStudentsForAuth(); loadStudentsOverview(); }} />
    </div>
  );
};
