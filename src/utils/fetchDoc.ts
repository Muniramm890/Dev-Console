// Generated documents (receipt, payslip, report card ...) are rendered by the backend on demand and streamed back
// as PDF bytes. Nothing is stored in the DB / Cloudinary; the bytes go straight into the in-app viewer.
import { API_BASE_URL } from "../api/client";
import { openPdf } from "./openDocument";

export async function openGeneratedPdf(endpoint: string, opts: { name: string; title?: string; method?: string; body?: any }): Promise<{ count: number | null }> {
  const token = localStorage.getItem("erp_token");
  const headers: Record<string, string> = { Accept: "application/pdf" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token && token !== "undefined" && token !== "null") headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try { res = await fetch(`${API_BASE_URL}${endpoint}`, { method: opts.method || "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }); }
  catch { throw new Error("Could not reach the server. Please check your internet connection and try again."); }
  if (!res.ok) {
    if (res.status === 401) throw new Error("Session expired. Please login again.");
    let msg = "";
    try { const j = await res.json(); msg = j?.message || j?.error || ""; } catch { /* not json */ }
    throw new Error(msg || `Could not generate the document (${res.status}).`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  openPdf({ url: `generated://${Date.now()}-${Math.random().toString(36).slice(2)}`, name: opts.name, title: opts.title, mime: "application/pdf", bytes });
  const c = res.headers.get("X-Report-Count");
  return { count: c ? Number(c) : null };
}
