// @ts-nocheck
// Chat media helpers: type / size rules (same as backend chatService.classifyUpload), image compression, previews.
export const MB = 1024 * 1024;
export type MediaKind = "image" | "video" | "file";

export type Prepared = {
  file: File; kind: MediaKind; previewUrl: string;
  width?: number; height?: number; duration?: number;
};

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const VIDEO_EXT = ["mp4", "mov", "webm", "3gp"];
const FILE_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"];

const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();

export const kindOfFile = (f: File): MediaKind | null => {
  const e = extOf(f.name);
  if (IMAGE_EXT.includes(e) || (!e && f.type.startsWith("image/"))) return "image";
  if (VIDEO_EXT.includes(e) || (!e && f.type.startsWith("video/"))) return "video";
  if (FILE_EXT.includes(e)) return "file";
  return null;
};

export const maxBytes = (kind: MediaKind, isStudent: boolean) =>
  kind === "image" ? 10 * MB : kind === "video" ? (isStudent ? 25 * MB : 50 * MB) : 15 * MB;

export const fmtSize = (n?: number | null) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${Math.round(n / 1024)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image"));
    img.src = url;
  });

// photo -> max 1600px JPEG (saves the user's data and our storage)
async function compressImage(file: File): Promise<{ file: File; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    if (scale === 1 && file.size < 1.5 * MB) return { file, width: w, height: h }; // already small
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, width: w, height: h };
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); // PNG transparency -> white
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return { file, width: w, height: h };
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { file: new File([blob], name, { type: "image/jpeg" }), width: w, height: h };
  } finally { URL.revokeObjectURL(url); }
}

const probeVideo = (url: string) =>
  new Promise<{ width?: number; height?: number; duration?: number }>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve({ width: v.videoWidth || undefined, height: v.videoHeight || undefined, duration: Math.round(v.duration) || undefined });
    v.onerror = () => resolve({});
    setTimeout(() => resolve({}), 4000);
    v.src = url;
  });

// -> Prepared  (throws Error with a user-friendly message when the file is not allowed)
export async function prepareFile(picked: File, { isStudent = false } = {}): Promise<Prepared> {
  const kind = kindOfFile(picked);
  if (!kind) throw new Error("This file type is not supported. Send a photo, video, PDF or Office document.");
  let file = picked, width: number | undefined, height: number | undefined, duration: number | undefined;
  if (kind === "image") {
    const r = await compressImage(picked);
    file = r.file; width = r.width; height = r.height;
  }
  const cap = maxBytes(kind, isStudent);
  if (file.size > cap) {
    throw new Error(`${kind === "image" ? "Photo" : kind === "video" ? "Video" : "File"} is too large (max ${Math.round(cap / MB)} MB)`);
  }
  const previewUrl = URL.createObjectURL(file);
  if (kind === "video") {
    const m = await probeVideo(previewUrl);
    width = m.width; height = m.height; duration = m.duration;
  }
  return { file, kind, previewUrl, width, height, duration };
}

export const buildReplyForm = (body: string, clientMsgId: string, p?: Prepared | null) => {
  const fd = new FormData();
  if (body) fd.append("body", body);
  fd.append("client_msg_id", clientMsgId);
  if (p) {
    fd.append("file", p.file, p.file.name);
    if (p.width) fd.append("width", String(p.width));
    if (p.height) fd.append("height", String(p.height));
    if (p.duration) fd.append("duration", String(p.duration));
  }
  return fd;
};
