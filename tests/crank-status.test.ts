import { expect } from "chai";
import { isActiveEscrowStatus } from "../scripts/crank-status";

describe("isActiveEscrowStatus", () => {
  it("accepts the active Anchor enum variant", () => {
    expect(isActiveEscrowStatus({ active: {} })).to.equal(true);
  });

  it("rejects claimed, rejected, and unknown statuses", () => {
    expect(isActiveEscrowStatus({ claimed: {} })).to.equal(false);
    expect(isActiveEscrowStatus({ rejected: {} })).to.equal(false);
    expect(isActiveEscrowStatus(undefined)).to.equal(false);
  });
});