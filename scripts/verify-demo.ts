// End-to-end check using the SAME deterministic burner keypairs and the SAME
// PDA derivation the frontend uses. If this passes, the UI's chain wiring is
// correct -- only the React layer sits between this and the demo.
import { AnchorProvider, BN, Program, Idl, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import idl from "../app/src/lib/idl/deposit_lock.json";

const TENANT = Keypair.fromSeed(Uint8Array.from([
  169, 34, 27, 41, 149, 17, 43, 206, 67, 16, 179, 110, 33, 129, 76, 13, 237,
  127, 17, 167, 55, 51, 109, 199, 202, 90, 93, 110, 13, 250, 246, 25,
]));
const LANDLORD = Keypair.fromSeed(Uint8Array.from([
  185, 119, 183, 221, 196, 169, 238, 84, 11, 24, 206, 162, 35, 238, 222, 225,
  255, 35, 103, 100, 63, 249, 243, 55, 220, 158, 193, 77, 155, 193, 186, 107,
]));
const ARBITRATOR = Keypair.fromSeed(Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 73 + 19) % 256)));

const PROGRAM_ID = new PublicKey("43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7");
const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const LEASE_ID = Number(process.env.LEASE_ID ?? Math.floor(Date.now() / 1000) % 100000);
const WINDOW = 8;
const DEPOSIT = 0.05;

class BurnerWallet implements Wallet {
  constructor(readonly payer: Keypair) {}
  get publicKey() { return this.payer.publicKey; }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) tx.sign([this.payer]);
    else tx.partialSign(this.payer);
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const connection = new Connection(RPC, "confirmed");
const programAs = (kp: Keypair) =>
  new Program(idl as Idl, new AnchorProvider(connection, new BurnerWallet(kp), { commitment: "confirmed" }));

const escrowPda = PublicKey.findProgramAddressSync(
  [
    Buffer.from("escrow"),
    TENANT.publicKey.toBuffer(),
    LANDLORD.publicKey.toBuffer(),
    new BN(LEASE_ID).toArrayLike(Buffer, "le", 8),
  ],
  PROGRAM_ID
)[0];

async function main() {
  console.log(`lease id ${LEASE_ID}  escrow ${escrowPda.toBase58()}\n`);

  console.log("1. Tenant funds the escrow...");
  const sig1 = await programAs(TENANT).methods
    .initializeAndFund(new BN(LEASE_ID), new BN(DEPOSIT * LAMPORTS_PER_SOL), new BN(Math.floor(Date.now() / 1000)), new BN(WINDOW), ARBITRATOR.publicKey)
    .accounts({ tenant: TENANT.publicKey, landlord: LANDLORD.publicKey })
    .rpc();
  const locked = await connection.getBalance(escrowPda);
  console.log(`   locked ◎${locked / LAMPORTS_PER_SOL} in the PDA`);
  console.log(`   https://explorer.solana.com/tx/${sig1}?cluster=devnet\n`);

  console.log("2. Tenant tries to withdraw early (must be rejected)...");
  try {
    await programAs(TENANT).methods.claimRefund()
      .accounts({ caller: TENANT.publicKey, tenant: TENANT.publicKey, landlord: LANDLORD.publicKey, escrow: escrowPda })
      .rpc();
    console.error("   FAIL: the contract allowed an early withdrawal");
    process.exit(1);
  } catch (e: any) {
    if (!String(e).includes("WindowStillOpen")) {
      console.error("   FAIL: rejected, but not for the expected reason:", String(e).slice(0, 200));
      process.exit(1);
    }
    console.log("   rejected: WindowStillOpen\n");
  }

  console.log(`3. Landlord does nothing. Waiting ${WINDOW + 3}s...`);
  await sleep((WINDOW + 3) * 1000);

  console.log("4. Refund is now claimable...");
  const before = await connection.getBalance(TENANT.publicKey);
  const sig2 = await programAs(TENANT).methods.claimRefund()
    .accounts({ caller: TENANT.publicKey, tenant: TENANT.publicKey, landlord: LANDLORD.publicKey, escrow: escrowPda })
    .rpc();
  const after = await connection.getBalance(TENANT.publicKey);
  const closed = await connection.getAccountInfo(escrowPda);

  console.log(`   tenant ◎${before / LAMPORTS_PER_SOL} -> ◎${after / LAMPORTS_PER_SOL}`);
  console.log(`   escrow account closed: ${closed === null}`);
  console.log(`   https://explorer.solana.com/tx/${sig2}?cluster=devnet`);

  if (after <= before || closed !== null) {
    console.error("\nFAIL: refund did not settle as expected");
    process.exit(1);
  }
  console.log("\nPASS — full cycle works with the frontend's own keys.");
}

main().catch((e) => { console.error(e); process.exit(1); });
