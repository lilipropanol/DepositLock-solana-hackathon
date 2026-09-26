/** Exact display of SOL's integer base units. No live exchange rate is implied. */
export function formatSol(lamports: number | null | undefined): string {
  if (lamports == null || !Number.isSafeInteger(lamports) || lamports < 0) return "—";
  const raw = BigInt(lamports);
  const whole = raw / 1_000_000_000n;
  const fraction = (raw % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return whole.toLocaleString("en-IE") + (fraction ? `.${fraction}` : "");
}

export function formatDate(timestamp: number | null): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return "After you fund the deposit";
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Dublin" }).format(timestamp);
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-IE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Dublin" }).format(timestamp);
}

export function getCountdown(deadline: number | null, now: number): string[] {
  const total = Math.max(0, Math.ceil(((deadline ?? now) - now) / 1000));
  return [Math.floor(total / 86400), Math.floor((total % 86400) / 3600), Math.floor((total % 3600) / 60), total % 60].map((value) => String(value).padStart(2, "0"));
}
