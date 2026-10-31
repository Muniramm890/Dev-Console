// @ts-nocheck
// Platform (developer) API. Separate token from the school apps: localStorage "dc_token".
import { API_BASE_URL } from "../api/client";

const KEY = "dc_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export class ApiErr extends Error { status: number; code?: string; errors?: string[]; }

export async function papi(path, method = "GET", body = undefined, full = false) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res;
  try { res = await fetch(`${API_BASE_URL}/platform${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch { throw Object.assign(new ApiErr("Could not reach the server. Check your internet."), { status: 0 }); }
  let j = null; try { j = await res.json(); } catch { /* not json */ }
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") { setToken(null); window.dispatchEvent(new Event("dc-logout")); }
    throw Object.assign(new ApiErr(j?.message || `Request failed (${res.status})`), { status: res.status, code: j?.code, errors: j?.errors });
  }
  return full ? j : j?.data;
}

export const explain = (e, max = 6) => {
  const l = Array.isArray(e?.errors) ? e.errors.filter(Boolean) : [];
  return l.length > 1 ? `${e.message}\n- ${l.slice(0, max).join("\n- ")}` : e?.message || "Something went wrong";
};
export const toast = (msg, kind = "ok") => window.dispatchEvent(new CustomEvent("dc-toast", { detail: { msg, kind } }));
export const ago = (d) => {
  if (!d) return "never";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`; if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString("en-IN");
};
