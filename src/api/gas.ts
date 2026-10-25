// FILE: teacher-app/src/api/gas.ts
// Source: admin App.tsx -> gasRequest [23962-23980]
// @ts-nocheck
import { apiRequest } from "./client";

// 🟢 NEW: SECURE AZURE PROXY API (For Quick Tests)
export const gasRequest = async (action, payload = {}) => {
  try {
    // Frontend अब सीधे अपने ही Azure Backend को कॉल करेगा
    // Azure बैकग्राउंड में GAS से बात करके रिज़ल्ट लाएगा
    const data = await apiRequest("/quick-tests/gas-sync", "POST", {
      action: action,
      payload: payload
    });
    
    if (!data.status && !data.success) {
      throw new Error(data.message || "Proxy API Error");
    }
    
    return data;
  } catch (error) {
    console.error(`Secure Proxy Error on [${action}]:`, error.message);
    throw error;
  }
};
