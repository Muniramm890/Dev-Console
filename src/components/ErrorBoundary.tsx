// @ts-nocheck
import React from "react";

// Koi component render me crash kare to poori screen blank hone ki jagah
// ek chhota error card dikhta hai (sidebar/topbar chalte rehte hain).
// `resetKeys` badalne par (jaise module ya session badalne par) boundary khud reset ho jati hai.
export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", this.props.label || "", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (!this.state.error) return;
    const a = prevProps.resetKeys || [];
    const b = this.props.resetKeys || [];
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const full = this.props.fullscreen;
    return (
      <div
        style={{
          padding: full ? 40 : 28,
          margin: full ? "15vh auto 0" : "24px auto",
          maxWidth: 520,
          textAlign: "center",
          borderRadius: 16,
          border: "1px solid rgba(239,68,68,0.35)",
          background: "rgba(239,68,68,0.06)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Something went wrong on this screen</div>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 16, wordBreak: "break-word" }}>
          {String(error?.message || error)}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>Try again</button>
          {full && <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload page</button>}
        </div>
      </div>
    );
  }
}
