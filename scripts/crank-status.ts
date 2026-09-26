export function isActiveEscrowStatus(
  status: Record<string, unknown> | null | undefined
): boolean {
  const variants = Object.keys(status ?? {});
  return variants.length === 1 && variants[0] === "active";
}