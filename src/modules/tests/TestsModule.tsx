// FILE: teacher-app/src/modules/tests/TestsModule.tsx
// Source: admin App.tsx -> TestsModule [20149-21127]
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { gasRequest } from "../../api/gas";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useDialog } from "../../contexts/DialogContext";
import { PrintPaperWorkspace } from "./PrintPaperWorkspace";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { explain } from "../../utils/apiErrors";
import { C } from "../../theme/theme";

 // ═══════════════════════════════════════════════════════════════
 // MODULE: TEST CONTROL CENTER (QUICK TESTS)
 // ═══════════════════════════════════════════════════════════════


 export const TestsModule = ({ school }) => {
  const { dialogAlert, dialogConfirm } = useDialog();

  // ── STATE MANAGEMENT ──
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState("classes");
  const [activeClass, setActiveClass] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [actionTestId, setActionTestId] = useState(null); // test opened on its own action page
  const [copiedId, setCopiedId] = useState(false);
  const [printWorkspaceData, setPrintWorkspaceData] = useState(null);
  
  const [showPrintPromptModal, setShowPrintPromptModal] = useState(false);
  const [promptTestId, setPromptTestId] = useState("");
  const [fetchingPaper, setFetchingPaper] = useState(false);
 
  // Modals & Active Selections
  const [showSettings, setShowSettings] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  const [showWizard, setShowWizard] = useState(false); 
  const [selectedTest, setSelectedTest] = useState(null);
  const [attemptsData, setAttemptsData] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [saving, setSaving] = useState(false);

    // ── 🔴 WIZARD STATE & PARSER LOGIC (NEW) ──
    const [wizardStep, setWizardStep] = useState(1); 
    const [wizardMethod, setWizardMethod] = useState(null); // 'code', 'ocr'
    const [rawCode, setRawCode] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [testMeta, setTestMeta] = useState({
      testId: "", classVal: "", subject: "", chapterNo: "", chapterName: "", testName: "", duration: 30
    });
  
    const processJSCode = () => {
      if (!rawCode.trim()) return dialogAlert("Please paste the JS code first.", "Empty Field");
      try {
        const dMatch = rawCode.match(/const\s+testDetails\s*=\s*({[\s\S]*?});/);
        const qMatch = rawCode.match(/const\s+mockQuestions\s*=\s*(\[[\s\S]*?\]);/);
  
        if (!dMatch) throw new Error("Missing 'const testDetails = {...}'");
        if (!qMatch) throw new Error("Missing 'const mockQuestions = [...]'");
  
        const getMeta = new Function("return " + dMatch[1]);
        const getQ    = new Function("return " + qMatch[1]);
        const meta    = getMeta();
        let questions = getQ();
  
        // Smart Parser: Auto-detect missing types
        questions = questions.map((q, idx) => {
           let type = (q.type || 'MCQ').toUpperCase();
           if (!q.options && type !== 'TF' && type !== 'DESC' && type !== 'FIB') {
              if (q.correct === 'True' || q.correct === 'False') type = 'TF';
              else if (q.text.includes('___')) type = 'FIB';
              else type = 'DESC';
           }
           let opts = q.options || [];
           if (type === 'MCQ') while (opts.length < 4) opts.push(""); // Ensure 4 options for MCQ
           
           return {
              id: q.id || `Q-${Date.now().toString().slice(-6)}-${idx}`,
              text: q.text || "",
              options: opts,
              correctAnswer: q.correctAnswer || q.correct || "",
              explanation: q.explanation || "",
              marks: q.marks || (type === 'DESC' ? 3 : 1),
              type: type
           };
        });
  
        setTestMeta({
          testId: meta.testId || `T-${Math.floor(1000 + Math.random() * 9000)}`,
          classVal: meta.className || "",
          subject: meta.subject || "",
          chapterNo: meta.chapterNumber || "01",
          chapterName: meta.chapterName || "",
          testName: meta.testName || meta.mockNumber || "",
          duration: meta.duration || meta.time || 30
        });
  
        setParsedQuestions(questions);
        setWizardStep(3);
      } catch (e) {
        dialogAlert(e.message + "\n\nEnsure variables are strictly named 'testDetails' and 'mockQuestions'.", "Parsing Error");
      }
    };
  
    const updateParsedQuestion = (index, field, value) => {
      setParsedQuestions(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    };
  
    const handleFinalUpload = async () => {
      if (!testMeta.testName || !testMeta.subject) return dialogAlert("Test Name and Subject are required.", "Missing Info");
      
      // Convert to GAS Sheet Array Format (16 Columns)
      const rowsData = parsedQuestions.map((q) => {
        let opts = q.type === 'MCQ' ? q.options : ["N/A", "N/A", "N/A", "N/A"];
        while(opts.length < 4) opts.push("");
        
        let correctAns = q.correctAnswer;
        if (!correctAns) correctAns = (q.type === 'DESC') ? "Descriptive Answer" : opts[0];
  
        return [
          testMeta.testId, testMeta.classVal, testMeta.subject, testMeta.chapterNo, testMeta.chapterName, 
          testMeta.testName, testMeta.duration, `${q.id}_${q.type}`, q.text, 
          opts[0], opts[1], opts[2], opts[3], correctAns, q.explanation, q.marks
        ];
      });
  
      setSaving(true);
      try {
        const res = await gasRequest('addBulkQuestions', { rowsData: JSON.stringify(rowsData) });
        if (res.status || res.success) {
          await dialogAlert(`Test Bank Created Successfully!\nTest ID: ${testMeta.testId}`, "Published");
          setShowWizard(false);
          loadTests(true); // Refresh Dashboard
        } else throw new Error(res.message);
      } catch (e) {
        dialogAlert("Upload failed: " + e.message, "Network Error");
      } finally {
        setSaving(false);
      }
    };
    // ── 🔴 WIZARD END ──

  // 🔴 Fetch Test Data for Printing
  const openPrintWorkspace = async (targetTestId) => {
    if (!targetTestId) return dialogAlert("Please provide a Test ID.");
    setFetchingPaper(true);
    try {
      const res = await gasRequest('fetchTest', { testId: targetTestId, verifiedRole: 'ADMIN' });
      if (res.status && res.data) {
        setPrintWorkspaceData(res.data);
        setShowPrintPromptModal(false); // Close prompt if it was open
        setPromptTestId("");
      } else {
        dialogAlert(res.message || "Test not found.", "Error");
      }
     } catch (e) {
      // 🔴 FIX: Show actual GAS API rejection message instead of masking it
      dialogAlert(e.message || "Network Error fetching Test.", "API Alert");
    } finally {
      setFetchingPaper(false);
    }
  };

  // 🔴 NEW: Report & Proctoring States
  const [showReport, setShowReport] = useState(false);
  const [activeReport, setActiveReport] = useState(null); // Merged Attempt + Test Data
  const [reportPdfBusy, setReportPdfBusy] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  
  const [showProctoring, setShowProctoring] = useState(false);
  const [proctorImages, setProctorImages] = useState([]);
  const [loadingProctor, setLoadingProctor] = useState(false);

  // ── INITIAL DATA LOAD FROM GAS ──
  const loadTests = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await gasRequest("getTestRegistry");
      if (res.status && Array.isArray(res.data)) {
        setTests(res.data);
      }
    } catch (e) {
      console.error(e);
      if (!silent) dialogAlert("Failed to load tests from Google Apps Script.", "Sync Error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dialogAlert]);

  useEffect(() => { loadTests(); }, [loadTests]);

  useEffect(() => {
    window.triggerPrintWorkspace = (id) => openPrintWorkspace(id);
    return () => { delete window.triggerPrintWorkspace; };
  }, []);

  const hierarchy = React.useMemo(() => {
    const h = {};
    tests.forEach((t) => {
      const cls = t.classVal || "General";
      const sub = t.subject || "Others";
      const chap = t.chapterName || t.testName || "Mix";
      if (!h[cls]) h[cls] = {};
      if (!h[cls][sub]) h[cls][sub] = {};
      if (!h[cls][sub][chap]) h[cls][sub][chap] = [];
      h[cls][sub][chap].push(t);
    });
    return h;
  }, [tests]);

  const kpis = {
    total: tests.length,
    published: tests.filter(t => t.status === "PUBLISHED").length,
    drafts: tests.filter(t => t.status === "DRAFT").length,
    attempts: tests.reduce((sum, t) => sum + (Number(t.attemptCount) || 0), 0)
  };

  // ── LIVE HANDLERS ──
  const handleStatusChange = async (testId, newStatus) => {
    try {
      setTests(prev => prev.map(t => t.testId === testId ? { ...t, status: newStatus } : t));
      const res = await gasRequest('updateTestStatus', { testId, status: newStatus });
      if (!res.status && !res.success) throw new Error(res.message);
    } catch (e) {
      dialogAlert("Status update failed.", "Error");
      loadTests(true); 
    }
  };

  const handleDelete = async (testId) => {
    if (!await dialogConfirm("Permanently delete this test and its Question Bank?", "Delete Test")) return;
    try {
      setTests(prev => prev.filter(t => t.testId !== testId));
      await gasRequest('deleteTestCompletely', { testId });
    } catch (e) {
      dialogAlert("Failed to delete test.", "Error");
      loadTests(true);
    }
  };

  const openSettingsModal = (test) => {
    setSelectedTest({
      ...test,
      duration: test.duration || 20,
      resultVisibility: test.resultVisibility || "IMMEDIATE",
      visibleTo: test.visibleTo || "ALL"
    });
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        testId: selectedTest.testId, classVal: selectedTest.classVal, section: selectedTest.section || "ALL",
        duration: selectedTest.duration, resultVisibility: selectedTest.resultVisibility, visibleTo: selectedTest.visibleTo
      };
      const res = await gasRequest('updateTestMeta', payload);
      if (res.status || res.success) {
        await dialogAlert("Test configuration saved successfully.", "Success");
        setShowSettings(false); loadTests(true);
      } else throw new Error(res.message);
    } catch (e) { dialogAlert("Failed to save settings.", "Error"); } 
    finally { setSaving(false); }
  };

  const openAttemptsModal = async (test) => {
    setSelectedTest(test); setShowAttempts(true); setLoadingAttempts(true); setAttemptsData([]);
    try {
      const res = await gasRequest('getTestAttemptsList', { testId: test.testId });
      if (res.status && Array.isArray(res.data)) setAttemptsData(res.data);
    } catch (e) { dialogAlert("Failed to load student attempts.", "Network Error"); } 
    finally { setLoadingAttempts(false); }
  };

  const deleteAttempt = async (rowNum, testId) => {
    if (!await dialogConfirm("Delete this result entry?", "Remove Attempt")) return;
    try {
      setAttemptsData(prev => prev.filter(a => a._row !== rowNum)); 
      await gasRequest('deleteResultEntry', { row: rowNum, testId: testId });
      loadTests(true); 
    } catch (e) { dialogAlert("Failed to remove attempt.", "Error"); openAttemptsModal(selectedTest); }
  };

  // 🔴 ── NEW: REPORT & PROCTORING LOGIC ── 🔴
  const openAnalysisReport = async (attempt) => {
    setShowAttempts(false); // Close attempts list
    setShowReport(true);
    setLoadingReport(true);
    setActiveReport(null);

    try {
      // Fetch Master Test Data (Questions & Options)
      const res = await gasRequest('fetchTest', { testId: attempt.testId, verifiedRole: 'ADMIN' });
      if (res.status && res.data) {
        
        // Parse Student's Choices & Time Spent
        let userChoices = [];
        let timeSpent = [];
        try { userChoices = JSON.parse(attempt.userChoices || '[]'); } catch(e) {}
        try { timeSpent = JSON.parse(attempt.timeSpent || '[]'); } catch(e) {}

        setActiveReport({
          student: attempt,
          testData: res.data,
          choices: userChoices,
          timing: timeSpent
        });
      } else {
        throw new Error(res.message);
      }
    } catch (e) {
      dialogAlert("Failed to generate report. Question bank data missing.", "Error");
      setShowReport(false);
    } finally {
      setLoadingReport(false);
    }
  };

  const viewProctoringLogs = async (folderId) => {
    if (!folderId || folderId.startsWith("Error") || folderId === "NO_PROCTORING") {
      return dialogAlert("No surveillance data available for this session.", "Proctoring Alert");
    }
    
    setShowProctoring(true);
    setLoadingProctor(true);
    setProctorImages([]);

    try {
      const res = await gasRequest('getProctorImages', { folderId });
      if (res.status && res.data) {
        setProctorImages(res.data);
      } else {
        throw new Error("Folder empty");
      }
    } catch (e) {
      setProctorImages([]); // Will show empty state
    } finally {
      setLoadingProctor(false);
    }
  };

  // ── VIEW RENDERERS ──
  const renderClasses = () => {
    if (loading) return <div className="card pulse" style={{ padding: 60, textAlign: "center", color: C.primary }}>Synchronizing Test Registry...</div>;
    const classes = Object.keys(hierarchy).sort();
    if (classes.length === 0) return <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No Tests Generated Yet. Create one to begin.</div>;

    const gradients = [
      `linear-gradient(135deg, ${C.blue}, #7c3aed)`, `linear-gradient(135deg, ${C.green}, #10b981)`,
      `linear-gradient(135deg, ${C.red}, #f97316)`, `linear-gradient(135deg, ${C.yellow}, #fbbf24)`
    ];

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }} className="slide-in">
        {classes.map((cls, i) => (
          <div key={cls} style={{ background: gradients[i % 4], borderRadius: 24, padding: 24, color: "white", cursor: "pointer", position: "relative", overflow: "hidden", minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", transition: "transform 0.2s" }} onClick={() => { setActiveClass(cls); setActiveSubject(null); setViewState("subjects"); }}>
            <div style={{ position: "absolute", bottom: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ position: "relative", zIndex: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.2)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}><Icon name="academic" size={24} color="white" /></div>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700, backdropFilter: "blur(10px)" }}>{Object.keys(hierarchy[cls]).length} Subjects</span>
              </div>
              <h3 className="syne" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{cls}</h3>
              <p style={{ fontSize: 12, opacity: 0.8, marginTop: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>Manage Tests <Icon name="arrow_right" size={12} /></p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSubjects = () => {
    const subjects = hierarchy[activeClass];
    const subColors = [C.blue, C.green, C.red, C.yellow, C.purple, C.cyan];
    return (
      <div className="slide-in">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <button className="btn btn-ghost" style={{ padding: "8px 12px" }} onClick={() => { setViewState("classes"); setActiveClass(null); }}><Icon name="arrow_right" size={16} style={{ transform: "rotate(180deg)" }} /></button>
          <div><h2 className="syne" style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>{activeClass}</h2><p style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "2px 0 0 0" }}>Select Subject</p></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {Object.keys(subjects).sort().map((sub, i) => {
            const color = subColors[i % subColors.length];
            let testCount = 0; Object.keys(subjects[sub]).forEach(ch => testCount += subjects[sub][ch].length);
            return (
              <div key={sub} className="card" style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 16, borderBottom: `4px solid ${color}`, transition: "transform 0.2s" }} onClick={() => { setActiveSubject(sub); setViewState("chapters"); }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}22`, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{sub.substring(0, 2).toUpperCase()}</div>
                <div><h4 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{sub}</h4><p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginTop: 4, textTransform: "uppercase" }}>{testCount} Total Tests</p></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChapters = () => {
    const chapters = hierarchy[activeClass][activeSubject];
    return (
      <div className="slide-in pb-10">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, background: C.surfaceAlt, padding: "12px 16px", borderRadius: 16, border: `1px solid ${C.border}` }}>
          <button className="btn btn-ghost" style={{ padding: "8px 12px", background: C.surface }} onClick={() => { setViewState("subjects"); setActiveSubject(null); }}><Icon name="arrow_right" size={14} style={{ transform: "rotate(180deg)" }} /></button>
          <div><h2 className="syne" style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{activeSubject}</h2><p style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "2px 0 0 0" }}>{activeClass} • {Object.keys(chapters).length} Chapters</p></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.keys(chapters).sort().map((ch, idx) => {
            const chapTests = chapters[ch]; const isOpen = activeChapter === ch;
            return (
              <div key={ch} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: isOpen ? C.surfaceAlt : "transparent" }} onClick={() => setActiveChapter(isOpen ? null : ch)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 36, height: 36, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.textMuted }}>{String(idx + 1).padStart(2, '0')}</div>
                    <div><h4 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{ch}</h4><p style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: "uppercase", marginTop: 2 }}>{chapTests.length} Assessments</p></div>
                  </div>
                  <Icon name="arrow_right" size={18} color={C.textMuted} style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.3s" }} />
                </div>
                {isOpen && (
              <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                {chapTests.map(t => {
                  const sColor = { "PUBLISHED": C.green, "DRAFT": C.textMuted, "CLOSED": C.red }[t.status] || C.textMuted;
                  return (
                    <div key={t.testId} onClick={() => { setActionTestId(t.testId); setViewState("test"); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderLeft: `4px solid ${sColor}`, borderRadius: 12, cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.testName}>{t.testName}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginTop: 2 }}>ID: {t.testId} - {t.questionCount} Qs - {t.duration}m - {t.attemptCount} attempts</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: `${sColor}22`, color: sColor, border: `1px solid ${sColor}44` }}>{t.status}</span>
                      <Icon name="arrow_right" size={16} color={C.textMuted} />
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  // Action page of one test: everything for that test in one place (print, attempts, settings, status, delete)
  const renderTestActions = () => {
    const t = tests.find((x) => x.testId === actionTestId);
    const back = () => { setViewState("chapters"); setActionTestId(null); };
    if (!t) return (
      <div className="slide-in card" style={{ textAlign: "center", padding: 30 }}>
        <p style={{ color: C.textMuted, marginBottom: 14 }}>This test is no longer available.</p>
        <button className="btn btn-primary" onClick={back}>Back to chapter</button>
      </div>
    );
    const sColor = { "PUBLISHED": C.green, "DRAFT": C.textMuted, "CLOSED": C.red }[t.status] || C.textMuted;
    const tile = (icon, title, desc, onClick, color, disabled) => (
      <button key={title} className="card" disabled={disabled} onClick={onClick}
        style={{ textAlign: "left", cursor: disabled ? "default" : "pointer", display: "flex", gap: 14, alignItems: "center", padding: 16, border: `1px solid ${color}55`, background: `${color}10`, opacity: disabled ? 0.6 : 1 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={20} color={color} /></div>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{title}</div><div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{desc}</div></div>
      </button>
    );
    const info = (label, value) => (<div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}66`, fontSize: 13 }}><span style={{ color: C.textMuted }}>{label}</span><b style={{ textAlign: "right", overflowWrap: "anywhere" }}>{value ?? "-"}</b></div>);
    return (
      <div className="slide-in pb-10">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, background: C.surfaceAlt, padding: "12px 16px", borderRadius: 16, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" style={{ padding: "8px 12px", background: C.surface }} onClick={back}><Icon name="arrow_right" size={14} style={{ transform: "rotate(180deg)" }} /></button>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 className="syne" style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{t.testName}</h2>
            <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, margin: "2px 0 0 0" }}>{t.classVal} - {t.subject} - {t.chapterName || activeChapter}</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: `${sColor}22`, color: sColor, border: `1px solid ${sColor}44` }}>{t.status}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
          <div className="card">
            <h3 className="syne" style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: C.primary, textTransform: "uppercase" }}>Test details</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}66`, fontSize: 13 }}>
              <span style={{ color: C.textMuted }}>Test ID</span>
              <b style={{ marginLeft: "auto", fontFamily: "monospace" }}>{t.testId}</b>
              <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(t.testId); setCopiedId(true); setTimeout(() => setCopiedId(false), 1500); }}>{copiedId ? "Copied" : "Copy"}</button>
            </div>
            {info("Duration", `${t.duration} min`)}{info("Questions", t.questionCount)}{info("Attempts", t.attemptCount)}{info("Result visibility", t.resultVisibility)}
            <div style={{ paddingTop: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6 }}>STATUS</label>
              <select className="select" style={{ width: "100%", fontWeight: 800, color: sColor }} value={t.status} onChange={(e) => handleStatusChange(t.testId, e.target.value)}>
                <option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option><option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tile("download", "Print question paper", "Open Print Studio for this test (PDF)", () => openPrintWorkspace(t.testId), C.primary, fetchingPaper)}
            {tile("students", `Attempts and reports (${t.attemptCount})`, "Student results, analysis, proctoring and report PDFs", () => openAttemptsModal(t), C.blue)}
            {tile("setup", "Test settings", "Class, duration, result visibility and who can take it", () => openSettingsModal(t), C.yellow)}
            {tile("trash", "Delete test", "Removes this test permanently", () => handleDelete(t.testId), C.red)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="slide-in">
      <SectionHeader title="Test Control Center" sub="Manage Question Banks, Publish Tests & Track Analytics" action={
          <div style={{ display: "flex", gap: 10 }}>
            {/* 🔴 Trigger Print Prompt Modal */}
            <button className="btn btn-ghost" onClick={() => setShowPrintPromptModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="download" size={14} /> Print Paper
            </button>
            <button className="btn btn-primary" onClick={() => setShowWizard(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Create New Test</button>
            <button className="btn btn-ghost" onClick={() => loadTests(false)} style={{ padding: "8px", background: C.surfaceAlt }}><Icon name="attendance" size={16} /></button>
          </div>
        }
      />
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Tests" value={kpis.total} icon="test" color={C.blue} />
        <KpiCard label="Published" value={kpis.published} icon="check" color={C.green} />
        <KpiCard label="Drafts" value={kpis.drafts} icon="edit" color={C.yellow} />
        <KpiCard label="Total Attempts" value={kpis.attempts} icon="students" color={C.purple} />
      </div>

      {viewState === "classes" && renderClasses()}
      {viewState === "subjects" && renderSubjects()}
      {viewState === "chapters" && renderChapters()}
      {viewState === "test" && renderTestActions()}

      {/* ── EXISTING MODALS (Settings, Attempts, Wizard) ── */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Test Configuration" width={460}>
        {selectedTest && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ background: C.surfaceAlt, padding: 16, borderRadius: 12, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 4px 0" }}>{selectedTest.testName}</h4>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>{selectedTest.testId}</p>
            </div>
            <FormGrid cols={2}>
              <FormRow label="Library Class"><input className="input" value={selectedTest.classVal} disabled /></FormRow>
              <FormRow label="Score Visibility">
                <select className="select" value={selectedTest.resultVisibility} onChange={e => setSelectedTest({...selectedTest, resultVisibility: e.target.value})}>
                  <option value="IMMEDIATE">🟢 Immediate</option><option value="HIDDEN">🔴 Hidden</option>
                </select>
              </FormRow>
            </FormGrid>
            <FormGrid cols={2}>
               <FormRow label="Duration (Mins)"><input className="input" type="number" value={selectedTest.duration} onChange={e => setSelectedTest({...selectedTest, duration: e.target.value})} /></FormRow>
               <FormRow label="Global Status">
                <select className="select" value={selectedTest.status} onChange={e => setSelectedTest({...selectedTest, status: e.target.value})}>
                  <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="CLOSED">Closed</option>
                </select>
              </FormRow>
            </FormGrid>
            <FormRow label="Target Audience Access (Visible To)">
                <input className="input" placeholder="e.g. ALL or 9, 10" value={selectedTest.visibleTo} onChange={e => setSelectedTest({...selectedTest, visibleTo: e.target.value})} />
            </FormRow>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>{saving ? "Saving..." : "Save Configuration"}</button>
            </div>
          </div>
        )}
      </Modal>
      {/* 🔴 1. PRINT PROMPT MODAL (If user clicks top button without selecting test) */}
      <Modal open={showPrintPromptModal} onClose={() => setShowPrintPromptModal(false)} title="Print Question Paper" width={400}>
        <div style={{ padding: "10px 0" }}>
          <FormRow label="Enter Test ID">
            <input 
              className="input" 
              placeholder="e.g. T-10-SCI-1234" 
              value={promptTestId} 
              onChange={e => setPromptTestId(e.target.value.toUpperCase())} 
              style={{ fontFamily: "monospace", fontSize: 14, textTransform: "uppercase" }}
            />
          </FormRow>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => setShowPrintPromptModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => openPrintWorkspace(promptTestId)} disabled={fetchingPaper || !promptTestId}>
              {fetchingPaper ? "Locating..." : "Load Paper in Studio"}
            </button>
          </div>
        </div>
      </Modal>

      {/* 🔴 2. ACTUAL PRINT WORKSPACE MODAL (Full Screen) */}
      {printWorkspaceData && (
        <PrintPaperWorkspace 
          testData={printWorkspaceData} 
          school={school} // From App.jsx global state
          onClose={() => setPrintWorkspaceData(null)} 
        />
      )}

      <Modal open={showAttempts} onClose={() => setShowAttempts(false)} title="Student Attempts" width={750}>
        {selectedTest && (
          <div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div>
                   <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{selectedTest.testName}</h3>
                   <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, marginTop: 4 }}>{attemptsData.length} Total Submissions Found</p>
                </div>
                <button className="btn btn-ghost" onClick={() => openAttemptsModal(selectedTest)} disabled={loadingAttempts} style={{padding: "6px", background: C.surfaceAlt}}><Icon name="attendance" size={14} /></button>
             </div>
             
             {loadingAttempts ? (
                <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading Submissions...</div>
             ) : attemptsData.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontWeight: 600 }}>No students have attempted this test yet.</div>
             ) : (
                <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th style={{ textAlign: "center" }}>Submitted At</th>
                        <th style={{ textAlign: "center" }}>Score</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attemptsData.map(a => (
                        <tr key={a._row}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{a.name}</div>
                            <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>UID: {a.uid} | {a.className}</div>
                          </td>
                          <td style={{ textAlign: "center", fontSize: 11, fontWeight: 600 }}>{new Date(a.timestamp).toLocaleString('en-IN', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}</td>
                          <td style={{ textAlign: "center" }}><span style={{ fontSize: 14, fontWeight: 800, color: parseFloat(a.score) >= 33 ? C.green : C.red }}>{a.score}%</span></td>
                          <td style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                             <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 10, background: `${C.blue}15`, color: C.blue }} onClick={() => openAnalysisReport(a)}>Report</button>
                             <button className="btn btn-danger" style={{ padding: "4px 8px" }} onClick={() => deleteAttempt(a._row, selectedTest.testId)}><Icon name="trash" size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             )}
          </div>
        )}
      </Modal>

      {/* 🔴 1. PREMIUM REPORT MODAL 🔴 */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Intelligence Report" width={850}>
        {loadingReport ? (
          <div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary }}>Extracting Question Data...</div>
        ) : activeReport ? (
          <div style={{ padding: "8px 0" }}>
            {/* Header Box */}
            <div style={{ background: `linear-gradient(135deg, ${C.surfaceAlt}, ${C.surface})`, borderRadius: 20, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, border: `1px solid ${C.border}` }}>
              <div>
                <h2 className="syne" style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>{activeReport.student.name}</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, background: C.surface, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}` }}>UID: {activeReport.student.uid}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}22`, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.primary}44` }}>{activeReport.student.className}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                 <div className="syne" style={{ fontSize: 36, fontWeight: 900, color: parseFloat(activeReport.student.score) >= 33 ? C.green : C.red, lineHeight: 1 }}>
                   {activeReport.student.score}%
                 </div>
                 <span style={{ fontSize: 10, fontWeight: 800, color: parseFloat(activeReport.student.score) >= 33 ? C.green : C.red, textTransform: "uppercase", letterSpacing: "1px" }}>
                   {parseFloat(activeReport.student.score) >= 33 ? "Qualified" : "Failed"}
                 </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
               <div style={{ background: `${C.green}11`, border: `1px solid ${C.green}33`, padding: 16, borderRadius: 16, textAlign: "center" }}>
                 <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{activeReport.student.correct}</div>
                 <div style={{ fontSize: 10, fontWeight: 800, color: C.green, textTransform: "uppercase", marginTop: 4 }}>Correct</div>
               </div>
               <div style={{ background: `${C.red}11`, border: `1px solid ${C.red}33`, padding: 16, borderRadius: 16, textAlign: "center" }}>
                 <div style={{ fontSize: 28, fontWeight: 900, color: C.red }}>{activeReport.student.incorrect}</div>
                 <div style={{ fontSize: 10, fontWeight: 800, color: C.red, textTransform: "uppercase", marginTop: 4 }}>Wrong</div>
               </div>
               <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, padding: 16, borderRadius: 16, textAlign: "center" }}>
                 <div style={{ fontSize: 28, fontWeight: 900, color: C.textMuted }}>{activeReport.testData.questions.length - activeReport.student.correct - activeReport.student.incorrect}</div>
                 <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", marginTop: 4 }}>Skipped</div>
               </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
               <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
                 <Icon name="timetable" size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Time Taken: {activeReport.student.timeTaken}
               </div>
               <div style={{ display: "flex", gap: 10 }}>
                 <button className="btn btn-ghost" disabled={reportPdfBusy} onClick={async () => {
                    setReportPdfBusy(true);
                    try {
                      await openGeneratedPdf("/quick-tests/attempt-report", { method: "POST", name: `Report ${activeReport.student.name || "Student"}.pdf`, title: "Student Report", body: { testId: selectedTest?.testId || activeReport.testData?.meta?.testId || activeReport.student.testId, row: activeReport.student._row } });
                    } catch (e) { dialogAlert("Could not create the report: " + explain(e), "Print"); } finally { setReportPdfBusy(false); }
                  }}><Icon name="download" size={14}/> {reportPdfBusy ? "Preparing..." : "Print PDF"}</button>
                 <button className="btn btn-primary" style={{ background: "#0f172a", color: C.green, border: `1px solid ${C.green}55` }} onClick={() => viewProctoringLogs(activeReport.student.proctorUrl)}>
                   <Icon name="eye" size={14}/> View Proctoring
                 </button>
               </div>
            </div>

            {/* Questions Breakdown */}
            <h3 className="syne" style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Response Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 400, overflowY: "auto", paddingRight: 8 }} className="custom-scroll">
               {activeReport.testData.questions.map((q, i) => {
                  const userAns = activeReport.choices[i] || "";
                  const correctAns = String(q.correctAnswer || q.correct || "").trim();
                  const timeSpent = activeReport.timing[i] !== undefined ? activeReport.timing[i] + "s" : "--";
                  
                  const isCorrect = userAns === correctAns;
                  const isSkipped = !userAns;
                  
                  let bgClass = isSkipped ? C.surfaceAlt : (isCorrect ? `${C.green}11` : `${C.red}11`);
                  let borderClass = isSkipped ? C.border : (isCorrect ? `${C.green}55` : `${C.red}55`);
                  let badge = isSkipped ? <span style={{fontSize: 9, background: C.surface, color: C.textMuted, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}`}}>SKIPPED</span> :
                             (isCorrect ? <span style={{fontSize: 9, background: C.green, color: "white", padding: "2px 8px", borderRadius: 4}}>CORRECT</span> :
                                          <span style={{fontSize: 9, background: C.red, color: "white", padding: "2px 8px", borderRadius: 4}}>WRONG</span>);

                  // Extract Options safely
                  let opts = q.options || [];
                  if (!Array.isArray(opts)) opts = Object.values(opts);
                  const optKeys = ['A','B','C','D'];

                  return (
                    <div key={i} style={{ background: bgClass, border: `1px solid ${borderClass}`, borderRadius: 16, padding: 16 }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                           <span style={{ fontSize: 10, fontWeight: 800, color: C.textMuted }}>Q{i+1}</span>
                           <span style={{ fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}22`, padding: "2px 6px", borderRadius: 4 }}>Time: {timeSpent}</span>
                         </div>
                         {badge}
                       </div>
                       <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 16px 0", lineHeight: 1.5 }}>{q.text}</p>
                       
                       {q.image && <img src={q.image} alt="Question" style={{ maxHeight: 150, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 16 }} />}

                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {opts.map((optText, idx) => {
                             if (!optText || optText === "N/A") return null;
                             const isThisCorrect = (optText === correctAns || optKeys[idx] === correctAns);
                             const isThisSelected = (optText === userAns || optKeys[idx] === userAns);
                             
                             let optBg = C.surface;
                             let optBorder = C.border;
                             let optColor = C.text;

                             if (isThisCorrect) { optBg = `${C.green}22`; optBorder = C.green; optColor = C.green; }
                             else if (isThisSelected && !isCorrect) { optBg = `${C.red}22`; optBorder = C.red; optColor = C.red; }

                             return (
                               <div key={idx} style={{ background: optBg, border: `1px solid ${optBorder}`, color: optColor, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                                 <span style={{ opacity: 0.5, fontSize: 10 }}>({optKeys[idx]})</span> {optText}
                               </div>
                             );
                          })}
                       </div>

                       {q.explanation && (
                         <div style={{ marginTop: 16, padding: 12, background: C.surface, borderLeft: `3px solid ${C.yellow}`, borderRadius: "0 8px 8px 0", fontSize: 12, color: C.textMuted }}>
                           <strong style={{ color: C.yellow }}>Explanation:</strong> {q.explanation}
                         </div>
                       )}
                    </div>
                  );
               })}
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.red }}>Failed to load report data.</div>
        )}
      </Modal>

      {/* 🔴 2. PREMIUM PROCTORING SURVEILLANCE MODAL 🔴 */}
      <Modal open={showProctoring} onClose={() => setShowProctoring(false)} title="Security & Surveillance Logs" width={900}>
         <div style={{ background: "#020617", borderRadius: 24, padding: 24, border: "1px solid #1e293b", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #1e293b", paddingBottom: 16 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                 <div style={{ width: 40, height: 40, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.2)", boxShadow: "0 0 15px rgba(16,185,129,0.2)" }}>
                   <Icon name="eye" size={20} />
                 </div>
                 <div>
                   <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", margin: 0 }}>Proctoring Engine</h3>
                   <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                     <span style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%", display: "inline-block" }} className="pulse"></span>
                     <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "2px" }}>Live Sync Active</span>
                   </div>
                 </div>
               </div>
            </div>

            {loadingProctor ? (
               <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                 <div style={{ width: 60, height: 60, border: "4px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%" }} className="pulse"></div>
                 <p style={{ color: "#6366f1", fontSize: 12, fontWeight: 800, marginTop: 16, textTransform: "uppercase", letterSpacing: "3px" }} className="pulse">Decrypting Visual Data...</p>
               </div>
            ) : proctorImages.length === 0 ? (
               <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                 <Icon name="warning" size={48} color="#64748b" />
                 <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 16, textTransform: "uppercase", letterSpacing: "2px" }}>No Surveillance Data Found</p>
               </div>
            ) : (
               <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxHeight: 500, overflowY: "auto", paddingRight: 8 }} className="custom-scroll">
                 {proctorImages.map((b64, i) => (
                    <div key={i} style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #1e293b", aspectRatio: "16/9", background: "black" }}>
                       <img src={b64} alt={`Proctor ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7, transition: "transform 0.5s, opacity 0.5s" }} onMouseEnter={e => {e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.opacity="1"}} onMouseLeave={e => {e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.opacity="0.7"}} />
                       <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#34d399", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 6 }}>
                         <span style={{ width: 6, height: 6, background: "#ef4444", borderRadius: "50%", display: "inline-block" }} className="pulse"></span> REC 00{i+1}
                       </div>
                    </div>
                 ))}
               </div>
            )}
         </div>
      </Modal>

      {/* 3. TEST WIZARD (PLACEHOLDER) */}
            {/* 🔴 FULL-SCREEN TEST CREATOR WIZARD 🔴 */}
        {showWizard && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, display: "flex", flexDirection: "column", animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          
          {/* Header Bar */}
          <div style={{ padding: "16px 24px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button className="btn btn-ghost" style={{ padding: "8px" }} onClick={() => { setShowWizard(false); setWizardStep(1); setRawCode(""); }}>
                <Icon name="close" size={20} />
              </button>
              <div>
                <h2 className="syne" style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>Assessment Creator</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {[1, 2, 3].map(s => (
                    <span key={s} style={{ width: 30, height: 4, borderRadius: 2, background: wizardStep >= s ? C.primary : C.border, transition: "background 0.3s" }} />
                  ))}
                </div>
              </div>
            </div>
            {wizardStep === 3 && (
              <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", fontSize: 14, boxShadow: "0 4px 15px rgba(232,96,10,0.3)" }} onClick={handleFinalUpload} disabled={saving}>
                {saving ? (
                  <>
                    {/* 🔴 NEW: Premium SVG Spinner */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                      </path>
                    </svg>
                    Publishing Database...
                  </>
                ) : (
                  "Publish & Finalize Test"
                )}
              </button>
            )}

          </div>

          {/* STEP 1: Select Method */}
          {wizardStep === 1 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
              <h3 className="syne" style={{ fontSize: 24, fontWeight: 800, marginBottom: 40, color: C.text }}>How would you like to build this test?</h3>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
                
                <div style={{ background: C.surface, border: `2px solid ${C.primary}55`, borderRadius: 24, padding: 32, width: 300, cursor: "pointer", transition: "transform 0.2s, boxShadow 0.2s", position: "relative", overflow: "hidden" }} 
                     onMouseEnter={e => {e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.boxShadow=`0 15px 30px ${C.primary}22`;}} 
                     onMouseLeave={e => {e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none";}}
                     onClick={() => { setWizardMethod('code'); setWizardStep(2); }}>
                  <span style={{ position: "absolute", top: 0, right: 0, background: C.primary, color: "white", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderBottomLeftRadius: 16 }}>FASTEST</span>
                  <div style={{ width: 60, height: 60, background: `${C.primary}22`, color: C.primary, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Icon name="setup" size={30} />
                  </div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: "0 0 8px 0" }}>JS Code Parser</h4>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>Paste raw `testDetails` and `mockQuestions` arrays directly from your editor. Auto-extracts metadata & structure.</p>
                </div>

                <div style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, padding: 32, width: 300, cursor: "pointer", transition: "transform 0.2s", position: "relative", overflow: "hidden" }}
                     onMouseEnter={e => {e.currentTarget.style.borderColor=C.yellow; e.currentTarget.style.transform="translateY(-5px)";}} 
                     onMouseLeave={e => {e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="none";}}>
                  <span style={{ position: "absolute", top: 0, right: 0, background: C.yellow, color: C.bg, fontSize: 10, fontWeight: 800, padding: "4px 12px", borderBottomLeftRadius: 16 }}>AI BETA</span>
                  <div style={{ width: 60, height: 60, background: `${C.yellow}22`, color: C.yellow, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Icon name="eye" size={30} />
                  </div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: "0 0 8px 0" }}>Smart OCR (PDF/IMG)</h4>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>Upload question papers. AI will auto-detect MCQs, text, and descriptive blocks. <br/><i>(Coming Soon)</i></p>
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: JS Code Input (Hacker Theme) */}
          {wizardStep === 2 && wizardMethod === 'code' && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, background: "#020617" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                 <div style={{ color: C.primary, fontSize: 12, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="pulse" style={{width:8, height:8, background:C.primary, borderRadius:"50%"}}></span> Awaiting Injection...
                 </div>
                 <button className="btn btn-primary" onClick={processJSCode} style={{ background: C.green, color: "white", boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}>
                   Parse & Execute Array <Icon name="arrow_right" size={14} style={{display:"inline", marginLeft:6}}/>
                 </button>
              </div>
              <textarea 
                 value={rawCode} 
                 onChange={e => setRawCode(e.target.value)} 
                 placeholder="// Paste const testDetails = {...}; and const mockQuestions = [...]; here..."
                 style={{ flex: 1, width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 24, color: "#10b981", fontFamily: "monospace", fontSize: 14, outline: "none", resize: "none", boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)" }}
              />
            </div>
          )}

          {/* STEP 3: Review & Edit (Split Screen) */}
          {wizardStep === 3 && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              
              {/* Left Panel: Meta Settings */}
              <div style={{ width: 350, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: 24 }} className="custom-scroll">
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: "uppercase", marginBottom: 20, letterSpacing: "1px" }}>Metadata Setup</h3>
                
                <FormRow label="Test ID / Code (Unique)"><input className="input" value={testMeta.testId} onChange={e => setTestMeta({...testMeta, testId: e.target.value})} style={{ fontFamily: "monospace", color: C.yellow, background: "#0f172a" }}/></FormRow>
                <FormRow label="Test Title"><input className="input" value={testMeta.testName} onChange={e => setTestMeta({...testMeta, testName: e.target.value})} /></FormRow>
                <FormRow label="Target Class"><input className="input" value={testMeta.classVal} onChange={e => setTestMeta({...testMeta, classVal: e.target.value})} /></FormRow>
                <FormRow label="Subject"><input className="input" value={testMeta.subject} onChange={e => setTestMeta({...testMeta, subject: e.target.value})} /></FormRow>
                <FormGrid cols={2}>
                   <FormRow label="Ch No."><input className="input" value={testMeta.chapterNo} onChange={e => setTestMeta({...testMeta, chapterNo: e.target.value})} /></FormRow>
                   <FormRow label="Time (Mins)"><input className="input" type="number" value={testMeta.duration} onChange={e => setTestMeta({...testMeta, duration: e.target.value})} /></FormRow>
                </FormGrid>
                <FormRow label="Chapter Name"><input className="input" value={testMeta.chapterName} onChange={e => setTestMeta({...testMeta, chapterName: e.target.value})} /></FormRow>
                
                <div style={{ marginTop: 24, padding: 16, background: `${C.blue}11`, borderRadius: 12, border: `1px solid ${C.blue}33` }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.blue }}>{parsedQuestions.length}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "1px" }}>Questions Parsed</div>
                </div>
              </div>

                            {/* Right Panel: Question Editor List */}
              <div style={{ flex: 1, background: C.bg, overflowY: "auto", padding: "24px 40px", position: "relative" }} className="custom-scroll">
                
                {/* 🔴 NEW: Premium Blur Overlay When Uploading */}
                {saving && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,23,0.7)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                      </path>
                    </svg>
                    <h3 className="syne" style={{ color: "white", marginTop: 16, fontSize: 18 }}>Encrypting & Publishing Data...</h3>
                    <p style={{ color: C.textMuted, fontSize: 12 }}>Please do not close this window.</p>
                  </div>
                )}

                {parsedQuestions.map((q, i) => {

                   
                   // Dynamic Badges
                   const typeColors = { MCQ: C.blue, TF: C.purple, FIB: C.yellow, DESC: C.green };
                   const tColor = typeColors[q.type] || C.textMuted;

                   return (
                     <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20, position: "relative", transition: "border 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = C.primary} onBlur={e => e.currentTarget.style.borderColor = C.border}>
                        
                        {/* Header Row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                             <span style={{ background: C.surfaceAlt, color: C.textMuted, fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 8 }}>Q {i + 1}</span>
                             <select className="select" value={q.type} onChange={(e) => updateParsedQuestion(i, 'type', e.target.value)} style={{ background: `${tColor}11`, color: tColor, border: `1px solid ${tColor}44`, fontWeight: 800, fontSize: 10, padding: "4px 10px", width: "auto" }}>
                                <option value="MCQ">Multiple Choice</option>
                                <option value="TF">True / False</option>
                                <option value="FIB">Fill in Blanks</option>
                                <option value="DESC">Descriptive</option>
                             </select>
                           </div>
                           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                             <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Marks:</span>
                             <input type="number" className="input" value={q.marks} onChange={e => updateParsedQuestion(i, 'marks', parseFloat(e.target.value))} style={{ width: 60, padding: "4px 8px", textAlign: "center", fontWeight: 800, color: C.primary, background: `${C.primary}11`, border: "none" }} />
                             <button style={{ background: "none", border: "none", color: C.red, cursor: "pointer", marginLeft: 8 }} onClick={() => setParsedQuestions(prev => prev.filter((_, idx) => idx !== i))}><Icon name="trash" size={16} /></button>
                           </div>
                        </div>

                        {/* Question Text */}
                        <textarea className="input" value={q.text} onChange={e => updateParsedQuestion(i, 'text', e.target.value)} placeholder="Type question here..." style={{ width: "100%", minHeight: 60, fontSize: 14, fontWeight: 600, marginBottom: 16, resize: "vertical" }} />

                        {/* Dynamic Render based on Type */}
                        <div style={{ padding: 16, background: C.surfaceAlt, borderRadius: 12, border: `1px solid ${C.border}` }}>
                          
                          {/* MCQ View */}
                          {q.type === 'MCQ' && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              {[0, 1, 2, 3].map(optIdx => (
                                 <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                   <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === q.options[optIdx] && q.options[optIdx] !== ""} onChange={() => updateParsedQuestion(i, 'correctAnswer', q.options[optIdx])} style={{ accentColor: C.green, width: 16, height: 16 }} />
                                   <input className="input" value={q.options[optIdx]} onChange={(e) => {
                                      const newOpts = [...q.options]; newOpts[optIdx] = e.target.value;
                                      updateParsedQuestion(i, 'options', newOpts);
                                   }} placeholder={`Option ${String.fromCharCode(65+optIdx)}`} style={{ flex: 1, fontSize: 12, background: q.correctAnswer === q.options[optIdx] && q.options[optIdx] !== "" ? `${C.green}11` : C.surface }} />
                                 </div>
                              ))}
                            </div>
                          )}

                          {/* True/False View */}
                          {q.type === 'TF' && (
                            <div style={{ display: "flex", gap: 16 }}>
                              {['True', 'False'].map(opt => (
                                 <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: q.correctAnswer === opt ? `${C.green}22` : C.surface, border: `1px solid ${q.correctAnswer === opt ? C.green : C.border}`, padding: "8px 16px", borderRadius: 8, fontWeight: 700, color: q.correctAnswer === opt ? C.green : C.text }}>
                                   <input type="radio" name={`correct-tf-${i}`} checked={q.correctAnswer === opt} onChange={() => updateParsedQuestion(i, 'correctAnswer', opt)} style={{ accentColor: C.green }} /> {opt}
                                 </label>
                              ))}
                            </div>
                          )}

                          {/* Fill in Blanks View */}
                          {q.type === 'FIB' && (
                             <div>
                               <label style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 6, display: "block" }}>Exact Answer (Case Insensitive)</label>
                               <input className="input" value={q.correctAnswer} onChange={e => updateParsedQuestion(i, 'correctAnswer', e.target.value)} placeholder="e.g. Mitochondria" style={{ width: "100%", background: C.surface, color: C.green, fontWeight: 800 }} />
                             </div>
                          )}

                          {/* Descriptive View */}
                          {q.type === 'DESC' && (
                             <div>
                               <label style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 6, display: "block" }}>Model Answer / Key Points</label>
                               <textarea className="input" value={q.explanation} onChange={e => updateParsedQuestion(i, 'explanation', e.target.value)} placeholder="Teacher reference answer..." style={{ width: "100%", minHeight: 80, resize: "vertical", background: C.surface }} />
                             </div>
                          )}
                        </div>

                        {/* Global Explanation (Skip for DESC as it uses it as model answer) */}
                        {q.type !== 'DESC' && (
                          <div style={{ marginTop: 12 }}>
                            <input className="input" value={q.explanation} onChange={e => updateParsedQuestion(i, 'explanation', e.target.value)} placeholder="Explanation (Optional)" style={{ width: "100%", fontSize: 11, border: "none", borderBottom: `1px dashed ${C.border}`, background: "transparent", padding: "4px 0" }} />
                          </div>
                        )}

                     </div>
                   );
                })}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
