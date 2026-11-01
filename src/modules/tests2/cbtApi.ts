// @ts-nocheck
// Quick Test 2.0 - thin client for the new /api/cbt routes + image preparation (WebP, <= 400 KB) + small shared hooks.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export const cbt = {
  get: (p) => apiRequest(`/cbt${p}`),
  post: (p, b) => apiRequest(`/cbt${p}`, "POST", b || {}),
  put: (p, b) => apiRequest(`/cbt${p}`, "PUT", b || {}),
  del: (p) => apiRequest(`/cbt${p}`, "DELETE"),
};
export const unwrap = (r) => (r && r.data !== undefined ? r.data : r);

const loadImg = (file) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); res(img); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Could not read this image")); };
  img.src = url;
});
const encode = (canvas, type, q) => new Promise((res) => canvas.toBlob((b) => res(b), type, q));

// resize + convert in the browser so the server (and storage) only ever sees small WebP files
export async function prepareImage(file, maxBytes = 400 * 1024) {
  if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type)) throw new Error("Choose a PNG, JPG or WebP image");
  const img = await loadImg(file);
  for (const dim of [1280, 1024, 800, 600]) {
    const scale = Math.min(1, dim / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    for (const [type, q] of [["image/webp", 0.82], ["image/webp", 0.68], ["image/webp", 0.5], ["image/jpeg", 0.7], ["image/jpeg", 0.5]]) {
      const b = await encode(c, type, q);
      if (b && b.size <= maxBytes) return b;
    }
  }
  throw new Error("Image is too large even after compression");
}

// kind: 1 question text, 2 option, 3 explanation
export async function uploadImage(file, kind = 1) {
  const blob = await prepareImage(file);
  const fd = new FormData();
  fd.append("kind", String(kind));
  fd.append("file", blob, blob.type === "image/webp" ? "image.webp" : "image.jpg");
  return unwrap(await apiRequest("/cbt/media", "POST", fd, true)); // { id, token, url, width, height, bytes, deduped }
}

export const useSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    let live = true;
    apiRequest("/setup/subjects").then((r) => { const d = unwrap(r); if (live) setSubjects(Array.isArray(d) ? d : Array.isArray(d && d.items) ? d.items : []); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return subjects;
};
