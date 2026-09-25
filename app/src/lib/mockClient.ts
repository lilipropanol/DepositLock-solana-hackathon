// In-memory implementation of EscrowClient. No chain, no network, no wallet.
//
// Purpose 1: the frontend lane builds against this from 11:00 without waiting
// for the program, a deploy, or anyone else.
// Purpose 2: live fallback. If venue wifi or the RPC dies during the pitch,
// flip NEXT_PUBLIC_USE_MOCK=true and the demo still runs end to end.
import {
  Balances,
  CreateParams,
  EscrowClient,
  EscrowState,
} from "./escrowClient";
import { LAMPORTS_PER_SOL } from "./constants";

const FAKE_TENANT = "TenantDemo11111111111111111111111111111111";
const FAKE_LANDLORD = "LandlordDemo111111111111111111111111111111";
const START_BALANCE = 0.3 * LAMPORTS_PER_SOL;
const RENT = 0.0016 * LAMPORTS_PER_SOL;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeSignature(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789";
  return Array.from(
    { length: 88 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export class MockClient implements EscrowClient {
  readonly isMock = true;

  private escrow: EscrowState | null = null;
  private leaseId = 1;
  private tenantBal = START_BALANCE;
  private landlordBal = START_BALANCE;

  tenantAddress() {
    return FAKE_TENANT;
  }
  landlordAddress() {
    return FAKE_LANDLORD;
  }

  async fetchEscrow() {
    return this.escrow;
  }

  async fetchBalances(): Promise<Balances> {
    return {
      tenant: this.tenantBal,
      landlord: this.landlordBal,
      escrow: this.escrow ? this.escrow.amountLamports + RENT : 0,
    };
  }

  async createAndFund(p: CreateParams) {
    await delay(500);
    const amount = Math.round(p.amountSol * LAMPORTS_PER_SOL);
    this.escrow = {
      tenant: FAKE_TENANT,
      landlord: FAKE_LANDLORD,
      amountLamports: amount,
      leaseEndTs: p.leaseEndTs,
      disputeWindowSecs: p.disputeWindowSecs,
      leaseId: this.leaseId,
    };
    this.tenantBal -= amount + RENT;
    return fakeSignature();
  }

  async release() {
    await delay(400);
    return this.payOutToTenant();
  }

  async claimRefund() {
    await delay(400);
    return this.payOutToTenant();
  }

  /** Both exit paths pay the tenant 100% -- mirrors `close = tenant` on chain. */
  private payOutToTenant(): string {
    if (!this.escrow) throw new Error("No escrow to settle.");
    this.tenantBal += this.escrow.amountLamports + RENT;
    this.escrow = null;
    this.leaseId += 1;
    return fakeSignature();
  }

  async resetDemo() {
    this.escrow = null;
    this.leaseId += 1;
    this.tenantBal = START_BALANCE;
    this.landlordBal = START_BALANCE;
  }
}
