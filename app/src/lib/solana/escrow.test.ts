import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import idl from './idl/deposit_lock.json';
import { initializeAndFundEscrow } from './escrow';

test('fund instruction matches the deployed IDL, PDA seeds, and lamport encoding', async () => {
  const tenant = Keypair.generate().publicKey;
  const landlord = Keypair.generate().publicKey;
  const leaseId = '42';
  const blockhash = Keypair.generate().publicKey.toBase58();
  let captured: Transaction | undefined;
  const connection = {
    getLatestBlockhash: async () => ({ blockhash, lastValidBlockHeight: 100 }),
    confirmTransaction: async () => ({ context: { slot: 1 }, value: { err: null } }),
  } as unknown as Connection;
  const sendTransaction = (async transaction => {
    assert.ok(transaction instanceof Transaction);
    captured = transaction;
    return 'mock-signature';
  }) as WalletContextState['sendTransaction'];

  const result = await initializeAndFundEscrow({
    connection,
    sendTransaction,
    tenant: tenant.toBase58(),
    landlord: landlord.toBase58(),
    leaseId,
    amountSol: '1.25',
    leaseEndTs: 1_800_000_000,
    reviewWindowSecs: 10,
  });

  const [expectedPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), tenant.toBuffer(), landlord.toBuffer(), Buffer.from([42, 0, 0, 0, 0, 0, 0, 0])],
    new PublicKey(idl.address),
  );
  const instruction = captured?.instructions[0];
  assert.ok(instruction);
  assert.equal(result.signature, 'mock-signature');
  assert.equal(result.address, expectedPda.toBase58());
  assert.equal(instruction.programId.toBase58(), idl.address);
  assert.deepEqual(instruction.keys.map(key => key.pubkey.toBase58()), [tenant.toBase58(), landlord.toBase58(), expectedPda.toBase58(), SystemProgram.programId.toBase58()]);
  assert.equal(instruction.data.length, 40);
  assert.deepEqual([...instruction.data.subarray(0, 8)], idl.instructions.find(item => item.name === 'initialize_and_fund')?.discriminator);
  assert.equal(instruction.data.readBigUInt64LE(8), BigInt(leaseId));
  assert.equal(instruction.data.readBigUInt64LE(16), 1_250_000_000n);
  assert.equal(instruction.data.readBigInt64LE(24), 1_800_000_000n);
  assert.equal(instruction.data.readBigInt64LE(32), 10n);
});
