// @solana/web3.js expects Node's Buffer, which browsers do not provide and
// Next.js does not polyfill automatically. Without this, PDA derivation
// (`Buffer.from("escrow")`) throws at runtime in the browser while SSR and the
// build both pass -- a confusing failure to hit live. Imported first by page.tsx.
import { Buffer } from "buffer";

if (typeof globalThis !== "undefined" && !(globalThis as { Buffer?: unknown }).Buffer) {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}
