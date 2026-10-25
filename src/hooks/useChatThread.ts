// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { usePolling } from "./usePolling";

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 36);

const bySeq = (a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity);

// Ek private chat thread: initial load + polling (since_seq) + optimistic send (double-tap / retry safe) + ticks (receipts).
//  load()               -> { meta, replies, receipts? }
//  poll(sinceSeq)       -> replies[]  |  { replies, receipts }      receipts = [{id, delivered_at, read_at}] of MY latest sent messages
//  send(body, cid, prepared?) -> reply (server row)                 prepared = chatMedia.prepareFile() result
//  ownSide              -> 'recipient' | 'admin'
export const useChatThread = ({ threadKey, load, poll, send, ownSide, enabled = true, intervalMs = 5000 }) => {
  const [meta, setMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const lastSeq = useRef(0);
  const gen = useRef(0);

  const applyReceipts = useCallback((list) => {
    if (!list?.length) return;
    const map = new Map(list.map((x) => [x.id, x]));
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        const r = m.id && map.get(m.id);
        if (!r || (m.delivered_at === r.delivered_at && m.read_at === r.read_at)) return m;
        changed = true;
        return { ...m, delivered_at: r.delivered_at, read_at: r.read_at };
      });
      return changed ? next : prev;
    });
  }, []);

  const merge = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const ids = new Set(prev.filter((m) => m.id).map((m) => m.id));
      const fresh = incoming.filter((r) => !ids.has(r.id));
      if (!fresh.length) return prev;
      let rest = prev;
      fresh.forEach((r) => {
        if (r.sender_side !== ownSide) return;
        const i = rest.findIndex(
          (m) => !m.id && m.status !== "failed" && m.sender_side === r.sender_side && m.body === r.body &&
                 (m.kind || "text") === (r.kind || "text") && (m.media_name || "") === (r.media_name || "")
        );
        if (i >= 0) rest = rest.filter((_, k) => k !== i);
      });
      return [...rest, ...fresh].sort(bySeq);
    });
    lastSeq.current = Math.max(lastSeq.current, ...incoming.map((r) => r.seq || 0));
  }, [ownSide]);

  const reload = useCallback(async () => {
    const my = ++gen.current;
    setLoading(true); setError("");
    try {
      const res = await load();
      if (my !== gen.current) return;
      setMeta(res.meta || null);
      const rows = res.replies || [];
      const map = new Map((res.receipts || []).map((x) => [x.id, x]));
      setMessages(rows.map((m) => (map.has(m.id) ? { ...m, ...map.get(m.id) } : m)));
      lastSeq.current = Math.max(0, ...rows.map((r) => r.seq || 0));
    } catch (e) {
      if (my === gen.current) setError(e.message || "Failed to load");
    } finally {
      if (my === gen.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (!enabled || !threadKey) return;
    setMeta(null); setMessages([]); lastSeq.current = 0;
    reload();
    return () => { gen.current++; };
  }, [threadKey, enabled]); // eslint-disable-line

  usePolling(async () => {
    if (!enabled || !threadKey || loading) return;
    const my = gen.current;
    try {
      const res = await poll(lastSeq.current);
      if (my !== gen.current) return;
      const rows = Array.isArray(res) ? res : res?.replies || [];
      merge(rows);
      if (!Array.isArray(res)) applyReceipts(res?.receipts);
    } catch (_) { /* network blip: next tick retry */ }
  }, intervalMs, enabled && !!threadKey);

  const doSend = useCallback(async (text, prepared, existing) => {
    const body = String(text || "").trim();
    if (!body && !prepared) return false;
    const key = existing?.key || `tmp-${newId()}`;
    const cid = existing?.cid || newId();
    const bubble = {
      key, cid, sender_side: ownSide, body, created_at: new Date().toISOString(), status: "sending",
      kind: prepared ? prepared.kind : "text",
      ...(prepared ? { media_name: prepared.file.name, media_size: prepared.file.size, media_w: prepared.width, media_h: prepared.height,
                       media_duration: prepared.duration, local_url: prepared.previewUrl, _prepared: prepared } : {}),
    };
    setMessages((p) => (existing ? p.map((m) => (m.key === key ? bubble : m)) : [...p, bubble]));
    setSending(true);
    try {
      const reply = await send(body, cid, prepared);
      setMessages((p) => {
        const without = p.filter((m) => m.key !== key);
        return without.some((m) => m.id === reply.id) ? without : [...without, reply].sort(bySeq);
      });
      lastSeq.current = Math.max(lastSeq.current, reply.seq || 0);
      return true;
    } catch (e) {
      setMessages((p) => p.map((m) => (m.key === key ? { ...m, status: "failed", error: e.message } : m)));
      return false;
    } finally { setSending(false); }
  }, [send, ownSide]);

  const retry = useCallback((key) => {
    const m = messages.find((x) => x.key === key);
    if (m) doSend(m.body, m._prepared, m);
  }, [messages, doSend]);

  return { meta, messages, loading, error, sending, send: doSend, retry, reload };
};
