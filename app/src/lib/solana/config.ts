export const DEPOSITLOCK_MODE = process.env.NEXT_PUBLIC_DEPOSITLOCK_MODE === 'devnet' ? 'devnet' : 'demo';
export const DEVNET_REVIEW_WINDOW_SECONDS = 10;
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || 'https://api.devnet.solana.com';
export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
