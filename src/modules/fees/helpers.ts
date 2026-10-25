// FILE: teacher-app/src/modules/fees/helpers.ts
// Source: admin App.tsx -> rupees [14209-14209], toPaise [14210-14210], PAYMENT_METHODS [14212-14212], RAZORPAY_METHODS [14213-14213], loadRazorpayScript [14215-14222], loadCashfreeScript [14225-14232], CASHFREE_MODE [14234-14234]
// @ts-nocheck
import { apiRequest } from "../../api/client";

// ═══════════════════════════════════════════════════════════════
// MODULE: FEE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const rupees = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const toPaise = (rupeeStr) => Math.round((parseFloat(rupeeStr) || 0) * 100);

export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

export const RAZORPAY_METHODS = ["UPI", "Card"];

export const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

// 🔴 NEW: Cashfree checkout SDK loader
export const loadCashfreeScript = () => new Promise((resolve) => {
  if (window.Cashfree) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

// Change to "production" once you're live with real Cashfree keys.
export const CASHFREE_MODE = "production";

// ── Cashfree verification (used by CollectPaymentModal and by the /fees/cashfree-return page) ──────────────
// Payment details are saved under this key before checkout opens, so that if Cashfree redirects the browser away
// (UPI app, 3-D Secure, popup blocked) the return page can still record the payment with the same breakdown.
export const CF_PENDING_PREFIX = "cf_pending_";

// The backend answers "still being processed" (HTTP 409) while Cashfree has not finalised the payment yet
// (UPI / netbanking can take a few seconds). Retry a few times before telling the user it is pending.
export const verifyCashfreeWithRetry = async (payload, tries = 4, delayMs = 3000) => {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      return await apiRequest("/payments/cashfree/verify", "POST", payload);
    } catch (e) {
      lastErr = e;
      if (!/still being processed/i.test(e?.message || "")) throw e; // real failure -> no point retrying
      if (i < tries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
};
