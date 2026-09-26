'use client';

import type { ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import '@/lib/polyfills';
import { SOLANA_RPC_URL } from '@/lib/solana/config';

export function SolanaProvider({ children }: { children: ReactNode }) {
  return <ConnectionProvider endpoint={SOLANA_RPC_URL}>
    <WalletProvider wallets={[]} autoConnect>
      {children}
    </WalletProvider>
  </ConnectionProvider>;
}
