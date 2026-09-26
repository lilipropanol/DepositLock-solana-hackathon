import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import idl from "../app/src/lib/idl/deposit_lock.json";
import { isActiveEscrowStatus } from "./crank-status";

type EscrowAccount = {
  publicKey: PublicKey;
  account: {
    tenant: PublicKey;
    landlord: PublicKey;
    leaseId: BN;
    leaseEndTs: BN;
    disputeWindowSecs: BN;
    amount: BN;
    status: Record<string, unknown>;
    [key: string]: any;
  };
};

class CrankWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  get publicKey() {
    return this.payer.publicKey;
  }

  async signTransaction<T extends { partialSign: (kp: Keypair) => void }>(tx: T): Promise<T> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions<T extends { partialSign: (kp: Keypair) => void }>(txs: T[]): Promise<T[]> {
    return txs.map((tx) => {
      tx.partialSign(this.payer);
      return tx;
    });
  }
}

function loadKeypairFromEnv(): Keypair {
  const envPath = process.env.CRANK_KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");
  const raw = JSON.parse(fs.readFileSync(envPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const intervalMs = Number(process.env.CRANK_INTERVAL_MS ?? 15000);
  return { dryRun, intervalMs };
}

async function main() {
  const { dryRun, intervalMs } = parseArgs();
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const crank = loadKeypairFromEnv();
  const provider = new AnchorProvider(connection, new CrankWallet(crank), {
    commitment: "confirmed",
  });

  const program = new Program(idl as any, provider);

  const log = (...args: any[]) => console.log(new Date().toISOString(), ...args);

  const checkBalance = async () => {
    const balance = await connection.getBalance(crank.publicKey);
    const sol = balance / LAMPORTS_PER_SOL;
    log(`crank wallet ${crank.publicKey.toBase58()} balance: ${sol.toFixed(4)} SOL`);
    if (balance < 0.02 * LAMPORTS_PER_SOL) {
      throw new Error("Low crank wallet balance; fund it first.");
    }
  };

  const runOnce = async () => {
    log("running crank scan...");

    try {
      await checkBalance();

      const escrows = (await program.account.escrow.all()) as EscrowAccount[];
      log(`found ${escrows.length} escrow accounts`);

      for (const escrow of escrows) {
        try {
          const status = Object.keys(escrow.account.status ?? {})[0] ?? "unknown";
          if (!isActiveEscrowStatus(escrow.account.status)) {
            log(`skip ${escrow.publicKey.toBase58()} status is ${status}`);
            continue;
          }

          const leaseEndTs = Number(escrow.account.leaseEndTs.toString());
          const disputeWindowSecs = Number(escrow.account.disputeWindowSecs.toString());
          const deadline = leaseEndTs + disputeWindowSecs;
          const now = Math.floor(Date.now() / 1000);

          if (now < deadline) {
            log(`skip ${escrow.publicKey.toBase58()} not expired yet (deadline ${deadline}, now ${now})`);
            continue;
          }

          const accountInfo = await connection.getAccountInfo(escrow.publicKey);
          if (!accountInfo) {
            log(`skip ${escrow.publicKey.toBase58()} already closed`);
            continue;
          }

          log(`claiming refund for ${escrow.publicKey.toBase58()}...`);

          if (dryRun) {
            log(`DRY RUN: would call claimRefund for ${escrow.publicKey.toBase58()}`);
            continue;
          }

          const sig = await program.methods
            .claimRefund()
            .accounts({
              caller: crank.publicKey,
              tenant: escrow.account.tenant,
              landlord: escrow.account.landlord,
              escrow: escrow.publicKey,
            })
            .rpc();

          log(`success ${escrow.publicKey.toBase58()} => ${sig}`);
        } catch (err: any) {
          const msg = String(err);
          if (msg.includes("already") || msg.includes("closed") || msg.includes("AccountNotFound")) {
            log(`skip ${escrow.publicKey.toBase58()} due to account state: ${msg}`);
            continue;
          }

          if (msg.includes("WindowStillOpen")) {
            log(`skip ${escrow.publicKey.toBase58()} not yet eligible: ${msg}`);
            continue;
          }

          log(`failed ${escrow.publicKey.toBase58()}: ${msg}`);
        }
      }
    } catch (err: any) {
      log(`crank failed: ${String(err)}`);
    }
  };

  log(`starting crank, dryRun=${dryRun}, intervalMs=${intervalMs}`);
  await runOnce();

  setInterval(() => {
    void runOnce();
  }, intervalMs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});