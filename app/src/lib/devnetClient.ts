// Real implementation: signs and sends transactions to the deployed program.
import {
  AnchorProvider,
  BN,
  Program,
  Idl,
  Wallet,
} from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import idl from "./idl/deposit_lock.json";
import { LAMPORTS_PER_SOL, PROGRAM_ID, RPC_URL } from "./constants";
import {
  Balances,
  CreateParams,
  EscrowClient,
  EscrowState,
} from "./escrowClient";
import { DemoActors, loadActors, nextLease, resetLeaseCounter } from "./demoKeypairs";

/**
 * Minimal Wallet for Anchor that signs with a local keypair instead of a
 * browser extension. This is the entire cost of dropping wallet-adapter.
 */
class BurnerWallet implements Wallet {
  constructor(readonly payer: Keypair) {}
  get publicKey() {
    return this.payer.publicKey;
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) tx.sign([this.payer]);
    else tx.partialSign(this.payer);
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }
}

export class DevnetClient implements EscrowClient {
  readonly isMock = false;
  private connection = new Connection(RPC_URL, "confirmed");
  private actors: DemoActors;

  constructor() {
    this.actors = loadActors();
  }

  tenantAddress() {
    return this.actors.tenant.publicKey.toBase58();
  }
  landlordAddress() {
    return this.actors.landlord.publicKey.toBase58();
  }

  /** Build a Program instance that signs as the given actor. */
  private programAs(signer: Keypair): Program {
    const provider = new AnchorProvider(
      this.connection,
      new BurnerWallet(signer),
      { commitment: "confirmed" }
    );
    return new Program(idl as Idl, provider);
  }

  /**
   * Re-derive the escrow's address from its seeds.
   *
   * A PDA has no private key -- its address is a pure function of these seeds
   * plus the program id, so anyone can compute it and nobody can sign for it.
   */
  private escrowPda(leaseId = this.actors.leaseId): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        this.actors.tenant.publicKey.toBuffer(),
        this.actors.landlord.publicKey.toBuffer(),
        new BN(leaseId).toArrayLike(Buffer, "le", 8),
      ],
      new PublicKey(PROGRAM_ID)
    )[0];
  }

  async fetchEscrow(): Promise<EscrowState | null> {
    const program = this.programAs(this.actors.tenant);
    try {
      const acct: any = await (program.account as any).escrow.fetch(this.escrowPda());
      return {
        tenant: acct.tenant.toBase58(),
        landlord: acct.landlord.toBase58(),
        amountLamports: acct.amount.toNumber(),
        leaseEndTs: acct.leaseEndTs.toNumber(),
        disputeWindowSecs: acct.disputeWindowSecs.toNumber(),
        leaseId: acct.leaseId.toNumber(),
      };
    } catch {
      return null; // not created yet, or already closed
    }
  }

  async fetchBalances(): Promise<Balances> {
    const [tenant, landlord, escrow] = await Promise.all([
      this.connection.getBalance(this.actors.tenant.publicKey),
      this.connection.getBalance(this.actors.landlord.publicKey),
      this.connection.getBalance(this.escrowPda()),
    ]);
    return { tenant, landlord, escrow };
  }

  async createAndFund(p: CreateParams): Promise<string> {
    const program = this.programAs(this.actors.tenant);
    return program.methods
      .initializeAndFund(
        new BN(this.actors.leaseId),
        new BN(Math.round(p.amountSol * LAMPORTS_PER_SOL)),
        new BN(p.leaseEndTs),
        new BN(p.disputeWindowSecs)
      )
      .accounts({
        tenant: this.actors.tenant.publicKey,
        landlord: this.actors.landlord.publicKey,
      })
      .rpc();
  }

  /** Landlord voluntarily returns the deposit. Only they can sign this. */
  async release(): Promise<string> {
    const program = this.programAs(this.actors.landlord);
    return program.methods
      .release()
      .accounts({
        landlord: this.actors.landlord.publicKey,
        tenant: this.actors.tenant.publicKey,
        escrow: this.escrowPda(),
      })
      .rpc();
  }

  /**
   * Crank the automatic refund.
   *
   * Signed here by the tenant purely because that is who is clicking. The
   * program does not check who the caller is -- it only checks the clock, and
   * the destination is fixed to the tenant recorded at creation. A stranger
   * could send this exact transaction and the outcome would be identical.
   */
  async claimRefund(): Promise<string> {
    const program = this.programAs(this.actors.tenant);
    return program.methods
      .claimRefund()
      .accounts({
        caller: this.actors.tenant.publicKey,
        tenant: this.actors.tenant.publicKey,
        landlord: this.actors.landlord.publicKey,
        escrow: this.escrowPda(),
      })
      .rpc();
  }

  /** Bump to a fresh lease id so the next run gets a clean PDA. */
  async resetDemo() {
    this.actors = nextLease();
  }

  /** Brand new actors. They will need funding again. */
  async hardReset() {
    this.actors = resetLeaseCounter();
  }

  /** Top the burners up from a funder keypair (see scripts/fund-demo.ts). */
  async fundFrom(funder: Keypair, sol: number): Promise<string> {
    const lamports = Math.round(sol * LAMPORTS_PER_SOL);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: this.actors.tenant.publicKey,
        lamports,
      }),
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: this.actors.landlord.publicKey,
        lamports,
      })
    );
    return this.connection.sendTransaction(tx, [funder]);
  }
}
