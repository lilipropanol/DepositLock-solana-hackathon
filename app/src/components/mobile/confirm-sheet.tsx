'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { PrimaryButton } from './ui';
export function ConfirmSheet({ open, onOpenChange, title, description, children, action, onConfirm, busy, disabled }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children?: ReactNode; action: string; onConfirm: () => void; busy?: boolean; disabled?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="m-dialog-overlay" /><Dialog.Content className="m-sheet"><div className="m-sheet-handle" aria-hidden="true" /><Dialog.Close className="m-sheet-close" aria-label="Close"><X size={21} /></Dialog.Close><Dialog.Title className="m-sheet-title">{title}</Dialog.Title><Dialog.Description className="m-sheet-description">{description}</Dialog.Description>{children}<PrimaryButton className="m-sheet-action" onClick={onConfirm} busy={busy} disabled={disabled}>{action}</PrimaryButton><Dialog.Close className="m-text-button">Cancel</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
