// @ts-nocheck
// pdf.js lazy loader: sirf tab load hota hai jab pehli baar koi PDF khulti hai (main bundle halka rehta hai).
// "legacy" build = purane Android WebView me bhi chalta hai. Worker Vite ke ?worker se bundle hota hai (.js file,
// koi CDN nahi) -> offline bhi chalta hai aur Android me .mjs MIME ka issue nahi aata.
let cached: Promise<any> | null = null;
export const getPdfjs = (): Promise<any> => {
  if (!cached) {
    cached = (async () => {
      const [lib, worker] = await Promise.all([
        import("pdfjs-dist/legacy/build/pdf.mjs"),
        import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker"),
      ]);
      (lib as any).GlobalWorkerOptions.workerPort = new (worker as any).default();
      return lib;
    })().catch((e) => { cached = null; throw e; });
  }
  return cached;
};
