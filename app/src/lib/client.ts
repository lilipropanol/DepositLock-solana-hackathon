import { EscrowClient } from "./escrowClient";
import { MockClient } from "./mockClient";
import { DevnetClient } from "./devnetClient";
import { USE_MOCK } from "./constants";

let instance: EscrowClient | null = null;

/** Single entry point. The UI never chooses an implementation itself. */
export function getClient(): EscrowClient {
  if (!instance) instance = USE_MOCK ? new MockClient() : new DevnetClient();
  return instance;
}

export function resetClientInstance() {
  instance = null;
}
