// Tops up the two demo burner wallets on devnet.
//
// Run once before demoing:   npm run fund-demo
//
// The burner addresses are derived from the fixed seeds in
// app/src/lib/demoKeypairs.ts, so this script and the browser independently
// arrive at the same two wallets -- nothing needs to be copied by hand.
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Must stay in sync with app/src/lib/demoKeypairs.ts
const TENANT_SEED = Uint8Array.from([
  169, 34, 27, 41, 149, 17, 43, 206, 67, 16, 179, 110, 33, 129, 76, 13, 237,
  127, 17, 167, 55, 51, 109, 199, 202, 90, 93, 110, 13, 250, 246, 25,
]);
const LANDLORD_SEED = Uint8Array.from([
  185, 119, 183, 221, 196, 169, 238, 84, 11, 24, 206, 162, 35, 238, 222, 225,
  255, 35, 103, 100, 63, 249, 243, 55, 220, 158, 193, 77, 155, 193, 186, 107,
]);

const TOP_UP_SOL = Number(process.env.TOP_UP_SOL ?? 0.5);
const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const FUNDER_PATH =
  process.env.FUNDER_KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")))
  );
}

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const funder = loadKeypair(FUNDER_PATH);
  const tenant = Keypair.fromSeed(TENANT_SEED);
  const landlord = Keypair.fromSeed(LANDLORD_SEED);

  const funderBalance = await connection.getBalance(funder.publicKey);
  console.log(`Funder   ${funder.publicKey.toBase58()}  ◎${funderBalance / LAMPORTS_PER_SOL}`);

  if (funderBalance < TOP_UP_SOL * 2 * LAMPORTS_PER_SOL) {
    console.error(
      `\nFunder is short. Top it up at https://faucet.solana.com with the address above.`
    );
    process.exit(1);
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: funder.publicKey,
      toPubkey: tenant.publicKey,
      lamports: Math.round(TOP_UP_SOL * LAMPORTS_PER_SOL),
    }),
    SystemProgram.transfer({
      fromPubkey: funder.publicKey,
      toPubkey: landlord.publicKey,
      lamports: Math.round(TOP_UP_SOL * LAMPORTS_PER_SOL),
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [funder]);

  const [t, l] = await Promise.all([
    connection.getBalance(tenant.publicKey),
    connection.getBalance(landlord.publicKey),
  ]);

  console.log(`Tenant   ${tenant.publicKey.toBase58()}  ◎${t / LAMPORTS_PER_SOL}`);
  console.log(`Landlord ${landlord.publicKey.toBase58()}  ◎${l / LAMPORTS_PER_SOL}`);
  console.log(`\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
