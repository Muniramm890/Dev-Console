// FILE: teacher-app/src/pages/ForgotPassword.tsx
// Source: admin App.tsx -> ForgotPassword (+ premiumInputStyle/handleFocus/handleBlur helpers it uses)
// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { apiRequest } from "../api/client";
import { C } from "../theme/theme";

const premiumInputStyle = {
  width: "100%",
  background: "#1A1D27",
  border: "1.5px solid #2D3250",
  borderRadius: "12px",
  padding: "14px 18px",
  color: "#E8EAF6",
  fontSize: "14px",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.3s ease",
  fontFamily: "'DM Sans', sans-serif",
};


const handleFocus = (e) => {
  e.target.style.borderColor = "#E8600A";
  e.target.style.boxShadow = "0 0 0 4px rgba(232, 96, 10, 0.15)";
};
const handleBlur = (e) => {
  e.target.style.borderColor = "#2D3250";
  e.target.style.boxShadow = "none";
};

export const ForgotPassword = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("email"); // 🔴 'email' or 'whatsapp'
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState(""); // 🔴 Token from verification
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  // 6-Box OTP State & Refs
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-verify OTP when 6 digits are entered
  useEffect(() => {
    const otpValue = otp.join("");
    if (otpValue.length === 6 && step === 2 && !loading) {
      handleVerifyOtp(otpValue);
    }
  }, [otp]); // eslint-disable-line

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== "" && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) return setError(`Please enter your ${method === "email" ? "email" : "WhatsApp number"}.`);
    setError("");
    setLoading(true);
    try {
      // 🟢 Send OTP with selected method
      await apiRequest("/auth/forgot-password/send-otp", "POST", { 
        identifier: identifier.trim(),
        method: method
      });
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue) => {
    setError("");
    setLoading(true);
    try {
      // 🟢 Verify OTP and capture the resetToken
      const res = await apiRequest("/auth/forgot-password/verify-otp", "POST", { 
        identifier: identifier.trim(), 
        otp: otpValue 
      });
      setResetToken(res.resetToken); // Store token for next step
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    setError("");
    setLoading(true);
    try {
      // 🟢 Final Reset using the resetToken
      await apiRequest("/auth/forgot-password/reset", "POST", { 
        resetToken: resetToken,
        newPassword: newPassword 
      });
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slide-in" style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 36, boxShadow: "0 25px 60px rgba(0,0,0,0.5)", position: "relative", zIndex: 10 }}>
      
      {/* Dynamic Header */}
      {step < 4 && (
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>{step === 1 ? "🔐" : step === 2 ? "🛡️" : "🔑"}</div>
          <h1 className="syne" style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>
            {step === 1 ? "Forgot Password?" : step === 2 ? "Verify Identity" : "New Password"}
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
            {step === 1 ? "Choose how you want to receive your reset code." 
            : step === 2 ? `Enter the 6-digit code sent to ${identifier}` 
            : "Create a strong and memorable new password."}
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 20, textAlign: "center" }}>
          ⚠ {error}
        </div>
      )}

      {/* STEP 1: Request OTP */}
      {step === 1 && (
        <form onSubmit={handleSendOtp}>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => { setMethod("email"); setIdentifier(""); setError(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${method === "email" ? C.primary : C.border}`,
                background: method === "email" ? `${C.primary}22` : C.surfaceAlt,
                color: method === "email" ? C.primary : C.textMuted,
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "0.2s"
              }}
            >
              ✉️ Email
            </button>
            <button
              type="button"
              onClick={() => { setMethod("whatsapp"); setIdentifier(""); setError(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${method === "whatsapp" ? C.green : C.border}`,
                background: method === "whatsapp" ? `${C.green}22` : C.surfaceAlt,
                color: method === "whatsapp" ? C.green : C.textMuted,
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "0.2s"
              }}
            >
              💬 WhatsApp
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {method === "email" ? "Registered Email *" : "WhatsApp Number *"}
            </label>
            <input
              style={{ ...premiumInputStyle, padding: "12px 16px" }}
              type={method === "email" ? "email" : "tel"}
              onFocus={handleFocus} onBlur={handleBlur}
              placeholder={method === "email" ? "admin@school.com" : "9876543210"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading || !identifier} style={{ width: "100%", background: loading ? C.primaryDark : C.primary, color: "white", border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading || !identifier ? 0.7 : 1, transition: "0.2s" }}>
            {loading ? "Sending Code..." : "Send Reset Code"}
          </button>
        </form>
      )}

      {/* STEP 2: Verify OTP */}
      {step === 2 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {otp.map((digit, index) => (
              <input
                key={index} ref={otpRefs[index]} type="text" maxLength={1} value={digit} disabled={loading}
                onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)}
                style={{ width: 42, height: 50, background: C.surfaceAlt, border: digit ? `2px solid ${C.primary}` : `1.5px solid ${C.border}`, borderRadius: 12, textAlign: "center", fontSize: 20, fontWeight: 800, color: "#fff", outline: "none", transition: "all 0.2s", opacity: loading ? 0.6 : 1 }}
                onFocus={(e) => { e.target.style.boxShadow = `0 0 0 4px ${C.primary}22`; e.target.style.borderColor = C.primary; }}
                onBlur={(e) => { e.target.style.boxShadow = "none"; if (!digit) e.target.style.borderColor = C.border; }}
              />
            ))}
          </div>
          <button disabled style={{ width: "100%", background: C.surfaceAlt, color: C.textMuted, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "14px", fontSize: 14, fontWeight: 700, opacity: loading ? 1 : 0.5 }}>
            {loading ? "Verifying code..." : "Awaiting entry..."}
          </button>
        </div>
      )}

      {/* STEP 3: Set New Password */}
      {step === 3 && (
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>New Password *</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                style={{ ...premiumInputStyle, padding: "12px 44px 12px 16px" }}
                onFocus={handleFocus} onBlur={handleBlur}
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPass((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 14 }}>
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading || newPassword.length < 6} style={{ width: "100%", background: loading ? C.green : C.primary, color: "white", border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading || newPassword.length < 6 ? 0.7 : 1, transition: "0.2s" }}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}

      {/* STEP 4: Success Screen */}
      {step === 4 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h3 className="syne" style={{ fontSize: 24, color: C.green, margin: 0, fontWeight: 900 }}>Password Updated!</h3>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 12, marginBottom: 32, lineHeight: 1.6 }}>
            Your account has been secured with the new password. You can now log in normally.
          </p>
          <button onClick={onBackToLogin} style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 20px ${C.green}33` }}>
            Return to Login →
          </button>
        </div>
      )}

      {/* Footer Navigation (Hide on Success) */}
      {step < 4 && (
        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <button type="button" onClick={onBackToLogin} style={{ background: "none", border: "none", color: C.textMuted, fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "0.2s" }} onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.textMuted}>
            ← Back to Login Page
          </button>
        </div>
      )}
    </div>
  );
};
