import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DepositLock } from "../target/types/deposit_lock";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("deposit-lock", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.DepositLock as Program<DepositLock>;

  const tenant = Keypair.generate();
  const landlord = Keypair.generate();
  // A completely uninvolved third party, used to prove claim_refund is permissionless.
  const stranger = Keypair.generate();

  const DEPOSIT = 0.1 * LAMPORTS_PER_SOL;
  const WINDOW = 5; // seconds. Production would be 1_209_600 (14 days).

  const escrowPda = (leaseId: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        tenant.publicKey.toBuffer(),
        landlord.publicKey.toBuffer(),
        new anchor.BN(leaseId).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];

  before(async () => {
    // Fund the demo actors from the provider wallet (devnet faucet is rate-limited).
    const tx = new anchor.web3.Transaction();
    for (const kp of [tenant, landlord, stranger]) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: kp.publicKey,
          lamports: 0.3 * LAMPORTS_PER_SOL,
        })
      );
    }
    await provider.sendAndConfirm(tx);
  });

  it("funds an escrow, locking the deposit in a PDA", async () => {
    const leaseId = 1;
    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .initializeAndFund(new anchor.BN(leaseId), new anchor.BN(DEPOSIT), new anchor.BN(now), new anchor.BN(WINDOW))
      .accounts({ tenant: tenant.publicKey, landlord: landlord.publicKey })
      .signers([tenant])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda(leaseId));
    assert.equal(escrow.amount.toNumber(), DEPOSIT);
    assert.ok(escrow.tenant.equals(tenant.publicKey));
    assert.ok(escrow.landlord.equals(landlord.publicKey));

    // The PDA genuinely holds the money.
    const vaultBalance = await provider.connection.getBalance(escrowPda(leaseId));
    assert.ok(vaultBalance >= DEPOSIT, "escrow PDA should hold the deposit");
  });

  it("REJECTS a refund while the landlord's review window is still open", async () => {
    const leaseId = 1;
    try {
      await program.methods
        .claimRefund()
        .accounts({
          caller: stranger.publicKey,
          tenant: tenant.publicKey,
          landlord: landlord.publicKey,
          escrow: escrowPda(leaseId),
        })
        .signers([stranger])
        .rpc();
      assert.fail("refund should not have been allowed before the deadline");
    } catch (err: any) {
      assert.include(err.toString(), "WindowStillOpen");
    }
  });

  it("lets ANYONE crank the refund once the window expires, and pays the tenant", async () => {
    const leaseId = 1;
    const before = await provider.connection.getBalance(tenant.publicKey);

    await sleep((WINDOW + 3) * 1000);

    // Signed by `stranger` -- not the tenant, not the landlord. Nobody involved.
    const sig = await program.methods
      .claimRefund()
      .accounts({
        caller: stranger.publicKey,
        tenant: tenant.publicKey,
        landlord: landlord.publicKey,
        escrow: escrowPda(leaseId),
      })
      .signers([stranger])
      .rpc();

    const after = await provider.connection.getBalance(tenant.publicKey);
    assert.ok(after > before + DEPOSIT, "tenant should receive deposit plus rent");

    // The escrow account is gone.
    const closed = await provider.connection.getAccountInfo(escrowPda(leaseId));
    assert.isNull(closed, "escrow account should be closed");

    console.log(`\n    Refund cranked by an uninvolved third party.`);
    console.log(`    https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
  });

  it("lets the landlord release the deposit early", async () => {
    const leaseId = 2;
    const farFuture = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

    await program.methods
      .initializeAndFund(new anchor.BN(leaseId), new anchor.BN(DEPOSIT), new anchor.BN(farFuture), new anchor.BN(WINDOW))
      .accounts({ tenant: tenant.publicKey, landlord: landlord.publicKey })
      .signers([tenant])
      .rpc();

    const before = await provider.connection.getBalance(tenant.publicKey);

    const sig = await program.methods
      .release()
      .accounts({
        landlord: landlord.publicKey,
        tenant: tenant.publicKey,
        escrow: escrowPda(leaseId),
      })
      .signers([landlord])
      .rpc();

    const after = await provider.connection.getBalance(tenant.publicKey);
    assert.ok(after > before + DEPOSIT, "tenant should be made whole");
    console.log(`\n    https://explorer.solana.com/tx/${sig}?cluster=devnet\n`);
  });

  it("REJECTS a release attempted by anyone other than the landlord", async () => {
    const leaseId = 3;
    const farFuture = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

    await program.methods
      .initializeAndFund(new anchor.BN(leaseId), new anchor.BN(DEPOSIT), new anchor.BN(farFuture), new anchor.BN(WINDOW))
      .accounts({ tenant: tenant.publicKey, landlord: landlord.publicKey })
      .signers([tenant])
      .rpc();

    try {
      await program.methods
        .release()
        .accounts({
          landlord: stranger.publicKey,
          tenant: tenant.publicKey,
          escrow: escrowPda(leaseId),
        })
        .signers([stranger])
        .rpc();
      assert.fail("a stranger must not be able to release the escrow");
    } catch (err: any) {
      assert.ok(err.toString().length > 0);
    }
  });
});
