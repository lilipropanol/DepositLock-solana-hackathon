import { Buffer } from 'buffer';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type TransactionSignature,
} from '@solana/web3.js';
import idl from './idl/deposit_lock.json';

const PROGRAM_ID = new PublicKey(idl.address);
const ESCROW_DISCRIMINATOR = Buffer.from(idl.accounts.find(account => account.name === 'Escrow')?.discriminator ?? []);
type SendTransaction = WalletContextState['sendTransaction'];

export type ChainEscrow = {
  address: string;
  tenant: string;
  landlord: string;
  leaseId: string;
  amountLamports: bigint;
  amountSol: string;
  leaseEndTs: number;
  reviewWindowSecs: number;
};

function u64LE(value: bigint): Buffer {
  if (value < 0n || value > 18_446_744_073_709_551_615n) throw new Error('Lease identifier is outside the supported range.');
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return bytes;
}

function i64LE(value: bigint): Buffer {
  if (value < -9_223_372_036_854_775_808n || value > 9_223_372_036_854_775_807n) throw new Error('Timestamp is outside the supported range.');
  const bytes = Buffer.alloc(8);
  bytes.writeBigInt64LE(value);
  return bytes;
}

function solToLamports(sol: string): bigint {
  const [whole, fraction = ''] = sol.split('.');
  if (!/^\d+$/.test(whole) || !/^\d{0,9}$/.test(fraction)) throw new Error('Enter a SOL amount with up to 9 decimal places.');
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0') || '0');
  if (lamports <= 0n) throw new Error('Deposit must be greater than zero.');
  return lamports;
}

function lamportsToSol(lamports: bigint): string {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function instructionData(name: string, args: Buffer[] = []): Buffer {
  const instruction = idl.instructions.find(candidate => candidate.name === name);
  if (!instruction) throw new Error(`Instruction ${name} is missing from the checked-in program IDL.`);
  return Buffer.concat([Buffer.from(instruction.discriminator), ...args]);
}

function deriveEscrow(tenant: PublicKey, landlord: PublicKey, leaseId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), tenant.toBuffer(), landlord.toBuffer(), u64LE(BigInt(leaseId))],
    PROGRAM_ID,
  );
}

function checkedPublicKey(value: string, label: string): PublicKey {
  try { return new PublicKey(value); }
  catch { throw new Error(`The ${label} wallet address is invalid.`); }
}

async function sendAndConfirm(
  connection: Connection,
  sendTransaction: SendTransaction,
  feePayer: PublicKey,
  instruction: TransactionInstruction,
): Promise<TransactionSignature> {
  const latest = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({ feePayer, ...latest }).add(instruction);
  const signature = await sendTransaction(transaction, connection, { preflightCommitment: 'confirmed' });
  const result = await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
  if (result.value.err) throw new Error(`The transaction was confirmed with an error: ${JSON.stringify(result.value.err)}`);
  return signature;
}

export async function initializeAndFundEscrow(input: {
  connection: Connection;
  sendTransaction: SendTransaction;
  tenant: string;
  landlord: string;
  leaseId: string;
  amountSol: string;
  leaseEndTs: number;
  reviewWindowSecs: number;
}): Promise<{ address: string; signature: string }> {
  const tenant = checkedPublicKey(input.tenant, 'tenant');
  const landlord = checkedPublicKey(input.landlord, 'landlord');
  const [escrow] = deriveEscrow(tenant, landlord, input.leaseId);
  const amount = solToLamports(input.amountSol);
  const leaseEndTs = BigInt(Math.trunc(input.leaseEndTs));
  const reviewWindowSecs = BigInt(Math.trunc(input.reviewWindowSecs));
  if (reviewWindowSecs <= 0n) throw new Error('The review window must be greater than zero.');

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: tenant, isSigner: true, isWritable: true },
      { pubkey: landlord, isSigner: false, isWritable: false },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData('initialize_and_fund', [
      u64LE(BigInt(input.leaseId)),
      u64LE(amount),
      i64LE(leaseEndTs),
      i64LE(reviewWindowSecs),
    ]),
  });

  const signature = await sendAndConfirm(input.connection, input.sendTransaction, tenant, instruction);
  return { address: escrow.toBase58(), signature };
}

