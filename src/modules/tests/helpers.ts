// FILE: teacher-app/src/modules/tests/helpers.ts
// Source: admin App.tsx -> loadMathJax [21133-21152]
// @ts-nocheck

// ═══════════════════════════════════════════════════════════════
// MATHJAX LOADER (For dynamically rendering LaTeX Math Equations)
// ═══════════════════════════════════════════════════════════════

export const loadMathJax = () => {
  return new Promise((resolve) => {
    if (window.MathJax && window.MathJax.typesetPromise) return resolve();
    
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
      },
      startup: { typeset: false },
    };
    
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"; // pinned version + integrity: a changed/hijacked file will not run
    script.integrity = "sha384-Wuix6BuhrWbjDBs24bXrjf4ZQ5aFeFWBuKkFekO2t8xFU0iNaLQfp2K6/1Nxveei";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};
