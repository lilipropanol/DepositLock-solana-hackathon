// Prints every wallet involved in the demo, on devnet.
//   npm run balances
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
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

const PROGRAM_ID = "43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7";
const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const FUNDER_PATH =
  process.env.FUNDER_KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const funder = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(FUNDER_PATH, "utf8")))
  );
  const tenant = Keypair.fromSeed(TENANT_SEED);
  const landlord = Keypair.fromSeed(LANDLORD_SEED);

  const rows: [string, PublicKey][] = [
    ["funder   (id.json)", funder.publicKey],
    ["tenant   (demo)", tenant.publicKey],
    ["landlord (demo)", landlord.publicKey],
  ];

  console.log(`cluster: ${RPC.replace(/api-key=[^&]*/, "api-key=***")}\n`);

  for (const [label, pk] of rows) {
    const bal = await connection.getBalance(pk);
    const warn = bal < 0.05 * LAMPORTS_PER_SOL ? "  <-- LOW" : "";
    console.log(
      `${label.padEnd(20)} ${pk.toBase58()}  ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL${warn}`
    );
  }

  const prog = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
  console.log(
    `\nprogram              ${PROGRAM_ID}  ${prog ? "deployed" : "NOT FOUND ON THIS CLUSTER"}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