export async function claimEscrowRefund(input: {
  connection: Connection;
  sendTransaction: SendTransaction;
  caller: string;
  tenant: string;
  landlord: string;
  leaseId: string;
}): Promise<string> {
  const caller = checkedPublicKey(input.caller, 'connected');
  const tenant = checkedPublicKey(input.tenant, 'tenant');
  const landlord = checkedPublicKey(input.landlord, 'landlord');
  const [escrow] = deriveEscrow(tenant, landlord, input.leaseId);
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: false },
      { pubkey: tenant, isSigner: false, isWritable: true },
      { pubkey: landlord, isSigner: false, isWritable: false },
      { pubkey: escrow, isSigner: false, isWritable: true },
    ],
    data: instructionData('claim_refund'),
  });
  return sendAndConfirm(input.connection, input.sendTransaction, caller, instruction);
}

export async function releaseEscrow(input: {
  connection: Connection;
  sendTransaction: SendTransaction;
  landlord: string;
  tenant: string;
  leaseId: string;
}): Promise<string> {
  const landlord = checkedPublicKey(input.landlord, 'landlord');
  const tenant = checkedPublicKey(input.tenant, 'tenant');
  const [escrow] = deriveEscrow(tenant, landlord, input.leaseId);
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: landlord, isSigner: true, isWritable: false },
      { pubkey: tenant, isSigner: false, isWritable: true },
      { pubkey: escrow, isSigner: false, isWritable: true },
    ],
    data: instructionData('release'),
  });
  return sendAndConfirm(input.connection, input.sendTransaction, landlord, instruction);
}

function decodeEscrow(data: Buffer, address: PublicKey): ChainEscrow {
  if (data.length < 105 || !data.subarray(0, 8).equals(ESCROW_DISCRIMINATOR)) {
    throw new Error(`Account ${address.toBase58()} is not a DepositLock escrow account.`);
  }
  const leaseEndTs = Number(data.readBigInt64LE(80));
  const reviewWindowSecs = Number(data.readBigInt64LE(88));
  if (!Number.isSafeInteger(leaseEndTs) || !Number.isSafeInteger(reviewWindowSecs)) throw new Error('Escrow timestamps exceed the supported range.');
  const amountLamports = data.readBigUInt64LE(72);
  return {
    address: address.toBase58(),
    tenant: new PublicKey(data.subarray(8, 40)).toBase58(),
    landlord: new PublicKey(data.subarray(40, 72)).toBase58(),
    amountLamports,
    amountSol: lamportsToSol(amountLamports),
    leaseEndTs,
    reviewWindowSecs,
    leaseId: data.readBigUInt64LE(96).toString(),
  };
}

export async function fetchEscrow(input: {
  connection: Connection;
  tenant: string;
  landlord: string;
  leaseId: string;
}): Promise<ChainEscrow | null> {
  const tenant = checkedPublicKey(input.tenant, 'tenant');
  const landlord = checkedPublicKey(input.landlord, 'landlord');
  const [address] = deriveEscrow(tenant, landlord, input.leaseId);
  const account = await input.connection.getAccountInfo(address, 'confirmed');
  return account ? decodeEscrow(account.data, address) : null;
}

export async function fetchEscrowsForLandlord(input: {
  connection: Connection;
  landlord: string;
}): Promise<ChainEscrow[]> {
  const landlord = checkedPublicKey(input.landlord, 'landlord');
  const accounts = await input.connection.getProgramAccounts(PROGRAM_ID, {
    commitment: 'confirmed',
    filters: [{ memcmp: { offset: 40, bytes: landlord.toBase58() } }],
  });
  return accounts.map(account => decodeEscrow(account.account.data, account.pubkey));
}

export async function fetchEscrowsForTenant(input: {
  connection: Connection;
  tenant: string;
}): Promise<ChainEscrow[]> {
  const tenant = checkedPublicKey(input.tenant, 'tenant');
  const accounts = await input.connection.getProgramAccounts(PROGRAM_ID, {
    commitment: 'confirmed',
    filters: [{ memcmp: { offset: 8, bytes: tenant.toBase58() } }],
  });
  return accounts.map(account => decodeEscrow(account.account.data, account.pubkey));
}

export function explainChainError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/WindowStillOpen|review window has not expired|custom program error: 0x1772/i.test(message)) return 'The review timer is still running. Try again when it reaches zero.';
  if (/User rejected|User declined|rejected the request|request was rejected/i.test(message)) return 'The wallet request was cancelled. No transaction was sent.';
  if (/insufficient funds|Attempt to debit an account|0x1\b/i.test(message)) return 'This Devnet wallet needs more test SOL to cover the deposit and transaction fee.';
  if (/block height exceeded|expired|timed out/i.test(message)) return 'The network did not confirm in time. Refresh the status before trying again.';
  return message || 'The Devnet transaction could not be completed.';
}
