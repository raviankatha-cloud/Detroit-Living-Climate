export function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function optionalString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

export function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requireString(value: unknown, field: string) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    throw new Error(`${field} is required.`);
  }

  return cleaned;
}
