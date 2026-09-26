'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, KeyRound, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMobileEscrow } from '@/hooks/use-mobile-escrow';

type MobileStore = ReturnType<typeof useMobileEscrow>;
const Context = createContext<MobileStore | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const openWalletPicker = useCallback(() => setWalletPickerOpen(true), []);
  const closeWalletPicker = useCallback(() => setWalletPickerOpen(false), []);
  const store = useMobileEscrow(openWalletPicker);
  const { wallets, select } = useWallet();
  return <Context.Provider value={store}>
    {children}
    <Dialog.Root open={walletPickerOpen} onOpenChange={setWalletPickerOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="m-dialog-overlay" />
        <Dialog.Content className="m-sheet" aria-describedby="wallet-picker-description">
          <div className="m-sheet-handle" />
          <Dialog.Close className="m-sheet-close" aria-label="Close wallet selection"><X size={21} /></Dialog.Close>
          <Dialog.Title className="m-sheet-title">Connect a wallet</Dialog.Title>
          <Dialog.Description id="wallet-picker-description" className="m-sheet-description">Choose a wallet to connect to Solana Devnet. DepositLock can see your public address and request signatures; it cannot see your recovery phrase.</Dialog.Description>
          {wallets.length > 0 ? <div className="m-wallet-options">{wallets.map(({ adapter }) => <button type="button" key={adapter.name} onClick={() => { select(adapter.name); closeWalletPicker(); }}>
            <img src={adapter.icon} alt="" width="34" height="34" />
            <span><strong>{adapter.name}</strong><small>Connect this wallet</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>)}</div> : <div className="m-wallet-empty">
            <span className="m-wallet-empty-icon"><KeyRound size={21} /></span>
            <strong>No wallet found in this browser</strong>
            <p>On your phone, open this same link inside Phantom’s in-app browser. On desktop, install a Solana wallet extension and reload.</p>
          </div>}
          <p className="m-sheet-disclaimer">Devnet only · Use test SOL with this prototype.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </Context.Provider>;
}
export function useApp() {
  const store = useContext(Context);
  if (!store) throw new Error('Mobile app provider is missing.');
  return store;
}
