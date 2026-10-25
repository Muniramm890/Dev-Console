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
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};
