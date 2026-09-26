import { Buffer } from 'buffer';

// web3.js uses Buffer in browser transactions as well as on Node.
if (!globalThis.Buffer) globalThis.Buffer = Buffer;
