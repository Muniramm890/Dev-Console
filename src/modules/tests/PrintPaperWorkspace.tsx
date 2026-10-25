// FILE: teacher-app/src/modules/tests/PrintPaperWorkspace.tsx
// Source: admin App.tsx -> PrintPaperWorkspace [21157-21570]
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { loadMathJax } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// NEW MODULE: PRINT PAPER WORKSPACE (Smart A4 Generator)
// ═══════════════════════════════════════════════════════════════
export const PrintPaperWorkspace = ({ testData, school, onClose }) => {
  // 1. Core States
  const [printQs, setPrintQs] = useState([]);
  const [instructions, setInstructions] = useState([
    "All questions are compulsory.",
    "Read the instructions carefully before answering.",
    "Write neatly and legibly in the space provided."
  ]);
  const [sections, setSections] = useState([
    { id: 'A', title: 'Objective Type Questions' },
    { id: 'B', title: 'Short Answer Questions' },
    { id: 'C', title: 'Long / Descriptive Questions' },
    { id: 'D', title: 'Miscellaneous' }
  ]);
  
  // 2. Paper Settings States
  const [theme, setTheme] = useState("board");
  const [mode, setMode] = useState("paper"); // 'paper' | 'worksheet'
  const [lineMultiplier, setLineMultiplier] = useState(3); // 1 mark = X lines

  // Fix: overflow:auto containers default scroll position to the LEFT edge, so a
  // centered (margin:auto) child wider than the panel gets its left half clipped
  // while empty space shows on the right. Force scroll to true center on mount/resize.
  const rightPanelRef = useRef(null);
  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    const centerScroll = () => { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; };
    centerScroll();
    window.addEventListener("resize", centerScroll);
    return () => window.removeEventListener("resize", centerScroll);
  }, []);

  // 3. Initialize Data & Map Default Sections
  useEffect(() => {
    if (testData?.questions) {
      const mapped = testData.questions.map((q, i) => {
        // Auto-assign default section based on type or marks
        let defaultSec = 'A';
        let qType = 'MCQ';
        
        // 🔴 FIX: Extract Type from ID because GAS appends it at the end
        if (q.id && q.id.includes('_')) {
          const parts = q.id.split('_');
          qType = parts[parts.length - 1].toUpperCase();
        } else if (q.type || q.qType) {
          qType = String(q.type || q.qType).toUpperCase();
        }

        if (qType === 'DESC' || qType === 'DESCRIPTIVE') {
          defaultSec = (q.marks || 1) >= 4 ? 'C' : 'B';
        } else if (qType === 'FIB' || qType === 'TF') {
          defaultSec = 'A';
        }
        
        return { 
          ...q, 
          qType: qType, // Save extracted type for rendering
          _printId: i, 
          printSection: defaultSec, 
          customLines: (q.marks || 1) * lineMultiplier 
        };
      });
      setPrintQs(mapped);
    }
  }, [testData]); // eslint-disable-line

   // 4. Trigger MathJax for rendering Equations 
  useEffect(() => {
    let timer;
    loadMathJax().then(() => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        timer = setTimeout(() => {
          const container = document.getElementById('a4-preview-container');
          if (container) {
            window.MathJax.typesetPromise([container]).catch(err => console.log("MathJax Error:", err));
          }
        }, 500); 
      }
    });
    return () => clearTimeout(timer);
  }, [printQs, instructions, sections, theme, mode]);


  // 5. Handlers

  const handlePrint = () => {
    const originalTitle = document.title;
    const sanitize = (s) => String(s || "").trim().replace(/[^a-zA-Z0-9]+/g, "_");
    const parts = [
      sanitize(testData?.meta?.testId),
      sanitize(testData?.meta?.subject),
      sanitize(testData?.meta?.classVal || testData?.meta?.className),
      sanitize(testData?.meta?.testName || "QuestionPaper"),
    ].filter(Boolean);
    document.title = parts.join("_") || "QuestionPaper";
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  };

  const updateQSection = (idx, newSec) => {
    setPrintQs(prev => prev.map((q, i) => i === idx ? { ...q, printSection: newSec } : q));
  };

  const updateQLines = (idx, lines) => {
    setPrintQs(prev => prev.map((q, i) => i === idx ? { ...q, customLines: parseInt(lines) || 0 } : q));
  };

  // 6. Theme Engine
  const THEMES = {
    standard: {
      wrap: { border: "1px solid #000", padding: 24 },
      head: { borderBottom: "1px solid #000" },
    },
    board: {
      wrap: { border: "5px double #000", padding: 24 },
      head: { borderBottom: "3px solid #000" },
    },
    premium: {
      wrap: { border: "2px solid #312e81", borderRadius: 16, padding: 24 },
      head: { borderBottom: "2px solid #312e81", color: "#312e81" },
    },
    minimal: {
      wrap: { padding: 24 },
      head: { borderBottom: "1px solid #cbd5e1" },
    },
  };
  const activeTheme = THEMES[theme];

  const schoolNameLen = (school?.name || "").length;
  const schoolNameFontSize =
    schoolNameLen > 45 ? "13pt" :
    schoolNameLen > 32 ? "16pt" :
    schoolNameLen > 22 ? "19pt" : "24pt";

  const contactLine = [school?.website, school?.email, school?.phone]
    .filter(Boolean)
    .join("   |   ");

  return (
    <div id="a4-outer-fullscreen" className="slide-in" style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* 🔴 PRINT CSS INJECTION 🔴 */}
      <style>{`
        .a4-shadow { box-shadow: 0 0 25px rgba(0,0,0,0.3); }
        .lines-bg { background-image: repeating-linear-gradient(transparent, transparent 27px, #cbd5e1 28px); }
        @media print {
          body * { visibility: hidden; }
          #a4-print-zone, #a4-print-zone * { visibility: visible; }
          #a4-print-zone { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: white; }
          @page { size: A4 portrait; margin: 10mm; }
          .no-print { display: none !important; }
          #a4-outer-fullscreen { position: static !important; height: auto !important; display: block !important; }
          #a4-split-row { position: static !important; overflow: visible !important; height: auto !important; display: block !important; }
          #a4-right-panel { position: static !important; overflow: visible !important; height: auto !important; padding: 0 !important; background: white !important; display: block !important; }
          #a4-watermark { position: fixed !important; inset: 0 !important; }
          #a4-preview-container {
            -webkit-box-decoration-break: clone !important;
            box-decoration-break: clone !important;
          }
        }
      `}</style>

      {/* TOP HEADER */}
      <div className="no-print" style={{ padding: "12px 24px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "8px 12px", background: C.surfaceAlt }}>
            <Icon name="close" size={16} /> Close Studio
          </button>
          <div>
            <h2 className="syne" style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Print Studio</h2>
            <p style={{ fontSize: 11, color: C.primary, fontWeight: 700, margin: 0, textTransform: "uppercase" }}>{testData?.meta?.testName || 'Question Paper'}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
          <Icon name="download" size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* SPLIT SCREEN WORKSPACE */}
      <div id="a4-split-row" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* LEFT PANEL: CONTROLS */}
        <div className="no-print custom-scroll" style={{ width: 420, background: C.surfaceAlt, borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: 24 }}>
          
          <div style={{ background: C.surface, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: "uppercase", marginBottom: 12 }}>1. Paper Settings</h3>
            <FormRow label="Design Theme">
              <select className="select" value={theme} onChange={e => setTheme(e.target.value)}>
                <option value="board">CBSE Board (Double Border)</option>
                <option value="standard">Standard (Single Line)</option>
                <option value="premium">Premium (Rounded Indigo)</option>
                <option value="minimal">Minimal (No Border)</option>
              </select>
            </FormRow>
            <FormRow label="Format Mode">
              <select className="select" value={mode} onChange={e => setMode(e.target.value)}>
                <option value="paper">Compact Question Paper</option>
                <option value="worksheet">Worksheet (With Answer Spaces)</option>
              </select>
            </FormRow>

            {mode === 'worksheet' && (
              <div style={{ padding: "12px 0 0 0", marginTop: 12, borderTop: `1px solid ${C.border}66` }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Blank Lines per Mark</label>
                <input type="range" min="1" max="10" value={lineMultiplier} onChange={e => {
                  const val = Number(e.target.value);
                  setLineMultiplier(val);
                  setPrintQs(prev => prev.map(q => ({...q, customLines: (q.marks||1) * val})));
                }} style={{ width: "100%", accentColor: C.primary }} />
                <div style={{ textAlign: "right", fontSize: 11, fontWeight: 800, color: C.primary }}>{lineMultiplier} Lines / Mark</div>
              </div>
            )}
          </div>

          <div style={{ background: C.surface, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: "uppercase", marginBottom: 12 }}>2. General Instructions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {instructions.map((inst, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input className="input" value={inst} onChange={e => {
                    const newI = [...instructions]; newI[i] = e.target.value; setInstructions(newI);
                  }} style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} />
                  <button className="btn btn-danger" style={{ padding: "6px 8px" }} onClick={() => setInstructions(instructions.filter((_, idx) => idx !== i))}><Icon name="trash" size={14}/></button>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: "6px" }} onClick={() => setInstructions([...instructions, ""])}>+ Add Instruction</button>
            </div>
          </div>

          <div style={{ background: C.surface, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: "uppercase", marginBottom: 12 }}>3. Question Relocator</h3>
            <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 12 }}>Change the section or adjust the blank space for any specific question.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto", paddingRight: 4 }} className="custom-scroll">
              {printQs.map((q, i) => (
                <div key={i} style={{ background: C.surfaceAlt, padding: 12, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Q{i+1}: {q.text}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select className="select" value={q.printSection} onChange={e => updateQSection(i, e.target.value)} style={{ flex: 1, fontSize: 10, padding: "4px 8px" }}>
                      {sections.map(s => <option key={s.id} value={s.id}>Move to Section {s.id}</option>)}
                    </select>
                    {mode === 'worksheet' && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, padding: "0 8px", borderRadius: 6, border: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: C.textMuted }}>LINES:</span>
                        <input type="number" min="0" value={q.customLines} onChange={e => updateQLines(i, e.target.value)} style={{ width: 30, background: "transparent", border: "none", color: C.text, fontSize: 11, fontWeight: 800, outline: "none", textAlign: "center", padding: 0 }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE A4 PREVIEW */}
        <div id="a4-right-panel" ref={rightPanelRef} style={{ flex: 1, background: "#94a3b8", overflow: "auto", padding: "40px 20px" }} className="custom-scroll">
          
          <div id="a4-print-zone" className="a4-shadow" style={{ width: "210mm", minWidth: "210mm", margin: "0 auto", minHeight: "297mm", background: "white", color: "black", boxSizing: "border-box", fontFamily: "'Times New Roman', Times, serif" }}>
            <div id="a4-preview-container" style={{ minHeight: "100%", boxSizing: "border-box", position: "relative", ...activeTheme.wrap }}>
              
              {/* WATERMARK */}
               {school.watermark_url || school.logo_url ? (
                <div id="a4-watermark" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.04, pointerEvents: "none", zIndex: 0 }}>
                    <img src={school.watermark_url || school.logo_url} style={{ width: "60%", objectFit: "contain" }} alt="" />
                </div>
              ) : null}

              {/* HEADER (Uses Local SaaS School Data) */}
              <div style={{ paddingBottom: 16, marginBottom: 20, position: "relative", zIndex: 10, ...activeTheme.head }}>
                <div style={{ textAlign: "right", fontSize: "9pt", fontWeight: "bold", color: "#475569", marginBottom: 4 }}>
                  TEST CODE: {testData?.meta?.testId || 'T-XXX'}
                </div>
                
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  {school.logo_url ? (
                    <img src={school.logo_url} style={{ width: 70, height: 70, objectFit: "contain", flexShrink: 0 }} alt="Logo" />
                  ) : (
                    <div style={{ width: 70, height: 70, flexShrink: 0, borderRadius: "50%", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20pt", fontWeight: 900 }}>
                      {(school?.name || "S")[0]}
                    </div>
                  )}
                  <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
                    <h1 style={{ fontSize: schoolNameFontSize, fontWeight: 900, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {school.name}
                    </h1>
                    <div style={{ fontSize: "9.5pt", fontWeight: 700, marginTop: 6, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                      {school.tagline || 'Education For Excellence'}
                    </div>
                    {(school.address_line1 || school.city) && (
                      <div style={{ fontSize: "8pt", fontWeight: 500, marginTop: 3, color: "#334155" }}>
                        {[school.address_line1, school.city, school.state, school.pincode].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {contactLine && (
                      <div style={{ fontSize: "8pt", fontWeight: 600, marginTop: 2, color: "#334155" }}>
                        {contactLine}
                      </div>
                    )}
                  </div>
                  <div style={{ width: 70, height: 70, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    {(school.affiliation_board || school.affiliation_no) && (
                      <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#475569", lineHeight: 1.3 }}>
                        {school.affiliation_board && <div>{school.affiliation_board}</div>}
                        {school.affiliation_no && <div>{school.affiliation_no}</div>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: 16, fontWeight: 800, fontSize: "14pt", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {testData?.meta?.testName || 'Assessment Paper'}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: "11pt", fontWeight: "bold", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "6px 0" }}>
                  <div style={{ flex: 1, whiteSpace: "nowrap" }}>
                    Class: {String(testData?.meta?.classVal || testData?.meta?.className || '_____').replace(/^class\s*/i, '')}
                  </div>
                  <div style={{ flex: 1, whiteSpace: "nowrap", textAlign: "center" }}>
                    Subject: {testData?.meta?.subject || '_____'}
                  </div>
                  <div style={{ flex: 1, whiteSpace: "nowrap", textAlign: "center" }}>
                    Time: {testData?.meta?.duration || '--'} Mins
                  </div>
                  <div style={{ flex: 1, whiteSpace: "nowrap", textAlign: "right" }}>
                    M.M.: {testData?.questions?.reduce((sum, q) => sum + (Number(q.marks) || 1), 0) || 0}
                  </div>
                </div>
              </div>

              {/* INSTRUCTIONS */}
              {instructions.filter(i => i.trim()).length > 0 && (
                <div style={{ marginBottom: 24, fontSize: "11pt", position: "relative", zIndex: 10 }}>
                  <div style={{ fontWeight: "bold", marginBottom: 6, fontStyle: "italic" }}>General Instructions:</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {instructions.filter(i => i.trim()).map((inst, i) => <li key={i} style={{ marginBottom: 4 }}>{inst}</li>)}
                  </ul>
                </div>
              )}

              {/* QUESTIONS BY SECTION */}
              <div style={{ fontSize: "12pt", position: "relative", zIndex: 10 }}>
                {sections.map(sec => {
                  // Filter printQs mapped to this section
                  const secQs = printQs.filter(q => q.printSection === sec.id);
                  if (secQs.length === 0) return null;

                  return (
                    <div key={sec.id} style={{ marginBottom: 24 }}>
                     <div style={{ textAlign: "center", fontWeight: 900, fontSize: "12pt", margin: "20px 0 16px 0", textTransform: "uppercase", background: "#f1f5f9", padding: "6px", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", pageBreakAfter: "avoid", breakAfter: "avoid" }}>
                        SECTION {sec.id} <span style={{ fontSize: "10pt", fontWeight: "bold", marginLeft: 8 }}>({sec.title})</span>
                      </div>
                      
                      {secQs.map((q, idx) => (               
                         <div key={idx} style={{ marginBottom: mode === 'worksheet' ? 12 : 16, pageBreakInside: "avoid" }}>

                          <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ fontWeight: "bold", width: 35, fontSize: "12pt" }}>Q.{q._printId + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <div style={{ flex: 1, paddingRight: 20, whiteSpace: "pre-wrap", lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: q.text.replace(/___+/g, '_____________') }}></div>
                                <div style={{ fontWeight: "bold", whiteSpace: "nowrap", fontSize: "11pt" }}>[{q.marks || 1}]</div>
                              </div>
                              
                              {q.image && <img src={q.image} style={{ maxHeight: 160, display: "block", marginBottom: 12, border: "1px solid #ccc" }} alt="Question Graphic" />}

                              {String(q.type || q.qType).toUpperCase() === 'MCQ' && q.options && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 12, fontSize: "11pt" }}>
                                  {q.options.map((opt, oIdx) => opt && opt !== "N/A" ? (
                                    <div key={oIdx} style={{ display: "flex", gap: 8 }}>
                                      <span style={{ fontWeight: "bold" }}>({String.fromCharCode(65+oIdx)})</span>
                                      <span dangerouslySetInnerHTML={{ __html: opt }}></span>
                                    </div>
                                  ) : null)}
                                </div>
                              )}

                              {String(q.type || q.qType).toUpperCase() === 'TF' && (
                                <div style={{ fontWeight: "bold", color: "#555", marginBottom: 12, fontSize: "11pt" }}>( True / False )</div>
                              )}
                            </div>
                          </div>

                          {/* DYNAMIC WORKSHEET SPACING */}
                          {mode === 'worksheet' && q.customLines > 0 && (
                            <div className="lines-bg" style={{ 
                              width: "100%", 
                              height: q.customLines * 28, // 28px height per ruled line
                              border: "1px solid #94a3b8", 
                              borderRadius: 4, 
                              marginBottom: 16,
                              marginTop: 8
                            }}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* FOOTER */}
              <div style={{ textAlign: "center", marginTop: 40, borderTop: "1.5px solid black", paddingTop: 10, fontWeight: "bold", fontSize: "10pt", position: "relative", zIndex: 10 }}>
                *** END OF QUESTION PAPER ***
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
