// FILE: teacher-app/src/pages/Login.tsx
// Source: admin App.tsx -> LoginPage (signup removed, see comments marked [teacher-app])
// @ts-nocheck
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../theme/theme";
import { BrandLogo, Mark } from "../components/ui/BrandLogo";
import { ForgotPassword } from "./ForgotPassword";

export const LoginPage = () => {
  const { login } = useAuth();
  // [teacher-app] removed: isSignup state (school signup is admin-only)
  const [isForgot, setIsForgot] = useState(false); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: "fixed",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `${C.primary}15`,
          pointerEvents: "none",
          filter: "blur(60px)",
        }}
      />

      {/* 🔴 Toggle between Views */}
      {/* [teacher-app] removed: MultiStepSignup branch */}
      {isForgot ? (
        <ForgotPassword onBackToLogin={() => setIsForgot(false)} />
      ) : (
        <div
          className="slide-in"
          style={{
            width: "100%",
            maxWidth: 420,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            padding: 36,
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
              <BrandLogo size={78} />
            </div>
            <h1
              className="syne"
              style={{
                fontSize: 26,
                fontWeight: 900,
                margin: 0,
                letterSpacing: "0.5px",
              }}
            >
              <span style={{ color: "#F4F6FB" }}>School</span>
              <span style={{ color: "#E8600A" }}>Office</span>
            </h1>
            <p
              style={{
                color: C.textMuted,
                fontSize: 13,
                marginTop: 6,
                marginBottom: 0,
                fontWeight: 500,
                letterSpacing: "0.5px",
              }}
            >
              Smart ERP for Smart Schools
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.textMuted,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sunriseschool.edu"
                style={{
                  width: "100%",
                  background: C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: C.text,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.primary)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.textMuted,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "11px 44px 11px 14px",
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.primary)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.textMuted,
                    fontSize: 14,
                    padding: 0,
                  }}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
              {/* 🔴 Forgot Password Link (इनपुट के ठीक नीचे) */}
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsForgot(true)} 
                  style={{
                    background: "none",
                    border: "none",
                    color: C.primary,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: `${C.red}15`,
                  border: `1px solid ${C.red}33`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  color: C.red,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? C.primaryDark : C.primary,
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? "⏳ Signing in..." : "→ Sign In"}
            </button>
          </form>

          {/* [teacher-app] removed: 'Not registered yet? Create Account' link (admin-only) */}
        </div>
      )}

      {/* 🔴 Powered By Footer — subtle platform credit, outside the card */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 5,
          opacity: 0.85,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 14,
            background: "rgba(11,18,36,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(6px)",
          }}
        >
          <Mark size={26} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              <span style={{ color: "#F4F6FB" }}>School</span>
              <span style={{ color: "#E8600A" }}>Office</span>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 9,
                color: "#8891A8",
                marginTop: 2,
              }}
            >
              smart ERP for Smart Schools
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
