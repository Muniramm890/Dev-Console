// FILE: teacher-app/src/api/client.ts

// @ts-nocheck


export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "https://waapi-h6e7b5g9cmfthkhn.centralindia-01.azurewebsites.net/api";

  let authLogoutRef = null; 
export const setAuthLogoutRef = (fn) => { authLogoutRef = fn; }; 

  // Robust request wrapper:
  //  - 30 s timeout (120 s for uploads) so a weak network never leaves a spinner forever
  //  - GET is retried once on network error / timeout / 502-504 (safe: reads only)
  //  - an identical write (same method + url + body) that is still in flight is NOT sent twice (double-tap on Save / Pay)
  const inflight = new Map();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fetchWithTimeout = async (url, config, ms) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, { ...config, signal: ctl.signal }); }
    catch (e) { if (e && e.name === "AbortError") { const te: any = new Error("The server is taking too long to respond. Please check your internet connection and try again."); te.timeout = true; throw te; } throw e; }
    finally { clearTimeout(t); }
  };

  export const apiRequest = (endpoint, method = "GET", body = null, isFormData = false) => {
    const key = !isFormData && method !== "GET" ? `${method} ${endpoint} ${body ? JSON.stringify(body) : ""}` : null;
    if (key && inflight.has(key)) return inflight.get(key);
    const p = apiRequestOnce(endpoint, method, body, isFormData).finally(() => { if (key) inflight.delete(key); });
    if (key) inflight.set(key, p);
    return p;
  };

  const apiRequestOnce = async (endpoint, method = "GET", body = null, isFormData = false) => {
    try {
      const token = localStorage.getItem("erp_token");
      const headers = { Accept: "application/json" };
      if (!isFormData) headers["Content-Type"] = "application/json";
      if (token && token !== "undefined" && token !== "null") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const config = { method, headers };
      if (body) config.body = isFormData ? body : JSON.stringify(body);

      const timeoutMs = isFormData ? 120000 : 30000;
      let response;
      for (let attempt = 0; ; attempt++) {
        try {
          response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, config, timeoutMs);
          if (method === "GET" && attempt === 0 && [502, 503, 504].includes(response.status)) { await sleep(800); continue; }
          break;
        } catch (e) {
          if (method === "GET" && attempt === 0) { await sleep(800); continue; }
          if (e && e.timeout) throw e;
          throw new Error("Could not reach the server. Please check your internet connection and try again.");
        }
      }
      if (response.status === 204) return null;
      
      let data = null;
      try { data = await response.json(); } catch (_) { data = null; }
      if (data === null) {
        if (response.status === 401) { /* neeche wala 401 block handle karega */ }
        else throw new Error(response.ok ? "Invalid server response" : `Server temporarily unavailable (${response.status}). Please try again.`);
        data = {};
      }

      if (response.status === 401) {
        localStorage.removeItem("erp_token");
        if (authLogoutRef) authLogoutRef();       // React state se logout
        
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) { const err: any = new Error(data.message || data.error || "API Error"); err.errors = data.errors; err.status = response.status; throw err; }
      return data;
    } catch (error) {
      console.error(`Error on ${endpoint}:`, error.message);
      throw error;
    }
  };
